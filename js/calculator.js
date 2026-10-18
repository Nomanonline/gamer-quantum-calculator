// Gamer Quantum Calculator Core Controller

class GamerCalculator {
  constructor() {
    this.currentInput = '0';
    this.expression = '';
    this.isResultState = false;
    this.history = this.loadHistory();
    this.sciModeOpen = false;

    this.cacheDom();
    this.bindEvents();
    this.checkAutoLogin();
    this.updateDisplay();
    this.renderHistory();
    this.applyTheme(localStorage.getItem('gamer_rgb_theme') || 'cyan');
  }

  cacheDom() {
    // Screen sections
    this.lockSection = document.getElementById('lockSection');
    this.calcSection = document.getElementById('calcSection');

    // Lock Screen Elements
    this.keyInput = document.getElementById('keyInput');
    this.authBtn = document.getElementById('authBtn');
    this.lockFeedback = document.getElementById('lockFeedback');

    // Calculator Elements
    this.mainDisplay = document.getElementById('mainDisplay');
    this.prevDisplay = document.getElementById('prevDisplay');
    this.powerBar = document.getElementById('powerBar');
    this.keyInfoBadge = document.getElementById('activeKeyBadge');
    this.lockOutBtn = document.getElementById('lockOutBtn');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.sciKeypad = document.getElementById('sciKeypad');
    this.toggleSciBtn = document.getElementById('toggleSciBtn');
    this.historyList = document.getElementById('historyList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
  }

  bindEvents() {
    // Lock Gate Button
    if (this.authBtn) {
      this.authBtn.addEventListener('click', () => this.handleKeySubmission());
    }
    if (this.keyInput) {
      this.keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.handleKeySubmission();
        }
      });
      // Auto-format key formatting (uppercase)
      this.keyInput.addEventListener('input', (e) => {
        this.keyInput.value = this.keyInput.value.toUpperCase();
      });
    }

    // Lockout / Log out
    if (this.lockOutBtn) {
      this.lockOutBtn.addEventListener('click', () => this.lockCalculator());
    }

    // Sound toggle
    if (this.soundToggleBtn) {
      this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
      this.updateSoundBtnText();
    }

    // Scientific keypad toggle
    if (this.toggleSciBtn && this.sciKeypad) {
      this.toggleSciBtn.addEventListener('click', () => {
        this.sciModeOpen = !this.sciModeOpen;
        if (this.sciModeOpen) {
          this.sciKeypad.classList.remove('hidden');
          this.toggleSciBtn.textContent = 'ADVANCED SCI: ON';
        } else {
          this.sciKeypad.classList.add('hidden');
          this.toggleSciBtn.textContent = 'ADVANCED SCI: OFF';
        }
        window.gamerAudio.playClick();
      });
    }

    // Keypad Clicks
    document.querySelectorAll('.k-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const val = btn.dataset.val;

        // Skip the toggle sci button itself
        if (btn.id === 'toggleSciBtn') return;

        this.pulsePowerBar();

        if (action === 'num') {
          this.inputDigit(val);
        } else if (action === 'op') {
          this.inputOperator(val);
        } else if (action === 'clear') {
          this.clearAll();
        } else if (action === 'delete') {
          this.deleteDigit();
        } else if (action === 'equals') {
          this.calculate();
        } else if (action === 'sci') {
          this.inputScientific(val);
        }
      });
    });

    // Clear History Button
    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.addEventListener('click', () => {
        this.history = [];
        this.saveHistory();
        this.renderHistory();
        window.gamerAudio.playClick();
      });
    }

    // Physical Keyboard Support
    window.addEventListener('keydown', (e) => {
      // If lock section is active, let keyInput handle standard typing
      if (!this.calcSection || this.calcSection.classList.contains('hidden')) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        this.inputDigit(e.key);
      } else if (e.key === '.') {
        this.inputDigit('.');
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        this.inputOperator(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        this.calculate();
      } else if (e.key === 'Backspace') {
        this.deleteDigit();
      } else if (e.key === 'Escape') {
        this.clearAll();
      } else if (e.key === '(' || e.key === ')') {
        this.inputOperator(e.key);
      } else if (e.key === '%') {
        this.inputOperator('%');
      }
    });

    // Theme Picker Pills
    document.querySelectorAll('[data-rgb]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.rgb;
        this.applyTheme(theme);
        window.gamerAudio.playClick(1.2);
      });
    });
  }

  applyTheme(themeName) {
    document.body.setAttribute('data-rgb-theme', themeName);
    localStorage.setItem('gamer_rgb_theme', themeName);
  }

  pulsePowerBar() {
    if (!this.powerBar) return;
    this.powerBar.style.transform = 'scaleX(1)';
    this.powerBar.style.background = 'linear-gradient(90deg, #ff0055, #00f3ff, #00ff88)';
    setTimeout(() => {
      if (this.powerBar) {
        this.powerBar.style.transform = 'scaleX(0.4)';
        this.powerBar.style.background = 'linear-gradient(90deg, #00f3ff, #ff0055)';
      }
    }, 200);
  }

  // --- AUDIO LOGIC ---
  toggleSound() {
    const isMuted = window.gamerAudio.toggleMute();
    this.updateSoundBtnText();
    if (!isMuted) {
      window.gamerAudio.playSuccess();
    }
  }

  updateSoundBtnText() {
    if (!this.soundToggleBtn) return;
    const isMuted = window.gamerAudio.isMuted();
    this.soundToggleBtn.textContent = isMuted ? 'AUDIO: OFF 🔇' : 'AUDIO: ON 🔊';
  }

  // --- KEY GATE / AUTHENTICATION ---
  checkAutoLogin() {
    // 1. Check URL parameters for direct key link (e.g., ?key=XYZ-1234)
    const urlParams = new URLSearchParams(window.location.search);
    const paramKey = urlParams.get('key');
    if (paramKey) {
      if (this.keyInput) this.keyInput.value = paramKey.toUpperCase();
      this.handleKeySubmission(paramKey);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // 2. Check current session storage
    const activeSession = window.keysManager.getSessionKey();
    if (activeSession) {
      // Re-validate to ensure key wasn't revoked
      const allKeys = window.keysManager.getAllKeys();
      const current = allKeys.find((k) => k.id === activeSession.id || k.key === activeSession.key);
      if (current && current.status !== 'revoked' && (!current.expiresAt || Date.now() < current.expiresAt)) {
        this.unlockCalculator(current);
        return;
      }
    }

    // Default: Locked
    this.lockCalculator(false);
  }

  handleKeySubmission(overrideKey = null) {
    const key = (overrideKey || (this.keyInput ? this.keyInput.value : '')).trim();

    if (!key) {
      this.showFeedback('PLEASE INPUT A VALID ACCESS KEY.', 'error');
      window.gamerAudio.playError();
      return;
    }

    this.showFeedback('QUERYING QUANTUM MAINFRAME CIPHER...', 'loading');

    setTimeout(() => {
      const result = window.keysManager.validateKey(key);

      if (result.valid) {
        this.showFeedback(result.message, 'success');
        window.gamerAudio.playSuccess();
        setTimeout(() => {
          this.unlockCalculator(result.keyData);
        }, 600);
      } else {
        this.showFeedback(result.reason, 'error');
        window.gamerAudio.playError();
      }
    }, 400);
  }

  showFeedback(msg, type) {
    if (!this.lockFeedback) return;
    this.lockFeedback.textContent = msg;
    this.lockFeedback.className = 'lock-feedback feedback-' + type;
  }

  unlockCalculator(keyData) {
    if (this.lockSection) this.lockSection.classList.add('hidden');
    if (this.calcSection) this.calcSection.classList.remove('hidden');

    if (this.keyInfoBadge && keyData) {
      this.keyInfoBadge.innerHTML = `KEY: <span>${keyData.key}</span> (${keyData.type === 'single' ? 'SINGLE-USE' : 'AUTHORIZED'})`;
    }
  }

  lockCalculator(notify = true) {
    window.keysManager.clearSession();
    if (this.calcSection) this.calcSection.classList.add('hidden');
    if (this.lockSection) this.lockSection.classList.remove('hidden');
    if (this.keyInput) this.keyInput.value = '';
    this.showFeedback('AWAITING SECURITY CIPHER INPUT...', 'default');
    if (notify) {
      window.gamerAudio.playClick(0.7);
    }
  }

  // --- CALCULATOR OPERATIONS ---
  inputDigit(digit) {
    window.gamerAudio.playClick(1.1);

    if (this.isResultState) {
      this.currentInput = digit === '.' ? '0.' : digit;
      this.isResultState = false;
    } else {
      if (digit === '.') {
        if (!this.currentInput.includes('.')) {
          this.currentInput += '.';
        }
      } else {
        if (this.currentInput === '0') {
          this.currentInput = digit;
        } else {
          this.currentInput += digit;
        }
      }
    }
    this.updateDisplay();
  }

  inputOperator(op) {
    window.gamerAudio.playKey(680);

    if (op === '(' || op === ')') {
      if (this.currentInput === '0' && op === '(') {
        this.expression += '(';
      } else {
        this.expression += this.currentInput + op;
        this.currentInput = '0';
      }
      this.isResultState = false;
      this.updateDisplay();
      return;
    }

    if (this.isResultState) {
      this.expression = this.currentInput + ' ' + op + ' ';
      this.currentInput = '0';
      this.isResultState = false;
    } else {
      this.expression += this.currentInput + ' ' + op + ' ';
      this.currentInput = '0';
    }
    this.updateDisplay();
  }

  inputScientific(fn) {
    window.gamerAudio.playKey(920);
    const num = parseFloat(this.currentInput);

    let res = 0;
    let label = '';

    switch (fn) {
      case 'sqrt':
        if (num < 0) {
          this.currentInput = 'ERROR';
          this.updateDisplay();
          return;
        }
        res = Math.sqrt(num);
        label = `√(${num})`;
        break;
      case 'sqr':
        res = Math.pow(num, 2);
        label = `sqr(${num})`;
        break;
      case 'sin':
        res = Math.sin((num * Math.PI) / 180);
        label = `sin(${num}°)`;
        break;
      case 'cos':
        res = Math.cos((num * Math.PI) / 180);
        label = `cos(${num}°)`;
        break;
      case 'tan':
        res = Math.tan((num * Math.PI) / 180);
        label = `tan(${num}°)`;
        break;
      case 'log':
        if (num <= 0) {
          this.currentInput = 'ERROR';
          this.updateDisplay();
          return;
        }
        res = Math.log10(num);
        label = `log(${num})`;
        break;
      case 'pi':
        res = Math.PI;
        label = 'π';
        break;
      case 'fact':
        res = this.factorial(Math.floor(num));
        label = `${num}!`;
        break;
      case 'pow':
        this.inputOperator('^');
        return;
      default:
        return;
    }

    // Clean decimals
    res = Number(res.toFixed(8));
    this.addHistory(label, res);
    this.currentInput = String(res);
    this.expression = label;
    this.isResultState = true;
    this.updateDisplay();
  }

  factorial(n) {
    if (n < 0) return 0;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // Prevent overflow
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  deleteDigit() {
    window.gamerAudio.playClick(0.8);
    if (this.isResultState) {
      this.clearAll();
      return;
    }

    if (this.currentInput.length > 1) {
      this.currentInput = this.currentInput.slice(0, -1);
    } else {
      this.currentInput = '0';
    }
    this.updateDisplay();
  }

  clearAll() {
    window.gamerAudio.playClick(0.7);
    this.currentInput = '0';
    this.expression = '';
    this.isResultState = false;
    this.updateDisplay();
  }

  calculate() {
    window.gamerAudio.playSuccess();

    let fullExpr = (this.expression + this.currentInput).trim();
    if (!fullExpr) return;

    try {
      // Sanitize and replace user-friendly math tokens
      let evalExpr = fullExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**')
        .replace(/%/g, '/100');

      // Security check: only allow digits, math operators, parens, decimal point
      if (!/^[\d\s+\-*/.%()*,]+$/.test(evalExpr.replace(/\*\*/g, '*'))) {
        throw new Error('Invalid syntax');
      }

      // Safe evaluation using Function
      const calcResult = Function(`'use strict'; return (${evalExpr})`)();

      if (isNaN(calcResult) || !isFinite(calcResult)) {
        this.currentInput = 'OVERFLOW';
      } else {
        const rounded = Number(Number(calcResult).toFixed(8));
        this.addHistory(fullExpr, rounded);
        this.currentInput = String(rounded);
        this.expression = fullExpr + ' =';
        this.isResultState = true;
      }
    } catch (e) {
      this.currentInput = 'SYNTAX ERROR';
      this.isResultState = true;
      window.gamerAudio.playError();
    }

    this.updateDisplay();
  }

  updateDisplay() {
    if (this.mainDisplay) {
      this.mainDisplay.textContent = this.currentInput;
    }
    if (this.prevDisplay) {
      this.prevDisplay.textContent = this.expression;
    }
  }

  // --- HISTORY & COMBAT LOGS ---
  loadHistory() {
    try {
      const raw = localStorage.getItem('gamer_calc_history');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('gamer_calc_history', JSON.stringify(this.history));
    } catch (e) {}
  }

  addHistory(exp, ans) {
    this.history.unshift({
      exp,
      ans,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
    if (this.history.length > 30) this.history.pop();
    this.saveHistory();
    this.renderHistory();
  }

  renderHistory() {
    if (!this.historyList) return;

    if (this.history.length === 0) {
      this.historyList.innerHTML = `
        <div class="empty-history">
          <div>⚡ NO COMBAT COMPUTATIONS ⚡</div>
          <div style="font-size:11px;">Calculations will be recorded in telemetry</div>
        </div>
      `;
      return;
    }

    this.historyList.innerHTML = this.history
      .map(
        (item) => `
        <div class="history-item" data-ans="${item.ans}">
          <div class="history-exp">${item.exp}</div>
          <div class="history-ans">= ${item.ans}</div>
        </div>
      `
      )
      .join('');

    // Clicking a history item restores the value
    this.historyList.querySelectorAll('.history-item').forEach((item) => {
      item.addEventListener('click', () => {
        const ans = item.dataset.ans;
        this.currentInput = ans;
        this.isResultState = true;
        this.updateDisplay();
        window.gamerAudio.playClick();
      });
    });
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.gamerCalc = new GamerCalculator();
});
