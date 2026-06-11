# OpenKounter — Cloudflare Worker 自建计数器

兼容 [Hexo Fluid 主题](https://github.com/fluid-dev/hexo-theme-fluid) OpenKounter 统计插件的自建后端。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/counter?target=<target>` | 查询计数器值 |
| POST | `/api/counter` | 批量递增计数器 `{ action: "batch_inc", requests: [{ target: "xxx" }] }` |
| GET | `/health` | 健康检查 |

### 响应格式

```json
{ "code": 0, "data": { ... } }
```

## 部署

### 前置条件

- Node.js >= 18
- [Cloudflare 账号](https://dash.cloudflare.com/)
- 已安装 Wrangler CLI (通过下方命令安装)

### 1. 安装依赖

```bash
cd workers/openkounter
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 创建 KV 命名空间

> ⚠️ **Wrangler v4+** 使用空格分隔子命令（旧版 `kv:namespace` 冒号语法已废弃）。

```bash
# 方式 A：使用 npm script（推荐）
npm run kv:create

# 方式 B：直接使用 npx
npx wrangler kv namespace create COUNTERS
```

输出类似：
```
📦 Creating namespace with title "openkounter-COUNTERS"
✨ Success!
Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "COUNTERS"
id = "abc123def..."
```

将输出的 `id` 填入 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "COUNTERS"
id = "abc123def..."           # ← 替换为实际 ID
preview_id = "abc123def..."   # ← 替换为实际 preview ID（如需要本地开发）
```

预览环境可选，仅在本地 `wrangler dev` 时需要：

```bash
npm run kv:create-preview
```

### 4. 部署

```bash
npm run deploy
```

### 5. 本地开发

```bash
npm run dev
```

## Git 提交与 CI 部署

### wrangler.toml 中的 ID 如何处理？

`wrangler.toml` 中的 KV Namespace ID **不是敏感信息**，它只是一个 Cloudflare 资源标识符，没有 API Token 就无法操作 KV 数据，**可以安全地提交到 Git**。

如果你希望其他开发者也能拉取代码并本地开发，clone 后按上述步骤 3 创建自己的 KV 命名空间并替换 `id` 即可。

### 提交到 Git

```bash
# 1. 初始化仓库
git init

# 2. 添加所有文件
git add .

# 3. 提交
git commit -m "feat: init openkounter"
```

### 关联远程仓库 & 部署

```bash
# 关联远程（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/openkounter.git
git push -u origin main

# 部署到 Cloudflare Workers
npm run deploy
```

> `npm run deploy` 时会自动读取 `wrangler.toml` 中的配置（包括 KV 绑定），无需额外操作。

### 6. 连接 GitHub 自动部署（可选）

也可以在 Cloudflare Dashboard 直接绑定 GitHub 仓库，推送代码后自动部署。

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Connect Git repository**
2. 选择你的仓库，在 **Build configuration** 中设置：
   - **Root Directory** → 输入 `openkounter`
   - **Build command** → **留空**（本项目为纯 JS，无需构建）
3. 创建 Worker 后，在 **Settings** → **Variables** 确认 KV Namespace 绑定已生效
4. 之后每次推送代码到 `main` 分支，Cloudflare 会自动拉取并部署

> 如果部署时报 `ENOENT` 错误，说明 Root Directory 未正确指向 `openkounter`；报 `Missing script: "build"` 错误，说明 Build command 未清空。

## 配置博客

在 `_config.fluid.yml` 中修改：

```yaml
web_analytics:
  enable: true
  openkounter:
    # 替换为你的 Worker 地址
    server_url: https://openkounter.your-domain.workers.dev
    path: window.location.pathname
    ignore_local: false

footer:
  statistics:
    enable: true
    source: openkounter

post:
  meta:
    views:
      enable: true
      source: openkounter
```
