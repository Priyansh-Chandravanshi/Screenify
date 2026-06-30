const express = require('express');
const { db, documentData } = require('../lib/firebase');

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = process.env.ADMIN_API_KEY;
  if (!key || req.get('x-admin-key') !== key) {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}

router.get('/admin/stats', requireAdmin, async (req, res, next) => {
  try {
    const [moviesSnapshot, usersSnapshot, bookingsSnapshot] = await Promise.all([
      db.collection('movies').get(),
      db.collection('users').get(),
      db.collection('bookings').get()
    ]);
    const bookings = bookingsSnapshot.docs.map(documentData);
    const revenue = bookings.reduce((total, booking) => total + Number(booking.amount || 0), 0);
    const ticketsSold = bookings.reduce((total, booking) => total + (booking.seats?.length || 0), 0);
    const movieCounts = bookings.reduce((counts, booking) => {
      counts[booking.movieId] = (counts[booking.movieId] || 0) + (booking.seats?.length || 0);
      return counts;
    }, {});
    const popularMovieId = Object.entries(movieCounts).sort((left, right) => right[1] - left[1])[0]?.[0] || '';
    let popularMovie = null;
    if (popularMovieId) {
      const movieSnapshot = await db.collection('movies').doc(popularMovieId).get();
      popularMovie = movieSnapshot.exists ? documentData(movieSnapshot) : { _id: popularMovieId, title: popularMovieId };
    }
    const monthlyRevenue = bookings.reduce((items, booking) => {
      const month = String(booking.createdAt || '').slice(0, 7) || 'unknown';
      items[month] = (items[month] || 0) + Number(booking.amount || 0);
      return items;
    }, {});

    return res.json({
      movies: moviesSnapshot.size,
      users: usersSnapshot.size,
      bookings: bookingsSnapshot.size,
      revenue,
      ticketsSold,
      popularMovie,
      monthlyRevenue: Object.entries(monthlyRevenue).map(([month, amount]) => ({ month, amount }))
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
