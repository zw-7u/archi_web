/* ==========================================
   手势交互 · MediaPipe Hands
   P1: 手掌滑动 → 切换时辰（仅手掌有效）
   P2: 握拳 → 画面冻结，光标跟随移动
   P3: 食指指向 → 停留2秒触发点击（含进度圈）
   摄像头预览固定左下角；×仅关摄像头；右上开关完全关闭手势
   ========================================== */

  const Gesture = (() => {
    let isActive = false;
    let hands = null;
    let handsCamera = null;
    let videoEl = null;
    let mediaPipeLoaded = false;
    let isInitializing = false;
    let cameraStream = null;
    let pushVideoEl = null;
    let handoffCameraToMain = false;
    let manualLoopRunning = false;

    // ---- 手势状态机 ----
    let currentGesture = 'none';   // 'none' | 'swiping' | 'fist' | 'pointing'
    let prevGesture = 'none';

    // ---- 光标位置 ----
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let cursorX = targetX;
    let cursorY = targetY;
    const CURSOR_SMOOTH = 0.12;
    const CURSOR_SMOOTH_FIST = 0.25;

    // ---- 滑动检测（仅手掌有效） ----
    let prevPalmX = -1;
    let swipeBuffer = [];
    const SWIPE_THRESHOLD = 0.13;

    // ---- 停留进度点击（2秒） ----
    let dwellAnchorX = 0;
    let dwellAnchorY = 0;
    let dwellStartTs = 0;       // requestAnimationFrame 时间戳
    const DWELL_MS = 2000;
    const DWELL_MOVE_PX = 28;   // 移动超过 28px 重置计时
    let lastClickTs = 0;
    const CLICK_COOLDOWN = 1200;

    // ---- 点击防抖 ----
    let clickAnimTimeout = null;
    let gestureClickProcessed = false;
    const GESTURE_CLICK_DEBOUNCE = 300;

    // CDN
    const MEDIAPIPE_HANDS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
    const CAMERA_UTILS_URL    = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';

    // ─────────────────────────────────────────────
    // 首页推门
    // ─────────────────────────────────────────────
    let pushEnabled = false;
    let pushTriggered = false;
    let pushHandHistory = [];
    const PUSH_HISTORY_FRAMES = 18;
    let pushHintTimeout = null;

    // ─────────────────────────────────────────────
    // 初始化
    // ─────────────────────────────────────────────
    function init() {
      videoEl = document.createElement('video');
      videoEl.id = 'camera-preview';
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      document.body.appendChild(videoEl);

      const toggleBtn = document.getElementById('gesture-toggle');
      if (toggleBtn) toggleBtn.addEventListener('click', toggle);

      buildLandingPushHint();
      initMouseCursor();
      animateCursor();

      console.log('[Gesture] 模块已初始化');
    }

    // ─────────────────────────────────────────────
    // 首页推门提示
    // ─────────────────────────────────────────────
    function buildLandingPushHint() {
      const landing = document.getElementById('landing');
      if (!landing) return;

      // 只保留中央文字+光圈提示（摄像头由左上角 gesture-toggle 统一控制）
      const hint = document.createElement('div');
      hint.id = 'landing-push-hint';
      hint.innerHTML = `
        <div class="push-hint-circle"></div>
        <div class="push-hint-text">将手掌推入<br><span>即可进入</span></div>
      `;
      landing.appendChild(hint);
    }

    // ─────────────────────────────────────────────
    // 请求摄像头并推门（首页由 gesture-toggle 触发）
    // ─────────────────────────────────────────────
    async function requestCameraAndPushDoor() {

      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });

        const hint = document.getElementById('landing-push-hint');
        if (hint) hint.style.display = 'none';

        buildCameraPreview(cameraStream);

        const loaded = await loadMediaPipe();
        if (!loaded) throw new Error('MediaPipe failed');

        // 首页状态：启用推门检测
        if (Gesture.isLandingVisible()) {
          pushEnabled = true;
          pushTriggered = false;
        }

      } catch (err) {
        console.warn('[Gesture] 摄像头启动失败:', err);
      }
    }

    // ─────────────────────────────────────────────
    // 摄像头预览小窗（固定左下角）
    // ─────────────────────────────────────────────
    function buildCameraPreview(stream) {
      const old = document.getElementById('push-preview');
      if (old) old.remove();

      const preview = document.createElement('div');
      preview.id = 'push-preview';
      preview.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 20px;
        right: auto;
        top: auto;
        width: 180px;
        height: 135px;
        border: 1px solid rgba(200, 168, 85, 0.35);
        border-radius: 6px;
        overflow: visible;
        z-index: 9997;
        background: #000;
      `;

      const vid = document.createElement('video');
      vid.srcObject = stream;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.muted = true;
      vid.style.cssText = `
        width: 100%; height: 100%;
        transform: scaleX(-1);
        opacity: 0.45;
        position: absolute;
        top: 0; left: 0;
        border-radius: 5px;
      `;
      preview.appendChild(vid);
      pushVideoEl = vid;

      // 关闭按钮（只关摄像头，不关手势）
      const closeBtn = document.createElement('button');
      closeBtn.className = 'push-preview-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = '关闭摄像头';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeCameraPreview();
      });
      preview.appendChild(closeBtn);

      // 手势提示
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute;
        bottom: 6px; left: 0; right: 0;
        text-align: center;
        font-size: 11px;
        color: rgba(200, 168, 85, 0.75);
        letter-spacing: 0.05em;
        pointer-events: none;
        z-index: 1;
      `;
      label.textContent = '手掌 ← → 切换 · 指向点击';
      preview.appendChild(label);

      document.body.appendChild(preview);
    }

    // 关闭摄像头预览（保留手势，隐藏 UI）
    function closeCameraPreview() {
      const preview = document.getElementById('push-preview');
      if (preview) {
        preview.style.transition = 'opacity 0.3s';
        preview.style.opacity = '0';
        setTimeout(() => preview?.remove(), 320);
      }
      pushVideoEl = null;

      // 隐藏首页文字提示（推门已结束）
      if (Gesture.isLandingVisible()) {
        const hint = document.getElementById('landing-push-hint');
        if (hint) hint.style.display = 'none';
      }
    }

    // 关闭全部手势（含摄像头）
    function closeAll() {
      isActive = false;
      pushEnabled = false;
      pushTriggered = false;
      pushHandHistory = [];
      handoffCameraToMain = false;
      if (pushHintTimeout) clearTimeout(pushHintTimeout);

      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }
      if (handsCamera) { handsCamera.stop(); handsCamera = null; }

      videoEl.style.display = 'none';
      if (videoEl.srcObject) { videoEl.srcObject = null; }

      const preview = document.getElementById('push-preview');
      if (preview) preview.remove();
      pushVideoEl = null;

      document.getElementById('gesture-toggle')?.classList.remove('active');
      resetGestureState();
      updateGestureStatus('手势控制已关闭');
      hideCursorUI();
    }

    // ─────────────────────────────────────────────
    // 手势结果回调
    // ─────────────────────────────────────────────
    function onHandResults(results) {
      if (pushEnabled && !pushTriggered) {
        detectPushDoor(results);
      }

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        hideCursorUI();
        resetGestureState();
        currentGesture = 'none';
        return;
      }

      if (!isActive) return;

      showCursorUI();
      const lm = results.multiHandLandmarks[0];
      const indexTip = lm[8];
      targetX = (1 - indexTip.x) * window.innerWidth;
      targetY = indexTip.y * window.innerHeight;

      detectAndApplyGesture(lm);
    }

    // ─────────────────────────────────────────────
    // 推门检测
    // ─────────────────────────────────────────────
    function detectPushDoor(results) {
      if (!results.multiHandLandmarks) return;
      const hands = results.multiHandLandmarks;
      const now = Date.now();

      for (const lm of hands) {
        const palm = lm[9];
        const mirroredX = 1 - palm.x;

        pushHandHistory.push({ x: mirroredX, y: palm.y, z: palm.z || 0, time: now });
        if (pushHandHistory.length > PUSH_HISTORY_FRAMES) pushHandHistory.shift();

        if (pushHandHistory.length < 10) continue;

        const first = pushHandHistory[0];
        const last = pushHandHistory[pushHandHistory.length - 1];
        const dt = (now - first.time) / 1000;
        if (dt < 0.3) continue;

        const dx = last.x - first.x;
        if (first.x < 0.4 && dx > 0.3) {
          triggerPushDoor();
          return;
        }
      }
    }

    function triggerPushDoor() {
      if (pushTriggered) return;
      pushTriggered = true;

      if (pushHintTimeout) clearTimeout(pushHintTimeout);

      const hint = document.getElementById('push-hint');
      if (hint) hint.textContent = '叩门而入';

      // 摄像头流交给主场景 videoEl，立即移除推门预览（避免两窗重叠）
      if (cameraStream && videoEl) {
        videoEl.srcObject = cameraStream;
        videoEl.style.display = 'block';
        videoEl.style.opacity = '0.4';
        videoEl.style.zIndex = '9998';
        videoEl.play().catch(() => {});
      }

      if (handsCamera) { handsCamera.stop(); handsCamera = null; }

      // 立即清理推门相关状态
      isActive = true;
      pushEnabled = false;
      pushTriggered = false;
      pushHandHistory = [];
      if (pushHintTimeout) clearTimeout(pushHintTimeout);

      // 立即移除推门预览（videoEl 已接管网关）
      const oldPreview = document.getElementById('push-preview');
      if (oldPreview) oldPreview.remove();
      pushVideoEl = null;

      handoffCameraToMain = true;
      document.getElementById('gesture-toggle')?.classList.add('active');
      updateGestureStatus('手势控制已开启');

      if (typeof Landing !== 'undefined' && Landing.dissolve) {
        Landing.dissolve();
      }
    }

    // ─────────────────────────────────────────────
    // 鼠标跟随
    // ─────────────────────────────────────────────
    function initMouseCursor() {
      document.body.classList.add('mouse-cursor-active');
      document.body.style.cursor = 'none';

      document.addEventListener('mousemove', (e) => {
        if (Gesture.isLandingVisible()) {
          document.body.style.cursor = '';
          return;
        }
        document.body.style.cursor = 'none';
        targetX = e.clientX;
        targetY = e.clientY;
      });

      document.addEventListener('mouseenter', () => {
        document.body.style.cursor = Gesture.isLandingVisible() ? '' : 'none';
      });

      document.addEventListener('click', (e) => {
        if (Gesture.isLandingVisible()) return;
        if (gestureClickProcessed) return;
        targetX = e.clientX;
        targetY = e.clientY;
        cursorX = e.clientX;
        cursorY = e.clientY;
        performClick(e.clientX, e.clientY);
      });
    }

    function showCursorUI() {
      document.getElementById('gesture-cursor')?.classList.add('visible');
    }

    function hideCursorUI() {
      const c = document.getElementById('gesture-cursor');
      if (c) c.classList.remove('visible');
      clearDwellProgress();
    }

    // ─────────────────────────────────────────────
    // 光标动画循环
    // ─────────────────────────────────────────────
    function animateCursor() {
      const smooth = currentGesture === 'fist' ? CURSOR_SMOOTH_FIST : CURSOR_SMOOTH;
      cursorX += (targetX - cursorX) * smooth;
      cursorY += (targetY - cursorY) * smooth;

      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.style.left = cursorX + 'px';
        cursor.style.top  = cursorY + 'px';
      }

      detectHotspotHover(cursorX, cursorY);

      // 更新停留进度（仅指向手势时）
      if (currentGesture === 'pointing') {
        updateDwellProgress();
      } else {
        clearDwellProgress();
      }

      requestAnimationFrame(animateCursor);
    }

    let lastHoveredEl = null;

    function detectHotspotHover(x, y) {
      const elements = document.elementsFromPoint(x, y);

      const hotspotEl = elements.find(el => el.classList.contains('hotspot') || el.closest('.hotspot'));
      const timelineEl = elements.find(el => el.classList.contains('timeline-item') || el.closest('.timeline-item'));
      const aiBtnEl = elements.find(el =>
        el.closest('#ast-send') || el.closest('#ast-mic') || el.closest('#ast-close') ||
        el.closest('.ast-send-btn') || el.closest('.ast-close-btn')
      );
      const closeBtnEl = elements.find(el =>
        el.closest('.push-preview-close') || el.id === 'gesture-toggle' ||
        el.closest('#gesture-toggle')
      );

      const targetEl = hotspotEl
        ? (hotspotEl.classList.contains('hotspot') ? hotspotEl : hotspotEl.closest('.hotspot'))
        : (timelineEl
            ? (timelineEl.classList.contains('timeline-item') ? timelineEl : timelineEl.closest('.timeline-item'))
            : (aiBtnEl
                ? (aiBtnEl.closest('.ast-send-btn, .ast-close-btn') || aiBtnEl)
                : (closeBtnEl ? (closeBtnEl.closest('button') || closeBtnEl) : null)));

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
    // 停留进度圈（2秒，SVG ring）
    // ─────────────────────────────────────────────
    function updateDwellProgress() {
      const now = performance.now();

      if (dwellStartTs === 0) {
        dwellStartTs = now;
        dwellAnchorX = targetX;
        dwellAnchorY = targetY;
        // 确保 DOM 有 SVG ring
        ensureDwellRing();
      }

      const moved = Math.hypot(targetX - dwellAnchorX, targetY - dwellAnchorY);
      if (moved > DWELL_MOVE_PX) {
        dwellStartTs = now;
        dwellAnchorX = targetX;
        dwellAnchorY = targetY;
        clearDwellProgress();
        return;
      }

      const elapsed = now - dwellStartTs;
      const progress = Math.min(1, elapsed / DWELL_MS);

      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.classList.add('dwell-active');
        // stroke-dashoffset：周长 2π·20 ≈ 125.6，progress=1 时 offset=0（填满）
        const circumference = 2 * Math.PI * 20;
        const dashOffset = circumference * (1 - progress);
        const ring = cursor.querySelector('.dwell-ring circle');
        if (ring) {
          ring.style.strokeDashoffset = dashOffset;
        }
      }

      if (progress >= 1 && now - lastClickTs >= CLICK_COOLDOWN) {
        lastClickTs = now;
        dwellStartTs = 0;
        clearDwellProgress();
        performClick(targetX, targetY);
      }
    }

    function clearDwellProgress() {
      dwellStartTs = 0;
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.classList.remove('dwell-active');
        const ring = cursor.querySelector('.dwell-ring circle');
        if (ring) ring.style.strokeDashoffset = 2 * Math.PI * 20; // 重置为全空
      }
    }

    function ensureDwellRing() {
      const cursor = document.getElementById('gesture-cursor');
      if (!cursor) return;
      if (cursor.querySelector('.dwell-ring')) return;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'dwell-ring');
      svg.setAttribute('viewBox', '0 0 50 50');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '25');
      circle.setAttribute('cy', '25');
      circle.setAttribute('r', '20');
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', 'rgba(90,138,106,0.85)');
      circle.setAttribute('stroke-width', '2.5');
      circle.setAttribute('stroke-linecap', 'round');
      const circumference = 2 * Math.PI * 20;
      circle.setAttribute('stroke-dasharray', circumference);
      circle.setAttribute('stroke-dashoffset', circumference);
      svg.appendChild(circle);
      cursor.appendChild(svg);
    }

    // ─────────────────────────────────────────────
    // 手势分类与处理
    // ─────────────────────────────────────────────
    function detectAndApplyGesture(lm) {
      const gesture = classifyGesture(lm);

      if (gesture !== prevGesture) {
        // 切换到手势时：清空滑动缓冲，避免手掌快速收回再伸出误触发
        if (gesture !== 'swiping') {
          swipeBuffer = [];
          prevPalmX = -1;
        }
        onGestureChange(gesture, prevGesture);
        prevGesture = gesture;
      }

      currentGesture = gesture;

      // 只有手掌才处理滑动切换
      if (gesture === 'swiping') {
        handleSwiping(lm);
      } else if (gesture === 'fist') {
        handleFist(lm);
      } else if (gesture === 'pointing') {
        // 停留进度在 animateCursor 中处理，此处无需额外操作
      }
    }

    function classifyGesture(lm) {
      const wrist = lm[0];

      const isIndexClosed   = dist(lm[8],  wrist) < dist(lm[6],  wrist) * 1.1;
      const isMiddleClosed = dist(lm[12], wrist) < dist(lm[10], wrist) * 1.1;
      const isRingClosed   = dist(lm[16], wrist) < dist(lm[14], wrist) * 1.1;
      const isPinkyClosed  = dist(lm[20], wrist) < dist(lm[18], wrist) * 1.1;

      if (isIndexClosed && isMiddleClosed && isRingClosed && isPinkyClosed) {
        const isIndexExtended = dist(lm[8], wrist) > dist(lm[5], wrist) * 1.2;
        return isIndexExtended ? 'pointing' : 'fist';
      }

      return 'swiping';
    }

    function onGestureChange(newG, oldG) {
      const cursor = document.getElementById('gesture-cursor');
      const indicator = document.getElementById('gesture-indicator');

      if (clickAnimTimeout) { clearTimeout(clickAnimTimeout); clickAnimTimeout = null; }
      if (cursor) cursor.classList.remove('clicking', 'fist', 'pointing', 'dwell-active');
      // 清空停留进度
      clearDwellProgress();

      switch (newG) {
        case 'fist':
          if (cursor) {
            cursor.style.width = '22px';
            cursor.style.height = '22px';
            cursor.classList.add('fist');
          }
          if (indicator) updateGestureStatus('握拳 · 移动光标');
          Scenes.freeze(true);
          break;
        case 'pointing':
          if (cursor) {
            cursor.style.width = '18px';
            cursor.style.height = '18px';
            cursor.classList.add('pointing');
          }
          if (indicator) updateGestureStatus('指向 · 停留2秒点击');
          Scenes.freeze(false);
          break;
        case 'swiping':
          if (cursor) {
            cursor.style.width = '26px';
            cursor.style.height = '26px';
            cursor.classList.remove('fist', 'pointing');
          }
          if (indicator) updateGestureStatus('手掌 · 左右滑动切换');
          Scenes.freeze(false);
          break;
      }
    }

    // ─────────────────────────────────────────────
    // 滑动 → 切换时辰（仅手掌）
    // ─────────────────────────────────────────────
    function handleSwiping(lm) {
      const palm = lm[9];
      const x = 1 - palm.x;

      if (prevPalmX < 0) { prevPalmX = x; return; }
      const dx = x - prevPalmX;
      prevPalmX = x;

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
    // 握拳 → 冻结
    // ─────────────────────────────────────────────
    function handleFist(lm) {
      Scenes.freeze(true);
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

      gestureClickProcessed = true;
      setTimeout(() => { gestureClickProcessed = false; }, GESTURE_CLICK_DEBOUNCE);

      const elements = document.elementsFromPoint(x, y);

      const target = elements.find(el =>
        el.closest('.hotspot') ||
        el.closest('.timeline-item') ||
        el.closest('.card-close') ||
        el.closest('.scene') ||
        el.closest('#voice-assistant-trigger') ||
        el.closest('#gesture-toggle') ||
        el.closest('#ast-send') ||
        el.closest('#ast-mic') ||
        el.closest('#ast-close') ||
        el.closest('.ast-voice-btn') ||
        el.closest('.push-preview-close')
      );

      if (target) {
        if (target.closest('#ast-send')) {
          const btn = document.getElementById('ast-send');
          if (btn && btn.disabled) btn.disabled = false;
        }
        const el = target.tagName === 'BUTTON' || target.tagName === 'INPUT'
          ? target
          : target.closest('button, input, [role="button"]');
        if (el) el.click();
      }
    }

    // ─────────────────────────────────────────────
    // 工具
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
      dwellStartTs = 0;
      currentGesture = 'none';
      prevGesture = 'none';
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.classList.remove('fist', 'pointing', 'clicking', 'dwell-active');
      }
      clearDwellProgress();
      Scenes.freeze(false);
    }

    function updateGestureStatus(text) {
      const status = document.getElementById('gesture-status');
      const label = status?.querySelector('.gesture-label');
      if (label) label.textContent = text;
      if (status) status.classList.add('visible');
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
    // MediaPipe Hands
    // ─────────────────────────────────────────────
    async function startCamera() {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        videoEl.srcObject = cameraStream;
        videoEl.style.display = 'block';
        videoEl.style.opacity = '0.4';
        videoEl.style.zIndex = '9998';

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
        console.warn('[Gesture] 摄像头启动失败:', err);
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

      if (hands && typeof hands.close === 'function') {
        try { hands.close(); } catch (e) {}
      }

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

      if (handsCamera) { handsCamera.stop(); handsCamera = null; }
      startManualFrameLoop();
    }

    function getHandFrameSource() {
      if (pushEnabled && pushVideoEl && pushVideoEl.readyState >= 2) return pushVideoEl;
      if (isActive && videoEl && videoEl.readyState >= 2) return videoEl;
      return null;
    }

    function startManualFrameLoop() {
      if (manualLoopRunning) return;
      manualLoopRunning = true;

      const tick = async () => {
        const feed = getHandFrameSource();
        if ((isActive || pushEnabled) && hands && feed) {
          try { await hands.send({ image: feed }); } catch {}
        }
        if (isActive || pushEnabled) {
          requestAnimationFrame(tick);
        } else {
          manualLoopRunning = false;
        }
      };
      requestAnimationFrame(tick);
    }

    function setupFallback() {
      console.log('[Gesture] 使用鼠标模拟模式');
    }

    // ─────────────────────────────────────────────
    // 开关控制（左上角按钮）
    // 首页：开启摄像头推门；主场景：开启/关闭手势
    // ─────────────────────────────────────────────
    async function toggle() {
      if (isActive || pushEnabled) {
        closeAll();
      } else if (Gesture.isLandingVisible()) {
        // 首页：请求摄像头并启用推门检测
        await requestCameraAndPushDoor();
      } else {
        // 主场景：开启摄像头手势
        const ok = await startCamera();
        if (ok) {
          isActive = true;
          buildCameraPreview(cameraStream);
        }
      }
    }

    // ─────────────────────────────────────────────
    // 首页推门清理
    // ─────────────────────────────────────────────
    function resetPushDoor() {
      pushEnabled = false;
      pushTriggered = false;
      pushHandHistory = [];
      pushVideoEl = null;
      if (pushHintTimeout) clearTimeout(pushHintTimeout);

      const preview = document.getElementById('push-preview');
      if (preview) preview.remove();

      const hint = document.getElementById('landing-push-hint');
      if (hint) hint.style.display = 'none';

      if (handoffCameraToMain) {
        handoffCameraToMain = false;
        return;
      }

      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }
    }

    // ─────────────────────────────────────────────
    // 公开接口
    // ─────────────────────────────────────────────
    return {
      init,
      toggle,
      isActive: () => isActive,
      isLandingVisible: () => {
        const l = document.getElementById('landing');
        return l && !l.classList.contains('gone') && l.style.display !== 'none';
      },
      resetPushDoor,
      closeAll
    };
  })();
