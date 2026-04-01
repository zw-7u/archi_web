# 《皇城·万象》网页搭建指南

> **项目改造说明：** 本文档指导你将现有的「故宫十二时辰」项目改造为「皇城·万象」——故宫古建筑智慧交互可视化平台。
>
> **保留的功能：** AI语音助手（通义千问API）、MediaPipe手势识别摄像头、中英双语切换
>
> **删除的功能：** Three.js粒子首页、八个时辰场景、底部时间轴、热区卡片系统（全部重写）

---

## 目录

1. [整体架构概览](#1-整体架构概览)
2. [文件结构规划](#2-文件结构规划)
3. [第一步：清理旧文件](#3-第一步清理旧文件)
4. [第二步：搭建新首页（Landing）](#4-第二步搭建新首页landing)
5. [第三步：模块一——建筑档案总览图](#5-第三步模块一建筑档案总览图)
6. [第四步：模块二——重点建筑深度解读](#6-第四步模块二重点建筑深度解读)
7. [第五步：模块三——规划智慧与文化密码](#7-第五步模块三规划智慧与文化密码)
8. [第六步：全局手势交互改造](#8-第六步全局手势交互改造)
9. [第七步：AI助手改造](#9-第七步ai助手改造)
10. [第八步：中英双语改造](#10-第八步中英双语改造)
11. [第九步：小游戏实现](#11-第九步小游戏实现)
12. [页面间跳转逻辑](#12-页面间跳转逻辑)
13. [插画与素材占位规范](#13-插画与素材占位规范)
14. [部署与测试](#14-部署与测试)

---

## 1. 整体架构概览

### 1.1 三大模块 + 全局系统

```
┌─────────────────────────────────────────────────────────────┐
│                      Landing 首页                            │
│            项目标题 + 三个模块入口按钮 + 视觉动画             │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
           ▼              ▼              ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │   模块一      │ │   模块二      │ │   模块三      │
   │  建筑档案     │ │  重点建筑     │ │  文化密码     │
   │  Building     │ │  Deep         │ │  Cultural     │
   │  Archive      │ │  Exploration  │ │  Code         │
   │              │ │              │ │              │
   │ 故宫俯视图   │ │ 太和殿页面   │ │ 中轴线       │
   │ 20座建筑卡片 │ │ 角楼页面     │ │ 阴阳五行     │
   │              │ │ 午门页面     │ │ 风水格局     │
   │              │ │ 九龙壁页面   │ │ 数字密码     │
   │              │ │ (各含小游戏) │ │ 色彩等级     │
   └──────────────┘ └──────────────┘ └──────────────┘

   ┌─────────────────────────────────────────────────────────┐
   │                    全局系统（每个页面都有）               │
   │  🎥 手势识别摄像头 (MediaPipe)                          │
   │  🤖 AI语音助手 (通义千问API)                            │
   │  🌐 中英双语切换                                        │
   │  👆 手势交互（滑动/缩放/拖拽/长按/双击/旋转）           │
   └─────────────────────────────────────────────────────────┘
```

### 1.2 用户浏览路径

```
首页 → 点击进入任一模块
         │
         ├→ 模块一（总览图）→ 点击普通建筑 → 弹出档案卡片
         │                  → 点击重点建筑(★) → 弹出档案卡片 → 点击「探索建筑智慧→」→ 跳转模块二对应页面
         │
         ├→ 模块二（4个独立页面）→ 查看构件详情 → 玩嵌入式小游戏 → 返回总览
         │
         └→ 模块三（文化密码页面）→ 浏览中轴线/阴阳/风水/数字/色彩 → 返回首页
```

---

## 2. 文件结构规划

### 2.1 改造后的完整目录结构

```
his-archi/                          ← 项目根目录（不变）
│
├── index.html                      ← 【重写】新Landing首页
│
├── pages/                          ← 【新建文件夹】所有子页面
│   ├── module1-archive.html        ← 模块一：建筑档案总览图
│   ├── module2-taihedian.html      ← 模块二：太和殿深度解读
│   ├── module2-jiaolou.html        ← 模块二：角楼深度解读
│   ├── module2-wumen.html          ← 模块二：午门深度解读
│   ├── module2-jiulongbi.html      ← 模块二：九龙壁深度解读
│   └── module3-culture.html        ← 模块三：规划智慧与文化密码
│
├── css/                            ← 样式文件夹
│   ├── main.css                    ← 【保留+修改】全局样式（颜色改为故宫红金配色）
│   ├── landing.css                 ← 【重写】新首页样式
│   ├── gesture.css                 ← 【保留】手势光标样式
│   ├── voice-assistant.css         ← 【保留】AI助手面板样式
│   ├── language-toggle.css         ← 【保留】语言切换按钮样式
│   ├── archive.css                 ← 【新建】模块一：总览图+档案卡片样式
│   ├── building-detail.css         ← 【新建】模块二：重点建筑详解页通用样式
│   ├── games.css                   ← 【新建】模块二：小游戏通用样式
│   └── culture.css                 ← 【新建】模块三：文化密码页样式
│   （删除：scenes.css, timeline.css, cards.css）
│
├── js/                             ← 脚本文件夹
│   ├── app.js                      ← 【重写】新的全局入口，根据页面加载不同模块
│   ├── gesture.js                  ← 【保留+修改】手势识别（增加旋转手势、拖拽手势）
│   ├── i18n.js                     ← 【保留+修改】双语系统（翻译内容全部替换）
│   ├── assistance.js               ← 【保留+修改】AI助手（修改system prompt）
│   ├── archive.js                  ← 【新建】模块一：总览图交互、建筑卡片弹窗
│   ├── building-data.js            ← 【新建】20座建筑的数据（JSON格式）
│   ├── taihedian.js                ← 【新建】太和殿页面交互+构件高亮
│   ├── jiaolou.js                  ← 【新建】角楼页面交互+构件高亮
│   ├── wumen.js                    ← 【新建】午门页面交互+构件高亮
│   ├── jiulongbi.js                ← 【新建】九龙壁页面交互+构件高亮
│   ├── game-stack.js               ← 【新建】太和殿「堆叠太和殿」游戏
│   ├── game-tower-puzzle.js        ← 【新建】角楼「角楼解谜」游戏
│   ├── game-imperial-passage.js    ← 【新建】午门「十万人朝圣」游戏
│   ├── game-dragon-mosaic.js       ← 【新建】九龙壁「九龙拼图」游戏
│   └── culture.js                  ← 【新建】模块三：中轴线动画、太极图交互等
│   （删除：landing.js, scenes.js, timeline.js, cards.js）
│
├── assets/                         ← 素材文件夹
│   ├── images/                     ← 【新建子文件夹】
│   │   ├── overview-map.png        ← 故宫俯视总览图（你自己制作插入）
│   │   ├── taihedian/              ← 太和殿相关图片
│   │   │   ├── full.png            ← 太和殿全景图
│   │   │   ├── jishou.png          ← 脊兽构件图
│   │   │   ├── dougong.png         ← 斗拱构件图
│   │   │   ├── caihui.png          ← 彩画构件图
│   │   │   ├── wuding.png          ← 屋顶构件图
│   │   │   ├── xumizuo.png         ← 须弥座构件图
│   │   │   └── jinzhuan.png        ← 金砖/琉璃瓦构件图
│   │   ├── jiaolou/                ← 角楼相关图片
│   │   │   ├── full.png
│   │   │   ├── wumian.png          ← 屋面构件图
│   │   │   └── sunmao.png          ← 榫卯构件图
│   │   ├── wumen/                  ← 午门相关图片
│   │   │   ├── full.png
│   │   │   ├── gongquan.png        ← 拱券构件图
│   │   │   ├── zhuanshi.png        ← 砖石构件图
│   │   │   └── buju.png            ← 凹形布局图
│   │   ├── jiulongbi/              ← 九龙壁相关图片
│   │   │   ├── full.png
│   │   │   ├── liuli-craft.png     ← 琉璃工艺图
│   │   │   ├── glaze-color.png     ← 釉彩化学图
│   │   │   └── dragon-detail.png   ← 龙纹细节图
│   │   ├── culture/                ← 模块三文化密码图片
│   │   │   ├── axis-map.png        ← 中轴线标注图
│   │   │   ├── taiji.png           ← 太极图
│   │   │   ├── fengshui-map.png    ← 风水布局图
│   │   │   └── color-chart.png     ← 色彩等级图
│   │   └── buildings/              ← 20座建筑档案卡片用图（每座2-3张）
│   │       ├── taihedian-card.png
│   │       ├── zhonghedian-card.png
│   │       └── ...（共20座）
│   └── audio/                      ← 【新建子文件夹】音效文件
│       ├── snap.mp3                ← 构件吸附音效
│       ├── error.mp3               ← 拼错抖动音效
│       ├── success.mp3             ← 完成庆祝音效
│       └── click.mp3               ← 按钮点击音效
│
├── data/                           ← 【新建文件夹】数据文件
│   ├── buildings.json              ← 20座建筑档案数据
│   ├── components-taihedian.json   ← 太和殿构件数据
│   ├── components-jiaolou.json     ← 角楼构件数据
│   ├── components-wumen.json       ← 午门构件数据
│   ├── components-jiulongbi.json   ← 九龙壁构件数据
│   └── culture-data.json           ← 文化密码数据
│
├── api/                            ← 【保留】本地开发代理
│   ├── proxy-server.js             ← 保留不动
│   └── package.json                ← 保留不动
│
├── netlify/                        ← 【保留】Netlify部署
│   └── functions/
│       └── chat.js                 ← 保留不动
│
├── netlify.toml                    ← 【保留+修改】添加新页面的路由规则
├── package.json                    ← 【保留】
├── .gitignore                      ← 【保留】
└── README.md                       ← 【重写】本文件
```

### 2.2 文件处理清单（一目了然）

| 操作 | 文件 | 说明 |
|------|------|------|
| ✅ 保留 | `js/gesture.js` | 手势识别核心，后续增加新手势 |
| ✅ 保留 | `js/assistance.js` | AI助手核心，后续改prompt |
| ✅ 保留 | `js/i18n.js` | 双语核心，后续替换翻译内容 |
| ✅ 保留 | `css/gesture.css` | 手势光标样式 |
| ✅ 保留 | `css/voice-assistant.css` | AI助手面板样式 |
| ✅ 保留 | `css/language-toggle.css` | 语言切换按钮样式 |
| ✅ 保留 | `api/` 整个文件夹 | 本地代理服务 |
| ✅ 保留 | `netlify/` 整个文件夹 | 线上部署代理 |
| ✏️ 重写 | `index.html` | 新Landing首页 |
| ✏️ 重写 | `js/app.js` | 新的全局入口 |
| ✏️ 修改 | `css/main.css` | 全局样式调整配色 |
| ✏️ 修改 | `css/landing.css` | 新首页样式 |
| ❌ 删除 | `js/landing.js` | 旧的Three.js粒子场景 |
| ❌ 删除 | `js/scenes.js` | 旧的时辰场景切换 |
| ❌ 删除 | `js/timeline.js` | 旧的时间轴 |
| ❌ 删除 | `js/cards.js` | 旧的热区卡片 |
| ❌ 删除 | `css/scenes.css` | 旧场景样式 |
| ❌ 删除 | `css/timeline.css` | 旧时间轴样式 |
| ❌ 删除 | `css/cards.css` | 旧卡片样式 |
| 🆕 新建 | `pages/` 文件夹 (6个HTML) | 所有子页面 |
| 🆕 新建 | `data/` 文件夹 (6个JSON) | 数据文件 |
| 🆕 新建 | 多个新JS和CSS文件 | 见上方目录结构 |

---

## 3. 第一步：清理旧文件

### 3.1 删除旧文件

在你的项目根目录（`his-archi/`）下执行以下操作：

**删除这些JS文件（在 `js/` 文件夹里）：**
- `js/landing.js`  ← 删除（Three.js粒子场景）
- `js/scenes.js`   ← 删除（时辰场景切换）
- `js/timeline.js` ← 删除（时间轴导航）
- `js/cards.js`    ← 删除（热区卡片弹窗）

**删除这些CSS文件（在 `css/` 文件夹里）：**
- `css/scenes.css`   ← 删除
- `css/timeline.css`  ← 删除
- `css/cards.css`     ← 删除

**不要删除的文件（确认一下）：**
- `js/gesture.js` ← 保留！
- `js/assistance.js` ← 保留！
- `js/i18n.js` ← 保留！
- `js/app.js` ← 保留（但内容会重写）
- `css/main.css` ← 保留（会修改）
- `css/landing.css` ← 保留（会重写）
- `css/gesture.css` ← 保留！
- `css/voice-assistant.css` ← 保留！
- `css/language-toggle.css` ← 保留！

### 3.2 创建新文件夹

在项目根目录下创建以下空文件夹：
```
mkdir pages
mkdir data
mkdir assets/images
mkdir assets/images/taihedian
mkdir assets/images/jiaolou
mkdir assets/images/wumen
mkdir assets/images/jiulongbi
mkdir assets/images/culture
mkdir assets/images/buildings
mkdir assets/audio
```

### 3.3 创建空文件（后续逐步填充）

**在 `pages/` 文件夹中创建6个空HTML文件：**
- `module1-archive.html`
- `module2-taihedian.html`
- `module2-jiaolou.html`
- `module2-wumen.html`
- `module2-jiulongbi.html`
- `module3-culture.html`

**在 `css/` 文件夹中创建4个空CSS文件：**
- `archive.css`
- `building-detail.css`
- `games.css`
- `culture.css`

**在 `js/` 文件夹中创建新的JS文件：**
- `archive.js`
- `building-data.js`
- `taihedian.js`、`jiaolou.js`、`wumen.js`、`jiulongbi.js`
- `game-stack.js`、`game-tower-puzzle.js`、`game-imperial-passage.js`、`game-dragon-mosaic.js`
- `culture.js`

**在 `data/` 文件夹中创建6个空JSON文件：**
- `buildings.json`
- `components-taihedian.json`
- `components-jiaolou.json`
- `components-wumen.json`
- `components-jiulongbi.json`
- `culture-data.json`

---

## 4. 第二步：搭建新首页（Landing）

### 4.1 首页设计说明

新首页是整个平台的入口，需要展示项目标题和三大模块的入口。

**页面内容：**
- 项目标题「皇城·万象」+ 英文副标题 "Imperial City · Grand Panorama"
- 一句话简介："故宫古建筑智慧交互可视化平台"
- 三个大按钮/卡片，分别进入模块一、二、三
- 右上角保留：摄像头按钮 + 中英切换按钮
- 右下角保留：AI助手按钮
- 背景：你自己插入的故宫主题视觉（图片/动画/纯CSS渐变皆可）

### 4.2 重写 `index.html`

把现有 `index.html` 的全部内容替换为以下结构：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>皇城·万象 | Imperial City · Grand Panorama</title>
  <link rel="stylesheet" href="css/main.css">
  <link rel="stylesheet" href="css/landing.css">
  <link rel="stylesheet" href="css/gesture.css">
  <link rel="stylesheet" href="css/voice-assistant.css">
  <link rel="stylesheet" href="css/language-toggle.css">
</head>
<body>

  <!-- ========== 右上角工具栏（保留原有结构） ========== -->
  <div class="top-toolbar" role="toolbar" aria-label="工具栏">
    <button id="gesture-toggle" class="gesture-toggle" title="开启/关闭手势控制">
      <!-- 保留原有的SVG图标 -->
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="22" height="22">
        <path d="M15 3a2 2 0 012 2v2a2 2 0 01-2 2M9 3a2 2 0 00-2 2v2a2 2 0 002 2M12 14v7M8 18h8M7 9v3a5 5 0 0010 0V9"/>
      </svg>
    </button>
    <button id="language-toggle" class="language-toggle" title="切换语言/Change Language">
      中文/EN
    </button>
  </div>

  <!-- ========== 手势光标（保留原有结构） ========== -->
  <div id="gesture-indicator" class="gesture-indicator">
    <div class="gesture-cursor" id="gesture-cursor"></div>
    <div class="gesture-status" id="gesture-status">
      <span class="gesture-icon">✋</span>
      <span class="gesture-label" data-i18n="gesture_on">手势控制已开启</span>
    </div>
  </div>

  <!-- ========== 首页主体内容 ========== -->
  <section class="landing">

    <!-- 背景区域 —— 你自己插入背景图/动画 -->
    <div class="landing-bg">
      <!-- 占位：请替换为你的故宫主题背景 -->
      <div class="landing-bg-placeholder">
        <!-- 背景图片占位，替换为: <img src="assets/images/landing-bg.jpg" alt="故宫背景"> -->
      </div>
    </div>

    <!-- 标题区域 -->
    <div class="landing-content">
      <h1 class="landing-title" data-i18n="site_title">皇城·万象</h1>
      <p class="landing-subtitle-en">Imperial City · Grand Panorama</p>
      <p class="landing-desc" data-i18n="site_desc">故宫古建筑智慧交互可视化平台</p>
    </div>

    <!-- 三大模块入口 -->
    <nav class="module-nav">

      <!-- 模块一入口 -->
      <a href="pages/module1-archive.html" class="module-card" id="nav-module1">
        <div class="module-card-icon">
          <!-- 占位图标：你可以替换为自己的插画 -->
          🏛️
        </div>
        <h2 class="module-card-title" data-i18n="mod1_title">建筑档案</h2>
        <p class="module-card-subtitle">Building Archive</p>
        <p class="module-card-desc" data-i18n="mod1_desc">探索故宫20座核心建筑的身份档案</p>
      </a>

      <!-- 模块二入口 -->
      <a href="pages/module2-taihedian.html" class="module-card" id="nav-module2">
        <div class="module-card-icon">🔍</div>
        <h2 class="module-card-title" data-i18n="mod2_title">重点解读</h2>
        <p class="module-card-subtitle">Deep Exploration</p>
        <p class="module-card-desc" data-i18n="mod2_desc">解剖四座建筑的构件智慧与互动游戏</p>
      </a>

      <!-- 模块三入口 -->
      <a href="pages/module3-culture.html" class="module-card" id="nav-module3">
        <div class="module-card-icon">☯️</div>
        <h2 class="module-card-title" data-i18n="mod3_title">文化密码</h2>
        <p class="module-card-subtitle">Cultural Code</p>
        <p class="module-card-desc" data-i18n="mod3_desc">中轴线、阴阳五行、风水与数字密码</p>
      </a>

    </nav>
  </section>

  <!-- ========== AI助手（从原index.html复制，保持不变） ========== -->
  <!-- 悬浮按钮 -->
  <button id="voice-assistant-trigger" title="语音助手">
    <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
  </button>
  <!-- Chat Panel（从原index.html完整复制voice-assistant-panel部分） -->
  <div id="voice-assistant-panel">
    <!-- ... 保持原有AI助手面板HTML不变 ... -->
    <!-- 请从原 index.html 中完整复制 id="voice-assistant-panel" 的整个div -->
  </div>

  <!-- ========== 脚本 ========== -->
  <!-- 注意：不再引入 three.js、landing.js、scenes.js、timeline.js、cards.js -->
  <script src="js/gesture.js"></script>
  <script src="js/i18n.js"></script>
  <script src="js/assistance.js"></script>
  <script src="js/app.js"></script>

</body>
</html>
```

### 4.3 关键提醒

> ⚠️ **AI助手面板HTML**：请从你现有的 `index.html` 中，找到 `<div id="voice-assistant-panel">` 开始到它的结束 `</div>` 的整段HTML，原封不动地复制到新 `index.html` 中对应位置。这部分不需要改动。

> ⚠️ **每个子页面（pages/*.html）都需要包含**：顶部工具栏、手势光标、AI助手面板。你可以把这三个公共组件的HTML做成一个模板，每次新建页面时复制进去。

---

## 5. 第三步：模块一——建筑档案总览图

### 5.1 页面说明

`pages/module1-archive.html` 是故宫俯视总览图页面。

**页面布局：**
```
┌──────────────────────────────────────────────────┐
│ [← 返回首页]              [摄像头] [中/EN]       │  ← 顶部导航
├──────────────────────────────────────────────────┤
│                                                  │
│     ┌──────────────────────┐  ┌──────────────┐  │
│     │                      │  │              │  │
│     │    故宫俯视总览图     │  │  右侧信息    │  │
│     │   （可缩放/平移）     │  │  面板        │  │
│     │                      │  │              │  │
│     │  [★太和殿] [角楼]    │  │  档案卡      │  │
│     │  [★午门]  [乾清宫]   │  │  事件卡      │  │
│     │  [★九龙壁] ...       │  │              │  │
│     │                      │  │ [探索智慧→]  │  │
│     └──────────────────────┘  └──────────────┘  │
│                                                  │
├──────────────────────────────────────────────────┤
│            [AI助手按钮]                          │  ← 右下角
└──────────────────────────────────────────────────┘
```

### 5.2 HTML结构（`pages/module1-archive.html`）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>建筑档案 | 皇城·万象</title>
  <link rel="stylesheet" href="../css/main.css">
  <link rel="stylesheet" href="../css/archive.css">
  <link rel="stylesheet" href="../css/gesture.css">
  <link rel="stylesheet" href="../css/voice-assistant.css">
  <link rel="stylesheet" href="../css/language-toggle.css">
</head>
<body>

  <!-- ========== 顶部导航栏 ========== -->
  <nav class="page-nav">
    <a href="../index.html" class="nav-back" data-i18n="back_home">← 返回首页</a>
    <span class="nav-title" data-i18n="mod1_title">建筑档案 Building Archive</span>
    <div class="nav-tools">
      <button id="gesture-toggle" class="gesture-toggle"><!-- 摄像头按钮 --></button>
      <button id="language-toggle" class="language-toggle">中文/EN</button>
    </div>
  </nav>

  <!-- ========== 手势光标（同首页） ========== -->
  <div id="gesture-indicator" class="gesture-indicator">
    <!-- ... 保持不变 ... -->
  </div>

  <!-- ========== 主内容区 ========== -->
  <main class="archive-main">

    <!-- 左侧：故宫俯视总览图 -->
    <div class="archive-map-container" id="map-container">
      <!-- 总览图插画占位 —— 你自己替换 -->
      <div class="map-placeholder" id="overview-map">
        <p>【占位】请在这里插入故宫俯视总览图</p>
        <p>图片路径：assets/images/overview-map.png</p>
        <!-- 替换为: <img src="../assets/images/overview-map.png" alt="故宫俯视图" id="map-image"> -->
      </div>

      <!-- 建筑热点标记 —— 由 archive.js 动态生成 -->
      <!-- 每个标记是一个绝对定位的按钮，位置通过CSS变量控制 -->
      <div class="building-markers" id="building-markers">
        <!-- JS会在这里动态插入类似这样的标记：
        <button class="building-marker featured"
                data-building="taihedian"
                style="--x: 50%; --y: 35%;">
          <span class="marker-dot"></span>
          <span class="marker-label">太和殿 ★</span>
        </button>
        -->
      </div>
    </div>

    <!-- 右侧：信息面板 -->
    <aside class="archive-panel" id="archive-panel">
      <!-- 默认状态：提示用户点击建筑 -->
      <div class="panel-empty" id="panel-empty">
        <p data-i18n="click_building">👆 点击地图上的建筑查看档案</p>
      </div>

      <!-- 档案卡片（点击建筑后显示） -->
      <div class="panel-content hidden" id="panel-content">

        <!-- 档案卡 -->
        <div class="archive-card" id="archive-card">
          <div class="card-images">
            <!-- 建筑实物图占位 —— 由JS动态填充 -->
            <div class="card-image-placeholder">
              <p>【占位】建筑实物图</p>
            </div>
          </div>
          <h3 class="card-name" id="card-name">建筑名称</h3>
          <p class="card-name-en" id="card-name-en">English Name</p>

          <!-- 档案信息列表 -->
          <div class="card-info-list">
            <div class="card-info-item">
              <span class="info-label" data-i18n="label_area">区域</span>
              <span class="info-value" id="card-area">【占位】</span>
            </div>
            <div class="card-info-item">
              <span class="info-label" data-i18n="label_function">功能</span>
              <span class="info-value" id="card-function">【占位】</span>
            </div>
            <div class="card-info-item">
              <span class="info-label" data-i18n="label_rank">等级</span>
              <span class="info-value" id="card-rank">【占位】</span>
            </div>
            <div class="card-info-item">
              <span class="info-label" data-i18n="label_roof">屋顶形制</span>
              <span class="info-value" id="card-roof">【占位】</span>
            </div>
            <div class="card-info-item">
              <span class="info-label" data-i18n="label_built">建造年代</span>
              <span class="info-value" id="card-built">【占位】</span>
            </div>
            <div class="card-info-item">
              <span class="info-label" data-i18n="label_material">材料来源</span>
              <span class="info-value" id="card-material">【占位】</span>
            </div>
          </div>

          <!-- 趣闻 -->
          <div class="card-trivia" id="card-trivia">
            <p>【占位】趣闻内容</p>
          </div>

          <!-- 重点建筑专属：探索智慧入口按钮 -->
          <a class="explore-wisdom-btn hidden" id="explore-btn"
             data-i18n="explore_wisdom">
            探索建筑智慧 Explore Wisdom →
          </a>
        </div>

        <!-- 事件卡（切换标签） -->
        <div class="event-card hidden" id="event-card">
          <h4 data-i18n="events_title">历史事件</h4>
          <div class="event-list" id="event-list">
            <p>【占位】事件内容由JS动态填充</p>
          </div>
        </div>

        <!-- 标签切换按钮 -->
        <div class="panel-tabs">
          <button class="tab-btn active" data-tab="archive" data-i18n="tab_archive">档案卡</button>
          <button class="tab-btn" data-tab="events" data-i18n="tab_events">事件卡</button>
        </div>
      </div>
    </aside>

  </main>

  <!-- ========== AI助手（同首页，完整复制） ========== -->
  <!-- 请完整复制AI助手的HTML -->

  <!-- ========== 脚本 ========== -->
  <script src="../js/gesture.js"></script>
  <script src="../js/i18n.js"></script>
  <script src="../js/assistance.js"></script>
  <script src="../js/building-data.js"></script>
  <script src="../js/archive.js"></script>
  <script src="../js/app.js"></script>

</body>
</html>
```

### 5.3 建筑数据文件（`data/buildings.json`）

这个文件存储20座建筑的档案数据，供 `archive.js` 读取和渲染。

```json
{
  "buildings": [
    {
      "id": "taihedian",
      "name_zh": "太和殿",
      "name_en": "Hall of Supreme Harmony",
      "pinyin": "tài hé diàn",
      "area_zh": "外朝三大殿",
      "area_en": "Outer Court",
      "function_zh": "礼仪",
      "function_en": "Ceremony",
      "rank_zh": "最高",
      "rank_en": "Supreme",
      "roof_zh": "重檐庑殿顶",
      "roof_en": "Double-eaved Hip Roof",
      "built_zh": "明永乐十八年（1420年）",
      "built_en": "1420, Ming Dynasty",
      "material_zh": "【占位】金丝楠木（四川）、汉白玉（房山）、金砖（苏州）",
      "material_en": "【placeholder】Nanmu wood, White marble, Golden bricks",
      "trivia_zh": "【占位】太和殿是中国现存最大的木构殿堂",
      "trivia_en": "【placeholder】The largest existing wooden hall in China",
      "events": [
        { "title_zh": "【占位】事件标题", "title_en": "【placeholder】Event title", "desc_zh": "【占位】事件描述", "desc_en": "【placeholder】Event description" }
      ],
      "images": ["assets/images/buildings/taihedian-card.png"],
      "map_position": { "x": "50%", "y": "35%" },
      "featured": true,
      "detail_page": "module2-taihedian.html"
    }
  ]
}
```

> 📝 **你需要做的：** 按照这个格式，把20座建筑的数据都填进去。`featured: true` 的建筑（太和殿/角楼/午门/九龙壁）会显示★标记和「探索智慧→」按钮。暂时用`【占位】`标记的内容后期自己替换。

### 5.4 `archive.js` 的核心逻辑（伪代码说明）

```
archive.js 需要做的事情：

1. 页面加载时：
   - 从 data/buildings.json 读取数据
   - 在 #building-markers 容器中，为每座建筑动态生成一个标记按钮
   - 标记的位置通过 CSS 变量 --x 和 --y 控制（数据来自JSON）
   - 重点建筑（featured=true）的标记加上 ★ 图标和金色样式

2. 用户点击某个建筑标记时：
   - 地图上该建筑标记高亮闪烁
   - 右侧面板从"空状态"切换到"档案卡"
   - 用该建筑的JSON数据填充面板中的各个字段
   - 如果是重点建筑，显示「探索建筑智慧→」按钮
   - 按钮的href指向对应的模块二页面

3. 标签切换：
   - 点击"档案卡"标签 → 显示档案信息
   - 点击"事件卡"标签 → 显示历史事件

4. 手势支持：
   - 双指缩放：放大/缩小总览图
   - 单指拖拽：平移总览图
   - 长按建筑标记：弹出浮层简介
```

---

## 6. 第四步：模块二——重点建筑深度解读

### 6.1 页面说明

模块二共有4个独立页面，结构相同但内容不同。以太和殿为例说明。

**页面布局：**
```
┌──────────────────────────────────────────────────┐
│ [← 返回总览]              [摄像头] [中/EN]       │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────────────┐  ┌──────────────────┐ │
│  │                      │  │                  │ │
│  │   建筑全景图/解剖图   │  │  构件信息面板    │ │
│  │                      │  │                  │ │
│  │  [脊兽] [斗拱] [彩画] │  │  标签页一：     │ │
│  │  [屋顶] [台基] [金砖] │  │  形制与工艺     │ │
│  │   ↑ 构件按钮          │  │                  │ │
│  │   点击后对应区域高亮   │  │  标签页二：     │ │
│  │                      │  │  物理与数学     │ │
│  └──────────────────────┘  │                  │ │
│                            │  标签页三：     │ │
│  ┌──────────────────────┐  │  文化与符号     │ │
│  │   🎮 小游戏区域       │  │                  │ │
│  │  「堆叠太和殿」       │  └──────────────────┘ │
│  └──────────────────────┘                        │
├──────────────────────────────────────────────────┤
│            [AI助手按钮]                          │
└──────────────────────────────────────────────────┘
```

### 6.2 HTML结构模板（以太和殿为例：`pages/module2-taihedian.html`）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>太和殿 | 皇城·万象</title>
  <link rel="stylesheet" href="../css/main.css">
  <link rel="stylesheet" href="../css/building-detail.css">
  <link rel="stylesheet" href="../css/games.css">
  <link rel="stylesheet" href="../css/gesture.css">
  <link rel="stylesheet" href="../css/voice-assistant.css">
  <link rel="stylesheet" href="../css/language-toggle.css">
</head>
<body data-building="taihedian">

  <!-- ========== 顶部导航 ========== -->
  <nav class="page-nav">
    <a href="module1-archive.html" class="nav-back" data-i18n="back_archive">← 返回建筑档案</a>
    <span class="nav-title">太和殿 Hall of Supreme Harmony</span>
    <div class="nav-tools">
      <button id="gesture-toggle" class="gesture-toggle"><!-- 同上 --></button>
      <button id="language-toggle" class="language-toggle">中文/EN</button>
    </div>
  </nav>

  <!-- ========== 手势光标 ========== -->
  <div id="gesture-indicator" class="gesture-indicator"><!-- 同上 --></div>

  <!-- ========== 主内容区 ========== -->
  <main class="building-main">

    <!-- 左侧上半：建筑全景图 + 构件按钮 -->
    <div class="building-view">
      <!-- 建筑图片占位 —— 你自己插入 -->
      <div class="building-image-container" id="building-image">
        <p>【占位】请插入太和殿全景图/解剖图</p>
        <!-- 替换为: <img src="../assets/images/taihedian/full.png" alt="太和殿"> -->

        <!-- 构件高亮层（透明叠加层，JS控制哪块区域高亮） -->
        <div class="highlight-overlay" id="highlight-overlay">
          <!-- JS会在这里动态添加高亮区域的SVG/div -->
        </div>
      </div>

      <!-- 构件按钮栏 -->
      <div class="component-buttons" id="component-buttons">
        <button class="comp-btn" data-component="jishou" data-color="#FFD700">
          <span data-i18n="comp_jishou">脊兽</span>
        </button>
        <button class="comp-btn" data-component="dougong" data-color="#C41E3A">
          <span data-i18n="comp_dougong">斗拱</span>
        </button>
        <button class="comp-btn" data-component="caihui" data-color="#228B22">
          <span data-i18n="comp_caihui">彩画</span>
        </button>
        <button class="comp-btn" data-component="wuding" data-color="#8B4513">
          <span data-i18n="comp_wuding">屋顶</span>
        </button>
        <button class="comp-btn" data-component="xumizuo" data-color="#F5F5DC">
          <span data-i18n="comp_xumizuo">须弥座</span>
        </button>
        <button class="comp-btn" data-component="jinzhuan" data-color="#DAA520">
          <span data-i18n="comp_jinzhuan">金砖/琉璃瓦</span>
        </button>
      </div>
    </div>

    <!-- 右侧：构件信息面板 -->
    <aside class="component-panel" id="component-panel">
      <!-- 默认提示 -->
      <div class="panel-empty" id="comp-panel-empty">
        <p data-i18n="click_component">👆 点击左侧构件按钮查看详情</p>
      </div>

      <!-- 构件详情（点击按钮后显示） -->
      <div class="panel-content hidden" id="comp-panel-content">
        <h3 class="comp-title" id="comp-title">构件名称</h3>
        <p class="comp-title-en" id="comp-title-en">English Name</p>
        <p class="comp-pinyin" id="comp-pinyin">pīnyīn</p>

        <!-- 三张卡片标签页 -->
        <div class="comp-tabs">
          <button class="comp-tab active" data-tab="craft" data-i18n="tab_craft">形制与工艺</button>
          <button class="comp-tab" data-tab="science" data-i18n="tab_science">物理与数学</button>
          <button class="comp-tab" data-tab="culture" data-i18n="tab_culture">文化与符号</button>
        </div>

        <!-- 卡片一：形制与工艺 -->
        <div class="comp-card" id="card-craft">
          <div class="comp-card-image">
            <p>【占位】构件图片</p>
          </div>
          <div class="comp-card-text" id="text-craft">
            <p>【占位】形制与工艺内容，后期自己填写</p>
          </div>
        </div>

        <!-- 卡片二：物理与数学 -->
        <div class="comp-card hidden" id="card-science">
          <div class="comp-card-image">
            <p>【占位】科学示意图</p>
          </div>
          <div class="comp-card-text" id="text-science">
            <p>【占位】物理与数学内容，后期自己填写</p>
          </div>
        </div>

        <!-- 卡片三：文化与符号 -->
        <div class="comp-card hidden" id="card-culture">
          <div class="comp-card-image">
            <p>【占位】文化图片</p>
          </div>
          <div class="comp-card-text" id="text-culture">
            <p>【占位】文化与符号内容，后期自己填写</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- 左侧下半：小游戏区域 -->
    <div class="game-zone" id="game-zone">
      <h3 class="game-title" data-i18n="game_stack_title">🎮 堆叠太和殿 Stack the Hall</h3>
      <div class="game-container" id="game-container">
        <!-- 游戏画布 —— 由 game-stack.js 初始化 -->
        <canvas id="game-canvas"></canvas>
        <div class="game-ui">
          <button class="game-btn" id="game-start" data-i18n="game_start">开始游戏</button>
          <button class="game-btn" id="game-reset" data-i18n="game_reset">重新开始</button>
          <div class="game-score" id="game-score">0/7</div>
        </div>
        <div class="game-feedback" id="game-feedback">
          <!-- JS动态显示：拼装正确/错误的反馈文字 -->
        </div>
      </div>
    </div>

  </main>

  <!-- ========== AI助手 ========== -->
  <!-- 请完整复制AI助手的HTML -->

  <!-- ========== 脚本 ========== -->
  <script src="../js/gesture.js"></script>
  <script src="../js/i18n.js"></script>
  <script src="../js/assistance.js"></script>
  <script src="../js/taihedian.js"></script>
  <script src="../js/game-stack.js"></script>
  <script src="../js/app.js"></script>

</body>
</html>
```

### 6.3 另外三个重点建筑页面

**角楼** (`module2-jiaolou.html`)：结构同上，但：
- `data-building="jiaolou"`
- 构件按钮改为：多重檐复合屋面、榫卯结构
- 小游戏改为：「角楼解谜」Tower Puzzle
- 引入脚本改为：`jiaolou.js` + `game-tower-puzzle.js`

**午门** (`module2-wumen.html`)：结构同上，但：
- `data-building="wumen"`
- 构件按钮改为：拱券结构、城台砖石码套、凹形布局与中轴线
- 小游戏改为：「十万人朝圣」Imperial Passage
- 引入脚本改为：`wumen.js` + `game-imperial-passage.js`

**九龙壁** (`module2-jiulongbi.html`)：结构同上，但：
- `data-building="jiulongbi"`
- 构件按钮改为：琉璃拼接工艺、琉璃釉彩化学、数字9与龙纹文化
- 小游戏改为：「九龙拼图」Dragon Mosaic
- 引入脚本改为：`jiulongbi.js` + `game-dragon-mosaic.js`

---

## 7. 第五步：模块三——规划智慧与文化密码

### 7.1 页面说明

`pages/module3-culture.html` 是一个长页面，分为5个内容区块，用户上下滚动浏览。

### 7.2 页面结构（简化版）

```html
<main class="culture-main">

  <!-- 导航锚点菜单（侧边固定） -->
  <nav class="culture-sidenav">
    <a href="#axis" class="sidenav-item active" data-i18n="nav_axis">中轴线</a>
    <a href="#yinyang" class="sidenav-item" data-i18n="nav_yinyang">阴阳五行</a>
    <a href="#fengshui" class="sidenav-item" data-i18n="nav_fengshui">风水格局</a>
    <a href="#numbers" class="sidenav-item" data-i18n="nav_numbers">数字密码</a>
    <a href="#colors" class="sidenav-item" data-i18n="nav_colors">色彩等级</a>
  </nav>

  <!-- 区块一：中轴线 -->
  <section class="culture-section" id="axis">
    <h2 data-i18n="axis_title">中轴线——天下之脊</h2>
    <div class="culture-visual">
      <p>【占位】中轴线标注图 + 动画</p>
      <!-- 替换为你的中轴线可视化 -->
    </div>
    <div class="culture-text">
      <p>【占位】中轴线文字内容，后期填写</p>
    </div>
  </section>

  <!-- 区块二：阴阳五行 -->
  <section class="culture-section" id="yinyang">
    <h2 data-i18n="yinyang_title">阴阳五行——建筑中的宇宙观</h2>
    <div class="culture-visual">
      <p>【占位】太极图 + 故宫叠加图</p>
    </div>
    <div class="culture-text">
      <p>【占位】阴阳五行文字内容，后期填写</p>
    </div>
    <!-- 五行对应表格 -->
    <table class="culture-table" id="wuxing-table">
      <thead>
        <tr>
          <th data-i18n="th_principle">原则</th>
          <th data-i18n="th_expression">故宫体现</th>
          <th data-i18n="th_explain">说明</th>
        </tr>
      </thead>
      <tbody>
        <!-- 占位行，后期填写或由JS从JSON加载 -->
        <tr><td>【占位】</td><td>【占位】</td><td>【占位】</td></tr>
      </tbody>
    </table>
  </section>

  <!-- 区块三：风水格局 -->
  <section class="culture-section" id="fengshui">
    <h2 data-i18n="fengshui_title">风水格局——藏风聚气的空间哲学</h2>
    <div class="culture-visual">
      <p>【占位】风水布局鸟瞰图 + 风向/水流/光照箭头动画</p>
    </div>
    <div class="culture-text">
      <p>【占位】风水格局文字内容，后期填写</p>
    </div>
  </section>

  <!-- 区块四：数字密码 -->
  <section class="culture-section" id="numbers">
    <h2 data-i18n="numbers_title">数字密码——藏在建筑里的数学</h2>
    <div class="culture-visual">
      <p>【占位】数字热力图</p>
    </div>
    <div class="culture-text">
      <p>【占位】数字密码文字内容，后期填写</p>
    </div>
  </section>

  <!-- 区块五：色彩等级 -->
  <section class="culture-section" id="colors">
    <h2 data-i18n="colors_title">色彩与等级——看得见的权力</h2>
    <div class="culture-visual">
      <p>【占位】色彩解码器</p>
    </div>
    <div class="culture-text">
      <p>【占位】色彩等级文字内容，后期填写</p>
    </div>
  </section>

</main>
```

---

## 8. 第六步：全局手势交互改造

### 8.1 保留什么

你现有的 `gesture.js` 已经实现了：
- ✅ MediaPipe Hands 手势检测
- ✅ 握拳 → 光标跟随移动
- ✅ 手掌滑动 → 左右切换
- ✅ 食指指向 → 点击

### 8.2 需要新增的手势

在 `gesture.js` 中新增以下手势识别：

| 手势 | 识别方法 | 用途 |
|------|---------|------|
| 双指缩放 | 检测拇指+食指的距离变化 | 总览图缩放、解剖图缩放 |
| 长按 | 握拳保持不动超过1秒 | 弹出建筑详细浮层 |
| 双击 | 食指快速点两次（600ms内） | 快速进入建筑详情 |
| 旋转 | 双手同时出现，检测旋转角度 | 角楼解谜游戏中旋转屋面模块 |
| 拖拽 | 握拳状态下移动手掌 | 小游戏中拖拽构件 |

### 8.3 修改建议

在 `gesture.js` 的手势判断函数中，添加新的分支：

```javascript
// 伪代码 —— 在你现有的手势判断逻辑中添加

// === 新增：双指缩放 ===
if (手势 === "拇指+食指同时伸出") {
  const distance = 计算两指之间距离;
  if (上一帧distance存在) {
    const scale = distance / 上一帧distance;
    // 触发缩放事件
    document.dispatchEvent(new CustomEvent('gesture-zoom', { detail: { scale } }));
  }
}

// === 新增：长按检测 ===
if (手势 === "握拳" && 光标位置没有移动超过20px && 持续时间 > 1000ms) {
  document.dispatchEvent(new CustomEvent('gesture-longpress', { detail: { x, y } }));
}

// === 新增：拖拽 ===
if (手势 === "握拳" && 正在移动) {
  document.dispatchEvent(new CustomEvent('gesture-drag', { detail: { x, y, dx, dy } }));
}

// === 新增：旋转（需要检测双手） ===
if (检测到两只手) {
  const angle = 计算两手连线的角度变化;
  document.dispatchEvent(new CustomEvent('gesture-rotate', { detail: { angle } }));
}
```

> 📝 **建议：** 用 `CustomEvent` 的方式派发手势事件，这样各个页面的JS只需要监听事件就行，不需要直接修改 `gesture.js`。

---

## 9. 第七步：AI助手改造

### 9.1 保留什么

- ✅ 整个 `assistance.js` 的代码逻辑
- ✅ 整个 AI助手面板的HTML和CSS
- ✅ 通义千问API调用链路

### 9.2 需要修改的

**修改 `assistance.js` 中的 system prompt**（系统提示词）：

找到代码中设置AI角色的地方（类似 `role: "system"` 的消息），把内容替换为：

```
你是「皇城·万象」的AI导览助手，专注于故宫古建筑知识的讲解。

你的知识范围包括：
1. 故宫20座核心建筑的历史、功能、等级
2. 建筑构件：脊兽、斗拱、彩画、屋顶形制、须弥座、金砖、琉璃瓦、榫卯、拱券等
3. 古代建筑中的数学与物理：力学传导、抗震原理、排水工程、几何对称、材料科学
4. 文化密码：中轴线哲学、阴阳五行、风水格局、数字密码（9和5）、色彩等级制度
5. 建筑术语的中英文对照和拼音发音

请用通俗易懂的语言回答，适合来华留学生和中国文化爱好者理解。
回答时可以穿插有趣的比喻（如"斗拱就像古代的减震器"）。
根据用户的语言选择中文或英文回答。
```

---

## 10. 第八步：中英双语改造

### 10.1 保留什么

- ✅ `i18n.js` 的切换逻辑框架
- ✅ `language-toggle` 按钮

### 10.2 需要修改的

**替换 `i18n.js` 中的翻译字典**。你现有的翻译内容是关于"十二时辰"的，需要全部替换为新项目的翻译。

翻译Key的命名规范（在HTML中用 `data-i18n="key名"` 标记）：

```javascript
const translations = {
  zh: {
    // === 首页 ===
    site_title: "皇城·万象",
    site_desc: "故宫古建筑智慧交互可视化平台",
    mod1_title: "建筑档案",
    mod1_desc: "探索故宫20座核心建筑的身份档案",
    mod2_title: "重点解读",
    mod2_desc: "解剖四座建筑的构件智慧与互动游戏",
    mod3_title: "文化密码",
    mod3_desc: "中轴线、阴阳五行、风水与数字密码",

    // === 通用导航 ===
    back_home: "← 返回首页",
    back_archive: "← 返回建筑档案",
    gesture_on: "手势控制已开启",
    click_building: "👆 点击地图上的建筑查看档案",
    click_component: "👆 点击左侧构件按钮查看详情",
    explore_wisdom: "探索建筑智慧 →",

    // === 模块一标签 ===
    tab_archive: "档案卡",
    tab_events: "事件卡",
    label_area: "区域",
    label_function: "功能",
    label_rank: "等级",
    label_roof: "屋顶形制",
    label_built: "建造年代",
    label_material: "材料来源",

    // === 模块二标签 ===
    tab_craft: "形制与工艺",
    tab_science: "物理与数学",
    tab_culture: "文化与符号",

    // === 构件名称 ===
    comp_jishou: "脊兽",
    comp_dougong: "斗拱",
    comp_caihui: "彩画",
    comp_wuding: "屋顶",
    comp_xumizuo: "须弥座",
    comp_jinzhuan: "金砖/琉璃瓦",

    // === 小游戏 ===
    game_start: "开始游戏",
    game_reset: "重新开始",
    game_stack_title: "🎮 堆叠太和殿",

    // === 模块三 ===
    nav_axis: "中轴线",
    nav_yinyang: "阴阳五行",
    nav_fengshui: "风水格局",
    nav_numbers: "数字密码",
    nav_colors: "色彩等级",

    // ... 更多翻译项后续添加
  },

  en: {
    site_title: "Imperial City · Grand Panorama",
    site_desc: "Interactive Visualization Platform for Architectural Wisdom of the Forbidden City",
    mod1_title: "Building Archive",
    mod1_desc: "Explore archives of 20 core buildings",
    mod2_title: "Deep Exploration",
    mod2_desc: "Dissect 4 buildings: components, science & games",
    mod3_title: "Cultural Code",
    mod3_desc: "Central axis, Yin-Yang, Feng Shui & number codes",

    back_home: "← Home",
    back_archive: "← Back to Archive",
    gesture_on: "Gesture control ON",
    click_building: "👆 Click a building to view its archive",
    click_component: "👆 Click a component button for details",
    explore_wisdom: "Explore Wisdom →",

    tab_archive: "Archive",
    tab_events: "Events",
    label_area: "Area",
    label_function: "Function",
    label_rank: "Rank",
    label_roof: "Roof Type",
    label_built: "Built",
    label_material: "Materials",

    tab_craft: "Form & Craft",
    tab_science: "Science & Math",
    tab_culture: "Culture & Symbol",

    comp_jishou: "Ridge Beasts",
    comp_dougong: "Bracket Sets",
    comp_caihui: "Painted Decoration",
    comp_wuding: "Roof",
    comp_xumizuo: "Sumeru Base",
    comp_jinzhuan: "Golden Bricks / Glazed Tiles",

    game_start: "Start Game",
    game_reset: "Restart",
    game_stack_title: "🎮 Stack the Hall",

    nav_axis: "Central Axis",
    nav_yinyang: "Yin-Yang & Five Elements",
    nav_fengshui: "Feng Shui",
    nav_numbers: "Number Codes",
    nav_colors: "Color Hierarchy",

    // ... 更多翻译项后续添加
  }
};
```

---

## 11. 第九步：小游戏实现

### 11.1 四个游戏的技术方案

| 游戏 | 文件 | 核心技术 | 手势支持 |
|------|------|---------|---------|
| 堆叠太和殿 | `game-stack.js` | HTML5 Canvas 或 DOM拖拽 | 拖拽（握拳移动） |
| 角楼解谜 | `game-tower-puzzle.js` | DOM拖拽 + CSS transform rotate | 旋转（双指）+ 拖拽 |
| 十万人朝圣 | `game-imperial-passage.js` | DOM动画 + 状态机 | 滑动（手掌左右） |
| 九龙拼图 | `game-dragon-mosaic.js` | Canvas 或 DOM拖拽 | 拖拽 + 旋转 |

### 11.2 「堆叠太和殿」实现思路

```
游戏状态：
- 7个构件：须弥座 → 金砖 → 柱网 → 斗拱 → 屋顶框架 → 琉璃瓦 → 脊兽
- 每个构件是一个可拖拽的DOM元素或Canvas图形
- 左侧是"构件库"（打散的构件），右侧是"建造区"（目标位置）

游戏流程：
1. 点击"开始游戏"→ 7个构件随机排列在左侧
2. 用户拖拽构件到右侧对应位置
3. 拖到正确位置：
   - 构件吸附到目标位
   - 播放吸附音效 snap.mp3
   - 显示文字提示（如"斗拱层就位！它是古代的减震器"）
   - 分数 +1
4. 拖到错误位置：
   - 构件弹回原位
   - 播放错误音效 error.mp3
   - 红色闪烁提示
5. 全部7个拼完：
   - 播放成功音效 success.mp3
   - 显示庆祝动画
   - 弹出完成卡片，总结建筑结构知识

手势支持：
- 监听 'gesture-drag' 事件来移动构件
- 监听 'gesture-longpress' 事件来"抓取"构件
```

### 11.3 其他三个游戏

由于篇幅限制，这里只给核心思路，具体实现代码后续开发：

**角楼解谜：** 屋面被拆成若干块，每块可旋转（0°/90°/180°/270°）和拖拽。拼对一面后提示"发现C4对称！"，点击"镜像复制"按钮自动完成。

**十万人朝圣：** 随机抽取身份卡 → 显示线索文字 → 用户点击/滑动选择门洞 → 正确/错误反馈 → 穿越动画。

**九龙拼图：** 将龙的图片切割成 N×N 网格，打乱顺序，用户拖拽归位。三关递增难度。

---

## 12. 页面间跳转逻辑

```
index.html (首页)
  ├── 点击"建筑档案" → pages/module1-archive.html
  ├── 点击"重点解读" → pages/module2-taihedian.html (默认进太和殿)
  └── 点击"文化密码" → pages/module3-culture.html

pages/module1-archive.html (总览图)
  ├── 点击"← 返回首页" → ../index.html
  ├── 点击普通建筑 → 右侧弹出档案卡（不跳转页面）
  ├── 点击太和殿★ → 档案卡 → 点击「探索智慧→」→ module2-taihedian.html
  ├── 点击角楼★   → 档案卡 → 点击「探索智慧→」→ module2-jiaolou.html
  ├── 点击午门★   → 档案卡 → 点击「探索智慧→」→ module2-wumen.html
  └── 点击九龙壁★ → 档案卡 → 点击「探索智慧→」→ module2-jiulongbi.html

pages/module2-*.html (重点建筑)
  └── 点击"← 返回建筑档案" → module1-archive.html

pages/module3-culture.html (文化密码)
  └── 点击"← 返回首页" → ../index.html
```

---

## 13. 插画与素材占位规范

所有需要你自己制作/插入的素材都用以下格式标记：

```html
<!-- 在HTML中的占位写法 -->
<div class="placeholder">
  <p>【占位】说明文字</p>
  <!-- 替换为: <img src="路径" alt="描述"> -->
</div>
```

### 13.1 需要你准备的素材清单

| 素材 | 建议尺寸 | 用途 | 文件路径 |
|------|---------|------|---------|
| 首页背景 | 1920×1080 | Landing页面背景 | `assets/images/landing-bg.jpg` |
| 故宫俯视总览图 | 2000×1500+ | 模块一地图底图 | `assets/images/overview-map.png` |
| 太和殿全景/解剖图 | 1200×800 | 模块二左侧大图 | `assets/images/taihedian/full.png` |
| 太和殿各构件图 | 600×400 each | 构件卡片配图 | `assets/images/taihedian/*.png` |
| 角楼全景图 | 1200×800 | 模块二左侧大图 | `assets/images/jiaolou/full.png` |
| 午门全景图 | 1200×800 | 模块二左侧大图 | `assets/images/wumen/full.png` |
| 九龙壁全景图 | 1200×800 | 模块二左侧大图 | `assets/images/jiulongbi/full.png` |
| 20座建筑卡片图 | 400×300 each | 模块一档案卡配图 | `assets/images/buildings/*.png` |
| 中轴线标注图 | 1000×2000 | 模块三中轴线区块 | `assets/images/culture/axis-map.png` |
| 太极图 | 600×600 | 模块三阴阳区块 | `assets/images/culture/taiji.png` |
| 风水布局图 | 1200×800 | 模块三风水区块 | `assets/images/culture/fengshui-map.png` |
| 音效文件 | — | 小游戏反馈 | `assets/audio/*.mp3` |

---

## 14. 部署与测试

### 14.1 本地测试

```bash
# 1. 启动API代理（和之前一样）
cd api
set DASHSCOPE_API_KEY=你的key
node proxy-server.js

# 2. 浏览器打开 http://localhost:3000
# 3. 测试每个页面的链接跳转是否正常
# 4. 测试手势识别是否正常（需要Chrome/Edge + 摄像头）
# 5. 测试AI助手是否正常回答
# 6. 测试中英切换是否正常
```

### 14.2 Netlify部署

`netlify.toml` 需要添加新页面的路由规则：

```toml
[build]
  publish = "."

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

# 子页面路由（如果使用了clean URL）
[[redirects]]
  from = "/archive"
  to = "/pages/module1-archive.html"
  status = 200

[[redirects]]
  from = "/taihedian"
  to = "/pages/module2-taihedian.html"
  status = 200

[[redirects]]
  from = "/jiaolou"
  to = "/pages/module2-jiaolou.html"
  status = 200

[[redirects]]
  from = "/wumen"
  to = "/pages/module2-wumen.html"
  status = 200

[[redirects]]
  from = "/jiulongbi"
  to = "/pages/module2-jiulongbi.html"
  status = 200

[[redirects]]
  from = "/culture"
  to = "/pages/module3-culture.html"
  status = 200
```

### 14.3 开发建议顺序

按以下顺序逐步开发，每完成一步就测试一下：

```
第1周：清理 + 首页 + 页面跳转框架
  ├── 删除旧文件
  ├── 搭建新index.html
  ├── 创建所有空页面文件
  ├── 确保所有页面间跳转正常
  └── 确保AI助手和手势在每个页面都正常

第2周：模块一
  ├── 准备故宫俯视总览图
  ├── 填写buildings.json数据
  ├── 实现archive.js（建筑标记 + 点击显示卡片）
  └── 写archive.css样式

第3周：模块二（太和殿 + 角楼）
  ├── 准备太和殿和角楼的插画
  ├── 实现构件按钮高亮交互
  ├── 实现「堆叠太和殿」小游戏
  └── 实现「角楼解谜」小游戏

第4周：模块二（午门 + 九龙壁）
  ├── 准备午门和九龙壁的插画
  ├── 实现构件按钮高亮交互
  ├── 实现「十万人朝圣」小游戏
  └── 实现「九龙拼图」小游戏

第5周：模块三 + 双语 + 打磨
  ├── 准备文化密码的可视化素材
  ├── 实现culture.js（中轴线动画、太极图交互等）
  ├── 完善i18n.js翻译字典
  └── 填充所有【占位】内容

第6周：测试 + 部署
  ├── 全流程测试
  ├── 手势测试
  ├── 双语测试
  └── Netlify部署
```

---

## 常见问题

**Q: 子页面的AI助手是否需要重新初始化？**
A: 每个HTML页面都单独引入了 `assistance.js`，它会自动初始化。确保每个页面都有完整的AI助手面板HTML即可。

**Q: 手势在子页面不工作？**
A: 确保每个页面都引入了 `gesture.js`，并且有 `#gesture-toggle` 按钮和 `#gesture-indicator` 容器。

**Q: 图片路径为什么有的是 `../assets/` 有的是 `assets/`？**
A: 首页 `index.html` 在根目录，用 `assets/`；子页面在 `pages/` 文件夹里，需要用 `../assets/` 返回上一级。

**Q: JSON数据怎么加载？**
A: 在JS中用 `fetch('../data/buildings.json')` 来异步加载，注意子页面需要 `../` 前缀。

---

> 🎯 **总结：** 本README是一份完整的施工图纸。你只需要按照章节顺序逐步执行，所有插画和卡片文字内容用【占位】标记，后期自己替换即可。遇到任何问题随时回来问我。