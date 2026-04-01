/* ==========================================
   九龙壁拼图 · Game Dragon Mosaic
   拖拽琉璃瓦碎片还原九龙壁的游戏
   ========================================== */

const GameDragon = (() => {

  const WIDTH = 600;
  const HEIGHT = 500;
  const GRID_COLS = 6;
  const GRID_ROWS = 4;
  const CELL_W = Math.floor(WIDTH / GRID_COLS);
  const CELL_H = Math.floor(HEIGHT / GRID_ROWS);
  const ROWS = GRID_COLS * GRID_ROWS;

  const COLORS = [
    '#c8a855', '#a07030', '#e0c878',
    '#6b8e23', '#228b22', '#32cd32',
    '#1e90ff', '#4169e1', '#0000cd',
    '#8b008b', '#9932cc', '#ff4500',
    '#dc143c', '#ffd700', '#ff8c00',
    '#8b4513', '#a0522d', '#d2691e',
    '#696969', '#808080', '#b0c4de',
    '#4682b4', '#5f9ea0', '#2e8b57',
  ];

  const DRAGON_PATTERN = [
    'R', 'R', 'G', 'G', 'R', 'R',
    'R', 'G', 'R', 'R', 'G', 'R',
    'G', 'R', 'R', 'R', 'R', 'G',
    'G', 'R', 'G', 'G', 'R', 'G',
  ];

  let canvas, ctx;
  let pieces = [];      // 碎片数组 { id, col, row, x, y, targetCol, targetRow, placed }
  let emptyPos = null;  // 当前空位
  let selected = null;
  let score = 0;
  let moves = 0;
  let gameStarted = false;
  let gameWon = false;
  let animFrameId = null;
  let particles = [];
  let highScore = 0;
  let lastClickTime = 0;

  const SLOT_POOL_X = WIDTH - 80;
  const SLOT_POOL_Y = 50;
  const SLOT_SIZE = 45;

  function init() {
    canvas = document.getElementById('game-canvas-dragon');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT + 120;

    const startBtn = document.getElementById('game-start-dragon');
    const restartBtn = document.getElementById('game-restart-dragon');
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (restartBtn) restartBtn.addEventListener('click', resetGame);

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    highScore = parseInt(localStorage.getItem('gamedragon_high') || '0');
    resetGame();
    draw();
  }

  function resetGame() {
    score = 0;
    moves = 0;
    gameStarted = false;
    gameWon = false;
    particles = [];
    selected = null;
    if (animFrameId) cancelAnimationFrame(animFrameId);

    // 初始化碎片
    pieces = [];
    for (let i = 0; i < ROWS; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const targetCol = col;
      const targetRow = row;

      // 确定颜色：龙纹图案
      const patternIdx = DRAGON_PATTERN[i] === 'R' ? 0 : 3;
      const colorBase = DRAGON_PATTERN[i] === 'R'
        ? ['#c8a855', '#ffd700', '#ff8c00'][i % 3]
        : ['#1e90ff', '#4169e1', '#0000cd'][i % 3];

      pieces.push({
        id: i,
        col, row,
        targetCol, targetRow,
        x: col * CELL_W,
        y: row * CELL_H,
        color: colorBase,
        placed: false,
        offsetX: 0,
        offsetY: 0,
        animProgress: 0,
      });
    }

    // 随机打乱（使用 Fisher-Yates）
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i].col, pieces[j].col] = [pieces[j].col, pieces[i].col];
      [pieces[i].row, pieces[j].row] = [pieces[j].row, pieces[i].row];
    }

    // 重新排列位置
    pieces.forEach((p, idx) => {
      p.x = (idx % GRID_COLS) * CELL_W;
      p.y = Math.floor(idx / GRID_COLS) * CELL_H;
    });

    updateUI();
    draw();
  }

  function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    gameLoop();
  }

  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (WIDTH / rect.width),
      y: (e.clientY - rect.top) * (HEIGHT / rect.height),
    };
  }

  function onMouseDown(e) {
    if (!gameStarted || gameWon) return;
    const pos = getMousePos(e);
    handlePointerDown(pos.x, pos.y);
  }

  function onMouseMove(e) {
    if (!selected) return;
    const pos = getMousePos(e);
    selected.x = pos.x - selected.offsetX;
    selected.y = pos.y - selected.offsetY;
  }

  function onMouseUp(e) {
    if (!selected) return;
    handlePointerUp(selected);
    selected = null;
  }

  function onTouchStart(e) {
    e.preventDefault();
    if (!gameStarted || gameWon) return;
    if (e.touches.length === 1) {
      const t = e.touches[0];
      handlePointerDown(
        (t.clientX - canvas.getBoundingClientRect().left) * (WIDTH / canvas.getBoundingClientRect().width),
        (t.clientY - canvas.getBoundingClientRect().top) * (HEIGHT / canvas.getBoundingClientRect().height)
      );
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (!selected || e.touches.length !== 1) return;
    const t = e.touches[0];
    selected.x = (t.clientX - canvas.getBoundingClientRect().left) * (WIDTH / canvas.getBoundingClientRect().width) - selected.offsetX;
    selected.y = (t.clientY - canvas.getBoundingClientRect().top) * (HEIGHT / canvas.getBoundingClientRect().height) - selected.offsetY;
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (!selected) return;
    handlePointerUp(selected);
    selected = null;
  }

  function handlePointerDown(mx, my) {
    // 找到点击的碎片
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (mx >= p.x && mx <= p.x + CELL_W && my >= p.y && my <= p.y + CELL_H) {
        selected = p;
        selected.offsetX = mx - p.x;
        selected.offsetY = my - p.y;
        // 将碎片移到最上层
        pieces.splice(i, 1);
        pieces.push(selected);
        return;
      }
    }
  }

  function handlePointerUp(piece) {
    // 寻找最近的空位
    let bestDist = Infinity;
    let bestSlot = null;

    // 检查网格槽位
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const slotX = c * CELL_W;
        const slotY = r * CELL_H;
        const centerX = piece.x + CELL_W / 2;
        const centerY = piece.y + CELL_H / 2;
        const slotCenterX = slotX + CELL_W / 2;
        const slotCenterY = slotY + CELL_H / 2;
        const dist = Math.hypot(centerX - slotCenterX, centerY - slotCenterY);

        // 检查该槽位是否被占用
        const occupied = pieces.some(p => p !== piece && Math.abs(p.x - slotX) < 5 && Math.abs(p.y - slotY) < 5);
        if (!occupied && dist < bestDist) {
          bestDist = dist;
          bestSlot = { x: slotX, y: slotY, col: c, row: r };
        }
      }
    }

    if (bestSlot && bestDist < CELL_W * 0.7) {
      piece.x = bestSlot.x;
      piece.y = bestSlot.y;
      piece.col = bestSlot.col;
      piece.row = bestSlot.row;
      moves++;

      // 检测是否正确放置
      if (piece.col === piece.targetCol && piece.row === piece.targetRow) {
        piece.placed = true;
        spawnParticles(piece.x + CELL_W / 2, piece.y + CELL_H / 2, piece.color, 8);
        score += 15;
      } else {
        score = Math.max(0, score - 1);
      }

      updateUI();
      checkWin();
    } else {
      // 回到原位
      piece.x = piece.col * CELL_W;
      piece.y = piece.row * CELL_H;
    }
  }

  function checkWin() {
    const allPlaced = pieces.every(p => p.placed);
    if (allPlaced) {
      gameWon = true;
      const efficiency = Math.max(0, 100 - moves * 2);
      score += efficiency * 10;
      updateUI();
      showFeedback('win', `九龙壁还原完成！得分 ${score}`);
      // 庆祝粒子
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          spawnParticles(
            Math.random() * WIDTH,
            Math.random() * HEIGHT,
            COLORS[Math.floor(Math.random() * COLORS.length)],
            5
          );
        }, i * 30);
      }
    }
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.life -= 0.025;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updateUI() {
    const scoreEl = document.getElementById('game-score-dragon');
    const movesEl = document.getElementById('game-moves-dragon');
    const highEl = document.getElementById('game-high-dragon');
    if (scoreEl) scoreEl.textContent = score;
    if (movesEl) movesEl.textContent = moves;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('gamedragon_high', highScore);
    }
    if (highEl) highEl.textContent = highScore;
  }

  function showFeedback(type, text) {
    const container = document.getElementById('game-feedback-dragon');
    if (!container) return;
    container.textContent = text;
    container.className = `game-feedback show ${type}`;
    setTimeout(() => {
      container.className = 'game-feedback';
    }, 2500);
  }

  function gameLoop() {
    updateParticles();
    draw();
    if (!gameWon || particles.length > 0) {
      animFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT + 120);

    // 背景
    ctx.fillStyle = '#0d0a04';
    ctx.fillRect(0, 0, WIDTH, HEIGHT + 120);

    // 九龙壁背景板（金色边框）
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, WIDTH - 20, HEIGHT - 20);
    ctx.strokeStyle = '#c8a855';
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, WIDTH - 30, HEIGHT - 30);

    // 内部背景（深色琉璃底）
    ctx.fillStyle = '#1a1208';
    ctx.fillRect(18, 18, WIDTH - 36, HEIGHT - 36);

    // 绘制目标网格（参考线）
    if (gameStarted) {
      ctx.strokeStyle = 'rgba(180, 140, 60, 0.1)';
      ctx.lineWidth = 1;
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          ctx.strokeRect(c * CELL_W + 18, r * CELL_H + 18, CELL_W, CELL_H);
        }
      }

      // 目标位置显示（淡出效果）
      for (const p of pieces) {
        if (!p.placed) {
          ctx.fillStyle = `${p.color}18`;
          ctx.fillRect(p.targetCol * CELL_W + 18, p.targetRow * CELL_H + 18, CELL_W, CELL_H);
        }
      }
    }

    // 绘制碎片
    for (const p of pieces) {
      drawPiece(p);
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

    // 底部信息栏
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(0, HEIGHT, WIDTH, 120);

    // 提示文字
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('拖拽碎片还原九龙壁 · 拖到正确位置得分', WIDTH / 2, HEIGHT + 30);

    // 已放置计数
    const placedCount = pieces.filter(p => p.placed).length;
    ctx.fillStyle = '#c8a855';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`已放置: ${placedCount} / ${ROWS}`, WIDTH / 2, HEIGHT + 55);

    // 移动次数
    ctx.fillStyle = '#8a7a5a';
    ctx.font = '12px monospace';
    ctx.fillText(`移动次数: ${moves}`, WIDTH / 2, HEIGHT + 78);

    // 未开始
    if (!gameStarted) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#c8a855';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.fillText('九龙壁拼图', WIDTH / 2, HEIGHT / 2 - 20);
      ctx.font = '15px monospace';
      ctx.fillStyle = '#9a8a6a';
      ctx.fillText('拖动碎片 · 放至正确位置 · 还原龙壁', WIDTH / 2, HEIGHT / 2 + 20);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#7a6a4a';
      ctx.fillText('点击「开始」', WIDTH / 2, HEIGHT / 2 + 55);
    }
  }

  function drawPiece(p) {
    const { x, y, color, placed, id } = p;

    ctx.save();

    if (placed) {
      // 已放置：略微发光
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    } else if (p === selected) {
      // 选中：提升阴影
      ctx.shadowColor = 'rgba(200, 168, 85, 0.6)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 5;
    }

    // 琉璃瓦质感渐变
    const grad = ctx.createLinearGradient(x, y, x + CELL_W, y + CELL_H);
    grad.addColorStop(0, lightenColor(color, 30));
    grad.addColorStop(0.4, color);
    grad.addColorStop(1, darkenColor(color, 30));

    ctx.fillStyle = grad;

    // 绘制琉璃瓦形状（带圆角）
    const margin = 2;
    ctx.beginPath();
    ctx.roundRect(x + margin, y + margin, CELL_W - margin * 2, CELL_H - margin * 2, 3);
    ctx.fill();

    // 琉璃纹理（斜向光纹）
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    for (let ox = -CELL_H; ox < CELL_W; ox += 6) {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + margin);
      ctx.lineTo(x + ox + CELL_H, y + CELL_H - margin);
      ctx.stroke();
    }

    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(x + margin + 2, y + margin + 2, CELL_W - margin * 2 - 4, 4);

    // 边框
    ctx.strokeStyle = placed ? 'rgba(255, 255, 255, 0.3)' : 'rgba(100, 80, 40, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + margin, y + margin, CELL_W - margin * 2, CELL_H - margin * 2, 3);
    ctx.stroke();

    // 已放置打勾
    if (placed) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('\u2713', x + CELL_W / 2, y + CELL_H / 2 + 5);
    }

    ctx.shadowColor = 'transparent';
    ctx.restore();
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('game-zone-dragon')) {
    GameDragon.init();
  }
});
