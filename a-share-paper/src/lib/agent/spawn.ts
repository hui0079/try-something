import { spawn } from "node:child_process";
import path from "node:path";

import type { AgentRunResult } from "@/lib/desk/cycle";
import { DECISION_TIMEOUT_MS } from "@/lib/desk/plan";
import type { DecisionSnapshot } from "@/lib/ai/snapshot";

export function startAgent(snapshot: DecisionSnapshot): {
  done: Promise<AgentRunResult>;
  stop: () => void;
} {
  const child = spawn(process.execPath, [path.join(process.cwd(), "src", "agent", "cli.mjs")], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
    windowsHide: true,
  });
  child.stdin.write(JSON.stringify(snapshot));
  child.stdin.end();

  let stdout = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });

  const done = new Promise<AgentRunResult>((resolve) => {
    const timer = setTimeout(() => {
      child.kill();
    }, DECISION_TIMEOUT_MS + 15_000);
    child.on("close", () => {
      clearTimeout(timer);
      const line = stdout
        .trim()
        .split("\n")
        .filter((item) => item.length > 0)
        .at(-1);
      if (!line) {
        resolve({ ok: false, error: "failed", message: "助手没有返回结果" });
        return;
      }
      try {
        resolve(JSON.parse(line) as AgentRunResult);
      } catch {
        resolve({ ok: false, error: "failed", message: "助手输出无法解析" });
      }
    });
  });

  return {
    done,
    stop: () => {
      child.kill();
    },
  };
}
