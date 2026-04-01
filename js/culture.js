/* ==========================================
   皇城·万象 · 文化密码页面交互
   ========================================== */

const Culture = (() => {

  function init() {
    setupSidenavScrollSpy();
    setupAnimations();
    console.log('[Culture] 模块初始化完成');
  }

  // 滚动监听：更新侧边导航高亮
  function setupSidenavScrollSpy() {
    const sections = document.querySelectorAll('.culture-section');
    const navItems = document.querySelectorAll('.sidenav-item');

    if (!sections.length || !navItems.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('href') === '#' + id);
          });
        }
      });
    }, {
      threshold: 0.3,
      rootMargin: '-80px 0px -40% 0px'
    });

    sections.forEach(section => observer.observe(section));
  }

  // 入场动画
  function setupAnimations() {
    const sections = document.querySelectorAll('.culture-section');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    sections.forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(30px)';
      section.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
      observer.observe(section);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
