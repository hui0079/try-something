import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Agent, ConfigurationError, emptyFs } from "@cursor/sdk";

const TIMEOUT_MS = 4 * 60 * 1000;
const SYSTEM = [
  "你是A股模拟盘的选股和交易函数。",
  "只输出一个JSON对象，不要调用工具，不要阅读或修改任何文件。",
  '格式：{"summary":"一句话","logic":"选股逻辑","actions":[{"code":"600519","side":"buy","lots":1,"reason":"理由"}]}',
  "logic 要说明这轮为什么选这些股票、为什么放过榜单里的其他股票。",
  "买入只能选 candidates 或 quotes 里的代码，卖出只能选已有持仓。",
  "side 只能是 buy、sell 或 hold。lots 是手数，1 手等于 100 股。",
  "每轮最多新买 5 只。买入不能超过该股的 maxBuyLots，资金不够或规则不允许时就 hold。",
].join("");

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function decide(snapshot, model) {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "a-share-paper-"));
  const started = Date.now();
  let agent;
  try {
    agent = await Agent.create({
      apiKey: process.env.CURSOR_API_KEY,
      model,
      tools: [],
      local: {
        cwd: scratch,
        settingSources: [],
        // Windows 的 cursorsandbox 只有网络代理，没有文件隔离，请求沙箱会直接失败。
        // emptyFs 让文件工具落在一块只读的空内存盘上，Shell 也不会注册。
        sandboxOptions: { enabled: process.platform !== "win32" },
        fs: emptyFs(),
      },
    });
    const prompt = `${SYSTEM}\n${JSON.stringify(snapshot)}`;
    const run = await agent.send(prompt);
    let cancelReason = null;
    let failureMessage = null;
    const timer = setTimeout(() => {
      cancelReason = cancelReason ?? "timeout";
      if (run.supports("cancel")) void run.cancel();
    }, TIMEOUT_MS);
    const watching = (async () => {
      try {
        for await (const event of run.stream()) {
          if (event.type === "tool_call") {
            cancelReason = "tool";
            if (run.supports("cancel")) await run.cancel();
            break;
          }
          if (event.type === "status" && event.status === "ERROR" && event.message) {
            failureMessage = event.message;
          }
        }
      } catch {
        // The stream ends when the run is cancelled.
      }
    })();
    const result = await run.wait();
    clearTimeout(timer);
    await watching;
    const durationMs = result.durationMs ?? Date.now() - started;
    if (cancelReason === "tool") {
      return {
        ok: false,
        error: "tool",
        message: "助手调用了工具，本轮作废",
        runId: result.id,
        durationMs,
      };
    }
    if (cancelReason === "timeout" || result.status === "cancelled") {
      return {
        ok: false,
        error: "timeout",
        message: "决策超时，本轮作废",
        runId: result.id,
        durationMs,
      };
    }
    if (result.status === "error") {
      const detail = failureMessage || result.error?.message || result.result || "助手运行失败";
      return {
        ok: false,
        error: "failed",
        message: String(detail).slice(0, 300),
        code: result.error?.code,
        runId: result.id,
        durationMs,
      };
    }
    return { ok: true, text: result.result ?? "", runId: result.id, durationMs };
  } finally {
    if (agent) await agent[Symbol.asyncDispose]();
    await rm(scratch, { recursive: true, force: true });
  }
}

const raw = await readStdin();
if (!process.env.CURSOR_API_KEY) {
  emit({ ok: false, error: "missing_key", message: "未配置 CURSOR_API_KEY" });
  process.exit(0);
}

let snapshot;
try {
  snapshot = JSON.parse(raw);
} catch {
  emit({ ok: false, error: "failed", message: "决策快照无法解析" });
  process.exit(0);
}

try {
  emit(await runWithFallback(snapshot));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.toLowerCase().includes("sandbox")) {
    emit({ ok: false, error: "sandbox", message: "沙箱不可用，本轮不下单" });
  } else {
    emit({ ok: false, error: "failed", message });
  }
}

async function runWithFallback(snapshot) {
  try {
    const first = await decide(snapshot, { id: "composer-2.5" });
    if (!first.ok && first.message.toLowerCase().includes("model")) {
      return decide(snapshot, { id: "auto" });
    }
    return first;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("sandbox") || (error instanceof ConfigurationError && message.toLowerCase().includes("sandbox"))) {
      return { ok: false, error: "sandbox", message: "沙箱不可用，本轮不下单" };
    }
    if (message.toLowerCase().includes("model")) {
      return decide(snapshot, { id: "auto" });
    }
    throw error;
  }
}
