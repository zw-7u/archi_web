/* ==========================================
   时辰场景 · 切换逻辑
   支持滑动、滚轮、键盘、手势切换
   ========================================== */

   const Scenes = (() => {
    let currentIndex = 0;
    let isTransitioning = false;
    const TOTAL_SCENES = 8;
  
    // 触摸/鼠标滑动追踪
    let touchStartX = 0;
    let touchStartY = 0;
    let isDragging = false;
  
    function init() {
      bindSwipe();
      bindKeyboard();
      bindWheel();
    }
  
    function getScenes() {
      return document.querySelectorAll('.scene');
    }
  
    /* ========== 切换场景 ========== */
    function goTo(index, direction) {
      if (isTransitioning || isFrozen || index === currentIndex) return;
      if (index < 0 || index >= TOTAL_SCENES) return;
  
      isTransitioning = true;
      const scenes = getScenes();
      const currentScene = scenes[currentIndex];
      const nextScene = scenes[index];
  
      // 判断方向
      const dir = direction || (index > currentIndex ? 'left' : 'right');
  
      // 判断是否跨多个时辰（点击时间轴跳转）
      const isJump = Math.abs(index - currentIndex) > 1;
  
      if (isJump) {
        // 跨时辰跳转：水墨晕染过渡
        showInkTransition(() => {
          currentScene.classList.remove('active');
          nextScene.classList.add('active');
          Timeline.setActive(index);
          currentIndex = index;

          // 重置缩放
          if (typeof Gesture !== 'undefined' && Gesture.resetScale) Gesture.resetScale();
  
          // 新场景内容入场动画重新触发
          const content = nextScene.querySelector('.scene-content');
          if (content) {
            content.style.animation = 'none';
            content.offsetHeight; // 强制重排
            content.style.animation = '';
          }
  
          setTimeout(() => { isTransitioning = false; }, 400);
        });
      } else {
        // 相邻切换：滑动过渡
        currentScene.classList.remove('active');
        currentScene.classList.add('exiting');
  
        nextScene.classList.add('active');
        nextScene.classList.add(dir === 'left' ? 'slide-in-left' : 'slide-in-right');
  
        Timeline.setActive(index);
        currentIndex = index;
  
        setTimeout(() => {
          currentScene.classList.remove('exiting');
          nextScene.classList.remove('slide-in-left', 'slide-in-right');
          isTransitioning = false;
        }, 900);
      }
    }
  
    /* ========== 水墨晕染过渡效果 ========== */
    function showInkTransition(callback) {
      let ink = document.getElementById('ink-transition');
      if (!ink) {
        ink = document.createElement('div');
        ink.id = 'ink-transition';
        ink.className = 'ink-transition';
        document.getElementById('scenes-container').appendChild(ink);
      }
  
      ink.classList.add('active');
  
      setTimeout(() => {
        if (callback) callback();
      }, 600);
  
      setTimeout(() => {
        ink.classList.remove('active');
      }, 1200);
    }
  
    function next() {
      if (isTransitioning || isFrozen) return;
      if (currentIndex < TOTAL_SCENES - 1) {
        goTo(currentIndex + 1, 'left');
      }
    }

    function prev() {
      if (isTransitioning || isFrozen) return;
      if (currentIndex > 0) {
        goTo(currentIndex - 1, 'right');
      }
    }
  
    /* ========== 鼠标/触摸滑动 ========== */
    function bindSwipe() {
      const container = document.getElementById('scenes-container');
      if (!container) return;
  
      // 触摸事件
      container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = true;
      }, { passive: true });
  
      container.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
  
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
          if (dx < 0) next();
          else prev();
        }
      });
  
      // 鼠标拖拽
      container.addEventListener('mousedown', (e) => {
        // 不拦截按钮/热区的点击
        if (e.target.closest('.hotspot, .timeline-item, .card-close, .gesture-toggle, .ai-chat-widget')) return;
        touchStartX = e.clientX;
        isDragging = true;
      });
  
      container.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const dx = e.clientX - touchStartX;
  
        if (Math.abs(dx) > 80) {
          if (dx < 0) next();
          else prev();
        }
      });
    }
  
    /* ========== 键盘方向键 ========== */
    function bindKeyboard() {
      document.addEventListener('keydown', (e) => {
        if (document.getElementById('info-card') &&
            !document.getElementById('info-card').classList.contains('hidden')) return;
  
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          next();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          prev();
        }
      });
    }
  
    /* ========== 滚轮切换 ========== */
    function bindWheel() {
      let wheelTimeout;
      const container = document.getElementById('scenes-container');
      if (!container) return;
  
      container.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (wheelTimeout) return;
  
        wheelTimeout = setTimeout(() => {
          wheelTimeout = null;
        }, 800);
  
        if (e.deltaY > 0 || e.deltaX > 0) {
          next();
        } else {
          prev();
        }
      }, { passive: false });
    }
  
    // 冻结/解冻画面（握拳时）
    let isFrozen = false;

    function freeze(freeze) {
      isFrozen = freeze;
      const scenes = getScenes();
      scenes.forEach(s => {
        if (freeze) s.classList.add('frozen');
        else s.classList.remove('frozen');
      });
    }

    function applyZoom(scale) {
      const container = document.getElementById('scenes-container');
      if (!container) return;
      const active = container.querySelector('.scene.active');
      if (active) {
        active.style.transform = `scale(${scale})`;
      }
    }

    /* ========== 公共接口 ========== */
    return {
      init,
      goTo,
      next,
      prev,
      getCurrent: () => currentIndex,
      getTotal: () => TOTAL_SCENES,
      freeze,
      applyZoom
    };
  })();