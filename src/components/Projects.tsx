import React, { useRef, useEffect } from 'react';
import { Project, Language } from '../types';
import { translations } from '../constants/translations';

interface ProjectsProps {
  lang: Language;
  projects: Project[];
  onOpenManager?: () => void;
  isManagerUnlocked?: boolean;
}

export const Projects: React.FC<ProjectsProps> = ({
  lang,
  projects
}) => {
  const t = translations[lang];
  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    let dragging = false;
    let moved = false;
    let startX = 0;
    let baseX = 0;
    let lastX = 0;
    let lastT = 0;
    let velX = 0;
    let momRAF: any = null;
    let resumeTO: any = null;
    let ended = true;

    const trackW = () => (grid.scrollWidth || 0) / 2 || 1;
    const readX = () => {
      const tr = getComputedStyle(grid).transform;
      if (!tr || tr === 'none') return 0;
      try {
        return (window.DOMMatrixReadOnly ? new DOMMatrixReadOnly(tr) : new DOMMatrix(tr)).m41;
      } catch (e) {
        return 0;
      }
    };

    const wrapX = (x: number) => {
      const w = trackW();
      x %= w;
      if (x > 0) x -= w;
      return x;
    };

    const setX = (x: number) => {
      grid.style.transform = `translateX(${x}px)`;
    };

    const onStart = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (momRAF) cancelAnimationFrame(momRAF);
      if (resumeTO) clearTimeout(resumeTO);
      ended = false;
      dragging = true;
      moved = false;
      startX = lastX = e.clientX;
      lastT = performance.now();
      velX = 0;
      baseX = readX();
      grid.style.animation = 'none';
      setX(baseX);
      grid.style.cursor = 'grabbing';
      try {
        grid.setPointerCapture(e.pointerId);
      } catch (err) {}
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) moved = true;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      velX = ((e.clientX - lastX) / dt) * 16.67;
      lastX = e.clientX;
      lastT = now;
      setX(wrapX(baseX + dx));
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      grid.style.cursor = '';
      if (momRAF) cancelAnimationFrame(momRAF);
      const w = trackW();
      let x = readX();

      const finishDrag = () => {
        if (ended) return;
        ended = true;
        if (resumeTO) clearTimeout(resumeTO);
        if (momRAF) cancelAnimationFrame(momRAF);
        const dur = Math.max(38, projects.length * 8);
        const p = Math.min(1, Math.max(0, 1 + x / w));
        grid.style.transform = '';
        grid.style.animation = '';
        grid.style.animationDelay = `${-p * dur}s`;
      };

      if (!moved || Math.abs(velX) < 1.5) {
        finishDrag();
        return;
      }

      const momentum = () => {
        velX *= 0.9;
        x += velX;
        if (x > 0) x -= w;
        else if (x <= -w) x += w;
        setX(x);
        if (Math.abs(velX) > 0.4) {
          momRAF = requestAnimationFrame(momentum);
        } else {
          momRAF = null;
          finishDrag();
        }
      };

      momRAF = requestAnimationFrame(momentum);
      resumeTO = setTimeout(finishDrag, 1500);
    };

    grid.addEventListener('pointerdown', onStart);
    grid.addEventListener('pointermove', onMove);
    grid.addEventListener('pointerup', onEnd);
    grid.addEventListener('pointercancel', onEnd);

    return () => {
      grid.removeEventListener('pointerdown', onStart);
      grid.removeEventListener('pointermove', onMove);
      grid.removeEventListener('pointerup', onEnd);
      grid.removeEventListener('pointercancel', onEnd);
      if (momRAF) cancelAnimationFrame(momRAF);
      if (resumeTO) clearTimeout(resumeTO);
    };
  }, [projects]);

  const renderCard = (proj: Project, idx: number, keyPrefix: string) => {
    const primaryTag = proj.tags?.[0] || 'PROJECT';
    const rawImage = proj.image?.trim() || '';
    const hasImage = Boolean(rawImage);
    const imageSrc = hasImage
      ? (rawImage.startsWith('http') || rawImage.startsWith('/') ? rawImage : `/${rawImage}`)
      : '';

    return (
      <div key={`${keyPrefix}-${proj.id}-${idx}`} className="proj-card in-view">
        <div className="card-shine"></div>
        <div className="proj-thumb" style={{ position: 'relative', overflow: 'hidden', background: '#1c1914' }}>
          {hasImage ? (
            <img
              src={imageSrc}
              alt={`${proj.title} Preview`}
              loading="lazy"
              decoding="async"
              className="px-loaded"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'relative', zIndex: 1 }}
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const next = target.nextElementSibling as HTMLElement | null;
                if (next) next.style.display = 'flex';
              }}
            />
          ) : null}
          <div
            className="proj-thumb-pixel-cover"
            style={{
              display: hasImage ? 'none' : 'flex',
              position: 'absolute',
              inset: 0,
              zIndex: 0
            }}
          >
            <div className="pixel-cover-badge">{primaryTag}</div>
            <div className="pixel-cover-name">{proj.title}</div>
          </div>
        </div>

        <div className="proj-body">
          <h3>
            <a href={proj.demoUrl || proj.githubUrl || '#'} target="_blank" rel="noopener">
              {proj.title}
            </a>
          </h3>
          <p>{proj.description}</p>
          <div className="proj-tags">
            {proj.tags?.map((tag, tIdx) => (
              <span key={tIdx}>{tag}</span>
            ))}
          </div>
          <div className="proj-links">
            {proj.githubUrl && (
              <a href={proj.githubUrl} target="_blank" rel="noopener">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 00-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-1.99 1.03-2.69-.1-.26-.45-1.29.1-2.68 0 0 .84-.27 2.75 1.02a9.4 9.4 0 015 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.4.2 2.42.1 2.68.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0012 2z" />
                </svg>
                GitHub
              </a>
            )}
            <a href={proj.demoUrl && proj.demoUrl.trim() ? proj.demoUrl : '#contact'} target={proj.demoUrl ? '_blank' : undefined} rel="noopener">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 3h7v7M21 3l-9 9M5 5h6v2H7v10h10v-4h2v6H5z" />
              </svg>
              Demo
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="projects">
      <div className="container">
        <div
          className="section-head reveal in-view"
          style={{ maxWidth: '100% !important', marginBottom: 'clamp(20px, 3vw, 36px) !important' }}
        >
          <div className="eyebrow">{t.proj_eyebrow}</div>
          <h2>{t.proj_title}</h2>
        </div>

        <div className="px-marquee-clip">
          <div
            className="proj-grid px-marquee"
            ref={gridRef}
            style={{
              '--marq-dur': `${Math.max(38, projects.length * 8)}s`
            } as React.CSSProperties}
          >
            {projects.map((proj, idx) => renderCard(proj, idx, 'orig'))}
            {/* Clones for seamless infinite marquee loop */}
            {projects.map((proj, idx) => renderCard(proj, idx, 'clone'))}
          </div>
        </div>
      </div>
    </section>
  );
};
