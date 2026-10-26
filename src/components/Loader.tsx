import React, { useState, useEffect } from 'react';
import { Language } from '../types';

interface LoaderProps {
  lang: Language;
  onFinish?: () => void;
}

export const Loader: React.FC<LoaderProps> = ({ lang, onFinish }) => {
  const [percent, setPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const t0 = performance.now();
    const MIN_MS = 2200;
    let animId: number;

    const tick = (now: number) => {
      const el = now - t0;
      const p = Math.min(100, Math.round(100 * (1 - Math.pow(1 - Math.min(1, el / MIN_MS), 2))));
      setPercent(p);

      if (p >= 100 && el >= MIN_MS) {
        setReady(true);
        // Auto-dismiss smoothly after 600ms if user doesn't click
        setTimeout(() => {
          dismiss();
        }, 700);
        return;
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      document.body.style.overflow = '';
    };
  }, []);

  const dismiss = () => {
    if (!ready || hidden) return;
    setHidden(true);
    document.body.style.overflow = '';
    setTimeout(() => {
      setRemoved(true);
      if (onFinish) onFinish();
    }, 450);
  };

  useEffect(() => {
    if (!ready) return;
    const handleKey = () => dismiss();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [ready]);

  if (removed) return null;

  return (
    <div
      className={`px-loader ${hidden ? 'hide' : ''}`}
      onClick={dismiss}
      style={{ cursor: ready ? 'pointer' : 'default' }}
      aria-hidden="true"
    >
      <div className="px-loader-box">
        <svg
          className="px-loader-fox"
          viewBox="0 0 48 40"
          shapeRendering="crispEdges"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <g>
            <rect x="34" y="24" width="8" height="12" fill="#15130F" />
            <rect x="35" y="25" width="6" height="10" fill="#EA6A0C" />
            <rect x="35" y="19" width="6" height="6" fill="#15130F" />
            <rect x="36" y="20" width="4" height="4" fill="#FFF8EF" />
            <rect x="10" y="2" width="8" height="9" fill="#15130F" />
            <rect x="11" y="3" width="6" height="7" fill="#EA6A0C" />
            <rect x="30" y="2" width="8" height="9" fill="#15130F" />
            <rect x="31" y="3" width="6" height="7" fill="#EA6A0C" />
            <rect x="9" y="8" width="30" height="17" fill="#15130F" />
            <rect x="10" y="9" width="28" height="15" fill="#F97316" />
            <rect x="10" y="9" width="28" height="2" fill="#FDBA74" />
            <rect x="16" y="15" width="4" height="6" fill="#15130F" />
            <rect x="28" y="15" width="4" height="6" fill="#15130F" />
            <rect x="17" y="16" width="2" height="2" fill="#fff" />
            <rect x="29" y="16" width="2" height="2" fill="#fff" />
            <rect x="22" y="22" width="4" height="3" fill="#15130F" />
            <rect x="13" y="25" width="21" height="11" fill="#15130F" />
            <rect x="14" y="26" width="19" height="9" fill="#F97316" />
            <rect x="19" y="27" width="9" height="8" fill="#15130F" />
            <rect x="20" y="28" width="7" height="6" fill="#FFF8EF" />
          </g>
        </svg>
        <div className="px-loader-title">
          KadalApi<span className="px-blink">_</span>
        </div>
        <div className="px-loader-bar">
          <span style={{ transform: `scaleX(${percent / 100})`, display: 'block', height: '100%' }}></span>
        </div>
        <div className="px-loader-text">LOADING... {percent}%</div>
        <div className="px-loader-hint" style={ready ? { animation: 'blinkDot 0.8s steps(2) infinite' } : {}}>
          {ready
            ? lang === 'id'
              ? 'KLIK DIMANA SAJA UNTUK MELANJUTKAN'
              : 'CLICK ANYWHERE TO CONTINUE'
            : 'PRESS START'}
        </div>
      </div>
    </div>
  );
};
