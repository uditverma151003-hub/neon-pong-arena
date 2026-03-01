const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

const scoreValue = document.getElementById("scoreValue");
const playerNameEl = document.getElementById("playerName");
const leaderboardList = document.getElementById("leaderboardList");
const overlayMessage = document.getElementById("overlayMessage");

const nameModal = document.getElementById("nameModal");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");
const restartBtn = document.getElementById("restartBtn");

const game = {
  username: "",
  running: false,
  score: 0,
  playerLives: 3,
  lastTimestamp: 0,
  ball: { x: canvas.width / 2, y: canvas.height / 2, radius: 9, vx: 360, vy: 230 },
  player: { x: 22, y: canvas.height / 2 - 64, w: 14, h: 128, targetY: canvas.height / 2 - 64 },
  ai: { x: canvas.width - 36, y: canvas.height / 2 - 64, w: 14, h: 128, speed: 320 },
  particles: [],
};

// ---------------- UTILITY ----------------
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function resetBall(direction = 1) {
  game.ball.x = canvas.width / 2;
  game.ball.y = canvas.height / 2;
  game.ball.vx = (320 + Math.random() * 130) * direction;
  game.ball.vy = (Math.random() * 280 - 140);
}

function spawnParticles(x, y, color) {
  for (let i = 0; i < 14; i++) {
    game.particles.push({
      x, y, r: Math.random() * 2 + 1.2,
      vx: Math.random() * 240 - 120,
      vy: Math.random() * 240 - 120,
      life: 0.7 + Math.random() * 0.35,
      t: 0,
      color,
    });
  }
}

// ---------------- DRAWING ----------------
function drawBackgroundGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.setLineDash([10, 13]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.restore();
}

function drawPaddle(p, glowColor) {
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = glowColor;
  ctx.fillStyle = "#e9f4ff";
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.restore();
}

function drawBall() {
  const b = game.ball;
  ctx.save();
  const grad = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, b.radius + 6);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#7dfb6a");
  ctx.shadowBlur = 24;
  ctx.shadowColor = "rgba(125,251,106,0.9)";
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(dt) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.t += dt;
    if (p.t >= p.life) { game.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const alpha = 1 - p.t / p.life;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------------- AI & COLLISIONS ----------------
function updateAI(dt) {
  const center = game.ai.y + game.ai.h / 2;
  const target = game.ball.y + Math.sin(Date.now() * 0.003) * 18;
  if (target > center + 7) game.ai.y += game.ai.speed * dt;
  if (target < center - 7) game.ai.y -= game.ai.speed * dt;
  game.ai.y = clamp(game.ai.y, 0, canvas.height - game.ai.h);
}

function handleCollisions() {
  const b = game.ball;
  if (b.y - b.radius <= 0 || b.y + b.radius >= canvas.height) {
    b.vy *= -1; spawnParticles(b.x, b.y, "#22d3ee");
  }

  // Player paddle
  if (b.x - b.radius <= game.player.x + game.player.w && b.y >= game.player.y && b.y <= game.player.y + game.player.h && b.vx < 0) {
    const norm = (b.y - (game.player.y + game.player.h / 2)) / (game.player.h / 2);
    b.vx = Math.abs(b.vx) * 1.04;
    b.vy += norm * 180;
    game.score += 1;
    scoreValue.textContent = String(game.score);
    spawnParticles(b.x, b.y, "#f973d2");
  }

  // AI paddle
  if (b.x + b.radius >= game.ai.x && b.y >= game.ai.y && b.y <= game.ai.y + game.ai.h && b.vx > 0) {
    const norm = (b.y - (game.ai.y + game.ai.h / 2)) / (game.ai.h / 2);
    b.vx = -Math.abs(b.vx) * 1.03;
    b.vy += norm * 130;
    spawnParticles(b.x, b.y, "#22d3ee");
  }

  if (b.x < -30) {
    game.playerLives -= 1;
    if (game.playerLives <= 0) endGame();
    else { showOverlay(`Life Lost! ${game.playerLives} left`, 900); resetBall(1); }
  }

  if (b.x > canvas.width + 30) resetBall(-1);
}

// ---------------- UPDATE & RENDER ----------------
function update(dt) {
  if (!game.running) return;
  const b = game.ball;
  b.x += b.vx * dt; b.y += b.vy * dt;
  const diff = game.player.targetY - game.player.y;
  game.player.y += diff * Math.min(1, dt * 14);
  game.player.y = clamp(game.player.y, 0, canvas.height - game.player.h);
  updateAI(dt);
  handleCollisions();
}

function render(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackgroundGrid();
  drawPaddle(game.player, "rgba(249,115,210,0.95)");
  drawPaddle(game.ai, "rgba(34,211,238,0.9)");
  drawBall();
  drawParticles(dt);
  ctx.save();
  ctx.font = "600 20px Orbitron, sans-serif";
  ctx.fillStyle = "rgba(220,235,255,0.9)";
  ctx.fillText(`Lives: ${game.playerLives}`, 18, 30);
  ctx.restore();
}

// ---------------- GAME LOOP ----------------
function gameLoop(timestamp) {
  const delta = Math.min((timestamp - game.lastTimestamp) / 1000, 0.033);
  game.lastTimestamp = timestamp;
  update(delta); render(delta);
  requestAnimationFrame(gameLoop);
}

// ---------------- MODAL & SCORE ----------------
function showOverlay(text, duration = 0) {
  overlayMessage.textContent = text;
  overlayMessage.classList.remove("hidden");
  if (duration > 0) setTimeout(() => overlayMessage.classList.add("hidden"), duration);
}
function hideOverlay() { overlayMessage.classList.add("hidden"); }

async function submitScore() {
  try {
    const res = await fetch("/api/score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: game.username, score: game.score }) });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.leaderboard)) renderLeaderboard(data.leaderboard);
  } catch (err) { console.error(err); }
}

function renderLeaderboard(entries) {
  leaderboardList.innerHTML = "";
  if (!entries.length) { leaderboardList.innerHTML = '<li class="empty"><span>No scores yet</span><strong>0</strong></li>'; return; }
  entries.forEach(entry => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${entry.player_name}</span><strong>${entry.score}</strong>`;
    leaderboardList.appendChild(li);
  });
}

async function loadLeaderboard() {
  try { const res = await fetch("/api/leaderboard"); if (!res.ok) return; const data = await res.json(); if (Array.isArray(data)) renderLeaderboard(data); }
  catch (err) { console.error(err); }
}

// ---------------- START GAME & MODAL ----------------
function startGame() { game.score = 0; game.playerLives = 3; scoreValue.textContent = "0"; game.running = true; hideOverlay(); resetBall(Math.random() > 0.5 ? 1 : -1); }
function endGame() { game.running = false; showOverlay(`Game Over - Score: ${game.score}`); submitScore(); }

nameForm.addEventListener("submit", e => {
  e.preventDefault();
  const name = nameInput.value.trim(); if (!name) return;
  game.username = name; playerNameEl.textContent = game.username;
  nameModal.style.display = "none"; // hide modal
  showOverlay("3... 2... 1...", 1200);
  setTimeout(() => { startGame(); hideOverlay(); }, 1200);
});

restartBtn.addEventListener("click", () => {
  if (!game.username) { nameModal.style.display = "grid"; nameInput.focus(); return; }
  startGame();
});

// ---------------- PLAYER INPUT ----------------
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const ratioY = canvas.height / rect.height;
  const localY = (e.clientY - rect.top) * ratioY;
  game.player.targetY = localY - game.player.h / 2;
});

canvas.addEventListener("touchmove", e => {
  const rect = canvas.getBoundingClientRect();
  const ratioY = canvas.height / rect.height;
  const touch = e.touches[0];
  const localY = (touch.clientY - rect.top) * ratioY;
  game.player.targetY = localY - game.player.h / 2;
  e.preventDefault();
}, { passive: false });

// ---------------- INIT ----------------
function init() { loadLeaderboard(); showOverlay("Enter your name to begin"); game.lastTimestamp = performance.now(); requestAnimationFrame(gameLoop); nameInput.focus(); }

init();