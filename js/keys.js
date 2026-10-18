// Gamer Quantum Calculator - Key Management Engine
// Handles keys in LocalStorage, BroadcastChannel sync, and optional Backend Server Sync

const STORAGE_KEYS = 'gamer_calc_keys_v1';
const STORAGE_AUTH_SESSION = 'gamer_calc_auth_session';

class KeysManager {
  constructor() {
    this.broadcast = null;
    this.listeners = [];
    this.initBroadcast();
    this.ensureSeedKeys();
    this.syncWithServer();
  }

  initBroadcast() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcast = new BroadcastChannel('gamer_calc_channel');
        this.broadcast.onmessage = (event) => {
          if (event.data && event.data.type === 'KEYS_UPDATED') {
            this.notifyListeners();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported');
      }
    }

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS) {
        this.notifyListeners();
      }
    });
  }

  onUpdate(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    this.listeners.forEach((fn) => {
      try { fn(this.getAllKeys()); } catch (e) { console.error(e); }
    });
  }

  // Seed default working keys if storage is empty
  ensureSeedKeys() {
    const existing = this.getAllKeys();
    if (!existing || existing.length === 0) {
      const defaultKeys = [
        {
          id: 'seed_key_1',
          key: 'CYBER-2026-ALPHA',
          label: 'Default Genesis Key',
          type: 'multi',
          status: 'active',
          createdAt: Date.now() - 3600000,
          expiresAt: null,
          usageCount: 0,
          maxUses: null,
          lastUsed: null
        },
        {
          id: 'seed_key_2',
          key: 'OPERATOR-VIP-777',
          label: 'Operator VIP Pass',
          type: 'multi',
          status: 'active',
          createdAt: Date.now() - 1800000,
          expiresAt: null,
          usageCount: 0,
          maxUses: null,
          lastUsed: null
        },
        {
          id: 'seed_key_3',
          key: 'GAMER-ONE-9988',
          label: 'Single-Use Trial Key',
          type: 'single',
          status: 'active',
          createdAt: Date.now() - 600000,
          expiresAt: null,
          usageCount: 0,
          maxUses: 1,
          lastUsed: null
        }
      ];
      this.saveKeys(defaultKeys, false);
    }
  }

  getAllKeys() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed reading keys from storage', e);
      return [];
    }
  }

  saveKeys(keys, broadcast = true) {
    try {
      localStorage.setItem(STORAGE_KEYS, JSON.stringify(keys));
      if (broadcast) {
        if (this.broadcast) {
          this.broadcast.postMessage({ type: 'KEYS_UPDATED', timestamp: Date.now() });
        }
        this.notifyListeners();
        this.pushToServer(keys);
      }
    } catch (e) {
      console.error('Failed writing keys to storage', e);
    }
  }

  // Format generator: PREFIX-XXXX-XXXX
  generateRandomKey(prefix = 'CYBER') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const randPart = (len) => {
      let res = '';
      for (let i = 0; i < len; i++) {
        res += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return res;
    };
    const cleanPrefix = (prefix || 'KEY').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    return `${cleanPrefix}-${randPart(4)}-${randPart(4)}`;
  }

  createKey({ prefix = 'GAMER', label = 'Generated Player Key', type = 'multi', durationHours = null }) {
    const keys = this.getAllKeys();
    const keyCode = this.generateRandomKey(prefix);

    let expiresAt = null;
    if (durationHours && !isNaN(durationHours) && Number(durationHours) > 0) {
      expiresAt = Date.now() + Number(durationHours) * 3600 * 1000;
    }

    const newKeyObj = {
      id: 'key_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      key: keyCode,
      label: label.trim() || 'Access Key',
      type: type, // 'multi' | 'single'
      status: 'active',
      createdAt: Date.now(),
      expiresAt: expiresAt,
      usageCount: 0,
      maxUses: type === 'single' ? 1 : null,
      lastUsed: null
    };

    keys.unshift(newKeyObj);
    this.saveKeys(keys);
    return newKeyObj;
  }

  validateKey(inputKey) {
    if (!inputKey || typeof inputKey !== 'string') {
      return { valid: false, reason: 'Please enter a security key.' };
    }

    const cleanInput = inputKey.trim().toUpperCase();
    const keys = this.getAllKeys();
    const found = keys.find((k) => k.key.toUpperCase() === cleanInput);

    if (!found) {
      return { valid: false, reason: 'SECURITY BREACH: Invalid key cipher.' };
    }

    if (found.status === 'revoked') {
      return { valid: false, reason: 'ACCESS DENIED: Key has been revoked by Operator.' };
    }

    if (found.expiresAt && Date.now() > found.expiresAt) {
      found.status = 'expired';
      this.saveKeys(keys);
      return { valid: false, reason: 'ACCESS DENIED: Key time limit has expired.' };
    }

    if (found.type === 'single' && (found.usageCount >= 1 || found.status === 'used')) {
      return { valid: false, reason: 'ACCESS DENIED: Single-use key has already been consumed.' };
    }

    // Success! Update key stats
    found.usageCount = (found.usageCount || 0) + 1;
    found.lastUsed = Date.now();
    if (found.type === 'single') {
      found.status = 'used';
    }

    this.saveKeys(keys);

    // Set current active session
    this.setSessionKey(found);

    return {
      valid: true,
      keyData: found,
      message: 'AUTHENTICATION VERIFIED. QUANTUM CORE ACTIVATED.'
    };
  }

  revokeKey(keyId) {
    const keys = this.getAllKeys();
    const target = keys.find((k) => k.id === keyId || k.key === keyId);
    if (target) {
      target.status = 'revoked';
      this.saveKeys(keys);
      return true;
    }
    return false;
  }

  deleteKey(keyId) {
    const keys = this.getAllKeys();
    const filtered = keys.filter((k) => k.id !== keyId && k.key !== keyId);
    if (filtered.length !== keys.length) {
      this.saveKeys(filtered);
      return true;
    }
    return false;
  }

  resetAllKeys() {
    localStorage.removeItem(STORAGE_KEYS);
    this.ensureSeedKeys();
    this.notifyListeners();
  }

  // Session persistence for unlocked calculator
  setSessionKey(keyData) {
    try {
      sessionStorage.setItem(STORAGE_AUTH_SESSION, JSON.stringify(keyData));
    } catch (e) {}
  }

  getSessionKey() {
    try {
      const raw = sessionStorage.getItem(STORAGE_AUTH_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  clearSession() {
    try {
      sessionStorage.removeItem(STORAGE_AUTH_SESSION);
    } catch (e) {}
  }

  // Backend sync (works automatically when server.js is running)
  async syncWithServer() {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/keys');
        if (res.ok) {
          const serverKeys = await res.json();
          if (Array.isArray(serverKeys) && serverKeys.length > 0) {
            // merge or sync
            const localKeys = this.getAllKeys();
            if (localKeys.length === 0 || JSON.stringify(localKeys) !== JSON.stringify(serverKeys)) {
              localStorage.setItem(STORAGE_KEYS, JSON.stringify(serverKeys));
              this.notifyListeners();
            }
          }
        }
      } catch (e) {
        // Server API not present, fallback silently to localStorage
      }
    }
  }

  async pushToServer(keys) {
    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch('/api/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(keys)
        });
      } catch (e) {}
    }
  }
}

window.keysManager = new KeysManager();
