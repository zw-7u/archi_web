/* ==========================================
   手势交互 · MediaPipe Hands
   P1: 手掌滑动 → 切换时辰（仅手掌有效）
   P2: 握拳 → 画面冻结，光标跟随移动
   P3: 食指指向 → 停留2秒触发点击（含进度圈）
   首页：点击直接进入；摄像头由左上角按钮在主场景中开启
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
    let manualLoopRunning = false;
    let gestureStatusHideTimer = null;

    // ---- 手势状态机 ----
    let currentGesture = 'none';   // 'none' | 'swiping' | 'fist' | 'pointing'
    let prevGesture = 'none';

    // ---- 手势分类防抖（连续 3 帧 raw 状态一致才更新稳定态）----
    let stableHandState = 'palm'; // 'fist' | 'pointing' | 'palm' | 'unknown'
    let debouncePending = null;
    let debounceCount = 0;

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

    // ---- 长按检测（握拳超过1.5秒触发）----
    let fistStartTs = 0;
    const LONG_PRESS_MS = 1500;
    let longPressFired = false;

    // ---- 双击检测（两指点按）----
    let lastTwoFingerTs = 0;
    const DOUBLE_TAP_MS = 400;

    // ---- 捏合缩放检测 ----
    let lastPinchDist = 0;
    let pinchScale = 1;

    // CDN
    const MEDIAPIPE_HANDS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
    const CAMERA_UTILS_URL    = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';

    // ─────────────────────────────────────────────
    // 初始化
    // ─────────────────────────────────────────────
    function init() {
      videoEl = document.createElement('video');
      videoEl.id = 'camera-preview';
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      // 不拦截点击：否则 #camera-preview z-index 高于左下小窗，× 无法点到
      videoEl.style.pointerEvents = 'none';
      document.body.appendChild(videoEl);

      const toggleBtn = document.getElementById('gesture-toggle');
      if (toggleBtn) toggleBtn.addEventListener('click', toggle);

      initMouseCursor();
      animateCursor();

      console.log('[Gesture] 模块已初始化');
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
        pointer-events: none;
      `;
      preview.appendChild(vid);
      pushVideoEl = vid;

      // 关闭按钮（只关摄像头，不关手势）
      const closeBtn = document.createElement('button');
      closeBtn.className = 'push-preview-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = '关闭预览';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // 仅关闭小屏预览 UI，摄像头继续运行供手势追踪
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
      label.textContent = '手掌←→滑动 · 指向点击 · 双指双击 · 捏合缩放';
      preview.appendChild(label);
      // 提示文案仅显示 1 秒后淡出
      setTimeout(() => {
        label.style.transition = 'opacity 0.35s ease';
        label.style.opacity = '0';
        setTimeout(() => label.remove(), 400);
      }, 1000);

      document.body.appendChild(preview);
    }

    // 关闭摄像头预览小窗（仅删除 UI；完整关闭请用 deactivateGesture）
    function closeCameraPreview() {
      const preview = document.getElementById('push-preview');
      if (preview) preview.remove();
      pushVideoEl = null;
    }

    // 与右上角「关闭」一致：停流、关 MediaPipe、同步按钮态
    function deactivateGesture() {
      if (!isActive) return;
      closeAll();
      document.getElementById('gesture-toggle')?.classList.remove('active');
      updateGestureStatus('手势控制已关闭');
    }

    // 关闭全部手势（含摄像头）
    function closeAll() {
      isActive = false;

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

      // closeAll() 只负责关闭硬件资源；按钮 class 由调用者（toggle）统一管理
      resetGestureState();
      hideCursorUI();
    }

    // ─────────────────────────────────────────────
    // 手势结果回调
    // ─────────────────────────────────────────────
    function onHandResults(results) {
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
        // 主场景：勿对右上工具栏再 performClick，否则会二次 el.click() 导致 toggle 连点两次
        if (e.target.closest('.top-toolbar')) return;
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
      // 新模块：建筑档案
      const archiveEl = elements.find(el =>
        el.classList.contains('building-marker') || el.closest('.building-marker') ||
        el.classList.contains('archive-card') || el.closest('.archive-card') ||
        el.classList.contains('tab-btn') || el.closest('.tab-btn')
      );
      // 新模块：重点解读
      const compEl = elements.find(el =>
        el.classList.contains('comp-btn') || el.closest('.comp-btn') ||
        el.classList.contains('game-btn') || el.closest('.game-btn')
      );
      // 新模块：文化密码
      const cultureEl = elements.find(el =>
        el.classList.contains('culture-nav-item') || el.closest('.culture-nav-item') ||
        el.classList.contains('culture-section') || el.closest('.culture-section')
      );

      const targetEl = hotspotEl
        ? (hotspotEl.classList.contains('hotspot') ? hotspotEl : hotspotEl.closest('.hotspot'))
        : (timelineEl
            ? (timelineEl.classList.contains('timeline-item') ? timelineEl : timelineEl.closest('.timeline-item'))
            : (aiBtnEl
                ? (aiBtnEl.closest('.ast-send-btn, .ast-close-btn') || aiBtnEl)
                : (closeBtnEl
                    ? (closeBtnEl.closest('button') || closeBtnEl)
                    : (archiveEl
                        ? (archiveEl.closest('.building-marker, .archive-card, .tab-btn') || archiveEl)
                        : (compEl
                            ? (compEl.closest('.comp-btn, .game-btn') || compEl)
                            : (cultureEl
                                ? (cultureEl.closest('.culture-nav-item, .culture-section') || cultureEl)
                                : null))))));

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
        // 长按检测：握拳超过1.5秒触发拖拽模式
        if (fistStartTs > 0 && !longPressFired) {
          const elapsed = performance.now() - fistStartTs;
          if (elapsed >= LONG_PRESS_MS) {
            longPressFired = true;
            document.dispatchEvent(new CustomEvent('gesture-long-press', {
              detail: { x: targetX, y: targetY }
            }));
            updateGestureStatus('拖拽模式已激活');
          }
        }
      } else if (gesture === 'two-open') {
        // 双指点击
        if (detectTwoFingerTap(lm)) {
          document.dispatchEvent(new CustomEvent('gesture-double-click', {
            detail: { x: targetX, y: targetY }
          }));
          updateGestureStatus('双击');
        }
      } else if (gesture === 'pointing') {
        // 停留进度在 animateCursor 中处理，此处无需额外操作
      }

      // 捏合缩放（任何手势均可）
      const pinchRatio = detectPinchSpread(lm);
      if (pinchRatio !== 1) {
        document.dispatchEvent(new CustomEvent('gesture-zoom', {
          detail: { scale: pinchRatio, x: targetX, y: targetY }
        }));
      }
    }

    /**
     * 基于 MediaPipe Hands 21 点判定单帧手势（无防抖）。
     * @param {Array<{x:number,y:number,z?:number}>} landmarks
     * @returns {{ state: 'fist'|'pointing'|'palm'|'pinch'|'spread'|'unknown', fingers: boolean[] }}
     *   fingers 顺序：[thumb, index, middle, ring, pinky]
     */
    function detectHandState(landmarks) {
      if (!landmarks || landmarks.length < 21) {
        return { state: 'unknown', fingers: [false, false, false, false, false] };
      }
      const wrist = landmarks[0];
      const pinkyMcp = landmarks[17];

      const indexExt = dist(landmarks[8], wrist) > dist(landmarks[6], wrist);
      const middleExt = dist(landmarks[12], wrist) > dist(landmarks[10], wrist);
      const ringExt = dist(landmarks[16], wrist) > dist(landmarks[14], wrist);
      const pinkyExt = dist(landmarks[20], wrist) > dist(landmarks[18], wrist);
      const thumbExt = dist(landmarks[4], pinkyMcp) > dist(landmarks[3], pinkyMcp);

      const fingers = [thumbExt, indexExt, middleExt, ringExt, pinkyExt];
      const nExt = fingers.filter(Boolean).length;

      const allBent = !thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt;
      if (allBent) {
        return { state: 'fist', fingers };
      }

      // 单食指伸出（指向）
      if (indexExt && !middleExt && !ringExt && !pinkyExt && !thumbExt) {
        return { state: 'pointing', fingers };
      }

      // 两指张开（食指+中指，用于双指点击）
      if (indexExt && middleExt && !ringExt && !pinkyExt) {
        return { state: 'two-open', fingers };
      }

      // 五指张开（手掌）
      if (nExt >= 4) {
        return { state: 'palm', fingers };
      }

      // 三指张开（展开）
      if (nExt >= 3) {
        return { state: 'spread', fingers };
      }

      return { state: 'unknown', fingers };
    }

    /**
     * 检测捏合手势（拇指+食指靠近）
     * 返回缩放比例变化（>1 = 张开放大，<1 = 捏合缩小）
     */
    function detectPinchSpread(landmarks) {
      const thumb = landmarks[4];
      const index = landmarks[8];
      const mid = landmarks[12];
      const currentDist = dist(thumb, index);
      const midDist = dist(thumb, mid);

      if (lastPinchDist === 0) {
        lastPinchDist = currentDist;
        return 1;
      }

      const ratio = currentDist / lastPinchDist;
      lastPinchDist = currentDist;

      if (ratio > 1.05) return 1.05;
      if (ratio < 0.95) return 0.95;
      return 1;
    }

    /**
     * 检测双指点击（两指同时点击屏幕）
     */
    function detectTwoFingerTap(landmarks) {
      const index = landmarks[8];
      const middle = landmarks[12];
      const indexUp = dist(index, landmarks[0]) > dist(landmarks[6], landmarks[0]);
      const middleUp = dist(middle, landmarks[0]) > dist(landmarks[10], landmarks[0]);

      const now = performance.now();
      if (indexUp && middleUp) {
        if (now - lastTwoFingerTs < DOUBLE_TAP_MS) {
          lastTwoFingerTs = 0;
          return true;
        }
        lastTwoFingerTs = now;
      }
      return false;
    }

    function applyStableHandState(rawState) {
      if (rawState === stableHandState) {
        debouncePending = null;
        debounceCount = 0;
        return stableHandState;
      }
      if (rawState === debouncePending) {
        debounceCount++;
      } else {
        debouncePending = rawState;
        debounceCount = 1;
      }
      if (debounceCount >= 3) {
        stableHandState = rawState;
        debouncePending = null;
        debounceCount = 0;
      }
      return stableHandState;
    }

    function mapStableStateToGesture(stable) {
      if (stable === 'fist') return 'fist';
      if (stable === 'pointing') return 'pointing';
      if (stable === 'two-open') return 'two-open';
      if (stable === 'spread') return 'spread';
      if (stable === 'palm') return 'swiping';
      return 'swiping';
    }

    function classifyGesture(lm) {
      const { state: raw } = detectHandState(lm);
      const stable = applyStableHandState(raw);
      return mapStableStateToGesture(stable);
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
          if (indicator) updateGestureStatus('握拳 · 移动光标 / 长按触发拖拽');
          // 重置长按计时
          fistStartTs = performance.now();
          longPressFired = false;
          break;
        case 'pointing':
          if (cursor) {
            cursor.style.width = '18px';
            cursor.style.height = '18px';
            cursor.classList.add('pointing');
          }
          if (indicator) updateGestureStatus('指向 · 停留2秒点击');
          fistStartTs = 0;
          break;
        case 'swiping':
          if (cursor) {
            cursor.style.width = '26px';
            cursor.style.height = '26px';
            cursor.classList.remove('fist', 'pointing');
          }
          if (indicator) updateGestureStatus('手掌 · 左右滑动切换');
          fistStartTs = 0;
          break;
        case 'pinch':
          if (cursor) {
            cursor.style.width = '16px';
            cursor.style.height = '16px';
            cursor.classList.add('pinch');
          }
          if (indicator) updateGestureStatus('捏合 · 缩放');
          fistStartTs = 0;
          break;
        case 'spread':
          if (cursor) {
            cursor.style.width = '30px';
            cursor.style.height = '30px';
            cursor.classList.add('spread');
          }
          if (indicator) updateGestureStatus('张开 · 放大');
          fistStartTs = 0;
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
          document.dispatchEvent(new CustomEvent('gesture-swipe-right'));
          swipeBuffer = [];
          showSwipeHint('right');
        } else if (totalDx < -SWIPE_THRESHOLD) {
          document.dispatchEvent(new CustomEvent('gesture-swipe-left'));
          swipeBuffer = [];
          showSwipeHint('left');
        }
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
        el.closest('.ast-voice-btn') ||
        el.closest('.push-preview-close') ||
        el.closest('.module-card') ||
        el.closest('.comp-btn') ||
        el.closest('.tab-btn') ||
        el.closest('.game-btn') ||
        el.closest('.culture-nav-item')
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
      stableHandState = 'palm';
      debouncePending = null;
      debounceCount = 0;
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) {
        cursor.classList.remove('fist', 'pointing', 'clicking', 'dwell-active');
      }
      clearDwellProgress();
      fistStartTs = 0;
      longPressFired = false;
    }

    function updateGestureStatus(text) {
      const status = document.getElementById('gesture-status');
      const label = status?.querySelector('.gesture-label');
      if (label) label.textContent = text;
      if (status) status.classList.add('visible');
      if (gestureStatusHideTimer) clearTimeout(gestureStatusHideTimer);
      gestureStatusHideTimer = setTimeout(() => {
        gestureStatusHideTimer = null;
        document.getElementById('gesture-status')?.classList.remove('visible');
      }, 1000);
    }

    function showSwipeHint(direction) {
      let hint = document.querySelector('.swipe-hint.' + direction);
      if (!hint) {
        hint = document.createElement('div');
        hint.className = `swipe-hint ${direction}`;
        hint.style.cssText = `
          position: fixed;
          top: 50%;
          ${direction === 'right' ? 'right: 30px' : 'left: 30px'};
          transform: translateY(-50%);
          background: rgba(200,168,85,0.85);
          color: #1a0f00;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: bold;
          z-index: 99999;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
        `;
        document.body.appendChild(hint);
      }
      hint.textContent = direction === 'right' ? '\u2192 下一项' : '\u2190 上一项';
      hint.style.opacity = '1';
      setTimeout(() => { hint.style.opacity = '0'; }, 600);
    }

    // ─────────────────────────────────────────────
    // MediaPipe Hands
    // ─────────────────────────────────────────────
    async function startCamera() {
      // 先停掉已存在的摄像头流，防止重复开启泄漏
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
        cameraStream = null;
      }
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });
        videoEl.srcObject = cameraStream;
        videoEl.style.display = 'block';
        videoEl.style.opacity = '0.4';
        videoEl.style.zIndex = '9998';
        videoEl.style.pointerEvents = 'none';

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
      if (isActive && videoEl && videoEl.readyState >= 2) return videoEl;
      return null;
    }

    function startManualFrameLoop() {
      if (manualLoopRunning) return;
      manualLoopRunning = true;

      const tick = async () => {
        const feed = getHandFrameSource();
        if (isActive && hands && feed) {
          try { await hands.send({ image: feed }); } catch {}
        }
        if (isActive) {
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
    // 开关控制（右上工具栏按钮）
    // 点击一次开启金色发光，点击一次关闭灰色暗淡
    // ─────────────────────────────────────────────
    async function toggle() {
      // 先保存状态，避免 closeAll() 内部修改 isActive 后影响判断
      const currentlyActive = isActive;

      if (currentlyActive) {
        // 已开启 → 关闭摄像头
        deactivateGesture();
      } else {
        // 未开启 → 开启摄像头
        const ok = await startCamera();
        if (ok) {
          isActive = true;
          buildCameraPreview(cameraStream);
          document.getElementById('gesture-toggle')?.classList.add('active');
          updateGestureStatus('手势控制已开启');
        } else {
          document.getElementById('gesture-toggle')?.classList.remove('active');
        }
      }
    }

    // ─────────────────────────────────────────────
    // 推门已废弃，摄像头由 toggle() 统一管理
    // ─────────────────────────────────────────────
    function resetPushDoor() {
      // 推门已废弃，摄像头由 toggle() 统一管理
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
      closeAll,
      detectHandState
    };
  })();
