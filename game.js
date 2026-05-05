const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  keys: {},
  ship: null,
  asteroids: [],
  bullets: [],
  particles: [],
  score: 0,
  lives: 3,
  level: 1,
  gameOver: false,
  canShoot: true,
};

const rand = (min, max) => Math.random() * (max - min) + min;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makeShip() {
  return { x: canvas.width / 2, y: canvas.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, radius: 14, invuln: 100 };
}

function spawnAsteroid(size = 3, x = rand(0, canvas.width), y = rand(0, canvas.height)) {
  const speed = rand(0.5, 1.8) + (4 - size) * 0.2 + state.level * 0.05;
  const angle = rand(0, Math.PI * 2);
  state.asteroids.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    radius: size * 16,
    spin: rand(-0.02, 0.02),
    rot: rand(0, Math.PI * 2),
    points: Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI * 2 / 10) * i;
      return { a, r: rand(0.7, 1.15) };
    })
  });
}

function nextLevel() {
  state.level += 1;
  for (let i = 0; i < 3 + state.level; i++) {
    let x, y;
    do {
      x = rand(0, canvas.width); y = rand(0, canvas.height);
    } while (Math.hypot(x - state.ship.x, y - state.ship.y) < 160);
    spawnAsteroid(3, x, y);
  }
}

function resetGame() {
  state.ship = makeShip();
  state.asteroids = [];
  state.bullets = [];
  state.particles = [];
  state.score = 0;
  state.lives = 3;
  state.level = 0;
  state.gameOver = false;
  nextLevel();
}

function explode(x, y, color = '#ffd166', count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1, 5);
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rand(20, 40), color });
  }
}

function wrap(o) {
  if (o.x < -40) o.x = canvas.width + 40;
  if (o.x > canvas.width + 40) o.x = -40;
  if (o.y < -40) o.y = canvas.height + 40;
  if (o.y > canvas.height + 40) o.y = -40;
}

function update() {
  const s = state.ship;

  if (!state.gameOver) {
    if (state.keys['a']) s.angle -= 0.07;
    if (state.keys['d']) s.angle += 0.07;
    if (state.keys['w']) {
      s.vx += Math.cos(s.angle) * 0.16;
      s.vy += Math.sin(s.angle) * 0.16;
      explode(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14, '#7df9ff', 2);
    }

    s.vx *= 0.992;
    s.vy *= 0.992;
    s.x += s.vx;
    s.y += s.vy;
    wrap(s);

    if (s.invuln > 0) s.invuln--;

    if (state.keys[' '] && state.canShoot) {
      state.canShoot = false;
      state.bullets.push({ x: s.x + Math.cos(s.angle) * 18, y: s.y + Math.sin(s.angle) * 18, vx: Math.cos(s.angle) * 8 + s.vx, vy: Math.sin(s.angle) * 8 + s.vy, life: 55 });
    }
  }

  state.bullets = state.bullets.filter(b => {
    b.x += b.vx; b.y += b.vy; b.life--;
    wrap(b);
    return b.life > 0;
  });

  state.asteroids.forEach(a => {
    a.x += a.vx; a.y += a.vy; a.rot += a.spin;
    wrap(a);
  });

  for (let i = state.asteroids.length - 1; i >= 0; i--) {
    const a = state.asteroids[i];

    for (let j = state.bullets.length - 1; j >= 0; j--) {
      const b = state.bullets[j];
      if (dist(a, b) < a.radius) {
        state.bullets.splice(j, 1);
        state.asteroids.splice(i, 1);
        explode(a.x, a.y, '#ff8fab', 18);
        state.score += (4 - a.size) * 25;
        if (a.size > 1) {
          spawnAsteroid(a.size - 1, a.x + rand(-5, 5), a.y + rand(-5, 5));
          spawnAsteroid(a.size - 1, a.x + rand(-5, 5), a.y + rand(-5, 5));
        }
        break;
      }
    }
  }

  if (!state.gameOver && state.ship.invuln <= 0) {
    for (const a of state.asteroids) {
      if (dist(a, s) < a.radius + s.radius - 4) {
        explode(s.x, s.y, '#ff5252', 32);
        state.lives -= 1;
        if (state.lives <= 0) {
          state.gameOver = true;
        } else {
          state.ship = makeShip();
        }
        break;
      }
    }
  }

  state.particles = state.particles.filter(p => {
    p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.vy *= 0.98; p.life -= 1;
    return p.life > 0;
  });

  if (!state.gameOver && state.asteroids.length === 0) nextLevel();
}

function drawShip(s) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle + Math.PI / 2);
  ctx.strokeStyle = s.invuln > 0 ? '#a5b4fcaa' : '#f8fafc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(11, 14);
  ctx.lineTo(0, 8);
  ctx.lineTo(-11, 14);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.8})`;
    ctx.fillRect((i * 83) % canvas.width, (i * 47) % canvas.height, 1, 1);
  }

  state.asteroids.forEach(a => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.strokeStyle = '#dbeafe';
    ctx.lineWidth = 2;
    ctx.beginPath();
    a.points.forEach((p, idx) => {
      const x = Math.cos(p.a) * a.radius * p.r;
      const y = Math.sin(p.a) * a.radius * p.r;
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  });

  ctx.fillStyle = '#93c5fd';
  state.bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 2, 4, 4));

  state.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 2, 2);
  });

  drawShip(state.ship);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '20px Inter, sans-serif';
  ctx.fillText(`Score: ${state.score}`, 16, 28);
  ctx.fillText(`Lives: ${state.lives}`, 16, 54);
  ctx.fillText(`Level: ${state.level}`, 16, 80);

  if (state.gameOver) {
    ctx.fillStyle = '#000a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 52px Inter, sans-serif';
    ctx.fillText('GAME OVER', canvas.width / 2 - 170, canvas.height / 2 - 10);
    ctx.font = '24px Inter, sans-serif';
    ctx.fillText('Drücke R für Neustart', canvas.width / 2 - 120, canvas.height / 2 + 35);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', e => {
  state.keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
  if (e.key.toLowerCase() === 'r' && state.gameOver) resetGame();
});
window.addEventListener('keyup', e => {
  state.keys[e.key.toLowerCase()] = false;
  if (e.key === ' ') state.canShoot = true;
});

resetGame();
loop();
