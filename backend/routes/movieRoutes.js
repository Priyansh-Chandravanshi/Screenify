const express = require('express');
const { db, documentData } = require('../lib/firebase');
const { numberInRange, optionalString, requiredString } = require('../lib/validators');

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.get('x-admin-key') !== key) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

function moviePayload(body = {}) {
  const cast = Array.isArray(body.cast) ? body.cast.slice(0, 12) : [];
  const crew = Array.isArray(body.crew) ? body.crew.slice(0, 12) : [];
  const reviews = Array.isArray(body.reviews) ? body.reviews.slice(0, 6) : [];

  return {
    title: requiredString(body.title, 'Title'),
    poster: optionalString(body.poster),
    duration: numberInRange(body.duration, 'Duration', 1, 500),
    rating: numberInRange(body.rating, 'Rating', 0, 10, 8),
    category: optionalString(body.category, 'Bollywood', 40),
    genre: optionalString(body.genre, 'Drama', 80),
    language: optionalString(body.language, 'Hindi', 50),
    certificate: optionalString(body.certificate, 'UA', 20),
    platform: optionalString(body.platform, '', 80),
    trailerUrl: optionalString(body.trailerUrl, '', 500),
    about: optionalString(body.about || body.synopsis, '', 1200),
    cast: cast.map(personPayload),
    crew: crew.map(personPayload),
    reviews: reviews.map(reviewPayload),
    synopsis: optionalString(body.synopsis)
  };
}

function personPayload(value) {
  if (value && typeof value === 'object') {
    return {
      name: optionalString(value.name, 'Unknown', 120),
      role: optionalString(value.role, '', 120),
      photo: optionalString(value.photo, '', 500)
    };
  }
  return { name: optionalString(value, 'Unknown', 120), role: '', photo: '' };
}

function reviewPayload(value) {
  return {
    name: optionalString(value?.name, 'Screenify user', 80),
    rating: numberInRange(value?.rating, 'Review rating', 0, 10, 8),
    text: optionalString(value?.text, 'Loved the big-screen experience.', 300)
  };
}

router.get('/movies', async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim().toLowerCase();
    const snapshot = await db.collection('movies').get();
    const movies = snapshot.docs
      .map(documentData)
      .filter(movie => !query || [
        movie.title,
        movie.genre,
        movie.category,
        movie.language,
        movie.certificate,
        movie.synopsis,
        movie.about,
        ...(Array.isArray(movie.cast) ? movie.cast.map(person => person?.name || person) : [])
      ].some(value => String(value || '').toLowerCase().includes(query)))
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    return res.json(movies);
  } catch (error) {
    return next(error);
  }
});

router.get('/movies/:id', async (req, res, next) => {
  try {
    const snapshot = await db.collection('movies').doc(req.params.id).get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'Movie not found.' });
    }
    return res.json(documentData(snapshot));
  } catch (error) {
    return next(error);
  }
});

router.post('/movies', requireAdmin, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    const movie = { ...moviePayload(req.body), createdAt: now, updatedAt: now };
    const reference = db.collection('movies').doc();
    await reference.set(movie);
    return res.status(201).json({ _id: reference.id, ...movie });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
