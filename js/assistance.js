const CONFIG = {
    // ✏️ 修改唤醒词（填你想要的名字）
    wakeName: '助手',
    wakeWord: '你好助手',
  
    // ✏️ 通义千问 API 代理地址（你的后端代理）
    apiEndpoint: '/api/chat',
  
    // ✏️ 助手的系统提示词
    systemPrompt: `你是一个古建筑领域的AI语音助手，内嵌于古建筑介绍网页中。
  你的职责是：
  1. 根据当前页面的古建筑内容，回答用户的问题
  2. 用专业但通俗易懂的语言讲解古建筑知识
  3. 回答要简洁（控制在100字以内），适合语音朗读
  4. 语气亲切自然，像一位博学的导游
  
  当前页面内容会在对话中提供给你。`,
  
    // ✏️ 语音合成设置
    ttsLang: 'zh-CN',
    ttsRate: 1.0,
    ttsPitch: 1.0,
  
    // ✏️ 猜你想问：生成几个推荐问题
    suggestCount: 3,
  
    // 多语言配置
    languageConfig: {
      'zh-CN': {
        wakeName: '助手',
        wakeWord: '你好助手',
        systemPrompt: `你是一个古建筑领域的AI语音助手，内嵌于古建筑介绍网页中。
  你的职责是：
  1. 根据当前页面的古建筑内容，回答用户的问题
  2. 用专业但通俗易懂的语言讲解古建筑知识
  3. 回答要简洁（控制在100字以内），适合语音朗读
  4. 语气亲切自然，像一位博学的导游
  
  当前页面内容会在对话中提供给你。`,
        ttsLang: 'zh-CN',
        placeholder: '点击输入或按住麦克风说话...',
        statusListening: '正在聆听...',
        statusProcessing: '正在思考...',
        statusSpeaking: '正在回答...',
        statusReady: '点击说话',
        suggestions: ['这个建筑有什么历史？', '建筑特色是什么？', '可以介绍一下吗？']
      },
      'en-US': {
        wakeName: 'Assistant',
        wakeWord: 'Hello Assistant',
        systemPrompt: `You are an AI voice assistant specialized in ancient architecture, embedded in a heritage website.
  Your responsibilities:
  1. Answer user questions based on the current page's ancient architecture content
  2. Explain architectural knowledge in professional but easy-to-understand language
  3. Keep answers concise (within 100 words), suitable for voice reading
  4. Use a friendly, natural tone like a knowledgeable tour guide
  
  Current page content will be provided in the conversation.`,
        ttsLang: 'en-US',
        placeholder: 'Type or hold mic to speak...',
        statusListening: 'Listening...',
        statusProcessing: 'Thinking...',
        statusSpeaking: 'Speaking...',
        statusReady: 'Click to speak',
        suggestions: ['What is the history of this building?', 'What are the architectural features?', 'Can you tell me more?']
      }
    }
  };
  
  
  // ===== State =====
  const state = {
    isOpen: false,
    isListening: false,
    isWakeListening: false,
    isSpeaking: false,
    isProcessing: false,
    chatHistory: [],
    recognition: null,
    wakeRecognition: null,
    synth: window.speechSynthesis,
    pageContent: '',
    wakeActivated: false,
  };
  
  
  // ===== DOM Elements =====
  const $ = id => document.getElementById(id);
  const trigger = $('voice-assistant-trigger');
  const panel = $('voice-assistant-panel');
  const chatArea = $('ast-chat');
  const textInput = $('ast-input');
  const sendBtn = $('ast-send');
  const micBtn = $('ast-mic');
  const closeBtn = $('ast-close');
  const statusEl = $('ast-status');
  const nameEl = $('ast-name');
  const waveform = $('ast-waveform');
  
  
  // ===== Initialize =====
  function init() {
    updateLanguageConfig();
    nameEl.textContent = CONFIG.wakeName;
    extractPageContent();
    setupEventListeners();
  }
  
  // ===== Update Language Config =====
  function updateLanguageConfig() {
    const currentLang = I18N ? I18N.getCurrentLanguage() : 'zh-CN';
    const langConfig = CONFIG.languageConfig[currentLang] || CONFIG.languageConfig['zh-CN'];
    
    // 更新配置
    CONFIG.wakeName = langConfig.wakeName;
    CONFIG.wakeWord = langConfig.wakeWord;
    CONFIG.systemPrompt = langConfig.systemPrompt;
    CONFIG.ttsLang = langConfig.ttsLang;
    
    // 更新UI文本
    if (textInput) textInput.placeholder = langConfig.placeholder;
    if (statusEl) statusEl.textContent = langConfig.statusReady;
    
    // 更新建议问题
    if (state.isOpen) {
      updateSuggestions(langConfig.suggestions);
    }
  }
  
  
  // ===== Extract Page Content =====
  function extractPageContent() {
    const pageEl = document.getElementById('page-content');
    if (pageEl) {
      state.pageContent = pageEl.innerText.substring(0, 2000);
    } else {
      // Fallback: grab main content area
      const main = document.querySelector('main, article, .content, .main');
      if (main) {
        state.pageContent = main.innerText.substring(0, 2000);
      } else {
        state.pageContent = document.body.innerText.substring(0, 2000);
      }
    }
  }
  
  
  // ===== Event Listeners =====
  function setupEventListeners() {
    let pressTimer = null;
    let isLongPress = false;
    let pressStartTime = 0;
  
    trigger.addEventListener('mousedown', () => {
      pressStartTime = Date.now();
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        if (!state.isOpen) openPanel();
        startVoiceInput();
      }, 500);
    });
  
    trigger.addEventListener('mouseup', (e) => {
      clearTimeout(pressTimer);
      e.preventDefault();
      if (isLongPress) {
        stopVoiceInput();
      } else if (Date.now() - pressStartTime < 500) {
        togglePanel();
      }
      isLongPress = false;
    });
  
    trigger.addEventListener('mouseleave', () => {
      clearTimeout(pressTimer);
      if (isLongPress) {
        stopVoiceInput();
        isLongPress = false;
      }
    });
  
    trigger.addEventListener('touchstart', (e) => {
      e.preventDefault();
      pressStartTime = Date.now();
      isLongPress = false;
      pressTimer = setTimeout(() => {
        isLongPress = true;
        if (!state.isOpen) openPanel();
        startVoiceInput();
      }, 500);
    });
  
    trigger.addEventListener('touchend', (e) => {
      e.preventDefault();
      clearTimeout(pressTimer);
      if (isLongPress) {
        stopVoiceInput();
      } else if (Date.now() - pressStartTime < 500) {
        togglePanel();
      }
      isLongPress = false;
    });
  }
  
  
  // ===== Panel Toggle =====
  function togglePanel() {
    // 首次点击时激活唤醒词监听
    if (!state.wakeActivated) {
      state.wakeActivated = true;
      startWakeWordListening();
    }
  
    if (state.isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }
  
  function openPanel() {
    state.isOpen = true;
    panel.style.display = 'flex';
    requestAnimationFrame(() => panel.classList.add('show'));
    trigger.classList.add('active');
    setStatus('就绪');
  
    if (chatArea.children.length === 0) {
      showWelcome();
    }
  }
  
  function closePanel() {
    state.isOpen = false;
    panel.classList.remove('show');
    trigger.classList.remove('active');
    stopSpeaking();
    setTimeout(() => { panel.style.display = 'none'; }, 350);
  }
  
  
  // ===== Welcome & Suggestions =====
  function showWelcome() {
    addMessage('assistant', `你好！我是${CONFIG.wakeName}，你的古建筑智能讲解员。我已读取了当前页面内容，以下是你可能感兴趣的问题：`);
    generateSuggestions();
  }
  
  function generateSuggestions() {
    // Parse page content to generate relevant suggestions
    const suggestions = extractSuggestedQuestions(state.pageContent);
    
    const container = document.createElement('div');
    container.className = 'ast-suggestions';
  
    suggestions.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'ast-suggest-btn';
      btn.textContent = q;
      btn.addEventListener('click', () => {
        container.remove();
        sendMessage(q);
      });
      container.appendChild(btn);
    });
  
    chatArea.appendChild(container);
    scrollToBottom();
  }
  
  // ===== Screen Capture for Context =====
  async function captureScreen() {
    try {
      // Use html2canvas to capture the visible scene
      if (typeof html2canvas !== 'undefined') {
        const scenesContainer = document.getElementById('scenes-container');
        if (scenesContainer && !scenesContainer.classList.contains('hidden')) {
          const canvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#1a1714',
            logging: false,
            scale: 0.5 // Reduce for faster processing
          });
          return canvas.toDataURL('image/jpeg', 0.6);
        }
      }
    } catch (err) {
      console.warn('Screen capture failed:', err);
    }
    return null;
  }

  // ===== Enhanced Question Generation =====
  function extractSuggestedQuestions(content, currentLang = 'zh-CN') {
    const questions = [];
    
    // Extract key elements from current scene
    const activeScene = document.querySelector('.scene.active');
    let sceneTitle = '';
    let sceneTime = '';
    let sceneDesc = '';
    
    if (activeScene) {
      const titleEl = activeScene.querySelector('.scene-title');
      const timeEl = activeScene.querySelector('.scene-time');
      const descEl = activeScene.querySelector('.scene-desc');
      sceneTitle = titleEl?.textContent || '';
      sceneTime = timeEl?.textContent || '';
      sceneDesc = descEl?.textContent || '';
    }

    // Question templates based on language and context
    const templates = currentLang === 'zh-CN' ? {
      history: ['这座建筑有着怎样的历史背景？', '这个时辰的活动从什么时候开始成为传统的？', '这段历史可以追溯到哪个朝代？'],
      features: ['这个场景有哪些独特的建筑特色？', '画面中的建筑有什么特别之处？', '这里的设计蕴含了什么文化寓意？'],
      culture: ['皇帝在这个时辰通常会做什么？', '这种习俗背后有什么含义？', '宫廷生活的这一面反映了什么？'],
      architecture: ['建筑的结构是怎样的？', '为什么要这样设计布局？', '这种建筑风格有什么讲究？'],
      story: ['有什么有趣的宫廷故事？', '这背后有什么典故吗？', '有什么鲜为人知的历史细节？']
    } : {
      history: ['What is the historical background of this building?', 'When did this tradition begin?', 'Which dynasty does this history date back to?'],
      features: ['What are the unique architectural features here?', 'What makes this scene special?', 'What cultural symbolism does the design convey?'],
      culture: ['What would the emperor typically do during this hour?', 'What is the meaning behind this custom?', 'What does this aspect of palace life reflect?'],
      architecture: ['What is the structure of this building?', 'Why was this layout designed this way?', 'What are the conventions of this architectural style?'],
      story: ['Are there any interesting palace stories?', 'What is the historical anecdote behind this?', 'What little-known historical details can you share?']
    };

    // Build context-aware questions
    if (sceneTitle) {
      // Add questions about the current scene title
      questions.push(currentLang === 'zh-CN' 
        ? `关于"${sceneTitle}"有什么值得了解的吗？` 
        : `What should I know about "${sceneTitle}"?`);
    }
    
    if (sceneDesc) {
      // Add questions about the scene description
      questions.push(currentLang === 'zh-CN'
        ? `能否详细介绍一下${sceneDesc.substring(0, 10)}...`
        : `Could you tell me more about ${sceneDesc.substring(0, 15)}...`);
    }

    // Add random questions from templates
    const allTemplateQuestions = [
      ...templates.history,
      ...templates.features,
      ...templates.culture,
      ...templates.architecture,
      ...templates.story
    ];

    // Shuffle and pick unique questions
    const shuffled = allTemplateQuestions.sort(() => Math.random() - 0.5);
    const uniqueQuestions = shuffled.filter(q => 
      !questions.some(existing => existing.includes(q.substring(0, 10)))
    );

    // Add 2-3 more random questions
    const additionalCount = Math.min(3, uniqueQuestions.length);
    for (let i = 0; i < additionalCount; i++) {
      questions.push(uniqueQuestions[i]);
    }

    // Shuffle final questions
    return questions.sort(() => Math.random() - 0.5).slice(0, CONFIG.suggestCount);
  }

  function generateSuggestions() {
    // Extract and generate context-aware suggestions
    const currentLang = I18N ? I18N.getCurrentLanguage() : 'zh-CN';
    const suggestions = extractSuggestedQuestions(state.pageContent, currentLang);
    
    const container = document.createElement('div');
    container.className = 'ast-suggestions';

    suggestions.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'ast-suggest-btn';
      btn.textContent = q;
      btn.addEventListener('click', () => {
        container.remove();
        sendMessage(q);
      });
      container.appendChild(btn);
    });

    chatArea.appendChild(container);
    scrollToBottom();
  }

  function extractSuggestedQuestions_Old(content) {
    // Legacy function - kept for reference
    const questions = [];
    
    if (content.includes('太和殿') || content.includes('故宫')) {
      questions.push('🏛 太和殿的屋顶为什么是最高等级的？');
      questions.push('🐉 殿顶上的走兽有什么讲究？');
      questions.push('🧱 什么是"金砖"，为什么叫这个名字？');
    } else {
      // Generic architecture questions
      questions.push('🏛 这座建筑的历史有多久？');
      questions.push('🔨 它采用了什么建筑结构？');
      questions.push('🎨 有哪些特色的装饰艺术？');
    }

    return questions.slice(0, CONFIG.suggestCount);
  }
  
  
  // ===== Message Handling =====
  function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `ast-msg ${role}`;
    div.textContent = text;
    chatArea.appendChild(div);
    scrollToBottom();
    return div;
  }
  
  function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'ast-msg assistant';
    div.id = 'ast-typing';
    div.innerHTML = '<div class="ast-typing"><span></span><span></span><span></span></div>';
    chatArea.appendChild(div);
    scrollToBottom();
    return div;
  }
  
  function removeTypingIndicator() {
    const el = $('ast-typing');
    if (el) el.remove();
  }
  
  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }
  
  
  // ===== Send Message =====
  function handleSend() {
    const text = textInput.value.trim();
    if (!text || state.isProcessing) return;
    textInput.value = '';
    sendBtn.disabled = true;
    sendMessage(text);
  }
  
  async function sendMessage(text) {
    addMessage('user', text);
    state.chatHistory.push({ role: 'user', content: text });
    state.isProcessing = true;
    setStatus('思考中...');
  
    addTypingIndicator();
  
    try {
      const reply = await callAI(text);
      removeTypingIndicator();
      addMessage('assistant', reply);
      state.chatHistory.push({ role: 'assistant', content: reply });
      speak(reply);
    } catch (err) {
      removeTypingIndicator();
      addMessage('system', '抱歉，网络似乎出了点问题，请稍后再试');
      console.error('AI Error:', err);
    }
  
    state.isProcessing = false;
    setStatus('就绪');
  }
  
  
  // ===== AI API Call (via proxy) =====
  async function callAI(userMessage) {
    const messages = [
      {
        role: 'system',
        content: CONFIG.systemPrompt + `\n\n【当前页面内容】\n${state.pageContent}`
      },
      ...state.chatHistory.slice(-10) // Keep last 10 messages for context
    ];
  
    try {
      const res = await fetch(CONFIG.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen-turbo',
          messages: messages,
        }),
      });
  
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
  
      // 通义千问 API response format
      if (data.choices && data.choices[0]) {
        return data.choices[0].message.content;
      }
      if (data.output && data.output.text) {
        return data.output.text;
      }
  
      throw new Error('Unexpected response format');
    } catch (err) {
      console.error('API call failed:', err);
      // Fallback: local demo response
      return generateLocalResponse(userMessage);
    }
  }
  
  // Local fallback for demo (when no API is connected)
  function generateLocalResponse(question) {
    const qa = {
      '屋顶': '太和殿采用重檐庑殿顶，是中国古建筑中等级最高的屋顶形式。只有最重要的皇家建筑才能使用此规格，象征着至高无上的皇权。',
      '走兽': '太和殿垂脊上排列着仙人和十个走兽，这是中国古建筑中最多的。从前到后依次是：龙、凤、狮子、天马、海马、狻猊、押鱼、獬豸、斗牛、行什。数量越多代表等级越高。',
      '金砖': '"金砖"并非真的黄金制成，而是一种特殊的细料方砖。因产自苏州，需经过复杂工艺烧制，质地坚硬、光滑如镜，敲击时发出金属般声响，加之工艺昂贵，故称"金砖"。',
      '历史': '太和殿始建于明永乐十八年（1420年），现存建筑为清康熙三十四年（1695年）重建，距今超过三百年。历史上多次遭遇火灾和重建。',
      '面积': '太和殿面阔十一间，进深五间，建筑面积2377平方米，高35.05米，是中国现存最大的木结构大殿。',
      '柱子': '太和殿内有72根大柱，其中6根为沥粉贴金蟠龙柱，环绕在皇帝宝座周围，极为壮观。',
    };
  
    for (const [key, answer] of Object.entries(qa)) {
      if (question.includes(key)) return answer;
    }
  
    return `这是一个很好的问题！太和殿作为中国古建筑的最高典范，有着非常丰富的历史和建筑细节。如需了解更多，请尝试问我关于屋顶、走兽、金砖等具体方面的问题。`;
  }
  
  
  // ===== Voice Recognition =====
  function setupRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech Recognition not supported');
      return null;
    }
  
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';
    recognition.maxAlternatives = 1;
  
    return recognition;
  }
  
  function toggleVoiceInput() {
    if (state.isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }
  
  function startVoiceInput() {
    if (state.isProcessing || state.isSpeaking) return;
    stopSpeaking();
  
    const recognition = setupRecognition();
    if (!recognition) {
      addMessage('system', '您的浏览器不支持语音识别，请使用文字输入');
      return;
    }
  
    state.recognition = recognition;
    state.isListening = true;
    micBtn.classList.add('recording');
    waveform.classList.add('active');
    textInput.style.display = 'none';
    setStatus('正在聆听...');
    trigger.classList.add('listening');
  
    let finalTranscript = '';
  
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setStatus(interim || finalTranscript || '正在聆听...');
    };
  
    recognition.onend = () => {
      state.isListening = false;
      micBtn.classList.remove('recording');
      waveform.classList.remove('active');
      textInput.style.display = '';
      trigger.classList.remove('listening');
  
      if (finalTranscript.trim()) {
        setStatus('就绪');
        sendMessage(finalTranscript.trim());
      } else {
        setStatus('未检测到语音');
        setTimeout(() => setStatus('就绪'), 1500);
      }
    };
  
    recognition.onerror = (e) => {
      console.error('Recognition error:', e.error);
      state.isListening = false;
      micBtn.classList.remove('recording');
      waveform.classList.remove('active');
      textInput.style.display = '';
      trigger.classList.remove('listening');
  
      if (e.error === 'not-allowed') {
        addMessage('system', '请允许麦克风权限后再试');
      }
      setStatus('就绪');
    };
  
    recognition.start();
  }
  
  function stopVoiceInput() {
    if (state.recognition) {
      state.recognition.stop();
    }
  }
  
  
  // ===== Wake Word Detection =====
  function startWakeWordListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Wake word detection not available');
      return;
    }
  
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const wake = new SpeechRecognition();
    wake.continuous = true;
    wake.interimResults = true;
    wake.lang = 'zh-CN';
  
    state.wakeRecognition = wake;
    state.isWakeListening = true;
  
    wake.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().replace(/\s/g, '');
        if (transcript.includes(CONFIG.wakeWord.replace(/\s/g, ''))) {
          console.log('Wake word detected!');
          wake.stop();
          state.isWakeListening = false;
  
          if (!state.isOpen) {
            openPanel();
          }
          // Auto start voice input after wake
          setTimeout(() => startVoiceInput(), 500);
          return;
        }
      }
    };
  
    wake.onend = () => {
      // Restart if still in wake mode and panel is closed
      if (state.isWakeListening && !state.isOpen) {
        setTimeout(() => {
          try { wake.start(); } catch(e) { /* ignore */ }
        }, 300);
      }
    };
  
    wake.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') {
        console.log('Wake recognition paused:', e.error);
        // Retry after delay
        setTimeout(() => {
          if (state.isWakeListening) {
            try { wake.start(); } catch(e) { /* ignore */ }
          }
        }, 2000);
      }
    };
  
    try {
      wake.start();
    } catch(e) {
      console.log('Could not start wake word listening:', e);
    }
  }
  
  function restartWakeListening() {
    if (state.wakeRecognition && !state.isOpen) {
      state.isWakeListening = true;
      try { state.wakeRecognition.start(); } catch(e) { /* ignore */ }
    }
  }
  
  
  // ===== Text-to-Speech =====
  function speak(text) {
    stopSpeaking();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = CONFIG.ttsLang;
    utterance.rate = CONFIG.ttsRate;
    utterance.pitch = CONFIG.ttsPitch;
  
    // Try to find a Chinese voice
    const voices = state.synth.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;
  
    utterance.onstart = () => {
      state.isSpeaking = true;
      setStatus('正在朗读...');
    };
  
    utterance.onend = () => {
      state.isSpeaking = false;
      setStatus('就绪');
    };
  
    state.synth.speak(utterance);
  }
  
  function stopSpeaking() {
    if (state.synth.speaking) {
      state.synth.cancel();
      state.isSpeaking = false;
    }
  }
  
  
  // ===== Helpers =====
  function setStatus(text) {
    statusEl.textContent = text;
  }
  
  
  // ===== Panel close → restart wake =====
  const origClose = closePanel;
  closePanel = function() {
    origClose();
    setTimeout(restartWakeListening, 500);
  };
  
  
  // ===== Boot =====
  document.addEventListener('DOMContentLoaded', init);
  
  // Preload voices
  if (state.synth.onvoiceschanged !== undefined) {
    state.synth.onvoiceschanged = () => state.synth.getVoices();
  }