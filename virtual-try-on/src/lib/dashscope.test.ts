import { describe, expect, it, vi } from "vitest";

import {
  buildTryOnPayload,
  createTryOnTask,
  mapDashScopeError,
  pollTryOnTask,
  uploadTempFile,
} from "./dashscope";

describe("buildTryOnPayload", () => {
  it("puts tops and dresses on top_garment_url", () => {
    expect(buildTryOnPayload("oss://person", "oss://shirt", "top").input).toEqual({
      person_image_url: "oss://person",
      top_garment_url: "oss://shirt",
    });
    expect(buildTryOnPayload("oss://person", "oss://dress", "dress").input).toEqual(
      {
        person_image_url: "oss://person",
        top_garment_url: "oss://dress",
      },
    );
  });

  it("puts bottoms on bottom_garment_url", () => {
    expect(
      buildTryOnPayload("oss://person", "oss://pants", "bottom").input,
    ).toEqual({
      person_image_url: "oss://person",
      bottom_garment_url: "oss://pants",
    });
  });

  it("keeps the original face and source resolution", () => {
    expect(buildTryOnPayload("p", "g", "top").parameters).toEqual({
      resolution: -1,
      restore_face: true,
    });
  });
});

describe("mapDashScopeError", () => {
  it("maps known try-on errors to Chinese messages", () => {
    expect(mapDashScopeError("InvalidPerson")).toBe(
      "人物照需要是单人正面全身照",
    );
    expect(mapDashScopeError("InvalidGarment")).toBe("缺少可用的衣物图");
    expect(mapDashScopeError("InvalidInputLength")).toBe(
      "图片尺寸或大小不符合要求（5KB–5MB，边长 150–4096）",
    );
  });

  it("falls back to the provider message", () => {
    expect(mapDashScopeError("Other", "something broke")).toBe("something broke");
  });
});

describe("uploadTempFile", () => {
  it("uploads through the DashScope policy then returns an oss url", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            upload_dir: "dashscope-instant/demo/2026-09-07/abc",
            upload_host: "https://oss.example.com",
            oss_access_key_id: "id",
            signature: "sig",
            policy: "pol",
            x_oss_object_acl: "private",
            x_oss_forbid_overwrite: "true",
          },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    const url = await uploadTempFile(
      "sk-test",
      { name: "person.jpg", type: "image/jpeg", bytes: new Uint8Array([1, 2]) },
      fetchImpl,
    );

    expect(url).toBe("oss://dashscope-instant/demo/2026-09-07/abc/person.jpg");
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model=aitryon",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-test",
        }),
      }),
    );
    expect(fetchImpl.mock.calls[1][0]).toBe("https://oss.example.com");
  });
});

describe("createTryOnTask", () => {
  it("creates an async task with OSS resolve enabled", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        output: { task_id: "task-1", task_status: "PENDING" },
      }),
    );

    await expect(
      createTryOnTask("sk-test", "oss://p", "oss://g", "top", fetchImpl),
    ).resolves.toBe("task-1");

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      Authorization: "Bearer sk-test",
      "X-DashScope-Async": "enable",
      "X-DashScope-OssResourceResolve": "enable",
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "aitryon",
      input: {
        person_image_url: "oss://p",
        top_garment_url: "oss://g",
      },
    });
  });
});

describe("pollTryOnTask", () => {
  it("returns the image url after the task succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ output: { task_id: "t", task_status: "RUNNING" } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          output: {
            task_id: "t",
            task_status: "SUCCEEDED",
            image_url: "https://cdn.example.com/out.jpg",
          },
        }),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      pollTryOnTask("sk-test", "t", { fetchImpl, sleep, intervalMs: 1 }),
    ).resolves.toBe("https://cdn.example.com/out.jpg");
    expect(sleep).toHaveBeenCalled();
  });

  it("throws a mapped error when the task fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        output: {
          task_id: "t",
          task_status: "FAILED",
          code: "InvalidPerson",
          message: "no person",
        },
      }),
    );

    await expect(
      pollTryOnTask("sk-test", "t", {
        fetchImpl,
        sleep: async () => undefined,
        intervalMs: 1,
      }),
    ).rejects.toThrow("人物照需要是单人正面全身照");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
