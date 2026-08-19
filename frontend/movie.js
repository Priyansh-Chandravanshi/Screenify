const { request, save, load, moviePoster, movieBackdrop, personPhoto, bindPosterFallback, setMessage } = window.Screenify;
const movieId = new URLSearchParams(window.location.search).get('id');
const message = document.getElementById('message');
let currentMovie;

async function loadMovie() {
  if (!movieId) {
    setMessage(message, 'Choose a movie from the home page first.', 'error visible centered');
    return;
  }

  try {
    const movie = await request(`/movies/${movieId}`);
    currentMovie = movie;
    save('selectedMovie', movie);
    const runtime = formatRuntime(movie.runtime || movie.duration);
    const genre = genreText(movie);
    const director = movieDirector(movie);
    const trailer = movieTrailer(movie);

    document.title = `${movie.title} | Screenify`;
    document.getElementById('catalogueTag').textContent = movie.catalogueTag || (movie.source === 'tmdb' ? 'TMDB pick' : 'Now showing');
    document.getElementById('title').textContent = movie.title;
    document.getElementById('details').textContent = [
      movie.certificate || 'UA',
      genre,
      movie.language || 'Multiple',
      runtime,
      director ? `Directed by ${director}` : ''
    ].filter(Boolean).join(' | ');
    document.getElementById('ratingScore').textContent = `${Number(movie.rating || 0).toFixed(1)}/10`;
    document.getElementById('runtimeValue').textContent = runtime;
    document.getElementById('languageValue').textContent = movie.language || 'Multiple';
    document.getElementById('synopsis').textContent = movie.synopsis || 'Book the best seats for this screening.';
    document.getElementById('aboutMovie').textContent = movie.about || movie.synopsis || 'Book the best seats for this screening.';
    renderMovieChips(movie, genre, runtime);
    renderMovieFacts(movie, genre, runtime, director);
    renderPeople('castList', movie.cast);
    renderPeople('crewList', movie.crew);
    await loadReviews(movie);
    configureTrailer(trailer, movie.title);
    const image = document.getElementById('poster');
    image.src = moviePoster(movie);
    image.alt = `${movie.title} poster`;
    bindPosterFallback(image, movie.title, movie.genre);
    document.getElementById('movieBanner').style.backgroundImage = `url("${movieBackdrop(movie)}")`;
    document.getElementById('bookButton').addEventListener('click', () => {
      window.location.href = `shows.html?movieId=${movie._id}`;
    });
    message.className = 'notice';
    document.getElementById('movieBanner').classList.remove('hidden');
    document.getElementById('movieDeepDive').classList.remove('hidden');
    document.getElementById('reviewSection').classList.remove('hidden');
  } catch (error) {
    setMessage(message, error.message, 'error visible centered');
  }
}

function genreText(movie = {}) {
  if (Array.isArray(movie.genres) && movie.genres.length) {
    return movie.genres.filter(Boolean).slice(0, 4).join(' / ');
  }
  return movie.genre || 'Movie';
}

function formatRuntime(value) {
  const minutes = Number(value || 0);
  if (!minutes) return 'TBA';
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (!hours) return `${minutes} min`;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function releaseLabel(value) {
  if (!value) return 'TBA';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function movieDirector(movie = {}) {
  if (movie.director) return movie.director;
  const crew = Array.isArray(movie.crew) ? movie.crew.map(normalizePerson) : [];
  const director = crew.find(person => /\bDirector\b/i.test(person.role))
    || crew.find(person => /\bCreator\b/i.test(person.role));
  return director?.name || '';
}

function renderMovieChips(movie, genre, runtime) {
  const container = document.getElementById('movieChips');
  container.replaceChildren();
  [
    movie.certificate || 'UA',
    movie.category || 'Movie',
    genre,
    movie.language || 'Multiple',
    runtime
  ].filter(Boolean).forEach(value => {
    const chip = document.createElement('span');
    chip.textContent = value;
    container.appendChild(chip);
  });
}

function renderMovieFacts(movie, genre, runtime, director) {
  const container = document.getElementById('movieFacts');
  container.replaceChildren();
  const facts = [
    { label: 'Director', value: director || 'Details soon' },
    { label: 'Genre', value: genre },
    { label: 'Language', value: movie.language || 'Multiple' },
    { label: 'Runtime', value: runtime },
    { label: 'TMDB score', value: `${Number(movie.tmdbRating || movie.rating || 0).toFixed(1)}/10` },
    { label: 'Release', value: releaseLabel(movie.releaseDate) }
  ];
  facts.forEach(item => {
    const fact = document.createElement('div');
    const label = document.createElement('span');
    const value = document.createElement('strong');
    label.textContent = item.label;
    value.textContent = item.value;
    fact.append(label, value);
    container.appendChild(fact);
  });
}

function movieTrailer(movie = {}) {
  const trailer = movie.trailer && typeof movie.trailer === 'object' ? movie.trailer : {};
  const sourceUrl = trailer.url || trailer.trailerUrl || movie.trailerUrl || '';
  const key = trailer.key || youtubeKey(sourceUrl);
  const site = trailer.site || (key ? 'YouTube' : '');
  const url = sourceUrl || (key ? `https://www.youtube.com/watch?v=${key}` : '');
  const embedUrl = trailer.embedUrl || (key ? `https://www.youtube.com/embed/${key}` : '');
  return {
    name: trailer.name || 'Official trailer',
    site,
    key,
    url,
    embedUrl
  };
}

function youtubeKey(url) {
  const value = String(url || '');
  const match = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
  return match ? match[1] : '';
}

function configureTrailer(trailer, title) {
  const trailerButton = document.getElementById('trailerButton');
  const posterTrailerButton = document.getElementById('posterTrailerButton');
  const trailerTitle = document.getElementById('trailerTitle');
  const external = document.getElementById('trailerExternal');
  const hasTrailer = Boolean(trailer.url || trailer.embedUrl);

  trailerButton.classList.toggle('hidden', !hasTrailer);
  posterTrailerButton.classList.toggle('hidden', !hasTrailer);
  if (!hasTrailer) return;

  trailerTitle.textContent = `${title} trailer`;
  trailerButton.href = trailer.url || '#';
  external.href = trailer.url || '#';
  external.classList.toggle('hidden', !trailer.url);
  trailerButton.addEventListener('click', openTrailer);
  posterTrailerButton.addEventListener('click', openTrailer);
}

function trailerEmbedUrl(value) {
  if (!value) return '';
  const separator = value.includes('?') ? '&' : '?';
  return `${value}${separator}autoplay=1&rel=0`;
}

function openTrailer(event) {
  const trailer = movieTrailer(currentMovie);
  if (!trailer.embedUrl && trailer.url) {
    if (event?.currentTarget?.tagName === 'BUTTON') {
      window.open(trailer.url, '_blank', 'noopener');
    }
    return;
  }

  event?.preventDefault();
  const modal = document.getElementById('trailerModal');
  document.getElementById('trailerFrame').src = trailerEmbedUrl(trailer.embedUrl);
  if (typeof modal.showModal === 'function') {
    modal.showModal();
  }
}

function closeTrailer() {
  const modal = document.getElementById('trailerModal');
  document.getElementById('trailerFrame').src = '';
  if (modal.open) modal.close();
}

function renderPeople(elementId, people = []) {
  const container = document.getElementById(elementId);
  container.replaceChildren();
  const entries = Array.isArray(people) && people.length ? people : [{ name: 'Details coming soon', role: 'Team' }];
  entries.slice(0, elementId === 'castList' ? 10 : 8).forEach(person => {
    const profile = normalizePerson(person);
    const card = document.createElement('div');
    card.className = 'person-card';
    const image = document.createElement('img');
    image.src = personPhoto(profile.photo) || avatar(profile.name, profile.role);
    image.alt = `${profile.name} photo`;
    const info = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = profile.name;
    const role = document.createElement('small');
    role.textContent = profile.role || 'Cast';
    info.append(name, role);
    card.append(image, info);
    container.appendChild(card);
  });
}

function renderReviews(reviews = [], fallbackRating = 8) {
  const container = document.getElementById('reviewList');
  container.replaceChildren();
  const entries = Array.isArray(reviews) && reviews.length ? reviews : [
    { name: 'Aarav', rating: fallbackRating || 8, text: 'Great big-screen experience and smooth booking.' },
    { name: 'Meera', rating: Math.min(10, Number(fallbackRating || 8) + 0.3), text: 'Loved the presentation, sound and seat selection flow.' },
    { name: 'Kabir', rating: Math.max(0, Number(fallbackRating || 8) - 0.2), text: 'A solid pick for a weekend watch.' }
  ];
  entries.slice(0, 3).forEach(review => {
    const card = document.createElement('article');
    card.className = 'review-card';
    const score = document.createElement('strong');
    score.textContent = `${Number(review.rating || fallbackRating || 8).toFixed(1)}/10`;
    const text = document.createElement('p');
    text.textContent = review.text || 'Loved the big-screen experience.';
    const name = document.createElement('span');
    name.textContent = review.name || 'Screenify user';
    card.append(score, text, name);
    container.appendChild(card);
  });
}

async function loadReviews(movie) {
  try {
    const reviews = await request(`/movies/${movie._id}/reviews`);
    renderReviews(reviews.length ? reviews : movie.reviews, movie.rating);
    if (reviews.length) {
      document.getElementById('ratingScore').textContent = `${Number(movie.rating || 0).toFixed(1)}/10`;
    }
  } catch (error) {
    renderReviews(movie.reviews, movie.rating);
  }
}

document.getElementById('reviewForm').addEventListener('submit', async event => {
  event.preventDefault();
  const user = load('screenifyUser');
  const reviewMessage = document.getElementById('reviewMessage');
  if (!user?.email) {
    setMessage(reviewMessage, 'Sign in before posting a review.', 'error visible');
    return;
  }
  try {
    const result = await request(`/movies/${movieId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        name: user.name || 'Screenify user',
        rating: Number(document.getElementById('reviewRating').value),
        text: document.getElementById('reviewText').value.trim()
      })
    });
    currentMovie.rating = result.averageRating;
    document.getElementById('ratingScore').textContent = `${Number(result.averageRating || 0).toFixed(1)}/10`;
    document.getElementById('reviewText').value = '';
    setMessage(reviewMessage, 'Review saved. Thanks for rating this movie.', 'visible');
    await loadReviews(currentMovie);
  } catch (error) {
    setMessage(reviewMessage, error.message, 'error visible');
  }
});

document.getElementById('closeTrailer').addEventListener('click', closeTrailer);
document.getElementById('trailerModal').addEventListener('click', event => {
  if (event.target.id === 'trailerModal') closeTrailer();
});
document.getElementById('trailerModal').addEventListener('close', () => {
  document.getElementById('trailerFrame').src = '';
});

function normalizePerson(person) {
  if (person && typeof person === 'object') {
    return {
      name: person.name || 'Unknown',
      role: person.role || '',
      photo: person.photo || person.profile || person.profile_path || person.profilePath || ''
    };
  }
  const [role, name] = String(person || 'Unknown').includes(':')
    ? String(person).split(':').map(value => value.trim())
    : ['', String(person || 'Unknown')];
  return { name: name || role || 'Unknown', role: name ? role : '', photo: '' };
}

function avatar(name, role = '') {
  const initials = String(name || 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'S';
  const seed = Array.from(String(name)).reduce((total, char) => total + char.charCodeAt(0), 0);
  const colors = [
    ['#e7335f', '#451225'],
    ['#0f9f7a', '#083b32'],
    ['#2563eb', '#101b43'],
    ['#f97316', '#3d1b07'],
    ['#7c3aed', '#251047']
  ];
  const [primary, dark] = colors[seed % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <rect width="160" height="160" rx="80" fill="${dark}"/>
    <circle cx="80" cy="58" r="34" fill="${primary}"/>
    <path d="M28 150c8-38 32-58 52-58s44 20 52 58" fill="${primary}" opacity=".82"/>
    <text x="80" y="91" text-anchor="middle" fill="#fff" font-family="Segoe UI, Arial, sans-serif" font-size="38" font-weight="900">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

loadMovie();
