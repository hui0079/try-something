# 企业 OA

请假和报销共用一套轻量流程：提交时按天数或金额匹配审批规则，把步骤快照到流程实例上，审批人在统一待办里通过或驳回。

## 技术栈

- Spring Boot 3、Java 17、Spring Security 会话、Spring Data JPA、Flyway
- PostgreSQL
- Next.js、React、TypeScript、Tailwind CSS

后端端口 `8090`，前端端口 `3001`。

## 数据库

项目不会在本地启动数据库。把测试环境地址填进 [backend/src/main/resources/application.yml](backend/src/main/resources/application.yml)：

- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`

应用启动后，Flyway 会在这个库里建表，并写入演示组织和五条审批规则。请使用专用测试库。

规则区间是「下限不含本数，上限含本数」：

| 单据 | 区间 | 审批人 |
| --- | --- | --- |
| 请假 | 3 天及以内 | 直属主管 |
| 请假 | 超过 3 天 | 直属主管，然后部门负责人 |
| 报销 | 1000 元及以内 | 直属主管 |
| 报销 | 超过 1000 到 5000 | 直属主管，然后财务 |
| 报销 | 超过 5000 | 直属主管，财务，然后总经理 |

审批人就是申请人，或与上一步是同一人时，这一步会跳过。同一角色有多个人时，任一人先处理即可。

## 本地运行

需要 JDK 17、Maven、Node.js 20+。

```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
mvn spring-boot:run
```

另一个终端：

```powershell
npm install
npm run dev
```

打开 `http://localhost:3001`。

## 演示账号

密码都是用户名加 `123`。

| 用户名 | 姓名 | 说明 |
| --- | --- | --- |
| alice | 王小明 | 员工，主管是赵小红 |
| bob | 赵小红 | 王小明的直属主管 |
| lead | 李负责人 | 研发部负责人 |
| finance | 陈财务 | 财务 |
| gm | 周总 | 总经理 |
| admin | 系统管理员 | 维护部门、用户和审批规则 |

可以这样走通：

1. 王小明请 2 天假，赵小红通过后结束。
2. 王小明请 5 天假，赵小红通过后转到李负责人。
3. 王小明报销 8000，依次经过赵小红、陈财务、周总。
4. 驳回后可以改内容再提交，上一次审批记录还在。

## 测试

不连数据库的规则和流程测试：

```powershell
cd backend
mvn test
```

连上测试库之后，再跑接口流程：

```powershell
mvn test -DexcludedGroups=
```
