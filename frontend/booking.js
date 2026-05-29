const { request, save, money, date, setMessage } = window.Screenify;
const showId = new URLSearchParams(window.location.search).get('showId');
const message = document.getElementById('seatMessage');
const selected = new Set();
let show;

function seatColumns(count) {
  if (count >= 100) return 10;
  return 8;
}

function seatLabel(index) {
  const columns = seatColumns(show?.seats?.length || 0);
  return `${String.fromCharCode(65 + Math.floor(index / columns))}${(index % columns) + 1}`;
}

function updateSummary() {
  const seats = [...selected].sort((a, b) => a - b);
  document.getElementById('selectedSeats').textContent =
    seats.length ? seats.map(seatLabel).join(', ') : 'None selected';
  document.getElementById('total').textContent = money(seats.length * show.price);
  document.getElementById('proceedButton').disabled = !seats.length;
}

function renderSeats() {
  const grid = document.getElementById('seats');
  const columns = seatColumns(show.seats.length);
  grid.style.setProperty('--seat-columns', columns);
  grid.replaceChildren();
  show.seats.forEach((booked, index) => {
    if (index % columns === 0) {
      const row = document.createElement('span');
      row.className = 'row-label';
      row.textContent = String.fromCharCode(65 + Math.floor(index / columns));
      grid.appendChild(row);
    }
    const seat = document.createElement('button');
    seat.type = 'button';
    seat.className = `seat ${booked ? 'booked' : ''}`;
    seat.textContent = (index % columns) + 1;
    seat.disabled = Boolean(booked);
    seat.setAttribute('aria-label', `Seat ${seatLabel(index)}${booked ? ', sold' : ''}`);
    seat.addEventListener('click', () => {
      if (selected.has(index)) {
        selected.delete(index);
        seat.classList.remove('selected');
      } else {
        selected.add(index);
        seat.classList.add('selected');
      }
      updateSummary();
    });
    grid.appendChild(seat);
  });
}

async function loadShow() {
  if (!showId) {
    setMessage(message, 'Choose a showtime before selecting seats.', 'error visible');
    return;
  }
  try {
    show = await request(`/shows/show/${showId}`);
    document.getElementById('movieTitle').textContent = show.movieId.title;
    document.getElementById('showDetails').textContent =
      `${show.theatre} | ${date(show.date)} ${show.time} | ${show.format}`;
    document.getElementById('ticketPrice').textContent = money(show.price);
    renderSeats();
    message.className = 'notice';
    document.getElementById('seatLayout').classList.remove('hidden');
    document.getElementById('summary').classList.remove('hidden');
    updateSummary();
  } catch (error) {
    setMessage(message, error.message, 'error visible');
  }
}

document.getElementById('proceedButton').addEventListener('click', () => {
  const seats = [...selected].sort((a, b) => a - b);
  if (!seats.length) return;
  save('checkout', {
    showId: show._id,
    movie: show.movieId,
    theatre: show.theatre,
    showDate: show.date,
    time: show.time,
    format: show.format,
    seats,
    seatLabels: seats.map(seatLabel),
    amount: seats.length * show.price
  });
  window.location.href = 'payment.html';
});

loadShow();
