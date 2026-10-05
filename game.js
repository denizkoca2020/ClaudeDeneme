// 🎈 Balon Patlatma — 7 yaş için basit bir dokunmatik oyun.
// Kaybetmek yok: balonlara dokun, patlat, yıldız topla, seviye atla!
(() => {
  'use strict';

  // ---------- Ayarlar (oynayarak değiştirebilirsiniz) ----------
  const COLORS = ['#ff4d6d', '#ffb703', '#3a86ff', '#06d6a0', '#8338ec', '#fb5607', '#ff70a6'];
  const GOLD = '#ffd60a';
  const STARS_PER_LEVEL = 10;   // kaç yıldızda bir seviye atlanır
  const GOLDEN_CHANCE = 0.08;   // altın balon olasılığı (3 yıldız değerinde)
  const MAX_BALLOONS = 9;       // ekranda aynı anda en fazla balon

  // ---------- Ekran öğeleri ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const startScreen = $('startScreen');
  const hud = $('hud');
  const scoreValue = $('scoreValue');
  const levelValue = $('levelValue');
  const bestBox = $('best');
  const bestValue = $('bestValue');
  const muteBtn = $('muteBtn');
  const celebrate = $('celebrate');
  const celebrateLevel = $('celebrateLevel');

  // ---------- Kalıcı ayarlar (tarayıcı izin vermezse sessizce geçer) ----------
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
      catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* yok say */ }
    },
  };

  // ---------- Oyun durumu ----------
  let W = 0, H = 0;
  let running = false;
  let balloons = [];
  let particles = [];
  let floaters = [];
  let clouds = [];
  let score = 0;
  let level = 1;
  let spawnTimer = 0;
  let lastTime = 0;
  let time = 0;
  let best = store.get('balon.best', 0);
  let muted = store.get('balon.muted', false);

  // ---------- Sesler (dosya gerekmez, tarayıcıda üretilir) ----------
  let audio = null;

  function unlockAudio() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio = new AC();
    }
    if (audio && audio.state === 'suspended') audio.resume();
  }

  function tone(freq, start, dur, type = 'sine', vol = 0.25, slideTo = null) {
    if (!audio || muted) return;
    const t0 = audio.currentTime + start;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol = 0.3) {
    if (!audio || muted) return;
    const len = Math.floor(audio.sampleRate * dur);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.createBufferSource();
    const gain = audio.createGain();
    gain.gain.value = vol;
    src.buffer = buf;
    src.connect(gain).connect(audio.destination);
    src.start();
  }

  const sounds = {
    pop() {
      noise(0.08, 0.35);
      tone(500 + Math.random() * 300, 0, 0.12, 'triangle', 0.25, 120);
    },
    golden() {
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.18, 'triangle', 0.2));
    },
    levelUp() {
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'square', 0.12));
    },
    start() {
      tone(392, 0, 0.12, 'triangle', 0.2);
      tone(523, 0.1, 0.18, 'triangle', 0.2);
    },
  };

  // ---------- Ekran boyutu ----------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (clouds.length === 0) makeClouds();
  }

  function makeClouds() {
    clouds = [];
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 60 + Math.random() * H * 0.6,
        s: 0.6 + Math.random() * 0.9,
        v: 8 + Math.random() * 14,
      });
    }
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const balloonRadius = () => Math.max(46, Math.min(W, H) * 0.085);

  // ---------- Balonlar ----------
  function spawnBalloon() {
    const r = balloonRadius() * rand(0.9, 1.15);
    const golden = Math.random() < GOLDEN_CHANCE;
    balloons.push({
      x: rand(r + 10, W - r - 10),
      y: H + r * 1.5,
      r,
      speed: (70 + level * 14) * rand(0.8, 1.2),
      phase: rand(0, Math.PI * 2),
      color: golden ? GOLD : COLORS[Math.floor(Math.random() * COLORS.length)],
      golden,
    });
  }

  function popBalloon(index) {
    const b = balloons[index];
    balloons.splice(index, 1);

    const value = b.golden ? 3 : 1;
    const pieces = b.golden ? 26 : 14;
    for (let i = 0; i < pieces; i++) {
      const a = (Math.PI * 2 * i) / pieces + rand(-0.2, 0.2);
      const sp = rand(150, 380);
      particles.push({
        x: b.x, y: b.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, size: rand(6, 12),
        color: b.golden ? (i % 2 ? GOLD : '#fff') : b.color,
        rot: rand(0, Math.PI), spin: rand(-8, 8),
      });
    }
    floaters.push({ x: b.x, y: b.y, text: '+' + value + ' ⭐', life: 1 });

    if (b.golden) sounds.golden(); else sounds.pop();
    if (navigator.vibrate) navigator.vibrate(15);

    score += value;
    scoreValue.textContent = score;

    if (score >= level * STARS_PER_LEVEL) levelUp();
  }

  function levelUp() {
    level++;
    levelValue.textContent = level;
    sounds.levelUp();
    confetti(90);
    celebrateLevel.textContent = level;
    celebrate.classList.remove('hidden');
    // Animasyonu yeniden başlatmak için küçük hile
    celebrate.style.animation = 'none';
    void celebrate.offsetWidth;
    celebrate.style.animation = '';
    clearTimeout(levelUp.timer);
    levelUp.timer = setTimeout(() => celebrate.classList.add('hidden'), 1600);
  }

  function confetti(count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: rand(0, W), y: rand(-80, -10),
        vx: rand(-60, 60), vy: rand(80, 260),
        life: 1.6, size: rand(8, 14),
        color: COLORS[i % COLORS.length],
        rot: rand(0, Math.PI), spin: rand(-6, 6),
        confetti: true,
      });
    }
  }

  // ---------- Dokunma ----------
  function onPointerDown(e) {
    unlockAudio();
    if (!running) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // En üstteki (en son çizilen) balondan başlayarak kontrol et.
    // Küçük parmaklar için dokunma alanı balondan biraz daha büyük.
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      const dx = (px - b.x) / (b.r * 1.25);
      const dy = (py - b.y) / (b.r * 1.45);
      if (dx * dx + dy * dy <= 1) {
        popBalloon(i);
        return;
      }
    }
  }

  // ---------- Güncelleme ----------
  function update(dt) {
    time += dt;

    for (const c of clouds) {
      c.x += c.v * dt;
      if (c.x - 120 * c.s > W) { c.x = -140 * c.s; c.y = 60 + Math.random() * H * 0.6; }
    }

    if (running) {
      spawnTimer -= dt;
      const interval = Math.max(0.45, 1.15 - level * 0.07);
      if (spawnTimer <= 0 && balloons.length < MAX_BALLOONS) {
        spawnBalloon();
        spawnTimer = interval * rand(0.7, 1.3);
      }
    }

    for (const b of balloons) {
      b.y -= b.speed * dt;
      b.x += Math.sin(time * 1.6 + b.phase) * 18 * dt;
    }
    // Ekranın üstünden çıkan balonlar sessizce kaybolur (ceza yok).
    balloons = balloons.filter((b) => b.y > -b.r * 3);

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.confetti) {
        p.vx += Math.sin(time * 3 + p.rot) * 20 * dt;
        p.life -= dt * 0.35;
      } else {
        p.vy += 500 * dt;
        p.life -= dt * 1.4;
      }
      p.rot += p.spin * dt;
    }
    particles = particles.filter((p) => p.life > 0 && p.y < H + 40);

    for (const f of floaters) {
      f.y -= 70 * dt;
      f.life -= dt * 1.1;
    }
    floaters = floaters.filter((f) => f.life > 0);
  }

  // ---------- Çizim ----------
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5bb6ff');
    g.addColorStop(0.7, '#a8dcff');
    g.addColorStop(1, '#d9f1ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Güneş
    ctx.fillStyle = 'rgba(255, 230, 120, 0.9)';
    ctx.beginPath();
    ctx.arc(W - 90, 150, 55, 0, Math.PI * 2);
    ctx.fill();

    // Bulutlar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    for (const c of clouds) {
      const s = c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 34 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 38 * s, c.y - 16 * s, 42 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 80 * s, c.y, 32 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 40 * s, c.y + 12 * s, 34 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Çimen
    ctx.fillStyle = '#7bd389';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(0, H - 40);
    for (let x = 0; x <= W; x += 40) ctx.quadraticCurveTo(x + 20, H - 70, x + 40, H - 40);
    ctx.lineTo(W, H);
    ctx.fill();
  }

  function drawBalloon(b) {
    const { x, y, r } = b;
    const ry = r * 1.2;

    // İp
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + ry + 6);
    const sway = Math.sin(time * 3 + b.phase) * 10;
    ctx.bezierCurveTo(x + sway, y + ry + 30, x - sway, y + ry + 60, x + sway * 0.5, y + ry + 90);
    ctx.stroke();

    // Düğüm
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(x, y + ry - 2);
    ctx.lineTo(x - 9, y + ry + 10);
    ctx.lineTo(x + 9, y + ry + 10);
    ctx.closePath();
    ctx.fill();

    // Gövde
    const g = ctx.createRadialGradient(x - r * 0.35, y - ry * 0.4, r * 0.1, x, y, r * 1.3);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.25, b.color);
    g.addColorStop(1, shade(b.color, -40));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Parlama
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.4, y - ry * 0.45, r * 0.16, ry * 0.28, -0.5, 0, Math.PI * 2);
    ctx.fill();

    if (b.golden) {
      ctx.font = `${Math.round(r * 0.9)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', x, y + 4);
      // Pırıltı
      const sp = (Math.sin(time * 8 + b.phase) + 1) / 2;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 + sp * 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y, r + 6 + sp * 4, ry + 6 + sp * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function draw() {
    drawSky();
    for (const b of balloons) drawBalloon(b);

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 40px "Chalkboard SE", "Comic Sans MS", system-ui, sans-serif';
    for (const f of floaters) {
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#3a3a6a';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = '#fff';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  // Bir rengi açar (+) ya da koyulaştırır (-)
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => Math.max(0, Math.min(255, v + amt));
    return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
  }

  // ---------- Ana döngü ----------
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- Ekranlar ----------
  function startGame() {
    unlockAudio();
    sounds.start();
    score = 0;
    level = 1;
    balloons = [];
    particles = [];
    floaters = [];
    spawnTimer = 0;
    scoreValue.textContent = '0';
    levelValue.textContent = '1';
    startScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    running = true;
  }

  function goHome() {
    running = false;
    if (score > best) {
      best = score;
      store.set('balon.best', best);
    }
    balloons = [];
    celebrate.classList.add('hidden');
    hud.classList.add('hidden');
    showBest();
    startScreen.classList.remove('hidden');
  }

  function showBest() {
    bestValue.textContent = best;
    bestBox.classList.toggle('hidden', best <= 0);
  }

  function updateMuteIcon() {
    muteBtn.textContent = muted ? '🔇' : '🔊';
  }

  // ---------- Olaylar ----------
  $('startBtn').addEventListener('click', startGame);
  $('homeBtn').addEventListener('click', goHome);
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    store.set('balon.muted', muted);
    updateMuteIcon();
    unlockAudio();
    sounds.start();
  });

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });

  // iPad'de yakınlaştırma / kaydırma hareketlerini engelle
  ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) =>
    document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    lastTime = performance.now();
    if (!document.hidden && audio && audio.state === 'suspended') audio.resume();
  });

  // Çevrimdışı çalışma desteği
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  resize();
  updateMuteIcon();
  showBest();
  requestAnimationFrame((t) => { lastTime = t; loop(t); });
})();
