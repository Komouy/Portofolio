import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Language } from '../types';

interface ScrollCompanionFox3DProps {
  lang: Language;
  onOpenArcade: () => void;
  isModalOpen: boolean;
}

const ROAM_SELECTORS = [
  '#navbar',
  'h1',
  'h2',
  'h3',
  '.sec-title',
  '.eyebrow',
  '.about-card',
  '.skill-card',
  '.proj-card',
  '.exp-item',
  '.contact-card',
  '.contact-form',
  '.btn'
].join(', ');

export const ScrollCompanionFox3D: React.FC<ScrollCompanionFox3DProps> = ({
  lang,
  isModalOpen
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );
  const [speechText, setSpeechText] = useState<string | null>(null);

  const isMobileRef = useRef(isMobileView);
  const isModalOpenRef = useRef(false);
  const saltoTriggerRef = useRef(false);
  const speechTimerRef = useRef<any>(null);
  const forceHopRef = useRef(false);

  isMobileRef.current = isMobileView;
  isModalOpenRef.current = isModalOpen;

  const playChiptuneJump = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.16);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  };

  useEffect(() => {
    const mount = canvasMountRef.current;
    const wrapper = containerRef.current;
    if (!mount || !wrapper) return;

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

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    camera.position.set(0, 1.65, 5.1);
    camera.lookAt(0, 0.15, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    const getCanvasSize = () => (window.innerWidth <= 768 ? 64 : 84);
    const initialSize = getCanvasSize();
    renderer.setSize(initialSize, initialSize);
    mount.appendChild(renderer.domElement);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x1e293b, 1.45);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 2.1);
    dirLight.position.set(4, 7, 5);
    scene.add(dirLight);

    // Materials
    const mOrange = regMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 }));
    const mOrangeShade = regMat(new THREE.MeshStandardMaterial({ color: 0xea6a0c, roughness: 0.65 }));
    const mCream = regMat(new THREE.MeshStandardMaterial({ color: 0xfff8ef, roughness: 0.75 }));
    const mHighlight = regMat(new THREE.MeshStandardMaterial({ color: 0xfdba74, roughness: 0.5 }));
    const mDark = regMat(new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.35 }));
    const mPaws = regMat(new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.8 }));
    const mEyeWhite = regMat(new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const mDust = regMat(new THREE.MeshBasicMaterial({ color: 0xfde047 }));

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Subtle ground contact shadow right under Fox paws
    const shadowMesh = new THREE.Mesh(
      regGeo(new THREE.PlaneGeometry(1.15, 0.9)),
      regMat(new THREE.MeshBasicMaterial({ color: 0x050505, transparent: true, opacity: 0.24, depthWrite: false }))
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, -0.49, 0);
    rootGroup.add(shadowMesh);

    // 3D Voxel Fox
    const fox = new THREE.Group();
    fox.position.set(0, -0.48, 0);

    const bodyMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.05, 0.82, 1.2)), mOrange);
    bodyMesh.position.set(0, 0.56, 0);
    fox.add(bodyMesh);

    const highlightMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.98, 0.08, 1.12)), mHighlight);
    highlightMesh.position.set(0, 0.98, 0);
    fox.add(highlightMesh);

    const chestMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.68, 0.6, 0.18)), mCream);
    chestMesh.position.set(0, 0.52, 0.6);
    fox.add(chestMesh);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.12, 0.35);
    fox.add(headGroup);

    const headMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(1.22, 0.9, 1.1)), mOrange);
    headMesh.position.set(0, 0.32, 0);
    headGroup.add(headMesh);

    const snoutMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.62, 0.38, 0.44)), mCream);
    snoutMesh.position.set(0, 0.2, 0.68);
    headGroup.add(snoutMesh);

    const noseMesh = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.2, 0.15, 0.12)), mDark);
    noseMesh.position.set(0, 0.32, 0.91);
    headGroup.add(noseMesh);

    // Eyes
    const eyeWhiteGeo = regGeo(new THREE.BoxGeometry(0.22, 0.26, 0.08));
    const eyePupilGeo = regGeo(new THREE.BoxGeometry(0.12, 0.17, 0.09));

    const eyeLW = new THREE.Mesh(eyeWhiteGeo, mEyeWhite);
    eyeLW.position.set(-0.34, 0.42, 0.56);
    headGroup.add(eyeLW);

    const eyeLP = new THREE.Mesh(eyePupilGeo, mDark);
    eyeLP.position.set(-0.33, 0.41, 0.57);
    headGroup.add(eyeLP);

    const eyeRW = new THREE.Mesh(eyeWhiteGeo, mEyeWhite);
    eyeRW.position.set(0.34, 0.42, 0.56);
    headGroup.add(eyeRW);

    const eyeRP = new THREE.Mesh(eyePupilGeo, mDark);
    eyeRP.position.set(0.33, 0.41, 0.57);
    headGroup.add(eyeRP);

    // Ears
    const earGeo = regGeo(new THREE.BoxGeometry(0.32, 0.5, 0.26));
    const earL = new THREE.Mesh(earGeo, mOrange);
    earL.position.set(-0.42, 0.98, 0);
    headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, mOrange);
    earR.position.set(0.42, 0.98, 0);
    headGroup.add(earR);

    // Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.52, -0.58);
    const tailBase = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.45, 0.48, 0.68)), mOrange);
    tailBase.position.set(0, 0.2, -0.3);
    tailBase.rotation.x = 0.35;
    tailGroup.add(tailBase);

    const tailMid = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.48, 0.5, 0.56)), mOrangeShade);
    tailMid.position.set(0, 0.44, -0.62);
    tailMid.rotation.x = 0.55;
    tailGroup.add(tailMid);

    const tailTip = new THREE.Mesh(regGeo(new THREE.BoxGeometry(0.38, 0.42, 0.44)), mCream);
    tailTip.position.set(0, 0.68, -0.85);
    tailTip.rotation.x = 0.7;
    tailGroup.add(tailTip);
    fox.add(tailGroup);

    // 4 Walking Paws
    const pawGeo = regGeo(new THREE.BoxGeometry(0.26, 0.34, 0.28));
    const pawFL = new THREE.Mesh(pawGeo, mPaws);
    pawFL.position.set(-0.34, 0.16, 0.38);
    fox.add(pawFL);

    const pawFR = new THREE.Mesh(pawGeo, mPaws);
    pawFR.position.set(0.34, 0.16, 0.38);
    fox.add(pawFR);

    const pawBL = new THREE.Mesh(pawGeo, mPaws);
    pawBL.position.set(-0.36, 0.16, -0.38);
    fox.add(pawBL);

    const pawBR = new THREE.Mesh(pawGeo, mPaws);
    pawBR.position.set(0.36, 0.16, -0.38);
    fox.add(pawBR);

    rootGroup.add(fox);

    // Step Dust / Sparkle Particles
    const particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];
    const pGeo = regGeo(new THREE.BoxGeometry(0.1, 0.1, 0.1));
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(pGeo, mDust);
      m.visible = false;
      rootGroup.add(m);
      particles.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0 });
    }

    const spawnStepParticle = () => {
      const free = particles.find((p) => p.life <= 0);
      if (!free) return;
      free.mesh.visible = true;
      free.mesh.position.set((Math.random() - 0.5) * 0.5, -0.38, -0.4 + (Math.random() - 0.5) * 0.3);
      free.vx = (Math.random() - 0.5) * 1.2;
      free.vy = 0.8 + Math.random() * 0.9;
      free.vz = -0.6 - Math.random() * 0.8;
      free.life = 1.0;
    };

    // ====================================================
    // FREE-ROAMING DOM LEDGE / NAVBAR / TEXT ENGINE
    // ====================================================
    interface LedgeInfo {
      el: Element;
      minX: number;
      maxX: number;
      y: number;
      isNavbar: boolean;
    }

    const readLedge = (el: Element): LedgeInfo | null => {
      const r = el.getBoundingClientRect();
      if (r.width < 70 || r.height < 14) return null;
      const isNavbar = el.id === 'navbar' || el.classList.contains('navbar');
      // For navbar, walk along the inner bottom floor of the navbar; for cards/text, walk along their top border/text edge
      const y = isNavbar ? r.bottom - 4 : r.top + 4;
      const margin = Math.min(28, r.width * 0.15);
      const minX = Math.max(32, r.left + margin);
      const maxX = Math.min(window.innerWidth - 32, r.right - margin);
      if (maxX <= minX + 10) return null;
      return { el, minX, maxX, y, isNavbar };
    };

    const findVisibleLedges = (preferNavbar = false): LedgeInfo[] => {
      const nodes = document.querySelectorAll(ROAM_SELECTORS);
      const valid: LedgeInfo[] = [];
      const vh = window.innerHeight;

      nodes.forEach((el) => {
        const l = readLedge(el);
        if (!l) return;
        // Ledge must be within visible viewport
        if (l.y >= 42 && l.y <= vh - 36) {
          valid.push(l);
        }
      });

      if (preferNavbar) {
        const navs = valid.filter((v) => v.isNavbar);
        if (navs.length > 0) return navs;
      }
      return valid;
    };

    let currentElement: Element | null = document.getElementById('navbar');
    let petX = window.innerWidth * 0.35;
    let petY = 64;
    let walkDir = 1; // 1 = right, -1 = left
    let roamState: 'walking' | 'idle' | 'jumping' = 'walking';
    let stateTimer = 3.5;

    // Jump state
    let jumpStartX = petX;
    let jumpStartY = petY;
    let jumpEndX = petX;
    let jumpEndY = petY;
    let jumpProgress = 0;
    let jumpDuration = 0.65;

    let walkPhase = 0;
    let stepSpawnTimer = 0;
    let saltoProgress = 0;
    let mouseNorm = { x: 0, y: 0 };
    let lastScrollY = window.scrollY;
    let scrollTriggerAccumulator = 0;

    // Pick a new DOM element (navbar, text heading, or card border) to jump onto
    const hopToNewElement = (fromScroll = false) => {
      // 22% chance to hop into the navbar when roaming, otherwise pick text/borders in view
      const wantNav = !fromScroll && Math.random() < 0.22;
      const ledges = findVisibleLedges(wantNav);
      if (ledges.length === 0) return;

      // Filter out currentElement if there are other choices
      const candidates = ledges.length > 1 ? ledges.filter((l) => l.el !== currentElement) : ledges;

      // If triggered by scroll, prefer ledges near the middle of the viewport
      let chosen: LedgeInfo;
      if (fromScroll && candidates.length > 1) {
        const midY = window.innerHeight * 0.48;
        candidates.sort((a, b) => Math.abs(a.y - midY) - Math.abs(b.y - midY));
        const topPool = candidates.slice(0, Math.min(4, candidates.length));
        chosen = topPool[Math.floor(Math.random() * topPool.length)];
      } else {
        chosen = candidates[Math.floor(Math.random() * candidates.length)];
      }

      currentElement = chosen.el;
      jumpStartX = petX;
      jumpStartY = petY;
      jumpEndX = chosen.minX + Math.random() * (chosen.maxX - chosen.minX);
      jumpEndY = chosen.y;

      const dist = Math.hypot(jumpEndX - jumpStartX, jumpEndY - jumpStartY);
      jumpDuration = THREE.MathUtils.clamp(0.42 + dist / 950, 0.42, 0.85);
      jumpProgress = 0;
      roamState = 'jumping';
      walkDir = jumpEndX >= jumpStartX ? 1 : -1;
    };

    const handleScroll = () => {
      const y = window.scrollY;
      const dy = y - lastScrollY;
      lastScrollY = y;
      scrollTriggerAccumulator += Math.abs(dy);

      // If the element the Fox is standing on scrolled out of the comfortable viewport, or user scrolled a lot, hop to a visible element!
      if (roamState !== 'jumping') {
        const curLedge = currentElement ? readLedge(currentElement) : null;
        const outOfBounds = !curLedge || curLedge.y < 38 || curLedge.y > window.innerHeight - 28;
        if (outOfBounds || scrollTriggerAccumulator > 260) {
          scrollTriggerAccumulator = 0;
          hopToNewElement(true);
        }
      }
    };

    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      if (mobile !== isMobileRef.current) {
        isMobileRef.current = mobile;
        setIsMobileView(mobile);
        const sz = getCanvasSize();
        renderer.setSize(sz, sz);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - petX) / (window.innerWidth * 0.5);
      const dy = (e.clientY - petY) / (window.innerHeight * 0.5);
      mouseNorm = {
        x: Math.max(-1, Math.min(1, dx)),
        y: Math.max(-1, Math.min(1, dy))
      };
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Start by placing the fox on the navbar or first visible heading
    const initLedges = findVisibleLedges(true);
    if (initLedges.length > 0) {
      currentElement = initLedges[0].el;
      petX = (initLedges[0].minX + initLedges[0].maxX) * 0.5;
      petY = initLedges[0].y;
    }

    // Animation Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (isModalOpenRef.current || document.hidden) return;

      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();

      if (forceHopRef.current) {
        forceHopRef.current = false;
        hopToNewElement(false);
      }

      let isMoving = false;
      let moveSpeedMult = 1.0;
      let targetYaw = 0.25 + mouseNorm.x * 0.25;
      let extraJumpArcY = 0;

      if (roamState === 'jumping') {
        isMoving = true;
        moveSpeedMult = 1.8;
        jumpProgress += dt / jumpDuration;

        // Dynamically update jumpEndY if target element moved due to scrolling
        const liveTarget = currentElement ? readLedge(currentElement) : null;
        if (liveTarget) {
          jumpEndY = liveTarget.y;
          jumpEndX = THREE.MathUtils.clamp(jumpEndX, liveTarget.minX, liveTarget.maxX);
        }

        if (jumpProgress >= 1) {
          petX = jumpEndX;
          petY = jumpEndY;
          roamState = 'walking';
          stateTimer = 2.4 + Math.random() * 2.8;
          spawnStepParticle();
        } else {
          // Smooth easing for X/Y + parabolic jump arc
          const t = jumpProgress;
          const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          petX = THREE.MathUtils.lerp(jumpStartX, jumpEndX, ease);
          petY = THREE.MathUtils.lerp(jumpStartY, jumpEndY, ease);
          extraJumpArcY = Math.sin(t * Math.PI) * 52; // 52px high arc in screen space

          const dx = jumpEndX - jumpStartX;
          targetYaw = dx >= 0 ? 0.85 : -0.85;
        }
      } else {
        // Standing or walking on currentElement
        const liveLedge = currentElement ? readLedge(currentElement) : null;
        if (!liveLedge || liveLedge.y < 36 || liveLedge.y > window.innerHeight - 24) {
          hopToNewElement(true);
        } else {
          // Keep Fox feet locked onto the element's top border / text / navbar floor!
          petY = THREE.MathUtils.damp(petY, liveLedge.y, 18, dt);

          stateTimer -= dt;
          if (roamState === 'walking') {
            isMoving = true;
            const walkPxPerSec = isMobileRef.current ? 46 : 64;
            petX += walkDir * walkPxPerSec * dt;

            // Reverse direction if reaching the end of the text/border/navbar
            if (petX >= liveLedge.maxX) {
              petX = liveLedge.maxX;
              walkDir = -1;
            } else if (petX <= liveLedge.minX) {
              petX = liveLedge.minX;
              walkDir = 1;
            }

            targetYaw = walkDir > 0 ? 1.05 : -1.05;

            if (stateTimer <= 0) {
              // Either pause to look at the user or hop to another text/border/navbar!
              if (Math.random() < 0.55) {
                roamState = 'idle';
                stateTimer = 1.4 + Math.random() * 1.6;
              } else {
                hopToNewElement(false);
              }
            }
          } else if (roamState === 'idle') {
            isMoving = false;
            petX = THREE.MathUtils.clamp(petX, liveLedge.minX, liveLedge.maxX);
            targetYaw = 0.22 + mouseNorm.x * 0.25;

            if (stateTimer <= 0) {
              if (Math.random() < 0.65) {
                hopToNewElement(false);
              } else {
                roamState = 'walking';
                walkDir = Math.random() < 0.5 ? 1 : -1;
                stateTimer = 2.2 + Math.random() * 2.5;
              }
            }
          }
        }
      }

      // Position wrapper so the Fox's paws sit right at (petX, petY)
      const sz = isMobileRef.current ? 64 : 84;
      const screenX = Math.round(petX - sz * 0.5);
      const screenY = Math.round(petY - sz * 0.82 - extraJumpArcY);
      wrapper.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;

      // Walking leg cycle & step particles
      if (isMoving) {
        walkPhase += dt * 13 * moveSpeedMult;
        stepSpawnTimer += dt;
        if (stepSpawnTimer > 0.16 && roamState === 'walking') {
          stepSpawnTimer = 0;
          spawnStepParticle();
        }
      }

      const walkBounce = isMoving && roamState === 'walking' ? Math.abs(Math.sin(walkPhase)) * 0.12 : 0;

      if (isMoving && !saltoTriggerRef.current) {
        const swing = Math.sin(walkPhase) * 0.62;
        pawFL.rotation.x = swing;
        pawBR.rotation.x = swing;
        pawFR.rotation.x = -swing;
        pawBL.rotation.x = -swing;

        pawFL.position.y = 0.16 + Math.max(0, Math.cos(walkPhase) * 0.09);
        pawBR.position.y = 0.16 + Math.max(0, Math.cos(walkPhase) * 0.09);
        pawFR.position.y = 0.16 + Math.max(0, -Math.cos(walkPhase) * 0.09);
        pawBL.position.y = 0.16 + Math.max(0, -Math.cos(walkPhase) * 0.09);
      } else {
        pawFL.rotation.x = THREE.MathUtils.damp(pawFL.rotation.x, 0, 10, dt);
        pawFR.rotation.x = THREE.MathUtils.damp(pawFR.rotation.x, 0, 10, dt);
        pawBL.rotation.x = THREE.MathUtils.damp(pawBL.rotation.x, 0, 10, dt);
        pawBR.rotation.x = THREE.MathUtils.damp(pawBR.rotation.x, 0, 10, dt);

        pawFL.position.y = THREE.MathUtils.damp(pawFL.position.y, 0.16, 10, dt);
        pawFR.position.y = THREE.MathUtils.damp(pawFR.position.y, 0.16, 10, dt);
        pawBL.position.y = THREE.MathUtils.damp(pawBL.position.y, 0.16, 10, dt);
        pawBR.position.y = THREE.MathUtils.damp(pawBR.position.y, 0.16, 10, dt);
      }

      // Smoothly rotate fox toward walking/jumping direction or user
      rootGroup.rotation.y = THREE.MathUtils.damp(rootGroup.rotation.y, targetYaw, 9, dt);

      // Salto jump if clicked, or slight forward lean when jumping/walking
      if (saltoTriggerRef.current) {
        saltoProgress += dt * 3.8;
        if (saltoProgress >= 1) {
          saltoProgress = 0;
          saltoTriggerRef.current = false;
          fox.rotation.x = 0;
        } else {
          const jumpArc = Math.sin(saltoProgress * Math.PI) * 1.15;
          fox.position.y = -0.48 + jumpArc;
          fox.rotation.x = saltoProgress * Math.PI * 2;
        }
      } else if (roamState === 'jumping') {
        fox.position.y = THREE.MathUtils.damp(fox.position.y, -0.35, 12, dt);
        fox.rotation.x = THREE.MathUtils.damp(fox.rotation.x, (jumpProgress - 0.5) * 0.55, 10, dt);
      } else {
        fox.position.y = THREE.MathUtils.damp(fox.position.y, -0.48 + walkBounce, 15, dt);
        fox.rotation.x = THREE.MathUtils.damp(fox.rotation.x, isMoving ? 0.07 : 0, 10, dt);
      }

      // Head & Eye gaze
      headGroup.rotation.y = THREE.MathUtils.damp(
        headGroup.rotation.y,
        roamState === 'idle' ? mouseNorm.x * 0.42 : mouseNorm.x * 0.18,
        8,
        dt
      );
      headGroup.rotation.x = THREE.MathUtils.damp(
        headGroup.rotation.x,
        -mouseNorm.y * 0.22 + (isMoving ? Math.sin(walkPhase * 2) * 0.05 : 0),
        8,
        dt
      );

      eyeLP.position.x = -0.33 + mouseNorm.x * 0.03;
      eyeRP.position.x = 0.33 + mouseNorm.x * 0.03;

      // Tail wag
      const tailSpeed = isMoving ? 10.0 : 3.5;
      tailGroup.rotation.y = Math.cos(time * tailSpeed) * (isMoving ? 0.34 : 0.16);
      tailGroup.rotation.z = Math.sin(time * tailSpeed) * (isMoving ? 0.24 : 0.12);

      // Update step dust particles
      particles.forEach((p) => {
        if (p.life > 0) {
          p.life -= dt * 2.4;
          p.mesh.position.x += p.vx * dt;
          p.mesh.position.y += p.vy * dt;
          p.mesh.position.z += p.vz * dt;
          p.vy -= 3.2 * dt;
          p.mesh.scale.setScalar(Math.max(0, p.life));
          if (p.life <= 0) p.mesh.visible = false;
        }
      });

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    };
  }, []);

  const handleCompanionClick = () => {
    playChiptuneJump();
    saltoTriggerRef.current = true;
    forceHopRef.current = true;

    const msgsID = [
      'Lompat ke elemen berikutnya!',
      'Jalan-jalan di atas teks & border!',
      'Salto dulu wir!',
      'Aku bebas keliling halaman!'
    ];
    const msgsEN = [
      'Hopping to the next element!',
      'Walking on text & borders!',
      'Salto flip!',
      'Roaming freely across the page!'
    ];
    const pool = lang === 'en' ? msgsEN : msgsID;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setSpeechText(chosen);
    clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => {
      setSpeechText(null);
    }, 1800);
  };

  const boxSize = isMobileView ? 64 : 84;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${boxSize}px`,
        height: `${boxSize}px`,
        zIndex: 999,
        opacity: !isModalOpen ? 1 : 0,
        pointerEvents: 'none',
        transition: 'opacity 0.25s ease',
        willChange: 'transform',
        userSelect: 'none'
      }}
    >
      {/* Speech Bubble on Click */}
      {speechText && (
        <div
          style={{
            position: 'absolute',
            bottom: '92%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--white)',
            color: 'var(--ink)',
            border: '2px solid var(--ink)',
            boxShadow: '2px 2px 0 var(--ink)',
            padding: '4px 8px',
            fontFamily: 'var(--px-font)',
            fontSize: '8px',
            lineHeight: '1.35',
            whiteSpace: 'nowrap',
            borderRadius: 0,
            zIndex: 2
          }}
        >
          {speechText}
        </div>
      )}

      {/* 3D Roaming Fox Canvas */}
      <div
        ref={canvasMountRef}
        style={{
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          position: 'relative',
          pointerEvents: 'none',
          filter: 'drop-shadow(2px 3px 0 rgba(21,19,15,0.38))'
        }}
      />

      {/* Compact center hitbox so clicking the Fox triggers a salto & hop without blocking surrounding text/links */}
      <div
        onClick={handleCompanionClick}
        title={lang === 'id' ? 'Klik Fox untuk salto & pindah tempat!' : 'Click Fox to flip & hop!'}
        style={{
          position: 'absolute',
          top: '22%',
          left: '22%',
          width: '56%',
          height: '58%',
          cursor: 'pointer',
          pointerEvents: !isModalOpen ? 'auto' : 'none'
        }}
      />
    </div>
  );
};
