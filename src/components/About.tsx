import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface AboutProps {
  lang: Language;
}

export const About: React.FC<AboutProps> = ({ lang }) => {
  const t = translations[lang];
  const sectionRef = useRef<HTMLElement | null>(null);

  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  const [count3, setCount3] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);

            const animateValue = (target: number, setter: (val: number) => void, dur: number) => {
              const start = performance.now();
              const step = (now: number) => {
                const p = Math.min(1, (now - start) / dur);
                const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                setter(Math.round(target * eased));
                if (p < 1) requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            };

            animateValue(15, setCount1, 900);
            animateValue(3, setCount2, 900);
            animateValue(2, setCount3, 900);
          }
        });
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <section id="about" ref={sectionRef}>
      <div className="container about-grid">
        <div className="about-copy reveal in-view">
          <div className="eyebrow">{t.about_eyebrow}</div>
          <h2 style={{ fontSize: 'clamp(28px,3.4vw,36px)', fontWeight: 700, marginBottom: '18px' }}>
            {t.about_title}
          </h2>
          <p>{t.about_p1}</p>
          <p>{t.about_p2}</p>
          <p>{t.about_p3}</p>
        </div>

        <div className="stat-grid">
          <div className="stat-card reveal in-view" style={{ transitionDelay: '.05s' }}>
            <div className="card-shine"></div>
            <div className="stat-num">
              <span>{count1}</span>+
            </div>
            <div className="stat-label">{t.stat_1_label}</div>
          </div>

          <div className="stat-card reveal in-view" style={{ transitionDelay: '.15s' }}>
            <div className="card-shine"></div>
            <div className="stat-num">
              <span>{count2}</span>+
            </div>
            <div className="stat-label">{t.stat_2_label}</div>
          </div>

          <div className="stat-card reveal in-view" style={{ transitionDelay: '.25s' }}>
            <div className="card-shine"></div>
            <div className="stat-num">
              <span>{count3}</span>+
            </div>
            <div className="stat-label">{t.stat_3_label}</div>
          </div>
        </div>
      </div>
    </section>
  );
};
