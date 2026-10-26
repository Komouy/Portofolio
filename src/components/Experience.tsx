import React from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface ExperienceProps {
  lang: Language;
}

export const Experience: React.FC<ExperienceProps> = ({ lang }) => {
  const t = translations[lang];

  return (
    <section id="experience" style={{ background: 'var(--gray-50)' }}>
      <div className="container">
        <div className="section-head reveal in-view">
          <div className="eyebrow">{t.exp_eyebrow}</div>
          <h2>{t.exp_title}</h2>
          <p>{t.exp_sub}</p>
        </div>

        <div className="timeline">
          <div className="t-item reveal in-view">
            <div className="t-dot"></div>
            <div className="t-period">{t.exp1_period}</div>
            <h3>{t.exp1_title}</h3>
            <div className="t-role">{t.exp1_role}</div>
            <p>{t.exp1_desc}</p>
          </div>

          <div className="t-item reveal in-view" style={{ transitionDelay: '.1s' }}>
            <div className="t-dot"></div>
            <div className="t-period">{t.exp2_period}</div>
            <h3>{t.exp2_title}</h3>
            <div className="t-role">{t.exp2_role}</div>
            <p>{t.exp2_desc}</p>
          </div>

          <div className="t-item reveal in-view" style={{ transitionDelay: '.2s' }}>
            <div className="t-dot"></div>
            <div className="t-period">{t.exp3_period}</div>
            <h3>{t.exp3_title}</h3>
            <div className="t-role">{t.exp3_role}</div>
            <p>{t.exp3_desc}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
