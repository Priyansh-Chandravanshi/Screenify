const { request, money, setMessage } = window.Screenify;

document.getElementById('loadAdmin').addEventListener('click', loadAdmin);

async function loadAdmin() {
  const key = document.getElementById('adminKey').value.trim();
  const message = document.getElementById('adminMessage');
  if (!key) {
    setMessage(message, 'Enter the admin API key from backend/.env.', 'error visible');
    return;
  }
  try {
    const stats = await request('/admin/stats', { headers: { 'x-admin-key': key } });
    document.getElementById('adminMovies').textContent = stats.movies;
    document.getElementById('adminUsers').textContent = stats.users;
    document.getElementById('adminBookings').textContent = stats.bookings;
    document.getElementById('adminRevenue').textContent = money(stats.revenue);
    document.getElementById('popularMovie').textContent = stats.popularMovie?.title || 'No bookings yet';
    document.getElementById('ticketsSold').textContent = `${stats.ticketsSold} tickets sold`;
    renderRevenue(stats.monthlyRevenue || []);
    setMessage(message, 'Admin dashboard loaded.', 'visible');
  } catch (error) {
    setMessage(message, error.message, 'error visible');
  }
}

function renderRevenue(items) {
  const chart = document.getElementById('revenueChart');
  chart.replaceChildren();
  const max = Math.max(...items.map(item => item.amount), 1);
  if (!items.length) {
    chart.textContent = 'No revenue data yet.';
    return;
  }
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `<span>${item.month}</span><i style="width:${Math.max(6, (item.amount / max) * 100)}%"></i><strong>${money(item.amount)}</strong>`;
    chart.appendChild(row);
  });
}
