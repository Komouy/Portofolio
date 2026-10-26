import React, { useState, useEffect } from 'react';

export const BackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [strokeOffset, setStrokeOffset] = useState(113.097);
  const circumference = 2 * Math.PI * 18; // ~113.097

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? y / docHeight : 0;
      setStrokeOffset(circumference - scrollPercent * circumference);
      setVisible(y > 280);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [circumference]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      className={`back-to-top ${visible ? 'visible' : ''}`}
      id="backToTop"
      aria-label="Back to top"
      title="Kembali ke atas"
      onClick={scrollToTop}
    >
      <svg className="progress-ring" width="44" height="44" viewBox="0 0 44 44">
        <circle className="progress-ring-bg" cx="22" cy="22" r="18" fill="none" stroke="rgba(21,19,15,0.08)" strokeWidth="3" />
        <circle
          className="progress-ring-circle"
          id="scrollProgressCircle"
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="var(--orange)"
          strokeWidth="3"
          strokeDasharray="113.097"
          strokeDashoffset={strokeOffset}
          strokeLinecap="round"
        />
      </svg>
      <svg className="arrow-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
};
