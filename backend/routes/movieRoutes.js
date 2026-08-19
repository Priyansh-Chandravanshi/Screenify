const express = require('express');
const { db, documentData } = require('../lib/firebase');
const { RequestError, numberInRange, optionalString, requiredString } = require('../lib/validators');

const router = express.Router();
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w780';
const TMDB_PROFILE = 'https://image.tmdb.org/t/p/w185';

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
    poster: optionalString(resolvePoster(body.poster || body.posterUrl || body.poster_path || body.posterPath || body.tmdbPosterPath)),
    backdrop: optionalString(resolveBackdrop(body.backdrop || body.backdropUrl || body.backdrop_path || body.backdropPath || body.tmdbBackdropPath)),
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

function resolvePoster(value) {
  const poster = String(value || '').trim();
  if (!poster) return '';
  if (/^https?:\/\//i.test(poster) || poster.startsWith('data:') || poster.startsWith('public/')) {
    return poster;
  }
  if (poster.startsWith('/')) {
    return `${TMDB_IMAGE}${poster}`;
  }
  return poster;
}

function resolveBackdrop(value) {
  const backdrop = String(value || '').trim();
  if (!backdrop) return '';
  if (/^https?:\/\//i.test(backdrop) || backdrop.startsWith('data:') || backdrop.startsWith('public/')) {
    return backdrop;
  }
  if (backdrop.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w1280${backdrop}`;
  }
  return backdrop;
}

function resolveProfile(value) {
  const profile = String(value || '').trim();
  if (!profile) return '';
  if (/^https?:\/\//i.test(profile) || profile.startsWith('data:') || profile.startsWith('public/')) {
    return profile;
  }
  if (profile.startsWith('/')) {
    return `${TMDB_PROFILE}${profile}`;
  }
  return profile;
}

function personPayload(value) {
  if (value && typeof value === 'object') {
    return {
      name: optionalString(value.name, 'Unknown', 120),
      role: optionalString(value.role, '', 120),
      photo: optionalString(resolveProfile(value.photo || value.profile || value.profile_path || value.profilePath), '', 500)
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

router.get('/movies/:id/reviews', async (req, res, next) => {
  try {
    const snapshot = await db.collection('reviews')
      .where('movieId', '==', req.params.id)
      .get();
    const reviews = snapshot.docs
      .map(documentData)
      .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    return res.json(reviews);
  } catch (error) {
    return next(error);
  }
});

router.post('/movies/:id/reviews', async (req, res, next) => {
  try {
    const movieReference = db.collection('movies').doc(req.params.id);
    const movieSnapshot = await movieReference.get();
    if (!movieSnapshot.exists) {
      return res.status(404).json({ message: 'Movie not found.' });
    }
    const body = req.body || {};
    const email = requiredString(body.email, 'Email', 160).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new RequestError('Enter a valid email address.');
    }
    const review = {
      movieId: req.params.id,
      name: optionalString(body.name, 'Screenify user', 80),
      email,
      rating: numberInRange(body.rating, 'Rating', 1, 10),
      text: optionalString(body.text, 'Loved the big-screen experience.', 400),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const reviewId = `${req.params.id}_${email.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    await db.collection('reviews').doc(reviewId).set(review, { merge: true });

    const reviewSnapshot = await db.collection('reviews').where('movieId', '==', req.params.id).get();
    const ratings = reviewSnapshot.docs.map(doc => Number(doc.data().rating || 0)).filter(Boolean);
    const averageRating = ratings.length
      ? Number((ratings.reduce((total, value) => total + value, 0) / ratings.length).toFixed(1))
      : Number(movieSnapshot.data().rating || 0);
    await movieReference.update({
      rating: averageRating,
      reviewCount: ratings.length,
      updatedAt: new Date().toISOString()
    });

    return res.status(201).json({
      message: 'Review saved.',
      review: { _id: reviewId, ...review },
      averageRating,
      reviewCount: ratings.length
    });
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
