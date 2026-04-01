/* ==========================================
   御道迷宫 · Game Imperial Passage
   在故宫中轴线上寻找正确路径的游戏
   ========================================== */

const GamePassage = (() => {

  const CELL_SIZE = 50;
  const WIDTH = 600;
  const HEIGHT = 600;
  const COLS = Math.floor(WIDTH / CELL_SIZE);
  const ROWS = Math.floor(HEIGHT / CELL_SIZE);

  const CELL = {
    WALL: 0,
    PATH: 1,
    START: 2,
    END: 3,
    VISITED: 4,
  };

  const COLORS = {
    wall: '#2a1a0e',
    wallAccent: '#3a2a18',
    path: '#1a140a',
    pathGrid: 'rgba(180, 140, 60, 0.08)',
    visited: '#2d2312',
    player: '#c8a855',
    playerGlow: 'rgba(200, 168, 85, 0.4)',
    start: '#4a7c59',
    end: '#c8a855',
    endGlow: 'rgba(200, 168, 85, 0.3)',
  };

  let canvas, ctx;
  let grid = [];
  let player = { x: 0, y: 0 };
  let endPos = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };
  let score = 0;
  let moveCount = 0;
  let gameStarted = false;
  let gameWon = false;
  let animFrameId = null;
  let particles = [];
  let stepHistory = [];
  let hintActive = false;

  function init() {
    canvas = document.getElementById('game-canvas-passage');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const startBtn = document.getElementById('game-start-passage');
    const restartBtn = document.getElementById('game-restart-passage');
    const hintBtn = document.getElementById('game-hint-passage');
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (restartBtn) restartBtn.addEventListener('click', resetGame);
    if (hintBtn) hintBtn.addEventListener('click', showHint);

    canvas.addEventListener('click', onCanvasClick);
    document.addEventListener('keydown', onKeyDown);

    resetGame();
    draw();
  }

  function resetGame() {
    score = 0;
    moveCount = 0;
    gameStarted = false;
    gameWon = false;
    particles = [];
    stepHistory = [];
    hintActive = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    generateMaze();
    updateUI();
    draw();
  }

  function startGame() {
    gameStarted = true;
    gameLoop();
  }

  function generateMaze() {
    // 初始化全墙
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        grid[r][c] = CELL.WALL;
      }
    }

    // 使用递归回溯生成迷宫
    const visited = [];
    for (let r = 0; r < ROWS; r++) visited[r] = [];

    function carve(r, c) {
      visited[r][c] = true;
      grid[r][c] = CELL.PATH;

      const directions = [
        [0, -2], [0, 2], [-2, 0], [2, 0],
      ].sort(() => Math.random() - 0.5);

      for (const [dr, dc] of directions) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && !visited[nr][nc]) {
          grid[r + dr / 2][c + dc / 2] = CELL.PATH;
          carve(nr, nc);
        }
      }
    }

    // 从角落开始
    carve(1, 1);

    // 确保有足够的开放空间（故宫中轴线的感觉）
    // 打通一些额外的路径
    for (let i = 0; i < 15; i++) {
      const r = 1 + Math.floor(Math.random() * (ROWS - 2));
      const c = 1 + Math.floor(Math.random() * (COLS - 2));
      if (grid[r][c] === CELL.WALL) {
        // 检查周围是否有足够的通路
        const neighbors = countPathNeighbors(r, c);
        if (neighbors >= 2) grid[r][c] = CELL.PATH;
      }
    }

    // 设置起点和终点
    startPos = { x: 1, y: 1 };
    endPos = { x: COLS - 2, y: ROWS - 2 };
    grid[startPos.y][startPos.x] = CELL.START;
    grid[endPos.y][endPos.x] = CELL.END;

    // 确保终点可达
    if (grid[endPos.y - 1][endPos.x] === CELL.WALL && grid[endPos.y][endPos.x - 1] === CELL.WALL) {
      grid[endPos.y - 1][endPos.x] = CELL.PATH;
    }

    player = { ...startPos };
  }

  function countPathNeighbors(r, c) {
    let count = 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] !== CELL.WALL) {
        count++;
      }
    }
    return count;
  }

  function onCanvasClick(e) {
    if (!gameStarted || gameWon) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (WIDTH / rect.width);
    const my = (e.clientY - rect.top) * (HEIGHT / rect.height);
    const col = Math.floor(mx / CELL_SIZE);
    const row = Math.floor(my / CELL_SIZE);

    // 检查是否相邻
    const dx = Math.abs(col - player.x);
    const dy = Math.abs(row - player.y);
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      movePlayer(col, row);
    }
  }

  function onKeyDown(e) {
    if (!gameStarted || gameWon) return;
    let nx = player.x;
    let ny = player.y;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') ny--;
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') ny++;
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') nx--;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') nx++;
    else return;
    e.preventDefault();
    if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) {
      movePlayer(nx, ny);
    }
  }

  function movePlayer(nx, ny) {
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    const cell = grid[ny][nx];
    if (cell === CELL.WALL) return;

    // 记录历史
    stepHistory.push({ x: player.x, y: player.y });
    if (stepHistory.length > 500) stepHistory.shift();

    player.x = nx;
    player.y = ny;
    moveCount++;

    if (cell === CELL.END) {
      gameWon = true;
      const optimalPath = bfsShortestPath();
      const efficiency = optimalPath > 0 ? Math.round((optimalPath / moveCount) * 100) : 0;
      score = Math.max(0, 1000 - moveCount * 10 + efficiency * 5);
      updateUI();
      spawnParticles(player.x * CELL_SIZE + CELL_SIZE / 2, player.y * CELL_SIZE + CELL_SIZE / 2, '#ffd700', 30);
      showFeedback('win', `通关！用时 ${moveCount} 步 得分 ${score}`);
      return;
    }

    // 标记已访问
    if (cell !== CELL.START && cell !== CELL.END) {
      grid[ny][nx] = CELL.VISITED;
    }

    updateUI();
  }

  function bfsShortestPath() {
    const queue = [{ x: startPos.x, y: startPos.y, dist: 0 }];
    const visited = new Set();
    visited.add(`${startPos.x},${startPos.y}`);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr.x === endPos.x && curr.y === endPos.y) return curr.dist;

      for (const [dr, dc] of dirs) {
        const nx = curr.x + dc;
        const ny = curr.y + dr;
        const key = `${nx},${ny}`;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && !visited.has(key) && grid[ny][nx] !== CELL.WALL) {
          visited.add(key);
          queue.push({ x: nx, y: ny, dist: curr.dist + 1 });
        }
      }
    }
    return -1;
  }

  function showHint() {
    if (!gameStarted || gameWon) return;
    hintActive = true;
    const optimal = bfsShortestPath();
    if (optimal > 0 && moveCount > 0) {
      const efficiency = Math.round((optimal / moveCount) * 100);
      showFeedback('hint', `最优路径 ${optimal} 步，当前效率 ${efficiency}%`);
    }
    setTimeout(() => { hintActive = false; }, 2000);
  }

  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.025;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function updateUI() {
    const scoreEl = document.getElementById('game-score-passage');
    const moveEl = document.getElementById('game-moves-passage');
    if (scoreEl) scoreEl.textContent = score;
    if (moveEl) moveEl.textContent = moveCount;
  }

  function showFeedback(type, text) {
    const container = document.getElementById('game-feedback-passage');
    if (!container) return;
    container.textContent = text;
    container.className = `game-feedback show ${type}`;
    setTimeout(() => {
      container.className = 'game-feedback';
    }, 2000);
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
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // 背景
    ctx.fillStyle = '#0d0a04';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // 绘制格子
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;
        const cell = grid[r][c];

        if (cell === CELL.WALL) {
          // 墙
          const wallGrad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
          wallGrad.addColorStop(0, COLORS.wallAccent);
          wallGrad.addColorStop(1, COLORS.wall);
          ctx.fillStyle = wallGrad;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          // 边框
          ctx.strokeStyle = 'rgba(100, 70, 30, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
        } else {
          // 路径
          ctx.fillStyle = COLORS.path;
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
          // 网格线
          ctx.strokeStyle = COLORS.pathGrid;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }

        // 已访问
        if (cell === CELL.VISITED) {
          ctx.fillStyle = COLORS.visited;
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }

        // 起点
        if (cell === CELL.START) {
          ctx.fillStyle = COLORS.start;
          ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
          ctx.fillStyle = '#fff';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('起点', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 4);
        }

        // 终点
        if (cell === CELL.END) {
          // 发光
          ctx.save();
          ctx.shadowColor = COLORS.endGlow;
          ctx.shadowBlur = 20;
          ctx.fillStyle = COLORS.end;
          ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
          ctx.restore();
          ctx.fillStyle = '#1a0f00';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('终点', x + CELL_SIZE / 2, y + CELL_SIZE / 2 + 4);
        }
      }
    }

    // 历史足迹
    ctx.fillStyle = 'rgba(90, 70, 35, 0.4)';
    for (let i = 0; i < stepHistory.length; i++) {
      const s = stepHistory[i];
      const alpha = 0.1 + (i / stepHistory.length) * 0.3;
      ctx.fillStyle = `rgba(90, 70, 35, ${alpha})`;
      ctx.fillRect(s.x * CELL_SIZE + 6, s.y * CELL_SIZE + 6, CELL_SIZE - 12, CELL_SIZE - 12);
    }

    // 玩家
    const px = player.x * CELL_SIZE;
    const py = player.y * CELL_SIZE;
    // 光晕
    ctx.save();
    ctx.shadowColor = COLORS.playerGlow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE / 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 内部
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(px + CELL_SIZE / 2, py + CELL_SIZE / 2, CELL_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();

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

    // 未开始
    if (!gameStarted) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#c8a855';
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.fillText('御道迷宫', WIDTH / 2, HEIGHT / 2 - 50);
      ctx.font = '15px monospace';
      ctx.fillStyle = '#9a8a6a';
      ctx.fillText('从起点（绿）走到终点（金）', WIDTH / 2, HEIGHT / 2 - 10);
      ctx.fillText('用方向键或 WASD 或点击移动', WIDTH / 2, HEIGHT / 2 + 20);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#7a6a4a';
      ctx.fillText('点击「开始」', WIDTH / 2, HEIGHT / 2 + 55);
    }

    // 获胜
    if (gameWon) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 32px serif';
      ctx.textAlign = 'center';
      ctx.fillText('御道畅通！', WIDTH / 2, HEIGHT / 2 - 40);
      ctx.font = '20px serif';
      ctx.fillText(`用了 ${moveCount} 步`, WIDTH / 2, HEIGHT / 2 + 0);
      ctx.font = 'bold 24px serif';
      ctx.fillText(`得分: ${score}`, WIDTH / 2, HEIGHT / 2 + 40);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText('点击"重新开始"再来', WIDTH / 2, HEIGHT / 2 + 75);
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('game-zone-passage')) {
    GamePassage.init();
  }
});
