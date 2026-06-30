(function () {
  const API_BASE = '/api';
  const FALLBACK_POSTER = 'public/kgf.jpg';

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Request failed. Please try again.');
    }
    return data;
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function load(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (error) {
      return null;
    }
  }

  function money(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  function date(value) {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(new Date(value));
  }

  function poster(url, title = 'Screenify', genre = 'Cinema') {
    if (url) return url;
    const palettes = [
      ['#131722', '#e7335f', '#ffd166'],
      ['#0f172a', '#2563eb', '#a7f3d0'],
      ['#1f1b2e', '#7c3aed', '#f0abfc'],
      ['#101820', '#0f9f7a', '#fef3c7'],
      ['#25160f', '#f97316', '#fde68a'],
      ['#111827', '#dc2626', '#fca5a5']
    ];
    const seed = Array.from(title).reduce((total, char) => total + char.charCodeAt(0), 0);
    const [dark, mid, light] = palettes[seed % palettes.length];
    const words = String(title).split(/\s+/);
    const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
    const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
    const safeTitleOne = escapeSvg(firstLine || title);
    const safeTitleTwo = escapeSvg(secondLine);
    const safeGenre = escapeSvg(genre || 'Now showing');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 1050">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${dark}"/>
            <stop offset=".58" stop-color="${mid}"/>
            <stop offset="1" stop-color="${dark}"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="28%" r="58%">
            <stop offset="0" stop-color="${light}" stop-opacity=".7"/>
            <stop offset="1" stop-color="${light}" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="700" height="1050" fill="url(#bg)"/>
        <rect width="700" height="1050" fill="url(#glow)"/>
        <circle cx="590" cy="130" r="86" fill="${light}" opacity=".18"/>
        <circle cx="120" cy="880" r="130" fill="#fff" opacity=".08"/>
        <path d="M0 760 C150 690 270 820 410 750 C520 695 610 705 700 660 L700 1050 L0 1050 Z" fill="#05070d" opacity=".42"/>
        <rect x="54" y="58" width="592" height="934" rx="28" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="4"/>
        <text x="350" y="150" text-anchor="middle" fill="#fff" opacity=".86" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="5">SCREENIFY</text>
        <text x="350" y="500" text-anchor="middle" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="62" font-weight="900">${safeTitleOne}</text>
        <text x="350" y="575" text-anchor="middle" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="62" font-weight="900">${safeTitleTwo}</text>
        <rect x="185" y="650" width="330" height="52" rx="26" fill="#fff" opacity=".16"/>
        <text x="350" y="685" text-anchor="middle" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="800">${safeGenre}</text>
        <text x="350" y="892" text-anchor="middle" fill="#fff" opacity=".82" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700">BOOK TICKETS NOW</text>
      </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function bindPosterFallback(image, title = 'Screenify', genre = 'Cinema') {
    image.addEventListener('error', () => {
      image.src = poster('', title, genre);
    }, { once: true });
  }

  function escapeSvg(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setMessage(element, message, kind = '') {
    element.textContent = message;
    element.className = `notice ${kind}`.trim();
  }

  window.Screenify = { request, save, load, money, date, poster, bindPosterFallback, setMessage };
}());
