// =========================================================
// MOTOR DE FUEGOS ARTIFICIALES, CONFETI Y SONIDO (60 FPS FLUIDO)
// =========================================================

// Configuración y Estado
const state = {
  soundEnabled: true,
  isCelebrationActive: false,
  autoFireworksTimer: null,
  audioCtx: null,
};

// Canvas Setup
const canvas = document.getElementById('fireworksCanvas');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

let width = window.innerWidth;
let height = window.innerHeight;
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Paletas de colores vibrantes para los cuetes
const COLOR_PALETTES = [
  ['#ff1744', '#ff5252', '#ffd700', '#ffffff'],
  ['#00e676', '#69f0ae', '#00f2fe', '#ffffff'],
  ['#d500f9', '#ea80fc', '#ff4081', '#ffffff'],
  ['#00b0ff', '#40c4ff', '#ffffff', '#ffd700'],
  ['#ffd600', '#ff9100', '#ff3d00', '#ffffff'],
];

// Arreglos de partículas
const MAX_PARTICLES = 180;
const rockets = [];
const particles = [];
const confetti = [];

// =========================================================
// SINTETIZADOR DE AUDIO (Web Audio API)
// =========================================================
function initAudio() {
  if (!state.audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      state.audioCtx = new AudioContext();
    }
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') {
    state.audioCtx.resume();
  }
}

function playLaunchSound() {
  if (!state.soundEnabled || !state.audioCtx) return;
  try {
    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, state.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, state.audioCtx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.05, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(state.audioCtx.destination);

    osc.start();
    osc.stop(state.audioCtx.currentTime + 0.2);
  } catch (e) {}
}

function playExplosionSound() {
  if (!state.soundEnabled || !state.audioCtx) return;
  try {
    const bufferSize = Math.floor(state.audioCtx.sampleRate * 0.25);
    const buffer = state.audioCtx.createBuffer(1, bufferSize, state.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = state.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = state.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, state.audioCtx.currentTime);
    filter.frequency.linearRampToValueAtTime(80, state.audioCtx.currentTime + 0.25);

    const gain = state.audioCtx.createGain();
    gain.gain.setValueAtTime(0.25, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(state.audioCtx.destination);

    noise.start();
    noise.stop(state.audioCtx.currentTime + 0.25);
  } catch (e) {}
}

function playCelebrationChime() {
  if (!state.soundEnabled || !state.audioCtx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, index) => {
      const startTime = state.audioCtx.currentTime + index * 0.1;
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

      osc.connect(gain);
      gain.connect(state.audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.45);
    });
  } catch (e) {}
}

// =========================================================
// COHETES, PARTÍCULAS Y CONFETI
// =========================================================

class Rocket {
  constructor(targetX, targetY) {
    this.x = targetX || Math.random() * (width - 80) + 40;
    this.y = height + 10;
    this.targetY = targetY || Math.random() * (height * 0.45) + height * 0.12;
    this.speed = Math.random() * 4 + 12;
    this.exploded = false;
    this.palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
    this.trailY = this.y;
    playLaunchSound();
  }

  update() {
    this.trailY = this.y;
    this.y -= this.speed;

    if (this.y <= this.targetY) {
      this.exploded = true;
      this.explode();
    }
  }

  draw() {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.trailY + 12);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  explode() {
    playExplosionSound();
    const count = width < 600 ? 28 : 40;

    if (particles.length > MAX_PARTICLES) {
      particles.splice(0, particles.length - MAX_PARTICLES + count);
    }

    for (let i = 0; i < count; i++) {
      const color = this.palette[i % this.palette.length];
      particles.push(new Particle(this.x, this.y, color));
    }
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 5.5 + 1.5;
    this.vx = Math.cos(angle) * velocity;
    this.vy = Math.sin(angle) * velocity;
    this.alpha = 1;
    this.decay = Math.random() * 0.024 + 0.018;
    this.gravity = 0.14;
    this.friction = 0.95;
    this.radius = Math.random() * 2 + 1.2;
  }

  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw() {
    if (this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

class ConfettiPiece {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * -height;
    this.size = Math.random() * 7 + 5;
    this.color = ['#ff3385', '#ffd154', '#00f2fe', '#ffffff', '#00e676'][
      Math.floor(Math.random() * 5)
    ];
    this.vy = Math.random() * 1.8 + 1.2;
    this.vx = Math.sin(Math.random() * 4) * 0.8;
  }

  update() {
    this.y += this.vy;
    this.x += this.vx;

    if (this.y > height + 10) {
      this.y = -10;
      this.x = Math.random() * width;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size * 0.6);
  }
}

function initConfetti() {
  confetti.length = 0;
  const count = width < 600 ? 25 : 45;
  for (let i = 0; i < count; i++) {
    confetti.push(new ConfettiPiece());
  }
}

// Bucle de animación optimizado a 60fps
function animate() {
  requestAnimationFrame(animate);

  // Fondo semi-transparente para efecto estela
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#090a1a';
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 1;

  // Dibujar y actualizar cohetes
  for (let i = rockets.length - 1; i >= 0; i--) {
    rockets[i].update();
    rockets[i].draw();
    if (rockets[i].exploded) {
      rockets.splice(i, 1);
    }
  }

  // Dibujar y actualizar partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  // Confeti
  if (state.isCelebrationActive) {
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < confetti.length; i++) {
      confetti[i].update();
      confetti[i].draw();
    }
  }
}

animate();

// =========================================================
// DISPARADORES Y CONTROL DE EVENTOS
// =========================================================

function launchFirework(targetX, targetY) {
  if (rockets.length < 5) {
    rockets.push(new Rocket(targetX, targetY));
  }
}

function launchBurst(count = 4) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const rx = Math.random() * (width * 0.8) + width * 0.1;
      const ry = Math.random() * (height * 0.4) + height * 0.1;
      launchFirework(rx, ry);
    }, i * 160);
  }
}

function startCelebration() {
  if (state.isCelebrationActive) return;
  state.isCelebrationActive = true;
  initAudio();
  initConfetti();
  playCelebrationChime();

  const introScreen = document.getElementById('introScreen');
  const celebrationScreen = document.getElementById('celebrationScreen');

  introScreen.classList.remove('active');
  setTimeout(() => {
    introScreen.classList.add('hidden');
    celebrationScreen.classList.remove('hidden');
    void celebrationScreen.offsetWidth;
    celebrationScreen.classList.add('active');
  }, 350);

  launchBurst(5);

  if (state.autoFireworksTimer) clearInterval(state.autoFireworksTimer);
  state.autoFireworksTimer = setInterval(() => {
    if (Math.random() > 0.35) {
      launchFirework();
    }
  }, 1600);
}

// =========================================================
// INICIALIZACIÓN DE ELEMENTOS DEL DOM
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btnStart');
  const giftBox = document.getElementById('giftBox');
  const launchFireworkBtn = document.getElementById('launchFireworkBtn');
  const boostBtn = document.getElementById('boostBtn');
  const soundToggle = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');
  const openLetterBtn = document.getElementById('openLetterBtn');
  const letterModal = document.getElementById('letterModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const closeModalActionBtn = document.getElementById('closeModalActionBtn');

  btnStart.addEventListener('click', startCelebration);
  giftBox.addEventListener('click', startCelebration);

  launchFireworkBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    launchBurst(5);
  });

  boostBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    launchBurst(6);
  });

  // Tocar cualquier parte de la pantalla para lanzar un cuete
  document.body.addEventListener('pointerdown', (e) => {
    if (
      e.target.closest('button') ||
      e.target.closest('.modal-card') ||
      !state.isCelebrationActive
    ) {
      return;
    }
    initAudio();
    launchFirework(e.clientX, e.clientY);
  });

  soundToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    state.soundEnabled = !state.soundEnabled;
    soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
    soundToggle.classList.toggle('muted', !state.soundEnabled);
  });

  function openModal() {
    letterModal.classList.remove('hidden');
    launchBurst(3);
  }

  function closeModal() {
    letterModal.classList.add('hidden');
    launchBurst(5); // Ráfaga festiva de cuetes al cerrar la carta
  }

  openLetterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openModal();
  });

  closeModalBtn.addEventListener('click', closeModal);
  closeModalActionBtn.addEventListener('click', closeModal);

  letterModal.addEventListener('click', (e) => {
    if (e.target === letterModal) {
      closeModal();
    }
  });
});
