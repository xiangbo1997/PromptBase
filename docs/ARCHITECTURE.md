# PromptBase 技术架构文档

这份文档说明 PromptBase 当前的实际技术架构、模块边界、数据流和部署拓扑。目标不是讲概念，而是让接手代码的人能快速回答三个问题：

- 代码在哪里
- 请求怎么流转
- 该从哪里扩展

## 1. 架构总览

PromptBase 是一个 Turbo monorepo，主要由四部分组成：

- `apps/web`
  Next.js 14 前端
- `apps/api`
  NestJS + Fastify 后端
- `packages/shared`
  前后端共享类型、枚举和协议描述
- `packages/ui`
  轻量 UI 工具函数

运行时依赖：

- PostgreSQL
- Redis
- MinIO 或兼容 S3 的对象存储

## 2. 仓库结构

### 2.1 顶层目录

- [apps](/software/PromptBase/apps)
- [packages](/software/PromptBase/packages)
- [deploy](/software/PromptBase/deploy)
- [docker-compose.yml](/software/PromptBase/docker-compose.yml)
- [package.json](/software/PromptBase/package.json)
- [turbo.json](/software/PromptBase/turbo.json)

### 2.2 前端目录

前端核心目录：

- [apps/web/src/app](/software/PromptBase/apps/web/src/app)
  App Router 页面
- [apps/web/src/components](/software/PromptBase/apps/web/src/components)
  页面级和可复用组件
- [apps/web/src/hooks](/software/PromptBase/apps/web/src/hooks)
  React Query 数据访问 hooks
- [apps/web/src/lib](/software/PromptBase/apps/web/src/lib)
  API 请求、i18n、工具函数
- [apps/web/src/stores](/software/PromptBase/apps/web/src/stores)
  Zustand 状态

### 2.3 后端目录

后端按业务模块分层，主要在：

- [apps/api/src/auth](/software/PromptBase/apps/api/src/auth)
- [apps/api/src/org](/software/PromptBase/apps/api/src/org)
- [apps/api/src/prompt](/software/PromptBase/apps/api/src/prompt)
- [apps/api/src/folder](/software/PromptBase/apps/api/src/folder)
- [apps/api/src/tag](/software/PromptBase/apps/api/src/tag)
- [apps/api/src/favorite](/software/PromptBase/apps/api/src/favorite)
- [apps/api/src/pin](/software/PromptBase/apps/api/src/pin)
- [apps/api/src/model-provider](/software/PromptBase/apps/api/src/model-provider)
- [apps/api/src/test-run](/software/PromptBase/apps/api/src/test-run)
- [apps/api/src/import-export](/software/PromptBase/apps/api/src/import-export)
- [apps/api/src/audit-log](/software/PromptBase/apps/api/src/audit-log)
- [apps/api/src/search](/software/PromptBase/apps/api/src/search)
- [apps/api/src/health](/software/PromptBase/apps/api/src/health)
- [apps/api/src/prisma](/software/PromptBase/apps/api/src/prisma)
- [apps/api/src/redis](/software/PromptBase/apps/api/src/redis)

数据库 schema 位于：

- [apps/api/prisma/schema.prisma](/software/PromptBase/apps/api/prisma/schema.prisma)

## 3. 前端架构

## 3.1 路由与页面组织

前端使用 Next.js App Router。

主要路由分组：

- `(auth)`
  登录与注册
- `(dashboard)`
  登录后的业务主界面

关键布局：

- [apps/web/src/app/layout.tsx](/software/PromptBase/apps/web/src/app/layout.tsx)
  根布局，挂载 React Query 和 i18n Provider
- [apps/web/src/app/(dashboard)/layout.tsx](/software/PromptBase/apps/web/src/app/(dashboard)/layout.tsx)
  登录态布局，挂载侧边栏、顶部栏和鉴权保护

## 3.2 状态管理

前端状态分成两类：

- 服务端状态
  用 React Query 管理
- 客户端会话状态
  用 Zustand 管理

认证状态入口：

- [apps/web/src/stores/auth.ts](/software/PromptBase/apps/web/src/stores/auth.ts)

数据 hooks 入口：

- [apps/web/src/hooks/use-auth.ts](/software/PromptBase/apps/web/src/hooks/use-auth.ts)
- [apps/web/src/hooks/use-prompts.ts](/software/PromptBase/apps/web/src/hooks/use-prompts.ts)
- [apps/web/src/hooks/use-folders.ts](/software/PromptBase/apps/web/src/hooks/use-folders.ts)
- [apps/web/src/hooks/use-tags.ts](/software/PromptBase/apps/web/src/hooks/use-tags.ts)
- [apps/web/src/hooks/use-model-providers.ts](/software/PromptBase/apps/web/src/hooks/use-model-providers.ts)
- [apps/web/src/hooks/use-test-runs.ts](/software/PromptBase/apps/web/src/hooks/use-test-runs.ts)

设计原则很明确：

- 页面不直接拼 fetch
- 请求逻辑尽量封装到 `hooks`
- 页面组件主要负责状态拼装和交互

## 3.3 API 访问层

统一请求封装在：

- [apps/web/src/lib/api.ts](/software/PromptBase/apps/web/src/lib/api.ts)

主要职责：

- 拼接 `NEXT_PUBLIC_API_URL`
- 注入 `Authorization` 头
- 处理 `401` 后自动登出
- 统一解包后端响应 envelope
- 提供默认错误处理

## 3.4 国际化架构

当前国际化实现不是 locale 路由，而是应用级 Provider 模式。

核心文件：

- [apps/web/src/lib/i18n.ts](/software/PromptBase/apps/web/src/lib/i18n.ts)
- [apps/web/src/components/providers/i18n-provider.tsx](/software/PromptBase/apps/web/src/components/providers/i18n-provider.tsx)
- [apps/web/src/components/layout/locale-switcher.tsx](/software/PromptBase/apps/web/src/components/layout/locale-switcher.tsx)

实现特点：

- 支持 `zh-CN` 和 `en-US`
- 语言选择写入 `localStorage`
- 根布局中的 `document.lang`、`title`、`meta description` 同步更新
- 页面和组件通过 `useI18n()` 获取 `t()` 函数

适合当前仓库的原因：

- 不需要重构所有路由
- 改动面小
- 易于分批迁移页面

如果后续要做 SEO 级多语言，可在此基础上升级为 locale segment 路由。

## 4. 后端架构

## 4.1 应用入口

入口文件：

- [apps/api/src/main.ts](/software/PromptBase/apps/api/src/main.ts)

当前行为：

- 使用 FastifyAdapter
- 开启 CORS
- 全局前缀 `/api/v1`
- `health` 路由例外暴露为 `/health`
- 使用 `ValidationPipe`
- 监听 `0.0.0.0:${PORT}`

总模块入口：

- [apps/api/src/app.module.ts](/software/PromptBase/apps/api/src/app.module.ts)

这里负责：

- 加载全局配置
- 初始化 BullMQ
- 注入各业务模块

## 4.2 模块边界

后端基本遵循 Nest 的标准结构：

- `controller`
  HTTP 接口层
- `service`
  业务逻辑层
- `dto`
  输入校验层
- `module`
  依赖装配层

几个核心模块：

- `auth`
  登录、注册、刷新 token
- `org`
  组织与成员信息
- `prompt`
  提示词 CRUD、版本、恢复
- `folder`
  文件夹 CRUD 与移动
- `tag`
  标签 CRUD
- `favorite`
  收藏逻辑
- `pin`
  置顶逻辑和排序
- `model-provider`
  模型提供商管理与 API key 加密
- `test-run`
  AI 测试运行与流式输出
- `import-export`
  导入导出任务
- `audit-log`
  审计日志查询和记录
- `search`
  按关键词、文件夹、标签搜索

## 4.3 数据访问

数据库访问统一通过 Prisma。

关键文件：

- [apps/api/src/prisma/prisma.service.ts](/software/PromptBase/apps/api/src/prisma/prisma.service.ts)
- [apps/api/src/prisma/prisma.module.ts](/software/PromptBase/apps/api/src/prisma/prisma.module.ts)

设计上没有额外封装 repository 层，而是：

- 用 service 直接调用 Prisma Client
- 在业务 service 层承载查询组合和事务逻辑

这种方式的优点是简单直观，当前规模下维护成本低。

## 4.4 Redis 与异步任务

Redis 主要承担两类职责：

- BullMQ 队列连接
- 运行时缓存/基础连接能力

关键文件：

- [apps/api/src/redis/redis.module.ts](/software/PromptBase/apps/api/src/redis/redis.module.ts)

异步任务主要在：

- `test-run`
- `import-export`

这两类能力适合继续扩展为更明确的后台任务中心。

## 4.5 对象存储

对象存储抽象在：

- [apps/api/src/import-export/import-export.storage.ts](/software/PromptBase/apps/api/src/import-export/import-export.storage.ts)

当前默认实现：

- 使用 AWS S3 SDK
- 默认接 MinIO
- 通过 `MINIO_*` 变量配置 endpoint、region、access key、secret key

## 5. 数据模型概览

数据库 schema 较集中，几个核心实体如下：

- `User`
  用户
- `Organization`
  组织
- `OrgMember`
  用户和组织的成员关系
- `Role`
  组织角色
- `Folder`
  提示词目录树
- `Tag`
  标签
- `Prompt`
  提示词主实体
- `PromptVersion`
  提示词版本快照
- `PromptTagRelation`
  提示词和标签关联
- `Favorite`
  收藏关系
- `Pin`
  置顶关系
- `ModelProvider`
  模型提供商配置
- `TestRun`
  AI 测试运行
- `ImportExportJob`
  导入导出任务
- `AuditLog`
  审计日志

建模重点：

- `Prompt` 与 `PromptVersion` 分离
  当前版本通过 `currentVersionId` 指向
- 文件夹采用 `materializedPath`
  便于层级管理与移动
- `ModelProvider.apiKey`
  需要加密存储和受控返回

## 6. 关键请求链路

## 6.1 登录链路

1. 前端调用 `useLogin()`
2. `request()` 向 `/api/v1/auth/login` 发请求
3. 后端 `AuthController -> AuthService`
4. 返回 token 和用户组织信息
5. 前端写入 Zustand store
6. 后续请求自动携带 `Authorization`

## 6.2 提示词编辑链路

1. 页面加载 `usePrompt()`
2. 获取提示词主数据和当前版本
3. 用户编辑标题、描述、内容、标签、文件夹
4. 点击保存
5. 前端调用 `useUpdatePrompt()`
6. 后端更新 `Prompt` 并生成新 `PromptVersion`

## 6.3 AI 测试运行链路

1. 页面从 `model-provider` 拉取可用模型
2. 用户选择 provider + model
3. 前端调用 `useCreateTestRun()`
4. 后端创建 `TestRun`
5. 前端再通过 `useTestRunStream()` 订阅流式输出
6. 后端以事件流返回 chunk、status、completed、failed

## 6.4 导入导出链路

1. 前端发起 import/export job
2. 后端创建任务记录
3. 后台处理器执行业务逻辑
4. 文件写入对象存储
5. 前端轮询 job 状态
6. 成功后展示结果或下载地址

## 7. 当前生产部署拓扑

当前线上采用单机容器化部署，基础拓扑如下：

```text
Internet
  -> Caddy :443 / :80
    -> /api/*, /health -> api container (127.0.0.1:3001)
    -> other routes     -> web container (127.0.0.1:3008)

api container
  -> postgres container
  -> redis container
  -> minio container
```

相关文件：

- [apps/api/Dockerfile](/software/PromptBase/apps/api/Dockerfile)
- [apps/web/Dockerfile](/software/PromptBase/apps/web/Dockerfile)
- [deploy/docker-compose.prod.yml](/software/PromptBase/deploy/docker-compose.prod.yml)
- [deploy/Caddyfile.prompt.feixingqi.shop](/software/PromptBase/deploy/Caddyfile.prompt.feixingqi.shop)

## 8. 当前架构的优势与限制

### 8.1 优势

- 单体业务域拆分清晰，适合中小团队快速演进
- 前后端共享类型减少协议漂移
- 前端 hooks 分层清楚，页面易读
- 容器化部署绕开了宿主机 Node 版本问题
- 国际化已经具备全站扩展能力

### 8.2 限制

- 国际化还不是 URL 路由级
- 当前生产基础设施仍是单机同栈
- `docker-compose 1.29.2` 在宿主机上有重建 bug
- 后端 service 层直接依赖 Prisma，复杂查询增多后可能需要进一步抽象
- 监控、告警、可观测性还比较轻

## 9. 推荐的后续演进方向

如果继续演进，建议优先顺序如下：

1. 把部署从单机依赖迁向托管 PostgreSQL / Redis / S3
2. 给前端补 E2E 覆盖，尤其是中英文切换和关键业务流
3. 为后端关键模块补更稳定的集成测试
4. 在模型测试、导入导出、审计日志上补更强的可观测性
5. 如需 SEO 多语言，再升级为 locale 路由方案

## 10. 关联文档

- 使用与运维：[USAGE_GUIDE.md](/software/PromptBase/docs/USAGE_GUIDE.md)
- 项目总览：[README.md](/software/PromptBase/README.md)
- 部署说明：[deploy/README.md](/software/PromptBase/deploy/README.md)
