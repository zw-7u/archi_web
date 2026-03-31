/* ==========================================
   底部时间轴 · 点击跳转 + 进度指示
   ========================================== */

   const Timeline = (() => {

    const PAIR_MAP = [0, 2, 4, 6];

    function init() {
      const items = document.querySelectorAll('.timeline-item');
      items.forEach((item) => {
        item.addEventListener('click', () => {
          const pairIndex = parseInt(item.dataset.index);
          // pairIndex 就是跳到 pair 的第一个场景
          Scenes.goTo(pairIndex);
        });
      });

      // 初始进度
      updateProgress(0);
    }

    function setActive(sceneIndex) {
      const items = document.querySelectorAll('.timeline-item');
      items.forEach((item, i) => {
        const pairStart = PAIR_MAP[i];
        const pairEnd = PAIR_MAP[i] + 1;
        const isActive = sceneIndex >= pairStart && sceneIndex <= pairEnd;
        item.classList.toggle('active', isActive);
      });
      updateProgress(sceneIndex);
    }

    function updateProgress(sceneIndex) {
      const progress = document.getElementById('timeline-progress');
      if (progress) {
        // 映射 8 场景 → 4 进度档：0→0%, 1→14%, 2→33%, 3→47%, 4→67%, 5→80%, 6→100%, 7→100%
        const steps = [0, 14, 33, 47, 67, 80, 100, 100];
        progress.style.width = steps[Math.min(sceneIndex, 7)] + '%';
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