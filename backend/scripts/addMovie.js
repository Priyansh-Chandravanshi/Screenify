const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { db } = require('../lib/firebase');
const SEAT_COUNT = 120;

const SHOW_TEMPLATES = [
  { suffix: 'pvr-morning', theatre: 'PVR INOX Nexus Mall', auditorium: 'Audi 2', format: '2D', daysAhead: 0, time: '10:30 AM', price: 220 },
  { suffix: 'pvr-prime', theatre: 'PVR INOX Nexus Mall', auditorium: 'Audi 5', format: 'IMAX', daysAhead: 0, time: '07:15 PM', price: 380 },
  { suffix: 'inox-evening', theatre: 'INOX Central', auditorium: 'Screen 4', format: '2D', daysAhead: 1, time: '04:00 PM', price: 260 },
  { suffix: 'cinepolis-late', theatre: 'Cinepolis Celebration Mall', auditorium: 'Audi 1', format: 'Dolby Atmos', daysAhead: 2, time: '09:45 PM', price: 310 }
];

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function localDate(daysAhead) {
  const value = new Date();
  value.setDate(value.getDate() + daysAhead);
  return value.toISOString();
}

async function addShows(movieId, now) {
  for (const template of SHOW_TEMPLATES) {
    const reference = db.collection('shows').doc(`${movieId}-${template.suffix}`);
    const existing = await reference.get();
    if (existing.exists) continue;
    await reference.set({
      movieId,
      theatre: template.theatre,
      auditorium: template.auditorium,
      format: template.format,
      date: localDate(template.daysAhead),
      time: template.time,
      price: template.price,
      seats: Array(SEAT_COUNT).fill(0),
      source: 'manual-demo-showtime',
      createdAt: now,
      updatedAt: now
    });
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error('Usage: node scripts/addMovie.js path/to/movie.json');
  }

  const movie = JSON.parse(await fs.readFile(path.resolve(filePath), 'utf8'));
  if (!movie.title) {
    throw new Error('Movie JSON must include a title.');
  }

  const id = movie.id || `manual-${slug(movie.title)}`;
  const now = new Date().toISOString();
  await db.collection('movies').doc(id).set({
    title: movie.title,
    poster: movie.poster || '',
    duration: Number(movie.duration) || 120,
    rating: Number(movie.rating) || 8,
    category: movie.category || 'Bollywood',
    genre: movie.genre || 'Drama',
    language: movie.language || 'Hindi',
    certificate: movie.certificate || 'UA',
    synopsis: movie.synopsis || 'Now showing in cinemas.',
    about: movie.about || movie.synopsis || 'Now showing in cinemas.',
    cast: normalizePeople(movie.cast),
    crew: normalizePeople(movie.crew),
    reviews: normalizeReviews(movie.reviews),
    platform: movie.platform || '',
    trailerUrl: movie.trailerUrl || '',
    releaseDate: movie.releaseDate || '',
    catalogueTag: movie.catalogueTag || 'Now showing',
    source: 'manual',
    createdAt: now,
    updatedAt: now
  }, { merge: true });
  await addShows(id, now);
  console.log(`Movie added with demo shows: ${movie.title}`);
}

function normalizePeople(people) {
  if (!Array.isArray(people)) return [];
  return people.map(person => {
    if (person && typeof person === 'object') {
      return {
        name: String(person.name || 'Unknown'),
        role: String(person.role || ''),
        photo: String(person.photo || '')
      };
    }
    return { name: String(person), role: '', photo: '' };
  });
}

function normalizeReviews(reviews) {
  if (!Array.isArray(reviews)) return [];
  return reviews.map(review => ({
    name: String(review.name || 'Screenify user'),
    rating: Number(review.rating) || 8,
    text: String(review.text || 'Loved the big-screen experience.')
  }));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
