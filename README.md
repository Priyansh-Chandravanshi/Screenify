# Screenify

Screenify is a full movie booking flow for discovering movies, selecting a show and seats, completing demo checkout, and displaying a printable ticket.

## Features

- Responsive movie catalogue, featured banner, search, city selection and Netflix/BookMyShow-style movie detail views
- Theatre/date show selection and live 40-seat availability from Cloud Firestore
- Firestore transaction that prevents two users from buying the same seats
- Demo checkout validation and confirmed booking reference ticket (no real payment gateway)
- Registration/login with `scrypt` password hashing
- Structured API errors, health endpoint and protected catalogue-write routes
- TMDB now-playing import for real current movie titles, trailers, cast, director, genre, language, runtime, rating, posters and backdrops
- Email ticket delivery after booking confirmation through configurable SMTP

## Firebase Setup

1. Create a Firebase project at <https://console.firebase.google.com/>.
2. In `Build > Firestore Database`, create a Firestore database.
3. In `Project settings > Service accounts`, generate a new private key JSON file.
4. Keep that JSON outside the repo, then copy `backend/.env.example` settings into `backend/.env` and replace:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\secure-path\screenify-firebase-adminsdk.json
FIREBASE_PROJECT_ID=your-firebase-project-id
ADMIN_API_KEY=replace-with-a-private-admin-key
PORT=5000
```

Never commit the service account JSON or `.env` file.

## Real Movies With TMDB

Movie metadata can be imported from TMDB's India now-playing catalogue. Theatre names, showtimes and seats remain Screenify demo inventory; this project does not integrate a live cinema ticket inventory provider.

1. Create a free TMDB account and request an API Read Access Token at <https://www.themoviedb.org/settings/api>.
2. Add the token to `backend/.env`:

```env
TMDB_ACCESS_TOKEN=paste-your-tmdb-api-read-access-token-here
TMDB_MOVIE_LIMIT=12
```

3. Import the current movie catalogue:

```powershell
cd backend
npm run sync:movies
```

The importer removes the four fictional starter movies and loads current now-playing titles for region `IN`, while preserving seats on already-created imported shows.
If `TMDB_ACCESS_TOKEN` is still the placeholder value, the same command seeds a curated real-release fallback catalogue with demo showtimes so the app is usable while you arrange a TMDB token.

Refresh real TMDB trailers, cast, director, genre, language, runtime, rating, posters, wide banners, crew and profile photos for the movies already in Firestore:

```powershell
cd backend
npm run update:tmdb-media
```

Add one custom movie with demo shows:

```powershell
cd backend
copy scripts\movie.example.json scripts\my-movie.json
# edit scripts\my-movie.json
npm run add:movie -- scripts\my-movie.json
```

If TMDB is unavailable, update official poster URLs manually:

```powershell
cd backend
copy scripts\posters.example.json scripts\posters.json
# edit scripts\posters.json and paste direct image URLs
npm run update:posters -- scripts\posters.json
```

To get a direct image URL, open the poster image in a browser, right-click the image, choose "Copy image address", and paste that URL into `poster`.

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Email Tickets

After checkout confirms a booking, Screenify emails an HTML ticket to the customer address entered on the payment page. If email delivery is unavailable, the booking remains confirmed and the on-screen ticket is still displayed.

For Gmail:

1. Enable 2-Step Verification on the Google account used to send tickets.
2. Create an App Password at <https://myaccount.google.com/apppasswords>.
3. Add mail configuration to `backend/.env`:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-16-character-app-password
MAIL_FROM=Screenify <your-email@gmail.com>
```

Do not use your regular Gmail password and do not commit `.env`.

Check SMTP credentials:

```powershell
cd backend
npm run check:mail
```

For Gmail, `EAUTH 535 Username and Password not accepted` means the Gmail address/app password in `.env` is invalid or app-password access is not enabled for that account.
If SMTP fails during booking, Screenify now saves a local HTML email preview in `backend/mail-previews` and shows an "Open preview" link on the ticket page. This keeps demos usable while Gmail credentials are being fixed.

## Run Locally

```powershell
cd backend
npm install
npm run seed
npm start
```

Open `http://localhost:5000`. The Express server serves both the REST API and frontend.

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service check |
| GET | `/api/movies` | Movie catalogue |
| GET | `/api/movies/:id` | Movie details |
| GET | `/api/shows/:movieId` | Shows for a movie |
| GET | `/api/shows/show/:showId` | Seat inventory and show details |
| POST | `/api/book` | Confirm available seats and create a booking |
| GET | `/api/bookings/:reference` | Retrieve a booking |
| POST | `/api/register` | Create an account |
| POST | `/api/login` | Sign in |

`POST /api/movies` and `POST /api/shows` require an `x-admin-key` header matching `ADMIN_API_KEY`.

## Checks

```powershell
cd backend
npm run check
```
 
