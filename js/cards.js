/* ==========================================
   介绍卡片 · 点击热区弹出详情
   ========================================== */

   const Cards = (() => {

    // 卡片内容数据
    // 你可以在这里修改每张卡片的标题、描述、图片路径
    const cardData = {
      'morning-ritual': {
        title: '晨读经史',
        text: '清代皇帝每日卯时即起，先行洗漱更衣，而后于养心殿东暖阁诵读经书。康熙帝尤好学问，常于此时研读四书五经，朱批圈点，留下大量读书笔记。',
        image: '' // 后期填入图片路径
      },
      'sacrifice': {
        title: '焚香祭天',
        text: '每日清晨，皇帝需在乾清宫或坤宁宫行祭祀之礼，焚香祷告，祈求天下太平。遇重大祭日，则需前往天坛、地坛举行隆重祭典。',
        image: ''
      },
      'court': {
        title: '太和殿早朝',
        text: '辰时百官齐聚太和殿前广场，行三跪九叩之礼。皇帝端坐龙椅，听取各部奏报，裁决国事。早朝通常持续两个时辰，是一日中最为庄重的时刻。',
        image: ''
      },
      'memorial': {
        title: '养心殿批阅奏折',
        text: '自雍正帝始，养心殿成为皇帝日常理政之所。皇帝于此召见军机大臣，批阅来自全国的奏折。朱笔御批，一字千钧，关乎天下苍生。',
        image: ''
      },
      'cuisine': {
        title: '御膳房',
        text: '御膳房设于养心殿南侧，每日需备膳百余品。清代皇帝用膳讲究排场，菜品涵盖满汉两族风味，每道菜不过三匙，以防投毒。传膳时太监需先行试毒，方可御用。',
        image: ''
      },
      'garden': {
        title: '御花园漫步',
        text: '申时日头西斜，皇帝常移驾御花园散步。园中古柏参天，假山嶙峋，四季花卉争奇斗艳。钦安殿前的连理柏是帝后共赏之所，万春亭则是登高望远的佳处。',
        image: ''
      },
      'opera': {
        title: '漱芳斋听戏',
        text: '漱芳斋位于紫禁城东北隅，是宫中主要的看戏场所。酉时传膳之后，皇帝常于此处点戏观赏。京剧、昆曲轮番上演，丝竹管弦声声入耳，是天子难得的闲暇时光。',
        image: ''
      },
      'night-work': {
        title: '养心殿挑灯批折',
        text: '入夜之后，养心殿烛火通明。勤政的皇帝如雍正、乾隆，常于戌时继续批阅奏折，处理白日未竟之事。宫灯摇曳，笔走龙蛇，直至夜深方歇。',
        image: ''
      },
      'sleep': {
        title: '就寝',
        text: '亥时宫门落锁，紫禁城归于沉寂。皇帝于养心殿后殿就寝，四周宫女太监轮值守夜。宫灯次第熄灭，唯余月色如水，洒满琉璃瓦上。',
        image: ''
      }
    };
  
    function init() {
      // 绑定所有热区点击
      document.querySelectorAll('.hotspot').forEach((hotspot) => {
        hotspot.addEventListener('click', (e) => {
          e.stopPropagation();
          const cardId = hotspot.dataset.card;
          if (cardId && cardData[cardId]) {
            showCard(cardData[cardId]);
          }
        });
      });
  
      // 关闭卡片
      document.querySelector('.card-close')?.addEventListener('click', hideCard);
  
      // 点击遮罩关闭
      document.querySelector('.card-backdrop')?.addEventListener('click', hideCard);
  
      // ESC关闭
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideCard();
      });
    }
  
    function showCard(data) {
      const card = document.getElementById('info-card');
      const title = document.getElementById('card-title');
      const text = document.getElementById('card-text');
  
      if (!card || !title || !text) return;
  
      title.textContent = data.title;
      text.textContent = data.text;
  
      // 如果有图片
      const imgContainer = card.querySelector('.card-image');
      if (data.image) {
        imgContainer.innerHTML = `<img src="${data.image}" alt="${data.title}">`;
      } else {
        imgContainer.innerHTML = `<div class="card-image-placeholder">插图占位</div>`;
      }
  
      card.classList.remove('hidden', 'closing');
    }
  
    function hideCard() {
      const card = document.getElementById('info-card');
      if (!card || card.classList.contains('hidden')) return;
  
      card.classList.add('closing');
      setTimeout(() => {
        card.classList.add('hidden');
        card.classList.remove('closing');
      }, 300);
    }
  
    // 外部调用：通过手势打开卡片
    function openByGesture(cardId) {
      if (cardData[cardId]) {
        showCard(cardData[cardId]);
      }
    }
  
    return { init, showCard, hideCard, openByGesture };
  })();