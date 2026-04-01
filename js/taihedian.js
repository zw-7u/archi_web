/* ==========================================
   皇城·万象 · 太和殿页面交互
   ========================================== */

const TaiheDian = (() => {

  // 太和殿构件数据（后期从 data/components-taihedian.json 加载）
  const COMPONENTS = {
    jishou: {
      name_zh: '脊兽',
      name_en: 'Ridge Beasts',
      pinyin: 'jǐ shòu',
      craft_zh: '【占位】脊兽是位于宫殿屋顶垂脊上的装饰构件，太和殿共有10只，为中国古建筑之最。',
      science_zh: '【占位】脊兽具有防雨、排水、稳固屋脊的功能，同时也是建筑等级的标志。',
      culture_zh: '【占位】太和殿10只脊兽依次为：龙、凤、狮、天马、海马、狻猊、押鱼、獬豸、斗牛、行什。'
    },
    dougong: {
      name_zh: '斗拱',
      name_en: 'Bracket Sets (Dougong)',
      pinyin: 'dǒu gǒng',
      craft_zh: '【占位】斗拱是中国古建筑特有的结构构件，由斗形木块和弓形横木组成，层层叠加。',
      science_zh: '【占位】斗拱将屋顶重量通过层层叠加传递到柱子上，是古代的"减震器"。',
      culture_zh: '【占位】斗拱是区分建筑等级的重要标志，只有皇家建筑才能使用九踩斗拱。'
    },
    caihui: {
      name_zh: '彩画',
      name_en: 'Painted Decoration',
      pinyin: 'cǎi huà',
      craft_zh: '【占位】彩画是古代建筑梁枋上的装饰绘画，主要有和玺彩画、旋子彩画、苏式彩画三种。',
      science_zh: '【占位】彩画颜料采用矿物颜料，具有防腐、防潮、保护木材的作用。',
      culture_zh: '【占位】太和殿使用和玺彩画，以龙纹为主题，是最高等级的彩画形式。'
    },
    wuding: {
      name_zh: '屋顶',
      name_en: 'Roof',
      pinyin: 'wū dǐng',
      craft_zh: '【占位】太和殿采用重檐庑殿顶，是中国古建筑中等级最高的屋顶形式。',
      science_zh: '【占位】庑殿顶的坡度经过精密计算，既利于排水，又显得庄重雄伟。',
      culture_zh: '【占位】黄色琉璃瓦是皇家专用，象征至高无上的皇权。'
    },
    xumizuo: {
      name_zh: '须弥座',
      name_en: 'Sumeru Base',
      pinyin: 'xū mí zuò',
      craft_zh: '【占位】须弥座是太和殿的高大台基，由汉白玉砌成，分三层，俗称"三台"。',
      science_zh: '【占位】台基逐层内收，形成稳定的金字塔形结构，增强建筑稳定性。',
      culture_zh: '【占位】须弥座源自佛教中的须弥山，象征神圣与稳固。'
    },
    jinzhuan: {
      name_zh: '金砖/琉璃瓦',
      name_en: 'Golden Bricks / Glazed Tiles',
      pinyin: 'jīn zhuān / liú lí wǎ',
      craft_zh: '【占位】金砖产自苏州，质地细腻、敲击有金属声。琉璃瓦产自琉璃窑，色彩鲜艳。',
      science_zh: '【占位】金砖吸水率极低，铺地光滑如镜。琉璃瓦表面釉料防水防腐。',
      culture_zh: '【占位】"金砖"并非真金，而是工艺昂贵如金的砖，体现皇家奢华。'
    }
  };

  let activeComponent = null;

  function init() {
    setupComponentButtons();
    setupTabs();
    console.log('[TaiheDian] 模块初始化完成');
  }

  function setupComponentButtons() {
    document.querySelectorAll('.comp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const compId = btn.dataset.component;
        showComponent(compId);

        // 更新按钮高亮状态
        document.querySelectorAll('.comp-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  function showComponent(compId) {
    const comp = COMPONENTS[compId];
    if (!comp) return;
    activeComponent = compId;

    // 切换到第一个标签页
    activateTab('craft');

    // 填充内容
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

    // 显示面板内容
    const panelEmpty = document.getElementById('comp-panel-empty');
    const panelContent = document.getElementById('comp-panel-content');
    if (panelEmpty) panelEmpty.classList.add('hidden');
    if (panelContent) panelContent.classList.remove('hidden');
  }

  function setupTabs() {
    document.querySelectorAll('.comp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activateTab(tab.dataset.tab);
      });
    });
  }

  function activateTab(tab) {
    document.querySelectorAll('.comp-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    const cards = ['craft', 'science', 'culture'];
    cards.forEach(card => {
      const el = document.getElementById('card-' + card);
      if (el) el.classList.toggle('hidden', card !== tab);
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init };
})();
