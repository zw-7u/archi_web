/* ==========================================
   手势交互 · MediaPipe Hands
   P1: 手掌左右滑动 → 切换时辰
   P2: 握拳 → 画面冻结，光标跟随食指移动，停留触发点击
   P3: 食指指向 → 光标跟随食指移动，停留触发悬停/点击
   ========================================== */

  const Gesture = (() => {
    let isActive = false;
    let hands = null;
    let handsCamera = null;
    let videoEl = null;
    let mediaPipeLoaded = false;
    let isInitializing = false;
    let cameraStream = null;     // 记录当前摄像头流，便于关闭
    let pushVideoEl = null;      // 首页推门预览内的 <video>，MediaPipe 取帧用
    let handoffCameraToMain = false; // 推门进入后主场景继续用同一路摄像头
    let manualLoopRunning = false;

    // ---- 手势状态机 ----
    // 'none' | 'swiping' | 'fist' | 'pointing'
    let currentGesture = 'none';
    let prevGesture = 'none';

    // 光标位置（平滑插值）
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let cursorX = targetX;
    let cursorY = targetY;
    const CURSOR_SMOOTH = 0.12;
    const CURSOR_SMOOTH_FIST = 0.25;

    // 上一帧手掌位置（用于检测滑动方向）
    let prevPalmX = -1;
    let prevPalmY = -1;

    // 挥动检测
    let swipeBuffer = [];
    let lastSwipeTime = 0;
    const SWIPE_THRESHOLD = 0.13;

    // 握拳停留点击
    let dwellStartTime = 0;
    let dwellX = 0, dwellY = 0;
    const DWELL_TIME = 600;
    const DWELL_MOVE_THRESHOLD = 25;
    let lastClickTime = 0;
    const CLICK_COOLDOWN = 1200;

    // 点击效果动画
    let clickAnimTimeout = null;
    let gestureClickProcessed = false;
    const GESTURE_CLICK_DEBOUNCE = 300;

    // CDN
    const MEDIAPIPE_HANDS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
    const CAMERA_UTILS_URL    = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';

    // ─────────────────────────────────────────────
    // 首页推门手势状态
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

      console.log('[Gesture] 模块已初始化（鼠标跟随模式）');
    }

    // ─────────────────────────────────────────────
    // 首页推门文字提示（非按钮）
    // ─────────────────────────────────────────────
    function buildLandingPushHint() {
      const landing = document.getElementById('landing');
      if (!landing) return;

      // 摄像头开关按钮（小的，用户可自由选择是否开启）
      const camBtn = document.createElement('button');
      camBtn.id = 'landing-camera-btn';
      camBtn.className = 'landing-camera-btn';
      camBtn.setAttribute('title', '开启手势推门');
      camBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path d="M15 3a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2V5a2 2 0 012-2h6zM9 7a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V9M12 14v7M8 18h8"/>
        </svg>
      `;
      camBtn.addEventListener('click', requestCameraAndPushDoor);
      landing.appendChild(camBtn);

      // 文字+光圈提示（中央）
      const hint = document.createElement('div');
      hint.id = 'landing-push-hint';
      hint.innerHTML = `
        <div class="push-hint-circle"></div>
        <div class="push-hint-text">将手掌推入<br><span>即可进入</span></div>
      `;
      landing.appendChild(hint);
    }

    // ─────────────────────────────────────────────
    // 请求摄像头并启用推门手势
    // ─────────────────────────────────────────────
    async function requestCameraAndPushDoor() {
      const camBtn = document.getElementById('landing-camera-btn');
      if (camBtn) camBtn.disabled = true;

      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });

        if (camBtn) camBtn.style.display = 'none';

        // 隐藏中央文字提示
        const hint = document.getElementById('landing-push-hint');
        if (hint) hint.style.display = 'none';

        buildCameraPreview(cameraStream);

        const loaded = await loadMediaPipe();
        if (!loaded) throw new Error('MediaPipe failed');

        pushEnabled = true;
        pushTriggered = false;
        // loadMediaPipe → setupHands 内会启动帧循环

      } catch (err) {
        console.warn('[Gesture] 摄像头/手势启动失败:', err);
        if (camBtn) {
          camBtn.disabled = false;
          camBtn.textContent = '摄像头不可用';
        }
      }
    }

    // ─────────────────────────────────────────────
    // 创建摄像头预览小窗（可关闭）
    // ─────────────────────────────────────────────
    function buildCameraPreview(stream) {
      // 移除旧的
      const old = document.getElementById('push-preview');
      if (old) old.remove();

      const preview = document.createElement('div');
      preview.id = 'push-preview';
      preview.style.cssText = `
        position: fixed;
        top: 72px;
        left: 20px;
        right: auto;
        width: 180px;
        height: 135px;
        border: 1px solid rgba(200, 168, 85, 0.35);
        border-radius: 6px;
        overflow: hidden;
        z-index: 1010;
        background: #000;
      `;

      const vid = document.createElement('video');
      vid.srcObject = stream;
      vid.autoplay = true;
      vid.playsInline = true;
      vid.muted = true;
      vid.style.cssText = 'width:100%;height:100%;transform:scaleX(-1);opacity:0.5;position:absolute;top:0;left:0;';
      preview.appendChild(vid);

      // 关闭按钮
      const closeBtn = document.createElement('button');
      closeBtn.className = 'push-preview-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = '关闭摄像头';
      closeBtn.addEventListener('click', closePushPreview);
      preview.appendChild(closeBtn);

      // 提示文字
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute;
        bottom: 6px; left: 0; right: 0;
        text-align: center;
        font-size: 11px;
        color: rgba(200, 168, 85, 0.8);
        letter-spacing: 0.05em;
        pointer-events: none;
        z-index: 1;
      `;
      label.textContent = '手掌推入 → 进入';
      label.id = 'push-hint';
      preview.appendChild(label);

      pushVideoEl = vid;
      document.body.appendChild(preview);
    }

    function closePushPreview() {
      pushEnabled = false;
      pushTriggered = false;
      pushHandHistory = [];
      if (pushHintTimeout) clearTimeout(pushHintTimeout);

      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }

      const preview = document.getElementById('push-preview');
      if (preview) preview.remove();
      pushVideoEl = null;

      // 恢复中央文字提示和摄像头按钮
      const hint = document.getElementById('landing-push-hint');
      if (hint) hint.style.display = '';

      const camBtn = document.getElementById('landing-camera-btn');
      if (camBtn) {
        camBtn.style.display = '';
        camBtn.disabled = false;
      }
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
    // 推门手势检测
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
        const enterFromSide = first.x < 0.4 && dx > 0.25;

        if (enterFromSide && dx > 0.3) {
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

      // 不停止摄像头：将流交给主场景 videoEl，推门进入后仍可手势操作
      if (cameraStream && videoEl) {
        videoEl.srcObject = cameraStream;
        videoEl.style.display = 'block';
        videoEl.style.opacity = '0.4';
        videoEl.style.zIndex = '9998';
        videoEl.play().catch(() => {});
      }

      if (handsCamera) {
        handsCamera.stop();
        handsCamera = null;
      }

      // 先开启主场景手势再关 push，避免 rAF 循环中途停下
      isActive = true;
      pushEnabled = false;
      pushVideoEl = null;

      handoffCameraToMain = true;
      document.getElementById('gesture-toggle')?.classList.add('active');
      updateGestureStatus('手势控制已开启');

      setTimeout(() => {
        const preview = document.getElementById('push-preview');
        if (preview) {
          preview.style.transition = 'opacity 0.4s';
          preview.style.opacity = '0';
          setTimeout(() => preview?.remove(), 400);
        }
      }, 300);

      if (typeof Landing !== 'undefined' && Landing.dissolve) {
        Landing.dissolve();
      }
    }

    // ─────────────────────────────────────────────
    // 鼠标跟随模式
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
        if (Gesture.isLandingVisible()) {
          document.body.style.cursor = '';
        } else {
          document.body.style.cursor = 'none';
        }
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

    // ─────────────────────────────────────────────
    // 显示/隐藏光标
    // ─────────────────────────────────────────────
    function showCursorUI() {
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) cursor.classList.add('visible');
    }

    function hideCursorUI() {
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) cursor.classList.remove('visible');
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
        case 'fist':
          handleFist(lm);
          break;
        case 'pointing':
          handlePointing(lm);
          break;
      }
    }

    function classifyGesture(lm) {
      const wrist = lm[0];

      const isIndexClosed   = dist(lm[8], wrist)  < dist(lm[6], wrist)  * 1.1;
      const isMiddleClosed  = dist(lm[12], wrist) < dist(lm[10], wrist) * 1.1;
      const isRingClosed    = dist(lm[16], wrist) < dist(lm[14], wrist) * 1.1;
      const isPinkyClosed    = dist(lm[20], wrist) < dist(lm[18], wrist) * 1.1;

      if (isIndexClosed && isMiddleClosed && isRingClosed && isPinkyClosed) {
        const isIndexExtended = dist(lm[8], wrist) > dist(lm[5], wrist) * 1.2;
        if (isIndexExtended) return 'pointing';
        return 'fist';
      }

      return 'swiping';
    }

    function onGestureChange(newG, oldG) {
      const cursor = document.getElementById('gesture-cursor');
      const indicator = document.getElementById('gesture-indicator');

      if (clickAnimTimeout) { clearTimeout(clickAnimTimeout); clickAnimTimeout = null; }
      if (cursor) cursor.classList.remove('clicking', 'pointing');

      dwellStartTime = 0;

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
          if (indicator) updateGestureStatus('食指 · 点击热区');
          Scenes.freeze(false);
          dwellStartTime = Date.now();
          dwellX = targetX;
          dwellY = targetY;
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
    // P1: 滑动 → 切换时辰
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
    // P2: 握拳 → 画面冻结
    // ─────────────────────────────────────────────
    function handleFist(lm) {
      Scenes.freeze(true);
    }

    // ─────────────────────────────────────────────
    // P3: 食指指向 → 停留点击
    // ─────────────────────────────────────────────
    function handlePointing(lm) {
      Scenes.freeze(false);

      const now = Date.now();
      const moved = Math.hypot(targetX - dwellX, targetY - dwellY);

      if (moved > DWELL_MOVE_THRESHOLD) {
        dwellStartTime = now;
        dwellX = targetX;
        dwellY = targetY;
      } else if (dwellStartTime > 0 && now - dwellStartTime >= DWELL_TIME && now - lastClickTime >= CLICK_COOLDOWN) {
        lastClickTime = now;
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
        el.closest('.gesture-toggle') ||
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
      dwellStartTime = 0;
      currentGesture = 'none';
      prevGesture = 'none';
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.classList.remove('fist', 'pointing', 'clicking');
      }
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

      if (handsCamera) {
        handsCamera.stop();
        handsCamera = null;
      }

      // 统一用手动 rAF 循环：首页用 push 预览 video，主场景用 videoEl
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
    // 开关控制（主场景手势）
    // ─────────────────────────────────────────────
    async function toggle() {
      const btn = document.getElementById('gesture-toggle');

      if (isActive) {
        isActive = false;
        btn?.classList.remove('active');
        if (handsCamera) { handsCamera.stop(); handsCamera = null; }
        if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
          cameraStream = null;
        }
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
    // 首页推门重置（进入主场景时调用）
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

      const camBtn = document.getElementById('landing-camera-btn');
      if (camBtn) camBtn.style.display = 'none';

      // 推门进入且已把流交给主场景时，不要在这里关掉摄像头
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
      closeCamera: () => {
        if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
          cameraStream = null;
        }
      }
    };
  })();
