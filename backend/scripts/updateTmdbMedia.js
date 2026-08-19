const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { db } = require('../lib/firebase');

const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w780';
const TMDB_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';
const TMDB_PUBLIC_SEARCH = 'https://www.themoviedb.org/search/trending';
const REQUEST_DELAY_MS = 900;
const CREW_JOB_PRIORITY = [
  'Director',
  'Creator',
  'Screenplay',
  'Writer',
  'Story',
  'Producer',
  'Executive Producer',
  'Original Music Composer',
  'Director of Photography',
  'Editor'
];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function tmdbToken() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  return token && token !== 'paste-your-tmdb-api-read-access-token-here' ? token : '';
}

async function tmdb(pathname, options = {}) {
  const token = tmdbToken();
  if (!token) {
    if (options.publicFallback !== false && pathname.startsWith('/search/')) {
      return publicTmdbSearch(pathname);
    }
    throw new Error('TMDB token not found.');
  }

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

function languageName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
  } catch (error) {
    return code || 'Multiple';
  }
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

function candidateMediaType(movie, candidate = {}) {
  if (candidate.media_type === 'movie' || candidate.media_type === 'tv') {
    return candidate.media_type;
  }
  if (candidate.searchType === 'movie' || candidate.searchType === 'tv') {
    return candidate.searchType;
  }
  if (movie.tmdbMediaType === 'movie' || movie.tmdbMediaType === 'tv') {
    return movie.tmdbMediaType;
  }
  return movie.category === 'Web Series' ? 'tv' : 'movie';
}

function scoreCandidate(movie, candidate) {
  const title = normalize(movie.title);
  const matchedTitle = normalize(candidateTitle(candidate));
  const movieYear = releaseYear(movie.releaseDate);
  const candidateYear = releaseYear(candidate.release_date || candidate.first_air_date);
  const mediaType = candidateMediaType(movie, candidate);
  let score = Number(candidate.popularity || 0);

  if (matchedTitle === title) score += 100;
  if (matchedTitle && (matchedTitle.includes(title) || title.includes(matchedTitle))) score += 30;
  if (movie.category === 'Web Series' && mediaType === 'tv') score += 70;
  if (movie.category === 'Web Series' && mediaType === 'movie') score -= 40;
  if (movie.category !== 'Web Series' && mediaType === 'movie') score += 20;
  if (movie.category !== 'Web Series' && mediaType === 'tv') score -= 20;
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
    const searchType = endpoint.startsWith('/search/tv')
      ? 'tv'
      : endpoint.startsWith('/search/movie') ? 'movie' : '';
    candidates.push(...(result.results || []).map(candidate => ({ ...candidate, searchType })));
  }

  return candidates
    .filter(candidate => acceptableCandidate(movie, candidate))
    .sort((left, right) => scoreCandidate(movie, right) - scoreCandidate(movie, left))[0];
}

function profileUrl(value) {
  const photo = String(value || '').trim();
  if (!photo) return '';
  if (/^https?:\/\//i.test(photo) || photo.startsWith('data:') || photo.startsWith('public/')) {
    return photo;
  }
  if (photo.startsWith('/')) {
    return `${TMDB_PROFILE}${photo}`;
  }
  return photo;
}

function rankedCrew(crew = []) {
  return crew
    .filter(person => person?.name && CREW_JOB_PRIORITY.includes(person.job))
    .sort((left, right) => (
      CREW_JOB_PRIORITY.indexOf(left.job) - CREW_JOB_PRIORITY.indexOf(right.job)
    ) || Number(right.popularity || 0) - Number(left.popularity || 0));
}

function mergeCrewPerson(grouped, person, role) {
  const name = String(person?.name || '').trim();
  if (!name || !role) return;
  const key = normalize(name);
  const existing = grouped.get(key) || { name, roles: [], photo: '' };
  if (!existing.roles.includes(role)) existing.roles.push(role);
  existing.photo = existing.photo || profileUrl(person.profile_path || person.photo);
  grouped.set(key, existing);
}

function normalizeCredits(credits = {}, detail = {}) {
  const seenCast = new Set();
  const cast = (credits.cast || [])
    .filter(person => person?.name)
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
    .filter(person => {
      const key = normalize(person.name);
      if (!key || seenCast.has(key)) return false;
      seenCast.add(key);
      return true;
    })
    .slice(0, 8)
    .map(person => ({
      name: String(person.name || 'Unknown'),
      role: String(person.character || 'Actor'),
      photo: profileUrl(person.profile_path)
    }));

  const groupedCrew = new Map();
  (detail.created_by || []).forEach(person => mergeCrewPerson(groupedCrew, person, 'Creator'));
  rankedCrew(credits.crew || []).forEach(person => mergeCrewPerson(groupedCrew, person, person.job));

  const crew = Array.from(groupedCrew.values())
    .slice(0, 8)
    .map(person => ({
      name: person.name,
      role: person.roles.slice(0, 2).join(', '),
      photo: person.photo
    }));

  return { cast, crew };
}

function directorFromCrew(crew = []) {
  const director = crew.find(person => /\bDirector\b/i.test(person?.role || ''))
    || crew.find(person => /\bCreator\b/i.test(person?.role || ''));
  return director?.name || '';
}

function emptyTrailer() {
  return { name: '', site: '', type: '', key: '', url: '', embedUrl: '' };
}

function normalizeTrailer(videos = []) {
  const trailer = (videos || [])
    .filter(video => video?.key && video.site === 'YouTube' && ['Trailer', 'Teaser'].includes(video.type))
    .sort((left, right) => {
      const official = Number(Boolean(right.official)) - Number(Boolean(left.official));
      if (official) return official;
      const type = Number(right.type === 'Trailer') - Number(left.type === 'Trailer');
      if (type) return type;
      const name = Number(/official trailer/i.test(right.name || '')) - Number(/official trailer/i.test(left.name || ''));
      if (name) return name;
      return String(right.published_at || '').localeCompare(String(left.published_at || ''));
    })[0];

  if (!trailer) return emptyTrailer();
  return {
    name: String(trailer.name || 'Official trailer'),
    site: 'YouTube',
    type: String(trailer.type || 'Trailer'),
    key: String(trailer.key),
    url: `https://www.youtube.com/watch?v=${trailer.key}`,
    embedUrl: `https://www.youtube.com/embed/${trailer.key}`
  };
}

function runtimeMinutes(detail = {}, mediaType = 'movie') {
  if (mediaType === 'movie') return Number(detail.runtime || 0);
  const values = Array.isArray(detail.episode_run_time) ? detail.episode_run_time.filter(Boolean) : [];
  if (values.length) return Number(values[0]);
  return Number(detail.last_episode_to_air?.runtime || detail.next_episode_to_air?.runtime || 0);
}

async function fetchMediaDetailAndCredits(mediaType, id) {
  const [detail, credits, videos] = await Promise.all([
    tmdb(`/${mediaType}/${id}?language=en-IN`, { publicFallback: false }),
    tmdb(`/${mediaType}/${id}/credits?language=en-IN`, { publicFallback: false }),
    tmdb(`/${mediaType}/${id}/videos?language=en-US`, { publicFallback: false })
  ]);
  const creditsPayload = normalizeCredits(credits, detail);
  let trailer = normalizeTrailer(videos.results);
  if (!trailer.url) {
    const regionalVideos = await tmdb(`/${mediaType}/${id}/videos?language=en-IN`, { publicFallback: false });
    trailer = normalizeTrailer(regionalVideos.results);
  }
  return { detail, ...creditsPayload, trailer };
}

function fallbackMatchFromStoredId(movie) {
  if (!movie.tmdbId) return null;
  return {
    id: movie.tmdbId,
    media_type: candidateMediaType(movie),
    poster_path: '',
    backdrop_path: ''
  };
}

async function main() {
  const snapshot = await db.collection('movies').get();
  const now = new Date().toISOString();
  let updated = 0;
  let skipped = 0;
  console.log(tmdbToken()
    ? 'Using TMDB API token for posters, banners, trailers, cast, crew and profile photos.'
    : 'TMDB token not found; using public TMDB search fallback for posters only.'
  );

  for (const doc of snapshot.docs) {
    const movie = { _id: doc.id, ...doc.data() };
    let match;
    try {
      match = await searchMedia(movie);
      await wait(REQUEST_DELAY_MS);
    } catch (error) {
      match = fallbackMatchFromStoredId(movie);
      if (!match) {
        skipped += 1;
        console.warn(`Skipped: ${movie.title} (${error.message})`);
        await wait(REQUEST_DELAY_MS * 2);
        continue;
      }
      console.warn(`Using stored TMDB id for ${movie.title} after search failed (${error.message})`);
      await wait(REQUEST_DELAY_MS * 2);
    }

    match = match || fallbackMatchFromStoredId(movie);
    if (!match) {
      skipped += 1;
      console.warn(`Skipped: ${movie.title}`);
      continue;
    }

    const mediaType = candidateMediaType(movie, match);
    const update = { updatedAt: now };
    if (match.poster_path) update.poster = `${TMDB_IMAGE}${match.poster_path}`;
    if (match.backdrop_path) update.backdrop = `${TMDB_BACKDROP}${match.backdrop_path}`;
    update.tmdbId = match.id;
    update.tmdbMediaType = mediaType;

    if (tmdbToken()) {
      try {
        const { detail, cast, crew, trailer } = await fetchMediaDetailAndCredits(mediaType, match.id);
        const runtime = runtimeMinutes(detail, mediaType);
        const genres = (detail.genres || []).map(genre => genre.name).filter(Boolean);
        const rating = Math.round(Number(detail.vote_average || 0) * 10) / 10;
        if (detail.poster_path) update.poster = `${TMDB_IMAGE}${detail.poster_path}`;
        if (detail.backdrop_path) update.backdrop = `${TMDB_BACKDROP}${detail.backdrop_path}`;
        if (runtime) {
          update.duration = runtime;
          update.runtime = runtime;
        }
        if (genres.length) {
          update.genre = genres.slice(0, 3).join(' / ');
          update.genres = genres;
        }
        if (detail.original_language) update.language = languageName(detail.original_language);
        if (rating) {
          update.rating = rating;
          update.tmdbRating = rating;
        }
        update.tmdbVoteCount = Number(detail.vote_count || 0);
        if (detail.overview) {
          update.synopsis = detail.overview;
          update.about = detail.overview;
        }
        if (cast.length) update.cast = cast;
        if (crew.length) {
          update.crew = crew;
          update.director = directorFromCrew(crew);
        }
        if (trailer.url) {
          update.trailer = trailer;
          update.trailerUrl = trailer.url;
        }
        await wait(REQUEST_DELAY_MS);
      } catch (error) {
        console.warn(`TMDB details skipped for ${movie.title}: ${error.message}`);
        await wait(REQUEST_DELAY_MS);
      }
    }

    await doc.ref.set(update, { merge: true });
    updated += 1;
    console.log(`Updated: ${movie.title}`);
  }

  console.log(`TMDB media/credits update complete. Updated ${updated}, skipped ${skipped}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
