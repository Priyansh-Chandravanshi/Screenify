const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const cors = require('cors');
const express = require('express');

const movieRoutes = require('./routes/movieRoutes');
const showRoutes = require('./routes/showRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userRoutes = require('./routes/userRoutes');
const { emailConfigured, verifyEmailSetup } = require('./lib/mailer');

const app = express();
const port = Number(process.env.PORT) || 5000;
const frontendPath = path.join(__dirname, '..', 'frontend');
const mailPreviewPath = path.join(__dirname, 'mail-previews');

app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Screenify API',
    database: 'Cloud Firestore',
    ticketEmail: emailConfigured() ? 'configured' : 'not-configured'
  });
});

app.get('/api/mail/status', async (req, res) => {
  const status = await verifyEmailSetup();
  res.status(status.ok ? 200 : 503).json(status);
});

app.use('/api', movieRoutes);
app.use('/api', showRoutes);
app.use('/api', bookingRoutes);
app.use('/api', userRoutes);

app.use(express.static(frontendPath));
app.use('/mail-previews', express.static(mailPreviewPath));
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error.name === 'RequestError') {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.code === 7 || error.code === 'permission-denied') {
    return res.status(503).json({ message: 'Firestore access is not configured for this server.' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

function startServer() {
  return app.listen(port, () => {
    console.log(`Screenify running at http://localhost:${port} using Cloud Firestore`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
