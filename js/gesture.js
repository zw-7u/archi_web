/* ==========================================
   手势交互 · MediaPipe Hands
   P1: 手掌移动控制光标
   P2: 挥手左右切换时辰
   P3: 抓取手势打开详情
   ========================================== */

  const Gesture = (() => {
    let isActive = false;
    let hands = null;
    let handsCamera = null;
    let videoEl = null;
    let mediaPipeLoaded = false;
    let isInitializing = false;

    // 手势状态
    let palmX = 0, palmY = 0;
    let prevPalmX = 0;
    let swipeBuffer = [];
    let lastSwipeTime = 0;
    let isGrabbing = false;
    let grabStartTime = 0;

    const SWIPE_THRESHOLD = 0.15;   // 挥手位移阈值
    const SWIPE_COOLDOWN = 800;     // 挥手冷却时间(ms)
    const GRAB_HOLD_TIME = 500;     // 抓取持续时间(ms)

    // CDN URLs (updated to latest stable versions)
    const MEDIAPIPE_HANDS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js';
    const CAMERA_UTILS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js';
    const CONTROL_UTILS_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils@0.6.13450205/control_utils.js';

    async function init() {
      // 创建视频元素
      videoEl = document.createElement('video');
      videoEl.id = 'camera-preview';
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('autoplay', '');
      videoEl.style.cssText = 'position:fixed;bottom:90px;left:20px;width:160px;height:120px;border:1px solid var(--ink-medium, #4a4236);z-index:200;opacity:0.5;transform:scaleX(-1);display:none;';
      document.body.appendChild(videoEl);

      // 绑定切换按钮
      const toggleBtn = document.getElementById('gesture-toggle');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', toggle);
      }

      console.log('Gesture module initialized');
    }

    async function startCamera() {
      try {
        // First check if we can access the camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });

        // Attach stream to video element
        videoEl.srcObject = stream;
        videoEl.style.display = 'block';

        await new Promise((resolve, reject) => {
          videoEl.onloadedmetadata = () => {
            videoEl.play().then(resolve).catch(reject);
          };
          videoEl.onerror = reject;
          // Timeout fallback
          setTimeout(resolve, 1000);
        });

        // Try to load MediaPipe
        const loaded = await loadMediaPipe();

        if (loaded) {
          showStatus('手势控制已开启');
        } else {
          // Fallback to mouse simulation
          setupFallback();
          showStatus('使用鼠标模式');
        }

        return true;
      } catch (err) {
        console.warn('摄像头访问失败:', err);
        showStatus('摄像头访问失败');
        return false;
      }
    }

    async function loadMediaPipe() {
      // Check if already loaded
      if (typeof window.Hands !== 'undefined') {
        setupHands();
        mediaPipeLoaded = true;
        return true;
      }

      if (isInitializing) {
        // Wait for ongoing initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        return mediaPipeLoaded;
      }

      isInitializing = true;

      try {
        // Load MediaPipe Hands
        await loadScript(MEDIAPIPE_HANDS_URL);
        await loadScript(CAMERA_UTILS_URL);

        // Verify Hands is available
        if (typeof window.Hands === 'undefined') {
          throw new Error('Hands class not available after loading');
        }

        setupHands();
        mediaPipeLoaded = true;
        return true;
      } catch (err) {
        console.warn('MediaPipe 加载失败:', err);
        isInitializing = false;
        return false;
      }
    }

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.crossOrigin = 'anonymous';
        script.onload = resolve;
        script.onerror = () => {
          console.warn(`Failed to load: ${src}`);
          reject(new Error(`Script load failed: ${src}`));
        };
        document.head.appendChild(script);
      });
    }

    function setupHands() {
      if (typeof window.Hands === 'undefined') {
        setupFallback();
        return;
      }

      hands = new window.Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });

      hands.onResults(onHandResults);

      // Check if Camera class is available
      if (typeof window.Camera === 'undefined') {
        console.warn('Camera class not available, using manual frame processing');
        setupManualFrameLoop();
        return;
      }

      handsCamera = new window.Camera(videoEl, {
        onFrame: async () => {
          if (isActive && hands) {
            await hands.send({ image: videoEl });
          }
        },
        width: 640,
        height: 480
      });

      handsCamera.start();
    }

    function setupManualFrameLoop() {
      // Fallback: manually process video frames
      const processFrame = async () => {
        if (isActive && hands && videoEl.readyState >= 2) {
          try {
            await hands.send({ image: videoEl });
          } catch (e) {
            // Ignore errors during frame processing
          }
        }
        if (isActive) {
          requestAnimationFrame(processFrame);
        }
      };
      processFrame();
    }
  
    /* ========== 手势识别回调 ========== */
    function onHandResults(results) {
      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        hideCursor();
        return;
      }
  
      const landmarks = results.multiHandLandmarks[0];
  
      // P1: 手掌中心控制光标
      const palmCenter = landmarks[9]; // 中指根部
      prevPalmX = palmX;
      palmX = 1 - palmCenter.x; // 镜像翻转
      palmY = palmCenter.y;
  
      updateCursor(palmX * window.innerWidth, palmY * window.innerHeight);
  
      // P2: 挥手检测（左右快速移动）
      detectSwipe(palmX);
  
      // P3: 抓取检测（指尖与掌心距离）
      detectGrab(landmarks);
    }
  
    /* ========== P1: 手掌光标 ========== */
    function updateCursor(x, y) {
      const cursor = document.getElementById('gesture-cursor');
      if (!cursor) return;
  
      cursor.style.left = x + 'px';
      cursor.style.top = y + 'px';
      cursor.classList.add('visible');
  
      // 检测光标下方的热区
      checkHotspotHover(x, y);
    }
  
    function hideCursor() {
      const cursor = document.getElementById('gesture-cursor');
      if (cursor) cursor.classList.remove('visible');
    }
  
    function checkHotspotHover(x, y) {
      const elements = document.elementsFromPoint(x, y);
      const hotspot = elements.find(el => el.closest('.hotspot'));
      // 可以在这里添加悬浮效果
    }
  
    /* ========== P2: 挥手翻页 ========== */
    function detectSwipe(currentX) {
      const now = Date.now();
      if (now - lastSwipeTime < SWIPE_COOLDOWN) return;
  
      swipeBuffer.push({ x: currentX, time: now });
  
      // 保留最近500ms的数据
      swipeBuffer = swipeBuffer.filter(p => now - p.time < 500);
  
      if (swipeBuffer.length < 5) return;
  
      const first = swipeBuffer[0];
      const last = swipeBuffer[swipeBuffer.length - 1];
      const dx = last.x - first.x;
  
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        lastSwipeTime = now;
        swipeBuffer = [];
  
        if (dx > 0) {
          Scenes.next();
          showSwipeHint('right', '→ 下一时辰');
        } else {
          Scenes.prev();
          showSwipeHint('left', '← 上一时辰');
        }
      }
    }
  
    /* ========== P3: 抓取手势 ========== */
    function detectGrab(landmarks) {
      // 计算指尖到掌心的平均距离
      const palm = landmarks[0]; // 手腕
      const tips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
      const midJoints = [landmarks[3], landmarks[6], landmarks[10], landmarks[14], landmarks[18]];
  
      // 判断手指是否弯曲（指尖比中间关节更靠近掌心）
      let closedFingers = 0;
      for (let i = 1; i < 5; i++) { // 跳过拇指
        const tipDist = distance(tips[i], palm);
        const midDist = distance(midJoints[i], palm);
        if (tipDist < midDist) closedFingers++;
      }
  
      const cursor = document.getElementById('gesture-cursor');
      const isNowGrabbing = closedFingers >= 3;
  
      if (isNowGrabbing && !isGrabbing) {
        // 开始抓取
        isGrabbing = true;
        grabStartTime = Date.now();
        if (cursor) cursor.classList.add('grabbing');
      } else if (!isNowGrabbing && isGrabbing) {
        // 松开
        isGrabbing = false;
        if (cursor) cursor.classList.remove('grabbing');
      }
  
      // 抓取持续足够时间 → 触发点击
      if (isGrabbing && Date.now() - grabStartTime > GRAB_HOLD_TIME) {
        isGrabbing = false;
        grabStartTime = 0;
        if (cursor) cursor.classList.remove('grabbing');
  
        // 模拟点击当前光标位置
        triggerClickAtCursor();
      }
    }
  
    function distance(a, b) {
      return Math.sqrt(
        Math.pow(a.x - b.x, 2) +
        Math.pow(a.y - b.y, 2) +
        Math.pow((a.z || 0) - (b.z || 0), 2)
      );
    }
  
    function triggerClickAtCursor() {
      const cursor = document.getElementById('gesture-cursor');
      if (!cursor) return;
  
      const x = parseFloat(cursor.style.left);
      const y = parseFloat(cursor.style.top);
  
      // 查找光标下方的可点击元素
      const elements = document.elementsFromPoint(x, y);
      const clickable = elements.find(el =>
        el.closest('.hotspot') ||
        el.closest('.timeline-item') ||
        el.closest('.card-close')
      );
  
      if (clickable) {
        const target = clickable.closest('.hotspot, .timeline-item, .card-close');
        if (target) target.click();
      }
    }
  
    /* ========== 回退方案：无MediaPipe时的简化模式 ========== */
    function setupFallback() {
      console.log('使用鼠标模拟手势模式');
      // 鼠标移动时显示手势光标
      document.addEventListener('mousemove', (e) => {
        if (!isActive) return;
        updateCursor(e.clientX, e.clientY);
      });
    }
  
    /* ========== UI 辅助 ========== */
    function showStatus(text) {
      const status = document.getElementById('gesture-status');
      const label = status?.querySelector('.gesture-label');
      if (label) label.textContent = text;
      if (status) {
        status.classList.add('visible');
        setTimeout(() => status.classList.remove('visible'), 3000);
      }
    }
  
    function showSwipeHint(direction, text) {
      // 创建临时提示
      let hint = document.querySelector('.swipe-hint.' + direction);
      if (!hint) {
        hint = document.createElement('div');
        hint.className = `swipe-hint ${direction}`;
        document.getElementById('scenes-container')?.appendChild(hint);
      }
      hint.textContent = text;
      hint.classList.add('show');
      setTimeout(() => hint.classList.remove('show'), 800);
    }
  
    /* ========== 开关控制 ========== */
    async function toggle() {
      const btn = document.getElementById('gesture-toggle');

      if (isActive) {
        // 关闭
        isActive = false;
        btn?.classList.remove('active');
        hideCursor();
        showStatus('手势控制已关闭');

        // Stop camera
        if (videoEl && videoEl.srcObject) {
          videoEl.srcObject.getTracks().forEach(track => track.stop());
        }
        if (handsCamera) {
          handsCamera.stop();
          handsCamera = null;
        }
        videoEl.style.display = 'none';
      } else {
        // 开启
        const success = await startCamera();
        if (success) {
          isActive = true;
          btn?.classList.add('active');
        }
      }
    }

    return {
      init,
      toggle,
      isActive: () => isActive,
      // 外部调用：通过程序触发挥手
      triggerSwipe: (dir) => {
        if (dir === 'left') Scenes.prev();
        else Scenes.next();
      }
    };
  })();