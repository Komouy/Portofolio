import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface HeroVoxelFox3DProps {
  isSalto: boolean;
  onClick: () => void;
}

export const HeroVoxelFox3D: React.FC<HeroVoxelFox3DProps> = ({ isSalto, onClick }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const saltoProgressRef = useRef(0);
  const isSaltoRef = useRef(isSalto);
  isSaltoRef.current = isSalto;

  const mousePosRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(true);

  // Play retro jump chiptune when clicked
  const playSaltoSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Track all geometries and materials for complete disposal
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

    // Detect software WebGL
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

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 2.1, 5.6);
    camera.lookAt(0, 0.15, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Lighting (Warm Key, Cool Hemisphere, Sharp Rim)
    const hemiLight = new THREE.HemisphereLight(0xfff5eb, 0x1e293b, 1.35);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff3e0, 2.1);
    dirLight.position.set(4, 7, 5);
    dirLight.castShadow = !isSoftwareGl;
    if (dirLight.shadow) {
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 15;
      dirLight.shadow.bias = -0.0005;
      const d = 3.5;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
    }
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // Materials
    const mOrange = regMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55, metalness: 0.05 }));
    const mOrangeShade = regMat(new THREE.MeshStandardMaterial({ color: 0xea6a0c, roughness: 0.65, metalness: 0.05 }));
    const mCream = regMat(new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.75, metalness: 0.0 }));
    const mHighlight = regMat(new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.5, metalness: 0.05 }));
    const mDark = regMat(new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.35, metalness: 0.1 }));
    const mPaws = regMat(new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.8, metalness: 0.0 }));
    const mEyeWhite = regMat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const mGrass = regMat(new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.85, metalness: 0.0 }));
    const mGrassLight = regMat(new THREE.MeshStandardMaterial({ color: 0x3ebe57, roughness: 0.8, metalness: 0.0 }));
    const mDirt = regMat(new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.95, metalness: 0.0 }));
    const mFlower = regMat(new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.6, metalness: 0.0 }));
    const mSparkle = regMat(new THREE.MeshBasicMaterial({ color: 0xfde047 }));

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // ==========================================
    // 1. FLOATING VOXEL PEDESTAL
    // ==========================================
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.set(0, -0.65, 0);

    // Grass slab
    const baseMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.4, 0.35, 2.0)), mGrass);
    baseMesh.position.y = 0;
    baseMesh.receiveShadow = !isSoftwareGl;
    pedestalGroup.add(baseMesh);

    // Dirt underlayer
    const dirtMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(2.1, 0.35, 1.7)), mDirt);
    dirtMesh.position.y = -0.3;
    dirtMesh.receiveShadow = !isSoftwareGl;
    pedestalGroup.add(dirtMesh);

    // Stepping grass detail fringe cubes
    const fringePositions = [
      [-1.15, 0.08, -0.7, 0.22, 0.2, 0.22],
      [-1.1, 0.05, 0.6, 0.24, 0.2, 0.24],
      [1.12, 0.06, -0.4, 0.22, 0.2, 0.22],
      [1.08, 0.04, 0.5, 0.25, 0.2, 0.25],
      [-0.4, 0.06, 0.95, 0.22, 0.2, 0.22],
      [0.5, 0.05, 0.96, 0.24, 0.2, 0.24]
    ];
    fringePositions.forEach(([x, y, z, sx, sy, sz]) => {
      const b = new THREE.Mesh(regGeo(new THREE.BoxGeometry(sx, sy, sz)), mGrassLight);
      b.position.set(x, y, z);
      b.castShadow = !isSoftwareGl;
      pedestalGroup.add(b);
    });

    // Small voxel flowers
    const f1 = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.12, 0.14, 0.12)), mFlower);
    f1.position.set(-0.85, 0.22, 0.65);
    pedestalGroup.add(f1);

    const f2 = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.1, 0.12, 0.1)), mCream);
    f2.position.set(0.88, 0.21, -0.6);
    pedestalGroup.add(f2);

    rootGroup.add(pedestalGroup);

    // Contact shadow beneath fox
    const shadowGeo = regGeo(new THREE.PlaneGeometry(1.6, 1.2));
    const shadowMat = regMat(
      new THREE.MeshBasicMaterial({
        color: 0x0a0907,
        transparent: true,
        opacity: 0.35,
        depthWrite: false
      })
    );
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -0.46, 0.05);
    rootGroup.add(shadowMesh);

    // ==========================================
    // 2. VOXEL FOX MESH
    // ==========================================
    const fox = new THREE.Group();
    fox.position.set(0, -0.46, 0);

    // Torso Body
    const bodyMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.12, 0.88, 1.25)), mOrange);
    bodyMesh.position.set(0, 0.58, 0);
    bodyMesh.castShadow = !isSoftwareGl;
    bodyMesh.receiveShadow = !isSoftwareGl;
    fox.add(bodyMesh);

    // Top back orange highlight
    const highlightMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.04, 0.1, 1.18)), mHighlight);
    highlightMesh.position.set(0, 1.03, 0);
    fox.add(highlightMesh);

    // White Chest Bib
    const chestMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.72, 0.65, 0.2)), mCream);
    chestMesh.position.set(0, 0.55, 0.63);
    chestMesh.castShadow = !isSoftwareGl;
    fox.add(chestMesh);

    // Lower white tummy
    const tummyMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.55, 0.15, 0.85)), mCream);
    tummyMesh.position.set(0, 0.16, 0.1);
    fox.add(tummyMesh);

    // Neck Pivot
    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 0.98, 0.38);
    fox.add(neckGroup);

    // Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.2, 0);
    neckGroup.add(headGroup);

    // Main Head Skull
    const headMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.28, 0.95, 1.15)), mOrange);
    headMesh.position.set(0, 0.35, 0);
    headMesh.castShadow = !isSoftwareGl;
    headGroup.add(headMesh);

    // Head Top Highlight
    const headTopMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.2, 0.1, 1.08)), mHighlight);
    headTopMesh.position.set(0, 0.84, 0);
    headGroup.add(headTopMesh);

    // Snout / Muzzle
    const snoutMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.68, 0.42, 0.48)), mCream);
    snoutMesh.position.set(0, 0.22, 0.72);
    snoutMesh.castShadow = !isSoftwareGl;
    headGroup.add(snoutMesh);

    // Dark Nose
    const noseMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.22, 0.16, 0.12)), mDark);
    noseMesh.position.set(0, 0.36, 0.96);
    headGroup.add(noseMesh);

    // Cheek fluffs
    const cheekL = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.24, 0.32, 0.35)), mCream);
    cheekL.position.set(-0.68, 0.22, 0.35);
    headGroup.add(cheekL);

    const cheekR = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.24, 0.32, 0.35)), mCream);
    cheekR.position.set(0.68, 0.22, 0.35);
    headGroup.add(cheekR);

    // Eyes (White Sclera + Dark Pupils with dynamic gaze)
    const eyeWhiteGeo = regGeo(new THREE.BoxGeometry(0.24, 0.28, 0.08));
    const eyePupilGeo = regGeo(new THREE.BoxGeometry(0.12, 0.18, 0.09));

    const eyeLeftWhite = new THREE.Mesh(eyeWhiteGeo, mEyeWhite);
    eyeLeftWhite.position.set(-0.36, 0.45, 0.59);
    headGroup.add(eyeLeftWhite);

    const eyeLeftPupil = new THREE.Mesh(eyePupilGeo, mDark);
    eyeLeftPupil.position.set(-0.35, 0.44, 0.6);
    headGroup.add(eyeLeftPupil);

    const eyeRightWhite = new THREE.Mesh(eyeWhiteGeo, mEyeWhite);
    eyeRightWhite.position.set(0.36, 0.45, 0.59);
    headGroup.add(eyeRightWhite);

    const eyeRightPupil = new THREE.Mesh(eyePupilGeo, mDark);
    eyeRightPupil.position.set(0.35, 0.44, 0.6);
    headGroup.add(eyeRightPupil);

    // Ears
    const earGroupL = new THREE.Group();
    earGroupL.position.set(-0.46, 0.88, 0);
    const earL = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.35, 0.55, 0.28)), mOrange);
    earL.position.set(0, 0.26, 0);
    earL.castShadow = !isSoftwareGl;
    earGroupL.add(earL);

    const earLInner = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.22, 0.38, 0.08)), mDark);
    earLInner.position.set(0, 0.24, 0.12);
    earGroupL.add(earLInner);
    headGroup.add(earGroupL);

    const earGroupR = new THREE.Group();
    earGroupR.position.set(0.46, 0.88, 0);
    const earR = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.35, 0.55, 0.28)), mOrange);
    earR.position.set(0, 0.26, 0);
    earR.castShadow = !isSoftwareGl;
    earGroupR.add(earR);

    const earRInner = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.22, 0.38, 0.08)), mDark);
    earRInner.position.set(0, 0.24, 0.12);
    earGroupR.add(earRInner);
    headGroup.add(earGroupR);

    // Tail Group
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.55, -0.62);

    const tailBase = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.48, 0.52, 0.72)), mOrange);
    tailBase.position.set(0, 0.22, -0.32);
    tailBase.rotation.x = 0.35;
    tailBase.castShadow = !isSoftwareGl;
    tailGroup.add(tailBase);

    const tailMid = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.52, 0.56, 0.62)), mOrangeShade);
    tailMid.position.set(0, 0.48, -0.68);
    tailMid.rotation.x = 0.55;
    tailMid.castShadow = !isSoftwareGl;
    tailGroup.add(tailMid);

    const tailTip = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.42, 0.45, 0.48)), mCream);
    tailTip.position.set(0, 0.76, -0.92);
    tailTip.rotation.x = 0.7;
    tailTip.castShadow = !isSoftwareGl;
    tailGroup.add(tailTip);

    fox.add(tailGroup);

    // 4 Paws
    const pawGeo = regGeo(new THREE.BoxGeometry(0.28, 0.32, 0.32));
    const pawFL = new THREE.Mesh(pawGeo, mPaws);
    pawFL.position.set(-0.36, 0.16, 0.42);
    pawFL.castShadow = !isSoftwareGl;
    fox.add(pawFL);

    const pawFR = new THREE.Mesh(pawGeo, mPaws);
    pawFR.position.set(0.36, 0.16, 0.42);
    pawFR.castShadow = !isSoftwareGl;
    fox.add(pawFR);

    const pawBL = new THREE.Mesh(pawGeo, mPaws);
    pawBL.position.set(-0.4, 0.16, -0.42);
    pawBL.castShadow = !isSoftwareGl;
    fox.add(pawBL);

    const pawBR = new THREE.Mesh(pawGeo, mPaws);
    pawBR.position.set(0.4, 0.16, -0.42);
    pawBR.castShadow = !isSoftwareGl;
    fox.add(pawBR);

    rootGroup.add(fox);

    // Sparkle Burst Particles for Salto
    const sparkleGroup = new THREE.Group();
    const sparkles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];
    const sparkleGeo = regGeo(new THREE.BoxGeometry(0.08, 0.08, 0.08));

    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Mesh(sparkleGeo, mSparkle);
      sp.visible = false;
      sparkleGroup.add(sp);
      sparkles.push({ mesh: sp, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    rootGroup.add(sparkleGroup);

    // Trigger sparkle burst
    const burstSparkles = () => {
      sparkles.forEach((s) => {
        s.mesh.visible = true;
        s.mesh.position.set(
          (Math.random() - 0.5) * 0.4,
          0.8 + Math.random() * 0.5,
          (Math.random() - 0.5) * 0.4
        );
        s.vx = (Math.random() - 0.5) * 2.2;
        s.vy = 1.2 + Math.random() * 1.8;
        s.vz = (Math.random() - 0.5) * 2.2;
        s.life = 1.0;
        s.mesh.scale.setScalar(1);
      });
    };

    // Initial slight rotation for 3/4 beauty angle
    rootGroup.rotation.y = -0.22;

    // ResizeObserver for perfect responsive scaling
    const updateSize = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const width = rect.width || container.clientWidth || 340;
      const height = rect.height || container.clientHeight || 300;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    // Mouse Tracking & Scroll Walking State
    let scrollVelocity = 0;
    let walkPhase = 0;
    let lastScrollY = window.scrollY;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisibleRef.current) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth * 0.5);
      const dy = (e.clientY - cy) / (window.innerHeight * 0.5);
      mousePosRef.current = {
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-1, Math.min(1, dy))
      };
    };

    const handleScroll = () => {
      const currentY = window.scrollY;
      const dy = currentY - lastScrollY;
      lastScrollY = currentY;
      scrollVelocity = Math.min(18, Math.max(-18, scrollVelocity + dy * 0.15));
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // IntersectionObserver: Pause render loop when scrolled out of view to save 100% CPU/GPU!
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();
    let prevSalto = false;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Skip render if out of viewport
      if (!isVisibleRef.current || document.hidden) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      // Decay scroll velocity smoothly
      scrollVelocity = THREE.MathUtils.damp(scrollVelocity, 0, 6, delta);
      const walkSpeed = Math.abs(scrollVelocity);
      const isWalking = walkSpeed > 0.15;

      if (isWalking) {
        walkPhase += delta * (8 + walkSpeed * 1.2);
      }

      // Keep grass pedestal stationary; only animate fox walking bounce
      const walkBounce = isWalking ? Math.abs(Math.sin(walkPhase)) * 0.09 : 0;
      pedestalGroup.position.y = -0.65;
      shadowMesh.scale.setScalar(1 - walkBounce * 0.4);

      // Paw walking swing animation when scrolling
      if (isWalking && !isSaltoRef.current) {
        const swing = Math.sin(walkPhase) * Math.min(0.65, 0.25 + walkSpeed * 0.05);
        pawFL.rotation.x = swing;
        pawBR.rotation.x = swing;
        pawFR.rotation.x = -swing;
        pawBL.rotation.x = -swing;

        pawFL.position.y = 0.16 + Math.max(0, Math.cos(walkPhase) * 0.08);
        pawBR.position.y = 0.16 + Math.max(0, Math.cos(walkPhase) * 0.08);
        pawFR.position.y = 0.16 + Math.max(0, -Math.cos(walkPhase) * 0.08);
        pawBL.position.y = 0.16 + Math.max(0, -Math.cos(walkPhase) * 0.08);
      } else {
        pawFL.rotation.x = THREE.MathUtils.damp(pawFL.rotation.x, 0, 10, delta);
        pawFR.rotation.x = THREE.MathUtils.damp(pawFR.rotation.x, 0, 10, delta);
        pawBL.rotation.x = THREE.MathUtils.damp(pawBL.rotation.x, 0, 10, delta);
        pawBR.rotation.x = THREE.MathUtils.damp(pawBR.rotation.x, 0, 10, delta);

        pawFL.position.y = THREE.MathUtils.damp(pawFL.position.y, 0.16, 10, delta);
        pawFR.position.y = THREE.MathUtils.damp(pawFR.position.y, 0.16, 10, delta);
        pawBL.position.y = THREE.MathUtils.damp(pawBL.position.y, 0.16, 10, delta);
        pawBR.position.y = THREE.MathUtils.damp(pawBR.position.y, 0.16, 10, delta);
      }

      // Tail wagging (faster when walking)
      const tailFreq = isWalking ? 8.0 : 3.5;
      tailGroup.rotation.z = Math.sin(time * tailFreq) * (isWalking ? 0.22 : 0.12);
      tailGroup.rotation.y = Math.cos(time * tailFreq) * (isWalking ? 0.25 : 0.15);

      // Ear cute twitch
      earGroupL.rotation.z = Math.sin(time * 2.0) * 0.04;
      earGroupR.rotation.z = -Math.sin(time * 2.0) * 0.04;

      // Head cursor tracking (exponential damping)
      const targetHeadYaw = mousePosRef.current.x * 0.45;
      const targetHeadPitch = -mousePosRef.current.y * 0.3 + (isWalking ? 0.08 : 0);
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, targetHeadYaw, 8, delta);
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, targetHeadPitch, 8, delta);

      // Pupil dynamic gaze
      eyeLeftPupil.position.x = -0.35 + mousePosRef.current.x * 0.04;
      eyeLeftPupil.position.y = 0.44 - mousePosRef.current.y * 0.03;
      eyeRightPupil.position.x = 0.35 + mousePosRef.current.x * 0.04;
      eyeRightPupil.position.y = 0.44 - mousePosRef.current.y * 0.03;

      // Salto flip animation state machine
      if (isSaltoRef.current) {
        if (!prevSalto) {
          prevSalto = true;
          burstSparkles();
        }
        saltoProgressRef.current += delta * 4.2;
        if (saltoProgressRef.current > 1) {
          saltoProgressRef.current = 1;
        }
        const p = saltoProgressRef.current;
        // Jump parabolic arc
        const jumpY = Math.sin(p * Math.PI) * 1.35;
        fox.position.y = -0.46 + jumpY;
        // 360 flip around X
        fox.rotation.x = p * Math.PI * 2;
        shadowMesh.scale.setScalar(Math.max(0.3, 1 - (jumpY / 1.35) * 0.55));
      } else {
        prevSalto = false;
        saltoProgressRef.current = 0;
        fox.position.y = THREE.MathUtils.damp(fox.position.y, -0.46 + walkBounce, 14, delta);
        fox.rotation.x = THREE.MathUtils.damp(fox.rotation.x, 0, 12, delta);
      }

      // Update sparkles
      sparkles.forEach((s) => {
        if (s.life > 0) {
          s.life -= delta * 1.8;
          s.mesh.position.x += s.vx * delta;
          s.mesh.position.y += s.vy * delta;
          s.mesh.position.z += s.vz * delta;
          s.vy -= 4.0 * delta; // gravity
          s.mesh.scale.setScalar(Math.max(0, s.life));
          if (s.life <= 0) s.mesh.visible = false;
        }
      });

      // Only rotate the fox (not the grass pedestal) on mouse/scroll
      const scrollTurn = THREE.MathUtils.clamp(scrollVelocity * 0.03, -0.35, 0.35);
      fox.rotation.y = THREE.MathUtils.damp(
        fox.rotation.y,
        mousePosRef.current.x * 0.15 + scrollTurn,
        8,
        delta
      );

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      io.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSaltoSound();
    onClick();
  };

  return (
    <div
      ref={mountRef}
      onClick={handleClick}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        cursor: 'pointer',
        touchAction: 'none'
      }}
      title="KadalApi 3D Voxel Fox — Klik untuk melihat salto & kombo!"
    />
  );
};
