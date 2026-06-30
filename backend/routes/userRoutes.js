const crypto = require('crypto');
const express = require('express');
const { FieldValue } = require('firebase-admin/firestore');
const { db, documentData } = require('../lib/firebase');
const { RequestError, optionalString, requiredString } = require('../lib/validators');

const router = express.Router();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: crypto.scryptSync(password, salt, 64).toString('hex')
  };
}

function userDocumentId(email) {
  return crypto.createHash('sha256').update(email).digest('hex');
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, wishlist: user.wishlist || [] };
}

router.post('/register', async (req, res, next) => {
  try {
    const body = req.body || {};
    const name = optionalString(body.name, '', 80);
    const email = requiredString(body.email, 'Email').toLowerCase();
    const password = String(body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new RequestError('Enter a valid email address.');
    }
    if (password.length < 8) {
      throw new RequestError('Password must be at least 8 characters long.');
    }

    const reference = db.collection('users').doc(userDocumentId(email));
    const createdUser = await db.runTransaction(async transaction => {
      const existing = await transaction.get(reference);
      if (existing.exists) {
        throw new RequestError('An account with this email already exists.', 409);
      }
      const { salt, hash } = hashPassword(password);
      const user = {
        name,
        email,
        wishlist: [],
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      transaction.create(reference, user);
      return { _id: reference.id, ...user };
    });
    return res.status(201).json({ message: 'Account created successfully.', user: publicUser(createdUser) });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const reference = db.collection('users').doc(userDocumentId(email));
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const user = documentData(snapshot);
    const attempt = Buffer.from(hashPassword(password, user.passwordSalt).hash, 'hex');
    const stored = Buffer.from(user.passwordHash, 'hex');
    const valid = attempt.length === stored.length && crypto.timingSafeEqual(attempt, stored);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    return res.json({ message: 'Welcome back.', user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/users/:email/bookings', async (req, res, next) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const snapshot = await db.collection('bookings')
      .where('customerEmail', '==', email)
      .get();
    const bookings = await Promise.all(snapshot.docs.map(async doc => {
      const booking = documentData(doc);
      const [movieSnapshot, showSnapshot] = await Promise.all([
        db.collection('movies').doc(booking.movieId).get(),
        db.collection('shows').doc(booking.showId).get()
      ]);
      return {
        ...booking,
        movieId: movieSnapshot.exists ? documentData(movieSnapshot) : booking.movieId,
        showId: showSnapshot.exists ? documentData(showSnapshot) : booking.showId
      };
    }));
    bookings.sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    return res.json(bookings);
  } catch (error) {
    return next(error);
  }
});

router.get('/users/:email/wishlist', async (req, res, next) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const snapshot = await db.collection('users').doc(userDocumentId(email)).get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const user = documentData(snapshot);
    const movieIds = Array.isArray(user.wishlist) ? user.wishlist : [];
    const movies = await Promise.all(movieIds.map(async movieId => {
      const movie = await db.collection('movies').doc(movieId).get();
      return movie.exists ? documentData(movie) : null;
    }));
    return res.json(movies.filter(Boolean));
  } catch (error) {
    return next(error);
  }
});

router.post('/users/:email/wishlist', async (req, res, next) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const movieId = requiredString(req.body?.movieId, 'Movie');
    const reference = db.collection('users').doc(userDocumentId(email));
    const [userSnapshot, movieSnapshot] = await Promise.all([
      reference.get(),
      db.collection('movies').doc(movieId).get()
    ]);
    if (!userSnapshot.exists) {
      return res.status(404).json({ message: 'User not found.' });
    }
    if (!movieSnapshot.exists) {
      return res.status(404).json({ message: 'Movie not found.' });
    }
    await reference.update({ wishlist: FieldValue.arrayUnion(movieId), updatedAt: new Date().toISOString() });
    return res.json({ message: 'Added to wishlist.', movie: documentData(movieSnapshot) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/users/:email/wishlist/:movieId', async (req, res, next) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    const reference = db.collection('users').doc(userDocumentId(email));
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      return res.status(404).json({ message: 'User not found.' });
    }
    await reference.update({ wishlist: FieldValue.arrayRemove(req.params.movieId), updatedAt: new Date().toISOString() });
    return res.json({ message: 'Removed from wishlist.' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
