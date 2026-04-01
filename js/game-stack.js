/* ==========================================
   斗拱叠叠乐 · Game Stack
   基于 Canvas 2D 的斗拱积木叠放游戏
   ========================================== */

const GameStack = (() => {

  const DOUGONG_SHAPES = [
    // 标准斗（方斗）
    { name: '方斗', width: 80, height: 40, color: '#8B7355', type: 'dou' },
    // 栌斗（宽斗）
    { name: '栌斗', width: 100, height: 50, color: '#9B8565', type: 'dou' },
    // 升（窄斗）
    { name: '升', width: 60, height: 35, color: '#7B6345', type: 'dou' },
    // 横栱（水平）
    { name: '横栱', width: 120, height: 20, color: '#A08060', type: 'gong', side: 'heng' },
    { name: '瓜子栱', width: 100, height: 18, color: '#B09070', type: 'gong', side: 'gong' },
    // 翘昂（斜向）
    { name: '昂', width: 140, height: 18, color: '#C0A080', type: 'gong', side: 'ang', tilted: true },
    { name: '翘', width: 130, height: 18, color: '#B8A090', type: 'gong', side: 'qiao', tilted: true },
  ];

  let canvas, ctx;
  let pieces = [];
  let currentPiece = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let score = 0;
  let gameOver = false;
  let animFrameId = null;
  let stackHeight = 0;
  let highestY = 0;
  let gameStarted = false;
  let lastFrameTime = 0;
  let particles = [];
  let comboCount = 0;

  const GRAVITY = 0.4;
  const SNAP_THRESHOLD = 15;
  const WIDTH = 600;
  const HEIGHT = 700;
  const BASE_Y = HEIGHT - 60;
  const BASE_WIDTH = 160;

  function init() {
    canvas = document.getElementById('game-canvas-stack');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const startBtn = document.getElementById('game-start-stack');
    const restartBtn = document.getElementById('game-restart-stack');
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (restartBtn) restartBtn.addEventListener('click', resetGame);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    // 手势事件
    canvas.addEventListener('gesture-drag', onGestureDrag);
    canvas.addEventListener('gesture-long-press', onLongPress);

    resetGame();
    draw();
  }

  function resetGame() {
    pieces = [];
    currentPiece = null;
    score = 0;
    gameOver = false;
    stackHeight = 0;
    highestY = BASE_Y;
    gameStarted = false;
    particles = [];
    comboCount = 0;
    updateScoreUI();
    draw();
  }

  function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    spawnNextPiece();
    lastFrameTime = performance.now();
    gameLoop();
  }

  function spawnNextPiece() {
    if (gameOver) return;
    const template = DOUGONG_SHAPES[Math.floor(Math.random() * DOUGONG_SHAPES.length)];
    const x = Math.random() * (WIDTH - template.width - 80) + 40;
    currentPiece = {
      ...template,
      x,
      y: -template.height - 10,
      vy: 0,
      settled: false,
      rotation: 0,
      targetY: Math.max(50, highestY - 60 - Math.random() * 40),
      swingDir: 1,
      swingSpeed: 1.5 + Math.random(),
      swingAngle: 0,
    };
  }

  function onMouseDown(e) {
    if (!gameStarted || !currentPiece || currentPiece.settled) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (WIDTH / rect.width);
    const my = (e.clientY - rect.top) * (HEIGHT / rect.height);
    if (isInsidePiece(mx, my)) {
      dragOffsetX = mx - currentPiece.x;
      dragOffsetY = my - currentPiece.y;
      currentPiece.vy = 0;
    }
  }

  function onMouseMove(e) {
    if (!currentPiece || !dragOffsetX) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (WIDTH / rect.width);
    currentPiece.x = Math.max(0, Math.min(WIDTH - currentPiece.width, mx - dragOffsetX));
    currentPiece.y = Math.max(-currentPiece.height, Math.min(highestY - currentPiece.height, mx - dragOffsetX < 0 ? mx - dragOffsetX : mx - dragOffsetX));
  }

  function onMouseUp(e) {
    if (!currentPiece || dragOffsetX === 0) return;
    settlePiece();
    dragOffsetX = 0;
    dragOffsetY = 0;
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      onMouseDown({ clientX: t.clientX, clientY: t.clientY });
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      onMouseMove({ clientX: t.clientX, clientY: t.clientY });
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    onMouseUp({});
  }

  function onGestureDrag(e) {
    if (!currentPiece) return;
    const dx = e.detail?.dx || 0;
    currentPiece.x = Math.max(0, Math.min(WIDTH - currentPiece.width, currentPiece.x + dx * 0.5));
  }

  function onLongPress(e) {
    if (!currentPiece) return;
    settlePiece();
  }

  function isInsidePiece(mx, my) {
    if (!currentPiece) return false;
    return mx >= currentPiece.x && mx <= currentPiece.x + currentPiece.width &&
           my >= currentPiece.y && my <= currentPiece.y + currentPiece.height;
  }

  function settlePiece() {
    if (!currentPiece) return;
    currentPiece.settled = true;
    pieces.push(currentPiece);

    // 计算与下方构件的重叠稳定性
    const stability = calculateStability(currentPiece);

    if (stability < 0.3) {
      comboCount = 0;
      gameOver = true;
      showFeedback('unstable', '叠放不稳！');
      return;
    }

    // 计分
    const baseScore = 10;
    const heightBonus = Math.floor((BASE_Y - currentPiece.y) / 20);
    const stabilityBonus = Math.floor(stability * 20);
    comboCount++;
    const comboBonus = comboCount > 1 ? comboCount * 5 : 0;
    const totalScore = baseScore + heightBonus + stabilityBonus + comboBonus;
    score += totalScore;

    highestY = Math.min(highestY, currentPiece.y);
    updateScoreUI();

    // 粒子效果
    spawnParticles(currentPiece.x + currentPiece.width / 2, currentPiece.y, currentPiece.color);

    if (comboCount > 1) {
      showFeedback('combo', `连击 x${comboCount}！+${totalScore}`);
    }

    currentPiece = null;
    setTimeout(() => {
      if (!gameOver) spawnNextPiece();
    }, 600);
  }

  function calculateStability(newPiece) {
    if (pieces.length === 0) return 1.0;
    const bottom = newPiece.y + newPiece.height;
    let supportArea = 0;
    for (const p of pieces) {
      const pTop = p.y;
      if (Math.abs(pTop - bottom) < 5) {
        const overlapLeft = Math.max(newPiece.x, p.x);
        const overlapRight = Math.min(newPiece.x + newPiece.width, p.x + p.width);
        if (overlapRight > overlapLeft) {
          supportArea += overlapRight - overlapLeft;
        }
      }
    }
    const stability = Math.min(1.0, supportArea / newPiece.width);
    return stability;
  }

  function spawnParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.025;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updateScoreUI() {
    const scoreEl = document.getElementById('game-score-stack');
    const highEl = document.getElementById('game-high-stack');
    if (scoreEl) scoreEl.textContent = score;
    const currentHigh = parseInt(localStorage.getItem('gamestack_high') || '0');
    if (score > currentHigh) {
      localStorage.setItem('gamestack_high', score);
      if (highEl) highEl.textContent = score;
    } else {
      if (highEl) highEl.textContent = currentHigh;
    }
  }

  function showFeedback(type, text) {
    const container = document.getElementById('game-feedback-stack');
    if (!container) return;
    container.textContent = text;
    container.className = `game-feedback show ${type}`;
    setTimeout(() => {
      container.className = 'game-feedback';
    }, 1800);
  }

  function gameLoop(timestamp = 0) {
    const dt = Math.min((timestamp - lastFrameTime) / 16.67, 3);
    lastFrameTime = timestamp;

    if (currentPiece && !dragOffsetX) {
      // 自动下落
      currentPiece.vy += GRAVITY * dt;
      currentPiece.y += currentPiece.vy * dt;
      // 摆动
      currentPiece.swingAngle += currentPiece.swingSpeed * 0.03 * currentPiece.swingDir;
      if (Math.abs(currentPiece.swingAngle) > 0.25) currentPiece.swingDir *= -1;
      // 悬停目标
      currentPiece.x += (currentPiece.targetX - currentPiece.x) * 0.02 * dt;

      // 碰撞检测
      const bottom = currentPiece.y + currentPiece.height;
      if (bottom >= BASE_Y) {
        currentPiece.y = BASE_Y - currentPiece.height;
        settlePiece();
      } else {
        for (const p of pieces) {
          const pTop = p.y;
          if (Math.abs(pTop - bottom) < 10 && p.y < currentPiece.y) {
            // 水平碰撞
            if (currentPiece.x + currentPiece.width > p.x && currentPiece.x < p.x + p.width) {
              if (bottom > pTop) {
                currentPiece.y = pTop - currentPiece.height;
                settlePiece();
              }
            }
          }
        }
      }
    }

    updateParticles(dt);
    draw();
    if (!gameOver || particles.length > 0) {
      animFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // 背景
    const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    grad.addColorStop(0, '#0d0a04');
    grad.addColorStop(1, '#1a1208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 背景格子线（古建筑梁架感）
    ctx.strokeStyle = 'rgba(180, 140, 60, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < WIDTH; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }

    // 基座
    const baseGrad = ctx.createLinearGradient(WIDTH / 2 - BASE_WIDTH / 2, BASE_Y, WIDTH / 2 + BASE_WIDTH / 2, BASE_Y);
    baseGrad.addColorStop(0, '#4a3820');
    baseGrad.addColorStop(0.5, '#6b4f2a');
    baseGrad.addColorStop(1, '#4a3820');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(WIDTH / 2 - BASE_WIDTH / 2, BASE_Y, BASE_WIDTH, 30);

    // 基座纹理
    ctx.fillStyle = '#3a2a18';
    for (let bx = WIDTH / 2 - BASE_WIDTH / 2; bx < WIDTH / 2 + BASE_WIDTH / 2; bx += 20) {
      ctx.fillRect(bx, BASE_Y, 2, 30);
    }

    // 基座文字
    ctx.fillStyle = '#a08050';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('基座', WIDTH / 2, BASE_Y + 18);

    // 绘制品
    for (const p of pieces) {
      drawPiece(p);
    }

    // 绘制当前件
    if (currentPiece) {
      ctx.save();
      if (currentPiece.tilted && !dragOffsetX) {
        ctx.translate(currentPiece.x + currentPiece.width / 2, currentPiece.y + currentPiece.height / 2);
        ctx.rotate(currentPiece.swingAngle);
        ctx.translate(-currentPiece.width / 2, -currentPiece.height / 2);
        drawPiece({ ...currentPiece, x: 0, y: 0 }, true);
      } else {
        drawPiece(currentPiece, true);
      }
      ctx.restore();
    }

    // 粒子
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 游戏结束
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#c8a855';
      ctx.font = 'bold 36px serif';
      ctx.textAlign = 'center';
      ctx.fillText('游戏结束', WIDTH / 2, HEIGHT / 2 - 30);
      ctx.font = '22px serif';
      ctx.fillText(`得分: ${score}`, WIDTH / 2, HEIGHT / 2 + 10);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText('点击"重新开始"再来一局', WIDTH / 2, HEIGHT / 2 + 50);
    }

    // 未开始
    if (!gameStarted) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#c8a855';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.fillText('斗拱叠叠乐', WIDTH / 2, HEIGHT / 2 - 40);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#9a8a6a';
      ctx.fillText('拖动构件 · 精准叠放 · 追求稳定', WIDTH / 2, HEIGHT / 2);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#7a6a4a';
      ctx.fillText('点击「开始游戏」', WIDTH / 2, HEIGHT / 2 + 40);
    }
  }

  function drawPiece(p, isActive = false) {
    const { x, y, width, height, color, type, name } = p;

    ctx.save();

    // 投影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = isActive ? 15 : 8;
    ctx.shadowOffsetY = isActive ? 5 : 3;

    if (type === 'dou') {
      // 斗：倒梯形
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + 5, y);
      ctx.lineTo(x + width - 5, y);
      ctx.lineTo(x + width - 2, y + height);
      ctx.lineTo(x + 2, y + height);
      ctx.closePath();
      ctx.fill();

      // 内部纹理线
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.2, y + 2);
      ctx.lineTo(x + width * 0.2 + 3, y + height - 2);
      ctx.moveTo(x + width * 0.5, y + 2);
      ctx.lineTo(x + width * 0.5, y + height - 2);
      ctx.moveTo(x + width * 0.8, y + 2);
      ctx.lineTo(x + width * 0.8 - 3, y + height - 2);
      ctx.stroke();

      // 高光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x + 5, y + 2, width - 10, 3);
    } else {
      // 栱：长条形
      const grad = ctx.createLinearGradient(x, y, x, y + height);
      grad.addColorStop(0, lightenColor(color, 20));
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, darkenColor(color, 20));
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 4);
      ctx.fill();

      // 拱的两端（卷杀）
      ctx.beginPath();
      ctx.arc(x + 8, y + height / 2, height / 2 - 2, Math.PI / 2, -Math.PI / 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + width - 8, y + height / 2, height / 2 - 2, -Math.PI / 2, Math.PI / 2);
      ctx.fill();

      // 中线装饰
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + height / 2);
      ctx.lineTo(x + width - 10, y + height / 2);
      ctx.stroke();
    }

    ctx.shadowColor = 'transparent';
    ctx.restore();

    // 名称标签
    if (isActive) {
      ctx.fillStyle = 'rgba(200, 168, 85, 0.9)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name, x + width / 2, y - 5);
    }
  }

  function lightenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }

  function darkenColor(hex, amount) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `rgb(${r},${g},${b})`;
  }

  return { init };
})();

// 自动初始化
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('game-zone-stack')) {
    GameStack.init();
  }
});
