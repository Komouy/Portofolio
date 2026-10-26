import React, { useState, useEffect, useRef } from 'react';
import { Project, GitHubRepo } from '../types';
import { DEFAULT_PORTFOLIO_PROJECTS } from '../constants/translations';

interface ProjectManagerModalProps {
  isAuthOpen: boolean;
  onCloseAuth: () => void;
  isManagerOpen: boolean;
  onCloseManager: () => void;
  projects: Project[];
  onUpdateProjects: (updated: Project[]) => void;
  onUnlock?: () => void;
  onLock?: () => void;
  showToast: (msg: string) => void;
}

// Domain-specific cryptographic salt to prevent rainbow-table and dictionary attacks
const SALT_PREFIX = 'kadalapi_foxrunner_sec_';
const SALT_SUFFIX = '_201007_komouy_vault_v3';

// Salted SHA-256 for default admin PIN '201007'
// Raw text before hash: 'kadalapi_foxrunner_sec_201007_201007_komouy_vault_v3'
const DEFAULT_PIN_HASH = '1fcb3454cedfa317bdf688646689ea4af24a2f1b0bd5a7b2684943dab2d1daa6';
const LEGACY_PIN_HASH = '707ff98bce3074eaf5e77a679353b1091999b5b76b7e5f1d4c26f10a04b62107';

/** Anti-Brute Force Lockout Constants */
const MAX_ATTEMPTS_BEFORE_LOCK = 3;
const COOLDOWN_TIER_1 = 30; // 30 seconds
const COOLDOWN_TIER_2 = 120; // 2 minutes
const COOLDOWN_TIER_3 = 300; // 5 minutes

function getLockoutState(): { isLocked: boolean; remainingSec: number } {
  try {
    const until = parseInt(sessionStorage.getItem('kd_admin_lockout') || '0', 10);
    const now = Date.now();
    if (until > now) {
      return { isLocked: true, remainingSec: Math.ceil((until - now) / 1000) };
    }
  } catch (_) {}
  return { isLocked: false, remainingSec: 0 };
}

function recordFailedAttempt(): number {
  try {
    const cur = parseInt(sessionStorage.getItem('kd_admin_attempts') || '0', 10) + 1;
    sessionStorage.setItem('kd_admin_attempts', cur.toString());
    let duration = 0;
    if (cur >= 5) duration = COOLDOWN_TIER_3;
    else if (cur >= 4) duration = COOLDOWN_TIER_2;
    else if (cur >= 3) duration = COOLDOWN_TIER_1;

    if (duration > 0) {
      const until = Date.now() + duration * 1000;
      sessionStorage.setItem('kd_admin_lockout', until.toString());
      return duration;
    }
    return 0;
  } catch (_) {
    return 0;
  }
}

function clearLockoutState() {
  try {
    sessionStorage.removeItem('kd_admin_attempts');
    sessionStorage.removeItem('kd_admin_lockout');
  } catch (_) {}
}

/**
 * Pure JS SHA-256 fallback algorithm to guarantee consistent cryptographic hashing
 * even on insecure origins (HTTP local IPs) where crypto.subtle is restricted.
 */
function pureSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const asciiBitLength = ascii.length * 8;
  const words: number[] = [];
  const hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  for (let i = 0; i < asciiBitLength; i += 8) {
    words[i >> 5] |= (ascii.charCodeAt(i / 8) & 0xff) << (24 - (i % 32));
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    let [a, b, c, d, e, f, g, h] = hash;
    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }
      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const sigma0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const sigma1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const t1 = (h + sigma1 + ch + k[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (8 * j)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

async function rawSha256(ascii: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const buf = new TextEncoder().encode(ascii);
      const hash = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {}
  }
  return pureSha256(ascii);
}

/** Compute salted SHA-256 for admin PIN */
async function hashPin(pin: string): Promise<string> {
  const salted = `${SALT_PREFIX}${pin.trim()}${SALT_SUFFIX}`;
  return rawSha256(salted);
}

/** Verify PIN against stored hash with backward-compatibility auto-upgrade */
async function verifyPin(pin: string): Promise<boolean> {
  const trimmed = pin.trim();
  const saltedHash = await hashPin(trimmed);
  const storedHash = localStorage.getItem('portfolio_admin_pin_hash') || DEFAULT_PIN_HASH;

  if (saltedHash === storedHash) {
    return true;
  }

  // Backward compatibility migration from legacy unsalted hash:
  if (storedHash === LEGACY_PIN_HASH) {
    const rawLegacy = await rawSha256(trimmed);
    if (rawLegacy === LEGACY_PIN_HASH) {
      localStorage.setItem('portfolio_admin_pin_hash', saltedHash);
      return true;
    }
  }
  return false;
}

/** URL Sanitizer: adds https:// if protocol is omitted */
function sanitizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Check if string is a valid HTTP/HTTPS URL */
function isValidHttpUrl(str: string): boolean {
  if (!str) return true; // Optional URL is valid when empty
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/** Normalize image path so static assets and external/data URLs display cleanly */
function normalizeImagePath(src: string): string {
  if (!src) return '';
  const s = src.trim();
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:') || s.startsWith('/')) {
    return s;
  }
  return '/' + s;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isAuthOpen,
  onCloseAuth,
  isManagerOpen,
  onCloseManager,
  projects,
  onUpdateProjects,
  onUnlock,
  onLock,
  showToast
}) => {
  // Auth state
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

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
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Edit project state
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editGithub, setEditGithub] = useState('');
  const [editDemo, setEditDemo] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');

  // Check lockout on auth modal open and setup live countdown
  useEffect(() => {
    if (!isAuthOpen) return;

    setPinInput('');
    const { isLocked, remainingSec } = getLockoutState();
    setLockoutRemaining(remainingSec);

    if (isLocked) {
      setAuthError(`AKSES DITOLAK: Terlalu banyak percobaan salah. Terkunci ${remainingSec} detik.`);
    } else {
      setAuthError('');
      setTimeout(() => pinInputRef.current?.focus(), 50);
    }

    const timer = setInterval(() => {
      const { isLocked: stillLocked, remainingSec: rem } = getLockoutState();
      setLockoutRemaining(rem);
      if (!stillLocked) {
        clearInterval(timer);
        setAuthError('');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthOpen]);

  // Reset edit state when manager modal closes
  useEffect(() => {
    if (!isManagerOpen) {
      setEditingProjId(null);
    }
  }, [isManagerOpen]);

  // Inactivity Auto-Lock (10 minutes) while manager is active
  useEffect(() => {
    if (!isManagerOpen) return;
    let timer: any;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (onLock) onLock();
        onCloseManager();
        showToast('Sesi otomatis dikunci demi keamanan (tidak ada aktivitas 10 menit).');
      }, 10 * 60 * 1000);
    };

    resetTimer();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [isManagerOpen, onLock, onCloseManager, showToast]);

  // Image compression & validation helper
  const compressImage = (file: File, callback: (dataUrl: string) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Gagal: File harus berupa gambar.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Gagal: Ukuran file maksimal 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      showToast('Gagal membaca file gambar.');
    };
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      if (!raw) return;

      const img = new Image();
      img.onload = () => {
        try {
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
          canvas.width = Math.max(1, w);
          canvas.height = Math.max(1, h);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            callback(compressed);
            showToast('Gambar berhasil diunggah.');
          } else {
            callback(raw);
          }
        } catch (err) {
          console.error(err);
          callback(raw);
        }
      };
      img.onerror = () => {
        showToast('Format gambar rusak atau tidak didukung.');
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  };

  // Auth form submit with brute-force protection, lockout & crypto delay
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;

    const { isLocked, remainingSec } = getLockoutState();
    if (isLocked) {
      setAuthError(`AKSES DITOLAK: Terkunci sementara (${remainingSec} detik).`);
      return;
    }

    const pin = pinInput.trim();
    if (!pin) {
      setAuthError('PIN tidak boleh kosong.');
      return;
    }

    setIsVerifying(true);
    // 400ms computational delay to deter automated console brute-force scripts
    await new Promise((resolve) => setTimeout(resolve, 400));

    const isValid = await verifyPin(pin);
    setIsVerifying(false);

    if (isValid) {
      clearLockoutState();
      setPinInput('');
      setAuthError('');
      onCloseAuth();
      if (onUnlock) {
        onUnlock();
      }
      showToast('Akses pemilik terverifikasi.');
    } else {
      const lockedDuration = recordFailedAttempt();
      const attempts = parseInt(sessionStorage.getItem('kd_admin_attempts') || '1', 10);
      setPinInput('');

      if (lockedDuration > 0) {
        setLockoutRemaining(lockedDuration);
        setAuthError(`AKSES DITOLAK: Terlalu banyak percobaan salah. Terkunci ${lockedDuration} detik.`);
      } else {
        const remainingAttempts = Math.max(0, MAX_ATTEMPTS_BEFORE_LOCK - attempts);
        setAuthError(`AKSES DITOLAK: PIN SALAH. (${remainingAttempts} percobaan tersisa sebelum terkunci)`);
        setTimeout(() => pinInputRef.current?.focus(), 50);
      }
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
      setGhError('Gagal memuat dari GitHub: ' + (err?.message || 'Error'));
    } finally {
      setGhLoading(false);
    }
  };

  useEffect(() => {
    if (isManagerOpen && activeTab === 'github' && !githubRepos.length) {
      fetchGitHub();
    }
  }, [isManagerOpen, activeTab]);

  // Helper for adding user-inputted tags (supports Enter or comma-separated)
  const addTags = (
    rawInput: string,
    currentTags: string[],
    setTags: (tags: string[]) => void,
    clearInput: () => void
  ) => {
    const tokens = rawInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 30);

    if (tokens.length === 0) return;

    const merged = [...currentTags];
    for (const tok of tokens) {
      if (!merged.includes(tok)) {
        merged.push(tok);
      }
    }
    setTags(merged);
    clearInput();
  };

  // Start editing a project
  const handleStartEdit = (proj: Project) => {
    setEditingProjId(proj.id);
    setEditTitle(proj.title);
    setEditDesc(proj.description);
    setEditGithub(proj.githubUrl || '');
    setEditDemo(proj.demoUrl || '');
    setEditImage(proj.image || '');
    setEditTags(Array.isArray(proj.tags) ? [...proj.tags] : []);
    setEditTagInput('');
  };

  // Save edited project with validation
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjId) return;

    const title = editTitle.trim();
    const desc = editDesc.trim();

    if (!title) {
      showToast('Gagal: Nama proyek tidak boleh kosong.');
      return;
    }
    if (!desc) {
      showToast('Gagal: Deskripsi proyek tidak boleh kosong.');
      return;
    }

    const cleanGithub = sanitizeUrl(editGithub);
    const cleanDemo = sanitizeUrl(editDemo);

    if (cleanGithub && !isValidHttpUrl(cleanGithub)) {
      showToast('Tautan GitHub tidak valid (contoh: https://github.com/user/repo).');
      return;
    }
    if (cleanDemo && !isValidHttpUrl(cleanDemo)) {
      showToast('Tautan Demo tidak valid (contoh: https://domain.com).');
      return;
    }

    const cleanTags = editTags.length > 0 ? editTags : ['Project'];

    const updated = projects.map((p) => {
      if (p.id === editingProjId) {
        return {
          ...p,
          title,
          description: desc,
          githubUrl: cleanGithub,
          demoUrl: cleanDemo,
          image: editImage.trim(),
          tags: cleanTags
        };
      }
      return p;
    });

    onUpdateProjects(updated);
    setEditingProjId(null);
    showToast(`Perubahan "${title}" berhasil disimpan!`);
  };

  // Delete project
  const handleDelete = (proj: Project) => {
    if (confirm(`Hapus proyek "${proj.title}" dari portofolio? Tindakan ini dapat dibatalkan dengan "Reset ke Bawaan".`)) {
      const updated = projects.filter((p) => p.id !== proj.id);
      onUpdateProjects(updated);
      showToast(`Proyek "${proj.title}" telah dihapus.`);
    }
  };

  // Create manual project with validation
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    const desc = newDesc.trim();

    if (!title) {
      showToast('Gagal: Nama proyek wajib diisi.');
      return;
    }
    if (!desc) {
      showToast('Gagal: Deskripsi proyek wajib diisi.');
      return;
    }

    const cleanGithub = sanitizeUrl(newGithub);
    const cleanDemo = sanitizeUrl(newDemo);

    if (cleanGithub && !isValidHttpUrl(cleanGithub)) {
      showToast('Tautan GitHub tidak valid (contoh: https://github.com/user/repo).');
      return;
    }
    if (cleanDemo && !isValidHttpUrl(cleanDemo)) {
      showToast('Tautan Demo tidak valid (contoh: https://domain.com).');
      return;
    }

    const cleanTags = newTags.length > 0 ? newTags : ['Project'];

    const newProj: Project = {
      id: 'custom_' + Date.now(),
      title,
      description: desc,
      githubUrl: cleanGithub,
      demoUrl: cleanDemo,
      image: newImage.trim(),
      tags: cleanTags,
      source: 'custom'
    };

    onUpdateProjects([...projects, newProj]);
    showToast(`Proyek "${title}" berhasil ditambahkan!`);

    // Reset form
    setNewTitle('');
    setNewDesc('');
    setNewGithub('');
    setNewDemo('');
    setNewImage('');
    setNewTags([]);
    setNewTagInput('');
    setActiveTab('active');
  };

  // Add from GitHub with duplicate check
  const handleAddFromGitHub = (repo: GitHubRepo) => {
    const formattedTitle = repo.name.replace(/[-_]/g, ' ');
    const exists = projects.some(
      (p) =>
        p.id === 'gh_' + repo.name ||
        (p.repoName && p.repoName.toLowerCase() === repo.name.toLowerCase()) ||
        p.title.toLowerCase().replace(/[^a-z0-9]/g, '') === formattedTitle.toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    if (exists) {
      showToast(`Proyek "${formattedTitle}" sudah ada di portofolio!`);
      return;
    }

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
    showToast(`Proyek "${formattedTitle}" berhasil dimasukkan!`);
  };

  // Change Admin PIN with cryptographic salted hash
  const handleChangePin = async () => {
    const currentPin = prompt('Masukkan PIN lama:');
    if (currentPin === null) return;
    const trimmedOld = currentPin.trim();
    if (!trimmedOld) {
      alert('PIN lama tidak boleh kosong!');
      return;
    }

    const isOldValid = await verifyPin(trimmedOld);
    if (!isOldValid) {
      alert('PIN lama salah! Akses ditolak.');
      return;
    }

    const newPin = prompt('Masukkan PIN baru (minimal 6 karakter):');
    if (newPin === null) return;
    const trimmedNew = newPin.trim();
    if (!trimmedNew || trimmedNew.length < 6) {
      alert('PIN baru tidak valid! Minimal 6 karakter demi keamanan.');
      return;
    }

    const confirmPin = prompt('Ketik ulang PIN baru untuk konfirmasi:');
    if (confirmPin === null) return;
    if (trimmedNew !== confirmPin.trim()) {
      alert('Konfirmasi PIN tidak cocok!');
      return;
    }

    const hashedNew = await hashPin(trimmedNew);
    localStorage.setItem('portfolio_admin_pin_hash', hashedNew);
    showToast('PIN Admin berhasil diperbarui dengan enkripsi salt!');
  };

  // Reset to default projects safely
  const handleResetToDefault = () => {
    if (confirm('Kembalikan daftar proyek ke 5 proyek bawaan portofolio? Semua perubahan kustom akan direset.')) {
      const cloned = JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO_PROJECTS));
      onUpdateProjects(cloned);
      showToast('Daftar proyek dikembalikan ke bawaan!');
    }
  };

  // Copy JSON
  const handleExportJson = () => {
    try {
      const json = JSON.stringify(projects, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(json)
          .then(() => showToast('Data JSON proyek berhasil disalin!'))
          .catch(() => prompt('Salin teks JSON berikut:', json));
      } else {
        prompt('Salin teks JSON berikut:', json);
      }
    } catch (e) {
      showToast('Gagal mengekspor data JSON proyek.');
    }
  };

  return (
    <>
      {/* 1. AUTH MODAL (SECURITY GATE) */}
      {isAuthOpen && (
        <div className="proj-manager-modal active" id="projAuthModal" role="dialog" aria-modal="true" aria-labelledby="authGateTitle">
          <div className="proj-manager-backdrop" onClick={onCloseAuth}></div>
          <div className="proj-manager-box" style={{ maxWidth: '420px' }}>
            <div className="proj-manager-head">
              <div className="proj-manager-title" id="authGateTitle">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>VERIFIKASI PEMILIK</span>
              </div>
              <button type="button" className="proj-manager-close" onClick={onCloseAuth} aria-label="Tutup">
                [ X ]
              </button>
            </div>
            <div className="proj-manager-body" style={{ padding: '20px' }}>
              <p style={{ fontFamily: 'var(--px-font)', fontSize: '10px', color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: '12px' }}>
                Masukkan PIN Admin untuk membuka panel pengelola proyek:
              </p>
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="proj-form-field">
                  <label htmlFor="projAuthPinInput">PIN ADMIN</label>
                  <input
                    ref={pinInputRef}
                    id="projAuthPinInput"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={lockoutRemaining > 0 || isVerifying}
                    maxLength={20}
                    placeholder={lockoutRemaining > 0 ? `TERKUNCI (${lockoutRemaining}s)` : '••••••'}
                    required
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    style={{
                      fontSize: '18px',
                      letterSpacing: '4px',
                      textAlign: 'center',
                      opacity: lockoutRemaining > 0 ? 0.6 : 1,
                      cursor: lockoutRemaining > 0 ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
                {authError && (
                  <div style={{ fontFamily: 'var(--px-font)', fontSize: '9px', color: '#dc2626', minHeight: '14px', textAlign: 'center', lineHeight: 1.4 }}>
                    {authError}
                  </div>
                )}
                {lockoutRemaining > 0 && (
                  <div style={{ fontFamily: 'var(--px-font)', fontSize: '8.5px', color: '#991b1b', textAlign: 'center', background: '#fee2e2', padding: '6px 8px', border: '1.5px solid #ef4444' }}>
                    Sistem keamanan terkunci sementara. Harap tunggu {lockoutRemaining} detik.
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="button" className="proj-btn-action" onClick={onCloseAuth}>
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="proj-btn-action proj-btn-primary"
                    disabled={lockoutRemaining > 0 || isVerifying}
                  >
                    {isVerifying ? 'Memverifikasi...' : lockoutRemaining > 0 ? `Terkunci (${lockoutRemaining}s)` : 'Buka Akses'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2. PROJECT MANAGER MODAL */}
      {isManagerOpen && (
        <div className="proj-manager-modal active" id="projManagerModal" role="dialog" aria-modal="true" aria-labelledby="projManagerTitle">
          <div className="proj-manager-backdrop" onClick={onCloseManager}></div>
          <div className="proj-manager-box">
            {/* Header */}
            <div className="proj-manager-head">
              <div className="proj-manager-title" id="projManagerTitle">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span className="proj-title-long">PROJECT_MANAGER.EXE // KELOLA PROYEK</span>
                <span className="proj-title-short">PROJECT_MANAGER.EXE</span>
              </div>
              <button type="button" className="proj-manager-close" onClick={onCloseManager} aria-label="Tutup">
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
                            <div style={{ fontFamily: 'var(--px-font)', fontSize: '11px', color: 'var(--orange-deep)', marginBottom: '8px' }}>
                              [ EDIT PROYEK #{idx + 1} : {proj.title} ]
                            </div>
                            <form className="proj-form-grid" onSubmit={handleSaveEdit}>
                              <div className="proj-form-field">
                                <label>NAMA PROYEK *</label>
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="Nama proyek..."
                                  required
                                />
                              </div>
                              <div className="proj-form-field">
                                <label>DESKRIPSI PROYEK *</label>
                                <textarea
                                  rows={3}
                                  value={editDesc}
                                  onChange={(e) => setEditDesc(e.target.value)}
                                  placeholder="Deskripsi detail proyek..."
                                  required
                                />
                              </div>
                              <div className="proj-form-grid-2col">
                                <div className="proj-form-field">
                                  <label>TAUTAN GITHUB</label>
                                  <input
                                    type="text"
                                    inputMode="url"
                                    value={editGithub}
                                    onChange={(e) => setEditGithub(e.target.value)}
                                    placeholder="https://github.com/..."
                                  />
                                </div>
                                <div className="proj-form-field">
                                  <label>TAUTAN DEMO / WEBSITE</label>
                                  <input
                                    type="text"
                                    inputMode="url"
                                    value={editDemo}
                                    onChange={(e) => setEditDemo(e.target.value)}
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>

                              {/* Tag manager - Simple & Manual Input */}
                              <div className="proj-form-field">
                                <label>TAG TEKNOLOGI</label>
                                <div className="proj-tags-manager">
                                  <div className="proj-tags-chips-list">
                                    {editTags.length === 0 ? (
                                      <span className="proj-tag-empty-hint">Belum ada tag. Ketik di bawah untuk menambahkan.</span>
                                    ) : (
                                      editTags.map((t, tIdx) => (
                                        <span key={tIdx} className="proj-tag-chip">
                                          <span className="proj-tag-text">{t}</span>
                                          <button
                                            type="button"
                                            className="proj-tag-del-btn"
                                            onClick={() => setEditTags(editTags.filter((_, i) => i !== tIdx))}
                                            aria-label={`Hapus tag ${t}`}
                                          >
                                            &times;
                                          </button>
                                        </span>
                                      ))
                                    )}
                                  </div>
                                  <div className="proj-tag-input-row">
                                    <input
                                      type="text"
                                      className="proj-tag-new-input"
                                      placeholder="Ketik tag lalu tekan Enter (atau pisahkan dengan koma)..."
                                      value={editTagInput}
                                      onChange={(e) => setEditTagInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addTags(editTagInput, editTags, setEditTags, () => setEditTagInput(''));
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      className="proj-btn-action proj-btn-primary proj-btn-add-tag"
                                      onClick={() => addTags(editTagInput, editTags, setEditTags, () => setEditTagInput(''))}
                                    >
                                      + Tambah
                                    </button>
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
                                        e.target.value = ''; // Reset
                                      }}
                                    />
                                  </label>
                                </div>
                                {editImage && (
                                  <div className="proj-upload-preview-bar">
                                    <div className="proj-upload-thumb">
                                      <img
                                        src={normalizeImagePath(editImage)}
                                        alt="Preview Cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.opacity = '0.4';
                                        }}
                                      />
                                    </div>
                                    <div className="proj-upload-info">
                                      <span className="proj-upload-filename">Gambar aktif terpasang</span>
                                      <button
                                        type="button"
                                        className="proj-btn-action proj-btn-delete proj-btn-sm"
                                        onClick={() => setEditImage('')}
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
                                {proj.demoUrl && <span className="proj-list-badge badge-demo" style={{ marginLeft: '6px' }}>DEMO</span>}
                                {proj.githubUrl && <span className="proj-list-badge badge-git" style={{ marginLeft: '4px' }}>GIT</span>}
                                {proj.source === 'github' && (
                                  <span className="proj-list-badge proj-badge-dark" style={{ marginLeft: '4px' }}>GH REPO</span>
                                )}
                              </div>
                              <div className="proj-list-actions">
                                <button type="button" className="proj-btn-action proj-btn-sm btn-edit" onClick={() => handleStartEdit(proj)}>
                                  Edit
                                </button>
                                <button type="button" className="proj-btn-action proj-btn-delete proj-btn-sm btn-delete" onClick={() => handleDelete(proj)}>
                                  Hapus
                                </button>
                              </div>
                            </div>
                            <div className="proj-list-desc">{proj.description}</div>
                            <div className="proj-list-tags-row">
                              <span className="proj-list-tags-label">TAGS:</span>
                              {proj.tags && proj.tags.length > 0 ? (
                                proj.tags.map((t, tI) => (
                                  <span key={tI} className="proj-list-tag">
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span style={{ fontFamily: 'var(--px-font)', fontSize: '8px', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                                  -
                                </span>
                              )}
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
                    <button type="button" className="proj-btn-action" onClick={fetchGitHub} disabled={ghLoading}>
                      {ghLoading ? 'Memuat...' : 'Segarkan Data'}
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
                      <div style={{ marginBottom: '8px' }}>{ghError}</div>
                      <button type="button" className="proj-btn-action proj-btn-primary" onClick={fetchGitHub}>
                        Coba Lagi
                      </button>
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
                                    <span className="proj-list-badge badge-active">[ SUDAH AKTIF ]</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="proj-btn-action proj-btn-primary proj-btn-sm"
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
                        placeholder="Masukan Nama..."
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
                          type="text"
                          inputMode="url"
                          placeholder="https://github.com/..."
                          value={newGithub}
                          onChange={(e) => setNewGithub(e.target.value)}
                        />
                      </div>
                      <div className="proj-form-field">
                        <label>TAUTAN DEMO / WEBSITE (OPSIONAL)</label>
                        <input
                          type="text"
                          inputMode="url"
                          placeholder="https://..."
                          value={newDemo}
                          onChange={(e) => setNewDemo(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Tag manager - Simple & Manual Input */}
                    <div className="proj-form-field">
                      <label>TAG TEKNOLOGI</label>
                      <div className="proj-tags-manager">
                        <div className="proj-tags-chips-list">
                          {newTags.length === 0 ? (
                            <span className="proj-tag-empty-hint">Belum ada tag. Ketik di bawah untuk menambahkan.</span>
                          ) : (
                            newTags.map((t, idx) => (
                              <span key={idx} className="proj-tag-chip">
                                <span className="proj-tag-text">{t}</span>
                                <button
                                  type="button"
                                  className="proj-tag-del-btn"
                                  onClick={() => setNewTags(newTags.filter((_, i) => i !== idx))}
                                  aria-label={`Hapus tag ${t}`}
                                >
                                  &times;
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                        <div className="proj-tag-input-row">
                          <input
                            type="text"
                            className="proj-tag-new-input"
                            placeholder="Pisahkan dengan koma..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTags(newTagInput, newTags, setNewTags, () => setNewTagInput(''));
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="proj-btn-action proj-btn-primary proj-btn-add-tag"
                            onClick={() => addTags(newTagInput, newTags, setNewTags, () => setNewTagInput(''))}
                          >
                            + Tambah
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="proj-form-field">
                      <label>COVER / PREVIEW PROYEK (OPSIONAL)</label>
                      <div className="proj-upload-row">
                        <input
                          type="text"
                          placeholder="Pilih File atau Masukan Link Gambar..."
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
                              e.target.value = ''; // Reset
                            }}
                          />
                        </label>
                      </div>
                      {newImage && (
                        <div className="proj-upload-preview-bar">
                          <div className="proj-upload-thumb">
                            <img
                              src={normalizeImagePath(newImage)}
                              alt="Preview Cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.opacity = '0.4';
                              }}
                            />
                          </div>
                          <div className="proj-upload-info">
                            <span className="proj-upload-filename">Gambar aktif terpasang</span>
                            <button
                              type="button"
                              className="proj-btn-action proj-btn-delete proj-btn-sm"
                              onClick={() => setNewImage('')}
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
                Panel Pengelola Proyek // Sesi Aktif
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
                <button
                  type="button"
                  className="proj-btn-action proj-btn-delete"
                  onClick={() => {
                    if (onLock) onLock();
                    onCloseManager();
                    showToast('Sesi ditutup & panel pengelola berhasil dikunci.');
                  }}
                  title="Kunci sesi admin sekarang"
                >
                  Kunci Sesi
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
