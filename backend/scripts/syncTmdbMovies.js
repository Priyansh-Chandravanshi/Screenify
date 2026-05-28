const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { db } = require('../lib/firebase');

const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w780';
const DEMO_MOVIE_IDS = [
  'midnight-runway',
  'a-sky-full-of-notes',
  'orbit-seven',
  'the-last-recipe'
];
const SHOW_TEMPLATES = [
  { suffix: 'pvr-morning', theatre: 'PVR Nexus Mall', auditorium: 'Audi 2', format: '2D', daysAhead: 1, time: '10:30 AM', price: 220 },
  { suffix: 'pvr-evening', theatre: 'PVR Nexus Mall', auditorium: 'Audi 2', format: 'IMAX', daysAhead: 1, time: '07:15 PM', price: 340 },
  { suffix: 'inox-evening', theatre: 'INOX Central', auditorium: 'Screen 4', format: '2D', daysAhead: 2, time: '04:00 PM', price: 260 }
];

function requiredToken() {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token || token === 'paste-your-tmdb-api-read-access-token-here') {
    throw new Error('Add TMDB_ACCESS_TOKEN to backend/.env before importing real movies.');
  }
  return token;
}

async function tmdb(pathname) {
  const response = await fetch(`${TMDB_API}${pathname}`, {
    headers: {
      Authorization: `Bearer ${requiredToken()}`,
      accept: 'application/json'
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.status_message || `TMDB request failed (${response.status}).`);
  }
  return data;
}

function localDate(daysAhead) {
  const value = new Date();
  value.setDate(value.getDate() + daysAhead);
  return value.toISOString();
}

function languageName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code;
  } catch (error) {
    return code || 'Multiple';
  }
}

async function removeFictionalDemoMovies() {
  const batch = db.batch();
  DEMO_MOVIE_IDS.forEach(movieId => {
    batch.delete(db.collection('movies').doc(movieId));
    SHOW_TEMPLATES.forEach(template => {
      batch.delete(db.collection('shows').doc(`${movieId}-${template.suffix}`));
    });
  });
  await batch.commit();
}

async function createShows(movieId, now) {
  for (const template of SHOW_TEMPLATES) {
    const reference = db.collection('shows').doc(`${movieId}-${template.suffix}`);
    const existing = await reference.get();
    const data = {
      movieId,
      theatre: template.theatre,
      auditorium: template.auditorium,
      format: template.format,
      date: localDate(template.daysAhead),
      time: template.time,
      price: template.price,
      source: 'screenify-demo-showtime',
      updatedAt: now
    };
    if (existing.exists) {
      await reference.set(data, { merge: true });
    } else {
      await reference.set({
        ...data,
        seats: Array(40).fill(0),
        createdAt: now
      });
    }
  }
}

async function syncMovies() {
  const limit = Math.min(Math.max(Number(process.env.TMDB_MOVIE_LIMIT) || 12, 1), 20);
  const nowPlaying = await tmdb('/movie/now_playing?language=en-IN&region=IN&page=1');
  const candidates = nowPlaying.results
    .filter(movie => movie.poster_path)
    .slice(0, limit);

  if (!candidates.length) {
    throw new Error('TMDB returned no now-playing movies with posters for India.');
  }

  await removeFictionalDemoMovies();
  const now = new Date().toISOString();

  for (const item of candidates) {
    const detail = await tmdb(`/movie/${item.id}?language=en-IN`);
    const movieId = `tmdb-${item.id}`;
    const movie = {
      title: detail.title,
      poster: `${TMDB_IMAGE}${detail.poster_path}`,
      duration: detail.runtime || 120,
      rating: Math.round(Number(detail.vote_average || 0) * 10) / 10,
      genre: detail.genres.map(genre => genre.name).slice(0, 2).join(' / ') || 'Movie',
      language: languageName(detail.original_language),
      certificate: 'UA',
      synopsis: detail.overview || 'Now playing in cinemas.',
      releaseDate: detail.release_date || '',
      tmdbId: detail.id,
      source: 'tmdb',
      updatedAt: now
    };
    await db.collection('movies').doc(movieId).set(
      { ...movie, createdAt: now },
      { merge: true }
    );
    await createShows(movieId, now);
    console.log(`Imported: ${movie.title}`);
  }

  console.log(`Imported ${candidates.length} real now-playing movies from TMDB for region IN.`);
  console.log('Showtimes and seat inventory are Screenify demo listings, not live theatre availability.');
}

syncMovies().catch(error => {
  console.error('TMDB movie import failed:', error.message);
  process.exitCode = 1;
});
