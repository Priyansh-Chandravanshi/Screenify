const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { db } = require('../lib/firebase');

async function main() {
  const filePath = process.argv[2] || path.join(__dirname, 'posters.json');
  const posters = JSON.parse(await fs.readFile(path.resolve(filePath), 'utf8'));
  const entries = Array.isArray(posters) ? posters : Object.entries(posters).map(([id, poster]) => ({ id, poster }));
  const now = new Date().toISOString();
  let updated = 0;

  for (const item of entries) {
    const id = String(item.id || '').trim();
    const poster = String(item.poster || '').trim();
    if (!id || !poster) continue;

    const reference = db.collection('movies').doc(id);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      console.warn(`Skipped missing movie: ${id}`);
      continue;
    }
    await reference.set({ poster, updatedAt: now }, { merge: true });
    updated += 1;
    console.log(`Updated poster: ${id}`);
  }

  console.log(`Poster update complete. Updated ${updated} movie${updated === 1 ? '' : 's'}.`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
