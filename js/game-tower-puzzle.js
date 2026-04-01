/* ==========================================
   积木塔挑战 · Game Tower Puzzle
   模拟榫卯结构的积木搭建游戏
   ========================================== */

const GameTower = (() => {

  const WIDTH = 600;
  const HEIGHT = 700;
  const GROUND_Y = HEIGHT - 50;
  const BLOCK_W = 80;
  const BLOCK_H = 30;

  const BLOCK_COLORS = [
    '#8B7355', '#9B8265', '#7A6245', '#A08A60',
    '#6B5335', '#B09070', '#8B6914', '#6E5B3A',
  ];

  const BLOCK_NAMES = ['枋', '梁', '桁', '椀', '板', '柱'];

  let canvas, ctx;
  let blocks = [];
  let nextBlock = null;
  let score = 0;
  let level = 1;
  let gameOver = false;
  let gameStarted = false;
  let lastFrameTime = 0;
  let particles = [];
  let shakeTimer = 0;
  let animFrameId = null;
  let highScore = 0;

  function init() {
    canvas = document.getElementById('game-canvas-tower');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const startBtn = document.getElementById('game-start-tower');
    const restartBtn = document.getElementById('game-restart-tower');
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (restartBtn) restartBtn.addEventListener('click', resetGame);

    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('keydown', onKeyDown);

    highScore = parseInt(localStorage.getItem('gametower_high') || '0');
    resetGame();
    draw();
  }

  function resetGame() {
    blocks = [];
    nextBlock = null;
    score = 0;
    level = 1;
    gameOver = false;
    gameStarted = false;
    particles = [];
    shakeTimer = 0;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    updateUI();
    draw();
  }

  function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    spawnNext();
    lastFrameTime = performance.now();
    gameLoop();
  }

  function spawnNext() {
    const x = WIDTH / 2 - BLOCK_W / 2 + (Math.random() - 0.5) * 30;
    nextBlock = {
      x,
      y: 30,
      width: BLOCK_W,
      height: BLOCK_H,
      vy: 0,
      settled: false,
      color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
      name: BLOCK_NAMES[Math.floor(Math.random() * BLOCK_NAMES.length)],
      tilt: 0,
      targetX: WIDTH / 2 - BLOCK_W / 2,
    };
  }

  function onCanvasClick(e) {
    if (!gameStarted || gameOver) return;
    if (!nextBlock || nextBlock.settled) return;
    settleCurrentBlock();
  }

  function onKeyDown(e) {
    if (!gameStarted || gameOver) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (nextBlock && !nextBlock.settled) settleCurrentBlock();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      if (nextBlock) nextBlock.x = Math.max(0, nextBlock.x - 15);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      if (nextBlock) nextBlock.x = Math.min(WIDTH - nextBlock.width, nextBlock.x + 15);
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      if (nextBlock) nextBlock.width = Math.min(BLOCK_W * 1.5, nextBlock.width + 10);
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      if (nextBlock) nextBlock.width = Math.max(BLOCK_W * 0.5, nextBlock.width - 10);
    }
  }

  function settleCurrentBlock() {
    if (!nextBlock) return;
    nextBlock.settled = true;
    blocks.push(nextBlock);

    // 精度评分
    const targetCenter = WIDTH / 2;
    const actualCenter = nextBlock.x + nextBlock.width / 2;
    const offset = Math.abs(targetCenter - actualCenter);
    const accuracy = 1 - Math.min(1, offset / (WIDTH / 2));

    // 稳定性检测：积木是否超出合理范围
    const tooFarLeft = nextBlock.x < 5;
    const tooFarRight = nextBlock.x + nextBlock.width > WIDTH - 5;
    if (tooFarLeft || tooFarRight) {
      gameOver = true;
      showFeedback('crash', '积木倒塌！');
      shakeTimer = 30;
      return;
    }

    // 计分
    const base = 10;
    const heightBonus = blocks.length * 3;
    const accuracyBonus = Math.floor(accuracy * 20);
    score += base + heightBonus + accuracyBonus;

    if (accuracy > 0.9) {
      showFeedback('perfect', `完美对齐！+${base + heightBonus + accuracyBonus}`);
      spawnParticles(WIDTH / 2, nextBlock.y, '#ffd700');
    } else if (accuracy > 0.7) {
      showFeedback('good', `对齐良好 +${base + heightBonus + accuracyBonus}`);
      spawnParticles(nextBlock.x + nextBlock.width / 2, nextBlock.y, nextBlock.color);
    } else {
      showFeedback('ok', `+${base + heightBonus}`);
    }

    // 到达一定高度则升级
    if (blocks.length % 8 === 0) level++;

    updateUI();
    nextBlock = null;

    setTimeout(() => {
      if (!gameOver) spawnNext();
    }, 500);
  }

  function spawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        color,
        size: 2 + Math.random() * 4,
        type: Math.random() > 0.5 ? 'square' : 'circle',
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.03;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updateUI() {
    const scoreEl = document.getElementById('game-score-tower');
    const levelEl = document.getElementById('game-level-tower');
    const highEl = document.getElementById('game-high-tower');
    if (scoreEl) scoreEl.textContent = score;
    if (levelEl) levelEl.textContent = level;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('gametower_high', highScore);
    }
    if (highEl) highEl.textContent = highScore;
  }

  function showFeedback(type, text) {
    const container = document.getElementById('game-feedback-tower');
    if (!container) return;
    container.textContent = text;
    container.className = `game-feedback show ${type}`;
    setTimeout(() => {
      container.className = 'game-feedback';
    }, 1600);
  }

  function gameLoop(timestamp = 0) {
    const dt = Math.min((timestamp - lastFrameTime) / 16.67, 2);
    lastFrameTime = timestamp;

    if (nextBlock && !nextBlock.settled) {
      nextBlock.y += (2.5 + level * 0.3) * dt;
      // 微小幅度的左右摆动
      nextBlock.tilt = Math.sin(nextBlock.y * 0.05) * 2;
    }

    if (shakeTimer > 0) shakeTimer--;
    updateParticles();
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

    // 垂直参考线
    ctx.strokeStyle = 'rgba(180, 140, 60, 0.15)';
    ctx.setLineDash([4, 8]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, GROUND_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 地面
    const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, HEIGHT);
    groundGrad.addColorStop(0, '#3a2a18');
    groundGrad.addColorStop(1, '#2a1a0a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

    // 地面纹理线
    ctx.strokeStyle = 'rgba(180, 140, 60, 0.2)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < WIDTH; gx += 30) {
      ctx.beginPath();
      ctx.moveTo(gx, GROUND_Y);
      ctx.lineTo(gx, HEIGHT);
      ctx.stroke();
    }

    // 积木
    for (const b of blocks) {
      drawBlock(b, false);
    }

    // 当前下落积木
    if (nextBlock) {
      // 投影
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(nextBlock.x + 3, GROUND_Y - nextBlock.height - 3, nextBlock.width, nextBlock.height);
      drawBlock(nextBlock, true);
    }

    // 粒子
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.life, p.size * p.life);
      }
      ctx.restore();
    }

    // 摇晃效果
    if (shakeTimer > 0) {
      ctx.save();
      ctx.translate(Math.random() * 6 - 3, Math.random() * 4 - 2);
    }

    // 游戏结束
    if (gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#c8a855';
      ctx.font = 'bold 36px serif';
      ctx.textAlign = 'center';
      ctx.fillText('积木倒塌', WIDTH / 2, HEIGHT / 2 - 30);
      ctx.font = '22px serif';
      ctx.fillText(`最终得分: ${score}`, WIDTH / 2, HEIGHT / 2 + 10);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText('点击"重新开始"', WIDTH / 2, HEIGHT / 2 + 50);
    }

    // 未开始
    if (!gameStarted && !gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#c8a855';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.fillText('积木塔挑战', WIDTH / 2, HEIGHT / 2 - 50);
      ctx.font = '15px monospace';
      ctx.fillStyle = '#9a8a6a';
      ctx.fillText('点击积木使其固定 · 越居中越精准', WIDTH / 2, HEIGHT / 2 - 10);
      ctx.fillText('← → 调整位置  ↑ ↓ 调整宽度', WIDTH / 2, HEIGHT / 2 + 20);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#7a6a4a';
      ctx.fillText('点击「开始」', WIDTH / 2, HEIGHT / 2 + 55);
    }

    if (shakeTimer > 0) ctx.restore();
  }

  function drawBlock(b, isActive) {
    const { x, y, width, height, color, name, tilt } = b;

    ctx.save();

    if (tilt !== 0) {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(tilt * 0.02);
      ctx.translate(-width / 2, -height / 2);
    }

    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = isActive ? 12 : 6;
    ctx.shadowOffsetY = isActive ? 4 : 2;

    // 主体
    const grad = ctx.createLinearGradient(x, y, x, y + height);
    grad.addColorStop(0, lighten(color, 30));
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, darken(color, 25));
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 3);
    ctx.fill();

    // 顶部高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(x + 2, y + 2, width - 4, 4);

    // 榫卯凹凸纹理（模拟）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1;
    if (width > 40) {
      const notchW = Math.min(10, width * 0.12);
      ctx.beginPath();
      ctx.moveTo(x + width / 2 - notchW / 2, y);
      ctx.lineTo(x + width / 2 - notchW / 2, y + height);
      ctx.moveTo(x + width / 2 + notchW / 2, y);
      ctx.lineTo(x + width / 2 + notchW / 2, y + height);
      ctx.stroke();
    }

    ctx.shadowColor = 'transparent';
    ctx.restore();

    // 名称
    if (isActive) {
      ctx.fillStyle = 'rgba(200, 168, 85, 0.95)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name, x + width / 2, y - 6);
    }
  }

  function lighten(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (n >> 16) + amt);
    const g = Math.min(255, ((n >> 8) & 0xff) + amt);
    const b = Math.min(255, (n & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  function darken(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - amt);
    const g = Math.max(0, ((n >> 8) & 0xff) - amt);
    const b = Math.max(0, (n & 0xff) - amt);
    return `rgb(${r},${g},${b})`;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('game-zone-tower')) {
    GameTower.init();
  }
});
