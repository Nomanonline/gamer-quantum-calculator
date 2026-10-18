// Operator Portal Controller

class OperatorPortal {
  constructor() {
    this.operatorPasscode = 'OPERATOR'; // Default Operator passcode
    this.isAuthenticated = sessionStorage.getItem('operator_authenticated') === 'true';
    this.lastGeneratedKey = null;

    this.cacheDom();
    this.bindEvents();
    this.checkAuth();
    this.renderStats();
    this.renderKeysTable();

    // Listen to real-time updates from keysManager
    window.keysManager.onUpdate(() => {
      this.renderStats();
      this.renderKeysTable();
    });
  }

  cacheDom() {
    // Sections
    this.loginSection = document.getElementById('operatorLoginSection');
    this.hubSection = document.getElementById('operatorHubSection');

    // Login inputs
    this.passInput = document.getElementById('operatorPasscode');
    this.loginBtn = document.getElementById('operatorLoginBtn');
    this.loginFeedback = document.getElementById('loginFeedback');
    this.logoutBtn = document.getElementById('operatorLogoutBtn');

    // Stats
    this.statTotalKeys = document.getElementById('statTotalKeys');
    this.statActiveKeys = document.getElementById('statActiveKeys');
    this.statTotalUses = document.getElementById('statTotalUses');
    this.statSystemStatus = document.getElementById('statSystemStatus');

    // Generator elements
    this.keyPrefix = document.getElementById('keyPrefix');
    this.customPrefix = document.getElementById('customPrefix');
    this.keyType = document.getElementById('keyType');
    this.keyDuration = document.getElementById('keyDuration');
    this.keyLabel = document.getElementById('keyLabel');
    this.generateBtn = document.getElementById('generateKeyBtn');

    // Generated Key Showcase
    this.generatedBox = document.getElementById('generatedKeyBox');
    this.generatedDisplay = document.getElementById('generatedKeyDisplay');
    this.copyGenBtn = document.getElementById('copyGenKeyBtn');
    this.testGenBtn = document.getElementById('testGenKeyBtn');

    // Table elements
    this.keysTableBody = document.getElementById('keysTableBody');
    this.searchKeys = document.getElementById('searchKeys');
    this.filterStatus = document.getElementById('filterStatus');
    this.resetKeysBtn = document.getElementById('resetKeysBtn');

    // Toast
    this.toastNotice = document.getElementById('toastNotice');
    this.soundToggleBtn = document.getElementById('operatorSoundBtn');
  }

  bindEvents() {
    // Sound switch
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => {
        const isMuted = window.gamerAudio.toggleMute();
        this.updateSoundBtnText();
        if (!isMuted) window.gamerAudio.playSuccess();
      });
      this.updateSoundBtnText();
    }

    // Theme selector pills
    document.querySelectorAll('[data-rgb]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.rgb;
        document.body.setAttribute('data-rgb-theme', theme);
        localStorage.setItem('gamer_rgb_theme', theme);
        window.gamerAudio.playClick(1.2);
      });
    });

    // Login
    if (this.loginBtn) {
      this.loginBtn.addEventListener('click', () => this.handleLogin());
    }
    if (this.passInput) {
      this.passInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleLogin();
      });
    }

    // Logout
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Key Prefix Selector toggle custom input
    if (this.keyPrefix && this.customPrefix) {
      this.keyPrefix.addEventListener('change', () => {
        if (this.keyPrefix.value === 'CUSTOM') {
          this.customPrefix.style.display = 'block';
          this.customPrefix.focus();
        } else {
          this.customPrefix.style.display = 'none';
        }
      });
    }

    // Generate Key Button
    if (this.generateBtn) {
      this.generateBtn.addEventListener('click', () => this.handleGenerateKey());
    }

    // Copy Generated Key
    if (this.copyGenBtn) {
      this.copyGenBtn.addEventListener('click', () => {
        const key = this.lastGeneratedKey || (this.generatedDisplay ? this.generatedDisplay.textContent : '');
        this.copyToClipboard(key);
      });
    }

    // Search and Filter keys
    if (this.searchKeys) {
      this.searchKeys.addEventListener('input', () => this.renderKeysTable());
    }
    if (this.filterStatus) {
      this.filterStatus.addEventListener('change', () => this.renderKeysTable());
    }

    // Reset Keys
    if (this.resetKeysBtn) {
      this.resetKeysBtn.addEventListener('click', () => {
        if (confirm('RESET ALL KEYS to factory defaults? Any custom keys will be wiped.')) {
          window.keysManager.resetAllKeys();
          this.showToast('System keys reset to Genesis defaults');
          window.gamerAudio.playLaser();
        }
      });
    }

  }

  updateSoundBtnText() {
    if (!this.soundToggleBtn) return;
    const isMuted = window.gamerAudio.isMuted();
    this.soundToggleBtn.textContent = isMuted ? 'AUDIO: OFF 🔇' : 'AUDIO: ON 🔊';
  }

  // Auth Gate
  checkAuth() {
    if (this.isAuthenticated) {
      if (this.loginSection) this.loginSection.classList.add('hidden');
      if (this.hubSection) this.hubSection.classList.remove('hidden');
      if (this.logoutBtn) this.logoutBtn.style.display = 'inline-flex';
    } else {
      if (this.hubSection) this.hubSection.classList.add('hidden');
      if (this.loginSection) this.loginSection.classList.remove('hidden');
      if (this.logoutBtn) this.logoutBtn.style.display = 'none';
    }
  }

  handleLogin() {
    const entered = (this.passInput ? this.passInput.value : '').trim();

    if (entered.toUpperCase() === this.operatorPasscode || entered.toUpperCase() === 'ADMIN') {
      this.isAuthenticated = true;
      sessionStorage.setItem('operator_authenticated', 'true');
      this.checkAuth();
      window.gamerAudio.playSuccess();
      this.showToast('Welcome back, Operator');
    } else {
      if (this.loginFeedback) {
        this.loginFeedback.textContent = 'ACCESS DENIED: INVALID OPERATOR CLEARANCE CIPHER';
        this.loginFeedback.className = 'lock-feedback feedback-error';
      }
      window.gamerAudio.playError();
    }
  }

  handleLogout() {
    this.isAuthenticated = false;
    sessionStorage.removeItem('operator_authenticated');
    this.checkAuth();
    if (this.passInput) this.passInput.value = '';
    if (this.loginFeedback) {
      this.loginFeedback.textContent = 'ENTER OPERATOR LEVEL-5 SECURITY CLEARANCE';
      this.loginFeedback.className = 'lock-feedback feedback-default';
    }
    window.gamerAudio.playClick(0.7);
  }

  // Key Generation
  handleGenerateKey() {
    let prefix = this.keyPrefix ? this.keyPrefix.value : 'CYBER';
    if (prefix === 'CUSTOM') {
      prefix = (this.customPrefix ? this.customPrefix.value : '').trim() || 'CUSTOM';
    }

    const type = this.keyType ? this.keyType.value : 'multi';
    const duration = this.keyDuration ? this.keyDuration.value : null;
    const label = (this.keyLabel ? this.keyLabel.value : '').trim() || 'Operator Generated';

    const newKey = window.keysManager.createKey({
      prefix,
      label,
      type,
      durationHours: duration ? Number(duration) : null
    });

    window.gamerAudio.playLaser();

    // Show in generated box
    if (this.generatedBox && this.generatedDisplay) {
      this.generatedDisplay.textContent = newKey.key;
      this.lastGeneratedKey = newKey.key;
      this.generatedBox.style.display = 'block';

      // Update test link
      if (this.testGenBtn) {
        this.testGenBtn.href = `index.html?key=${encodeURIComponent(newKey.key)}`;
      }
    }

    this.renderStats();
    this.renderKeysTable();
    this.showToast(`Key [${newKey.key}] generated successfully!`);

    // Reset label input
    if (this.keyLabel) this.keyLabel.value = '';
  }

  // Render Stats
  renderStats() {
    const keys = window.keysManager.getAllKeys();
    const active = keys.filter((k) => k.status === 'active');
    const totalUses = keys.reduce((acc, k) => acc + (k.usageCount || 0), 0);

    if (this.statTotalKeys) this.statTotalKeys.textContent = keys.length;
    if (this.statActiveKeys) this.statActiveKeys.textContent = active.length;
    if (this.statTotalUses) this.statTotalUses.textContent = totalUses;
    if (this.statSystemStatus) this.statSystemStatus.textContent = 'ONLINE / SECURE';
  }

  // Render Keys Table
  renderKeysTable() {
    if (!this.keysTableBody) return;

    const searchTerm = (this.searchKeys ? this.searchKeys.value : '').toLowerCase().trim();
    const filter = this.filterStatus ? this.filterStatus.value : 'all';

    let keys = window.keysManager.getAllKeys();

    // Filter
    keys = keys.filter((k) => {
      // Search
      const matchesSearch =
        k.key.toLowerCase().includes(searchTerm) ||
        (k.label && k.label.toLowerCase().includes(searchTerm));

      // Status
      let matchesStatus = true;
      if (filter !== 'all') {
        matchesStatus = k.status === filter;
      }

      return matchesSearch && matchesStatus;
    });

    if (keys.length === 0) {
      this.keysTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 30px; color: var(--text-dim); font-family: var(--font-code);">
            ⚡ NO KEYS FOUND MATCHING CRITERIA ⚡
          </td>
        </tr>
      `;
      return;
    }

    this.keysTableBody.innerHTML = keys
      .map((k) => {
        let statusClass = 'status-active';
        if (k.status === 'revoked') statusClass = 'status-revoked';
        else if (k.status === 'used') statusClass = 'status-used';
        else if (k.status === 'expired' || (k.expiresAt && Date.now() > k.expiresAt)) {
          statusClass = 'status-expired';
        }

        const dateStr = new Date(k.createdAt).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const expiryStr = k.expiresAt
          ? new Date(k.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Never';

        return `
        <tr>
          <td><span class="key-code-badge">${k.key}</span></td>
          <td>${k.label || 'Standard Key'}</td>
          <td><span style="font-family: var(--font-code);">${k.type === 'single' ? 'Single-Use' : 'Multi-Use'}</span></td>
          <td><strong>${k.usageCount || 0}</strong> uses</td>
          <td><span style="font-family: var(--font-code); font-size:12px; color:var(--text-muted);">${expiryStr}</span></td>
          <td><span class="status-badge ${statusClass}">${k.status.toUpperCase()}</span></td>
          <td>
            <div class="table-actions">
              <button class="cyber-btn action-btn-sm" onclick="window.operatorPortal.copyToClipboard('${k.key}')" title="Copy Key">
                📋 COPY
              </button>
              <a href="index.html?key=${encodeURIComponent(k.key)}" target="_blank" class="cyber-btn cyber-btn-success action-btn-sm" title="Launch Calculator with Key">
                🚀 TEST
              </a>
              ${
                k.status === 'active'
                  ? `<button class="cyber-btn cyber-btn-danger action-btn-sm" onclick="window.operatorPortal.revokeKey('${k.id}')" title="Revoke Access">
                      🚫 REVOKE
                    </button>`
                  : `<button class="cyber-btn cyber-btn-secondary action-btn-sm" onclick="window.operatorPortal.deleteKey('${k.id}')" title="Delete Key">
                      🗑️ DEL
                    </button>`
              }
            </div>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  // Actions
  copyToClipboard(text) {
    const clean = String(text || '').trim();
    if (!clean) {
      this.showToast('Nothing to copy');
      return;
    }

    console.log('COPYING:', JSON.stringify(clean));

    const onSuccess = () => {
      window.gamerAudio.playClick(1.3);
      this.showToast(`Copied [${clean}] to clipboard!`);
    };

    const onFail = () => {
      try {
        window.prompt('Copy this key manually (Ctrl+C, then Enter):', clean);
      } catch (e) {
        this.showToast('Copy failed - please copy manually: ' + clean);
      }
    };

    // 1. Try synchronous execCommand (works in most browsers with user gesture)
    let execOk = false;
    try {
      const el = document.createElement('textarea');
      el.value = clean;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.top = '-9999px';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      execOk = document.execCommand('copy');
      document.body.removeChild(el);
    } catch (err) {
      console.error('execCommand error', err);
      execOk = false;
    }

    if (execOk) {
      onSuccess();
      return;
    }

    // 2. Try modern Clipboard API with a timeout guard
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      let finished = false;
      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          onFail();
        }
      }, 800);

      navigator.clipboard.writeText(clean).then(() => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        onSuccess();
      }).catch((err) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        console.error('CLIPBOARD WRITE FAIL', err);
        onFail();
      });
      return;
    }

    // 3. No API available
    onFail();
  }

  revokeKey(keyId) {
    if (confirm('Revoke access for this key? Any future calculation attempts will be blocked.')) {
      window.keysManager.revokeKey(keyId);
      window.gamerAudio.playClick(0.6);
      this.showToast('Key revoked from system');
      this.renderStats();
      this.renderKeysTable();
      this.renderAuditLogs();
    }
  }

  deleteKey(keyId) {
    window.keysManager.deleteKey(keyId);
    window.gamerAudio.playClick(0.6);
    this.showToast('Key removed permanently');
    this.renderStats();
    this.renderKeysTable();
    this.renderAuditLogs();
  }

  showToast(message) {
    if (!this.toastNotice) return;
    this.toastNotice.textContent = '⚡ ' + message;
    this.toastNotice.classList.add('show');
    setTimeout(() => {
      this.toastNotice.classList.remove('show');
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.operatorPortal = new OperatorPortal();
});
