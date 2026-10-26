import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';

interface FoxRunner3DCanvasProps {
  onScoreUpdate: (score: number) => void;
  onHighScoreUpdate: (high: number) => void;
  onLevelUpdate: (level: number) => void;
  soundEnabled: boolean;
  crtActive: boolean;
  isPaused: boolean;
  onGameStart: () => void;
  onGameOver: () => void;
}

// Constant lanes outside component so reference never changes
const LANES = [-1.6, 0, 1.6];

export const FoxRunner3DCanvas: React.FC<FoxRunner3DCanvasProps> = ({
  onScoreUpdate,
  onHighScoreUpdate,
  onLevelUpdate,
  soundEnabled,
  isPaused,
  onGameStart,
  onGameOver
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // React UI state for overlays — auto-starts in 'playing' when modal opens
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameover'>('playing');

  // Mutable Game Loop State
  const gameRef = useRef({
    state: 'playing' as 'ready' | 'playing' | 'paused' | 'gameover',
    score: 0,
    lastReportedScore: -1,
    highScore: 0,
    level: 1,
    speed: 18,
    distance: 0,
    currentLane: 1, // 0 = left, 1 = center, 2 = right
    targetX: 0,
    fox: {
      x: 0,
      y: 0,
      vy: 0,
      isGrounded: true,
      jumpCount: 0,
      flipAngle: 0,
      runCycle: 0,
      tiltZ: 0
    },
    obstacles: [] as {
      mesh: THREE.Group;
      type: 'cactus' | 'rock' | 'star';
      z: number;
      x: number;
      lane: number;
      w: number;
      h: number;
      collected?: boolean;
    }[],
    spawnTimer: 0,
    soundEnabled: true,
    isPaused: false
  });

  gameRef.current.soundEnabled = soundEnabled;
  gameRef.current.isPaused = isPaused;

  // Store callbacks in a ref so the Three.js useEffect never re-runs when parent re-renders
  const callbacksRef = useRef({
    onScoreUpdate,
    onHighScoreUpdate,
    onLevelUpdate,
    onGameStart,
    onGameOver
  });
  callbacksRef.current = {
    onScoreUpdate,
    onHighScoreUpdate,
    onLevelUpdate,
    onGameStart,
    onGameOver
  };

  // Web Audio Synthesizer
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playJumpSound = useCallback((isDouble = false) => {
    if (!gameRef.current.soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = 'square';
      const startFreq = isDouble ? 380 : 240;
      const endFreq = isDouble ? 720 : 520;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }, [getAudioContext]);

  const playLaneSound = useCallback(() => {
    if (!gameRef.current.soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.07);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }, [getAudioContext]);

  const playCollectSound = useCallback(() => {
    if (!gameRef.current.soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const now = actx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.035);
        gain.gain.setValueAtTime(0.12, now + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.07);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.07);
      });
    } catch (e) {}
  }, [getAudioContext]);

  const playCrashSound = useCallback(() => {
    if (!gameRef.current.soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;
      const now = actx.currentTime;
      const osc = actx.createOscillator();
      const gain = actx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }, [getAudioContext]);

  // Clean all existing obstacles
  const clearObstacles = (scene: THREE.Scene) => {
    const g = gameRef.current;
    g.obstacles.forEach((obs) => {
      scene.remove(obs.mesh);
      obs.mesh.traverse((c) => {
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
      });
    });
    g.obstacles = [];
  };

  // Scene reference
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Start / Restart Game
  const startGame = useCallback(() => {
    const g = gameRef.current;
    if (sceneRef.current) {
      clearObstacles(sceneRef.current);
    }
    g.state = 'playing';
    g.score = 0;
    g.lastReportedScore = 0;
    g.distance = 0;
    g.speed = 18;
    g.level = 1;
    g.spawnTimer = 0;
    g.currentLane = 1;
    g.targetX = 0;
    g.fox.x = 0;
    g.fox.y = 0;
    g.fox.vy = 0;
    g.fox.jumpCount = 0;
    g.fox.isGrounded = true;
    g.fox.flipAngle = 0;
    g.fox.tiltZ = 0;

    setGameState('playing');
    playJumpSound(false);
    callbacksRef.current.onScoreUpdate(0);
    callbacksRef.current.onLevelUpdate(1);
    callbacksRef.current.onGameStart();
  }, [playJumpSound]);

  // Jump Action Handler
  const handleJump = useCallback(() => {
    const g = gameRef.current;
    if (g.state === 'ready' || g.state === 'gameover') {
      startGame();
      return;
    }

    if (g.state === 'paused') {
      g.state = 'playing';
      setGameState('playing');
      return;
    }

    if (g.state === 'playing') {
      if (g.fox.jumpCount < 2) {
        if (g.fox.jumpCount === 0) {
          g.fox.vy = 13.5;
          playJumpSound(false);
        } else {
          g.fox.vy = 12.0;
          g.fox.flipAngle = Math.PI * 2;
          playJumpSound(true);
        }
        g.fox.jumpCount++;
        g.fox.isGrounded = false;
      }
    }
  }, [startGame, playJumpSound]);

  // Lane movement handlers
  const moveLeft = useCallback(() => {
    const g = gameRef.current;
    if (g.state !== 'playing' || g.isPaused) return;
    if (g.currentLane > 0) {
      g.currentLane--;
      g.targetX = LANES[g.currentLane];
      g.fox.tiltZ = 0.28;
      playLaneSound();
    }
  }, [playLaneSound]);

  const moveRight = useCallback(() => {
    const g = gameRef.current;
    if (g.state !== 'playing' || g.isPaused) return;
    if (g.currentLane < LANES.length - 1) {
      g.currentLane++;
      g.targetX = LANES[g.currentLane];
      g.fox.tiltZ = -0.28;
      playLaneSound();
    }
  }, [playLaneSound]);

  // Global Keys & Exposed Mobile Helpers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleJump();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        moveLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        moveRight();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    (window as any).__foxRunnerJump = handleJump;
    (window as any).__foxRunnerMoveLeft = moveLeft;
    (window as any).__foxRunnerMoveRight = moveRight;
    (window as any).__foxRunnerRestart = startGame;

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).__foxRunnerJump;
      delete (window as any).__foxRunnerMoveLeft;
      delete (window as any).__foxRunnerMoveRight;
      delete (window as any).__foxRunnerRestart;
    };
  }, [handleJump, moveLeft, moveRight, startGame]);

  // Swipe & Tap gesture detection on canvas (with synthetic click guard for mobile)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = performance.now();
    if (e.touches.length > 0) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = performance.now();
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) moveLeft();
      else moveRight();
    } else {
      handleJump();
    }
  };

  const handleCanvasClick = () => {
    // Prevent mobile browser synthetic click from triggering a second jump after touchEnd
    if (performance.now() - lastTouchTimeRef.current < 500) return;
    handleJump();
  };

  // Main Three.js Game Engine — Runs ONCE on mount
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const regMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch (e) {
        return false;
      }
    })();

    // Bright Sunny Sky Scene & Horizon Fog
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x68c7f7);
    scene.fog = new THREE.Fog(0xbbe8ff, 34, 86);

    // Camera
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 140);
    camera.position.set(0, 3.3, 5.8);
    camera.lookAt(0, 1.0, -8);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Sunny Day Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x4ade80, 1.45);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 2.25);
    dirLight.position.set(9, 15, 8);
    dirLight.castShadow = !isSoftwareGl;
    if (dirLight.shadow) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.bias = -0.0005;
      const d = 8;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
    }
    scene.add(dirLight);

    // Materials
    const mOrange = regMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 }));
    const mCream = regMat(new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.75 }));
    const mDark = regMat(new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.4 }));
    const mPaws = regMat(new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.8 }));
    const mGrass = regMat(new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.85 }));
    const mGrassStripe = regMat(new THREE.MeshStandardMaterial({ color: 0x3ebe57, roughness: 0.85 }));
    const mMeadowL = regMat(new THREE.MeshStandardMaterial({ color: 0x288a3a, roughness: 0.9 }));
    const mMeadowAlt = regMat(new THREE.MeshStandardMaterial({ color: 0x339e47, roughness: 0.9 }));
    const mTrackDirt = regMat(new THREE.MeshStandardMaterial({ color: 0x4a2c14, roughness: 0.95 }));
    const mWood = regMat(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
    const mLeaves = regMat(new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }));
    const mCactus = regMat(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 }));
    const mRock = regMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }));
    const mCloudTop = regMat(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        emissive: 0xffffff,
        emissiveIntensity: 0.18
      })
    );
    const mCloudShade = regMat(
      new THREE.MeshStandardMaterial({
        color: 0xe2f1ff,
        roughness: 0.9
      })
    );
    const mSunCore = regMat(
      new THREE.MeshBasicMaterial({
        color: 0xfef08a
      })
    );
    const mSunGlow = regMat(
      new THREE.MeshBasicMaterial({
        color: 0xfacc15
      })
    );
    const mSunRay = regMat(
      new THREE.MeshBasicMaterial({
        color: 0xfde047
      })
    );
    const mStar = regMat(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.2,
        metalness: 0.4,
        emissive: 0xd97706,
        emissiveIntensity: 0.45
      })
    );

    // ==========================================
    // 0. 3D VOXEL SUN & DRIFTING CLOUDS
    // ==========================================
    const sunGroup = new THREE.Group();
    sunGroup.position.set(11, 13.5, -52);

    const sunCoreMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(4.2, 4.2, 4.2)), mSunCore);
    sunGroup.add(sunCoreMesh);

    const sunHaloMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(5.4, 5.4, 2.4)), mSunGlow);
    sunHaloMesh.position.z = -0.3;
    sunGroup.add(sunHaloMesh);

    const sunRaysGroup = new THREE.Group();
    const rayGeo = regGeo(new THREE.BoxGeometry(1.1, 1.1, 1.1));
    for (let r = 0; r < 8; r++) {
      const angle = (r / 8) * Math.PI * 2;
      const ray = new THREE.Mesh(rayGeo, mSunRay);
      ray.position.set(Math.cos(angle) * 4.2, Math.sin(angle) * 4.2, 0);
      sunRaysGroup.add(ray);
    }
    sunGroup.add(sunRaysGroup);
    scene.add(sunGroup);

    // Fluffy Voxel Clouds
    const clouds: { group: THREE.Group; speedZ: number }[] = [];
    const cloudMainGeo = regGeo(new THREE.BoxGeometry(3.6, 1.1, 2.2));
    const cloudTopGeo = regGeo(new THREE.BoxGeometry(2.2, 0.9, 1.7));
    const cloudSideGeo = regGeo(new THREE.BoxGeometry(1.6, 0.8, 1.5));

    const cloudConfigs = [
      { x: -12, y: 9.5, z: -18, scale: 1.1 },
      { x: 9, y: 10.5, z: -26, scale: 0.95 },
      { x: -16, y: 11.2, z: -38, scale: 1.3 },
      { x: 14, y: 8.8, z: -12, scale: 0.85 },
      { x: -6, y: 12.0, z: -48, scale: 1.15 },
      { x: 6, y: 11.0, z: -60, scale: 1.25 },
      { x: -19, y: 9.0, z: -54, scale: 1.0 },
      { x: 18, y: 10.2, z: -40, scale: 1.1 }
    ];

    cloudConfigs.forEach((cfg, idx) => {
      const cGroup = new THREE.Group();
      const base = new THREE.Mesh(cloudMainGeo, mCloudShade);
      const top = new THREE.Mesh(cloudTopGeo, mCloudTop);
      top.position.set(-0.3, 0.75, 0);
      const sideL = new THREE.Mesh(cloudSideGeo, mCloudTop);
      sideL.position.set(-1.7, 0.15, 0.2);
      const sideR = new THREE.Mesh(cloudSideGeo, mCloudTop);
      sideR.position.set(1.6, 0.25, -0.15);

      cGroup.add(base, top, sideL, sideR);
      cGroup.position.set(cfg.x, cfg.y, cfg.z);
      cGroup.scale.setScalar(cfg.scale);
      scene.add(cGroup);
      clouds.push({
        group: cGroup,
        speedZ: 1.8 + (idx % 3) * 0.6
      });
    });

    // ==========================================
    // 1. ENDLESS 3D TRACK TILES + WIDE MEADOW GROUND
    // ==========================================
    const TRACK_WIDTH = 5.6;
    const MEADOW_WIDTH = 36;
    const TILE_COUNT = 10;
    const TILE_LENGTH = 10;
    const TOTAL_TRACK = TILE_COUNT * TILE_LENGTH; // 100 units
    const trackTiles: THREE.Group[] = [];

    const roadGeo = regGeo(new THREE.BoxGeometry(TRACK_WIDTH, 0.4, TILE_LENGTH));
    const meadowGeo = regGeo(new THREE.BoxGeometry(MEADOW_WIDTH, 0.4, TILE_LENGTH));
    const dashGeo = regGeo(new THREE.BoxGeometry(0.1, 0.42, 2.2));
    const sleeperGeo = regGeo(new THREE.BoxGeometry(TRACK_WIDTH - 0.2, 0.41, 0.35));
    const grassEdgeGeo = regGeo(new THREE.BoxGeometry(0.45, 0.14, TILE_LENGTH));
    const grassTuftBaseGeo = regGeo(new THREE.BoxGeometry(0.42, 0.28, 0.42));
    const grassBladeGeo = regGeo(new THREE.BoxGeometry(0.22, 0.48, 0.22));
    const treeBaseGeo = regGeo(new THREE.BoxGeometry(0.85, 0.18, 0.85));
    const trunkGeo = regGeo(new THREE.BoxGeometry(0.45, 1.3, 0.45));
    const crownGeo1 = regGeo(new THREE.BoxGeometry(1.5, 1.2, 1.5));
    const crownGeo2 = regGeo(new THREE.BoxGeometry(1.0, 0.9, 1.0));
    const bushGeo = regGeo(new THREE.BoxGeometry(0.85, 0.65, 0.85));
    const hillGeo = regGeo(new THREE.BoxGeometry(4.5, 2.2, 4.5));
    const hillTopGeo = regGeo(new THREE.BoxGeometry(2.8, 1.4, 2.8));

    for (let i = 0; i < TILE_COUNT; i++) {
      const tile = new THREE.Group();
      tile.position.z = 10 - i * TILE_LENGTH;

      // Base grass road (top surface at y = 0)
      const road = new THREE.Mesh(roadGeo, i % 2 === 0 ? mGrass : mGrassStripe);
      road.position.y = -0.2;
      road.receiveShadow = !isSoftwareGl;
      tile.add(road);

      // Wide Left & Right Grassy Meadow Banks (top surface at y = 0 so trees never float!)
      const meadowMat = i % 2 === 0 ? mMeadowL : mMeadowAlt;
      const meadowL = new THREE.Mesh(meadowGeo, meadowMat);
      meadowL.position.set(-(TRACK_WIDTH / 2 + MEADOW_WIDTH / 2), -0.2, 0);
      meadowL.receiveShadow = !isSoftwareGl;
      tile.add(meadowL);

      const meadowR = new THREE.Mesh(meadowGeo, meadowMat);
      meadowR.position.set(TRACK_WIDTH / 2 + MEADOW_WIDTH / 2, -0.2, 0);
      meadowR.receiveShadow = !isSoftwareGl;
      tile.add(meadowR);

      // Transverse grass stripe across road for clear forward speed reference
      const sleeper = new THREE.Mesh(sleeperGeo, i % 2 === 0 ? mGrassStripe : mGrass);
      sleeper.position.set(0, -0.195, 0);
      tile.add(sleeper);

      // Lane dividers (2 dashes per tile)
      [-0.8, 0.8].forEach((lx) => {
        [-2.5, 2.5].forEach((lz) => {
          const laneDash = new THREE.Mesh(dashGeo, mCream);
          laneDash.position.set(lx, -0.19, lz);
          tile.add(laneDash);
        });
      });

      // Soft Grass Verge Strips & 3D Voxel Grass Tufts along Left & Right Edges of the Road
      const vergeL = new THREE.Mesh(grassEdgeGeo, i % 2 === 0 ? mGrassStripe : mLeaves);
      vergeL.position.set(-TRACK_WIDTH / 2 - 0.22, 0.04, 0);
      tile.add(vergeL);

      const vergeR = new THREE.Mesh(grassEdgeGeo, i % 2 === 0 ? mGrassStripe : mLeaves);
      vergeR.position.set(TRACK_WIDTH / 2 + 0.22, 0.04, 0);
      tile.add(vergeR);

      [-3.6, -1.2, 1.2, 3.6].forEach((gz, gIdx) => {
        const offsetL = -TRACK_WIDTH / 2 - 0.45 - (gIdx % 2) * 0.45;
        const tuftL = new THREE.Mesh(grassTuftBaseGeo, gIdx % 2 === 0 ? mLeaves : mGrassStripe);
        tuftL.position.set(offsetL, 0.14, gz);
        const bladeL = new THREE.Mesh(grassBladeGeo, mGrassStripe);
        bladeL.position.set(offsetL + 0.08, 0.24, gz);
        tile.add(tuftL, bladeL);

        const offsetR = TRACK_WIDTH / 2 + 0.45 + ((gIdx + 1) % 2) * 0.45;
        const tuftR = new THREE.Mesh(grassTuftBaseGeo, gIdx % 2 === 0 ? mGrassStripe : mLeaves);
        tuftR.position.set(offsetR, 0.14, gz);
        const bladeR = new THREE.Mesh(grassBladeGeo, mGrassStripe);
        bladeR.position.set(offsetR - 0.08, 0.24, gz);
        tile.add(tuftR, bladeR);
      });

      // Grounded Voxel Trees on Left & Right Meadow
      const treeL = new THREE.Group();
      treeL.position.set(-TRACK_WIDTH / 2 - 2.0, 0, i % 2 === 0 ? -2 : 2);
      const tBaseL = new THREE.Mesh(treeBaseGeo, mTrackDirt);
      tBaseL.position.y = 0.05;
      const tTrunkL = new THREE.Mesh(trunkGeo, mWood);
      tTrunkL.position.y = 0.6;
      tTrunkL.castShadow = !isSoftwareGl;
      const tCrownL1 = new THREE.Mesh(crownGeo1, mLeaves);
      tCrownL1.position.y = 1.55;
      tCrownL1.castShadow = !isSoftwareGl;
      const tCrownL2 = new THREE.Mesh(crownGeo2, mGrass);
      tCrownL2.position.y = 2.45;
      treeL.add(tBaseL, tTrunkL, tCrownL1, tCrownL2);
      tile.add(treeL);

      const treeR = new THREE.Group();
      treeR.position.set(TRACK_WIDTH / 2 + 2.0, 0, i % 2 === 0 ? 2 : -2);
      const tBaseR = new THREE.Mesh(treeBaseGeo, mTrackDirt);
      tBaseR.position.y = 0.05;
      const tTrunkR = new THREE.Mesh(trunkGeo, mWood);
      tTrunkR.position.y = 0.6;
      tTrunkR.castShadow = !isSoftwareGl;
      const tCrownR1 = new THREE.Mesh(crownGeo1, mLeaves);
      tCrownR1.position.y = 1.55;
      tCrownR1.castShadow = !isSoftwareGl;
      const tCrownR2 = new THREE.Mesh(crownGeo2, mGrass);
      tCrownR2.position.y = 2.45;
      treeR.add(tBaseR, tTrunkR, tCrownR1, tCrownR2);
      tile.add(treeR);

      // Secondary bushes & outer meadow trees/hills so the landscape looks rich and grounded
      const bushL = new THREE.Mesh(bushGeo, mLeaves);
      bushL.position.set(-TRACK_WIDTH / 2 - 4.2, 0.3, i % 2 === 0 ? 2.5 : -2.5);
      tile.add(bushL);

      const bushR = new THREE.Mesh(bushGeo, mLeaves);
      bushR.position.set(TRACK_WIDTH / 2 + 4.2, 0.3, i % 2 === 0 ? -2.5 : 2.5);
      tile.add(bushR);

      if (i % 2 === 0) {
        const hillL = new THREE.Group();
        hillL.position.set(-TRACK_WIDTH / 2 - 10, 0, 0);
        const h1L = new THREE.Mesh(hillGeo, mLeaves);
        h1L.position.y = 1.0;
        const h2L = new THREE.Mesh(hillTopGeo, mGrass);
        h2L.position.y = 2.6;
        hillL.add(h1L, h2L);
        tile.add(hillL);
      } else {
        const hillR = new THREE.Group();
        hillR.position.set(TRACK_WIDTH / 2 + 10, 0, 0);
        const h1R = new THREE.Mesh(hillGeo, mLeaves);
        h1R.position.y = 1.0;
        const h2R = new THREE.Mesh(hillTopGeo, mGrass);
        h2R.position.y = 2.6;
        hillR.add(h1R, h2R);
        tile.add(hillR);
      }

      scene.add(tile);
      trackTiles.push(tile);
    }

    // ==========================================
    // 2. 3D VOXEL RUNNER FOX
    // ==========================================
    const fox = new THREE.Group();
    fox.position.set(0, 0, 0);

    const bodyMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.72, 0.58, 0.82)), mOrange);
    bodyMesh.position.set(0, 0.42, 0);
    bodyMesh.castShadow = !isSoftwareGl;
    fox.add(bodyMesh);

    const chestMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.48, 0.42, 0.15)), mCream);
    chestMesh.position.set(0, 0.38, -0.4);
    fox.add(chestMesh);

    const headMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.82, 0.62, 0.75)), mOrange);
    headMesh.position.set(0, 0.82, -0.25);
    headMesh.castShadow = !isSoftwareGl;
    fox.add(headMesh);

    const snoutMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.38, 0.26, 0.3)), mCream);
    snoutMesh.position.set(0, 0.72, -0.7);
    fox.add(snoutMesh);

    const noseMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.14, 0.1, 0.08)), mDark);
    noseMesh.position.set(0, 0.8, -0.87);
    fox.add(noseMesh);

    const earL = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.22, 0.36, 0.18)), mOrange);
    earL.position.set(-0.3, 1.22, -0.22);
    fox.add(earL);

    const earR = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.22, 0.36, 0.18)), mOrange);
    earR.position.set(0.3, 1.22, -0.22);
    fox.add(earR);

    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.45, 0.42);

    const tailMain = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.3, 0.32, 0.55)), mOrange);
    tailMain.position.set(0, 0.12, 0.25);
    tailMain.rotation.x = -0.3;
    tailGroup.add(tailMain);

    const tailTip = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.24, 0.26, 0.25)), mCream);
    tailTip.position.set(0, 0.24, 0.52);
    tailGroup.add(tailTip);
    fox.add(tailGroup);

    const legGeo = regGeo(new THREE.BoxGeometry(0.18, 0.35, 0.18));
    const legFL = new THREE.Mesh(legGeo, mPaws);
    legFL.position.set(-0.25, 0.18, -0.25);
    fox.add(legFL);

    const legFR = new THREE.Mesh(legGeo, mPaws);
    legFR.position.set(0.25, 0.18, -0.25);
    fox.add(legFR);

    const legBL = new THREE.Mesh(legGeo, mPaws);
    legBL.position.set(-0.25, 0.18, 0.25);
    fox.add(legBL);

    const legBR = new THREE.Mesh(legGeo, mPaws);
    legBR.position.set(0.25, 0.18, 0.25);
    fox.add(legBR);

    const shadowGeo = regGeo(new THREE.PlaneGeometry(1.2, 1.4));
    const shadowMat = regMat(
      new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.32, depthWrite: false })
    );
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.02, 0);
    scene.add(shadowMesh);

    scene.add(fox);

    // Load High Score
    try {
      gameRef.current.highScore = parseInt(localStorage.getItem('kadalapi_fox_highscore') || '0', 10) || 0;
      callbacksRef.current.onHighScoreUpdate(gameRef.current.highScore);
    } catch (e) {}

    // ResizeObserver
    const updateCanvasSize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = rect.width || container.clientWidth || 800;
      const h = rect.height || container.clientHeight || 380;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };

    updateCanvasSize();
    const ro = new ResizeObserver(() => updateCanvasSize());
    ro.observe(container);

    // ==========================================
    // 3. OBSTACLE & STAR FACTORY
    // ==========================================
    const createObstacleMesh = (type: 'cactus' | 'rock' | 'star') => {
      const group = new THREE.Group();
      if (type === 'cactus') {
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), mCactus);
        trunk.position.y = 0.7;
        trunk.castShadow = !isSoftwareGl;
        group.add(trunk);

        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.35), mCactus);
        armL.position.set(-0.35, 0.75, 0);
        group.add(armL);

        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.35), mCactus);
        armR.position.set(0.35, 0.95, 0);
        group.add(armR);
      } else if (type === 'rock') {
        const rock1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.8), mRock);
        rock1.position.y = 0.3;
        rock1.castShadow = !isSoftwareGl;
        group.add(rock1);

        const rock2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.45), mRock);
        rock2.position.set(0.32, 0.2, 0.2);
        group.add(rock2);
      } else {
        const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), mStar);
        star.position.y = 1.35;
        group.add(star);
      }
      return group;
    };

    // ==========================================
    // 4. CONTINUOUS ANIMATION LOOP
    // ==========================================
    let animId = 0;
    const clock = new THREE.Clock();

    const loop = () => {
      animId = requestAnimationFrame(loop);

      const dt = Math.min(clock.getDelta(), 0.033);
      const g = gameRef.current;

      // Ambient sky animation (sun rays rotation + drifting clouds)
      sunRaysGroup.rotation.z += dt * 0.35;
      const cloudSpeedMult = g.state === 'playing' && !g.isPaused ? 2.4 : 0.7;
      for (let c = 0; c < clouds.length; c++) {
        const cl = clouds[c];
        cl.group.position.z += cl.speedZ * cloudSpeedMult * dt;
        if (cl.group.position.z > 12) {
          cl.group.position.z = -68;
        }
      }

      if (g.state === 'playing' && !g.isPaused) {
        g.distance += g.speed * dt;
        g.score = Math.floor(g.distance * 1.5);

        if (g.score !== g.lastReportedScore) {
          g.lastReportedScore = g.score;
          callbacksRef.current.onScoreUpdate(g.score);
        }

        // Level progression
        const newLvl = 1 + Math.floor(g.score / 500);
        if (newLvl !== g.level) {
          g.level = newLvl;
          g.speed = 18 + (newLvl - 1) * 1.6;
          callbacksRef.current.onLevelUpdate(newLvl);
        }

        // Move track tiles continuously toward +Z
        const trackDelta = g.speed * dt;
        for (let i = 0; i < trackTiles.length; i++) {
          const tile = trackTiles[i];
          tile.position.z += trackDelta;
          if (tile.position.z > 15) {
            tile.position.z -= TOTAL_TRACK;
          }
        }

        // Smooth lane X movement
        g.fox.x = THREE.MathUtils.damp(g.fox.x, g.targetX, 14, dt);
        fox.position.x = g.fox.x;
        shadowMesh.position.x = g.fox.x;

        // Swerve banking tilt decay
        g.fox.tiltZ = THREE.MathUtils.damp(g.fox.tiltZ, 0, 8, dt);
        fox.rotation.z = g.fox.tiltZ;

        // Vertical jump physics (only when in air)
        if (!g.fox.isGrounded) {
          const GRAVITY = -36;
          g.fox.vy += GRAVITY * dt;
          g.fox.y += g.fox.vy * dt;

          if (g.fox.y <= 0) {
            g.fox.y = 0;
            g.fox.vy = 0;
            g.fox.isGrounded = true;
            g.fox.jumpCount = 0;
          }
        } else {
          g.fox.y = 0;
          g.fox.vy = 0;
        }

        fox.position.y = g.fox.y;
        shadowMesh.position.y = 0.02;
        shadowMesh.scale.setScalar(Math.max(0.35, 1 - (g.fox.y / 2.5) * 0.55));

        // Somersault flip angle
        if (g.fox.flipAngle > 0) {
          g.fox.flipAngle -= dt * 14;
          if (g.fox.flipAngle < 0) g.fox.flipAngle = 0;
        }
        fox.rotation.x = -g.fox.flipAngle;

        // Running leg animation
        if (g.fox.isGrounded) {
          g.fox.runCycle += dt * (g.speed * 0.85);
          const legSwing = Math.sin(g.fox.runCycle * 8) * 0.5;
          legFL.rotation.x = legSwing;
          legBR.rotation.x = legSwing;
          legFR.rotation.x = -legSwing;
          legBL.rotation.x = -legSwing;
          tailGroup.rotation.y = Math.cos(g.fox.runCycle * 6) * 0.35;
        } else {
          legFL.rotation.x = 0.25;
          legFR.rotation.x = 0.25;
          legBL.rotation.x = -0.35;
          legBR.rotation.x = -0.35;
        }

        // Steady camera tracking
        camera.position.x = THREE.MathUtils.damp(camera.position.x, g.fox.x * 0.32, 8, dt);
        camera.position.y = 3.3;
        camera.lookAt(g.fox.x * 0.32, 1.0, -8);

        // Spawn obstacles
        g.spawnTimer += dt;
        const interval = Math.max(0.75, 1.5 - (g.level - 1) * 0.08);
        if (g.spawnTimer > interval) {
          g.spawnTimer = 0;
          const chosenLane = Math.floor(Math.random() * 3);
          const randType = Math.random();
          const type = randType > 0.62 ? 'star' : randType > 0.3 ? 'cactus' : 'rock';

          const mesh = createObstacleMesh(type);
          mesh.position.z = -65;
          mesh.position.x = LANES[chosenLane];
          scene.add(mesh);

          g.obstacles.push({
            mesh,
            type,
            z: -65,
            x: LANES[chosenLane],
            lane: chosenLane,
            w: type === 'cactus' ? 0.65 : type === 'rock' ? 0.8 : 0.6,
            h: type === 'cactus' ? 1.4 : type === 'rock' ? 0.6 : 0.8
          });
        }

        // Move obstacles toward +Z and test collisions
        for (let i = g.obstacles.length - 1; i >= 0; i--) {
          const obs = g.obstacles[i];
          obs.z += trackDelta;
          obs.mesh.position.z = obs.z;

          if (obs.type === 'star') {
            obs.mesh.rotation.y += dt * 4;
            obs.mesh.rotation.x += dt * 2;
          }

          const collisionDistZ = Math.abs(obs.z - fox.position.z);
          const collisionDistX = Math.abs(obs.x - fox.position.x);

          if (collisionDistZ < 0.85 && collisionDistX < 0.65) {
            if (obs.type === 'star') {
              if (!obs.collected) {
                obs.collected = true;
                g.distance += 166; // +250 score bonus
                g.score = Math.floor(g.distance * 1.5);
                g.lastReportedScore = g.score;
                callbacksRef.current.onScoreUpdate(g.score);
                playCollectSound();
                scene.remove(obs.mesh);
                obs.mesh.traverse((c) => {
                  if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
                });
                g.obstacles.splice(i, 1);
                continue;
              }
            } else {
              const requiredClearance = obs.type === 'cactus' ? 1.15 : 0.55;
              if (g.fox.y < requiredClearance) {
                g.state = 'gameover';
                setGameState('gameover');
                playCrashSound();

                if (g.score > g.highScore) {
                  g.highScore = g.score;
                  callbacksRef.current.onHighScoreUpdate(g.score);
                  try {
                    localStorage.setItem('kadalapi_fox_highscore', g.score.toString());
                  } catch (e) {}
                }
                callbacksRef.current.onGameOver();
              }
            }
          }

          if (obs.z > 14) {
            scene.remove(obs.mesh);
            obs.mesh.traverse((c) => {
              if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
            });
            g.obstacles.splice(i, 1);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      if (sceneRef.current) {
        clearObstacles(sceneRef.current);
      }
    };
  }, [playCrashSound, playCollectSound]);

  return (
    <div
      ref={mountRef}
      onClick={handleCanvasClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        height: 'clamp(240px, 46vh, 390px)',
        position: 'relative',
        cursor: 'pointer',
        touchAction: 'none'
      }}
    >
      {/* Ready / Start Overlay */}
      {gameState === 'ready' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.72)',
            zIndex: 10,
            textAlign: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              fontFamily: 'var(--px-font)',
              fontSize: 'clamp(13px, 3vw, 18px)',
              color: 'var(--orange)',
              marginBottom: '10px',
              letterSpacing: '0.05em',
              textShadow: '2px 2px 0 #000'
            }}
          >
            FOX - DASH
          </div>
          <div
            style={{
              fontFamily: 'var(--px-font)',
              fontSize: 'clamp(9px, 2vw, 10.5px)',
              color: '#f8fafc',
              marginBottom: '14px',
              lineHeight: '1.85',
              letterSpacing: '0.02em',
              textShadow: '1px 1px 0 #000'
            }}
          >
            PC: [A]/[D] ATAU [LEFT]/[RIGHT] PINDAH JALUR • [SPACE] LOMPAT<br />
            HP: SWIPE KIRI/KANAN ATAU TOMBOL BAWAH • TAP 2X UNTUK SALTO<br />
            AMBIL BINTANG EMAS (+250 PTS) • HINDARI BATU &amp; KAKTUS
          </div>
          <div
            style={{
              fontFamily: 'var(--px-font)',
              fontSize: 'clamp(10px, 2.2vw, 12px)',
              color: '#ffffff',
              background: 'var(--orange)',
              padding: '10px 18px',
              border: '2px solid #ffffff',
              boxShadow: '3px 3px 0 #000000',
              borderRadius: 0,
              letterSpacing: '0.04em'
            }}
          >
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {isPaused && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            zIndex: 10
          }}
        >
          <div
            style={{
              fontFamily: 'var(--px-font)',
              fontSize: '22px',
              color: '#fbbf24',
              marginBottom: '8px',
              letterSpacing: '0.06em'
            }}
          >
            GAME PAUSED
          </div>
          <div
            style={{
              fontFamily: 'var(--px-font)',
              fontSize: '10px',
              color: '#ffffff',
              letterSpacing: '0.04em'
            }}
          >
            TEKAN [P] ATAU KLIK TOMBOL JEDA UNTUK MELANJUTKAN
          </div>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameState === 'gameover' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.82)',
            zIndex: 10
          }}
        >
          <div
            style={{
              fontFamily: 'var(--px-font)',
              fontSize: '24px',
              color: '#ef4444',
              marginBottom: '8px',
              letterSpacing: '0.06em'
            }}
          >
            GAME OVER
          </div>
          <div
            style={{
              fontFamily: 'var(--px-font)',
              fontSize: '12px',
              color: '#ffffff',
              marginBottom: '16px',
              letterSpacing: '0.04em'
            }}
          >
            SKOR: {gameRef.current.score} • REKOR: {gameRef.current.highScore}
          </div>
        </div>
      )}
    </div>
  );
};
