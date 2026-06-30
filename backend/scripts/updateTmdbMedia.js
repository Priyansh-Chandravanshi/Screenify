const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { db } = require('../lib/firebase');

const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w780';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
const TMDB_PUBLIC_SEARCH = 'https://www.themoviedb.org/search/trending';
const REQUEST_DELAY_MS = 900;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function tmdbToken() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  return token && token !== 'paste-your-tmdb-api-read-access-token-here' ? token : '';
}

async function tmdb(pathname) {
  const token = tmdbToken();
  if (!token) return publicTmdbSearch(pathname);

  const response = await fetch(`${TMDB_API}${pathname}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: 'application/json'
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.status_message || `TMDB request failed (${response.status}).`);
  }
  return data;
}

async function publicTmdbSearch(pathname) {
  const query = new URLSearchParams(pathname.split('?')[1] || '').get('query') || '';
  let response;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(`${TMDB_PUBLIC_SEARCH}?query=${encodeURIComponent(query)}`, {
      headers: { accept: 'application/json' }
    });
    if (response.status !== 429) break;
    await wait(attempt * 5000);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.status_message || `TMDB public search failed (${response.status}).`);
  }
  return {
    results: (data.results || []).filter(item => item && typeof item === 'object' && (item.poster_path || item.backdrop_path))
  };
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function releaseYear(value) {
  const year = String(value || '').slice(0, 4);
  return /^\d{4}$/.test(year) ? Number(year) : 0;
}

function candidateTitle(candidate) {
  return [
    candidate.original_title,
    candidate.title,
    candidate.original_name,
    candidate.name
  ].find(value => normalize(value)) || '';
}

function scoreCandidate(movie, candidate) {
  const title = normalize(movie.title);
  const matchedTitle = normalize(candidateTitle(candidate));
  const movieYear = releaseYear(movie.releaseDate);
  const candidateYear = releaseYear(candidate.release_date || candidate.first_air_date);
  let score = Number(candidate.popularity || 0);

  if (matchedTitle === title) score += 100;
  if (matchedTitle && (matchedTitle.includes(title) || title.includes(matchedTitle))) score += 30;
  if (movie.category === 'Web Series' && candidate.media_type === 'tv') score += 40;
  if (movie.category !== 'Web Series' && candidate.media_type === 'movie') score += 12;
  if (movieYear && candidateYear && movieYear === candidateYear) score += 25;
  if (candidate.poster_path) score += 15;
  if (candidate.backdrop_path) score += 10;

  return score;
}

function acceptableCandidate(movie, candidate) {
  const title = normalize(movie.title);
  const matchedTitle = normalize(candidateTitle(candidate));
  const movieYear = releaseYear(movie.releaseDate);
  const candidateYear = releaseYear(candidate.release_date || candidate.first_air_date);
  if (!title || !matchedTitle) return false;
  const exactTitle = matchedTitle === title;
  const closeTitle = matchedTitle.includes(title) || title.includes(matchedTitle);

  if (exactTitle) return true;
  if (closeTitle && (!movieYear || !candidateYear || Math.abs(movieYear - candidateYear) <= 1)) return true;
  return false;
}

async function searchMedia(movie) {
  const query = encodeURIComponent(movie.title);
  const year = releaseYear(movie.releaseDate);
  const isSeries = movie.category === 'Web Series';
  const endpoints = isSeries
    ? [`/search/tv?query=${query}&language=en-US&include_adult=false&page=1${year ? `&first_air_date_year=${year}` : ''}`]
    : [`/search/movie?query=${query}&language=en-US&include_adult=false&page=1${year ? `&year=${year}` : ''}`];

  endpoints.push(`/search/multi?query=${query}&language=en-US&include_adult=false&page=1`);

  const candidates = [];
  for (const endpoint of endpoints) {
    const result = await tmdb(endpoint);
    candidates.push(...(result.results || []));
  }

  return candidates
    .filter(candidate => candidate.poster_path || candidate.backdrop_path)
    .filter(candidate => acceptableCandidate(movie, candidate))
    .sort((left, right) => scoreCandidate(movie, right) - scoreCandidate(movie, left))[0];
}

async function main() {
  const snapshot = await db.collection('movies').get();
  const now = new Date().toISOString();
  let updated = 0;
  let skipped = 0;
  console.log(tmdbToken() ? 'Using TMDB API token.' : 'TMDB token not found; using public TMDB search fallback.');

  for (const doc of snapshot.docs) {
    const movie = { _id: doc.id, ...doc.data() };
    let match;
    try {
      match = await searchMedia(movie);
      await wait(REQUEST_DELAY_MS);
    } catch (error) {
      skipped += 1;
      console.warn(`Skipped: ${movie.title} (${error.message})`);
      await wait(REQUEST_DELAY_MS * 2);
      continue;
    }

    if (!match) {
      skipped += 1;
      console.warn(`Skipped: ${movie.title}`);
      continue;
    }

    const update = { updatedAt: now };
    if (match.poster_path) update.poster = `${TMDB_IMAGE}${match.poster_path}`;
    if (match.backdrop_path) update.backdrop = `${TMDB_BACKDROP}${match.backdrop_path}`;
    update.tmdbId = match.id;
    update.tmdbMediaType = match.media_type || (movie.category === 'Web Series' ? 'tv' : 'movie');

    await doc.ref.set(update, { merge: true });
    updated += 1;
    console.log(`Updated: ${movie.title}`);
  }

  console.log(`TMDB media update complete. Updated ${updated}, skipped ${skipped}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
