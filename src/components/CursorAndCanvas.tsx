import React, { useEffect, useRef } from 'react';

export const CursorAndCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const isFine = window.matchMedia('(pointer:fine)').matches;
    if (!isFine) return;

    // Glow tracking
    const glow = glowRef.current;
    let gx = window.innerWidth / 2;
    let gy = window.innerHeight / 2;
    let tx = gx;
    let ty = gy;
    let glowOn = false;
    let glowTimer: any = null;
    let glowRaf = 0;

    const animGlow = () => {
      if (!glowOn || !glow) return;
      gx += (tx - gx) * 0.2;
      gy += (ty - gy) * 0.2;
      glow.style.transform = `translate3d(${gx}px, ${gy}px, 0) translate(-50%,-50%)`;
      glowRaf = requestAnimationFrame(animGlow);
    };

    const handleMouseMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!glowOn && glow) {
        glowOn = true;
        glow.classList.add('active');
        glowRaf = requestAnimationFrame(animGlow);
      }
      clearTimeout(glowTimer);
      glowTimer = setTimeout(() => {
        glowOn = false;
        if (glow) glow.classList.remove('active');
      }, 2500);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Particle Canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      if (!canvas) return;
      canvas.width = Math.floor(window.innerWidth * DPR);
      canvas.height = Math.floor(window.innerHeight * DPR);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      size: number;
      color: string;
    }

    const particles: Particle[] = [];
    let lastSpawn = 0;
    const MAX_P = 120;
    let particleRaf = 0;

    const onParticleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpawn > 50 && particles.length < MAX_P) {
        lastSpawn = now;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8 - 0.4,
          life: 1,
          size: Math.random() * 2.5 + 1.5,
          color: Math.random() > 0.3 ? '249,115,22' : '234,106,12'
        });
      }
    };

    const onParticleClick = (e: MouseEvent) => {
      for (let i = 0; i < 10 && particles.length < MAX_P + 20; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        const speed = Math.random() * 3 + 1.5;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.2,
          size: Math.random() * 3.5 + 2,
          color: Math.random() > 0.5 ? '249,115,22' : '253,186,116'
        });
      }
    };

    window.addEventListener('mousemove', onParticleMouseMove, { passive: true });
    window.addEventListener('click', onParticleClick, { passive: true });

    const tickParticles = () => {
      particleRaf = requestAnimationFrame(tickParticles);
      if (document.hidden || !canvas.offsetParent || particles.length === 0) {
        return;
      }
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.025;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(${p.color},${(p.life * 0.65).toFixed(3)})`;
        const s = p.size;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    };

    particleRaf = requestAnimationFrame(tickParticles);

    // Magnetic buttons & Ripple & 3D Card tilt
    const initInteractions = () => {
      // 3D Tilt
      const cards = document.querySelectorAll<HTMLElement>('.stat-card, .skill-card, .proj-card');
      cards.forEach(card => {
        if (card.dataset.tiltBound) return;
        card.dataset.tiltBound = 'true';

        let raf = 0;
        let rx = 0;
        let ry = 0;
        let mx = 50;
        let my = 50;

        const apply = () => {
          raf = 0;
          card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
          card.style.setProperty('--mx', `${mx}%`);
          card.style.setProperty('--my', `${my}%`);
        };

        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const cx = rect.width / 2;
          const cy = rect.height / 2;
          rx = ((y - cy) / cy) * -6;
          ry = ((x - cx) / cx) * 6;
          mx = (x / rect.width) * 100;
          my = (y / rect.height) * 100;
          if (!raf) raf = requestAnimationFrame(apply);
        }, { passive: true });

        card.addEventListener('mouseleave', () => {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
        }, { passive: true });
      });

      // Magnetic
      document.querySelectorAll<HTMLElement>('.magnetic').forEach(btn => {
        if (btn.dataset.magBound) return;
        btn.dataset.magBound = 'true';

        let raf = 0;
        let mx = 0;
        let my = 0;

        const apply = () => {
          raf = 0;
          btn.style.transform = mx || my ? `translate3d(${mx}px, ${my}px, 0)` : 'translate(0,0)';
        };

        btn.addEventListener('mousemove', (e) => {
          const r = btn.getBoundingClientRect();
          mx = (e.clientX - r.left - r.width / 2) * 0.22;
          my = (e.clientY - r.top - r.height / 2) * 0.35;
          if (!raf) raf = requestAnimationFrame(apply);
        }, { passive: true });

        btn.addEventListener('mouseleave', () => {
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          mx = 0;
          my = 0;
          apply();
        }, { passive: true });
      });

      // Button ripple
      document.querySelectorAll<HTMLElement>('.btn, .form-submit, .nav-cta').forEach(btn => {
        if (btn.dataset.ripBound) return;
        btn.dataset.ripBound = 'true';

        btn.addEventListener('click', (e) => {
          const rect = btn.getBoundingClientRect();
          const circle = document.createElement('span');
          const diameter = Math.max(rect.width, rect.height);
          const radius = diameter / 2;

          circle.style.width = circle.style.height = `${diameter}px`;
          circle.style.left = `${e.clientX - rect.left - radius}px`;
          circle.style.top = `${e.clientY - rect.top - radius}px`;
          circle.classList.add('ripple-ring');

          const existingRipple = btn.querySelector('.ripple-ring');
          if (existingRipple) existingRipple.remove();

          btn.appendChild(circle);
        });
      });
    };

    initInteractions();
    const interval = setInterval(initInteractions, 1500);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousemove', onParticleMouseMove);
      window.removeEventListener('click', onParticleClick);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(glowRaf);
      cancelAnimationFrame(particleRaf);
    };
  }, []);

  return (
    <>
      <div className="cursor-glow" id="cursorGlow" ref={glowRef}></div>
      <canvas id="particle-canvas" ref={canvasRef}></canvas>
    </>
  );
};
