const { request, save, poster, setMessage } = window.Screenify;
const movieId = new URLSearchParams(window.location.search).get('id');
const message = document.getElementById('message');

async function loadMovie() {
  if (!movieId) {
    setMessage(message, 'Choose a movie from the home page first.', 'error visible centered');
    return;
  }

  try {
    const movie = await request(`/movies/${movieId}`);
    save('selectedMovie', movie);
    document.title = `${movie.title} | Screenify`;
    document.getElementById('title').textContent = movie.title;
    document.getElementById('details').textContent =
      `${movie.certificate} | ${movie.genre} | ${movie.language} | ${movie.duration} min | Rating ${movie.rating}/10`;
    document.getElementById('ratingScore').textContent = `${Number(movie.rating || 0).toFixed(1)}/10`;
    document.getElementById('synopsis').textContent = movie.synopsis || 'Book the best seats for this screening.';
    document.getElementById('aboutMovie').textContent = movie.about || movie.synopsis || 'Book the best seats for this screening.';
    renderPeople('castList', movie.cast);
    renderPeople('crewList', movie.crew);
    renderReviews(movie.reviews, movie.rating);
    const trailerButton = document.getElementById('trailerButton');
    if (movie.trailerUrl) {
      trailerButton.href = movie.trailerUrl;
      trailerButton.classList.remove('hidden');
    }
    const image = document.getElementById('poster');
    image.src = poster(movie.poster, movie.title, movie.genre);
    image.alt = `${movie.title} poster`;
    document.getElementById('movieBanner').style.backgroundImage =
      `linear-gradient(90deg, rgba(8,10,20,.98) 28%, rgba(8,10,20,.72), rgba(8,10,20,.88)), url("${poster(movie.poster, movie.title, movie.genre)}")`;
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

function renderPeople(elementId, people = []) {
  const container = document.getElementById(elementId);
  container.replaceChildren();
  const entries = Array.isArray(people) && people.length ? people : [{ name: 'Details coming soon', role: 'Team' }];
  entries.forEach(person => {
    const profile = normalizePerson(person);
    const card = document.createElement('div');
    card.className = 'person-card';
    const image = document.createElement('img');
    image.src = profile.photo || avatar(profile.name, profile.role);
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

function normalizePerson(person) {
  if (person && typeof person === 'object') {
    return {
      name: person.name || 'Unknown',
      role: person.role || '',
      photo: person.photo || ''
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
