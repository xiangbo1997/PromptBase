# PromptBase 运维 SOP

这份文档面向日常维护、发布、回滚和排障。假设当前生产方式仍然是单机 `Caddy + docker-compose`。

## 1. 当前生产事实

域名：

- `prompt.feixingqi.shop`

当前运行组件：

- `Caddy`
- `web` 容器
- `api` 容器
- `postgres` 容器
- `redis` 容器
- `minio` 容器

关键本地端口：

- `127.0.0.1:3008`
  前端
- `127.0.0.1:3001`
  后端

## 2. 发布前检查

每次发布前至少确认：

1. 仓库工作区干净，或者你知道哪些文件是有意变更
2. 文档、环境变量和部署文件没有漂移
3. 前端已经通过生产构建
4. 如果涉及后端，确认数据库迁移策略清楚

常用命令：

```bash
git status --short
git log -1 --oneline
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml ps
```

## 3. 标准发布流程

### 3.1 全量发布

```bash
git pull
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --build
```

发布后验证：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml ps
curl -sS http://127.0.0.1:3001/health
curl -I -sS https://prompt.feixingqi.shop/login
```

### 3.2 只发布前端

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build web
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --no-deps web
```

### 3.3 只发布后端

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build api
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --no-deps api
```

## 4. 发布后验证

### 4.1 服务状态

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml ps
docker ps --format '{{.Names}}\t{{.Status}}\t{{.Image}}'
```

### 4.2 API 健康

```bash
curl -sS http://127.0.0.1:3001/health
```

期望：

```json
{"status":"ok","database":true,"redis":true}
```

### 4.3 前端健康

```bash
curl -I -sS http://127.0.0.1:3008/login
curl -I -sS https://prompt.feixingqi.shop/login
```

期望：

- 返回 `200`

### 4.4 Caddy 路由验证

本机验证：

```bash
curl -I -sS -H 'Host: prompt.feixingqi.shop' http://127.0.0.1/login
```

期望：

- HTTP 自动跳转到 HTTPS

## 5. 日常排障流程

## 5.1 API 不健康

先看健康接口：

```bash
curl -sS http://127.0.0.1:3001/health
```

再看日志：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml logs --tail=100 api postgres redis
```

重点确认：

- PostgreSQL 是否 healthy
- Redis 是否 healthy
- `DATABASE_URL` 是否正确
- `REDIS_URL` 是否正确

## 5.2 前端返回 502/504 或打不开

检查：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml logs --tail=100 web
curl -I -sS http://127.0.0.1:3008/login
```

如果本地 `3008` 不通，再检查容器是否启动。

## 5.3 域名打不开，但本机端口正常

检查 Caddy：

```bash
caddy validate --config /etc/caddy/Caddyfile
journalctl -u caddy.service --since '10 minutes ago' --no-pager | tail -n 100
```

重点看：

- 证书签发失败
- 配置语法错误
- 反向代理目标写错

## 5.4 导入导出失败

优先检查：

- MinIO 是否 healthy
- `MINIO_*` 配置是否正确
- API 日志里是否有对象存储错误

命令：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml logs --tail=100 api minio
```

## 6. docker-compose 已知问题处理

当前宿主机使用的 `docker-compose 1.29.2` 有一个已知 bug：

- 在重建 `web` 容器时可能出现 `ContainerConfig` 错误

典型报错：

```text
ERROR: for deploy_web_1 'ContainerConfig'
```

处理步骤：

1. 找出失败的旧容器

```bash
docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Image}}' | rg 'deploy_web'
```

2. 删除失败容器

```bash
docker rm -f <failed_container_name>
```

3. 重新启动 `web`

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --no-deps web
```

这一步只影响 `web`，不会重启数据库或 API。

## 7. 回滚 SOP

### 7.1 应用级回滚

如果刚发布的代码有问题：

1. 找到上一个稳定 commit
2. 切回该 commit
3. 重建并重启对应服务

示例：

```bash
git log --oneline -10
git checkout <stable_commit>
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --build web api
```

注意：

- 不要用 destructive git 命令清掉用户未确认的改动
- 如果当前工作树不干净，先评估是否需要 stash 或另起目录

### 7.2 Caddy 配置回滚

如果最近改过 Caddy：

1. 找备份的 `/etc/caddy/Caddyfile.bak-*`
2. 恢复到已知可用版本
3. 验证并重载

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

## 8. 常用命令清单

查看状态：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml ps
```

查看日志：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml logs -f api web
```

重建前端：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build web
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --no-deps web
```

重建后端：

```bash
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml build api
docker-compose --env-file deploy/.env.production -f deploy/docker-compose.prod.yml up -d --no-deps api
```

看 Caddy：

```bash
caddy validate --config /etc/caddy/Caddyfile
journalctl -u caddy.service --since '30 minutes ago' --no-pager | tail -n 100
```

看线上登录页：

```bash
curl -I -sS https://prompt.feixingqi.shop/login
```

## 9. 建议的值班检查表

每天或每次变更后至少做：

1. `docker-compose ... ps`
2. `curl http://127.0.0.1:3001/health`
3. `curl -I https://prompt.feixingqi.shop/login`
4. 查看最近 `api` 和 `caddy` 日志是否有连续报错

## 10. 关联文档

- 使用文档：[USAGE_GUIDE.md](/software/PromptBase/docs/USAGE_GUIDE.md)
- 技术架构：[ARCHITECTURE.md](/software/PromptBase/docs/ARCHITECTURE.md)
- API 文档：[API_REFERENCE.md](/software/PromptBase/docs/API_REFERENCE.md)
- 数据库设计：[DATABASE_DESIGN.md](/software/PromptBase/docs/DATABASE_DESIGN.md)
