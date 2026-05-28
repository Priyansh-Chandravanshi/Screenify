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

  function poster(url) {
    return url || FALLBACK_POSTER;
  }

  function setMessage(element, message, kind = '') {
    element.textContent = message;
    element.className = `notice ${kind}`.trim();
  }

  window.Screenify = { request, save, load, money, date, poster, setMessage };
}());
