const { request, save, setMessage } = window.Screenify;
const form = document.getElementById('authForm');
const message = document.getElementById('authMessage');
let registerMode = false;

function displayMode() {
  document.getElementById('authHeading').textContent = registerMode ? 'Create account' : 'Sign in';
  document.getElementById('authDescription').textContent = registerMode
    ? 'Create an account to continue with quicker checkout.'
    : 'Book faster and keep your ticket details in one place.';
  document.getElementById('submitButton').textContent = registerMode ? 'Create account' : 'Sign in';
  document.getElementById('toggleMode').textContent = registerMode
    ? 'Already have an account? Sign in'
    : 'New here? Create an account';
  document.querySelector('.register-only').classList.toggle('hidden', !registerMode);
  document.getElementById('password').autocomplete = registerMode ? 'new-password' : 'current-password';
  message.className = 'notice';
}

document.getElementById('toggleMode').addEventListener('click', () => {
  registerMode = !registerMode;
  displayMode();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const body = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value
  };
  try {
    const result = await request(registerMode ? '/register' : '/login', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    save('screenifyUser', result.user);
    window.location.href = 'index.html';
  } catch (error) {
    setMessage(message, error.message, 'error visible');
  }
});
