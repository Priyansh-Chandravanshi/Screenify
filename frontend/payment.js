const { request, load, save, money, date, setMessage } = window.Screenify;
const checkout = load('checkout');
const form = document.getElementById('paymentForm');
const message = document.getElementById('paymentMessage');
const user = load('screenifyUser');
const customerEmail = document.getElementById('customerEmail');

if (user?.email) {
  customerEmail.value = user.email;
}

function selectedMethod() {
  return form.elements.method.value;
}

function validatePayment(method) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.value.trim())) {
    return 'Enter a valid email address for your ticket.';
  }
  if (method === 'upi' && !/^[\w.-]+@[\w.-]+$/.test(form.elements.upi.value.trim())) {
    return 'Enter a valid UPI ID.';
  }
  if (method === 'card') {
    const number = form.elements.cardNumber.value.replace(/\s/g, '');
    if (!/^\d{16}$/.test(number) || !/^\d{2}\/\d{2}$/.test(form.elements.expiry.value) || !/^\d{3}$/.test(form.elements.cvv.value)) {
      return 'Enter valid card details.';
    }
  }
  if (method === 'netbanking' && !form.elements.bank.value) {
    return 'Choose your bank.';
  }
  return '';
}

if (!checkout) {
  document.getElementById('orderCard').classList.add('hidden');
  setMessage(message, 'Your checkout has expired. Please select seats again.', 'error visible');
  document.getElementById('payButton').disabled = true;
} else {
  document.getElementById('movieName').textContent = checkout.movie.title;
  document.getElementById('showMeta').textContent =
    `${checkout.theatre} | ${date(checkout.showDate)} ${checkout.time}`;
  document.getElementById('seatList').textContent = checkout.seatLabels.join(', ');
  document.getElementById('amount').textContent = money(checkout.amount);
  document.getElementById('payButton').textContent = `Confirm booking - ${money(checkout.amount)}`;
  document.getElementById('animationAmount').textContent = money(checkout.amount);
}

document.querySelectorAll('input[name="method"]').forEach(input => {
  input.addEventListener('change', event => {
    document.querySelectorAll('.payment-option').forEach(option => option.classList.remove('active'));
    event.target.parentElement.classList.add('active');
    document.querySelectorAll('.payment-fields').forEach(fields => fields.classList.add('hidden'));
    document.getElementById(event.target.value).classList.remove('hidden');
  });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!checkout) return;
  const method = selectedMethod();
  const paymentError = validatePayment(method);
  if (paymentError) {
    setMessage(message, paymentError, 'error visible');
    return;
  }

  const processing = document.getElementById('processing');
  const payButton = document.getElementById('payButton');
  processing.classList.remove('hidden');
  runPaymentAnimation();
  payButton.disabled = true;
  message.className = 'notice';

  try {
    const result = await request('/book', {
      method: 'POST',
      body: JSON.stringify({
        showId: checkout.showId,
        seats: checkout.seats,
        paymentMethod: method,
        customerEmail: customerEmail.value.trim()
      })
    });
    save('ticket', result.booking);
    localStorage.removeItem('checkout');
    window.location.href = 'ticket.html';
  } catch (error) {
    processing.classList.add('hidden');
    payButton.disabled = false;
    setMessage(message, error.message, 'error visible');
  }
});

function runPaymentAnimation() {
  const steps = Array.from(document.querySelectorAll('.processing-steps span'));
  const text = document.getElementById('processingText');
  const labels = [
    'Validating demo payment...',
    'Locking your selected seats...',
    'Generating ticket and email...'
  ];
  steps.forEach(step => step.classList.remove('active', 'done'));
  steps[0].classList.add('active');
  text.textContent = labels[0];

  labels.forEach((label, index) => {
    window.setTimeout(() => {
      steps.forEach((step, stepIndex) => {
        step.classList.toggle('done', stepIndex < index);
        step.classList.toggle('active', stepIndex === index);
      });
      text.textContent = label;
    }, index * 900);
  });
}
