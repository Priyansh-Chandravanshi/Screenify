const { request, save, poster, bindPosterFallback, date, money, setMessage } = window.Screenify;
const movieId = new URLSearchParams(window.location.search).get('movieId');
const showList = document.getElementById('showList');
const showMessage = document.getElementById('showMessage');
let shows = [];
let selectedDate = '';

function dayKey(value) {
  const valueDate = new Date(value);
  const year = valueDate.getFullYear();
  const month = String(valueDate.getMonth() + 1).padStart(2, '0');
  const day = String(valueDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderDateFilter() {
  const dates = [...new Set(shows.map(show => dayKey(show.date)))];
  const container = document.getElementById('dateFilter');
  container.replaceChildren();
  selectedDate = selectedDate || dates[0];
  dates.forEach(value => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `date-chip ${value === selectedDate ? 'active' : ''}`;
    button.textContent = date(value);
    button.addEventListener('click', () => {
      selectedDate = value;
      renderDateFilter();
      renderShows();
    });
    container.appendChild(button);
  });
}

function renderShows() {
  showList.replaceChildren();
  const available = shows.filter(show => dayKey(show.date) === selectedDate);
  if (!available.length) {
    setMessage(showMessage, 'No showtimes available on this date.', 'visible');
    return;
  }
  showMessage.className = 'notice';
  const theatres = available.reduce((groups, show) => {
    if (!groups[show.theatre]) groups[show.theatre] = [];
    groups[show.theatre].push(show);
    return groups;
  }, {});

  Object.entries(theatres).forEach(([theatre, listings]) => {
    const card = document.createElement('article');
    card.className = 'theatre-card';
    const name = document.createElement('h2');
    name.textContent = theatre;
    const location = document.createElement('p');
    location.className = 'muted';
    location.textContent = 'M-Ticket available | Food & beverage pickup | Cancellation available';
    const perks = document.createElement('div');
    perks.className = 'theatre-perks';
    ['Laser projection', 'Clean seats', 'Mobile entry'].forEach(perk => {
      const item = document.createElement('span');
      item.textContent = perk;
      perks.appendChild(item);
    });
    const buttons = document.createElement('div');
    buttons.className = 'show-times';
    listings.forEach(show => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'show-time';
      const time = document.createElement('strong');
      time.textContent = show.time;
      const meta = document.createElement('small');
      meta.textContent = `${show.format} | ${money(show.price)}`;
      button.append(time, meta);
      button.addEventListener('click', () => {
        save('selectedShow', show);
        window.location.href = `booking.html?showId=${show._id}`;
      });
      buttons.appendChild(button);
    });
    card.append(name, location, perks, buttons);
    showList.appendChild(card);
  });
}

async function loadShows() {
  if (!movieId) {
    setMessage(showMessage, 'Choose a movie before selecting a showtime.', 'error visible');
    return;
  }
  try {
    const [movie, listings] = await Promise.all([
      request(`/movies/${movieId}`),
      request(`/shows/${movieId}`)
    ]);
    document.getElementById('movieTitle').textContent = movie.title;
    document.getElementById('movieMeta').textContent = `${movie.genre} | ${movie.language} | ${movie.duration} min`;
    const showPoster = document.getElementById('showPoster');
    showPoster.src = poster(movie.poster, movie.title, movie.genre);
    showPoster.alt = `${movie.title} poster`;
    bindPosterFallback(showPoster, movie.title, movie.genre);
    shows = listings;
    showMessage.className = 'notice';
    if (!shows.length) {
      setMessage(showMessage, 'No showtimes available for this movie yet.', 'visible');
      return;
    }
    renderDateFilter();
    renderShows();
  } catch (error) {
    setMessage(showMessage, error.message, 'error visible');
  }
}

loadShows();
