/* ============================================================
   MoSJE Udyam Saarthi — Google Translate Integration
   Uses Google Translate Element API to convert ALL visible text 
   on the page to the selected language.
   Supports 13 official Indian languages + English.
   ============================================================ */

const LANGS = [
  { code:'en', label:'EN', name:'English',   flag:'🇬🇧', native:'English'  },
  { code:'hi', label:'HI', name:'Hindi',     flag:'🇮🇳', native:'हिंदी'   },
  { code:'bn', label:'BN', name:'Bengali',   flag:'🇮🇳', native:'বাংলা'   },
  { code:'te', label:'TE', name:'Telugu',    flag:'🇮🇳', native:'తెలుగు'  },
  { code:'mr', label:'MR', name:'Marathi',   flag:'🇮🇳', native:'मराठी'   },
  { code:'ta', label:'TA', name:'Tamil',     flag:'🇮🇳', native:'தமிழ்'  },
  { code:'gu', label:'GU', name:'Gujarati',  flag:'🇮🇳', native:'ગુજરાતી' },
  { code:'kn', label:'KN', name:'Kannada',   flag:'🇮🇳', native:'ಕನ್ನಡ'   },
  { code:'ml', label:'ML', name:'Malayalam', flag:'🇮🇳', native:'മലയാളം' },
  { code:'pa', label:'PA', name:'Punjabi',   flag:'🇮🇳', native:'ਪੰਜਾਬੀ' },
  { code:'or', label:'OR', name:'Odia',      flag:'🇮🇳', native:'ଓଡ଼ିଆ'   },
  { code:'ur', label:'UR', name:'Urdu',      flag:'🇮🇳', native:'اردو'    },
  { code:'as', label:'AS', name:'Assamese',  flag:'🇮🇳', native:'অসমীয়া' }
];

/* ── Detect currently active language from Google Translate cookie ── */
function getActiveLang() {
  const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]+\/([a-zA-Z-]+)/);
  if (m && m[1]) {
    const code = m[1].toLowerCase();
    if (LANGS.some(l => l.code === code)) {
      return code;
    }
  }
  return 'en';
}

/* ── Set Google Translate cookie with multiple path/domain fallbacks ── */
function setGoogleTransCookie(code) {
  const val = `/en/${code}`;
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  
  // Root path (standard for single origin & localhost)
  document.cookie = `googtrans=${val}; path=/; max-age=${maxAge}; SameSite=Lax`;

  // Also set on current path if different
  if (window.location.pathname && window.location.pathname !== '/') {
    document.cookie = `googtrans=${val}; path=${window.location.pathname}; max-age=${maxAge}; SameSite=Lax`;
  }

  // Domain handling for non-IP hosts
  const host = window.location.hostname;
  if (host && !/^[0-9.]+$/.test(host) && host !== 'localhost') {
    document.cookie = `googtrans=${val}; path=/; domain=.${host}; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `googtrans=${val}; path=/; domain=${host}; max-age=${maxAge}; SameSite=Lax`;
  }
}

/* ── Clear Google Translate cookie completely ── */
function clearGoogleTransCookie() {
  const past = 'Thu, 01 Jan 1970 00:00:01 GMT';
  const paths = ['/', window.location.pathname];
  const host = window.location.hostname;

  paths.forEach(path => {
    document.cookie = `googtrans=; expires=${past}; path=${path}`;
    document.cookie = `googtrans=; expires=${past}; path=${path}; domain=${host}`;
    if (host && !/^[0-9.]+$/.test(host) && host !== 'localhost') {
      document.cookie = `googtrans=; expires=${past}; path=${path}; domain=.${host}`;
    }
  });
}

/* ── Update button label and dropdown active state ── */
function syncLangUI() {
  const cur = getActiveLang();
  const meta = LANGS.find(l => l.code === cur) || LANGS[0];
  const lb = document.getElementById('langLabel');
  if (lb) lb.textContent = meta.label;

  document.querySelectorAll('.lang-item').forEach(el => {
    el.classList.toggle('on', el.dataset.lang === cur);
  });

  if (window.voiceAssistant && typeof window.voiceAssistant.setLanguage === 'function') {
    window.voiceAssistant.setLanguage(cur);
  }
}

/* ── Programmatic language switch via Google Translate ── */
function setLang(code) {
  closeLangDrop();

  const cur = getActiveLang();
  if (code === cur && code === 'en') return;

  if (code === 'en') {
    clearGoogleTransCookie();
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = 'en';
      combo.dispatchEvent(new Event('change'));
    }
    // Clean reload to restore untranslated English DOM
    setTimeout(() => {
      window.location.reload();
    }, 50);
    return;
  }

  // Set the target cookie
  setGoogleTransCookie(code);

  // If Google Translate combo is already rendered in DOM, trigger change directly
  const combo = document.querySelector('.goog-te-combo');
  if (combo && combo.options && combo.options.length > 0) {
    combo.value = code;
    combo.dispatchEvent(new Event('change'));
    syncLangUI();
    // Dispatch again shortly to ensure dynamic contents catch it
    setTimeout(() => {
      if (combo.value !== code) {
        combo.value = code;
        combo.dispatchEvent(new Event('change'));
      }
    }, 300);
  } else {
    // If widget combo is not yet injected, reload page so GT initializes with the cookie
    window.location.reload();
  }
}

/* ── Helper to re-trigger translation on dynamically injected nodes ── */
window.retranslateDynamicContent = function() {
  const cur = getActiveLang();
  if (cur === 'en') return;
  const combo = document.querySelector('.goog-te-combo');
  if (combo && combo.options && combo.options.length > 0) {
    combo.value = cur;
    combo.dispatchEvent(new Event('change'));
  }
};

/* ── Dropdown open / close ── */
function toggleLangDrop() {
  const d = document.getElementById('langDrop');
  if (d) d.classList.toggle('open');
}
function closeLangDrop() {
  const d = document.getElementById('langDrop');
  if (d) d.classList.remove('open');
}

/* ── Inject Language Switcher Button & Dropdown ── */
function injectLangSwitcher() {
  if (document.getElementById('langSw')) {
    syncLangUI();
    return;
  }

  const cur  = getActiveLang();
  const meta = LANGS.find(l => l.code === cur) || LANGS[0];

  const html = `
  <div class="lang-sw" id="langSw">
    <button class="lang-btn" onclick="toggleLangDrop()" aria-label="Change language" title="Select Language / भाषा चुनें">
      <span class="globe">🌐</span>
      <span id="langLabel">${meta.label}</span>
      <span class="lang-caret">▾</span>
    </button>
    <div class="lang-drop" id="langDrop">
      <div class="lang-drop-header">
        <span class="lang-drop-title">🌐 Select Language</span>
        <span class="lang-drop-sub">Google Translate</span>
      </div>
      <div class="lang-drop-list">
        ${LANGS.map(l => `
          <button class="lang-item${l.code === cur ? ' on' : ''}" data-lang="${l.code}" onclick="setLang('${l.code}')">
            <span class="flag">${l.flag}</span>
            <span class="lang-name-text">${l.name}</span>
            <span class="native">${l.native}</span>
          </button>`).join('')}
      </div>
    </div>
  </div>`;

  const prof = document.querySelector('.nb-profile');
  const brandRow = document.querySelector('.brand-row');

  if (prof) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html.trim();
    prof.parentNode.insertBefore(tmp.firstElementChild, prof);
  } else if (brandRow) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html.trim();
    const el = tmp.firstElementChild;
    el.style.marginLeft = 'auto';
    brandRow.appendChild(el);
  } else {
    // Top-right fallback for any page without navbar
    const tmp = document.createElement('div');
    tmp.innerHTML = html.trim();
    const el = tmp.firstElementChild;
    el.style.position = 'fixed';
    el.style.top = '16px';
    el.style.right = '20px';
    el.style.zIndex = '9999';
    document.body.appendChild(el);
  }

  // Close on outside click
  document.addEventListener('click', e => {
    const sw = document.getElementById('langSw');
    if (sw && !sw.contains(e.target)) closeLangDrop();
  });
}

/* ── Google Translate init callback (invoked by GT element.js) ── */
window.googleTranslateElementInit = function () {
  try {
    let el = document.getElementById('google_translate_element');
    if (!el) {
      el = document.createElement('div');
      el.id = 'google_translate_element';
      document.body ? document.body.appendChild(el) : document.documentElement.appendChild(el);
    }

    new google.translate.TranslateElement(
      {
        pageLanguage: 'en',
        includedLanguages: LANGS.map(l => l.code).join(','),
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
        multilanguagePage: true
      },
      'google_translate_element'
    );

    // Watch for .goog-te-combo insertion and sync
    let attempts = 0;
    const checkCombo = setInterval(() => {
      attempts++;
      const combo = document.querySelector('.goog-te-combo');
      if (combo || attempts > 30) {
        clearInterval(checkCombo);
        if (combo) {
          const cur = getActiveLang();
          if (cur && cur !== 'en' && combo.value !== cur) {
            combo.value = cur;
            combo.dispatchEvent(new Event('change'));
          }
          syncLangUI();
        }
      }
    }, 150);

  } catch (err) {
    console.warn('Google Translate initialization error:', err);
  }
};

/* ── Inject Google Translate script dynamically ── */
function loadGoogleTranslateScript() {
  // Ensure container element exists before script loads
  if (!document.getElementById('google_translate_element')) {
    const el = document.createElement('div');
    el.id = 'google_translate_element';
    if (document.body) {
      document.body.appendChild(el);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('google_translate_element')) {
          document.body.appendChild(el);
        }
      });
    }
  }

  // Inject script if not present
  if (!document.getElementById('google-translate-script')) {
    const s = document.createElement('script');
    s.id = 'google-translate-script';
    s.type = 'text/javascript';
    s.async = true;
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(s);
  }
}

/* ── Inject Global Styling for Switcher and Suppress Google Banner ── */
function injectStyles() {
  if (document.getElementById('gt-styles')) return;
  const style = document.createElement('style');
  style.id = 'gt-styles';
  style.textContent = `
    /* Prevent Google Translate banner from displacing page layout */
    body { top: 0px !important; position: static !important; }
    iframe.goog-te-banner-frame,
    .goog-te-banner-frame { display: none !important; visibility: hidden !important; }
    #goog-gt-tt, .goog-te-balloon-frame { display: none !important; visibility: hidden !important; }
    .goog-text-highlight { background: none !important; box-shadow: none !important; }
    
    /* Keep Google Translate container rendered for JS logic but hidden offscreen */
    #google_translate_element, #gt-el {
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    .goog-te-gadget { display: none !important; }

    /* Custom Modern Language Switcher UI */
    .lang-sw {
      position: relative;
      flex-shrink: 0;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }
    .lang-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      border: 1.5px solid #cbd5e1;
      background: #ffffff;
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .lang-btn:hover {
      border-color: #0f2167;
      color: #0f2167;
      background: #f8fafc;
      transform: translateY(-1px);
      box-shadow: 0 3px 6px rgba(15,33,103,0.1);
    }
    .lang-btn .globe { font-size: 1.05rem; }
    .lang-caret { font-size: 0.65rem; opacity: 0.6; transition: transform 0.2s ease; }
    .lang-sw:hover .lang-caret { opacity: 0.9; }

    .lang-drop {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 12px 30px -4px rgba(15,23,42,0.18), 0 4px 6px -2px rgba(15,23,42,0.05);
      min-width: 220px;
      display: none;
      overflow: hidden;
      z-index: 99999;
      animation: langDropFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes langDropFadeIn {
      from { opacity: 0; transform: translateY(-8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .lang-drop.open { display: block; }
    .lang-drop-header {
      padding: 10px 14px 8px;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .lang-drop-title {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      font-weight: 800;
    }
    .lang-drop-sub {
      font-size: 0.65rem;
      color: #94a3b8;
      font-weight: 600;
    }
    .lang-drop-list {
      max-height: 320px;
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 4px 0;
    }
    .lang-drop-list::-webkit-scrollbar {
      width: 5px;
    }
    .lang-drop-list::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }
    .lang-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      font-size: 0.85rem;
      color: #334155;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
      border: none;
      background: transparent;
      width: 100%;
      font-family: inherit;
      font-weight: 500;
      text-align: left;
    }
    .lang-item:hover {
      background: #f1f5f9;
      color: #0f2167;
    }
    .lang-item.on {
      background: #eff6ff;
      color: #1e3a8a;
      font-weight: 700;
    }
    .lang-item .flag { font-size: 1.1rem; line-height: 1; }
    .lang-name-text { flex: 1; }
    .lang-item .native {
      font-size: 0.78rem;
      color: #64748b;
      margin-left: auto;
      font-weight: 400;
    }
    .lang-item.on .native {
      color: #3b82f6;
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
}

/* ── DOM Init ── */
injectStyles();
loadGoogleTranslateScript();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectLangSwitcher();
    syncLangUI();
  });
} else {
  injectLangSwitcher();
  syncLangUI();
}
