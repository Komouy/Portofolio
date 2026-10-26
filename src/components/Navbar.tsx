import React, { useState, useEffect } from 'react';
import { Language, Theme } from '../types';
import { translations } from '../constants/translations';

interface NavbarProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  theme: Theme;
  onThemeToggle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onLanguageChange,
  theme,
  onThemeToggle
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  const t = translations[lang];

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 20);

      const sections = ['home', 'about', 'skills', 'projects', 'experience', 'contact'];
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop - 140;
          const bottom = top + el.offsetHeight;
          if (y >= top && y < bottom) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="navbar-wrap">
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} id="navbar">
        <div className="nav-logo" onClick={(e) => scrollTo('home', e)} style={{ cursor: 'pointer' }}>
          <span className="dot"></span> KadalApi<span className="px-blink">_</span>
        </div>

        <ul className={`nav-links ${mobileMenuOpen ? 'open' : ''}`} id="navLinks">
          <li>
            <a
              href="#home"
              className={activeSection === 'home' ? 'active' : ''}
              onClick={(e) => scrollTo('home', e)}
            >
              {t.nav_home}
            </a>
          </li>
          <li>
            <a
              href="#about"
              className={activeSection === 'about' ? 'active' : ''}
              onClick={(e) => scrollTo('about', e)}
            >
              {t.nav_about}
            </a>
          </li>
          <li>
            <a
              href="#skills"
              className={activeSection === 'skills' ? 'active' : ''}
              onClick={(e) => scrollTo('skills', e)}
            >
              {t.nav_skills}
            </a>
          </li>
          <li>
            <a
              href="#projects"
              className={activeSection === 'projects' ? 'active' : ''}
              onClick={(e) => scrollTo('projects', e)}
            >
              {t.nav_projects}
            </a>
          </li>
          <li>
            <a
              href="#experience"
              className={activeSection === 'experience' ? 'active' : ''}
              onClick={(e) => scrollTo('experience', e)}
            >
              {t.nav_experience}
            </a>
          </li>
          <li>
            <a
              href="#contact"
              className={activeSection === 'contact' ? 'active' : ''}
              onClick={(e) => scrollTo('contact', e)}
            >
              {t.nav_contact}
            </a>
          </li>
        </ul>

        {/* Language switcher */}
        <div
          className="lang-switch"
          id="langSwitch"
          data-lang={lang}
          aria-label="Toggle language ID or EN"
          title="Ubah Bahasa / Switch Language"
        >
          <div className="lang-pill" id="langPill"></div>
          <button
            type="button"
            className={`lang-btn ${lang === 'id' ? 'active' : ''}`}
            onClick={() => onLanguageChange('id')}
          >
            ID
          </button>
          <button
            type="button"
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => onLanguageChange('en')}
          >
            EN
          </button>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          className="theme-toggle"
          id="themeToggle"
          onClick={onThemeToggle}
          aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
          title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
        >
          <svg className="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg className="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          </svg>
        </button>

        <a
          href="#contact"
          className="nav-cta magnetic"
          onClick={(e) => scrollTo('contact', e)}
        >
          {t.nav_cta}
        </a>

        <button
          type="button"
          className={`nav-toggle ${mobileMenuOpen ? 'open' : ''}`}
          id="navToggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Buka menu"
        >
          <span></span>
        </button>
      </nav>
    </div>
  );
};
