import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';
import { HeroVoxelFox3D } from './HeroVoxelFox3D';

interface HeroProps {
  lang: Language;
  onOpenArcade: () => void;
}

export const Hero: React.FC<HeroProps> = ({ lang, onOpenArcade }) => {
  const t = translations[lang];
  const heroRef = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Fox state
  const [clickCount, setClickCount] = useState(0);
  const [saltoActive, setSaltoActive] = useState(false);
  const [dialogText, setDialogText] = useState(
    lang === 'id' ? 'Halo! Aku Fox_404. Klik aku buat main game!' : "Hi! I'm Fox_404. Click me to play game!"
  );
  const [dialogVisible, setDialogVisible] = useState(false);
  const [hitVisible, setHitVisible] = useState(false);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

  const pxLinesID = [
    'Ayo main game! Membuka arcade...',
    'Menyala abangkuh! Masuk ke arcade...',
    'Gacor kang! Membuka Fox Runner...',
    'Gas main game! Salto dulu wir...'
  ];
  const pxLinesEN = [
    'Launching Fox Runner arcade...',
    'Bro is ready to play! Opening game...',
    'Entering the arcade zone...',
    'Flip and run! Starting game...'
  ];
  const lineIdxRef = useRef(0);
  const dialogTimerRef = useRef<any>(null);
  const saltoTimerRef = useRef<any>(null);

  // Mouse tracking spotlight on grid and pupil direction
  useEffect(() => {
    const hero = heroRef.current;
    const grid = gridRef.current;
    if (!hero || !grid) return;

    let targetX = 50;
    let targetY = 35;
    let currentX = 50;
    let currentY = 35;
    let isTracking = false;
    let raf = 0;

    const render = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      grid.style.setProperty('--mouse-x', currentX.toFixed(2) + '%');
      grid.style.setProperty('--mouse-y', currentY.toFixed(2) + '%');

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        raf = requestAnimationFrame(render);
      } else {
        isTracking = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        targetX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        targetY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        // Fox eye tracking
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const fdx = (e.clientX - cx) / rect.width;
        const fdy = (e.clientY - cy) / rect.height;
        const eyeDx = Math.max(-1, Math.min(1, Math.round(fdx * 3)));
        const eyeDy = Math.max(-1, Math.min(1, Math.round(fdy * 2)));
        setPupilOffset({ x: eyeDx, y: eyeDy });

        if (!isTracking) {
          isTracking = true;
          raf = requestAnimationFrame(render);
        }
      }
    };

    hero.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      hero.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleFoxClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    // Salto animation
    setSaltoActive(true);
    clearTimeout(saltoTimerRef.current);
    saltoTimerRef.current = setTimeout(() => {
      setSaltoActive(false);
    }, 950);

    // Hit counter
    setHitVisible(false);
    requestAnimationFrame(() => setHitVisible(true));

    // Speech bubble
    const lines = lang === 'en' ? pxLinesEN : pxLinesID;
    lineIdxRef.current = (lineIdxRef.current + 1) % lines.length;

    let text = lines[lineIdxRef.current];
    if (newCount >= 50) {
      text = lang === 'en' ? `Bro hit ${newCount} clicks! Infinite aura gigachad!` : `Gokil wir! ${newCount} klik, jarinya dari vibranium?!`;
    } else if (newCount >= 25) {
      text = lang === 'en' ? `${newCount} clicks?! Certified gaming demon!` : `Busett ${newCount} klik! Gacor parah no counter!`;
    } else if (newCount >= 10) {
      text = lang === 'en' ? `Damn, ${newCount} clicks! Bro is locked in!` : `Udah ${newCount} klik nih, fiks gabut tapi keren abiez!`;
    }

    setDialogText(text);
    setDialogVisible(true);
    clearTimeout(dialogTimerRef.current);
    dialogTimerRef.current = setTimeout(() => setDialogVisible(false), 1700);
  };

  const scrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="hero" ref={heroRef}>
      <div className="hero-bg">
        <div className="hero-grid" id="heroGrid" ref={gridRef} aria-hidden="true">
          <div className="hero-grid-pattern"></div>
          <div className="hero-grid-dots"></div>
          <div className="hero-grid-spotlight"></div>
        </div>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="container hero-inner">
        <div className="hero-copy">
          <div className="eyebrow reveal in-view">{t.hero_eyebrow}</div>
          <h1
            className="reveal in-view"
            id="heroTitle"
            dangerouslySetInnerHTML={{ __html: t.hero_title }}
          />
          <p className="sub reveal in-view" style={{ transitionDelay: '.1s' }}>
            {t.hero_sub}
          </p>

          <div className="hero-actions hero-actions--split reveal in-view" style={{ transitionDelay: '.18s' }}>
            <a
              href="#projects"
              className="btn btn-primary magnetic"
              onClick={(e) => scrollTo('projects', e)}
            >
              {t.hero_btn_projects}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M7 17L17 7M17 7H9M17 7V15" />
              </svg>
            </a>
            <a
              href="#contact"
              className="btn btn-ghost magnetic"
              onClick={(e) => scrollTo('contact', e)}
            >
              {t.hero_btn_contact}
            </a>
          </div>

          <div className="hero-badges px-marquee reveal in-view" style={{ transitionDelay: '.26s' }}>
            <div className="px-marquee-track" id="badgeTrack">
              <span className="badge"><span className="ic"></span>{t.hero_badge_1}</span>
              <span className="badge"><span className="ic"></span>{t.hero_badge_2}</span>
              <span className="badge"><span className="ic"></span>{t.hero_badge_3}</span>
              <span className="badge"><span className="ic"></span>{t.hero_badge_4}</span>
              <span className="badge" aria-hidden="true"><span className="ic"></span>{t.hero_badge_1}</span>
              <span className="badge" aria-hidden="true"><span className="ic"></span>{t.hero_badge_2}</span>
              <span className="badge" aria-hidden="true"><span className="ic"></span>{t.hero_badge_3}</span>
              <span className="badge" aria-hidden="true"><span className="ic"></span>{t.hero_badge_4}</span>
              <span className="badge" aria-hidden="true"><span className="ic"></span>{t.hero_badge_1}</span>
              <span className="badge" aria-hidden="true"><span className="ic"></span>{t.hero_badge_2}</span>
              <span className="badge" aria-hidden="true"><span className="ic"></span>{t.hero_badge_3}</span>
              <span className="badge" aria-hidden="true"><span className="ic"></span>{t.hero_badge_4}</span>
            </div>
          </div>
        </div>

        <div className="hero-visual reveal-scale in-view" style={{ transitionDelay: '.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            className={`fox-stage ${saltoActive ? 'salto-active' : ''}`}
            id="foxStage"
            title="KadalApi Fox 3D — Klik untuk salto & kombo!"
            style={{ width: 'clamp(300px, 32vw, 400px)', height: 'clamp(280px, 30vw, 370px)', position: 'relative' }}
          >
            <HeroVoxelFox3D isSalto={saltoActive} onClick={handleFoxClick} />

            <div className={`px-hit ${hitVisible ? 'show' : ''}`} id="pxHit">
              +{clickCount}
            </div>
            <div className={`px-dialog ${dialogVisible ? 'show' : ''}`} id="pxDialog">
              {dialogText}
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: '400px' }}>
            <button
              type="button"
              className="btn-hero-arcade magnetic"
              onClick={onOpenArcade}
              id="heroMainArcadeBtn"
              title={lang === 'id' ? 'Tekan G atau klik untuk main Fox Runner 3D' : 'Press G or click to play Fox Runner 3D'}
            >
              <svg className="arcade-btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square">
                <rect x="2" y="6" width="20" height="12" />
                <path d="M6 12h4m-2-2v4m10-2h.01m-3-1h.01" />
              </svg>
              <span className="arcade-btn-text">{lang === 'id' ? 'MAIN FOX RUNNER 3D' : 'PLAY FOX RUNNER 3D'}</span>
              <span className="arcade-btn-badge">[G]</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
