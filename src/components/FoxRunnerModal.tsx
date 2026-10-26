import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Language } from '../types';
import { translations } from '../constants/translations';
import { FoxRunner3DCanvas } from './FoxRunner3DCanvas';

interface FoxRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  score: number;
  level: number;
  updatedAt: number;
}

function getOrCreatePlayerId(): string {
  try {
    let pid = localStorage.getItem('kadalapi_fox_player_id');
    if (!pid) {
      pid = 'usr_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('kadalapi_fox_player_id', pid);
    }
    return pid;
  } catch (e) {
    return 'usr_guest';
  }
}

function getOrCreateCustomTag(): string {
  try {
    let tag = localStorage.getItem('kadalapi_fox_custom_tag');
    if (!tag) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      tag = String(randNum);
      localStorage.setItem('kadalapi_fox_custom_tag', tag);
    }
    return tag;
  } catch (e) {
    return '4040';
  }
}

export const FoxRunnerModal: React.FC<FoxRunnerModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];

  const [playerId] = useState<string>(() => getOrCreatePlayerId());
  const [customTag, setCustomTag] = useState<string>(() => getOrCreateCustomTag());
  const [tagInput, setTagInput] = useState<string>(() => getOrCreateCustomTag());
  const [isEditingTag, setIsEditingTag] = useState<boolean>(false);

  const playerName = `FoxRunner(${customTag || 'Guest'})`;

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kadalapi_fox_sound');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const [crtActive, setCrtActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLb, setIsLoadingLb] = useState<boolean>(false);

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('kadalapi_fox_highscore') || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  });
  const [level, setLevel] = useState<number>(1);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  const latestStatsRef = useRef({ score, highScore, level, playerName, playerId });
  latestStatsRef.current = { score, highScore, level, playerName, playerId };

  // Merge server leaderboard (real players only) with local player entry
  const mergeWithLocalPlayer = useCallback(
    (list: LeaderboardEntry[], overrideScore?: number, overrideName?: string) => {
      const st = latestStatsRef.current;
      const best = Math.max(st.score, st.highScore, overrideScore || 0);
      const nameToUse = overrideName || st.playerName;
      const copy = list.filter((item) => item && typeof item.playerId === 'string' && !item.playerId.startsWith('seed-'));
      const idx = copy.findIndex((item) => item.playerId === st.playerId);

      if (idx >= 0) {
        copy[idx] = {
          ...copy[idx],
          playerName: nameToUse,
          score: Math.max(copy[idx].score, best),
          level: Math.max(copy[idx].level, st.level)
        };
      } else {
        copy.push({
          playerId: st.playerId,
          playerName: nameToUse,
          score: best,
          level: st.level,
          updatedAt: Date.now()
        });
      }

      copy.sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt);
      return copy.slice(0, 30);
    },
    []
  );

  const fetchLeaderboard = useCallback(async () => {
    setIsLoadingLb(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.entries)) {
          setEntries(mergeWithLocalPlayer(data.entries));
          setIsLoadingLb(false);
          return;
        }
      }
    } catch (e) {}
    setEntries((prev) => mergeWithLocalPlayer(prev));
    setIsLoadingLb(false);
  }, [mergeWithLocalPlayer]);

  const submitScoreToLeaderboard = useCallback(
    async (customScore?: number, customName?: string) => {
      const st = latestStatsRef.current;
      const bestScore = Math.max(st.score, st.highScore, customScore || 0);
      const finalName = customName || st.playerName;

      // Immediately update local state
      setEntries((prev) => mergeWithLocalPlayer(prev, bestScore, finalName));

      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: st.playerId,
            playerName: finalName,
            score: bestScore,
            level: st.level
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.entries)) {
            setEntries(mergeWithLocalPlayer(data.entries, bestScore, finalName));
          }
        }
      } catch (e) {}
    },
    [mergeWithLocalPlayer]
  );

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
      submitScoreToLeaderboard(highScore);
    } else {
      setIsLeaderboardOpen(false);
      setIsPaused(false);
    }
  }, [isOpen, fetchLeaderboard, highScore, submitScoreToLeaderboard]);

  const handleSaveCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tagInput.replace(/[()]/g, '').trim().slice(0, 16) || '4040';
    setCustomTag(cleaned);
    setTagInput(cleaned);
    setIsEditingTag(false);
    try {
      localStorage.setItem('kadalapi_fox_custom_tag', cleaned);
    } catch (err) {}
    submitScoreToLeaderboard(undefined, `FoxRunner(${cleaned})`);
  };

  if (!isOpen) return null;

  const handleMobileJump = () => {
    if (isLeaderboardOpen) return;
    if (typeof (window as any).__foxRunnerJump === 'function') {
      (window as any).__foxRunnerJump();
      if (isGameOver) setIsGameOver(false);
    }
  };

  const myRankIndex = entries.findIndex((item) => item.playerId === playerId);

  return (
    <div className="game-modal active" id="gameModal" role="dialog" aria-modal="true" aria-labelledby="gameModalTitle">
      <div className="game-modal-backdrop" id="gameModalBackdrop" onClick={onClose}></div>
      <div className="game-cabinet">
        {/* Header */}
        <div className="game-cabinet-header">
          <div className="game-title-badge">
            <svg className="arcade-head-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2"></rect>
              <path d="M6 12h4m-2-2v4m10-2h.01m-3-1h.01"></path>
            </svg>
            <span id="gameModalTitle">Fox Runner 3D: Pixel Dash</span>
          </div>

          <div className="game-cabinet-tools">
            {/* LEADERBOARD BUTTON (Immediately to the left of CRT button) */}
            <button
              type="button"
              className="game-tool-btn"
              id="gameLeaderboardToggle"
              title="Leaderboard Peringkat Pemain"
              aria-pressed={isLeaderboardOpen}
              onClick={() => {
                const next = !isLeaderboardOpen;
                setIsLeaderboardOpen(next);
                if (next) {
                  submitScoreToLeaderboard();
                  fetchLeaderboard();
                }
              }}
              style={{
                width: 'auto',
                padding: '0 10px',
                gap: '5px',
                background: isLeaderboardOpen ? 'var(--orange)' : undefined,
                color: isLeaderboardOpen ? '#ffffff' : undefined
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
              <span>RANK</span>
            </button>

            <button
              type="button"
              className="game-tool-btn"
              id="gameCrtToggle"
              title="Toggle CRT Filter"
              aria-pressed={crtActive}
              onClick={() => setCrtActive(!crtActive)}
            >
              <span>CRT</span>
            </button>
            <button
              type="button"
              className={`game-tool-btn ${!soundEnabled ? 'muted' : ''}`}
              id="gameSoundToggle"
              title="Mute/Unmute Suara"
              aria-pressed={soundEnabled}
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                try {
                  localStorage.setItem('kadalapi_fox_sound', next.toString());
                } catch (e) {}
              }}
            >
              {soundEnabled ? (
                <svg className="sound-on-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              ) : (
                <svg className="sound-off-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              )}
            </button>
            <button
              type="button"
              className="game-tool-btn"
              id="gamePauseToggle"
              title="Jeda Game"
              aria-pressed={isPaused}
              onClick={() => setIsPaused(!isPaused)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            </button>
            <button
              type="button"
              className="game-tool-btn game-close-btn"
              id="gameModalClose"
              title="Tutup Game"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* HUD Bar with Player Identity */}
        <div className="game-hud" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div
            className="hud-item"
            style={{ cursor: 'pointer' }}
            title={lang === 'id' ? 'Klik untuk ubah ID atau lihat Leaderboard' : 'Click to edit ID or view Leaderboard'}
            onClick={() => setIsLeaderboardOpen(true)}
          >
            <span className="hud-label">ID:</span>
            <span className="hud-val" style={{ color: 'var(--orange)', fontSize: '11px' }}>
              {playerName}
            </span>
          </div>
          <div className="hud-item">
            <span className="hud-label">{t.game_score}</span>
            <span className="hud-val">{score.toString().padStart(5, '0')}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">{t.game_best}</span>
            <span className="hud-val">{highScore.toString().padStart(5, '0')}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">{t.game_level}</span>
            <span className="hud-val hud-lvl">LVL {level}</span>
          </div>
        </div>

        {/* 3D Three.js Screen, CRT Overlay, & Leaderboard Modal Overlay */}
        <div className={`arcade-screen-wrap ${crtActive ? 'crt-active' : ''}`} style={{ position: 'relative' }}>
          <div className="crt-overlay"></div>
          <FoxRunner3DCanvas
            onScoreUpdate={setScore}
            onHighScoreUpdate={(newHigh) => {
              setHighScore(newHigh);
              submitScoreToLeaderboard(newHigh);
            }}
            onLevelUpdate={setLevel}
            soundEnabled={soundEnabled}
            crtActive={crtActive}
            isPaused={isPaused || isLeaderboardOpen}
            onGameStart={() => setIsGameOver(false)}
            onGameOver={() => {
              setIsGameOver(true);
              submitScoreToLeaderboard();
            }}
          />

          {/* LEADERBOARD PANEL OVERLAY */}
          {isLeaderboardOpen && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#0f172a',
                zIndex: 25,
                display: 'flex',
                flexDirection: 'column',
                padding: '14px 16px',
                color: '#ffffff',
                fontFamily: 'var(--px-font)'
              }}
            >
              {/* Leaderboard Top Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '2px solid var(--orange)',
                  paddingBottom: '8px',
                  marginBottom: '10px',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="square">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                  <span style={{ fontSize: '13px', color: 'var(--orange)', letterSpacing: '0.05em' }}>
                    LEADERBOARD FOX RUNNER 3D
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLeaderboardOpen(false)}
                  style={{
                    background: 'var(--orange)',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    boxShadow: '2px 2px 0 #000000',
                    padding: '4px 10px',
                    fontFamily: 'var(--px-font)',
                    fontSize: '9px',
                    cursor: 'pointer',
                    borderRadius: 0
                  }}
                >
                  {lang === 'id' ? 'KEMBALI KE GAME' : 'BACK TO GAME'}
                </button>
              </div>

              {/* Player Identity Bar & Free Custom ID Editor */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#1e293b',
                  border: '2px solid #334155',
                  padding: '8px 10px',
                  marginBottom: '10px',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9.5px', flexWrap: 'wrap' }}>
                  <span style={{ color: '#94a3b8' }}>{lang === 'id' ? 'IDENTITAS:' : 'IDENTITY:'}</span>
                  {!isEditingTag ? (
                    <>
                      <span style={{ color: '#fde047' }}>{playerName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTagInput(customTag);
                          setIsEditingTag(true);
                        }}
                        style={{
                          background: '#0f172a',
                          color: '#38bdf8',
                          border: '1px solid #38bdf8',
                          padding: '2px 6px',
                          fontFamily: 'var(--px-font)',
                          fontSize: '8px',
                          cursor: 'pointer',
                          borderRadius: 0
                        }}
                      >
                        {lang === 'id' ? 'UBAH ID' : 'EDIT ID'}
                      </button>
                    </>
                  ) : (
                    <form onSubmit={handleSaveCustomTag} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#fde047' }}>FoxRunner(</span>
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        maxLength={16}
                        placeholder="ID Bebas"
                        autoFocus
                        style={{
                          background: '#0f172a',
                          color: '#ffffff',
                          border: '1px solid var(--orange)',
                          padding: '2px 6px',
                          fontFamily: 'var(--px-font)',
                          fontSize: '9px',
                          width: '96px',
                          outline: 'none',
                          borderRadius: 0
                        }}
                      />
                      <span style={{ color: '#fde047' }}>)</span>
                      <button
                        type="submit"
                        style={{
                          background: 'var(--orange)',
                          color: '#ffffff',
                          border: '1px solid #ffffff',
                          padding: '2px 6px',
                          fontFamily: 'var(--px-font)',
                          fontSize: '8px',
                          cursor: 'pointer',
                          borderRadius: 0
                        }}
                      >
                        OK
                      </button>
                    </form>
                  )}
                </div>

                <div style={{ fontSize: '9px', color: '#cbd5e1' }}>
                  {myRankIndex >= 0
                    ? `${lang === 'id' ? 'PERINGKAT' : 'RANK'} #${myRankIndex + 1} • ${Math.max(score, highScore)} PTS`
                    : `${lang === 'id' ? 'SKOR TERBAIK' : 'BEST'}: ${Math.max(score, highScore)} PTS`}
                </div>
              </div>

              {/* Leaderboard Table List */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  paddingRight: '4px'
                }}
              >
                {isLoadingLb && entries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', fontSize: '10px', color: '#94a3b8' }}>
                    MEMUAT DATA LEADERBOARD...
                  </div>
                ) : (
                  entries.map((entry, idx) => {
                    const isMe = entry.playerId === playerId;
                    const rankBadgeBg =
                      idx === 0 ? '#facc15' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#d97706' : '#334155';
                    const rankBadgeColor = idx <= 1 ? '#0f172a' : '#ffffff';

                    return (
                      <div
                        key={entry.playerId + '-' + idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          background: isMe ? 'rgba(249, 115, 22, 0.22)' : 'rgba(30, 41, 59, 0.75)',
                          border: isMe ? '2px solid var(--orange)' : '1px solid #334155',
                          fontSize: '9.5px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '26px',
                              padding: '2px 4px',
                              background: rankBadgeBg,
                              color: rankBadgeColor,
                              fontSize: '8.5px',
                              fontWeight: 700
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <span
                            style={{
                              color: isMe ? '#fde047' : '#f8fafc',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {entry.playerName}
                          </span>
                          {isMe && (
                            <span
                              style={{
                                background: 'var(--orange)',
                                color: '#ffffff',
                                padding: '1px 5px',
                                fontSize: '7.5px'
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <span style={{ color: '#94a3b8', fontSize: '8.5px' }}>LVL {entry.level}</span>
                          <span style={{ color: '#38bdf8', minWidth: '58px', textAlign: 'right' }}>
                            {entry.score.toString().padStart(5, '0')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer controls & Keyboard/Touch hints */}
        <div className="game-cabinet-footer" style={{ flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div className="game-keys-hint" style={{ fontSize: '10px', justifyContent: 'center' }}>
            <span className="key-badge">A / ←</span>
            <span className="key-badge">D / →</span>
            <span className="hint-text">{lang === 'id' ? 'Jalur' : 'Lanes'}</span>
            <span className="key-sep">•</span>
            <span className="key-badge">SPACE / ↑</span>
            <span className="hint-text">{lang === 'id' ? 'Lompat / Salto' : 'Jump / Somersault'}</span>
            <span className="key-sep">•</span>
            <span className="key-badge">P</span>
            <span className="hint-text">{t.game_pause}</span>
          </div>

          <div className="game-mobile-controls" style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%' }}>
            <button
              type="button"
              className="game-jump-pad"
              style={{ flex: 1, minHeight: '44px', padding: '8px 0', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: 0, touchAction: 'manipulation' }}
              onPointerDown={(e) => {
                e.preventDefault();
                if (typeof (window as any).__foxRunnerMoveLeft === 'function') {
                  (window as any).__foxRunnerMoveLeft();
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{lang === 'id' ? 'KIRI' : 'LEFT'}</span>
            </button>
            <button
              type="button"
              className="game-jump-pad"
              style={{ flex: 1.4, minHeight: '44px', padding: '8px 0', fontSize: '12px', background: 'var(--orange)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: 0, touchAction: 'manipulation' }}
              onPointerDown={(e) => {
                e.preventDefault();
                handleMobileJump();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <polyline points="18 15 12 9 6 15" />
              </svg>
              <span>{lang === 'id' ? 'LOMPAT' : 'JUMP'}</span>
            </button>
            <button
              type="button"
              className="game-jump-pad"
              style={{ flex: 1, minHeight: '44px', padding: '8px 0', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: 0, touchAction: 'manipulation' }}
              onPointerDown={(e) => {
                e.preventDefault();
                if (typeof (window as any).__foxRunnerMoveRight === 'function') {
                  (window as any).__foxRunnerMoveRight();
                }
              }}
            >
              <span>{lang === 'id' ? 'KANAN' : 'RIGHT'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
