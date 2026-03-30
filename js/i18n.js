const I18N = (() => {
  const translations = {
    'zh-CN': {
      // 首页文本
      'title': '故宫十二时辰',
      'subtitle': '天子的一日 · 紫禁城的昼与夜',
      'enterBtn': '叩门而入',
      
      // 时辰场景
      'scenes': [
        {
          'time': '卯时',
          'period': '05:00 - 07:00',
          'title': '晨光初照',
          'desc': '天色微明，皇帝起身，晨读经史，焚香祭天。',
          'hotspots': ['晨读经史', '焚香祭天']
        },
        {
          'time': '辰时',
          'period': '07:00 - 09:00',
          'title': '御门听政',
          'desc': '百官列班，皇帝临朝，奏对国事，天下大政皆决于此。',
          'hotspots': ['太和殿早朝']
        },
        {
          'time': '巳时',
          'period': '09:00 - 11:00',
          'title': '勤政殿批',
          'desc': '退朝后入养心殿，批阅奏折，召见军机大臣。',
          'hotspots': ['养心殿奏折']
        },
        {
          'time': '午时',
          'period': '11:00 - 13:00',
          'title': '御膳珍馐',
          'desc': '传膳御膳房，百余道佳肴依礼陈列，天子独膳。',
          'hotspots': ['御膳房']
        },
        {
          'time': '申时',
          'period': '15:00 - 17:00',
          'title': '御园闲步',
          'desc': '移驾御花园，赏花观鱼，或于校场习射骑术。',
          'hotspots': ['御花园']
        },
        {
          'time': '酉时',
          'period': '17:00 - 19:00',
          'title': '晚膳听戏',
          'desc': '晚膳既毕，于漱芳斋听戏赏乐，丝竹悠扬。',
          'hotspots': ['漱芳斋听戏']
        },
        {
          'time': '戌时',
          'period': '19:00 - 21:00',
          'title': '灯下批阅',
          'desc': '掌灯时分，养心殿烛火通明，皇帝挑灯阅折。',
          'hotspots': ['养心殿批阅']
        },
        {
          'time': '亥时',
          'period': '21:00 - 23:00',
          'title': '宫灯渐灭',
          'desc': '夜深人静，宫灯次第熄灭，紫禁城归于沉寂。',
          'hotspots': ['就寝']
        }
      ],
      
      // 卡片内容
      'cards': {
        'morning-ritual': {
          'title': '晨读经史',
          'content': '皇帝每日清晨必读经史，以明治国之道。'
        },
        'sacrifice': {
          'title': '焚香祭天',
          'content': '皇帝亲自焚香祭天，祈求国泰民安。'
        },
        'court': {
          'title': '太和殿早朝',
          'content': '百官列班奏事，皇帝临朝听政。'
        },
        'memorial': {
          'title': '养心殿奏折',
          'content': '批阅各地呈报的奏折，处理国家大事。'
        },
        'cuisine': {
          'title': '御膳房',
          'content': '百余道精致菜肴，依礼制呈献。'
        },
        'garden': {
          'title': '御花园',
          'content': '赏花观鱼，休憩身心。'
        },
        'opera': {
          'title': '漱芳斋听戏',
          'content': '欣赏戏曲表演，陶冶性情。'
        },
        'night-work': {
          'title': '养心殿批阅',
          'content': '挑灯夜读奏折，勤政不辍。'
        },
        'sleep': {
          'title': '就寝',
          'content': '一日辛劳结束，安寝养神。'
        }
      }
    },
    
    'en-US': {
      // 首页文本
      'title': 'The Forbidden City: Twelve Hours',
      'subtitle': 'A Day in the Life of an Emperor',
      'enterBtn': 'Enter the Palace',
      
      // 时辰场景
      'scenes': [
        {
          'time': 'Mao Hour',
          'period': '05:00 - 07:00',
          'title': 'Dawn Breaks',
          'desc': 'At daybreak, the emperor rises, reads classics, and offers incense to heaven.',
          'hotspots': ['Morning Reading', 'Sacrifice to Heaven']
        },
        {
          'time': 'Chen Hour',
          'period': '07:00 - 09:00',
          'title': 'Imperial Audience',
          'desc': 'Officials line up, the emperor holds court, discussing state affairs.',
          'hotspots': ['Morning Court']
        },
        {
          'time': 'Si Hour',
          'period': '09:00 - 11:00',
          'title': 'State Affairs',
          'desc': 'After court, the emperor reviews memorials and meets ministers.',
          'hotspots': ['Memorial Review']
        },
        {
          'time': 'Wu Hour',
          'period': '11:00 - 13:00',
          'title': 'Imperial Cuisine',
          'desc': 'Hundreds of exquisite dishes served according to royal etiquette.',
          'hotspots': ['Imperial Kitchen']
        },
        {
          'time': 'Shen Hour',
          'period': '15:00 - 17:00',
          'title': 'Garden Stroll',
          'desc': 'Walking in the imperial garden, admiring flowers and fish.',
          'hotspots': ['Imperial Garden']
        },
        {
          'time': 'You Hour',
          'period': '17:00 - 19:00',
          'title': 'Evening Opera',
          'desc': 'After dinner, enjoying opera performances in Shufang Palace.',
          'hotspots': ['Opera Performance']
        },
        {
          'time': 'Xu Hour',
          'period': '19:00 - 21:00',
          'title': 'Night Work',
          'desc': 'Working by lamplight, reviewing memorials late into the night.',
          'hotspots': ['Night Review']
        },
        {
          'time': 'Hai Hour',
          'period': '21:00 - 23:00',
          'title': 'Lights Out',
          'desc': 'As night deepens, palace lights extinguish one by one.',
          'hotspots': ['Retire to Bed']
        }
      ],
      
      // 卡片内容
      'cards': {
        'morning-ritual': {
          'title': 'Morning Reading',
          'content': 'The emperor reads classics every morning to understand governance.'
        },
        'sacrifice': {
          'title': 'Sacrifice to Heaven',
          'content': 'The emperor offers incense to heaven, praying for peace and prosperity.'
        },
        'court': {
          'title': 'Morning Court',
          'content': 'Officials present reports and the emperor holds audience.'
        },
        'memorial': {
          'title': 'Memorial Review',
          'content': 'Reviewing memorials from across the empire, handling state affairs.'
        },
        'cuisine': {
          'title': 'Imperial Kitchen',
          'content': 'Hundreds of exquisite dishes served with royal etiquette.'
        },
        'garden': {
          'title': 'Imperial Garden',
          'content': 'Admiring flowers and fish, resting body and mind.'
        },
        'opera': {
          'title': 'Opera Performance',
          'content': 'Enjoying traditional opera performances for cultural enrichment.'
        },
        'night-work': {
          'title': 'Night Review',
          'content': 'Working by lamplight, diligently reviewing state documents.'
        },
        'sleep': {
          'title': 'Retire to Bed',
          'content': 'End of a long day, resting for the next day\'s duties.'
        }
      }
    }
  };

  let currentLang = 'zh-CN';
  let isLanguageToggleInitialized = false;

  function getText(key, index = null) {
    if (index !== null && Array.isArray(translations[currentLang][key])) {
      return translations[currentLang][key][index];
    }
    return translations[currentLang][key];
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
    // 更新页面标题
    document.title = getText('title') + ' · ' + (currentLang === 'zh-CN' ? '皇帝的一天' : 'A Day in the Life of an Emperor');
    
    // 更新首页文本
    const landingTitle = document.querySelector('.landing-title');
    const landingSubtitle = document.querySelector('.landing-subtitle');
    const enterText = document.querySelector('.enter-text');
    
    if (landingTitle) landingTitle.textContent = getText('title');
    if (landingSubtitle) landingSubtitle.textContent = getText('subtitle');
    if (enterText) enterText.textContent = getText('enterBtn');
    
    // 更新场景文本
    const scenes = document.querySelectorAll('.scene');
    scenes.forEach((scene, index) => {
      const sceneData = getText('scenes', index);
      const timeEl = scene.querySelector('.scene-time');
      const periodEl = scene.querySelector('.scene-period');
      const titleEl = scene.querySelector('.scene-title');
      const descEl = scene.querySelector('.scene-desc');
      
      if (timeEl) timeEl.textContent = sceneData.time;
      if (periodEl) periodEl.textContent = sceneData.period;
      if (titleEl) titleEl.textContent = sceneData.title;
      if (descEl) descEl.textContent = sceneData.desc;
      
      // 更新热点标签
      const hotspots = scene.querySelectorAll('.hotspot-label');
      hotspots.forEach((hotspot, hotspotIndex) => {
        hotspot.textContent = sceneData.hotspots[hotspotIndex];
      });
    });
    
    // 更新语言切换按钮
    const langToggle = document.getElementById('language-toggle');
    if (langToggle) {
      langToggle.textContent = currentLang === 'zh-CN' ? '中文/EN' : 'EN/中文';
      langToggle.title = currentLang === 'zh-CN' ? '切换语言/Change Language' : 'Change Language/切换语言';
    }
  }

  return {
    getText,
    switchLanguage,
    getCurrentLanguage,
    updateAllTexts,
    initLanguageToggle
  };
})();

// Auto-initialize language toggle when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  I18N.initLanguageToggle();
});