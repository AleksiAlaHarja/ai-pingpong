const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ovTitle");
const ovText = document.getElementById("ovText");
const playBtn = document.getElementById("playBtn");
const modesEl = document.getElementById("modes");
const scoreEls = [document.getElementById("scoreL"), document.getElementById("scoreR")];

const WIN_SCORE = 7;
const PADDLE_W = 14;
const PADDLE_H = 108;
const PADDLE_SPEED = 620;
const BALL_R = 9;
const BASE_SPEED = 430;
const MAX_SPEED = 1050;

const DIFFICULTY = {
  easy: { speed: 380, react: 0.30, error: 60 },
  normal: { speed: 520, react: 0.16, error: 30 },
  hard: { speed: 720, react: 0.06, error: 10 },
};

let mode = "normal";
let state = "menu"; // menu | playing | paused | over
let score = [0, 0];
let rallyCount = 0;

const left = { y: H / 2 - PADDLE_H / 2, vy: 0, target: null, glow: 0 };
const right = { y: H / 2 - PADDLE_H / 2, vy: 0, target: null, glow: 0 };
const ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: BASE_SPEED, spin: 0 };

let trail = [];
let particles = [];
let shake = 0;
let serveDelay = 0;

/* ---------- audio ---------- */
let actx = null;
function beep(freq, dur = 0.06, type = "square", gain = 0.05) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, actx.currentTime);
    g.gain.setValueAtTime(gain, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start();
    o.stop(actx.currentTime + dur);
  } catch (e) {
    /* no audio */
  }
}

/* ---------- input ---------- */
const keys = new Set();
addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", " ", "w", "s", "W", "S"].includes(e.key)) e.preventDefault();
  if (e.key === " ") {
    if (state === "playing") pause();
    else if (state === "paused") resume();
    else startGame();
    return;
  }
  keys.add(e.key.toLowerCase());
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

const pointers = new Map();
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, e);
  handlePointer(e);
});
canvas.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId)) handlePointer(e);
});
canvas.addEventListener("pointerup", (e) => {
  pointers.delete(e.pointerId);
  const stillLeft = [...pointers.values()].some((p) => toLocal(p).x < W / 2);
  const stillRight = [...pointers.values()].some((p) => toLocal(p).x >= W / 2);
  if (!stillLeft) left.target = null;
  if (!stillRight) right.target = null;
});

function toLocal(e) {
  const r = canvas.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
}
function handlePointer(e) {
  const p = toLocal(e);
  if (p.x < W / 2) left.target = p.y - PADDLE_H / 2;
  else if (mode === "2p") right.target = p.y - PADDLE_H / 2;
}

/* ---------- game flow ---------- */
modesEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".mode");
  if (!btn) return;
  mode = btn.dataset.mode;
  [...modesEl.children].forEach((b) => b.classList.toggle("is-active", b === btn));
  beep(520, 0.04, "sine", 0.04);
});
playBtn.addEventListener("click", startGame);

function startGame() {
  if (state === "paused") return resume();
  score = [0, 0];
  renderScore();
  left.y = right.y = H / 2 - PADDLE_H / 2;
  left.target = right.target = null;
  particles = [];
  trail = [];
  serve(Math.random() < 0.5 ? -1 : 1);
  state = "playing";
  overlay.classList.add("hidden");
  beep(660, 0.08, "sine", 0.05);
}

function pause() {
  state = "paused";
  ovTitle.textContent = "PAUSED";
  ovText.textContent = "Space or Play to resume";
  playBtn.textContent = "Resume";
  overlay.classList.remove("hidden");
}
function resume() {
  state = "playing";
  playBtn.textContent = "Play";
  overlay.classList.add("hidden");
}

function serve(dir) {
  ball.x = W / 2;
  ball.y = H / 2 + (Math.random() - 0.5) * 160;
  const angle = (Math.random() - 0.5) * 0.6;
  ball.speed = BASE_SPEED;
  ball.vx = Math.cos(angle) * ball.speed * dir;
  ball.vy = Math.sin(angle) * ball.speed;
  ball.spin = 0;
  rallyCount = 0;
  serveDelay = 0.7;
  trail = [];
}

function renderScore() {
  scoreEls.forEach((el, i) => {
    if (el.textContent !== String(score[i])) {
      el.textContent = score[i];
      el.classList.remove("bump");
      void el.offsetWidth;
      el.classList.add("bump");
      setTimeout(() => el.classList.remove("bump"), 200);
    }
  });
}

function point(who) {
  score[who]++;
  renderScore();
  burst(ball.x, ball.y, who === 0 ? "#4ce0c8" : "#ff4d7e", 34);
  shake = 16;
  beep(150, 0.22, "sawtooth", 0.05);
  if (score[who] >= WIN_SCORE) return gameOver(who);
  serve(who === 0 ? 1 : -1);
}

function gameOver(who) {
  state = "over";
  const p2 = mode === "2p";
  ovTitle.textContent = who === 0 ? (p2 ? "LEFT WINS" : "YOU WIN") : p2 ? "RIGHT WINS" : "CPU WINS";
  ovText.textContent = `${score[0]} — ${score[1]}`;
  playBtn.textContent = "Play again";
  overlay.classList.remove("hidden");
  beep(who === 0 ? 880 : 200, 0.4, "sine", 0.06);
}

/* ---------- effects ---------- */
function burst(x, y, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 60 + Math.random() * 340;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      decay: 1.4 + Math.random(),
      size: 1.5 + Math.random() * 3,
      color,
    });
  }
}

/* ---------- update ---------- */
function movePaddle(p, dt, up, down) {
  const prev = p.y;
  if (p.target !== null) {
    p.y += (p.target - p.y) * Math.min(1, dt * 18);
  } else {
    if (up) p.y -= PADDLE_SPEED * dt;
    if (down) p.y += PADDLE_SPEED * dt;
  }
  p.y = Math.max(0, Math.min(H - PADDLE_H, p.y));
  p.vy = (p.y - prev) / Math.max(dt, 0.0001);
}

function aiMove(p, dt) {
  const cfg = DIFFICULTY[mode] || DIFFICULTY.normal;
  let aim = H / 2;
  if (ball.vx > 0) {
    // predict landing point with wall bounces
    let x = ball.x, y = ball.y, vx = ball.vx, vy = ball.vy;
    let guard = 0;
    while (x < W - PADDLE_W - BALL_R && guard++ < 500) {
      const t = 0.008;
      x += vx * t;
      y += vy * t;
      if (y < BALL_R || y > H - BALL_R) vy *= -1;
    }
    aim = y + (Math.random() - 0.5) * cfg.error;
  }
  const desired = aim - PADDLE_H / 2;
  const prev = p.y;
  p.y += (desired - p.y) * Math.min(1, dt / Math.max(cfg.react, 0.001)) ;
  const maxStep = cfg.speed * dt;
  const delta = p.y - prev;
  if (Math.abs(delta) > maxStep) p.y = prev + Math.sign(delta) * maxStep;
  p.y = Math.max(0, Math.min(H - PADDLE_H, p.y));
  p.vy = (p.y - prev) / Math.max(dt, 0.0001);
}

function hitPaddle(p, side) {
  const rel = (ball.y - (p.y + PADDLE_H / 2)) / (PADDLE_H / 2);
  const clamped = Math.max(-1, Math.min(1, rel));
  const angle = clamped * (Math.PI / 3.4);
  rallyCount++;
  ball.speed = Math.min(MAX_SPEED, ball.speed * 1.055 + 8);
  ball.vx = Math.cos(angle) * ball.speed * side;
  ball.vy = Math.sin(angle) * ball.speed + p.vy * 0.22;
  ball.x = side > 0 ? PADDLE_W + 18 + BALL_R : W - PADDLE_W - 18 - BALL_R;
  p.glow = 1;
  shake = 5;
  burst(ball.x, ball.y, side > 0 ? "#4ce0c8" : "#ff4d7e", 8);
  beep(320 + rallyCount * 22, 0.05, "square", 0.045);
}

function update(dt) {
  left.glow = Math.max(0, left.glow - dt * 3);
  right.glow = Math.max(0, right.glow - dt * 3);
  shake = Math.max(0, shake - dt * 60);

  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vx *= 0.94;
    q.vy *= 0.94;
    q.life -= q.decay * dt;
    if (q.life <= 0) particles.splice(i, 1);
  }

  if (state !== "playing") return;

  movePaddle(left, dt, keys.has("w") || keys.has("arrowup"), keys.has("s") || keys.has("arrowdown"));
  if (mode === "2p") movePaddle(right, dt, keys.has("arrowup") && !keys.has("w"), keys.has("arrowdown") && !keys.has("s"));
  else aiMove(right, dt);

  if (serveDelay > 0) {
    serveDelay -= dt;
    return;
  }

  // sub-stepped motion so fast balls can't tunnel
  const steps = Math.max(1, Math.ceil((Math.abs(ball.vx) * dt) / 8));
  const sdt = dt / steps;
  for (let s = 0; s < steps; s++) {
    ball.x += ball.vx * sdt;
    ball.y += ball.vy * sdt;

    if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); beep(480, 0.03, "sine", 0.03); burst(ball.x, ball.y, "#e8fbff", 5); }
    if (ball.y > H - BALL_R) { ball.y = H - BALL_R; ball.vy = -Math.abs(ball.vy); beep(480, 0.03, "sine", 0.03); burst(ball.x, ball.y, "#e8fbff", 5); }

    const lx = 24;
    if (ball.vx < 0 && ball.x - BALL_R <= lx + PADDLE_W && ball.x - BALL_R >= lx - 14 &&
        ball.y >= left.y - BALL_R && ball.y <= left.y + PADDLE_H + BALL_R) {
      hitPaddle(left, 1);
    }
    const rx = W - 24 - PADDLE_W;
    if (ball.vx > 0 && ball.x + BALL_R >= rx && ball.x + BALL_R <= rx + PADDLE_W + 14 &&
        ball.y >= right.y - BALL_R && ball.y <= right.y + PADDLE_H + BALL_R) {
      hitPaddle(right, -1);
    }

    if (ball.x < -30) { point(1); return; }
    if (ball.x > W + 30) { point(0); return; }
  }

  trail.push({ x: ball.x, y: ball.y });
  if (trail.length > 16) trail.shift();
}

/* ---------- draw ---------- */
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function draw(time) {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  // center line
  ctx.strokeStyle = "rgba(232,251,255,0.10)";
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 20]);
  ctx.lineDashOffset = -time * 0.02;
  ctx.beginPath();
  ctx.moveTo(W / 2, 12);
  ctx.lineTo(W / 2, H - 12);
  ctx.stroke();
  ctx.setLineDash([]);

  // center circle
  ctx.strokeStyle = "rgba(232,251,255,0.055)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 86, 0, Math.PI * 2);
  ctx.stroke();

  // particles
  for (const q of particles) {
    ctx.globalAlpha = Math.max(0, q.life);
    ctx.fillStyle = q.color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.size * q.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // paddles
  drawPaddle(24, left.y, "#4ce0c8", left.glow);
  drawPaddle(W - 24 - PADDLE_W, right.y, "#ff4d7e", right.glow);

  // ball trail
  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const a = (i / trail.length) * 0.4;
    ctx.globalAlpha = a;
    ctx.fillStyle = "#e8fbff";
    ctx.beginPath();
    ctx.arc(t.x, t.y, BALL_R * (i / trail.length) * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ball
  if (state !== "menu") {
    const pulse = serveDelay > 0 ? 0.5 + Math.abs(Math.sin(time * 0.012)) * 0.5 : 1;
    ctx.globalAlpha = pulse;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 26;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // rally counter
  if (state === "playing" && rallyCount > 2) {
    ctx.font = "600 13px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(232,251,255,0.28)";
    ctx.fillText(`RALLY ${rallyCount}`, W / 2, 40);
  }

  ctx.restore();
}

function drawPaddle(x, y, color, glow) {
  ctx.shadowColor = color;
  ctx.shadowBlur = 18 + glow * 34;
  ctx.fillStyle = color;
  roundRect(x, y, PADDLE_W, PADDLE_H, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (glow > 0) {
    ctx.globalAlpha = glow * 0.5;
    ctx.fillStyle = "#fff";
    roundRect(x, y, PADDLE_W, PADDLE_H, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// debug handle (used for automated checks)
window.__pong = { ball, left, right, get state() { return state; }, get score() { return score; } };

/* ---------- loop ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
