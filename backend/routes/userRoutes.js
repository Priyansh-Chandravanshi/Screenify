const crypto = require('crypto');
const express = require('express');
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
  return { id: user._id, name: user.name, email: user.email };
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

module.exports = router;
