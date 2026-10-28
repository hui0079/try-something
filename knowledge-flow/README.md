# 知识链路

一个面向个人的知识链路图 MVP。粘贴约定格式的 JSON 后，应用会校验数据、使用 Dagre 自动布局，并在 React Flow 中展示可缩放、拖拽和查看详情的链路图。登录用户可以保存、查看和删除自己的图谱。

## 技术栈

- Next.js 16、React 19、TypeScript、Tailwind CSS
- React Flow、Dagre、Zod
- Spring Boot 3、Spring Security、Spring Data JPA
- 本地 H2 文件数据库
- Vitest、Playwright、JUnit 5、MockMvc

## 本地运行

要求：

- Node.js 20.19+、22.13+ 或 24+
- JDK 17
- Maven 3.6+

项目完全在本地运行，不需要 Supabase 或其他云服务。用户和图谱数据保存在 `backend/data/`。

1. 安装前端依赖：

   ```bash
   npm install
   ```

2. 可选：复制前端环境变量。未配置时默认使用 `http://localhost:8080`：

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. 在第一个终端启动 Java 后端：

   ```powershell
   cd backend
   mvn spring-boot:run
   ```

   如果 Maven 仍使用旧 JDK，请先把 `JAVA_HOME` 指向 JDK 17。本机可使用：

   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
   mvn spring-boot:run
   ```

4. 在第二个终端启动 React 前端：

   ```bash
   npm run dev
   ```

访问 `http://localhost:3000`，注册一个本地账号即可使用。后端运行在 `http://localhost:8080`。

## 图谱 JSON 协议

当前协议版本是 `1`。节点 `type` 可使用：

| type | 含义 |
|------|------|
| `start` | 起点 |
| `step` | 步骤 |
| `problem` | 问题 |
| `condition` | 条件 |
| `technology` | 技术 |
| `tool` | 工具 |
| `data` | 数据 |
| `api` | 接口 |
| `alternative` | 备选 |
| `risk` | 风险 |
| `reference` | 参考 |
| `result` | 结果 |

每个节点 ID 和连线 ID 必须唯一，连线的 `source`、`target` 必须引用已有节点。可选字段 `layout` 控制链路方向，默认 `horizontal`：

| layout | 含义 |
|--------|------|
| `horizontal` | 从左到右 |
| `vertical` | 从上到下 |
| `horizontal-reverse` | 从右到左 |
| `vertical-reverse` | 从下到上 |

```json
{
  "version": 1,
  "title": "发布一个 Web 应用",
  "nodes": [
    {
      "id": "prepare",
      "type": "step",
      "label": "准备代码",
      "description": "将代码提交到 Git",
      "technologies": ["Git"],
      "conditions": []
    },
    {
      "id": "deploy",
      "type": "result",
      "label": "部署上线",
      "description": "发布生产版本",
      "technologies": ["Vercel"],
      "conditions": ["测试通过"]
    }
  ],
  "edges": [
    {
      "id": "prepare-deploy",
      "source": "prepare",
      "target": "deploy",
      "label": "然后"
    }
  ]
}
```

`technologies`、`conditions` 和 `edges` 可以省略，系统会补为空数组。

## 验证

```bash
npm run typecheck
npm run lint
npm test
npm run build

cd backend
mvn test
mvn package
```

认证端到端测试要求前后端均已启动，并提前注册一个本地测试账号：

```powershell
$env:E2E_USER_EMAIL = "user@example.com"
$env:E2E_USER_PASSWORD = "password123"
npm run test:e2e
```

如果未设置账号变量，Playwright 会明确跳过认证主流程。Spring Boot 会从服务端 Session 确定当前用户，所有图谱查询都附带用户 ID 条件，其他用户无法读取或删除该图谱。
