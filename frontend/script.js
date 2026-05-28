const { request, save, load, poster, setMessage } = window.Screenify;
const cities = ['Indore', 'Bhopal', 'Jaipur', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Bengaluru', 'Chennai', 'Kolkata'];
let movies = [];
let slideIndex = 0;
let slideTimer;

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
  image.src = poster(movie.poster);
  image.alt = `${movie.title} poster`;
  image.loading = 'lazy';

  const title = document.createElement('h3');
  title.textContent = movie.title;
  const details = document.createElement('p');
  details.textContent = `${movie.genre} | ${movie.duration} min`;
  const rating = document.createElement('span');
  rating.className = 'rating';
  rating.textContent = `Rating ${Number(movie.rating || 0).toFixed(1)}/10`;
  const button = document.createElement('button');
  button.className = 'button block';
  button.type = 'button';
  button.textContent = 'Book tickets';
  button.addEventListener('click', () => chooseMovie(movie));

  card.append(image, title, details, rating, button);
  return card;
}

function renderMovies(list) {
  movieList.replaceChildren();
  document.getElementById('movieCount').textContent = `${list.length} movies`;

  if (!list.length) {
    setMessage(movieMessage, 'No movies match your search.', 'visible');
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
    slide.style.backgroundImage = `linear-gradient(90deg, rgba(8,10,20,.94), rgba(8,10,20,.25)), url("${poster(movie.poster)}")`;

    const content = document.createElement('div');
    content.className = 'slide-content';
    const label = document.createElement('p');
    label.className = 'eyebrow';
    label.textContent = 'Featured release';
    const title = document.createElement('h2');
    title.textContent = movie.title;
    const details = document.createElement('p');
    details.textContent = `${movie.genre} | ${movie.language} | Rating ${movie.rating}/10`;
    const button = document.createElement('button');
    button.className = 'button';
    button.textContent = 'Book now';
    button.addEventListener('click', () => chooseMovie(movie));
    content.append(label, title, details, button);
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
    renderMovies(movies);
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
  const query = event.target.value.trim().toLowerCase();
  renderMovies(movies.filter(movie =>
    movie.title.toLowerCase().includes(query) || movie.genre.toLowerCase().includes(query)
  ));
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
const user = load('screenifyUser');
if (user) document.getElementById('accountButton').textContent = user.name || 'Account';

loadMovies();
slideTimer = window.setInterval(() => showSlide(slideIndex + 1), 5000);
window.addEventListener('pagehide', () => window.clearInterval(slideTimer));
