/* ==========================================
   底部时间轴 · 点击跳转 + 进度指示
   ========================================== */

   const Timeline = (() => {

    function init() {
      const items = document.querySelectorAll('.timeline-item');
      items.forEach((item) => {
        item.addEventListener('click', () => {
          const index = parseInt(item.dataset.index);
          Scenes.goTo(index);
        });
      });
  
      // 初始进度
      updateProgress(0);
    }
  
    function setActive(index) {
      const items = document.querySelectorAll('.timeline-item');
      items.forEach((item, i) => {
        item.classList.toggle('active', i === index);
      });
      updateProgress(index);
    }
  
    function updateProgress(index) {
      const total = Scenes.getTotal();
      const progress = document.getElementById('timeline-progress');
      if (progress) {
        const percent = (index / (total - 1)) * 100;
        progress.style.width = percent + '%';
      }
    }
  
    function show() {
      const timeline = document.getElementById('timeline');
      if (timeline) {
        timeline.classList.add('visible');
      }
    }
  
    return { init, setActive, show };
  })();