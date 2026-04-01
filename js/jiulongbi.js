/* ==========================================
   皇城·万象 · 九龙壁页面交互
   ========================================== */

const JiuLongBi = (() => {

  const COMPONENTS = {
    liuli: {
      name_zh: '琉璃拼接工艺',
      name_en: 'Glazed Tile Mosaic Craft',
      pinyin: 'liú lí pīn jiē gōng yì',
      craft_zh: '【占位】九龙壁使用270个琉璃块拼接而成，每块都要精确烧制并编号。',
      science_zh: '【占位】琉璃块之间严丝合缝，形成平整连续的龙纹图案。',
      culture_zh: '【占位】九龙壁的龙纹设计体现了皇家对完美与秩序的追求。'
    },
    youcai: {
      name_zh: '琉璃釉彩',
      name_en: 'Glaze Chemistry',
      pinyin: 'liú lí yòu cǎi',
      craft_zh: '【占位】琉璃以陶土为胎，表面施以硅酸盐釉料，经高温烧制而成。',
      science_zh: '【占位】釉料中的金属氧化物在高温下呈现不同颜色：铜呈绿，锰呈紫，钴呈蓝。',
      culture_zh: '【占位】黄色龙为主色，象征皇家正统，背景用青色表现海水。'
    },
    longwen: {
      name_zh: '龙纹文化',
      name_en: 'Dragon Pattern Culture',
      pinyin: 'lóng wén wén huà',
      craft_zh: '【占位】龙是皇帝的象征，九为阳数之极，九龙代表皇权至高无上。',
      science_zh: '【占位】九条龙形态各异，有的昂首，有的俯身，展现动与静的平衡。',
      culture_zh: '【占位】龙纹在紫禁城无处不在，是皇权不可撼动的视觉符号。'
    }
  };

  function init() {
    setupComponentButtons();
    setupTabs();
    console.log('[JiuLongBi] 模块初始化完成');
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
