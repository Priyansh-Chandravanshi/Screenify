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
    document.getElementById('synopsis').textContent = movie.synopsis || 'Book the best seats for this screening.';
    const image = document.getElementById('poster');
    image.src = poster(movie.poster);
    image.alt = `${movie.title} poster`;
    document.getElementById('movieBanner').style.backgroundImage =
      `linear-gradient(90deg, rgba(8,10,20,.98) 28%, rgba(8,10,20,.72), rgba(8,10,20,.88)), url("${poster(movie.poster)}")`;
    document.getElementById('bookButton').addEventListener('click', () => {
      window.location.href = `shows.html?movieId=${movie._id}`;
    });
    message.className = 'notice';
    document.getElementById('movieBanner').classList.remove('hidden');
  } catch (error) {
    setMessage(message, error.message, 'error visible centered');
  }
}

loadMovie();
