/**
 * FOX RUNNER: PIXEL DASH
 * Permainan Arcade Retro Pixel 8-Bit mandiri untuk Portofolio KadalApi.
 * Karakter: KadalApi Fox_404
 * Render: Pure HTML5 Canvas 2D Pixel Art
 * Audio: Built-in Web Audio API Chiptune Synth (Zero external asset dependencies)
 * Sesuai prinsip Anti-Slop: Zero raw emojis, strict typography & responsive geometry.
 */

(function () {
  'use strict';

  // State & Game Constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 400;
  const GROUND_Y = 320;
  const GRAVITY = 0.65;
  const JUMP_FORCE = -11.5;
  const DOUBLE_JUMP_FORCE = -10.2;

  // DOM Elements
  const modal = document.getElementById('gameModal');
  const canvas = document.getElementById('foxRunnerCanvas');
  if (!canvas || !modal) return;
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('gameScoreDisplay');
  const highEl = document.getElementById('gameHighScoreDisplay');
  const levelEl = document.getElementById('gameLevelDisplay');
  const soundBtn = document.getElementById('gameSoundToggle');
  const crtBtn = document.getElementById('gameCrtToggle');
  const pauseBtn = document.getElementById('gamePauseToggle');
  const closeBtn = document.getElementById('gameModalClose');
  const mobileJumpBtn = document.getElementById('gameMobileJump');

  // Trigger buttons
  const heroArcadeBtn = document.getElementById('openArcadeBtn');
  const navArcadeBtn = document.getElementById('navArcadeBtn');

  // Audio Context & Chiptune Synthesizer
  let audioCtx = null;
  let soundEnabled = true;
  try {
    const savedSound = localStorage.getItem('kadalapi_fox_sound');
    if (savedSound !== null) soundEnabled = savedSound === 'true';
  } catch (e) {}

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, duration, type = 'square', startGain = 0.12, endGain = 0.001) {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      const now = actx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(startGain, now);
      gain.gain.exponentialRampToValueAtTime(endGain, now + duration);

      osc.connect(gain);
      gain.connect(actx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  function playJumpSound(isDouble = false) {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = 'square';
      const startFreq = isDouble ? 340 : 220;
      const endFreq = isDouble ? 680 : 480;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  function playCollectSound() {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const now = actx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.14, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.08);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.08);
      });
    } catch (e) {}
  }

  function playPowerupSound() {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const now = actx.currentTime;
      [440, 554, 659, 880].forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.13, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.1);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.1);
      });
    } catch (e) {}
  }

  function playCrashSound() {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.28);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {}
  }

  // High Score Storage
  let highScore = 0;
  try {
    highScore = parseInt(localStorage.getItem('kadalapi_fox_highscore'), 10) || 0;
  } catch (e) {}
  if (highEl) highEl.textContent = highScore.toString().padStart(5, '0');

  // Game Engine State
  const GameState = {
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover'
  };

  let currentState = GameState.READY;
  let score = 0;
  let distance = 0;
  let gameSpeed = 5;
  let baseSpeed = 5;
  let boostTimer = 0;
  let level = 1;
  let animationFrameId = null;
  let lastTimestamp = 0;

  // Particle list
  let particles = [];

  // Scenery & Parallax layers
  let bgOffset = 0;
  let midOffset = 0;
  let groundOffset = 0;

  const clouds = [
    { x: 50, y: 40, w: 70, h: 22, speed: 0.3 },
    { x: 260, y: 70, w: 90, h: 26, speed: 0.4 },
    { x: 520, y: 35, w: 80, h: 24, speed: 0.35 },
    { x: 730, y: 60, w: 60, h: 20, speed: 0.25 }
  ];

  // Player / Fox Sprite Model
  const fox = {
    x: 80,
    y: GROUND_Y - 36,
    w: 42,
    h: 36,
    vy: 0,
    isGrounded: true,
    jumpCount: 0,
    maxJumps: 2,
    runFrame: 0,
    frameTimer: 0,
    flipAngle: 0,
    reset() {
      this.x = 80;
      this.y = GROUND_Y - this.h;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
      this.runFrame = 0;
      this.frameTimer = 0;
      this.flipAngle = 0;
    },
    jump() {
      if (this.jumpCount < this.maxJumps) {
        if (this.jumpCount === 0) {
          this.vy = JUMP_FORCE;
          playJumpSound(false);
          createDustParticles(this.x + 10, this.y + this.h, 6);
        } else {
          this.vy = DOUBLE_JUMP_FORCE;
          this.flipAngle = 360;
          playJumpSound(true);
          createDustParticles(this.x + 20, this.y + this.h / 2, 8, '#FDBA74');
        }
        this.jumpCount++;
        this.isGrounded = false;
      }
    },
    update(dt) {
      this.vy += GRAVITY;
      this.y += this.vy;

      if (this.y >= GROUND_Y - this.h) {
        if (!this.isGrounded) {
          createDustParticles(this.x + 10, GROUND_Y, 5);
        }
        this.y = GROUND_Y - this.h;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpCount = 0;
      }

      if (this.flipAngle > 0) {
        this.flipAngle -= dt * 720;
        if (this.flipAngle < 0) this.flipAngle = 0;
      }

      if (this.isGrounded) {
        this.frameTimer += dt * (gameSpeed * 2.2);
        if (this.frameTimer >= 1) {
          this.runFrame = (this.runFrame + 1) % 4;
          this.frameTimer = 0;
        }
      }
    },
    draw() {
      ctx.save();
      ctx.translate(Math.round(this.x + this.w / 2), Math.round(this.y + this.h / 2));

      if (this.flipAngle > 0) {
        ctx.rotate((-this.flipAngle * Math.PI) / 180);
      }

      ctx.translate(-Math.round(this.w / 2), -Math.round(this.h / 2));

      // Draw Pixel Fox with precise pixel grid
      drawPixelFox(ctx, this.runFrame, this.isGrounded, currentState === GameState.GAMEOVER);

      ctx.restore();
    }
  };

  /**
   * Render maskot Pixel Fox selaras dengan identitas visual hero
   */
  function drawPixelFox(c, frame, isGrounded, isDead) {
    const p = 2; // Ukuran 1 unit pixel = 2x2 px

    // Palette
    const cOutline = '#15130F';
    const cMain = '#F97316';
    const cShade = '#EA6A0C';
    const cLight = '#FDBA74';
    const cWhite = '#FFF8EF';
    const cPaws = '#4A2A12';

    // Vertical bobbing saat lari
    const bob = isGrounded && (frame === 1 || frame === 3) ? -1 : 0;

    c.save();
    c.translate(0, bob);

    // Ekor
    const tailY = frame === 2 ? 10 : 12;
    c.fillStyle = cOutline;
    c.fillRect(0 * p, tailY * p, 4 * p, 6 * p);
    c.fillStyle = cShade;
    c.fillRect(1 * p, (tailY + 1) * p, 3 * p, 5 * p);
    c.fillStyle = cWhite;
    c.fillRect(0 * p, (tailY - 2) * p, 3 * p, 3 * p);

    // Telinga Kiri
    c.fillStyle = cOutline;
    c.fillRect(5 * p, 1 * p, 4 * p, 5 * p);
    c.fillStyle = cShade;
    c.fillRect(6 * p, 2 * p, 3 * p, 4 * p);
    c.fillStyle = cWhite;
    c.fillRect(7 * p, 3 * p, 1 * p, 2 * p);

    // Telinga Kanan
    c.fillStyle = cOutline;
    c.fillRect(13 * p, 1 * p, 4 * p, 5 * p);
    c.fillStyle = cShade;
    c.fillRect(13 * p, 2 * p, 3 * p, 4 * p);
    c.fillStyle = cWhite;
    c.fillRect(14 * p, 3 * p, 1 * p, 2 * p);

    // Kepala
    c.fillStyle = cOutline;
    c.fillRect(4 * p, 5 * p, 14 * p, 9 * p);
    c.fillStyle = cMain;
    c.fillRect(5 * p, 6 * p, 12 * p, 7 * p);

    // Dahi highlight
    c.fillStyle = cLight;
    c.fillRect(5 * p, 6 * p, 12 * p, 1 * p);

    // Pipi putih & moncong
    c.fillStyle = cWhite;
    c.fillRect(6 * p, 9 * p, 10 * p, 4 * p);

    // Mata / Dizzy jika dead
    if (isDead) {
      // X X eyes
      c.fillStyle = cOutline;
      // Mata kiri X
      c.fillRect(7 * p, 8 * p, 1 * p, 1 * p);
      c.fillRect(9 * p, 8 * p, 1 * p, 1 * p);
      c.fillRect(8 * p, 9 * p, 1 * p, 1 * p);
      c.fillRect(7 * p, 10 * p, 1 * p, 1 * p);
      c.fillRect(9 * p, 10 * p, 1 * p, 1 * p);

      // Mata kanan X
      c.fillRect(12 * p, 8 * p, 1 * p, 1 * p);
      c.fillRect(14 * p, 8 * p, 1 * p, 1 * p);
      c.fillRect(13 * p, 9 * p, 1 * p, 1 * p);
      c.fillRect(12 * p, 10 * p, 1 * p, 1 * p);
      c.fillRect(14 * p, 10 * p, 1 * p, 1 * p);
    } else {
      c.fillStyle = cOutline;
      c.fillRect(8 * p, 8 * p, 2 * p, 3 * p);
      c.fillRect(13 * p, 8 * p, 2 * p, 3 * p);
      // Pupil kilau
      c.fillStyle = '#FFFFFF';
      c.fillRect(8 * p, 8 * p, 1 * p, 1 * p);
      c.fillRect(13 * p, 8 * p, 1 * p, 1 * p);
    }

    // Hidung hitam
    c.fillStyle = cOutline;
    c.fillRect(10 * p, 11 * p, 2 * p, 2 * p);

    // Badan
    c.fillStyle = cOutline;
    c.fillRect(4 * p, 13 * p, 11 * p, 5 * p);
    c.fillStyle = cMain;
    c.fillRect(5 * p, 13 * p, 9 * p, 4 * p);

    // Dada putih
    c.fillStyle = cWhite;
    c.fillRect(9 * p, 13 * p, 4 * p, 3 * p);

    // Kaki depan & belakang animasi langkah
    c.fillStyle = cOutline;
    if (!isGrounded) {
      // Paws tucked saat lompat
      c.fillRect(5 * p, 17 * p, 2 * p, 2 * p);
      c.fillRect(12 * p, 16 * p, 2 * p, 2 * p);
      c.fillStyle = cPaws;
      c.fillRect(5 * p, 18 * p, 2 * p, 1 * p);
      c.fillRect(12 * p, 17 * p, 2 * p, 1 * p);
    } else if (frame === 0 || frame === 2) {
      c.fillRect(4 * p, 17 * p, 2 * p, 2 * p);
      c.fillRect(12 * p, 17 * p, 2 * p, 2 * p);
      c.fillStyle = cPaws;
      c.fillRect(4 * p, 18 * p, 2 * p, 1 * p);
      c.fillRect(12 * p, 18 * p, 2 * p, 1 * p);
    } else {
      c.fillRect(6 * p, 17 * p, 2 * p, 2 * p);
      c.fillRect(10 * p, 17 * p, 2 * p, 2 * p);
      c.fillStyle = cPaws;
      c.fillRect(6 * p, 18 * p, 2 * p, 1 * p);
      c.fillRect(10 * p, 18 * p, 2 * p, 1 * p);
    }

    c.restore();
  }

  // Obstacle Management
  const ObstacleType = {
    BUG: 'bug',
    SPIKE: 'spike',
    PILLAR_404: 'pillar'
  };

  let obstacles = [];
  let obstacleTimer = 0;
  let nextObstacleDistance = 120;

  function spawnObstacle() {
    const types = [ObstacleType.BUG, ObstacleType.SPIKE, ObstacleType.PILLAR_404];
    const chosen = types[Math.floor(Math.random() * types.length)];

    let obs = {
      type: chosen,
      x: CANVAS_WIDTH + 20,
      markedForRemoval: false
    };

    if (chosen === ObstacleType.BUG) {
      obs.w = 28;
      obs.h = 24;
      obs.y = GROUND_Y - obs.h;
      obs.speedBonus = 0.8;
      obs.legFrame = 0;
    } else if (chosen === ObstacleType.SPIKE) {
      obs.w = 26;
      obs.h = 28;
      obs.y = GROUND_Y - obs.h;
      obs.speedBonus = 0;
    } else {
      // 404 Block
      obs.w = 34;
      obs.h = 36;
      obs.y = GROUND_Y - obs.h;
      obs.speedBonus = 0;
    }

    obstacles.push(obs);
  }

  // Collectibles (AI Orbs & Coffee)
  const CollectibleType = {
    AI_ORB: 'orb',
    COFFEE: 'coffee'
  };

  let collectibles = [];
  let collectibleTimer = 0;

  function spawnCollectible() {
    const isCoffee = Math.random() < 0.22;
    const type = isCoffee ? CollectibleType.COFFEE : CollectibleType.AI_ORB;
    const heightLevels = [GROUND_Y - 45, GROUND_Y - 85, GROUND_Y - 120];
    const spawnY = heightLevels[Math.floor(Math.random() * heightLevels.length)];

    collectibles.push({
      type,
      x: CANVAS_WIDTH + 30,
      y: spawnY,
      w: 22,
      h: 22,
      pulse: 0,
      markedForRemoval: false
    });
  }

  // Particles
  function createDustParticles(x, y, count = 6, color = '#F4F3F1') {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y: y - Math.random() * 4,
        vx: (Math.random() - 0.5) * 3 - 1.5,
        vy: -Math.random() * 2.5 - 0.5,
        size: Math.floor(Math.random() * 3) + 2,
        life: 0.6,
        color
      });
    }
  }

  function createSparkles(x, y, color = '#F97316') {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const speed = Math.random() * 3 + 1.5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.floor(Math.random() * 3) + 2,
        life: 0.8,
        color
      });
    }
  }

  // Level Progression Logic
  function updateLevelAndSpeed() {
    const newLevel = Math.min(5, Math.floor(score / 350) + 1);
    if (newLevel !== level) {
      level = newLevel;
      if (levelEl) levelEl.textContent = 'LVL ' + level;
      playPowerupSound();
    }
    const boostMult = boostTimer > 0 ? 1.25 : 1.0;
    baseSpeed = 5 + (level - 1) * 0.85;
    gameSpeed = baseSpeed * boostMult;
  }

  // Collision Detection
  function checkCollision(r1, r2, padding = 4) {
    return (
      r1.x + padding < r2.x + r2.w - padding &&
      r1.x + r1.w - padding > r2.x + padding &&
      r1.y + padding < r2.y + r2.h - padding &&
      r1.y + r1.h - padding > r2.y + padding
    );
  }

  // Render Background & Parallax
  function drawBackground(dt) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    if (isDark) {
      skyGrad.addColorStop(0, '#1c1510');
      skyGrad.addColorStop(0.7, '#2e1c12');
      skyGrad.addColorStop(1, '#442514');
    } else {
      skyGrad.addColorStop(0, '#FFF5EA');
      skyGrad.addColorStop(0.7, '#FFE4CC');
      skyGrad.addColorStop(1, '#FED7AA');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);

    // Pixel Sun
    const sunColor = isDark ? '#EA6A0C' : '#F97316';
    const sunRing = isDark ? 'rgba(234, 106, 12, 0.25)' : 'rgba(249, 115, 22, 0.2)';
    ctx.fillStyle = sunRing;
    ctx.fillRect(630, 40, 60, 60);
    ctx.fillStyle = sunColor;
    ctx.fillRect(636, 46, 48, 48);

    // Parallax Clouds
    ctx.fillStyle = isDark ? 'rgba(255, 248, 239, 0.08)' : 'rgba(255, 255, 255, 0.7)';
    clouds.forEach(c => {
      c.x -= c.speed * (gameSpeed * 0.4);
      if (c.x + c.w < 0) c.x = CANVAS_WIDTH + 20;

      // Draw tiered pixel cloud
      ctx.fillRect(Math.round(c.x), Math.round(c.y + 6), c.w, c.h - 6);
      ctx.fillRect(Math.round(c.x + 8), Math.round(c.y), c.w - 16, c.h);
    });

    // Distant cyber mountains / city skyline
    midOffset = (midOffset + gameSpeed * 0.35) % 160;
    ctx.fillStyle = isDark ? '#231b14' : '#FDBA74';
    for (let x = -midOffset; x < CANVAS_WIDTH + 160; x += 80) {
      ctx.fillRect(Math.round(x), GROUND_Y - 45, 45, 45);
      ctx.fillRect(Math.round(x + 10), GROUND_Y - 65, 25, 65);
      ctx.fillRect(Math.round(x + 45), GROUND_Y - 30, 35, 30);
    }

    // Ground & Checkered Grid
    groundOffset = (groundOffset + gameSpeed) % 32;
    const groundBase = isDark ? '#15130F' : '#2A241F';
    ctx.fillStyle = groundBase;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Orange top border of ground
    ctx.fillStyle = '#F97316';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 4);

    // Pixel grass blades / grid markers
    ctx.fillStyle = isDark ? '#C2540A' : '#EA6A0C';
    for (let x = -groundOffset; x < CANVAS_WIDTH + 32; x += 16) {
      ctx.fillRect(Math.round(x), GROUND_Y + 4, 8, 2);
      ctx.fillRect(Math.round(x + 4), GROUND_Y + 14, 6, 2);
    }
  }

  // Draw Obstacles
  function drawObstacle(obs) {
    ctx.save();
    if (obs.type === ObstacleType.BUG) {
      // Pixel Bug Monster
      const p = 2;
      ctx.translate(Math.round(obs.x), Math.round(obs.y));

      ctx.fillStyle = '#15130F';
      ctx.fillRect(2 * p, 2 * p, 10 * p, 8 * p);
      // Bug shell / glow
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(3 * p, 3 * p, 8 * p, 6 * p);
      ctx.fillStyle = '#FCA5A5';
      ctx.fillRect(4 * p, 4 * p, 6 * p, 2 * p);

      // Antennae
      ctx.fillStyle = '#15130F';
      ctx.fillRect(1 * p, 0 * p, 2 * p, 2 * p);
      ctx.fillRect(11 * p, 0 * p, 2 * p, 2 * p);

      // Legs
      const legOffset = Math.sin(Date.now() * 0.02) > 0 ? 1 : -1;
      ctx.fillRect(0 * p, (9 + legOffset) * p, 2 * p, 3 * p);
      ctx.fillRect(12 * p, (9 - legOffset) * p, 2 * p, 3 * p);
      ctx.fillRect(6 * p, 10 * p, 2 * p, 2 * p);
    } else if (obs.type === ObstacleType.SPIKE) {
      // Firewall Warning Spike
      ctx.translate(Math.round(obs.x), Math.round(obs.y));
      ctx.fillStyle = '#15130F';
      ctx.fillRect(0, 0, obs.w, obs.h);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(2, 2, obs.w - 4, obs.h - 4);

      // Warning stripes
      ctx.fillStyle = '#FFF8EF';
      ctx.fillRect(4, 6, obs.w - 8, 4);
      ctx.fillRect(4, 16, obs.w - 8, 4);
    } else {
      // 404 Block
      ctx.translate(Math.round(obs.x), Math.round(obs.y));
      ctx.fillStyle = '#15130F';
      ctx.fillRect(0, 0, obs.w, obs.h);
      ctx.fillStyle = '#EA6A0C';
      ctx.fillRect(2, 2, obs.w - 4, obs.h - 4);

      // Text 404
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('404', obs.w / 2, obs.h / 2);
    }
    ctx.restore();
  }

  // Draw Collectibles
  function drawCollectible(item) {
    ctx.save();
    ctx.translate(Math.round(item.x + item.w / 2), Math.round(item.y + item.h / 2));
    const bob = Math.sin(Date.now() * 0.008 + item.x) * 4;
    ctx.translate(0, bob);

    if (item.type === CollectibleType.AI_ORB) {
      // Glowing Diamond AI Orb
      ctx.fillStyle = '#15130F';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#FDBA74';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-1, -1, 2, 2);
    } else {
      // Pixel Coffee Mug
      ctx.fillStyle = '#15130F';
      ctx.fillRect(-8, -6, 14, 14);
      ctx.fillStyle = '#FFF8EF';
      ctx.fillRect(-6, -4, 10, 10);
      ctx.fillStyle = '#92400E'; // Coffee
      ctx.fillRect(-5, -2, 8, 4);
      // Handle
      ctx.fillStyle = '#15130F';
      ctx.fillRect(6, -3, 3, 8);
    }
    ctx.restore();
  }

  // Render Overlay Screens (Ready, Pause, Game Over)
  function drawOverlays() {
    const isEn = document.documentElement.getAttribute('lang') === 'en';

    if (currentState === GameState.READY) {
      ctx.fillStyle = 'rgba(21, 19, 15, 0.65)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#F97316';
      ctx.font = "bold 24px 'Silkscreen', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('FOX RUNNER : PIXEL DASH', CANVAS_WIDTH / 2, 140);

      ctx.fillStyle = '#FFF8EF';
      ctx.font = "14px 'DotGothic16', monospace";
      ctx.fillText(
        isEn ? 'Press Space or Tap to Jump (Double Jump Available!)' : 'Tekan Spasi atau Tap untuk Lompat (Bisa Double Jump!)',
        CANVAS_WIDTH / 2,
        185
      );

      ctx.fillStyle = '#FDBA74';
      ctx.font = "12px 'DotGothic16', monospace";
      ctx.fillText(
        isEn ? 'Collect AI Orbs & Coffee • Avoid Bugs & 404 Blocks' : 'Ambil AI Orb & Kopi • Hindari Bug & Block 404',
        CANVAS_WIDTH / 2,
        215
      );

      // Blinking start prompt
      if (Math.floor(Date.now() / 450) % 2 === 0) {
        ctx.fillStyle = '#F97316';
        ctx.font = "bold 16px 'Silkscreen', monospace";
        ctx.fillText(isEn ? '[ PRESS JUMP TO START ]' : '[ TEKAN LOMPAT UNTUK MULAI ]', CANVAS_WIDTH / 2, 270);
      }
    } else if (currentState === GameState.PAUSED) {
      ctx.fillStyle = 'rgba(21, 19, 15, 0.75)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#FDBA74';
      ctx.font = "bold 26px 'Silkscreen', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('GAME PAUSED', CANVAS_WIDTH / 2, 180);

      ctx.fillStyle = '#FFF8EF';
      ctx.font = "14px 'DotGothic16', monospace";
      ctx.fillText(isEn ? 'Tap Pause to Resume' : 'Tekan Tombol Jeda Untuk Melanjutkan', CANVAS_WIDTH / 2, 220);
    } else if (currentState === GameState.GAMEOVER) {
      ctx.fillStyle = 'rgba(21, 19, 15, 0.78)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = '#EF4444';
      ctx.font = "bold 28px 'Silkscreen', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 125);

      ctx.fillStyle = '#FFF8EF';
      ctx.font = "16px 'DotGothic16', monospace";
      ctx.fillText((isEn ? 'Final Score: ' : 'Skor Akhir: ') + score, CANVAS_WIDTH / 2, 165);

      ctx.fillStyle = '#FDBA74';
      ctx.font = "14px 'DotGothic16', monospace";
      ctx.fillText((isEn ? 'High Score: ' : 'Skor Terbaik: ') + highScore, CANVAS_WIDTH / 2, 195);

      // Rank Title
      let rankTitle = 'Junior Dev';
      if (score >= 20000) rankTitle = 'AI Grandmaster';
      else if (score >= 10000) rankTitle = 'Principal Architect';
      else if (score >= 6000) rankTitle = 'Fullstack Pro';
      else if (score >= 3000) rankTitle = 'Bug Hunter';

      ctx.fillStyle = '#F97316';
      ctx.font = "13px 'DotGothic16', monospace";
      ctx.fillText('Rank: ' + rankTitle, CANVAS_WIDTH / 2, 225);

      if (Math.floor(Date.now() / 450) % 2 === 0) {
        ctx.fillStyle = '#FFF8EF';
        ctx.font = "bold 15px 'Silkscreen', monospace";
        ctx.fillText(isEn ? '[ PRESS SPACE TO RETRY ]' : '[ TEKAN SPASI UNTUK MAIN LAGI ]', CANVAS_WIDTH / 2, 280);
      }
    }
  }

  // Update Game Logic
  function update(dt) {
    if (currentState !== GameState.PLAYING) return;

    distance += gameSpeed * dt * 8;
    score = Math.floor(distance);

    if (boostTimer > 0) {
      boostTimer -= dt;
      score += Math.floor(dt * 20);
    }

    if (scoreEl) scoreEl.textContent = score.toString().padStart(5, '0');

    updateLevelAndSpeed();

    fox.update(dt);

    // Spawn Obstacles
    obstacleTimer += gameSpeed * dt * 2.2;
    if (obstacleTimer >= nextObstacleDistance) {
      spawnObstacle();
      obstacleTimer = 0;
      nextObstacleDistance = 90 + Math.random() * 80;
    }

    // Spawn Collectibles
    collectibleTimer += dt;
    if (collectibleTimer >= 3.2) {
      spawnCollectible();
      collectibleTimer = 0;
    }

    // Update Obstacles
    obstacles.forEach(obs => {
      obs.x -= (gameSpeed + (obs.speedBonus || 0)) * 60 * dt;

      // Collision check
      if (checkCollision(fox, obs, 6)) {
        handleGameOver();
      }

      if (obs.x + obs.w < -40) {
        obs.markedForRemoval = true;
      }
    });
    obstacles = obstacles.filter(o => !o.markedForRemoval);

    // Update Collectibles
    collectibles.forEach(col => {
      col.x -= gameSpeed * 60 * dt;

      if (checkCollision(fox, col, 4)) {
        col.markedForRemoval = true;
        if (col.type === CollectibleType.AI_ORB) {
          distance += 50;
          playCollectSound();
          createSparkles(col.x, col.y, '#F97316');
        } else {
          distance += 100;
          boostTimer = 5.0; // 5 seconds boost
          playPowerupSound();
          createSparkles(col.x, col.y, '#FDBA74');
        }
      }

      if (col.x + col.w < -30) {
        col.markedForRemoval = true;
      }
    });
    collectibles = collectibles.filter(c => !c.markedForRemoval);

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 2;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  function render(dt) {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawBackground(dt);

    // Draw Collectibles
    collectibles.forEach(drawCollectible);

    // Draw Obstacles
    obstacles.forEach(drawObstacle);

    // Draw Particles
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      ctx.globalAlpha = 1;
    });

    // Draw Fox
    fox.draw();

    // Draw HUD Active Boost Bar
    if (boostTimer > 0) {
      const barWidth = Math.min(120, (boostTimer / 5.0) * 120);
      ctx.fillStyle = '#15130F';
      ctx.fillRect(20, 20, 124, 14);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(22, 22, barWidth, 10);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = "9px 'Silkscreen', monospace";
      ctx.fillText('SPEED BOOST', 152, 30);
    }

    drawOverlays();
  }

  // Main Animation Loop
  function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    update(dt);
    render(dt);

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function startGame() {
    score = 0;
    distance = 0;
    level = 1;
    boostTimer = 0;
    obstacles = [];
    collectibles = [];
    particles = [];
    fox.reset();
    currentState = GameState.PLAYING;
    if (scoreEl) scoreEl.textContent = '00000';
    if (levelEl) levelEl.textContent = 'LVL 1';
  }

  function handleGameOver() {
    currentState = GameState.GAMEOVER;
    playCrashSound();
    createDustParticles(fox.x + 20, fox.y + 20, 16, '#EF4444');

    if (score > highScore) {
      highScore = score;
      try {
        localStorage.setItem('kadalapi_fox_highscore', highScore.toString());
      } catch (e) {}
      if (highEl) highEl.textContent = highScore.toString().padStart(5, '0');
    }
  }

  function togglePause() {
    if (currentState === GameState.PLAYING) {
      currentState = GameState.PAUSED;
      if (pauseBtn) pauseBtn.setAttribute('aria-pressed', 'true');
    } else if (currentState === GameState.PAUSED) {
      currentState = GameState.PLAYING;
      if (pauseBtn) pauseBtn.setAttribute('aria-pressed', 'false');
    }
  }

  function handleActionJump() {
    getAudioContext();

    if (currentState === GameState.READY) {
      startGame();
      fox.jump();
    } else if (currentState === GameState.PLAYING) {
      fox.jump();
    } else if (currentState === GameState.GAMEOVER) {
      startGame();
    }
  }

  // Open & Close Modal Controls
  function openGameModal() {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    getAudioContext();

    if (!animationFrameId) {
      lastTimestamp = 0;
      animationFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function closeGameModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (currentState === GameState.PLAYING) {
      currentState = GameState.PAUSED;
    }
  }

  // Expose global open function
  window.openFoxGame = openGameModal;

  // Event Listeners for controls
  const backdrop = document.getElementById('gameModalBackdrop');
  const foxStage = document.getElementById('foxStage');
  if (foxStage) {
    foxStage.addEventListener('click', () => {
      setTimeout(openGameModal, 280);
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closeGameModal);
  if (backdrop) backdrop.addEventListener('click', closeGameModal);

  // Keyboard
  window.addEventListener('keydown', e => {
    if (e.key === 'g' || e.key === 'G') {
      if (!modal.classList.contains('active') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openGameModal();
        return;
      }
    }

    if (!modal.classList.contains('active')) return;

    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      handleActionJump();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePause();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeGameModal();
    }
  });

  // Canvas Tap/Click
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    handleActionJump();
  });

  // Mobile Jump Button
  if (mobileJumpBtn) {
    mobileJumpBtn.addEventListener('pointerdown', e => {
      e.preventDefault();
      handleActionJump();
    });
  }

  // Toolbar Toggles
  if (soundBtn) {
    const updateSoundUI = () => {
      soundBtn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
      soundBtn.classList.toggle('muted', !soundEnabled);
    };
    updateSoundUI();
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      try {
        localStorage.setItem('kadalapi_fox_sound', soundEnabled.toString());
      } catch (e) {}
      updateSoundUI();
      if (soundEnabled) playTone(440, 0.08);
    });
  }

  if (crtBtn) {
    crtBtn.addEventListener('click', () => {
      const screenWrapper = canvas.closest('.arcade-screen-wrap');
      if (screenWrapper) {
        screenWrapper.classList.toggle('crt-active');
        const isActive = screenWrapper.classList.contains('crt-active');
        crtBtn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      togglePause();
    });
  }

  // Auto-pause if tab changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentState === GameState.PLAYING) {
      currentState = GameState.PAUSED;
    }
  });

  // Initial draw
  render(0);
})();
