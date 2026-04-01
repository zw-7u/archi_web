/* ==========================================
   皇城·万象 · 午门页面交互
   ========================================== */

const WuMen = (() => {

  const COMPONENTS = {
    gongquan: {
      name_zh: '拱券结构',
      name_en: 'Arch Structure',
      pinyin: 'gǒng xuàn jié gòu',
      craft_zh: '【占位】拱券是用砖石砌成的拱形结构，能够将上方重量向两侧传递。',
      science_zh: '【占位】拱券利用石材抗压不抗拉的特性，通过拱形将压力分散。',
      culture_zh: '【占位】午门的城台下开有5个券洞，供人员和车辆通行。'
    },
    zhuanshi: {
      name_zh: '城台砖石',
      name_en: 'City Wall Masonry',
      pinyin: 'chéng tái zhuān shí',
      craft_zh: '【占位】午门城台以巨型城砖砌筑，表面包砌汉白玉石栏杆。',
      science_zh: '【占位】城砖质地密实，砌筑采用"一丁一顺"交替方式，增强整体性。',
      culture_zh: '【占位】城台上的五座门洞象征"五岳"，体现皇权一统天下的思想。'
    },
    buju: {
      name_zh: '凹形布局',
      name_en: 'Concave Layout',
      pinyin: 'āo xíng bù jú',
      craft_zh: '【占位】午门平面呈"凹"字形，左右伸出，形成壮观的门阙形象。',
      science_zh: '【占位】凹形布局形成左右对称呼应，增强视觉冲击力和庄严感。',
      culture_zh: '【占位】午门形如展翅之雁，故又称"雁翅楼"，体现皇家气派。'
    }
  };

  function init() {
    setupComponentButtons();
    setupTabs();
    console.log('[WuMen] 模块初始化完成');
  }

  function setupComponentButtons() {
    document.querySelectorAll('.comp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const compId = btn.dataset.component;
        showComponent(compId);
        document.querySelectorAll('.comp-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function showComponent(compId) {
    const comp = COMPONENTS[compId];
    if (!comp) return;
    activateTab('craft');

    const fill = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    fill('comp-title', comp.name_zh);
    fill('comp-title-en', comp.name_en);
    fill('comp-pinyin', comp.pinyin);
    const craftP = document.querySelector('#text-craft p');
    const sciP = document.querySelector('#text-science p');
    const cultP = document.querySelector('#text-culture p');
    if (craftP) craftP.textContent = comp.craft_zh;
    if (sciP) sciP.textContent = comp.science_zh;
    if (cultP) cultP.textContent = comp.culture_zh;

    const panelEmpty = document.getElementById('comp-panel-empty');
    const panelContent = document.getElementById('comp-panel-content');
    if (panelEmpty) panelEmpty.classList.add('hidden');
    if (panelContent) panelContent.classList.remove('hidden');
  }

  function setupTabs() {
    document.querySelectorAll('.comp-tab').forEach(tab => {
      tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    });
  }

  function activateTab(tab) {
    document.querySelectorAll('.comp-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    ['craft', 'science', 'culture'].forEach(card => {
      const el = document.getElementById('card-' + card);
      if (el) el.classList.toggle('hidden', card !== tab);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
