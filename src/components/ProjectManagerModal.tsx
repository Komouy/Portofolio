import React, { useState, useEffect } from 'react';
import { Project, GitHubRepo } from '../types';
import { DEFAULT_PORTFOLIO_PROJECTS } from '../constants/translations';

interface ProjectManagerModalProps {
  isAuthOpen: boolean;
  onCloseAuth: () => void;
  isManagerOpen: boolean;
  onCloseManager: () => void;
  projects: Project[];
  onUpdateProjects: (updated: Project[]) => void;
  showToast: (msg: string) => void;
}

const DEFAULT_PIN_HASH = '158a323a7ba44870f23d96f1516dd70aa48e9a72db4ebb026b0a89e212a208ab'; // SHA-256 for '2026'

async function hashPin(pin: string): Promise<string> {
  if (window.crypto && window.crypto.subtle) {
    try {
      const buf = new TextEncoder().encode(pin);
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {}
  }
  return 'fallback_' + pin;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isAuthOpen,
  onCloseAuth,
  isManagerOpen,
  onCloseManager,
  projects,
  onUpdateProjects,
  showToast
}) => {
  // Auth state
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Manager state
  const [activeTab, setActiveTab] = useState<'active' | 'github' | 'create'>('active');
  const [editingProjId, setEditingProjId] = useState<string | null>(null);

  // GitHub import state
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState('');

  // New manual project state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newGithub, setNewGithub] = useState('');
  const [newDemo, setNewDemo] = useState('');
  const [newImage, setNewImage] = useState('');
  const [newTags, setNewTags] = useState<string[]>(['React', 'JavaScript']);
  const [newTagInput, setNewTagInput] = useState('');

  // Edit project state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editDemo, setEditDemo] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // Image compression helper
  const compressImage = (file: File, callback: (dataUrl: string) => void) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          callback(compressed);
        } else {
          callback(raw);
        }
      };
      img.onerror = () => callback(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  };

  // Auth handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pin = pinInput.trim();
    if (!pin) return;

    const hashed = await hashPin(pin);
    const storedHash = localStorage.getItem('portfolio_admin_pin_hash') || DEFAULT_PIN_HASH;

    if (hashed === storedHash) {
      setPinInput('');
      setAuthError('');
      onCloseAuth();
      showToast('Akses pemilik terverifikasi.');
      // Open manager
      // Trigger parent callback via props
      const openBtn = document.getElementById('btnOpenProjManager');
      if (openBtn) openBtn.click();
    } else {
      setAuthError('AKSES DITOLAK: PIN SALAH.');
      setPinInput('');
    }
  };

  // Fetch GitHub repos
  const fetchGitHub = async () => {
    setGhLoading(true);
    setGhError('');
    try {
      const res = await fetch('https://api.github.com/users/Komouy/repos?sort=pushed&per_page=40');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setGithubRepos(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setGhError('Gagal menghubungi GitHub API: ' + (err?.message || 'Error'));
    } finally {
      setGhLoading(false);
    }
  };

  useEffect(() => {
    if (isManagerOpen && activeTab === 'github' && !githubRepos.length) {
      fetchGitHub();
    }
  }, [isManagerOpen, activeTab]);

  const handleStartEdit = (proj: Project) => {
    setEditingProjId(proj.id);
    setEditTitle(proj.title);
    setEditDesc(proj.description);
    setEditGithub(proj.githubUrl || '');
    setEditDemo(proj.demoUrl || '');
    setEditImage(proj.image || '');
    setEditTags(Array.isArray(proj.tags) ? [...proj.tags] : []);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjId) return;

    const updated = projects.map((p) => {
      if (p.id === editingProjId) {
        return {
          ...p,
          title: editTitle.trim(),
          description: editDesc.trim(),
          githubUrl: editGithub.trim(),
          demoUrl: editDemo.trim(),
          image: editImage.trim(),
          tags: editTags.length ? editTags : ['Project']
        };
      }
      return p;
    });

    onUpdateProjects(updated);
    setEditingProjId(null);
    showToast(`Perubahan proyek "${editTitle}" berhasil disimpan!`);
  };

  const handleDelete = (proj: Project) => {
    if (confirm(`Hapus proyek "${proj.title}" dari portofolio?`)) {
      const updated = projects.filter((p) => p.id !== proj.id);
      onUpdateProjects(updated);
      showToast(`Proyek "${proj.title}" telah dihapus.`);
    }
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const newProj: Project = {
      id: 'custom_' + Date.now(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      githubUrl: newGithub.trim(),
      demoUrl: newDemo.trim(),
      image: newImage.trim(),
      tags: newTags.length ? newTags : ['Code', 'Project'],
      source: 'custom'
    };

    onUpdateProjects([...projects, newProj]);
    showToast(`Proyek "${newTitle}" berhasil ditambahkan!`);
    // Reset form
    setNewTitle('');
    setNewDesc('');
    setNewGithub('');
    setNewDemo('');
    setNewImage('');
    setNewTags(['React', 'JavaScript']);
    setActiveTab('active');
  };

  const handleAddFromGitHub = (repo: GitHubRepo) => {
    const formattedTitle = repo.name.replace(/[-_]/g, ' ');
    const descText = repo.description || `Proyek repositori open-source ${repo.name} oleh Komouy.`;
    const langText = repo.language || 'Code';

    const newProj: Project = {
      id: 'gh_' + repo.name,
      repoName: repo.name,
      title: formattedTitle,
      description: descText,
      tags: [langText, ...(repo.topics || []).slice(0, 3)].filter(Boolean),
      githubUrl: repo.html_url,
      demoUrl: repo.homepage || '',
      image: `https://opengraph.githubassets.com/1/Komouy/${repo.name}`,
      source: 'github'
    };

    onUpdateProjects([...projects, newProj]);
    showToast(`Proyek "${formattedTitle}" berhasil dimasukkan ke portofolio!`);
  };

  const handleChangePin = async () => {
    const currentPin = prompt('Masukkan PIN lama:');
    if (!currentPin) return;
    const hashedCurrent = await hashPin(currentPin.trim());
    const storedHash = localStorage.getItem('portfolio_admin_pin_hash') || DEFAULT_PIN_HASH;

    if (hashedCurrent !== storedHash) {
      alert('PIN lama salah!');
      return;
    }

    const newPin = prompt('Masukkan PIN baru (minimal 4 karakter):');
    if (!newPin || newPin.trim().length < 4) {
      alert('PIN baru tidak boleh kosong dan minimal 4 karakter!');
      return;
    }

    const confirmPin = prompt('Ketik ulang PIN baru untuk konfirmasi:');
    if (!confirmPin || newPin.trim() !== confirmPin.trim()) {
      alert('Konfirmasi PIN tidak cocok!');
      return;
    }

    const hashedNew = await hashPin(newPin.trim());
    localStorage.setItem('portfolio_admin_pin_hash', hashedNew);
    showToast('PIN Admin berhasil diubah!');
  };

  const handleResetToDefault = () => {
    if (confirm('Kembalikan daftar proyek ke 5 proyek bawaan?')) {
      onUpdateProjects(DEFAULT_PORTFOLIO_PROJECTS);
      showToast('Daftar proyek berhasil dikembalikan ke bawaan!');
    }
  };

  const handleExportJson = () => {
    const json = JSON.stringify(projects, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(json)
        .then(() => showToast('Data JSON proyek berhasil disalin ke clipboard!'))
        .catch(() => prompt('Salin teks JSON berikut:', json));
    } else {
      prompt('Salin teks JSON berikut:', json);
    }
  };

  const quickTagChoices = ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Python', 'Laravel', 'Tailwind', 'Canvas', 'AI / ML'];

  return (
    <>
      {/* 1. AUTH MODAL */}
      {isAuthOpen && (
        <div className="proj-manager-modal active" id="projAuthModal" role="dialog" aria-modal="true">
          <div className="proj-manager-backdrop" onClick={onCloseAuth}></div>
          <div className="proj-manager-box" style={{ maxWidth: '440px' }}>
            <div className="proj-manager-head">
              <div className="proj-manager-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span className="proj-title-long">SECURITY_GATE.EXE // VERIFIKASI</span>
                <span className="proj-title-short">SECURITY_GATE.EXE</span>
              </div>
              <button type="button" className="proj-manager-close" onClick={onCloseAuth}>
                [ X ]
              </button>
            </div>
            <div className="proj-manager-body" style={{ padding: '22px 20px' }}>
              <p style={{ fontFamily: 'var(--px-font)', fontSize: '10px', color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: '12px' }}>
                Akses panel ini terbatas untuk pemilik portofolio. Silakan masukkan PIN Admin (bawaan: 2026):
              </p>
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="proj-form-field">
                  <label>PIN ADMIN</label>
                  <input
                    type="password"
                    maxLength={20}
                    placeholder="Ketik PIN..."
                    required
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    autoFocus
                    style={{ fontSize: '18px', letterSpacing: '4px', textAlign: 'center' }}
                  />
                </div>
                {authError && (
                  <div style={{ fontFamily: 'var(--px-font)', fontSize: '9px', color: '#dc2626', minHeight: '14px', textAlign: 'center' }}>
                    {authError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button type="button" className="proj-btn-action" onClick={onCloseAuth}>
                    Batal
                  </button>
                  <button type="submit" className="proj-btn-action proj-btn-primary">
                    Buka Akses
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROJECT MANAGER MODAL */}
      {isManagerOpen && (
        <div className="proj-manager-modal active" id="projManagerModal" role="dialog" aria-modal="true">
          <div className="proj-manager-backdrop" onClick={onCloseManager}></div>
          <div className="proj-manager-box">
            {/* Header */}
            <div className="proj-manager-head">
              <div className="proj-manager-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span className="proj-title-long">PROJECT_MANAGER.EXE // KELOLA PROYEK</span>
                <span className="proj-title-short">PROJECT_MANAGER.EXE</span>
              </div>
              <button type="button" className="proj-manager-close" onClick={onCloseManager}>
                [ X ]
              </button>
            </div>

            {/* Tabs */}
            <div className="proj-manager-nav">
              <button
                type="button"
                className={`proj-m-tab ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('active');
                  setEditingProjId(null);
                }}
              >
                Proyek Aktif ({projects.length})
              </button>
              <button
                type="button"
                className={`proj-m-tab ${activeTab === 'github' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('github');
                  setEditingProjId(null);
                }}
              >
                Pilih dari GitHub
              </button>
              <button
                type="button"
                className={`proj-m-tab ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('create');
                  setEditingProjId(null);
                }}
              >
                + Tambah Manual
              </button>
            </div>

            {/* Body */}
            <div className="proj-manager-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {/* TAB 1: ACTIVE PROJECTS */}
              {activeTab === 'active' && (
                <div>
                  <div className="proj-tab-header">
                    <div className="proj-tab-header-title">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                      <span>DAFTAR PROYEK AKTIF ({projects.length})</span>
                    </div>
                    <button type="button" className="proj-btn-action" onClick={() => setActiveTab('create')}>
                      + Tambah Proyek
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {projects.map((proj, idx) => (
                      <div key={proj.id} className="proj-list-item">
                        {editingProjId === proj.id ? (
                          /* EDIT MODE */
                          <div>
                            <div style={{ fontFamily: 'var(--px-font)', fontSize: '11px', color: 'var(--orange-deep)', marginBottom: '4px' }}>
                              [ EDIT PROYEK #{idx + 1} ]
                            </div>
                            <form className="proj-form-grid" onSubmit={handleSaveEdit}>
                              <div className="proj-form-field">
                                <label>NAMA PROYEK</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="proj-form-field">
                                <label>DESKRIPSI PROYEK</label>
                                <textarea
                                  rows={3}
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  required
                                />
                              </div>
                              <div className="proj-form-grid-2col">
                                <div className="proj-form-field">
                                  <label>TAUTAN GITHUB</label>
                                  <input
                                    type="url"
                                    value={editGithub}
                                    onChange={(e) => setEditGithub(e.target.value)}
                                    placeholder="https://github.com/..."
                                  />
                                </div>
                                <div className="proj-form-field">
                                  <label>TAUTAN DEMO</label>
                                  <input
                                    type="url"
                                    value={editDemo}
                                    onChange={(e) => setEditDemo(e.target.value)}
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>

                              {/* Tag manager */}
                              <div className="proj-form-field">
                                <label>TAG TEKNOLOGI</label>
                                <div className="proj-tags-manager">
                                  <div className="proj-tags-chips-list">
                                    {editTags.map((t, tIdx) => (
                                      <span key={tIdx} className="proj-tag-chip">
                                        <span className="proj-tag-text">{t}</span>
                                        <button
                                          type="button"
                                          className="proj-tag-del-btn"
                                          onClick={() => setEditTags(editTags.filter((_, i) => i !== tIdx))}
                                        >
                                          &times;
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                  <div className="proj-tag-input-row">
                                    <input
                                      type="text"
                                      className="proj-tag-new-input"
                                      placeholder="Ketik tag lalu tekan Enter..."
                                      value={editTagInput}
                                      onChange={(e) => setEditTagInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (editTagInput.trim() && !editTags.includes(editTagInput.trim())) {
                                            setEditTags([...editTags, editTagInput.trim()]);
                                            setEditTagInput('');
                                          }
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="proj-btn-action proj-btn-primary proj-btn-add-tag"
                                      onClick={() => {
                                        if (editTagInput.trim() && !editTags.includes(editTagInput.trim())) {
                                          setEditTags([...editTags, editTagInput.trim()]);
                                          setEditTagInput('');
                                        }
                                      }}
                                    >
                                      + Tambah
                                    </button>
                                  </div>
                                  <div className="proj-tags-suggest">
                                    <span className="proj-tags-suggest-label">Pilihan Cepat:</span>
                                    <div className="proj-tags-suggest-chips">
                                      {quickTagChoices.map((q) => (
                                        <button
                                          key={q}
                                          type="button"
                                          className="proj-tag-quick"
                                          onClick={() => {
                                            if (!editTags.includes(q)) setEditTags([...editTags, q]);
                                          }}
                                        >
                                          +{q}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Image upload */}
                              <div className="proj-form-field">
                                <label>COVER / GAMBAR PROYEK</label>
                                <div className="proj-upload-row">
                                  <input
                                    type="text"
                                    value={editImage}
                                    onChange={(e) => setEditImage(e.target.value)}
                                    placeholder="forexacademy.png, https://..., atau unggah file"
                                  />
                                  <label className="proj-btn-upload">
                                    <span>Pilih File</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) compressImage(file, (data) => setEditImage(data));
                                      }}
                                    />
                                  </label>
                                </div>
                                {editImage && (
                                  <div className="proj-upload-preview-bar" style={{ display: 'flex' }}>
                                    <div className="proj-upload-thumb">
                                      <img src={editImage} alt="Preview Cover" />
                                    </div>
                                    <div className="proj-upload-info">
                                      <span className="proj-upload-filename">Gambar aktif</span>
                                      <button
                                        type="button"
                                        className="proj-btn-action proj-btn-delete"
                                        onClick={() => setEditImage('')}
                                        style={{ height: '26px !important', padding: '0 8px !important', fontSize: '9px !important' }}
                                      >
                                        Hapus Gambar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                <button type="submit" className="proj-btn-action proj-btn-primary">
                                  Simpan Perubahan
                                </button>
                                <button type="button" className="proj-btn-action" onClick={() => setEditingProjId(null)}>
                                  Batal
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          /* DISPLAY MODE */
                          <div>
                            <div className="proj-list-header">
                              <div>
                                <span className="proj-list-title">
                                  {idx + 1}. {proj.title}
                                </span>
                                {proj.demoUrl && <span className="proj-list-badge" style={{ marginLeft: '6px' }}>DEMO</span>}
                                {proj.githubUrl && <span className="proj-list-badge" style={{ marginLeft: '4px', background: 'var(--ink)' }}>GIT</span>}
                              </div>
                              <div className="proj-list-actions">
                                <button type="button" className="proj-btn-action btn-edit" onClick={() => handleStartEdit(proj)}>
                                  Edit
                                </button>
                                <button type="button" className="proj-btn-action proj-btn-delete btn-delete" onClick={() => handleDelete(proj)}>
                                  Hapus
                                </button>
                              </div>
                            </div>
                            <div className="proj-list-desc">{proj.description}</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                              <span style={{ fontFamily: 'var(--px-font)', fontSize: '9px', color: 'var(--gray-500)', marginRight: '4px' }}>TAGS:</span>
                              {proj.tags?.map((t, tI) => (
                                <span key={tI} className="chip" style={{ fontSize: '12px', padding: '2px 6px' }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: GITHUB IMPORT */}
              {activeTab === 'github' && (
                <div>
                  <div className="proj-tab-header">
                    <div className="proj-tab-header-title">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M12 2a10 10 0 00-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-1.99 1.03-2.69-.1-.26-.45-1.29.1-2.68 0 0 .84-.27 2.75 1.02a9.4 9.4 0 015 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.4.2 2.42.1 2.68.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0012 2z" />
                      </svg>
                      <span>REPOSITORI PUBLIK GITHUB (@Komouy)</span>
                    </div>
                    <button type="button" className="proj-btn-action" onClick={fetchGitHub}>
                      Segarkan Data
                    </button>
                  </div>

                  {ghLoading && (
                    <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                      <div style={{ fontFamily: 'var(--px-font)', fontSize: '12px', color: 'var(--orange-deep)' }}>
                        MEMUAT REPOSITORI DARI GITHUB...
                      </div>
                    </div>
                  )}

                  {ghError && (
                    <div style={{ textAlign: 'center', padding: '24px 16px', color: '#dc2626' }}>
                      {ghError}
                    </div>
                  )}

                  {!ghLoading && !ghError && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {githubRepos
                        .filter((r) => r.name.toLowerCase() !== 'portofolio')
                        .map((repo) => {
                          const isAlreadyActive = projects.some(
                            (p) =>
                              (p.repoName && p.repoName.toLowerCase() === repo.name.toLowerCase()) ||
                              (p.githubUrl && p.githubUrl.toLowerCase().includes(repo.name.toLowerCase())) ||
                              p.title.toLowerCase().replace(/[^a-z0-9]/g, '') === repo.name.toLowerCase().replace(/[^a-z0-9]/g, '')
                          );

                          return (
                            <div key={repo.name} className="proj-list-item">
                              <div className="proj-list-header">
                                <div>
                                  <span className="proj-list-title">{repo.name.replace(/[-_]/g, ' ')}</span>
                                  <span className="proj-list-badge proj-badge-dark" style={{ marginLeft: '6px' }}>
                                    {repo.language || 'Code'}
                                  </span>
                                  {repo.homepage && <span className="proj-list-badge" style={{ marginLeft: '4px' }}>WEB</span>}
                                </div>
                                <div>
                                  {isAlreadyActive ? (
                                    <span className="proj-list-badge badge-active">[ SUDAH AKTIF DI PORTO ]</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="proj-btn-action proj-btn-primary"
                                      onClick={() => handleAddFromGitHub(repo)}
                                    >
                                      + Masukkan ke Porto
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="proj-list-desc">
                                {repo.description || `Proyek repositori open-source ${repo.name} oleh Komouy.`}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CREATE MANUAL */}
              {activeTab === 'create' && (
                <div>
                  <div className="proj-tab-header">
                    <div className="proj-tab-header-title">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span>TAMBAH PROYEK BARU KE PORTOFOLIO</span>
                    </div>
                  </div>
                  <form className="proj-form-grid" onSubmit={handleAddManual}>
                    <div className="proj-form-field">
                      <label>NAMA PROYEK *</label>
                      <input
                        type="text"
                        placeholder="Contoh: Super AI Chatbot"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="proj-form-field">
                      <label>DESKRIPSI PROYEK *</label>
                      <textarea
                        rows={3}
                        placeholder="Jelaskan fitur utama, masalah yang diselesaikan, dan arsitektur..."
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        required
                      />
                    </div>
                    <div className="proj-form-grid-2col">
                      <div className="proj-form-field">
                        <label>TAUTAN GITHUB (OPSIONAL)</label>
                        <input
                          type="url"
                          placeholder="https://github.com/..."
                          value={newGithub}
                          onChange={(e) => setNewGithub(e.target.value)}
                        />
                      </div>
                      <div className="proj-form-field">
                        <label>TAUTAN DEMO / WEBSITE (OPSIONAL)</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={newDemo}
                          onChange={(e) => setNewDemo(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="proj-form-field">
                      <label>TAG TEKNOLOGI</label>
                      <div className="proj-tags-manager">
                        <div className="proj-tags-chips-list">
                          {newTags.map((t, idx) => (
                            <span key={idx} className="proj-tag-chip">
                              <span className="proj-tag-text">{t}</span>
                              <button
                                type="button"
                                className="proj-tag-del-btn"
                                onClick={() => setNewTags(newTags.filter((_, i) => i !== idx))}
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="proj-tag-input-row">
                          <input
                            type="text"
                            className="proj-tag-new-input"
                            placeholder="Ketik tag lalu tekan Enter..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (newTagInput.trim() && !newTags.includes(newTagInput.trim())) {
                                  setNewTags([...newTags, newTagInput.trim()]);
                                  setNewTagInput('');
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="proj-btn-action proj-btn-primary proj-btn-add-tag"
                            onClick={() => {
                              if (newTagInput.trim() && !newTags.includes(newTagInput.trim())) {
                                setNewTags([...newTags, newTagInput.trim()]);
                                setNewTagInput('');
                              }
                            }}
                          >
                            + Tambah
                          </button>
                        </div>
                        <div className="proj-tags-suggest">
                          <span className="proj-tags-suggest-label">Pilihan Cepat:</span>
                          <div className="proj-tags-suggest-chips">
                            {quickTagChoices.map((q) => (
                              <button
                                key={q}
                                type="button"
                                className="proj-tag-quick"
                                onClick={() => {
                                  if (!newTags.includes(q)) setNewTags([...newTags, q]);
                                }}
                              >
                                +{q}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="proj-form-field">
                      <label>COVER / PREVIEW PROYEK (OPSIONAL)</label>
                      <div className="proj-upload-row">
                        <input
                          type="text"
                          placeholder="nama-file.png, https://..., atau unggah file"
                          value={newImage}
                          onChange={(e) => setNewImage(e.target.value)}
                        />
                        <label className="proj-btn-upload">
                          <span>Pilih File</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) compressImage(file, (data) => setNewImage(data));
                            }}
                          />
                        </label>
                      </div>
                      {newImage && (
                        <div className="proj-upload-preview-bar" style={{ display: 'flex' }}>
                          <div className="proj-upload-thumb">
                            <img src={newImage} alt="Preview Cover" />
                          </div>
                          <div className="proj-upload-info">
                            <span className="proj-upload-filename">Gambar aktif</span>
                            <button
                              type="button"
                              className="proj-btn-action proj-btn-delete"
                              onClick={() => setNewImage('')}
                              style={{ height: '26px !important', padding: '0 8px !important', fontSize: '9px !important' }}
                            >
                              Hapus Gambar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                      <button type="submit" className="proj-btn-action proj-btn-primary">
                        + Simpan Proyek ke Portofolio
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="proj-manager-foot">
              <div style={{ fontFamily: 'var(--px-font)', fontSize: '10px', color: 'var(--gray-600)' }}>
                Siap mengelola proyek
              </div>
              <div className="proj-manager-foot-actions">
                <button type="button" className="proj-btn-action" onClick={handleChangePin} title="Ubah PIN akses admin">
                  Ganti PIN
                </button>
                <button type="button" className="proj-btn-action" onClick={handleResetToDefault} title="Kembalikan ke proyek bawaan">
                  Reset ke Bawaan
                </button>
                <button type="button" className="proj-btn-action" onClick={handleExportJson} title="Salin data proyek JSON">
                  Salin JSON
                </button>
                <button type="button" className="proj-btn-action proj-btn-primary" onClick={onCloseManager}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
