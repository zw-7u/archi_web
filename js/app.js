/* ==========================================
   皇城·万象 · 全局入口
   初始化所有模块，协调页面交互
   ========================================== */

const App = (() => {

  function init() {
    // 1. 初始化手势
    Gesture.init();

    // 2. 语言切换（由 I18N 模块处理）
    // I18N.initLanguageToggle() 在 i18n.js 中已自动初始化

    // 3. 初始化 AI 助手（由 assistance.js 处理）
    // assistance.js 已自动在 DOMContentLoaded 时初始化

    console.log('%c皇城·万象 · 初始化完成', 'color: #c8a855; font-size: 14px; font-weight: bold;');
  }

  // 页面加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();
