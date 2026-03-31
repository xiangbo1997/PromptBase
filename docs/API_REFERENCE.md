# PromptBase API 参考文档

这份文档描述当前后端 API 的结构、认证方式、主要资源和常见调用模式。它不是 OpenAPI 导出文件，而是给开发和联调用的人工可读版本。

## 1. 基础信息

### 1.1 Base URL

开发环境：

- `http://127.0.0.1:3001/api/v1`

生产环境：

- `https://prompt.feixingqi.shop/api/v1`

例外健康检查接口：

- `/health`
  不走 `/api/v1` 前缀

### 1.2 响应风格

前端请求层默认按 envelope 解包，后端通常返回：

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

前端 [api.ts](/software/PromptBase/apps/web/src/lib/api.ts) 会自动把 `data` 解出来，因此页面层通常只看到业务数据。

### 1.3 认证方式

除 `auth/*` 和 `/health` 外，大多数接口都需要：

```http
Authorization: Bearer <access_token>
```

鉴权链路通常由两个 Guard 组成：

- `AuthGuard`
  负责 JWT 鉴权
- `OrgMemberGuard`
  负责校验当前用户是否属于指定组织

### 1.4 组织级资源约定

绝大多数业务接口都挂在：

```text
/orgs/:orgId/...
```

这意味着：

- 前端必须知道当前活跃组织 `orgId`
- 所有提示词、标签、文件夹、成员、模型配置都属于某个组织

## 2. 认证模块

控制器：

- [auth.controller.ts](/software/PromptBase/apps/api/src/auth/auth.controller.ts)

### `POST /auth/register`

注册用户。

典型请求：

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "strong-password"
}
```

返回：

- 用户信息
- 组织信息
- access token / refresh token

### `POST /auth/login`

邮箱密码登录。

### `POST /auth/refresh`

使用 refresh token 刷新 access token。

## 3. 组织与成员模块

控制器：

- [org.controller.ts](/software/PromptBase/apps/api/src/org/org.controller.ts)
- [assistant.controller.ts](/software/PromptBase/apps/api/src/assistant/assistant.controller.ts)

### `GET /orgs/:orgId`

获取组织信息。

### `GET /orgs/:orgId/members`

获取组织成员列表。

### `POST /orgs/:orgId/members/invite`

邀请成员。

典型请求：

```json
{
  "email": "member@example.com",
  "roleKey": "viewer"
}
```

### `POST /orgs/:orgId/assistant/guide`

基于项目文档回答平台相关使用问题。

典型请求：

```json
{
  "question": "怎么配置模型提供商？",
  "pathname": "/settings/models",
  "locale": "zh-CN",
  "history": [
    { "role": "user", "content": "怎么测试模型输出？" },
    { "role": "assistant", "content": "可以在提示词详情页或 AI 实验室里测试。" }
  ]
}
```

典型返回字段：

- `answer`
  Markdown 格式回答
- `citations`
  文档来源数组，包含标题、章节、文件路径和摘录
- `inferenceNotes`
  文档没有直接写明时的推断说明
- `usedModel`
  本次回答实际使用的 provider 和 model
- `fallbackMode`
  `organization | platform`

### `POST /orgs/:orgId/assistant/actions/chat`

会话式动作助手入口。它会先识别用户意图，再根据当前会话状态继续追问、创建缺失的标签或文件夹，并在字段收齐后自动执行。

典型请求：

```json
{
  "sessionId": "7dd0e6c9-7b1a-4de6-8a0a-a706564d43fb",
  "message": "帮我新建一个提示词，标题叫销售开场白，放到销售文件夹",
  "pathname": "/prompts",
  "locale": "zh-CN"
}
```

典型返回字段：

- `sessionId`
  当前助手会话 ID；前端应在后续轮次继续带回
- `reply`
  助手当前轮回复
- `session`
  当前意图、草稿摘要、待补字段、待确认的缺失资源
- `executedActions`
  已执行的创建结果，例如提示词、标签、文件夹
- `canUndo`
  当前会话是否允许撤销最近一步
- `citations`
  当前回复引用的文档来源；纯动作追问时可能为空

当前支持的动作意图：

- `create_prompt`
- `create_tag`
- `create_folder`
- `guide`

### `POST /orgs/:orgId/assistant/actions/undo`

撤销当前会话里最近一次由助手执行的创建链路。

典型请求：

```json
{
  "sessionId": "7dd0e6c9-7b1a-4de6-8a0a-a706564d43fb"
}
```

典型返回字段：

- `reply`
  撤销结果说明
- `undoneActions`
  实际被撤销的实体列表，按撤销顺序返回
- `canUndo`
  撤销后当前会话是否还存在下一步可撤销项

## 4. 提示词模块

控制器：

- [prompt.controller.ts](/software/PromptBase/apps/api/src/prompt/prompt.controller.ts)

### `POST /orgs/:orgId/prompts`

创建提示词。

常用字段：

- `title`
- `description`
- `content`
- `folderId`
- `tagIds`

### `GET /orgs/:orgId/prompts`

获取提示词列表。

支持查询参数：

- `page`
- `pageSize`
- `folderId`
- `search`
- `tagId`
- `isTemplate`

### `GET /orgs/:orgId/prompts/:id`

获取单个提示词详情。

### `PATCH /orgs/:orgId/prompts/:id`

更新提示词。

更新时不仅会修改主实体，还会参与版本生成逻辑。

### `DELETE /orgs/:orgId/prompts/:id`

删除或归档提示词。

### `GET /orgs/:orgId/prompts/:id/versions`

获取版本列表。

### `GET /orgs/:orgId/prompts/:id/versions/:versionId`

获取某个版本详情。

### `GET /orgs/:orgId/prompts/:id/versions/:versionId/diff?compareWith=...`

比较两个版本差异。

### `POST /orgs/:orgId/prompts/:id/restore/:versionId`

恢复某个版本到当前提示词。

## 5. 文件夹模块

控制器：

- [folder.controller.ts](/software/PromptBase/apps/api/src/folder/folder.controller.ts)

### `POST /orgs/:orgId/folders`

创建文件夹。

### `GET /orgs/:orgId/folders`

获取全部文件夹树。

### `GET /orgs/:orgId/folders/:id`

获取单个文件夹。

### `PATCH /orgs/:orgId/folders/:id`

更新文件夹名称或描述。

### `DELETE /orgs/:orgId/folders/:id`

删除文件夹。

### `POST /orgs/:orgId/folders/:id/move`

移动文件夹到新父级目录。

典型请求：

```json
{
  "parentId": "target-folder-uuid-or-null"
}
```

## 6. 标签模块

控制器：

- [tag.controller.ts](/software/PromptBase/apps/api/src/tag/tag.controller.ts)

### `POST /orgs/:orgId/tags`

创建标签。

### `GET /orgs/:orgId/tags`

获取标签列表。

### `GET /orgs/:orgId/tags/:id`

获取单个标签。

### `PATCH /orgs/:orgId/tags/:id`

更新标签。

### `DELETE /orgs/:orgId/tags/:id`

删除标签。

## 7. 收藏与置顶

控制器：

- [favorite.controller.ts](/software/PromptBase/apps/api/src/favorite/favorite.controller.ts)
- [pin.controller.ts](/software/PromptBase/apps/api/src/pin/pin.controller.ts)

### 收藏

- `GET /orgs/:orgId/favorites`
- `POST /orgs/:orgId/prompts/:promptId/favorite`
- `DELETE /orgs/:orgId/prompts/:promptId/favorite`

### 置顶

- `GET /orgs/:orgId/pins`
- `POST /orgs/:orgId/prompts/:promptId/pin`
- `DELETE /orgs/:orgId/prompts/:promptId/pin`
- `PATCH /orgs/:orgId/pins/reorder`

重排请求示例：

```json
{
  "promptIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

## 8. 搜索模块

控制器：

- [search.controller.ts](/software/PromptBase/apps/api/src/search/search.controller.ts)

### `GET /orgs/:orgId/prompts/search`

支持条件：

- `query`
- `folderId`
- `tagId`

用于顶部快捷搜索和 `/search` 页面。

## 9. 模型提供商模块

控制器：

- [model-provider.controller.ts](/software/PromptBase/apps/api/src/model-provider/model-provider.controller.ts)

### `POST /orgs/:orgId/model-providers`

创建模型提供商。

常用字段：

- `name`
- `provider`
- `apiKey`
- `baseUrl`
- `models`
- `isActive`

### `GET /orgs/:orgId/model-providers`

获取模型提供商列表。

### `GET /orgs/:orgId/model-providers/:id`

获取单个模型提供商。

### `PATCH /orgs/:orgId/model-providers/:id`

更新模型提供商。

### `DELETE /orgs/:orgId/model-providers/:id`

删除模型提供商。

## 10. AI 测试运行模块

控制器：

- [test-run.controller.ts](/software/PromptBase/apps/api/src/test-run/test-run.controller.ts)

### `POST /orgs/:orgId/test-runs`

创建一次模型测试运行。

常见请求体：

```json
{
  "providerId": "uuid",
  "model": "gpt-4.1",
  "promptId": "uuid",
  "promptVersionId": "uuid",
  "content": "optional plain text",
  "variables": {
    "name": "Alice"
  }
}
```

### `GET /orgs/:orgId/test-runs/:id`

获取测试运行详情。

### `GET /orgs/:orgId/test-runs/:id/stream`

获取流式输出。

事件类型包括：

- `chunk`
- `status`
- `completed`
- `failed`

前端由 [use-test-runs.ts](/software/PromptBase/apps/web/src/hooks/use-test-runs.ts) 负责解析。

## 11. 导入导出模块

控制器：

- [import-export.controller.ts](/software/PromptBase/apps/api/src/import-export/import-export.controller.ts)

### `POST /orgs/:orgId/import-jobs`

创建导入任务。

注意：

- 这是 multipart/form-data 接口
- 上传文件通过 `request.file()` 获取

### `POST /orgs/:orgId/export-jobs`

创建导出任务。

### `GET /orgs/:orgId/jobs/:jobId`

查询任务状态。

任务状态通常包括：

- `QUEUED`
- `RUNNING`
- `SUCCEEDED`
- `FAILED`
- `CANCELED`

## 12. 审计日志模块

控制器：

- [audit-log.controller.ts](/software/PromptBase/apps/api/src/audit-log/audit-log.controller.ts)

### `GET /orgs/:orgId/audit-logs`

支持按时间和实体类型过滤。

典型查询参数：

- `page`
- `pageSize`
- `entityType`
- `from`
- `to`

## 13. 健康检查

控制器：

- [health.controller.ts](/software/PromptBase/apps/api/src/health/health.controller.ts)

### `GET /health`

示例返回：

```json
{
  "status": "ok",
  "database": true,
  "redis": true
}
```

这个接口直接检查：

- PostgreSQL 连通性
- Redis 连通性

## 14. 前端与 API 的映射关系

前端不会直接在页面里散落 fetch，大部分接口都已经在 hooks 中封装。

几个典型映射：

- 认证
  [use-auth.ts](/software/PromptBase/apps/web/src/hooks/use-auth.ts)
- 提示词
  [use-prompts.ts](/software/PromptBase/apps/web/src/hooks/use-prompts.ts)
- 文件夹
  [use-folders.ts](/software/PromptBase/apps/web/src/hooks/use-folders.ts)
- 标签
  [use-tags.ts](/software/PromptBase/apps/web/src/hooks/use-tags.ts)
- 模型配置
  [use-model-providers.ts](/software/PromptBase/apps/web/src/hooks/use-model-providers.ts)
- 测试运行
  [use-test-runs.ts](/software/PromptBase/apps/web/src/hooks/use-test-runs.ts)
- 审计日志
  [use-audit-logs.ts](/software/PromptBase/apps/web/src/hooks/use-audit-logs.ts)

## 15. 扩展建议

如果后续继续扩 API，建议保持下面几个约定：

- 组织级业务资源继续挂在 `/orgs/:orgId/...`
- 新接口优先沿用当前 DTO + service 风格
- 前端新增接口时先补对应 hook，再在页面调用
- 对象存储相关任务继续走后台 job，不要直接把大文件同步塞进主请求链路

## 16. 关联文档

- 技术架构：[ARCHITECTURE.md](/software/PromptBase/docs/ARCHITECTURE.md)
- 数据库设计：[DATABASE_DESIGN.md](/software/PromptBase/docs/DATABASE_DESIGN.md)
- 使用与运维：[USAGE_GUIDE.md](/software/PromptBase/docs/USAGE_GUIDE.md)
- 运维 SOP：[OPERATIONS_SOP.md](/software/PromptBase/docs/OPERATIONS_SOP.md)
