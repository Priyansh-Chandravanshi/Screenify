const { request, load, money, date, moviePoster, bindPosterFallback, setMessage } = window.Screenify;

const user = load('screenifyUser');
const bookingList = document.getElementById('bookingList');
const wishlistList = document.getElementById('wishlistList');

if (!user?.email) {
  window.location.href = 'login.html';
} else {
  document.getElementById('dashboardName').textContent = user.name ? `${user.name}'s dashboard` : 'Your dashboard';
  document.getElementById('dashboardEmail').textContent = user.email;
  document.getElementById('dashboardAvatar').textContent = initials(user.name || user.email);
  loadDashboard();
}

async function loadDashboard() {
  try {
    const [bookings, wishlist] = await Promise.all([
      request(`/users/${encodeURIComponent(user.email)}/bookings`),
      request(`/users/${encodeURIComponent(user.email)}/wishlist`)
    ]);
    renderBookings(bookings);
    renderWishlist(wishlist);
    document.getElementById('bookingCount').textContent = bookings.length;
    document.getElementById('wishlistCount').textContent = wishlist.length;
    document.getElementById('ticketCount').textContent =
      bookings.reduce((total, booking) => total + (booking.seats?.length || 0), 0);
  } catch (error) {
    setMessage(document.getElementById('bookingMessage'), error.message, 'error visible');
    setMessage(document.getElementById('wishlistMessage'), error.message, 'error visible');
  }
}

function renderBookings(bookings) {
  const message = document.getElementById('bookingMessage');
  bookingList.replaceChildren();
  if (!bookings.length) {
    setMessage(message, 'No bookings yet.', 'visible');
    return;
  }
  message.className = 'notice';
  bookings.forEach(booking => {
    const movie = typeof booking.movieId === 'object' ? booking.movieId : {};
    const show = typeof booking.showId === 'object' ? booking.showId : {};
    const title = movie.title || 'Movie ticket';
    const seats = (booking.seatLabels || booking.seats || []).join(', ') || 'Seats selected';
    const showtime = [show.date ? date(show.date) : '', show.time || ''].filter(Boolean).join(' ') || 'Showtime';
    const reference = booking.reference || booking._id || 'Ticket';

    const card = document.createElement('article');
    card.className = 'dashboard-card';

    const image = document.createElement('img');
    image.className = 'booking-poster';
    image.src = moviePoster(movie.title ? movie : { title, genre: 'Movie' });
    image.alt = `${title} poster`;
    bindPosterFallback(image, title, movie.genre || 'Movie');

    const content = document.createElement('div');
    content.className = 'dashboard-card-content';

    const head = document.createElement('div');
    head.className = 'dashboard-card-head';
    const titleBlock = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = title;
    const theatre = document.createElement('span');
    theatre.textContent = show.theatre || 'Screenify Cinemas';
    titleBlock.append(name, theatre);
    const status = document.createElement('span');
    status.className = 'status-pill';
    status.textContent = 'Confirmed';
    head.append(titleBlock, status);

    const meta = document.createElement('div');
    meta.className = 'booking-meta';
    [
      showtime,
      show.format || show.auditorium || 'Standard',
      `Seats ${seats}`,
      `${money(booking.amount)} paid`,
      reference
    ].forEach(value => {
      const item = document.createElement('span');
      item.textContent = value;
      meta.appendChild(item);
    });

    const actions = document.createElement('div');
    actions.className = 'dashboard-actions';
    const pdf = document.createElement('a');
    pdf.className = 'button ghost';
    pdf.href = `/api/bookings/${encodeURIComponent(reference)}/ticket.pdf`;
    pdf.textContent = 'PDF';
    const ticket = document.createElement('button');
    ticket.className = 'button';
    ticket.type = 'button';
    ticket.textContent = 'Open ticket';
    ticket.addEventListener('click', () => {
      localStorage.setItem('ticket', JSON.stringify(booking));
      window.location.href = 'ticket.html';
    });
    actions.append(pdf, ticket);
    content.append(head, meta, actions);
    card.append(image, content);
    bookingList.appendChild(card);
  });
}

function renderWishlist(movies) {
  const message = document.getElementById('wishlistMessage');
  wishlistList.replaceChildren();
  if (!movies.length) {
    setMessage(message, 'No favourite movies yet.', 'visible');
    return;
  }
  message.className = 'notice';
  movies.forEach(movie => {
    const card = document.createElement('article');
    card.className = 'wishlist-card';
    const image = document.createElement('img');
    image.src = moviePoster(movie);
    image.alt = `${movie.title} poster`;
    bindPosterFallback(image, movie.title, movie.genre);
    const info = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = movie.title || 'Movie';
    const meta = document.createElement('span');
    meta.textContent = `${movie.genre || 'Movie'} | ${movie.language || 'Hindi'}`;
    const rating = document.createElement('small');
    rating.textContent = `Rating ${Number(movie.rating || 0).toFixed(1)}/10`;
    info.append(title, meta, rating);
    const link = document.createElement('a');
    link.className = 'button ghost';
    link.href = `movie.html?id=${movie._id}`;
    link.textContent = 'Book';
    card.append(image, info, link);
    wishlistList.appendChild(card);
  });
}

function initials(value) {
  return String(value || 'S')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('') || 'S';
}
