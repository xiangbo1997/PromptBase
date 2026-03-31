# PromptBase 数据库设计文档

这份文档基于当前 Prisma schema，总结核心实体、关系、约束和建模意图。它的目标不是替代 schema，而是帮助你理解“为什么这样设计”。

Schema 源文件：

- [schema.prisma](/software/PromptBase/apps/api/prisma/schema.prisma)

## 1. 技术选型

- 数据库：PostgreSQL
- ORM：Prisma
- 主键：UUID

Prisma datasource：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 2. 枚举设计

当前核心枚举：

- `OrgMemberStatus`
  `INVITED | ACTIVE | SUSPENDED`
- `PromptStatus`
  `DRAFT | ACTIVE | ARCHIVED`
- `PromptVisibility`
  `PRIVATE | ORG`
- `TestRunStatus`
  `QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELED`
- `ImportExportJobType`
  `IMPORT | EXPORT`
- `ImportExportFormat`
  `JSON | CSV | MARKDOWN`
- `JobStatus`
  `QUEUED | RUNNING | SUCCEEDED | FAILED | CANCELED`

这些枚举的意义是：

- 把业务状态放到数据库层，减少魔法字符串
- 让前后端共享更稳定的状态集
- 为后续审计和任务系统提供明确状态边界

## 3. 主实体分组

## 3.1 身份与组织

### `User`

表示系统用户。

关键字段：

- `email`
  全局唯一
- `displayName`
- `passwordHash`
- `isActive`

这个模型既承载认证，也承载提示词、文件夹、版本、审计等“创建人/操作人”关系。

### `Organization`

表示团队或组织。

关键字段：

- `slug`
  全局唯一
- `name`
- `description`
- `createdById`

几乎所有业务资产都属于某个组织。

### `Role`

组织内角色。

关键字段：

- `key`
  例如 `owner/admin/editor/viewer`
- `permissions`
  JSON 结构
- `isSystem`

### `OrgMember`

用户与组织的成员关系。

关键字段：

- `orgId`
- `userId`
- `roleId`
- `status`

约束：

- `@@unique([orgId, userId])`

这个约束保证同一用户在同一组织中只能有一条成员记录。

## 3.2 提示词资产

### `Folder`

提示词目录树。

关键字段：

- `parentId`
- `name`
- `description`
- `materializedPath`

为什么使用 `materializedPath`：

- 查询整棵树时简单
- 判断层级关系方便
- 移动节点可以通过路径重写实现

约束：

- `@@unique([orgId, materializedPath])`

### `Tag`

提示词标签。

关键字段：

- `name`
- `slug`
- `color`
- `description`

约束：

- `@@unique([orgId, slug])`

标签不直接挂在 `Prompt` 上，而是通过关系表关联。

### `Prompt`

提示词主实体。

关键字段：

- `title`
- `description`
- `summary`
- `status`
- `visibility`
- `isTemplate`
- `isArchived`
- `variables`
- `folderId`
- `currentVersionId`

`Prompt` 主要承载：

- 业务归属
- 当前状态
- 当前版本引用
- 收藏/置顶/测试等外围关系

### `PromptVersion`

提示词版本快照。

关键字段：

- `promptId`
- `versionNumber`
- `title`
- `content`
- `snapshot`
- `variables`
- `checksum`
- `changeSummary`

约束：

- `@@unique([promptId, versionNumber])`

这个设计保证每个提示词内部版本号唯一递增。

### `PromptTagRelation`

提示词和标签的多对多关联表。

约束：

- `@@unique([promptId, tagId])`

这样同一标签不会被重复绑定到同一个提示词。

## 3.3 用户行为关系

### `Favorite`

表示用户收藏某个提示词。

典型用途：

- 我的收藏页面
- 提示词卡片收藏状态

### `Pin`

表示用户置顶某个提示词。

与收藏的区别：

- 收藏偏长期个人偏好
- 置顶偏高频工作入口

`Pin` 通常还与顺序逻辑一起出现。

## 3.4 AI 相关配置与运行

### `ModelProvider`

模型提供商配置。

关键字段：

- `name`
- `provider`
- `apiKey`
- `baseUrl`
- `models`
- `isActive`

设计意图：

- 一个组织可以配置多个 provider
- 每个 provider 可以挂多个模型 ID
- `apiKey` 存储的是加密后的值

约束：

- `@@unique([orgId, name])`

### `TestRun`

AI 模型测试运行记录。

它通常关联：

- 组织
- 提示词或提示词版本
- 发起人
- 状态
- 输出和指标

用于支撑：

- 提示词详情页测试
- AI 实验室
- 流式输出与任务状态查询

## 3.5 运维与审计

### `ImportExportJob`

导入导出任务记录。

关键字段通常包括：

- 类型：IMPORT / EXPORT
- 格式：JSON / CSV / MARKDOWN
- 状态
- 输入或输出目标
- 汇总结果
- 错误信息

### `AuditLog`

审计日志。

典型记录维度：

- 操作人
- 行为
- 对象类型
- 对象 ID
- 变更前后内容
- metadata

这是管理后台“可追溯性”的核心表。

## 4. 关系图思维模型

可以把整个数据库理解成五层：

1. 身份层
   `User`, `Organization`, `Role`, `OrgMember`
2. 资产层
   `Prompt`, `PromptVersion`, `Folder`, `Tag`, `PromptTagRelation`
3. 用户行为层
   `Favorite`, `Pin`
4. AI 运行层
   `ModelProvider`, `TestRun`
5. 运维审计层
   `ImportExportJob`, `AuditLog`

## 5. 索引与性能考虑

Schema 里已经有几类关键索引：

- 组织维度索引
  例如 `@@index([orgId, ...])`
- 列表过滤索引
  例如 `Prompt` 上的状态、标题、文件夹索引
- 唯一性约束
  例如角色 key、标签 slug、版本号

这些索引的主要目标是：

- 保证组织级隔离下的查询效率
- 支撑常见列表页过滤
- 保证业务语义唯一性

## 6. 为什么 `Prompt` 和 `PromptVersion` 要分开

这是整个 schema 里最重要的设计之一。

如果只把内容直接存到 `Prompt`：

- 很难保留历史
- 无法恢复版本
- 无法做差异比较
- 审计成本高

拆成双表后：

- `Prompt` 表示“当前业务对象”
- `PromptVersion` 表示“历史快照集合”
- `currentVersionId` 负责把当前对象和当前快照关联起来

这非常适合提示词类系统。

## 7. 为什么 `Folder` 用树而不是扁平标签

文件夹表达的是结构化归类，不是标签式维度。

它适合：

- 按业务域组织内容
- 支持目录级筛选
- 形成稳定团队信息架构

`materializedPath` 比闭包表更容易在当前规模下维护，也比纯 parentId 在整树查询时更方便。

## 8. 数据安全关注点

当前 schema 下最需要额外注意的字段：

- `User.passwordHash`
- `ModelProvider.apiKey`
- 各类 token 或凭证型 metadata

实践建议：

- 所有敏感字段都不要在前端直接回传原文
- `apiKey` 更新接口允许“留空不变”
- 审计日志避免把敏感密钥写进去

## 9. 后续演进建议

如果数据量继续上升，建议优先关注：

1. `Prompt` 列表和搜索的复合索引
2. `AuditLog` 的时间范围查询成本
3. `ImportExportJob` 和 `TestRun` 的冷热数据分层
4. 是否为大组织引入更细粒度权限模型

## 10. 关联文档

- 技术架构：[ARCHITECTURE.md](/software/PromptBase/docs/ARCHITECTURE.md)
- API 文档：[API_REFERENCE.md](/software/PromptBase/docs/API_REFERENCE.md)
- 运维 SOP：[OPERATIONS_SOP.md](/software/PromptBase/docs/OPERATIONS_SOP.md)
