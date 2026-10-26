import React, { useState, useEffect } from 'react';
import { Language, Theme, Project } from './types';
import { DEFAULT_PORTFOLIO_PROJECTS } from './constants/translations';
import { Loader } from './components/Loader';
import { CursorAndCanvas } from './components/CursorAndCanvas';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Skills } from './components/Skills';
import { Projects } from './components/Projects';
import { Experience } from './components/Experience';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';
import { FoxRunnerModal } from './components/FoxRunnerModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ScrollCompanionFox3D } from './components/ScrollCompanionFox3D';

const PROJ_STORAGE_KEY = 'portfolio_custom_projects_v1';

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('portfolio_theme') as Theme;
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {}
    return 'light';
  });

  // Language state
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('portfolio_lang') as Language;
      if (saved === 'id' || saved === 'en') return saved;
    } catch (e) {}
    return 'id';
  });

  // Projects state
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const stored = localStorage.getItem(PROJ_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map((p: Project) => {
            if (!p.image || !p.image.trim()) {
              const def = DEFAULT_PORTFOLIO_PROJECTS.find((d) => d.id === p.id);
              if (def) return { ...p, image: def.image };
            }
            return p;
          });
        }
      }
    } catch (e) {}
    return DEFAULT_PORTFOLIO_PROJECTS;
  });

  // Modals state
  const [isArcadeOpen, setIsArcadeOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isManagerUnlocked, setIsManagerUnlocked] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync theme to documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('portfolio_theme', theme);
    } catch (e) {}
  }, [theme]);

  // Sync lang to documentElement
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem('portfolio_lang', lang);
    } catch (e) {}
  }, [lang]);

  // Save projects to localStorage with quota error detection
  const handleUpdateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    try {
      localStorage.setItem(PROJ_STORAGE_KEY, JSON.stringify(newProjects));
    } catch (e: any) {
      console.warn('Gagal menyimpan proyek ke localStorage:', e);
      if (e?.name === 'QuotaExceededError' || e?.code === 22) {
        showToast('Peringatan: Kapasitas penyimpanan browser penuh!');
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Keyboard shortcut listeners: Alt+P, Ctrl+Alt+P, G for arcade
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''));

      if (e.key === 'Escape') {
        if (isAuthOpen) setIsAuthOpen(false);
        if (isManagerOpen) setIsManagerOpen(false);
        if (isArcadeOpen) setIsArcadeOpen(false);
      } else if (
        (e.altKey && (e.key === 'p' || e.key === 'P')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'p' || e.key === 'P')) ||
        (e.ctrlKey && e.altKey && (e.key === 'p' || e.key === 'P'))
      ) {
        e.preventDefault();
        if (isManagerOpen) {
          setIsManagerOpen(false);
        } else if (isAuthOpen) {
          setIsAuthOpen(false);
        } else if (isManagerUnlocked) {
          setIsManagerOpen(true);
        } else {
          setIsAuthOpen(true);
        }
      } else if ((e.key === 'g' || e.key === 'G') && !isInput && !isAuthOpen && !isManagerOpen) {
        e.preventDefault();
        setIsArcadeOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthOpen, isManagerOpen, isArcadeOpen, isManagerUnlocked]);

  // Expose global openFoxGame if external triggers call it
  useEffect(() => {
    (window as any).openFoxGame = () => setIsArcadeOpen(true);
    return () => {
      delete (window as any).openFoxGame;
    };
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <Loader lang={lang} />
      <CursorAndCanvas />

      <Navbar
        lang={lang}
        onLanguageChange={setLang}
        theme={theme}
        onThemeToggle={toggleTheme}
      />

      <main>
        <Hero lang={lang} onOpenArcade={() => setIsArcadeOpen(true)} />
        <About lang={lang} />
        <Skills lang={lang} />
        <Projects
          lang={lang}
          projects={projects}
        />
        <Experience lang={lang} />
        <Contact lang={lang} />
      </main>

      <Footer
        lang={lang}
        onSecretTrigger={() => (isManagerUnlocked ? setIsManagerOpen(true) : setIsAuthOpen(true))}
      />
      <BackToTop />

      {/* Scroll-Following 3D Walking Fox Companion */}
      <ScrollCompanionFox3D
        lang={lang}
        onOpenArcade={() => setIsArcadeOpen(true)}
        isModalOpen={isArcadeOpen || isAuthOpen || isManagerOpen}
      />

      {/* Arcade Game Modal */}
      <FoxRunnerModal
        isOpen={isArcadeOpen}
        onClose={() => setIsArcadeOpen(false)}
        lang={lang}
      />

      {/* Project Manager & PIN Modal */}
      <ProjectManagerModal
        isAuthOpen={isAuthOpen}
        onCloseAuth={() => setIsAuthOpen(false)}
        isManagerOpen={isManagerOpen}
        onCloseManager={() => setIsManagerOpen(false)}
        projects={projects}
        onUpdateProjects={handleUpdateProjects}
        onUnlock={() => {
          setIsManagerUnlocked(true);
          setIsManagerOpen(true);
        }}
        showToast={showToast}
      />

      {/* Toast Notification */}
      <div className={`proj-toast ${toastMessage ? 'show' : ''}`} id="projToast">
        {toastMessage}
      </div>
    </>
  );
};
