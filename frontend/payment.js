const { request, load, save, money, date, setMessage } = window.Screenify;
const checkout = load('checkout');
const form = document.getElementById('paymentForm');
const message = document.getElementById('paymentMessage');
const user = load('screenifyUser');
const customerEmail = document.getElementById('customerEmail');
let couponCode = '';
let discount = 0;

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

function couponDiscount(code, subtotal) {
  const normalized = code.trim().toUpperCase();
  if (normalized === 'WELCOME100') return Math.min(100, Math.max(0, subtotal - 1));
  if (normalized === 'STUDENT20') return Math.min(Math.round(subtotal * 0.2), Math.max(0, subtotal - 1));
  if (normalized === 'SCREENIFY50') return Math.min(50, Math.max(0, subtotal - 1));
  return 0;
}

function payableAmount() {
  return Math.max(0, (checkout?.amount || 0) - discount);
}

function refreshTotals() {
  if (!checkout) return;
  document.getElementById('discount').textContent = discount ? `- ${money(discount)}` : money(0);
  document.getElementById('amount').textContent = money(payableAmount());
  document.getElementById('payButton').textContent = `Confirm booking - ${money(payableAmount())}`;
  document.getElementById('animationAmount').textContent = money(payableAmount());
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
  refreshTotals();
}

document.getElementById('applyCoupon').addEventListener('click', () => {
  const input = document.getElementById('couponCode');
  const message = document.getElementById('couponMessage');
  const nextDiscount = couponDiscount(input.value, checkout?.amount || 0);
  if (!nextDiscount) {
    couponCode = '';
    discount = 0;
    message.textContent = 'Try WELCOME100, STUDENT20 or SCREENIFY50.';
    message.className = 'coupon-message error';
    refreshTotals();
    return;
  }
  couponCode = input.value.trim().toUpperCase();
  discount = nextDiscount;
  message.textContent = `${couponCode} applied. You saved ${money(discount)}.`;
  message.className = 'coupon-message success';
  refreshTotals();
});

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
        customerEmail: customerEmail.value.trim(),
        couponCode
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
