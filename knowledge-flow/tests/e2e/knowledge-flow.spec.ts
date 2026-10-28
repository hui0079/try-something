import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("authenticated knowledge graph flow", () => {
  test.skip(
    !email || !password,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run authenticated flows.",
  );

  test("login, create, reopen and delete a knowledge graph", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email!);
    await page.getByLabel("密码").fill(password!);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page).toHaveURL(/\/graphs$/);

    await page.getByRole("link", { name: "新建图谱" }).click();
    const title = `E2E 链路 ${Date.now()}`;
    await page.getByLabel("图谱 JSON").fill(
      JSON.stringify({
        version: 1,
        title,
        nodes: [
          {
            id: "input",
            type: "step",
            label: "输入",
            description: "准备结构化 JSON",
          },
          {
            id: "result",
            type: "result",
            label: "完成",
            description: "生成并保存链路图",
          },
        ],
        edges: [
          {
            id: "input-result",
            source: "input",
            target: "result",
            label: "生成",
          },
        ],
      }),
    );
    await page.getByRole("button", { name: "生成预览" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await page.getByRole("button", { name: "保存图谱" }).click();
    await expect(page).toHaveURL(/\/graphs\/[^/]+$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.getByRole("link", { name: "返回图谱库" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await page.getByRole("heading", { name: title }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "删除", exact: true }).click();
    await expect(page).toHaveURL(/\/graphs$/);
    await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  });
});
