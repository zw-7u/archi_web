/* ==========================================
   皇城·万象 · 角楼页面交互
   ========================================== */

const JiaoLou = (() => {

  const COMPONENTS = {
    wumian: {
      name_zh: '多重檐复合屋面',
      name_en: 'Multi-eaved Compound Roof',
      pinyin: 'duō chóng yán fù hé wū miàn',
      craft_zh: '【占位】角楼屋顶由三层檐组成，形成复杂而优美的曲线，民间称为"九脊殿"。',
      science_zh: '【占位】多重檐层层叠出，既便于排水，又形成优美的轮廓线，增强建筑美感。',
      culture_zh: '【占位】角楼是城墙转角处的防御建筑，其复杂屋顶体现皇家建筑的精致与威严。'
    },
    sunmao: {
      name_zh: '榫卯结构',
      name_en: 'Mortise-Tenon Joint',
      pinyin: 'sǔn mǎo jié gòu',
      craft_zh: '【占位】榫卯是中国传统木结构的核心技术，通过凹凸结合实现稳固连接。',
      science_zh: '【占位】榫卯允许轻微形变，在地震中能消耗能量，保护建筑主体不倒塌。',
      culture_zh: '【占位】"榫卯千年不散"——这是中国木构建筑屹立千年的秘密。'
    }
  };

  function init() {
    setupComponentButtons();
    setupTabs();
    console.log('[JiaoLou] 模块初始化完成');
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

    const titleEl = document.getElementById('comp-title');
    const titleEnEl = document.getElementById('comp-title-en');
    const pinyinEl = document.getElementById('comp-pinyin');
    const craftText = document.querySelector('#text-craft p');
    const scienceText = document.querySelector('#text-science p');
    const cultureText = document.querySelector('#text-culture p');

    if (titleEl) titleEl.textContent = comp.name_zh;
    if (titleEnEl) titleEnEl.textContent = comp.name_en;
    if (pinyinEl) pinyinEl.textContent = comp.pinyin;
    if (craftText) craftText.textContent = comp.craft_zh;
    if (scienceText) scienceText.textContent = comp.science_zh;
    if (cultureText) cultureText.textContent = comp.culture_zh;

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
