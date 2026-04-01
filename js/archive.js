/* ==========================================
   皇城·万象 · 模块一：建筑档案交互
   ========================================== */

const Archive = (() => {

  let buildings = [];
  let selectedBuilding = null;

  async function init() {
    await loadBuildings();
    renderMarkers();
    setupEventListeners();
    setupTabSwitching();
    console.log('[Archive] 模块初始化完成');
  }

  // 从 JSON 文件加载建筑数据
  async function loadBuildings() {
    try {
      const res = await fetch('../data/buildings.json');
      const data = await res.json();
      buildings = data.buildings || [];
    } catch (err) {
      console.warn('[Archive] 无法加载 buildings.json，使用默认数据:', err);
      buildings = getDefaultBuildings();
    }
  }

  // 默认建筑数据（当 JSON 加载失败时使用）
  function getDefaultBuildings() {
    return [
      { id: 'taihedian', name_zh: '太和殿', name_en: 'Hall of Supreme Harmony', featured: true, map_position: { x: '50%', y: '35%' }, detail_page: 'module2-taihedian.html' },
      { id: 'zhonghedian', name_zh: '中和殿', name_en: 'Hall of Central Harmony', featured: false, map_position: { x: '52%', y: '38%' }, detail_page: null },
      { id: 'baohedian', name_zh: '保和殿', name_en: 'Hall of Preserving Harmony', featured: false, map_position: { x: '54%', y: '41%' }, detail_page: null },
      { id: 'jiaolou', name_zh: '角楼', name_en: 'Corner Tower', featured: true, map_position: { x: '20%', y: '30%' }, detail_page: 'module2-jiaolou.html' },
      { id: 'wumen', name_zh: '午门', name_en: 'Meridian Gate', featured: true, map_position: { x: '50%', y: '18%' }, detail_page: 'module2-wumen.html' },
      { id: 'jiulongbi', name_zh: '九龙壁', name_en: 'Nine Dragon Wall', featured: true, map_position: { x: '30%', y: '25%' }, detail_page: 'module2-jiulongbi.html' },
      { id: 'qianqinggong', name_zh: '乾清宫', name_en: 'Palace of Heavenly Purity', featured: false, map_position: { x: '50%', y: '50%' }, detail_page: null },
      { id: 'kunninggong', name_zh: '坤宁宫', name_en: 'Palace of Earthly Tranquility', featured: false, map_position: { x: '50%', y: '55%' }, detail_page: null },
      { id: 'shenwumen', name_zh: '神武门', name_en: 'Gate of Divine Might', featured: false, map_position: { x: '50%', y: '85%' }, detail_page: null },
      { id: 'duanmen', name_zh: '端门', name_en: 'Gate of Correct Deportment', featured: false, map_position: { x: '50%', y: '10%' }, detail_page: null },
    ];
  }

  // 渲染建筑标记
  function renderMarkers() {
    const container = document.getElementById('building-markers');
    if (!container) return;

    container.innerHTML = '';

    buildings.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'building-marker' + (b.featured ? ' featured' : '');
      btn.setAttribute('data-building', b.id);
      btn.style.setProperty('--x', b.map_position.x);
      btn.style.setProperty('--y', b.map_position.y);
      btn.style.left = b.map_position.x;
      btn.style.top = b.map_position.y;

      const dot = document.createElement('span');
      dot.className = 'marker-dot';

      const label = document.createElement('span');
      label.className = 'marker-label';
      label.textContent = b.name_zh + (b.featured ? ' ★' : '');

      btn.appendChild(dot);
      btn.appendChild(label);

      btn.addEventListener('click', () => selectBuilding(b.id));

      container.appendChild(btn);
    });
  }

  // 选中建筑
  function selectBuilding(id) {
    const b = buildings.find(x => x.id === id);
    if (!b) return;

    selectedBuilding = b;

    // 高亮标记
    document.querySelectorAll('.building-marker').forEach(m => {
      m.classList.toggle('active', m.dataset.building === id);
    });

    // 切换到档案卡标签
    activateTab('archive');

    // 显示面板内容
    showArchiveCard(b);

    // 更新语言
    updateCardLanguage();
  }

  // 显示档案卡内容
  function showArchiveCard(b) {
    const panelEmpty = document.getElementById('panel-empty');
    const panelContent = document.getElementById('panel-content');

    if (panelEmpty) panelEmpty.classList.add('hidden');
    if (panelContent) panelContent.classList.remove('hidden');

    // 填充数据
    if (document.getElementById('card-name')) {
      document.getElementById('card-name').textContent = b.name_zh;
    }
    if (document.getElementById('card-name-en')) {
      document.getElementById('card-name-en').textContent = b.name_en;
    }

    // 档案信息（使用默认占位，或从 b 对象读取）
    const fields = [
      { id: 'card-area', key: 'area_zh', fallback: '【占位】' },
      { id: 'card-function', key: 'function_zh', fallback: '【占位】' },
      { id: 'card-rank', key: 'rank_zh', fallback: '【占位】' },
      { id: 'card-roof', key: 'roof_zh', fallback: '【占位】' },
      { id: 'card-built', key: 'built_zh', fallback: '【占位】' },
      { id: 'card-material', key: 'material_zh', fallback: '【占位】' },
    ];

    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) {
        el.textContent = b[f.key] || f.fallback;
        el.style.color = b[f.key] ? '' : 'rgba(197,151,59,0.4)';
      }
    });

    // 趣闻
    if (document.getElementById('card-trivia')) {
      const triviaEl = document.querySelector('#card-trivia p');
      if (triviaEl) {
        triviaEl.textContent = b.trivia_zh || '【占位】趣闻内容';
        triviaEl.style.color = b.trivia_zh ? '' : 'rgba(197,151,59,0.4)';
      }
    }

    // 重点建筑显示探索按钮
    const exploreBtn = document.getElementById('explore-btn');
    if (exploreBtn) {
      if (b.featured && b.detail_page) {
        exploreBtn.classList.remove('hidden');
        exploreBtn.href = b.detail_page;
      } else {
        exploreBtn.classList.add('hidden');
      }
    }

    // 事件卡数据
    if (b.events && b.events.length > 0) {
      renderEvents(b.events);
    }
  }

  // 渲染事件列表
  function renderEvents(events) {
    const listEl = document.getElementById('event-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    events.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'event-item';

      const title = document.createElement('h5');
      title.textContent = ev.title_zh || '【占位】';

      const desc = document.createElement('p');
      desc.textContent = ev.desc_zh || '【占位】';

      item.appendChild(title);
      item.appendChild(desc);
      listEl.appendChild(item);
    });
  }

  // 标签切换
  function setupTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab);
      });
    });
  }

  function activateTab(tab) {
    // 更新按钮状态
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    // 切换内容
    const archiveCard = document.getElementById('archive-card');
    const eventCard = document.getElementById('event-card');

    if (archiveCard) archiveCard.classList.toggle('hidden', tab !== 'archive');
    if (eventCard) eventCard.classList.toggle('hidden', tab !== 'events');
  }

  // 设置事件监听
  function setupEventListeners() {
    // 手势事件：支持 'gesture-click' 自定义事件
    document.addEventListener('gesture-click', (e) => {
      const marker = e.target.closest('.building-marker');
      if (marker) {
        selectBuilding(marker.dataset.building);
      }
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        resetSelection();
      }
    });
  }

  // 重置选择
  function resetSelection() {
    selectedBuilding = null;

    document.querySelectorAll('.building-marker').forEach(m => {
      m.classList.remove('active');
    });

    const panelEmpty = document.getElementById('panel-empty');
    const panelContent = document.getElementById('panel-content');

    if (panelEmpty) panelEmpty.classList.remove('hidden');
    if (panelContent) panelContent.classList.add('hidden');
  }

  // 更新语言（双语支持）
  function updateCardLanguage() {
    if (!selectedBuilding) return;
    showArchiveCard(selectedBuilding);
  }

  // 页面加载时初始化
  document.addEventListener('DOMContentLoaded', init);

  return {
    init,
    selectBuilding,
    resetSelection,
    updateCardLanguage
  };
})();
