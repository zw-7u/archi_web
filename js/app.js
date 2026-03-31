/* ==========================================
   故宫十二时辰 · 主入口
   初始化所有模块，协调交互
   ========================================== */

   const App = (() => {
    let hasEntered = false;
  
    function init() {
      // 1. 初始化首页粒子场景
      Landing.init();
  
      // 2. 空格键进入（或点击首页进入主场景）
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !hasEntered) {
          e.preventDefault();
          Landing.dissolve();
        }
      });

      // 3. 点击首页直接进入（无需开启摄像头）
      const landingSection = document.getElementById('landing');
      if (landingSection) {
        landingSection.addEventListener('click', (e) => {
          // 忽略语言切换按钮的点击
          if (e.target.closest('#language-toggle')) return;
          if (!hasEntered) {
            Landing.dissolve();
          }
        });
      }
  
      // 3. 语言切换功能由 I18N 模块处理 (i18n.js)

      // 4. 预初始化模块
      Scenes.init();
      Timeline.init();
      Cards.init();
      Gesture.init();
  
      // 5. 给场景内容添加序号
      document.querySelectorAll('.scene-content').forEach((el, i) => {
        el.setAttribute('data-num', String(i + 1).padStart(2, '0'));
      });
  
      console.log('%c故宫十二时辰 · 初始化完成', 'color: #c8a855; font-size: 14px; font-weight: bold;');
    }
  
    // 从首页过渡到场景页
    function enterScenes() {
      if (hasEntered) return;
      hasEntered = true;

      document.body.classList.add('app-in-scenes');

      const container = document.getElementById('scenes-container');
      if (!container) return;

      container.classList.remove('hidden');
  
      // 分步骤入场动画
      setTimeout(() => {
        // 显示时间轴
        Timeline.show();
      }, 300);

      // 清理首页推门手势（如有）
      setTimeout(() => {
        if (typeof Gesture !== 'undefined' && Gesture.resetPushDoor) {
          Gesture.resetPushDoor();
        }
      }, 600);
  
      setTimeout(() => {
        // 添加导航提示
        addNavHints();
      }, 1200);
  
      setTimeout(() => {
        // 淡出导航提示
        document.querySelectorAll('.scene-nav-hint').forEach(h => {
          h.style.opacity = '0';
        });
      }, 5000);
    }
  
    // 添加左右导航提示
    function addNavHints() {
      const container = document.getElementById('scenes-container');
      if (!container) return;
  
      const leftHint = document.createElement('div');
      leftHint.className = 'scene-nav-hint left';
      leftHint.textContent = '← 上一时辰';
      leftHint.style.opacity = '0.3';
  
      const rightHint = document.createElement('div');
      rightHint.className = 'scene-nav-hint right';
      rightHint.textContent = '下一时辰 →';
      rightHint.style.opacity = '0.3';
  
      container.appendChild(leftHint);
      container.appendChild(rightHint);
    }
  
    // 页面加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    return { init, enterScenes };
  })();

  
  // Language toggle is handled by I18N module (see i18n.js)