/* ==========================================
   皇城·万象 · 双语切换
   ========================================== */

const I18N = (() => {

  const translations = {
    'zh-CN': {
      // === 首页 ===
      site_title: "皇城·万象",
      site_desc: "故宫古建筑智慧交互可视化平台",
      hero_badge: "故宫古建筑智慧交互可视化平台",
      footer_tip: "支持手势控制 · 中英双语 · AI导览",

      // === 模块入口 ===
      mod1_title: "建筑档案",
      mod1_desc: "探索故宫20座核心建筑的身份档案",
      mod2_title: "重点解读",
      mod2_desc: "解剖四座建筑的构件智慧与互动游戏",
      mod3_title: "文化密码",
      mod3_desc: "中轴线、阴阳五行、风水与数字密码",

      // === 通用导航 ===
      back_home: "← 返回首页",
      back_archive: "← 返回建筑档案",
      gesture_on: "手势控制已开启",
      gesture_off: "手势控制已关闭",

      // === 模块一：建筑档案 ===
      click_building: "👆 点击地图上的建筑查看档案",
      explore_wisdom: "探索建筑智慧 →",
      tab_archive: "档案卡",
      tab_events: "事件卡",
      label_area: "区域",
      label_function: "功能",
      label_rank: "等级",
      label_roof: "屋顶形制",
      label_built: "建造年代",
      label_material: "材料来源",
      archive_title: "建筑档案",
      archive_title_en: "Building Archive",

      // === 模块二：重点建筑 ===
      click_component: "👆 点击左侧构件按钮查看详情",
      tab_craft: "形制与工艺",
      tab_science: "物理与数学",
      tab_culture: "文化与符号",

      // === 构件名称 ===
      comp_jishou: "脊兽",
      comp_dougong: "斗拱",
      comp_caihui: "彩画",
      comp_wuding: "屋顶",
      comp_xumizuo: "须弥座",
      comp_jinzhuan: "金砖/琉璃瓦",
      comp_wumian: "多重檐复合屋面",
      comp_sunmao: "榫卯结构",
      comp_gongquan: "拱券结构",
      comp_zhuanshi: "城台砖石",
      comp_buju: "凹形布局",
      comp_liuli: "琉璃拼接工艺",
      comp_youcai: "琉璃釉彩",
      comp_longwen: "龙纹文化",

      // === 小游戏 ===
      game_start: "开始游戏",
      game_restart: "重新开始",
      game_hint: "提示",
      game_stack_title: "🎮 斗拱叠叠乐",
      game_tower_title: "🎮 积木塔挑战",
      game_passage_title: "🎮 御道迷宫",
      game_mosaic_title: "🎮 九龙壁拼图",

      // === 模块三：文化密码 ===
      nav_axis: "中轴线",
      nav_yinyang: "阴阳五行",
      nav_fengshui: "风水格局",
      nav_numbers: "数字密码",
      nav_colors: "色彩等级",

      axis_title: "中轴线——天下之脊",
      yinyang_title: "阴阳五行——建筑中的宇宙观",
      fengshui_title: "风水格局——藏风聚气的空间哲学",
      numbers_title: "数字密码——藏在建筑里的数学",
      colors_title: "色彩与等级——看得见的权力",

      // === 建筑名称 ===
      building_taihedian: "太和殿",
      building_zhonghedian: "中和殿",
      building_baohedian: "保和殿",
      building_jiaolou: "角楼",
      building_wumen: "午门",
      building_jiulongbi: "九龙壁",
      building_qianqinggong: "乾清宫",
      building_kunninggong: "坤宁宫",
      building_shenwumen: "神武门",
      building_duanmen: "端门",
      building_taiyimen: "太和门",
      building_wuyingdian: "武英殿",
      building_wenhuadian: "文华殿",
      building_yangxindian: "养心殿",
      building_gongguofeng: "宫后宫",
      building_chengqianmen: "承乾门",
      building_xuandemen: "玄德门",
      building_chengtianmen: "承天门",
      building_taimiao: "太庙",
      building_lingfei: "社稷坛",

      // === 占位提示 ===
      placeholder_map: "【占位】请在这里插入故宫俯视总览图",
      placeholder_building_img: "【占位】建筑实物图",
      placeholder_component_img: "【占位】构件图片",
      placeholder_craft_text: "【占位】形制与工艺内容，后期自己填写",
      placeholder_science_text: "【占位】物理与数学内容，后期自己填写",
      placeholder_culture_text: "【占位】文化与符号内容，后期自己填写",
      placeholder_trivia: "【占位】趣闻内容",
      placeholder_event: "【占位】事件内容由JS动态填充",
      placeholder_visual: "【占位】可视化区域",
      placeholder_text: "【占位】文字内容，后期填写",
      placeholder_table: "【占位】表格数据",
    },

    'en-US': {
      // === 首页 ===
      site_title: "Imperial City · Grand Panorama",
      site_desc: "Interactive Visualization Platform for Architectural Wisdom of the Forbidden City",
      hero_badge: "Interactive Visualization Platform for Architectural Wisdom of the Forbidden City",
      footer_tip: "Gesture Control · Bilingual · AI Guide",

      // === 模块入口 ===
      mod1_title: "Building Archive",
      mod1_desc: "Explore archives of 20 core buildings",
      mod2_title: "Deep Exploration",
      mod2_desc: "Dissect 4 buildings: components, science & games",
      mod3_title: "Cultural Code",
      mod3_desc: "Central axis, Yin-Yang, Feng Shui & number codes",

      // === 通用导航 ===
      back_home: "← Home",
      back_archive: "← Back to Archive",
      gesture_on: "Gesture control ON",
      gesture_off: "Gesture control OFF",

      // === 模块一：建筑档案 ===
      click_building: "👆 Click a building to view its archive",
      explore_wisdom: "Explore Wisdom →",
      tab_archive: "Archive",
      tab_events: "Events",
      label_area: "Area",
      label_function: "Function",
      label_rank: "Rank",
      label_roof: "Roof Type",
      label_built: "Built",
      label_material: "Materials",
      archive_title: "Building Archive",
      archive_title_en: "Building Archive",

      // === 模块二：重点建筑 ===
      click_component: "👆 Click a component button for details",
      tab_craft: "Form & Craft",
      tab_science: "Science & Math",
      tab_culture: "Culture & Symbol",

      // === 构件名称 ===
      comp_jishou: "Ridge Beasts",
      comp_dougong: "Bracket Sets",
      comp_caihui: "Painted Decoration",
      comp_wuding: "Roof",
      comp_xumizuo: "Sumeru Base",
      comp_jinzhuan: "Golden Bricks / Glazed Tiles",
      comp_wumian: "Multi-eaved Roof",
      comp_sunmao: "Mortise-Tenon Joint",
      comp_gongquan: "Arch Structure",
      comp_zhuanshi: "Masonry Work",
      comp_buju: "Concave Layout",
      comp_liuli: "Glazed Tile Craft",
      comp_youcai: "Glaze Chemistry",
      comp_longwen: "Dragon Pattern Culture",

      // === 小游戏 ===
      game_start: "Start Game",
      game_restart: "Restart",
      game_hint: "Hint",
      game_stack_title: "🎮 Dougong Stack",
      game_tower_title: "🎮 Tower Block",
      game_passage_title: "🎮 Imperial Maze",
      game_mosaic_title: "🎮 Dragon Mosaic",

      // === 模块三：文化密码 ===
      nav_axis: "Central Axis",
      nav_yinyang: "Yin-Yang & Five Elements",
      nav_fengshui: "Feng Shui",
      nav_numbers: "Number Codes",
      nav_colors: "Color Hierarchy",

      axis_title: "Central Axis — The Spine of the World",
      yinyang_title: "Yin-Yang & Five Elements — Cosmic View in Architecture",
      fengshui_title: "Feng Shui — Philosophy of Wind and Water",
      numbers_title: "Number Codes — Mathematics Hidden in Architecture",
      colors_title: "Color & Hierarchy — Visible Power",

      // === 建筑名称 ===
      building_taihedian: "Hall of Supreme Harmony",
      building_zhonghedian: "Hall of Central Harmony",
      building_baohedian: "Hall of Preserving Harmony",
      building_jiaolou: "Corner Tower",
      building_wumen: "Meridian Gate",
      building_jiulongbi: "Nine Dragon Wall",
      building_qianqinggong: "Palace of Heavenly Purity",
      building_kunninggong: "Palace of Earthly Tranquility",
      building_shenwumen: "Gate of Divine Might",
      building_duanmen: "Gate of Correct Deportment",
      building_taiyimen: "Gate of Supreme Harmony",
      building_wuyingdian: "Hall of Military Eminence",
      building_wenhuadian: "Hall of Literary Glory",
      building_yangxindian: "Hall of Mental Cultivation",
      building_gongguofeng: "Palace of Gongguofeng",
      building_chengqianmen: "Gate of Chengqian",
      building_xuandemen: "Gate of Xuande",
      building_chengtianmen: "Gate of Chengtian",
      building_taimiao: "Imperial Ancestral Temple",
      building_lingfei: "Altar of Land and Grain",

      // === 占位提示 ===
      placeholder_map: "【Placeholder】Insert the Forbidden City aerial view here",
      placeholder_building_img: "【Placeholder】Building photo",
      placeholder_component_img: "【Placeholder】Component image",
      placeholder_craft_text: "【Placeholder】Form and craft content — fill in later",
      placeholder_science_text: "【Placeholder】Science and math content — fill in later",
      placeholder_culture_text: "【Placeholder】Culture and symbol content — fill in later",
      placeholder_trivia: "【Placeholder】Fun fact content",
      placeholder_event: "【Placeholder】Event content loaded by JS",
      placeholder_visual: "【Placeholder】Visualization area",
      placeholder_text: "【Placeholder】Text content — fill in later",
      placeholder_table: "【Placeholder】Table data",
    }
  };

  let currentLang = 'zh-CN';
  let isLanguageToggleInitialized = false;

  function getText(key) {
    const langData = translations[currentLang] || translations['zh-CN'];
    return langData[key] || key;
  }

  function switchLanguage(lang) {
    if (translations[lang]) {
      currentLang = lang;
      document.documentElement.lang = lang;
      updateAllTexts();
      return true;
    }
    return false;
  }

  function initLanguageToggle() {
    if (isLanguageToggleInitialized) return;
    isLanguageToggleInitialized = true;

    const langToggle = document.getElementById('language-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        const newLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN';
        switchLanguage(newLang);
      });
    }
  }

  function getCurrentLanguage() {
    return currentLang;
  }

  function updateAllTexts() {
    // 更新所有带 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = getText(key);
      if (text !== key) {
        el.textContent = text;
      }
    });

    // 更新语言切换按钮
    const langToggle = document.getElementById('language-toggle');
    if (langToggle) {
      langToggle.textContent = currentLang === 'zh-CN' ? '中文/EN' : 'EN/中文';
      langToggle.title = currentLang === 'zh-CN'
        ? '切换语言/Change Language'
        : 'Change Language/切换语言';
    }

    // 更新页面标题
    const titleEl = document.querySelector('.landing-title') || document.querySelector('.page-title');
    if (titleEl) {
      document.title = getText('site_title') + ' | Imperial City · Grand Panorama';
    }
  }

  // Auto-initialize language toggle when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    I18N.initLanguageToggle();
  });

  return {
    getText,
    switchLanguage,
    getCurrentLanguage,
    updateAllTexts,
    initLanguageToggle
  };
})();
