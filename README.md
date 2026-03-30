# 故宫十二时辰 — Twelve Hours of the Forbidden City

> 以数字化方式，重现清代皇帝一日十二时辰的生活轨迹与紫禁城建筑风貌。

[English](#english-version) | [中文说明](#中文说明)

---

## English Version

### Overview

**"Twelve Hours of the Forbidden City"** is an immersive web experience that depicts a single day in the life of an emperor across the ancient palace complex. The project covers eight traditional Chinese time periods (Shichen), each representing a two-hour block of daily imperial life—from the morning reading of classics to the evening palace lights dimming.

### Target Audience

- Students and educators interested in Chinese history and architecture
- Museum visitors and cultural heritage enthusiasts
- Developers exploring creative uses of WebGL and AI

### Core Features

| Feature | Description |
|---|---|
| **Particle 3D Scene** | Three.js-powered particle system renders the Hall of Supreme Harmony (太和殿) in real time, with 6,000 main particles and 3,000 ambient dust particles |
| **Eight Time Periods** | Interactive scenes spanning 卯 (05:00) to 亥 (23:00), each with historical narrative and interactive hotspots |
| **Gesture Navigation** | MediaPipe Hands integration enables palm swipe, pinch-to-zoom, fist cursor lock, and pointing-to-click interactions |
| **AI Voice Assistant** | Qwen (Tongyi) API-powered chatbot for contextual Q&A in Chinese and English, with text-to-speech output |
| **Timeline Navigation** | Bottom navigation bar showing all eight time periods with progress indicator |
| **Bilingual Support** | Full Chinese/English toggle with independent AI personality per language |
| **Push Door Gesture** | On the landing page, push your palm toward the camera to "open the palace doors" and enter |

### Technology Stack

```
Frontend Layer
├── HTML5 + CSS3          Vanilla HTML, modular CSS (7 stylesheets)
├── JavaScript (ES6+)     Pure JS modules, no framework
│
├── 3D & Visualization
│   └── Three.js r128    WebGL particle system (CDN)
│
├── AI & Interaction
│   ├── MediaPipe Hands   Hand gesture detection (CDN)
│   ├── Web Speech API    Speech recognition + TTS
│   └── Tongyi Qwen API   AI chatbot (via Netlify Function proxy)
│
Backend Layer
├── Netlify Functions     Serverless chat proxy (Node.js 18+)
│   └── chat.js           Bridges frontend → Qwen API, hides API key
│
├── Local Dev Server
│   └── api/proxy-server.js  Express.js local proxy (for local testing)
│
Deployment
├── Netlify               Static hosting + serverless functions
├── netlify.toml          Build configuration + SPA routing rules
└── GitHub                CI/CD auto-deploy trigger
```

**Module Architecture** (`js/`):

| File | Responsibility |
|---|---|
| `landing.js` | Three.js particle scene, dissolve transition |
| `scenes.js` | Scene switching, zoom/freeze, CSS class toggling |
| `timeline.js` | Bottom timeline click navigation |
| `cards.js` | Info card popup for hotspot interactions |
| `gesture.js` | MediaPipe Hands detection, cursor simulation |
| `i18n.js` | Full Chinese/English translation system |
| `assistance.js` | AI chat panel, voice I/O, TTS |
| `app.js` | Entry point, global state, cross-module coordination |

### Quick Start

#### Option A: Netlify (Recommended — Production)

1. Push the project to GitHub
2. Connect the repo to Netlify
3. Add environment variable: `DASHSCOPE_API_KEY` = your Tongyi API key
4. Deploy

#### Option B: Local Development

```bash
# 1. Install backend dependencies
cd api && npm install

# 2. Set your API key
set DASHSCOPE_API_KEY=your_key_here

# 3. Start the proxy server
node proxy-server.js

# 4. Open in browser
# http://localhost:3000
```

> **Note:** The `api/` folder is excluded from GitHub. Netlify uses `netlify/functions/chat.js` instead.

### User Guide

#### Landing Page

- **Observe** the glowing particle rendering of the Hall of Supreme Harmony
- **Move your mouse** to trigger a parallax depth effect
- **Click "推门而入"** to enter the palace, or click **"手势推门进入"** and push your palm from the left to open the doors via gesture

#### Main Scenes

- **Navigate:** Swipe left/right (gesture), click timeline buttons, or scroll
- **Interact:** Click glowing hotspot markers to open detailed info cards
- **Zoom:** Pinch thumb + index finger together to scale the scene
- **Lock:** Make a fist to freeze the scene and move the cursor precisely
- **Click:** Point your index finger and hold for 600ms to trigger a click

#### AI Voice Assistant

- **Open:** Click the microphone button in the bottom-right corner
- **Ask:** Type your question, or hold the mic button to speak
- **Listen:** The assistant reads answers aloud via text-to-speech
- **Language:** AI responds in the currently active language (Chinese or English)

#### Language Toggle

- Click the **"中文/EN"** button in the top-right corner to switch between Chinese and English

---

## 中文说明

### 项目简介

**故宫十二时辰** 是一个沉浸式数字体验网页，以粒子3D动画的形式，重现清代皇帝在紫禁城中从清晨到深夜的日常生活场景。项目覆盖八个时辰（卯时至亥时），每个时辰配有历史背景介绍、可交互热区与AI智能讲解。

### 目标用户

- 中国古代建筑与历史爱好者
- 博物馆及文化遗产展示场景
- 前端可视化与AI交互技术学习者

### 核心功能

| 功能 | 说明 |
|---|---|
| **粒子3D场景** | Three.js 渲染太和殿粒子模型，6000个主体粒子 + 3000个环境飘尘粒子，支持鼠标视差 |
| **八时辰场景** | 卯时至亥时共8个场景，每场景包含标题、时段、历史描述与可交互热区 |
| **手势交互** | MediaPipe Hands 实现手掌滑动切换、捏合缩放、握拳锁定、食指指向点击 |
| **AI语音助手** | 通义千问API驱动的中英双语问答，支持语音输入与TTS朗读 |
| **时间轴导航** | 底部时间轴显示全部八个时辰，实时进度指示器 |
| **双语切换** | 中文/英文完整切换，AI助手语言同步适配 |
| **推门手势** | 首页支持手掌从左向右推入触发"叩门而入"进入动画 |

### 技术栈详解

```
┌─────────────────────────────────────────────────────┐
│                    前端层                             │
│  HTML5 + CSS3（7个模块化样式表，无框架）              │
│  JavaScript ES6+（纯原生模块化）                      │
│  Three.js r128（WebGL粒子渲染，CDN引入）             │
│  MediaPipe Hands（手势检测，CDN引入）                 │
│  Web Speech API（语音识别 + TTS语音合成）            │
│  通义千问API（AI对话能力）                           │
└─────────────────────────────────────────────────────┘
                          │
                          ▼ proxy /api/chat
┌─────────────────────────────────────────────────────┐
│                    服务端层                           │
│  Netlify Functions (Node.js 18+，无外部依赖)        │
│  chat.js → 转发请求至通义千问，隐藏API Key           │
│  (本地开发: api/proxy-server.js / Express)          │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                    部署层                             │
│  Netlify 静态托管 + Serverless Functions             │
│  netlify.toml 配置构建规则与重定向规则               │
│  GitHub 触发自动部署（CI/CD）                        │
└─────────────────────────────────────────────────────┘
```

**模块对应关系**（`js/` 目录）：

| 文件 | 职责 |
|---|---|
| `landing.js` | Three.js 粒子场景初始化、鼠标视差、消散过渡动画 |
| `scenes.js` | 场景切换逻辑、缩放/冻结控制、CSS类切换 |
| `timeline.js` | 底部时间轴点击导航与进度更新 |
| `cards.js` | 热区信息卡片弹窗的显示/关闭/内容注入 |
| `gesture.js` | MediaPipe Hands 摄像头手势识别、光标模拟、防抖逻辑 |
| `i18n.js` | 完整的中英文多语言翻译系统 |
| `assistance.js` | AI对话面板、语音输入输出、TTS朗读、建议问题生成 |
| `app.js` | 入口点，全局状态管理，模块间协调 |

### 快速开始

#### 方式一：Netlify 部署（推荐）

1. 将项目推送到 GitHub 仓库
2. 在 [Netlify](https://app.netlify.com) 连接该仓库
3. 在 Environment Variables 中添加：`DASHSCOPE_API_KEY` = 你的通义千问API Key
4. 点击 Deploy 完成部署

#### 方式二：本地开发调试

```bash
# 1. 安装后端依赖
cd api
npm install

# 2. 设置API密钥（Windows PowerShell）
$env:DASHSCOPE_API_KEY="你的key"

# 3. 启动代理服务
node proxy-server.js

# 4. 浏览器打开
# http://localhost:3000
```

> **注意：** `api/` 目录已通过 `.gitignore` 排除，不会上传到 GitHub。生产环境使用 `netlify/functions/chat.js` 替代。

### 操作指南

#### 首页

- 观察不断浮动的金色粒子如何构成太和殿的轮廓
- 移动鼠标触发场景的深度视差效果
- 点击**"推门而入"**按钮进入，或点击**"手势推门进入"**后将手掌从左向右推动，触发"叩门而入"动画

#### 主场景

- **切换场景：** 手掌左右滑动 / 点击底部时间轴按钮 / 键盘方向键
- **交互热区：** 点击发光的热点标记，弹出该建筑/物件的详细介绍卡片
- **缩放场景：** 拇指+食指捏合，根据两指距离实时缩放
- **锁定画面：** 握拳，画面冻结，光标跟随移动，可精确点击
- **点击操作：** 伸开食指指向目标，停留600毫秒触发点击

#### AI语音助手

- **打开助手：** 点击右下角麦克风图标按钮
- **提问：** 输入文字提问，或按住麦克风按钮语音输入
- **聆听回答：** AI自动朗读回答内容（文字+语音同步）
- **语言切换：** 助手自动匹配当前页面的中/英文模式

#### 语言切换

- 点击右上角的 **"中文/EN"** 按钮一键切换中/英文界面

---

## Project Structure

```
his-archi/
├── index.html              # Single-page application entry
├── netlify.toml            # Netlify build & redirect rules
├── package.json            # Root package (minimal)
│
├── netlify/
│   └── functions/
│       └── chat.js         # Serverless AI proxy (production)
│
├── api/                    # Local dev only (not on GitHub)
│   ├── proxy-server.js     # Express local proxy server
│   └── package.json
│
├── css/
│   ├── main.css            # Global layout, typography, dark palette
│   ├── landing.css         # Landing page 3D canvas + title animation
│   ├── scenes.css          # Scene backgrounds, hotspots, transitions
│   ├── timeline.css        # Bottom timeline navigation
│   ├── cards.css           # Info card popup styles
│   ├── gesture.css         # Cursor, indicator, hover feedback
│   ├── voice-assistant.css # AI chat panel with border frame
│   └── language-toggle.css # Language toggle button
│
├── js/
│   ├── app.js              # Global init, state, module coordination
│   ├── landing.js          # Three.js particle palace scene
│   ├── scenes.js           # Scene activation, zoom, freeze
│   ├── timeline.js         # Bottom timeline controls
│   ├── cards.js            # Hotspot info card management
│   ├── gesture.js          # MediaPipe Hands + mouse cursor fallback
│   ├── i18n.js             # Full Chinese/English translation
│   └── assistance.js       # AI chat + voice I/O + TTS
│
└── .gitignore              # Excludes api/node_modules
```

## API Reference

### AI Chat Proxy

**Endpoint (Netlify):** `POST /.netlify/functions/chat`

**Request:**
```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "你的问题" }
  ],
  "model": "qwen-turbo"
}
```

**Response:**
```json
{
  "choices": [{
    "message": { "content": "AI回答内容" }
  }]
}
```

**Environment Variable:** `DASHSCOPE_API_KEY`

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Three.js WebGL | ✓ | ✓ | ✓ | ✓ |
| MediaPipe Hands | ✓ | — | — | ✓ |
| Web Speech API | ✓ | ✓ | ✓ | ✓ |
| CSS Custom Properties | ✓ | ✓ | ✓ | ✓ |

> Gesture control requires Chrome or Edge with camera access. Other browsers fall back to mouse-only mode.

## License

MIT License — feel free to use, modify, and distribute.