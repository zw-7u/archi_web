# 🏛 古建筑语音AI助手 — 集成指南

## 项目结构

```
├── voice-assistant.html   # 完整Demo页面（含助手组件）
├── proxy-server.js        # Node.js 代理服务（隐藏API Key）
└── README.md              # 本文件
```

## 快速开始

### 1. 启动代理服务

```bash
npm install express cors
 $env:DASHSCOPE_API_KEY="sk-85e57a32c7f04078bc3e8225811086d4"
node proxy-server.js
```

### 2. 打开 Demo 页面

将 `voice-assistant.html` 放到代理服务的 `public/` 目录下，浏览器访问 `http://localhost:3000/voice-assistant.html`

---

## 嵌入到你现有的页面

只需 3 步：

### 第一步：复制 CSS

将 `voice-assistant.html` 中 `<style>` 标签内**除了 `.demo-page` 部分**的所有 CSS 复制到你页面的样式表中。

### 第二步：复制 HTML

将以下 HTML 片段粘贴到你页面 `</body>` 之前：

```html
<!-- 悬浮按钮 -->
<button id="voice-assistant-trigger">...</button>

<!-- 对话面板 -->
<div id="voice-assistant-panel">...</div>
```

### 第三步：复制 JS

将 `<script>` 标签内的全部 JavaScript 复制到你页面底部。

---

## 配置项说明

在 JS 的 `CONFIG` 对象中修改：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `wakeName` | 助手显示名称 | `'助手'` |
| `wakeWord` | 唤醒词 | `'你好助手'` |
| `apiEndpoint` | 代理API地址 | `'/api/chat'` |
| `systemPrompt` | AI系统提示词 | 古建筑讲解员角色 |
| `ttsRate` | 语音朗读速度 | `1.0` |
| `suggestCount` | 推荐问题数量 | `3` |

### 自定义唤醒词示例

```js
const CONFIG = {
  wakeName: '小筑',
  wakeWord: '你好小筑',
  // ...
};
```

---

## 功能说明

| 功能 | 实现方式 |
|------|----------|
| 语音唤醒 | Web Speech API 持续监听唤醒词 |
| 语音输入 | Web Speech API 语音转文字 |
| 文字输入 | 文本框 + 回车/按钮发送 |
| AI 问答 | 通义千问 qwen-turbo（经代理转发） |
| 语音朗读 | Web Speech Synthesis API |
| 猜你想问 | 自动解析页面内容生成推荐 |
| 离线兜底 | 内置本地问答库（API不可用时） |

---

## 浏览器兼容性

| 浏览器 | 语音识别 | 语音合成 |
|--------|---------|---------|
| Chrome 33+ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ |
| Safari 14.1+ | ✅ | ✅ |
| Firefox | ❌ | ✅ |

> 注意：语音识别功能需要 HTTPS 环境（localhost 除外）

---

## 通义千问 API Key 获取

1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 开通 DashScope 服务
3. 创建 API Key
4. 设置环境变量：`DASHSCOPE_API_KEY=sk-xxxxx`