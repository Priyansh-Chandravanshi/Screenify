const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { db } = require('../lib/firebase');
const SEAT_COUNT = 120;

const movies = [
  {
    title: 'Midnight Runway',
    duration: 132,
    rating: 8.7,
    genre: 'Action / Thriller',
    language: 'Hindi',
    certificate: 'UA 13+',
    synopsis: 'A grounded pilot races through one night to expose a city-wide conspiracy.',
    poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=80'
  },
  {
    title: 'A Sky Full of Notes',
    duration: 118,
    rating: 9.1,
    genre: 'Romance / Music',
    language: 'Hindi',
    certificate: 'U',
    synopsis: 'Two musicians meet on a railway platform and chase a song across India.',
    poster: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=80'
  },
  {
    title: 'Orbit Seven',
    duration: 145,
    rating: 8.4,
    genre: 'Sci-Fi / Adventure',
    language: 'English',
    certificate: 'UA 13+',
    synopsis: 'A repair crew discovers a signal that could change humanity forever.',
    poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=700&q=80'
  },
  {
    title: 'The Last Recipe',
    duration: 106,
    rating: 8.2,
    genre: 'Drama / Family',
    language: 'Hindi',
    certificate: 'U',
    synopsis: 'An ambitious chef returns home and rediscovers the flavours that raised her.',
    poster: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=700&q=80'
  }
];

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seed() {
  for (const item of movies) {
    const id = slug(item.title);
    const movieReference = db.collection('movies').doc(id);
    const now = new Date().toISOString();
    await movieReference.set({ ...item, updatedAt: now, createdAt: now }, { merge: true });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const followingDay = new Date();
    followingDay.setDate(followingDay.getDate() + 2);
    const listings = [
      { suffix: 'pvr-morning', theatre: 'PVR INOX Nexus Mall', auditorium: 'Audi 2', format: 'IMAX', date: tomorrow, time: '10:30 AM', price: 280 },
      { suffix: 'pvr-evening', theatre: 'PVR INOX Nexus Mall', auditorium: 'Audi 2', format: 'IMAX', date: tomorrow, time: '07:15 PM', price: 340 },
      { suffix: 'inox-evening', theatre: 'INOX Central', auditorium: 'Screen 4', format: '2D', date: followingDay, time: '04:00 PM', price: 220 },
      { suffix: 'cinepolis-late', theatre: 'Cinepolis Celebration Mall', auditorium: 'Audi 1', format: 'Dolby Atmos', date: followingDay, time: '09:45 PM', price: 310 }
    ];

    for (const listing of listings) {
      const showReference = db.collection('shows').doc(`${id}-${listing.suffix}`);
      const existing = await showReference.get();
      if (!existing.exists) {
        await showReference.set({
          movieId: id,
          theatre: listing.theatre,
          auditorium: listing.auditorium,
          format: listing.format,
          date: listing.date.toISOString(),
          time: listing.time,
          price: listing.price,
          seats: Array(SEAT_COUNT).fill(0),
          createdAt: now,
          updatedAt: now
        });
      }
    }
  }

  console.log('Demo movies and shows are ready in Cloud Firestore.');
}

seed().catch(error => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
});
