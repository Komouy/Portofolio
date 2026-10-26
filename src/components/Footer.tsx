import React, { useRef } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';

interface FooterProps {
  lang: Language;
  onSecretTrigger: () => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, onSecretTrigger }) => {
  const t = translations[lang];
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<any>(null);

  const handleFooterClick = () => {
    clickCountRef.current++;
    clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 3000);

    if (clickCountRef.current >= 5) {
      clickCountRef.current = 0;
      onSecretTrigger();
    }
  };

  return (
    <footer>
      <div className="container footer-inner">
        <p
          id="footerSecretTrigger"
          onClick={handleFooterClick}
        >
          {t.footer_rights}
        </p>
      </div>
    </footer>
  );
};
