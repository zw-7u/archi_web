# 故宫十二时辰 · 皇帝的一天

> 沉浸式信息可视化交互网页 · 国风水墨工笔风格

---

## 项目结构

```
forbidden-city/
├── index.html          # 主入口页面
├── css/
│   ├── main.css        # 全局样式、配色、字体
│   ├── landing.css     # 首页 Three.js 场景样式
│   ├── scenes.css      # 时辰场景页样式
│   ├── timeline.css    # 底部时间轴样式
│   ├── cards.css       # 介绍卡片弹窗样式
│   └── gesture.css     # 手势交互指示器样式
├── js/
│   ├── landing.js      # 首页粒子场景 + 消散过渡
│   ├── scenes.js       # 场景切换逻辑（滑动/键盘/滚轮）
│   ├── timeline.js     # 底部时间轴点击跳转
│   ├── cards.js        # 热区点击 → 弹出介绍卡片
│   ├── gesture.js      # 摄像头手势识别（MediaPipe）
│   └── app.js          # 主入口，初始化所有模块
├── assets/             # 放你的图片素材
│   ├── (场景背景插画)
│   └── (卡片插图)
└── README.md           # 本文件
```

---

## 如何运行

直接用浏览器打开 `index.html`，或用本地服务器：

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

然后访问 `http://localhost:8000`

---

## 如何自定义

### 1. 替换场景背景插画

在 `css/scenes.css` 中，为每个时辰添加背景图：

```css
.scene[data-hour="卯"] .scene-bg {
  background: url('../assets/scene-mao.jpg') center/cover no-repeat;
}
.scene[data-hour="辰"] .scene-bg {
  background: url('../assets/scene-chen.jpg') center/cover no-repeat;
}
/* ... 其他时辰同理 */
```

### 2. 修改卡片内容

在 `js/cards.js` 的 `cardData` 对象中修改：

```javascript
'morning-ritual': {
  title: '你的标题',
  text: '你的详细介绍...',
  image: 'assets/your-image.jpg'  // 卡片插图路径
},
```

### 3. 添加新的热区按钮

在 `index.html` 的对应场景 `.hotspots` 中添加：

```html
<button class="hotspot" data-card="your-card-id" style="--x: 50%; --y: 40%;">
  <span class="hotspot-pulse"></span>
  <span class="hotspot-label">按钮文字</span>
</button>
```

然后在 `js/cards.js` 的 `cardData` 中添加对应的 `your-card-id` 数据。

### 4. 修改时间轴时辰名称

在 `index.html` 的 `#timeline` 区域直接修改文字：

```html
<button class="timeline-item" data-index="0">卯</button>
<!-- 直接改这里的文字即可 -->
```

### 5. 嵌入你的AI问答工具

在 `index.html` 中找到 `#ai-chat-widget`，把你的AI工具代码粘贴进去：

```html
<div id="ai-chat-widget" class="ai-chat-widget">
  <!-- 把你的AI问答组件代码粘贴到这里 -->
  <!-- 删除或保留下面的触发按钮，取决于你的工具有没有自己的入口 -->
</div>
```

### 6. 调整配色

在 `css/main.css` 的 `:root` 中修改CSS变量：

```css
--vermilion: #c03c20;    /* 朱红（主强调色） */
--gold: #c8a855;         /* 金色（标题/装饰） */
--jade: #5a8a6a;         /* 青绿（辅助色） */
--ink-black: #1a1714;    /* 墨黑（背景） */
--paper-white: #f5f0e8;  /* 纸白（文字） */
```

---

## 交互方式

| 操作 | 效果 |
|------|------|
| 鼠标左右拖拽 | 切换时辰场景 |
| 滚轮上下滚动 | 切换时辰场景 |
| 键盘方向键 ←→ | 切换时辰场景 |
| 点击热区圆点 | 弹出建筑/物件介绍卡片 |
| 点击底部时辰名 | 跳转到对应时辰 |
| 右上角按钮 | 开启/关闭摄像头手势控制 |
| 手掌移动（手势） | 控制屏幕光标 |
| 左右挥手（手势） | 切换上/下一个时辰 |
| 抓取手势（手势） | 触发光标位置的点击 |
| ESC键 | 关闭介绍卡片 |

---

## 技术栈

- **HTML/CSS/JS** — 纯原生，无框架
- **Three.js r128** — 首页粒子场景
- **MediaPipe Hands** — 摄像头手势识别
- **Google Fonts** — Noto Serif SC + ZCOOL XiaoWei 字体

---

## 注意事项

- 手势功能需要 HTTPS 环境或 localhost 才能访问摄像头
- MediaPipe 需要网络连接加载模型（首次较慢）
- 建议使用 Chrome/Edge 浏览器获得最佳体验
- 场景背景图建议尺寸 1920×1080 以上