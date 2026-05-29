const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { verifyEmailSetup } = require('../lib/mailer');

verifyEmailSetup()
  .then(status => {
    console.log(status.message);
    if (status.code) console.log(`Code: ${status.code}`);
    if (status.command) console.log(`Command: ${status.command}`);
    process.exitCode = status.ok ? 0 : 1;
  })
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
