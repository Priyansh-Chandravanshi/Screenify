const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

function getCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    return cert(serviceAccount);
  }

  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    return applicationDefault();
  }

  return undefined;
}

function createApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const options = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'screenify-local'
  };
  const credential = getCredential();
  if (credential) {
    options.credential = credential;
  }

  return initializeApp(options);
}

const db = getFirestore(createApp());

function serialize(value) {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, serialize(nestedValue)])
    );
  }
  return value;
}

function documentData(snapshot) {
  return { _id: snapshot.id, ...serialize(snapshot.data()) };
}

module.exports = { db, documentData, serialize };
