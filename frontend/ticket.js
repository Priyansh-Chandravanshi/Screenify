const { load, money, date, setMessage } = window.Screenify;
const booking = load('ticket');
const message = document.getElementById('ticketMessage');

if (!booking) {
  setMessage(message, 'No confirmed ticket found. Complete a booking to see your pass.', 'error visible centered');
} else {
  const movie = booking.movieId;
  const show = booking.showId;
  document.getElementById('movieName').textContent = movie.title;
  document.getElementById('showMeta').textContent =
    `${show.theatre} | ${date(show.date)} ${show.time} | ${show.format}`;
  document.getElementById('seatList').textContent = booking.seatLabels.join(', ');
  document.getElementById('amount').textContent = money(booking.amount);
  document.getElementById('reference').textContent = booking.reference;
  const emailStatus = document.getElementById('emailStatus');
  if (booking.emailDelivery?.status === 'sent') {
    emailStatus.textContent = `Ticket emailed to ${booking.customerEmail}`;
    emailStatus.className = 'email-status success';
  } else if (booking.emailDelivery?.status === 'failed') {
    emailStatus.textContent = 'Booking confirmed, but email delivery failed. Keep this ticket page saved.';
    emailStatus.className = 'email-status warning';
  } else {
    emailStatus.textContent = 'Booking confirmed. Email delivery will work once mail settings are configured.';
    emailStatus.className = 'email-status warning';
  }
  const qrData = encodeURIComponent(booking.reference);
  document.getElementById('qrCode').src =
    `https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${qrData}`;
  message.className = 'notice';
  document.getElementById('ticket').classList.remove('hidden');
}

document.getElementById('printButton').addEventListener('click', () => window.print());
