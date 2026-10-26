import React, { useRef, useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface SkillsProps {
  lang: Language;
}

export const Skills: React.FC<SkillsProps> = ({ lang }) => {
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
        const dur = 32;
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
  }, []);

  const skillCards = [
    // Frontend
    {
      title: 'Frontend',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16v16H4z" />
          <path d="M4 9h16M9 9v11" />
        </svg>
      ),
      chips: [
        { name: 'HTML', iconClass: 'devicon-html5-plain colored' },
        { name: 'CSS', iconClass: 'devicon-css3-plain colored' },
        { name: 'JavaScript', iconClass: 'devicon-javascript-plain colored' },
        { name: 'React', iconClass: 'devicon-react-original colored' },
        { name: 'Next.js', iconClass: 'devicon-nextjs-plain' },
        { name: 'Tailwind', iconClass: 'devicon-tailwindcss-plain colored' }
      ]
    },
    // Backend
    {
      title: 'Backend',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      chips: [
        { name: 'PHP', iconClass: 'devicon-php-plain colored' },
        { name: 'Laravel', iconClass: 'devicon-laravel-plain colored' },
        { name: 'Node.js', iconClass: 'devicon-nodejs-plain colored' },
        { name: 'FastAPI', iconClass: 'devicon-fastapi-plain colored' }
      ]
    },
    // Database
    {
      title: 'Database',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="6" rx="8" ry="3" />
          <path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
        </svg>
      ),
      chips: [
        { name: 'Firebase', iconClass: 'devicon-firebase-plain colored' },
        { name: 'MySQL', iconClass: 'devicon-mysql-plain colored' },
        { name: 'PostgreSQL', iconClass: 'devicon-postgresql-plain colored' }
      ]
    },
    // Artificial Intelligence
    {
      title: 'Artificial Intelligence',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a5 5 0 00-5 5c0 2 1 3 1 5a5 5 0 0010 0c0-2 1-3 1-5a5 5 0 00-5-5z" />
          <path d="M9 21h6M10 18h4" />
        </svg>
      ),
      customChips: [
        {
          name: 'OpenAI API',
          icon: (
            <svg className="csvg" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#10a37f' }}>
              <path d="M22.28 9.98a5.6 5.6 0 00-.48-4.6 5.75 5.75 0 00-6.2-2.75A5.65 5.65 0 0011.42 1a5.74 5.74 0 00-5.47 3.98 5.66 5.66 0 00-3.78 2.74 5.75 5.75 0 00.71 6.73 5.6 5.6 0 00.48 4.6 5.75 5.75 0 006.2 2.75 5.65 5.65 0 004.18 1.64 5.74 5.74 0 005.47-3.98 5.66 5.66 0 003.78-2.74 5.75 5.75 0 00-.71-6.74zm-8.56 11.98a4.25 4.25 0 01-2.73-.99l.13-.08 4.54-2.62a.76.76 0 00.38-.66v-6.4l1.92 1.11a.07.07 0 01.04.05v5.3a4.27 4.27 0 01-4.28 4.29zm-9.19-3.93a4.24 4.24 0 01-.51-2.87l.13.08 4.54 2.62a.76.76 0 00.76 0l5.54-3.2v2.22a.07.07 0 01-.03.06L10.4 19.3a4.27 4.27 0 01-5.87-1.27zm-1.2-9.9a4.24 4.24 0 012.24-1.87v5.38a.76.76 0 00.38.66l5.54 3.2-1.92 1.1a.07.07 0 01-.07.01L5.37 14.1a4.27 4.27 0 01-.04-6zM19.1 13.5l-5.54-3.2 1.92-1.11a.07.07 0 01.07-.01l4.53 2.62a4.27 4.27 0 01-.66 7.7v-5.38a.76.76 0 00-.32-.62zm1.9-2.9l-.13-.08-4.53-2.62a.76.76 0 00-.77 0l-5.54 3.2V8.88a.07.07 0 01.03-.06l4.53-2.62a4.27 4.27 0 016.41 4.42zM8.17 12.86L6.25 11.75a.07.07 0 01-.04-.05V6.4a4.27 4.27 0 017.01-3.28l-.14.08-4.53 2.62a.76.76 0 00-.38.66v6.38zm1.04-2.25l2.47-1.43 2.47 1.42v2.85l-2.47 1.43-2.47-1.42v-2.85z" />
            </svg>
          )
        },
        {
          name: 'Gemini API',
          icon: (
            <svg className="csvg" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
              <defs>
                <linearGradient id="gemGradSkill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4285F4" />
                  <stop offset="50%" stopColor="#9B72F8" />
                  <stop offset="100%" stopColor="#EA4335" />
                </linearGradient>
              </defs>
              <path
                d="M12 2C6.8 6 4 8.8 4 12s2.8 6 8 10c5.2-4 8-6.8 8-10S17.2 6 12 2z"
                stroke="url(#gemGradSkill)"
                fill="url(#gemGradSkill)"
                opacity=".85"
              />
              <circle cx="12" cy="12" r="3" fill="white" opacity=".9" />
            </svg>
          )
        },
        {
          name: 'Ollama',
          icon: (
            <svg className="csvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: '#7c3aed' }}>
              <path d="M9 3C7.3 3 6 4.3 6 6v3c0 .6-.2 1.2-.6 1.6A4 4 0 004 14c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4a4 4 0 00-1.4-3.1c-.4-.5-.6-1-.6-1.6V6c0-1.7-1.3-3-3-3" />
              <circle cx="10" cy="10" r="1" fill="currentColor" />
              <circle cx="14" cy="10" r="1" fill="currentColor" />
              <path d="M10 15c.6.6 3.4.6 4 0" />
            </svg>
          )
        },
        {
          name: 'AI Automation',
          icon: (
            <svg className="csvg" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#f59e0b' }}>
              <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
            </svg>
          )
        },
        {
          name: 'Prompt Engineering',
          icon: (
            <svg className="csvg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#3b82f6' }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              <path d="M8 10h8M8 14h5" />
            </svg>
          )
        }
      ]
    },
    // Tools
    {
      title: 'Tools',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </svg>
      ),
      chips: [
        { name: 'Git', iconClass: 'devicon-git-plain colored' },
        { name: 'GitHub', iconClass: 'devicon-github-original colored' },
        { name: 'VS Code', iconClass: 'devicon-vscode-plain colored' }
      ],
      customChips: [
        {
          name: 'Canva',
          icon: (
            <svg className="csvg" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#7d2ae8' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13v10l7-5-7-5z" />
            </svg>
          )
        },
        {
          name: 'Antigravity IDE',
          icon: (
            <svg className="csvg" viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
              <defs>
                <linearGradient id="agGradSkill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <path d="M12 2c1.5 3 4 5.5 4 9a4 4 0 01-8 0c0-3.5 2.5-6 4-9z" stroke="url(#agGradSkill)" fill="none" />
              <circle cx="12" cy="11" r="1.5" fill="url(#agGradSkill)" />
              <path d="M7 18l-2 3M17 18l2 3" stroke="url(#agGradSkill)" strokeLinecap="round" />
              <ellipse cx="12" cy="19" rx="5" ry="1.5" stroke="url(#agGradSkill)" fill="none" />
            </svg>
          )
        }
      ]
    }
  ];

  // Helper to render card
  const renderCard = (card: any, idx: number, keyPrefix: string) => (
    <div key={`${keyPrefix}-${idx}`} className="skill-card in-view">
      <div className="card-shine"></div>
      <div className="sk-head">
        <div className="sk-icon px-icon-ready px-icon-pop">{card.icon}</div>
        <h3>{card.title}</h3>
      </div>
      <div className="chip-list">
        {card.chips?.map((c: any, i: number) => (
          <span key={i} className="chip">
            <i className={c.iconClass}></i>
            {c.name}
          </span>
        ))}
        {card.customChips?.map((c: any, i: number) => (
          <span key={`custom-${i}`} className="chip">
            {c.icon}
            {c.name}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <section id="skills" style={{ background: 'var(--gray-50)' }}>
      <div className="container">
        <div className="section-head reveal in-view">
          <div className="eyebrow">{t.skills_eyebrow}</div>
          <h2>{t.skills_title}</h2>
          <p>{t.skills_sub}</p>
        </div>

        <div className="px-marquee-clip">
          <div className="skills-grid px-marquee" ref={gridRef}>
            {skillCards.map((card, idx) => renderCard(card, idx, 'orig'))}
            {/* Clones for seamless infinite marquee loop */}
            {skillCards.map((card, idx) => renderCard(card, idx, 'clone'))}
          </div>
        </div>
      </div>
    </section>
  );
};
