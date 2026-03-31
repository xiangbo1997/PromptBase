# PromptBase 使用与运维文档

这份文档面向三类读者：

- 产品或运营同学：了解系统能做什么，怎么使用主要功能
- 开发或测试同学：快速启动本地环境，验证关键流程
- 运维同学：理解当前生产部署方式、常用命令和排障路径

## 1. 你能从这个系统得到什么

PromptBase 是一个团队级 AI 提示词管理平台。它解决的核心问题不是“写一个提示词”，而是“把提示词当成团队资产来管理”。

你可以用它做这些事：

- 统一管理团队提示词
- 给提示词打标签、分文件夹、置顶、收藏
- 编辑提示词内容并保留历史版本
- 定义模板变量，生成可复用提示词模板
- 配置模型提供商并发起 AI 测试运行
- 导入导出提示词资产
- 审计关键操作记录
- 管理团队成员和组织角色
- 在中英文之间切换界面语言
- 在站内通过 AI 助手询问这个平台怎么用，并由助手代你完成部分创建操作

## 2. 核心界面说明

当前系统默认包含这些主要页面：

- `/login`
  用于登录
- `/register`
  用于注册并初始化账户
- `/prompts`
  提示词主列表页，支持搜索、筛选、收藏、置顶、导入、导出
- `/prompts/new`
  新建提示词
- `/prompts/:id`
  编辑提示词，包含属性、历史、模板、测试四个面板
- `/favorites`
  我的收藏
- `/search`
  全局搜索结果页
- `/playground`
  AI 实验室，自由测试提示词
- `/settings`
  基础设置入口
- `/settings/models`
  模型提供商配置
- `/settings/folders`
  文件夹管理
- `/settings/tags`
  标签管理
- `/settings/team`
  团队成员管理
- `/settings/audit`
  审计日志

登录后的 dashboard 右下角还有一个“使用指导助手”入口。它适合回答：

- 某个功能入口在哪里
- 某项操作应该怎么做
- 当前支持什么能力或格式
- 管理员如何配置模型、团队、导入导出或部署
- 帮你按步骤创建提示词、标签或文件夹

## 3. 典型使用流程

### 3.1 注册与登录

1. 打开 `/register`
2. 输入姓名、邮箱、密码
3. 注册成功后进入系统
4. 后续通过 `/login` 使用邮箱密码登录

### 3.2 创建第一个提示词

1. 进入 `/prompts`
2. 点击“新建提示词”
3. 填写标题、描述、内容
4. 选择文件夹和标签
5. 保存后系统会跳转到详情页

### 3.3 把提示词做成模板

在提示词正文中使用 `{{变量名}}` 语法即可定义模板变量。也支持扩展写法，例如：

```text
请根据以下信息生成销售跟进话术：
客户名称：{{customer_name}}
行业：{{industry}}
产品诉求：{{need:default=提高转化率}}
```

保存后，在提示词详情页的“模板”面板里可以：

- 给变量赋值
- 预览渲染后的完整提示词
- 一键复制渲染结果

### 3.4 测试模型输出

有两种方式：

- 在提示词详情页的“测试”面板中测试当前提示词版本
- 在 `/playground` 中自由输入内容并测试

测试前需要先在 `/settings/models` 中配置模型提供商。

### 3.5 组织整理资产

建议按照下面的方式整理：

- 用文件夹表达业务域
  例如：销售、客服、运营、研发
- 用标签表达场景或能力
  例如：营销、代码审查、客服 SOP、翻译
- 用置顶表达高频重要资产
- 用收藏表达个人常用资产

### 3.6 导入导出

在 `/prompts` 页面可以直接发起导入导出：

- 导出支持 `JSON`、`CSV`、`MARKDOWN`
- 导入支持 `.json`、`.csv`、`.md`

建议：

- 日常备份优先使用 `JSON`
- 给业务同学导出分析数据时使用 `CSV`
- 给人类阅读和知识沉淀时使用 `MARKDOWN`

## 4. 国际化使用说明

系统已经具备国际化能力，当前支持：

- `zh-CN`
- `en-US`

语言切换入口：

- 登录/注册页右上角
- 系统登录后顶部栏右侧

当前实现特点：

- 语言选择会保存在浏览器 `localStorage`
- 刷新后会保留上次选择
- `document.lang`、页面标题和描述会跟随语言同步

## 4.1 使用指导助手

这个助手不是通用聊天机器人，而是平台内帮助助手。

推荐这样提问：

- “怎么新建一个提示词？”
- “模板变量怎么用？”
- “怎么配置模型提供商？”
- “导出支持哪些格式？”
- “帮我新建一个提示词，标题叫销售开场白”
- “帮我创建一个标签，名字叫营销”
- “帮我创建一个文件夹，名字叫销售资料”

当前行为约束：

- 回答优先依据仓库内文档
- 回答会附带引用来源
- 文档里没有直接答案时，可以做有限推断，但会明确标记为“推断说明”
- 如果组织内已经配置了可用模型，优先使用组织模型；否则会回退到平台默认模型

动作能力目前支持：

- 创建提示词
- 创建标签
- 创建文件夹
- 对当前会话里最近一次由助手创建的结果执行撤销

创建提示词时，助手会先理解你已经给出的信息，再继续追问缺失字段。通常会收集：

- 标题
- 内容
- 可选的描述
- 可选的标签
- 可选的文件夹
- 是否作为模板

如果你指定的标签或文件夹不存在，助手会先询问是否要一并创建。你回复确认后，它会继续完成后续步骤。

## 5. 本地开发

### 5.1 环境要求

- Node.js
  开发建议 `>= 20`
- npm
- Docker / docker-compose

### 5.2 启动基础依赖

仓库根目录已经提供本地基础设施：

```bash
docker-compose up -d
```

这会启动：

- PostgreSQL
- Redis
- MinIO

默认端口：

- PostgreSQL: `5433`
- Redis: `6380`
- MinIO API: `9000`
- MinIO Console: `9001`

### 5.3 安装依赖并启动应用

```bash
npm install
npm run dev
```

默认访问地址：

- Web: `http://localhost:3008`
- API: `http://127.0.0.1:3001`

### 5.4 开发时的关键环境变量

后端核心变量示例见：
[apps/api/.env.example](/software/PromptBase/apps/api/.env.example)

重点变量：

- `DATABASE_URL`
- `REDIS_URL`
- `PORT`
- `JWT_SECRET`
- `MODEL_KEY_SECRET`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

前端核心变量：

- `NEXT_PUBLIC_API_URL`

## 6. 生产部署

当前仓库已经补充了容器化部署资产，入口文件在：

- [deploy/docker-compose.prod.yml](/software/PromptBase/deploy/docker-compose.prod.yml)
- [deploy/.env.production.example](/software/PromptBase/deploy/.env.production.example)
- [deploy/Caddyfile.prompt.feixingqi.shop](/software/PromptBase/deploy/Caddyfile.prompt.feixingqi.shop)
- [deploy/README.md](/software/PromptBase/deploy/README.md)

### 6.1 当前生产拓扑

当前生产部署方式是：

- `Caddy` 负责域名和 HTTPS
- `web` 容器监听 `127.0.0.1:3008`
- `api` 容器监听 `127.0.0.1:3001`
- `postgres`、`redis`、`minio` 运行在同一个 compose 栈里

路由规则：

- `https://prompt.feixingqi.shop/` -> 前端
- `https://prompt.feixingqi.shop/api/*` -> 后端
- `https://prompt.feixingqi.shop/health` -> 后端健康检查

### 6.2 启动生产栈

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --build
```

### 6.3 常用运维命令

查看容器状态：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml ps
```

查看应用日志：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml logs -f api web
```

仅重建前端：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build web
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --no-deps web
```

健康检查：

```bash
curl -sS http://127.0.0.1:3001/health
curl -I -sS http://127.0.0.1:3008/login
curl -I -sS https://prompt.feixingqi.shop/login
```

## 7. 常见问题与排障

### 7.1 API 健康检查返回 `error`

先检查：

- PostgreSQL 容器是否 healthy
- Redis 容器是否 healthy
- `DATABASE_URL` 是否正确
- `REDIS_URL` 是否正确

命令：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml ps
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml logs --tail=100 api postgres redis
```

### 7.2 前端能打开，但接口报错

优先确认：

- `NEXT_PUBLIC_API_URL` 是否正确
- Caddy `/api/*` 是否正确转发到 `127.0.0.1:3001`
- 后端容器是否正常运行

### 7.3 `docker-compose` 重建 `web` 时出现 `ContainerConfig` 错误

这是当前宿主机 `docker-compose 1.29.2` 的已知问题，不是项目代码本身错误。

处理方式：

1. 找到失败的旧 `web` 容器
2. 删除该失败容器
3. 重新执行 `docker-compose ... up -d --no-deps web`

### 7.4 Next.js 开发态出现 `.next` 缓存损坏

这个仓库有一个已知本地问题：

- 不要在 `apps/web` 正在 `next dev` 时同时跑 `next build`

如果出现丢 chunk、`Cannot find module './769.js'` 之类错误，按下面顺序处理：

1. 停掉当前 dev server
2. 备份并移走 `apps/web/.next`
3. 重新启动 dev
4. 再访问 `/login` 和 API `/health` 验证

## 8. 团队使用建议

如果你们准备把 PromptBase 当成正式团队系统，建议从第一天就约定：

- 文件夹代表业务域
- 标签代表场景或能力
- 高价值提示词必须补描述
- 模板提示词优先替代硬编码文本
- 上线前先在 AI Lab 或测试面板验证
- 周期性导出 `JSON` 做备份

## 9. 文档关联

- 项目总览：[README.md](/software/PromptBase/README.md)
- 生产部署：[deploy/README.md](/software/PromptBase/deploy/README.md)
- 技术架构：[ARCHITECTURE.md](/software/PromptBase/docs/ARCHITECTURE.md)
