const { request, save, load, moviePoster, movieBackdrop, bindPosterFallback, setMessage } = window.Screenify;
const cities = ['Indore', 'Bhopal', 'Jaipur', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Bengaluru', 'Chennai', 'Kolkata'];
let movies = [];
let slideIndex = 0;
let slideTimer;
let activeGenre = 'All';
let activeCategory = 'All';
const categories = ['All', 'Bollywood', 'South Indian', 'Hollywood', 'Web Series', 'Thriller'];
const user = load('screenifyUser');
let wishlist = new Set(user?.wishlist || []);

const movieList = document.getElementById('movieList');
const movieMessage = document.getElementById('movieMessage');
const slides = document.getElementById('slides');

function chooseMovie(movie) {
  save('selectedMovie', movie);
  window.location.href = `movie.html?id=${movie._id}`;
}

function movieCard(movie) {
  const card = document.createElement('article');
  card.className = 'movie-card';

  const image = document.createElement('img');
  image.src = moviePoster(movie);
  image.alt = `${movie.title} poster`;
  image.loading = 'lazy';
  bindPosterFallback(image, movie.title, movie.genre);

  const badge = document.createElement('span');
  badge.className = 'movie-badge';
  badge.textContent = movie.catalogueTag || (movie.releaseDate ? 'New release' : 'Now showing');

  const wishlistButton = document.createElement('button');
  wishlistButton.className = `wishlist-button ${wishlist.has(movie._id) ? 'active' : ''}`;
  wishlistButton.type = 'button';
  wishlistButton.textContent = wishlist.has(movie._id) ? '♥' : '♡';
  wishlistButton.setAttribute('aria-label', `${wishlist.has(movie._id) ? 'Remove from' : 'Add to'} wishlist`);
  wishlistButton.addEventListener('click', event => {
    event.stopPropagation();
    toggleWishlist(movie, wishlistButton);
  });

  const title = document.createElement('h3');
  title.textContent = movie.title;
  const details = document.createElement('p');
  details.textContent = `${movieCategory(movie)} | ${movie.genre} | ${movie.language || 'Hindi'} | ${movie.duration} min`;
  const rating = document.createElement('span');
  rating.className = 'rating';
  rating.textContent = `${Number(movie.rating || 0).toFixed(1)}/10 audience score`;
  const button = document.createElement('button');
  button.className = 'button block';
  button.type = 'button';
  button.textContent = 'Book tickets';
  button.addEventListener('click', () => chooseMovie(movie));

  card.append(image, wishlistButton, badge, title, details, rating, button);
  return card;
}

async function toggleWishlist(movie, button) {
  if (!user?.email) {
    window.location.href = 'login.html';
    return;
  }
  const active = wishlist.has(movie._id);
  try {
    if (active) {
      await request(`/users/${encodeURIComponent(user.email)}/wishlist/${movie._id}`, { method: 'DELETE' });
      wishlist.delete(movie._id);
    } else {
      await request(`/users/${encodeURIComponent(user.email)}/wishlist`, {
        method: 'POST',
        body: JSON.stringify({ movieId: movie._id })
      });
      wishlist.add(movie._id);
    }
    const updatedUser = { ...user, wishlist: [...wishlist] };
    save('screenifyUser', updatedUser);
    button.classList.toggle('active', !active);
    button.textContent = active ? '♡' : '♥';
  } catch (error) {
    setMessage(movieMessage, error.message, 'error visible');
  }
}

function filteredMovies() {
  const query = document.getElementById('search').value.trim().toLowerCase();
  return movies.filter(movie => {
    const searchable = [
      movie.title,
      movie.genre,
      movie.category,
      movie.language,
      movie.certificate,
      movie.director,
      movie.synopsis,
      movie.about,
      ...(Array.isArray(movie.genres) ? movie.genres : []),
      ...(Array.isArray(movie.cast) ? movie.cast.map(person => person?.name || person) : [])
    ].map(value => String(value || '').toLowerCase());
    const matchesQuery = !query ||
      searchable.some(value => value.includes(query)) ||
      movieCategory(movie).toLowerCase().includes(query);
    const matchesGenre = activeGenre === 'All' || String(movie.genre || '') === activeGenre;
    const matchesCategory = activeCategory === 'All' || movieCategory(movie) === activeCategory;
    return matchesQuery && matchesGenre && matchesCategory;
  });
}

function movieCategory(movie) {
  if (movie.category) return movie.category;
  const language = String(movie.language || '').toLowerCase();
  if (['tamil', 'telugu', 'malayalam', 'kannada'].includes(language)) return 'South Indian';
  if (language === 'english') return 'Hollywood';
  return 'Bollywood';
}

function renderCategoryFilters() {
  const container = document.getElementById('categoryFilters');
  container.replaceChildren();
  categories.forEach(category => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter-chip category-chip ${category === activeCategory ? 'active' : ''}`;
    button.textContent = category;
    button.addEventListener('click', () => {
      activeCategory = category;
      activeGenre = 'All';
      renderCategoryFilters();
      renderGenreFilters();
      renderMovies(filteredMovies());
    });
    container.appendChild(button);
  });
}

function renderGenreFilters() {
  const container = document.getElementById('genreFilters');
  const source = activeCategory === 'All' ? movies : movies.filter(movie => movieCategory(movie) === activeCategory);
  const genres = ['All', ...new Set(source.map(movie => movie.genre).filter(Boolean))];
  container.replaceChildren();
  genres.forEach(genre => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter-chip ${genre === activeGenre ? 'active' : ''}`;
    button.textContent = genre;
    button.addEventListener('click', () => {
      activeGenre = genre;
      renderGenreFilters();
      renderMovies(filteredMovies());
    });
    container.appendChild(button);
  });
}

function renderMovies(list) {
  movieList.replaceChildren();
  const query = document.getElementById('search').value.trim();
  document.getElementById('movieCount').textContent = query
    ? `${list.length} result${list.length === 1 ? '' : 's'} for "${query}"`
    : `${list.length} movie${list.length === 1 ? '' : 's'} available`;

  if (!list.length) {
    setMessage(movieMessage, query ? 'No movies match your search. Try title, language, genre or actor name.' : 'No movies match this filter.', 'visible');
    return;
  }

  movieMessage.className = 'notice';
  list.forEach(movie => movieList.appendChild(movieCard(movie)));
}

function renderSlides() {
  slides.replaceChildren();
  movies.slice(0, 3).forEach(movie => {
    const slide = document.createElement('article');
    slide.className = 'slide';
    slide.style.backgroundImage = `linear-gradient(90deg, rgba(8,10,20,.94), rgba(8,10,20,.25)), url("${movieBackdrop(movie)}")`;

    const content = document.createElement('div');
    content.className = 'slide-content';
    const label = document.createElement('p');
    label.className = 'eyebrow';
    label.textContent = 'Featured release';
    const title = document.createElement('h2');
    title.textContent = movie.title;
    const details = document.createElement('p');
    details.textContent = `${movie.genre} | ${movie.language || 'Hindi'} | ${movie.duration} min`;
    const meta = document.createElement('div');
    meta.className = 'hero-meta';
    meta.innerHTML = `<span>${Number(movie.rating || 0).toFixed(1)}/10</span><span>${movie.certificate || 'UA'}</span><span>From ${movie.language || 'Hindi'} cinema</span>`;
    const button = document.createElement('button');
    button.className = 'button';
    button.textContent = 'Book now';
    button.addEventListener('click', () => chooseMovie(movie));
    content.append(label, title, details, meta, button);
    slide.appendChild(content);
    slides.appendChild(slide);
  });
  showSlide(0);
}

function showSlide(next) {
  const count = slides.children.length;
  if (!count) return;
  slideIndex = (next + count) % count;
  slides.style.transform = `translateX(-${slideIndex * 100}%)`;
}

async function loadMovies() {
  try {
    movies = await request('/movies');
    renderCategoryFilters();
    renderGenreFilters();
    renderMovies(filteredMovies());
    renderSlides();
    if (!movies.length) {
      setMessage(movieMessage, 'No shows are listed yet. Run the demo seed command to load the catalogue.', 'visible');
    }
  } catch (error) {
    setMessage(movieMessage, error.message, 'error visible');
  }
}

function renderCities(query = '') {
  const cityList = document.getElementById('cityList');
  cityList.replaceChildren();
  cities.filter(city => city.toLowerCase().includes(query.toLowerCase())).forEach(city => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = city;
    button.addEventListener('click', () => {
      localStorage.setItem('screenifyCity', city);
      document.getElementById('selectedCity').textContent = city;
      document.getElementById('cityModal').close();
    });
    cityList.appendChild(button);
  });
}

document.getElementById('search').addEventListener('input', event => {
  renderMovies(filteredMovies());
  renderSearchSuggestions(event.target.value);
});
document.getElementById('search').addEventListener('focus', event => renderSearchSuggestions(event.target.value));
document.addEventListener('click', event => {
  if (!event.target.closest('.search-box')) {
    document.getElementById('searchSuggestions').classList.add('hidden');
  }
});
document.getElementById('openCity').addEventListener('click', () => {
  renderCities();
  document.getElementById('cityModal').showModal();
});
document.getElementById('citySearch').addEventListener('input', event => renderCities(event.target.value));
document.getElementById('previousSlide').addEventListener('click', () => showSlide(slideIndex - 1));
document.getElementById('nextSlide').addEventListener('click', () => showSlide(slideIndex + 1));

const city = localStorage.getItem('screenifyCity');
if (city) document.getElementById('selectedCity').textContent = city;
if (user) {
  const accountButton = document.getElementById('accountButton');
  accountButton.textContent = user.name || 'Dashboard';
  accountButton.href = 'dashboard.html';
}

async function refreshWishlist() {
  if (!user?.email) return;
  try {
    const movies = await request(`/users/${encodeURIComponent(user.email)}/wishlist`);
    wishlist = new Set(movies.map(movie => movie._id));
    save('screenifyUser', { ...user, wishlist: [...wishlist] });
  } catch (error) {
    wishlist = new Set(user?.wishlist || []);
  }
}

function renderSearchSuggestions(query = '') {
  const box = document.getElementById('searchSuggestions');
  const value = query.trim().toLowerCase();
  if (!value) {
    box.classList.add('hidden');
    return;
  }
  const suggestions = movies
    .filter(movie => [
      movie.title,
      movie.genre,
      movie.language,
      movie.category
    ].some(item => String(item || '').toLowerCase().includes(value)))
    .slice(0, 6);
  box.replaceChildren();
  suggestions.forEach(movie => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = movie.title;
    button.addEventListener('click', () => {
      document.getElementById('search').value = movie.title;
      box.classList.add('hidden');
      renderMovies(filteredMovies());
    });
    box.appendChild(button);
  });
  box.classList.toggle('hidden', !suggestions.length);
}

refreshWishlist().finally(loadMovies);
slideTimer = window.setInterval(() => showSlide(slideIndex + 1), 5000);
window.addEventListener('pagehide', () => window.clearInterval(slideTimer));
