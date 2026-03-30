/* ==========================================
   手势交互 · MediaPipe Hands
   P1: 手掌左右滑动 → 切换时辰
   P2: 拇指+食指捏合 → 缩放场景（transform scale）
   P3: 握拳 → 画面停止，光标跟随食指移动，停留触发点击
   P4: 食指指向 → 光标跟随食指移动，停留触发悬停/点击
   ========================================== */

  const Gesture = (() => {
    let isActive = false;
    let hands = null;
    let handsCamera = null;
    let videoEl = null;
    let mediaPipeLoaded = false;
    let isInitializing = false;

    // ---- 手势状态机 ----
    // 'none' | 'swiping' | 'fist' | 'pointing' | 'pinching'
    let currentGesture = 'none';
    let prevGesture = 'none';

    // 光标位置（平滑插值）
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let cursorX = targetX;
    let cursorY = targetY;
    const CURSOR_SMOOTH = 0.12;   // 光标跟随平滑系数（越小越跟手）
    const CURSOR_SMOOTH_FIST = 0.25; // 握拳时光标更跟手

    // 上一帧手掌位置（用于检测滑动方向）
    let prevPalmX = -1;
    let prevPalmY = -1;

    // 缩放状态（捏合）
    let currentScale = 1;
    let baseScale = 1;
    let initialPinchDist = 0;

    // 挥动检测
    let swipeBuffer = [];
    let lastSwipeTime = 0;
    const SWIPE_THRESHOLD = 0.13;
    const SWIPE_COOLDOWN = 600;

    // 握拳停留点击
    let dwellStartTime = 0;
    let dwellX = 0, dwellY = 0;
    const DWELL_TIME = 600;       // 停留 600ms 触发点击
    const DWELL_MOVE_THRESHOLD = 25; // 移动超过 25px 重置计时
    // 点击冷却：防止点击后立即重复触发
    let lastClickTime = 0;
    const CLICK_COOLDOWN = 1200;    // 两次点击至少间隔 1200ms

    // 点击效果动画
    let clickAnimTimeout = null;
    // 防止 performClick 与原生 click 重复触发的标志
    let gestureClickProcessed = false;
    const GESTURE_CLICK_DEBOUNCE = 300; // 300ms 内忽略原生 click

    // CDN
    const MEDIAPIPE_HANDS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
    const CAMERA_UTILS_URL    = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';

    // ─────────────────────────────────────────────
    // 首页推门手势状态
    // ─────────────────────────────────────────────
    let pushEnabled = false;         // 是否已开启摄像头（推门模式）
    let pushTriggered = false;       // 推门是否已触发
    let pushHandHistory = [];        // 手部位置历史（用于检测推门）
    const PUSH_HISTORY_FRAMES = 18;  // 追踪最近 18 帧
    let pushHintTimeout = null;
    let pushDoorCallback = null;     // 推门成功后回调

    // ─────────────────────────────────────────────
    // 初始化
    // ─────────────────────────────────────────────
    function init() {
      // 创建摄像头预览元素
      videoEl = document.createElement('video');
      videoEl.id = 'camera-preview';
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      videoEl.style.cssText = 'position:fixed;bottom:90px;left:20px;width:160px;height:120px;border:1px solid #4a4236;z-index:9998;opacity:0.4;transform:scaleX(-1);display:none;border-radius:4px;';
      document.body.appendChild(videoEl);

      // 绑定手势开关按钮
      const toggleBtn = document.getElementById('gesture-toggle');
      if (toggleBtn) toggleBtn.addEventListener('click', toggle);

      // 添加首页摄像头选择按钮
      buildLandingCameraBtn();

      // 启用鼠标光标跟随模式
      initMouseCursor();

      // 显示光标和手势指示器（立即可见）
      showCursorUI();

      // 启动光标动画循环
      animateCursor();

      console.log('[Gesture] 模块已初始化（鼠标跟随模式）');
    }

    // ─────────────────────────────────────────────
    // 首页摄像头选择按钮
    // ─────────────────────────────────────────────
    function buildLandingCameraBtn() {
      const landing = document.getElementById('landing');
      if (!landing) return;

      const btn = document.createElement('button');
      btn.id = 'landing-camera-btn';
      btn.className = 'landing-camera-btn';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M15 3a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2V5a2 2 0 012-2h6zM9 7a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V9M12 14v7M8 18h8"/>
        </svg>
        <span>手势推门进入</span>
      `;
      btn.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, calc(50% + 80px));
        z-index: 1010;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 22px;
        background: rgba(26, 23, 20, 0.75);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(200, 168, 85, 0.35);
        border-radius: 24px;
        color: rgba(200, 168, 85, 0.8);
        font-family: 'Noto Serif SC', serif;
        font-size: 13px;
        letter-spacing: 0.1em;
        cursor: pointer;
        opacity: 0;
        animation: landingBtnFadeIn 1s ease-out 2.8s forwards;
        transition: all 0.3s ease;
      `;
      btn.addEventListener('click', requestCameraAndPushDoor);
      btn.addEventListener('mouseenter', () => {
        btn.style.borderColor = 'rgba(200, 168, 85, 0.7)';
        btn.style.color = '#c8a855';
        btn.style.boxShadow = '0 0 16px rgba(200, 168, 85, 0.2)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.borderColor = 'rgba(200, 168, 85, 0.35)';
        btn.style.color = 'rgba(200, 168, 85, 0.8)';
        btn.style.boxShadow = 'none';
      });
      landing.appendChild(btn);
    }

    // ─────────────────────────────────────────────
    // 请求摄像头并启用推门手势
    // ─────────────────────────────────────────────
    async function requestCameraAndPushDoor() {
      const btn = document.getElementById('landing-camera-btn');
      if (btn) {
        btn.textContent = '正在启动摄像头...';
        btn.disabled = true;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });

        // 隐藏按钮
        if (btn) btn.style.display = 'none';

        // 创建预览
        const preview = document.createElement('div');
        preview.id = 'push-preview';
        preview.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          width: 180px;
          height: 135px;
          border: 1px solid rgba(200, 168, 85, 0.35);
          border-radius: 6px;
          overflow: hidden;
          z-index: 1010;
          animation: pushPreviewFadeIn 0.4s 0.3s ease forwards;
          opacity: 0;
          background: #000;
        `;
        const vid = document.createElement('video');
        vid.srcObject = stream;
        vid.autoplay = true;
        vid.playsInline = true;
        vid.muted = true;
        vid.style.cssText = 'width:100%;height:100%;transform:scaleX(-1);opacity:0.5;';
        preview.appendChild(vid);

        // 提示文字
        const hint = document.createElement('div');
        hint.id = 'push-hint';
        hint.style.cssText = `
          position: absolute;
          bottom: 6px;
          left: 0; right: 0;
          text-align: center;
          font-size: 11px;
          color: rgba(200, 168, 85, 0.8);
          letter-spacing: 0.05em;
          pointer-events: none;
        `;
        hint.textContent = '手掌推入 → 进入';
        preview.appendChild(hint);
        document.body.appendChild(preview);
        await vid.play();

        // 加载 MediaPipe
        const loaded = await loadMediaPipe();
        if (!loaded) throw new Error('MediaPipe failed');

        // 启动推门检测
        pushEnabled = true;
        pushTriggered = false;
        startManualFrameLoop();

        if (pushHintTimeout) clearTimeout(pushHintTimeout);
        pushHintTimeout = setTimeout(() => {
          showPushHint('timeout');
        }, 12000);

      } catch (err) {
        console.warn('[Gesture] 摄像头/手势启动失败:', err);
        if (btn) {
          btn.textContent = '摄像头不可用';
          btn.disabled = false;
        }
      }
    }

    // ─────────────────────────────────────────────
    // 手势结果回调（MediaPipe Hands — 合并版本）
    // 同时处理首页推门检测 + 主场景手势
    // ─────────────────────────────────────────────
    function onHandResults(results) {
      // ── 首页推门检测 ──
      if (pushEnabled && !pushTriggered) {
        detectPushDoor(results);
      }

      // ── 无手部时恢复默认 ──
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        hideCursorUI();
        resetGestureState();
        currentGesture = 'none';
        return;
      }

      // ── 非手势激活模式（未开启摄像头）直接跳过 ──
      if (!isActive) return;

      showCursorUI();
      const lm = results.multiHandLandmarks[0];

      // 更新光标到食指指尖位置（镜像）
      const indexTip = lm[8];
      targetX = (1 - indexTip.x) * window.innerWidth;
      targetY = indexTip.y * window.innerHeight;

      // 检测当前手势类型并处理
      detectAndApplyGesture(lm);
    }

    // ─────────────────────────────────────────────
    // 推门手势检测（首页专用）
    // 检测：手掌从画面边缘向中心推进
    // ─────────────────────────────────────────────
    function detectPushDoor(results) {
      if (!results.multiHandLandmarks) return;

      const hands = results.multiHandLandmarks;
      const now = Date.now();

      for (const lm of hands) {
        const wrist = lm[0];
        const palm = lm[9];
        const mirroredX = 1 - palm.x;

        pushHandHistory.push({ x: mirroredX, y: palm.y, z: palm.z || 0, time: now });
        if (pushHandHistory.length > PUSH_HISTORY_FRAMES) pushHandHistory.shift();

        // 需要至少 10 帧数据
        if (pushHandHistory.length < 10) continue;

        const first = pushHandHistory[0];
        const last = pushHandHistory[pushHandHistory.length - 1];
        const dt = (now - first.time) / 1000;
        if (dt < 0.3) continue;

        // 检测从画面左侧向右推进（推门）
        const dx = last.x - first.x;
        const dy = last.y - first.y;

        // 条件：手从左侧向右移动至少 25% 画面宽度，且有轻微前推（z < 0 表示靠近摄像头）
        const enterFromSide = first.x < 0.4 && dx > 0.25;
        const pushForward = (last.z || 0) < (first.z || 0) + 0.02;

        if (enterFromSide && dx > 0.3) {
          triggerPushDoor();
          return;
        }
      }
    }

    function triggerPushDoor() {
      if (pushTriggered) return;
      pushTriggered = true;
      pushEnabled = false;

      if (pushHintTimeout) clearTimeout(pushHintTimeout);

      // 关闭预览
      const preview = document.getElementById('push-preview');
      const hint = document.getElementById('push-hint');
      if (hint) hint.textContent = '叩门而入';
      if (preview) {
        setTimeout(() => {
          if (preview) preview.style.opacity = '0';
          setTimeout(() => preview?.remove(), 400);
        }, 300);
      }

      // 停止摄像头
      if (videoEl?.srcObject) {
        videoEl.srcObject.getTracks().forEach(t => t.stop());
      }

      // 触发进入
      if (typeof Landing !== 'undefined' && Landing.dissolve) {
        Landing.dissolve();
      } else if (pushDoorCallback) {
        pushDoorCallback();
      }
    }

    function showPushHint(type) {
      const hint = document.getElementById('push-hint');
      if (!hint) return;
      if (type === 'timeout') {
        hint.textContent = '无检测到手势，请点击按钮进入';
      }
    }

    // ─────────────────────────────────────────────
    // 重置推门状态
    // ─────────────────────────────────────────────
    function resetPushDoor() {
      pushEnabled = false;
      pushTriggered = false;
      pushHandHistory = [];
      if (pushHintTimeout) clearTimeout(pushHintTimeout);

      const preview = document.getElementById('push-preview');
      if (preview) preview.remove();

      const btn = document.getElementById('landing-camera-btn');
      if (btn) {
        btn.style.display = '';
        btn.textContent = '手势推门进入';
        btn.disabled = false;
      }

      if (videoEl?.srcObject) {
        videoEl.srcObject.getTracks().forEach(t => t.stop());
      }
    }

    // ─────────────────────────────────────────────
    // 鼠标跟随模式（默认 / 降级方案）
    // ─────────────────────────────────────────────
    function initMouseCursor() {
      document.body.classList.add('mouse-cursor-active');
      document.body.style.cursor = 'none';

      // 鼠标移入时隐藏原生光标
      document.addEventListener('mouseenter', () => {
        document.body.style.cursor = 'none';
      });

      // 鼠标移动：更新目标光标位置
      document.addEventListener('mousemove', (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
      });

      // 鼠标点击
      document.addEventListener('click', (e) => {
        // 如果是手势刚处理的点击（300ms 内），跳过
        if (gestureClickProcessed) return;

        targetX = e.clientX;
        targetY = e.clientY;
        cursorX = e.clientX;
        cursorY = e.clientY;
        performClick(e.clientX, e.clientY);
      });
    }

    // ─────────────────────────────────────────────
    // 显示光标 UI
    // ─────────────────────────────────────────────
    function showCursorUI() {
      const indicator = document.getElementById('gesture-indicator');
      if (indicator) {
        indicator.classList.remove('hidden');
        indicator.style.pointerEvents = 'none';
      }
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) cursor.classList.add('visible');
    }

    function hideCursorUI() {
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) cursor.classList.remove('visible');
    }

    // ─────────────────────────────────────────────
    // 光标动画循环（所有模式共用）
    // 同时负责：位置插值 + 热区悬停反馈
    // ─────────────────────────────────────────────
    function animateCursor() {
      const smooth = currentGesture === 'fist' ? CURSOR_SMOOTH_FIST : CURSOR_SMOOTH;
      cursorX += (targetX - cursorX) * smooth;
      cursorY += (targetY - cursorY) * smooth;

      // 实时更新光标 DOM 位置
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.style.left = cursorX + 'px';
        cursor.style.top  = cursorY + 'px';
      }

      // 检测光标是否悬停在热区上，并触发 hover 反馈
      detectHotspotHover(cursorX, cursorY);

      requestAnimationFrame(animateCursor);
    }

    // ─────────────────────────────────────────────
    // 检测光标悬停热区 → 主动触发 CSS :hover 效果
    // 由于使用了 pointer-events:none 的自定义光标，
    // 原生 :hover 无法工作，需要 JS 模拟
    // ─────────────────────────────────────────────
    let lastHoveredEl = null;

    function detectHotspotHover(x, y) {
      const elements = document.elementsFromPoint(x, y);

      // 支持热区 + 时间轴项 + AI助手按钮的 hover 反馈
      const hotspotEl = elements.find(el => el.classList.contains('hotspot') || el.closest('.hotspot'));
      const timelineEl = elements.find(el => el.classList.contains('timeline-item') || el.closest('.timeline-item'));
      const aiBtnEl = elements.find(el =>
        el.id === 'ast-send' || el.id === 'ast-mic' || el.id === 'ast-close' ||
        el.closest('#ast-send') || el.closest('#ast-mic') || el.closest('#ast-close') ||
        el.closest('.ast-send-btn') || el.closest('.ast-close-btn')
      );

      const targetEl = hotspotEl
        ? (hotspotEl.classList.contains('hotspot') ? hotspotEl : hotspotEl.closest('.hotspot'))
        : (timelineEl
            ? (timelineEl.classList.contains('timeline-item') ? timelineEl : timelineEl.closest('.timeline-item'))
            : (aiBtnEl ? (aiBtnEl.closest('.ast-send-btn, .ast-close-btn') || aiBtnEl) : null));

      if (targetEl && targetEl !== lastHoveredEl) {
        if (lastHoveredEl) lastHoveredEl.classList.remove('cursor-hover');
        targetEl.classList.add('cursor-hover');
        lastHoveredEl = targetEl;
      } else if (!targetEl && lastHoveredEl) {
        lastHoveredEl.classList.remove('cursor-hover');
        lastHoveredEl = null;
      }
    }

    // ─────────────────────────────────────────────
    // 手势分类与处理
    // ─────────────────────────────────────────────
    function detectAndApplyGesture(lm) {
      const gesture = classifyGesture(lm);

      if (gesture !== prevGesture) {
        onGestureChange(gesture, prevGesture);
        prevGesture = gesture;
      }

      currentGesture = gesture;

      switch (gesture) {
        case 'swiping':
          handleSwiping(lm);
          break;
        case 'pinching':
          handlePinching(lm);
          break;
        case 'fist':
          handleFist(lm);
          break;
        case 'pointing':
          handlePointing(lm);
          break;
        default:
          break;
      }
    }

    // 手势分类：返回 'swiping' | 'pinching' | 'fist' | 'pointing' | 'none'
    function classifyGesture(lm) {
      // 计算各手指伸展状态
      const thumbTip  = lm[4];
      const indexTip  = lm[8];
      const middleTip = lm[12];
      const ringTip   = lm[16];
      const pinkyTip  = lm[20];

      const indexMcp = lm[5];
      const thumbIp   = lm[3];   // 拇指第二关节

      // 手腕 / 掌心参考
      const wrist = lm[0];
      const palmCenter = lm[9];  // 中指根部

      // 握拳判断：所有指尖都弯曲（指尖到手腕距离 < 手指中关节到手腕距离）
      const wristToIndexMcp = dist(lm[5], wrist);
      const isIndexClosed   = dist(lm[8], wrist)  < dist(lm[6], wrist)  * 1.1;
      const isMiddleClosed  = dist(lm[12], wrist) < dist(lm[10], wrist) * 1.1;
      const isRingClosed    = dist(lm[16], wrist) < dist(lm[14], wrist) * 1.1;
      const isPinkyClosed    = dist(lm[20], wrist) < dist(lm[18], wrist) * 1.1;
      const isThumbClosed   = dist(lm[4], wrist)  < dist(lm[3], wrist)  * 1.15;

      if (isIndexClosed && isMiddleClosed && isRingClosed && isPinkyClosed) {
        // 检测是否是食指指向而非握拳（食指伸展，拇指可伸可屈）
        const isIndexExtended = dist(lm[8], wrist) > dist(lm[5], wrist) * 1.2;
        if (isIndexExtended) {
          return 'pointing';
        }
        return 'fist';
      }

      // 捏合缩放判断：拇指 + 食指伸展且两指尖距离近
      const pinchDist = dist(thumbTip, indexTip);
      const isIndexExt = dist(lm[8], wrist) > dist(lm[5], wrist);
      const isThumbNearIndex = pinchDist < 0.10; // 阈值增大，防止误触发

      if (isThumbNearIndex && isIndexExt) {
        return 'pinching';
      }

      // 默认 → 滑动（手掌）
      return 'swiping';
    }

    function onGestureChange(newG, oldG) {
      const cursor = document.getElementById('gesture-cursor');
      const indicator = document.getElementById('gesture-indicator');

      // 清除点击动画
      if (clickAnimTimeout) { clearTimeout(clickAnimTimeout); clickAnimTimeout = null; }
      if (cursor) cursor.classList.remove('clicking', 'pinching', 'pointing');

      // 重置 dwell 计时
      dwellStartTime = 0;

      // 退出捏合时，重置缩放基准值，防止下次捏合时 scale 跳变
      if (oldG === 'pinching') {
        initialPinchDist = 0;
        baseScale = currentScale;
      }

      switch (newG) {
        case 'fist':
          if (cursor) {
            cursor.style.width = '22px';
            cursor.style.height = '22px';
            cursor.classList.add('fist');
          }
          if (indicator) updateGestureStatus('握拳 · 移动光标');
          Scenes.freeze(true);   // 通知场景冻结
          break;
        case 'pointing':
          if (cursor) {
            cursor.style.width = '18px';
            cursor.style.height = '18px';
            cursor.classList.add('pointing');
          }
          if (indicator) updateGestureStatus('食指 · 点击热区');
          Scenes.freeze(false);
          dwellStartTime = Date.now();
          dwellX = targetX;
          dwellY = targetY;
          break;
        case 'pinching':
          if (cursor) {
            cursor.style.width = '32px';
            cursor.style.height = '32px';
            cursor.classList.add('pinching');
          }
          if (indicator) updateGestureStatus('捏合 · 缩放');
          Scenes.freeze(false);
          break;
        case 'swiping':
          if (cursor) {
            cursor.style.width = '26px';
            cursor.style.height = '26px';
            cursor.classList.remove('fist', 'pointing', 'pinching');
          }
          if (indicator) updateGestureStatus('手掌 · 左右滑动切换');
          Scenes.freeze(false);
          break;
      }
    }

    // ─────────────────────────────────────────────
    // P1: 滑动 → 切换时辰
    // ─────────────────────────────────────────────
    function handleSwiping(lm) {
      const palm = lm[9];
      const x = 1 - palm.x; // 镜像

      if (prevPalmX < 0) { prevPalmX = x; return; }
      const dx = x - prevPalmX;
      prevPalmX = x;

      // 检测快速左右移动
      const now = Date.now();
      swipeBuffer.push({ dx, time: now });
      swipeBuffer = swipeBuffer.filter(p => now - p.time < 400);

      if (swipeBuffer.length >= 4) {
        const totalDx = swipeBuffer.reduce((sum, p) => sum + p.dx, 0);
        if (totalDx > SWIPE_THRESHOLD) {
          Scenes.next();
          swipeBuffer = [];
          showSwipeHint('right');
        } else if (totalDx < -SWIPE_THRESHOLD) {
          Scenes.prev();
          swipeBuffer = [];
          showSwipeHint('left');
        }
      }
    }

    // ─────────────────────────────────────────────
    // P2: 捏合 → 缩放场景
    // 只有当拇指+食指当前仍然保持捏合姿势时才缩放
    // ─────────────────────────────────────────────
    function handlePinching(lm) {
      const thumbTip = lm[4];
      const indexTip = lm[8];
      const currentDist = dist(thumbTip, indexTip);

      // 当前帧两指距离仍然小于阈值，才认为是有效捏合
      if (currentDist >= 0.10) return;

      if (initialPinchDist === 0) {
        initialPinchDist = currentDist;
        baseScale = currentScale;
        return;
      }

      const ratio = currentDist / initialPinchDist;
      currentScale = Math.max(0.5, Math.min(3.0, baseScale * ratio));

      Scenes.applyZoom(currentScale);
    }

    // ─────────────────────────────────────────────
    // P3: 握拳 → 画面冻结，光标跟随食指移动，停留点击
    // ─────────────────────────────────────────────
    function handleFist(lm) {
      Scenes.freeze(true);

      // 光标跟随已在 animateCursor 中通过 targetX/targetY 实现
    }

    // ─────────────────────────────────────────────
    // P4: 食指指向 → 光标跟随，停留触发点击
    // ─────────────────────────────────────────────
    function handlePointing(lm) {
      Scenes.freeze(false);

      const now = Date.now();
      // 移动阈值内：允许微调光标但不算"移动"
      const moved = Math.hypot(targetX - dwellX, targetY - dwellY);

      if (moved > DWELL_MOVE_THRESHOLD) {
        // 移动超出阈值：重置停留计时，并更新停留基准点
        dwellStartTime = now;
        dwellX = targetX;
        dwellY = targetY;
      } else if (dwellStartTime > 0 && now - dwellStartTime >= DWELL_TIME && now - lastClickTime >= CLICK_COOLDOWN) {
        // 停留足够时长且不在冷却期：触发点击
        lastClickTime = now;
        // 点击后重置计时，重新开始新一轮停留
        dwellStartTime = now;
        performClick(targetX, targetY);
      }
    }

    // ─────────────────────────────────────────────
    // 执行点击
    // ─────────────────────────────────────────────
    function performClick(x, y) {
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.classList.add('clicking');
        if (clickAnimTimeout) clearTimeout(clickAnimTimeout);
        clickAnimTimeout = setTimeout(() => cursor.classList.remove('clicking'), 300);
      }

      // 标记本次手势点击，防止 300ms 内原生 click 重复触发
      gestureClickProcessed = true;
      setTimeout(() => { gestureClickProcessed = false; }, GESTURE_CLICK_DEBOUNCE);

      const elements = document.elementsFromPoint(x, y);

      // 优先查找已知可交互元素
      const target = elements.find(el =>
        el.closest('.hotspot') ||
        el.closest('.timeline-item') ||
        el.closest('.card-close') ||
        el.closest('.scene') ||
        el.closest('#voice-assistant-trigger') ||
        el.closest('#gesture-toggle') ||
        el.closest('#ast-send') ||
        el.closest('#ast-mic') ||
        el.closest('#ast-close')
      );

      if (target) {
        // 对于发送按钮：点击时先启用按钮，再触发点击
        if (target.closest('#ast-send')) {
          const btn = document.getElementById('ast-send');
          if (btn && btn.disabled) btn.disabled = false;
        }
        // 直接对命中元素本身或其最近的交互祖先触发 click
        const el = target.tagName === 'BUTTON' || target.tagName === 'INPUT'
          ? target
          : target.closest('button, input, [role="button"]');
        if (el) el.click();
      }
    }

    // ─────────────────────────────────────────────
    // 工具函数
    // ─────────────────────────────────────────────
    function dist(a, b) {
      return Math.sqrt(
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2 +
        ((a.z || 0) - (b.z || 0)) ** 2
      );
    }

    function resetGestureState() {
      prevPalmX = -1;
      swipeBuffer = [];
      initialPinchDist = 0;
      dwellStartTime = 0;
      currentGesture = 'none';
      prevGesture = 'none';
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.classList.remove('fist', 'pointing', 'pinching', 'clicking');
      }
      Scenes.freeze(false);
    }

    // ─────────────────────────────────────────────
    // 状态提示
    // ─────────────────────────────────────────────
    function updateGestureStatus(text) {
      const status = document.getElementById('gesture-status');
      const label = status?.querySelector('.gesture-label');
      if (label) label.textContent = text;
      if (status) {
        status.classList.add('visible');
      }
    }

    function showSwipeHint(direction) {
      let hint = document.querySelector('.swipe-hint.' + direction);
      if (!hint) {
        hint = document.createElement('div');
        hint.className = `swipe-hint ${direction}`;
        document.getElementById('scenes-container')?.appendChild(hint);
      }
      hint.textContent = direction === 'right' ? '→ 下一时辰' : '← 上一时辰';
      hint.classList.add('show');
      setTimeout(() => hint.classList.remove('show'), 700);
    }

    // ─────────────────────────────────────────────
    // MediaPipe Hands 摄像头加载
    // ─────────────────────────────────────────────
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        videoEl.srcObject = stream;
        videoEl.style.display = 'block';

        await new Promise((resolve) => {
          videoEl.onloadedmetadata = () => {
            videoEl.play().then(resolve).catch(resolve);
          };
          setTimeout(resolve, 1500);
        });

        const loaded = await loadMediaPipe();
        if (loaded) {
          updateGestureStatus('手势控制已开启');
        } else {
          setupFallback();
          updateGestureStatus('鼠标模式');
        }
        return true;
      } catch (err) {
        console.warn('[Gesture] 摄像头访问失败:', err);
        updateGestureStatus('摄像头不可用');
        return false;
      }
    }

    async function loadMediaPipe() {
      if (typeof window.Hands !== 'undefined') {
        setupHands();
        return true;
      }
      if (isInitializing) {
        await new Promise(r => setTimeout(r, 2000));
        return mediaPipeLoaded;
      }

      isInitializing = true;
      try {
        await loadScript(MEDIAPIPE_HANDS_URL);
        await loadScript(CAMERA_UTILS_URL);
        if (typeof window.Hands === 'undefined') throw new Error('Hands not available');
        setupHands();
        mediaPipeLoaded = true;
        return true;
      } catch (e) {
        console.warn('[Gesture] MediaPipe 加载失败:', e);
        isInitializing = false;
        return false;
      }
    }

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Load failed: ${src}`));
        document.head.appendChild(s);
      });
    }

    function setupHands() {
      if (typeof window.Hands === 'undefined') { setupFallback(); return; }

      hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      hands.onResults(onHandResults);

      if (typeof window.Camera === 'undefined') {
        startManualFrameLoop();
        return;
      }

      handsCamera = new window.Camera(videoEl, {
        onFrame: async () => {
          if (isActive && hands) await hands.send({ image: videoEl });
        },
        width: 640, height: 480
      });
      handsCamera.start();
    }

    function startManualFrameLoop() {
      const loop = async () => {
        if ((isActive || pushEnabled) && hands && videoEl && videoEl.readyState >= 2) {
          try { await hands.send({ image: videoEl }); } catch {}
        }
        if (isActive || pushEnabled) requestAnimationFrame(loop);
      };
      loop();
    }

    function setupFallback() {
      console.log('[Gesture] 使用鼠标模拟模式');
    }

    // ─────────────────────────────────────────────
    // 开关控制
    // ─────────────────────────────────────────────
    async function toggle() {
      const btn = document.getElementById('gesture-toggle');

      if (isActive) {
        isActive = false;
        btn?.classList.remove('active');
        if (videoEl?.srcObject) {
          videoEl.srcObject.getTracks().forEach(t => t.stop());
        }
        if (handsCamera) { handsCamera.stop(); handsCamera = null; }
        videoEl.style.display = 'none';
        resetGestureState();
        updateGestureStatus('手势控制已关闭');
      } else {
        const ok = await startCamera();
        if (ok) {
          isActive = true;
          btn?.classList.add('active');
        }
      }
    }

    // ─────────────────────────────────────────────
    // 公开接口
    // ─────────────────────────────────────────────
    return {
      init,
      toggle,
      isActive: () => isActive,
      resetScale: () => { currentScale = 1; baseScale = 1; initialPinchDist = 0; },
      // 首页推门专用
      resetPushDoor,
      isPushActive: () => pushEnabled
    };
  })();
