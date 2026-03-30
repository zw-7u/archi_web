# 故宫十二时辰 - 部署指南

本指南将帮助你将项目部署到 Netlify，并通过 GitHub 实现自动部署。

## 📋 准备工作

### 1. 你需要准备的内容

- GitHub 账号（你已有：`zw-7u/archi_web`）
- Netlify 账号（免费注册：https://www.netlify.com）
- 通义千问 API Key（从阿里云获取）

### 2. 项目结构

```
his-archi/
├── index.html          # 主页面
├── netlify.toml        # Netlify 配置文件
├── netlify/
│   └── functions/
│       └── chat.js     # AI 对话函数（替代原来的 api/）
├── css/
│   └── ...             # 样式文件
├── js/
│   └── ...             # JavaScript 文件
├── images/             # 图片资源（如有）
└── .gitignore          # Git 忽略文件
```

---

## 🚀 部署步骤

### 第一步：将项目推送到 GitHub

#### 1. 初始化 Git 仓库（如果还没有）

```bash
cd e:\contest\his-archi
git init
```

#### 2. 添加所有文件（排除 node_modules 和 api/）

```bash
git add .
git add -f api/package.json api/package-lock.json  # 只保留这两个
```

#### 3. 提交

```bash
git commit -m "Initial commit for Netlify deployment"
```

#### 4. 添加远程仓库并推送

```bash
git remote add origin https://github.com/zw-7u/archi_web.git
git branch -M main
git push -u origin main
```

### 第二步：在 Netlify 上部署

#### 1. 登录 Netlify

访问 https://app.netlify.com 并登录你的账号。

#### 2. 添加新站点

- 点击 "Add new site"
- 选择 "Import an existing project"
- 选择 GitHub 作为 provider
- 授权 Netlify 访问你的 GitHub 仓库
- 选择仓库 `archi_web`

#### 3. 配置构建选项

在配置页面填写：

| 设置项 | 值 |
|--------|-----|
| Build command | （留空） |
| Publish directory | `/` |
| Functions directory | `netlify/functions` |

#### 4. 设置环境变量

在 "Environment variables" 中添加：

| 变量名 | 值 |
|--------|-----|
| `DASHSCOPE_API_KEY` | 你的通义千问 API Key |

**如何获取 API Key：**
1. 访问阿里云百炼：https://bailian.console.aliyun.com/
2. 登录后进入控制台
3. 创建应用或获取 API Key

#### 5. 部署站点

点击 "Deploy site"，等待部署完成。

### 第三步：配置自定义域名（可选）

如果你有��己的域名，可以在 Netlify 中设置自定义域名：

1. 进入 Site settings → Domain management
2. 点击 "Add custom domain"
3. 按照提示配置 DNS

---

## 🔄 实现自动部署

当你向 GitHub 推送代码时，Netlify 会自动重新部署。

### 工作流程

1. 在本地修改代码
2. 提交到 GitHub
3. Netlify 自动检测到更新
4. 自动构建并部署

### 强制重新部署

如果需要手动触发部署：
- 在 Netlify dashboard 中点击 "Trigger deploy"
- 选择 "Deploy last trigger"

---

## ⚠️ 重要说明

### 关于 API 功能

- 原来的 `api/` 目录已转换为 `netlify/functions/chat.js`
- 所有请求 `/api/chat` 会自动重定向到 Netlify Function
- 前端代码无需修改

### 关于 API Key 安全

- 永远不要将 API Key 提交到 GitHub
- 所有敏感的 API Key 都应存储在 Netlify 环境变量中

### 关于 node-fetch

Netlify Functions 原生支持 `node-fetch`，不需要额外安装。

---

## 🐛 故障排除

### 部署失败

1. 检查 `netlify.toml` 配置
2. 查看 Netlify 构建日志
3. 确认 GitHub 仓库包含所有必要文件

### AI 功能不工作

1. 检查浏览器控制台是否有错误
2. 确认 `DASHSCOPE_API_KEY` 环境变量已设置
3. 查看 Netlify Function 日志

### 跨域问题

Netlify Function 已经添加了 CORS headers，应该不会有此问题。如果遇到，请检查前端代码中的 API 地址配置。

---

## 📞 获取帮助

如果遇到问题：
1. 查看 Netlify 文档：https://docs.netlify.com/
2. 查看 Netlify Functions 文档：https://docs.netlify.com/functions/overview/
3. 提交 GitHub Issue

---

## ✅ 快速检查清单

- [ ] GitHub 仓库已创建并推送代码
- [ ] Netlify 账号已创建
- [ ] Netlify 已连接 GitHub 仓库
- [ ] `DASHSCOPE_API_KEY` 已配置
- [ ] 首次部署成功
- [ ] AI 对话功能正常工作

祝你部署顺利！