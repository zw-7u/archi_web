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

    // 点击效果动画
    let clickAnimTimeout = null;

    // CDN
    const MEDIAPIPE_HANDS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
    const CAMERA_UTILS_URL    = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';

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

      // 启用鼠标光标跟随模式
      initMouseCursor();

      // 显示光标和手势指示器（立即可见）
      showCursorUI();

      // 启动光标动画循环
      animateCursor();

      console.log('[Gesture] 模块已初始化（鼠标跟随模式）');
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

      requestAnimationFrame(animateCursor);
    }

    // ─────────────────────────────────────────────
    // 手势检测回调（MediaPipe Hands）
    // ─────────────────────────────────────────────
    function onHandResults(results) {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        // 没有检测到手：恢复默认鼠标模式
        hideCursorUI();
        resetGestureState();
        currentGesture = 'none';
        return;
      }

      showCursorUI();
      const lm = results.multiHandLandmarks[0];

      // 更新光标到食指指尖位置
      const indexTip = lm[8]; // 食指指尖
      targetX = (1 - indexTip.x) * window.innerWidth;
      targetY = indexTip.y * window.innerHeight;

      // 检测当前手势类型
      detectAndApplyGesture(lm);
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
      const pinchThreshold = 0.07; // 归一化距离阈值

      // 食指和中指伸展程度
      const isIndexExt = dist(lm[8], wrist) > dist(lm[5], wrist);
      const isMiddleExt = dist(lm[12], wrist) > dist(lm[10], wrist);

      // 捏合：拇指尖和食指尖距离很小
      if (pinchDist < pinchThreshold && isIndexExt) {
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
    // ─────────────────────────────────────────────
    function handlePinching(lm) {
      const thumbTip = lm[4];
      const indexTip = lm[8];

      if (initialPinchDist === 0) {
        initialPinchDist = dist(thumbTip, indexTip);
        baseScale = currentScale;
        return;
      }

      const currentDist = dist(thumbTip, indexTip);
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
      const moved = Math.hypot(targetX - dwellX, targetY - dwellY);

      if (moved > DWELL_MOVE_THRESHOLD) {
        dwellStartTime = now;
        dwellX = targetX;
        dwellY = targetY;
      }

      if (dwellStartTime > 0 && now - dwellStartTime >= DWELL_TIME) {
        dwellStartTime = now; // 重置，防止重复触发
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

      const elements = document.elementsFromPoint(x, y);
      const target = elements.find(el =>
        el.closest('.hotspot') ||
        el.closest('.timeline-item') ||
        el.closest('.card-close') ||
        el.closest('.scene') ||
        el.closest('#voice-assistant-trigger') ||
        el.closest('#gesture-toggle')
      );

      if (target) {
        const el = target.closest('.hotspot, .timeline-item, .card-close, .scene, #voice-assistant-trigger, #gesture-toggle, .ast-close-btn');
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
        if (isActive && hands && videoEl.readyState >= 2) {
          try { await hands.send({ image: videoEl }); } catch {}
        }
        if (isActive) requestAnimationFrame(loop);
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
      // 外部通知：缩放值重置（场景切换时）
      resetScale: () => { currentScale = 1; baseScale = 1; initialPinchDist = 0; }
    };
  })();
