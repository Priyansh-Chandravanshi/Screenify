function requiredString(value, label, maxLength = 120) {
  const result = String(value || '').trim();
  if (!result) {
    throw new RequestError(`${label} is required.`);
  }
  if (result.length > maxLength) {
    throw new RequestError(`${label} is too long.`);
  }
  return result;
}

function optionalString(value, defaultValue = '', maxLength = 800) {
  const result = String(value || defaultValue).trim();
  if (result.length > maxLength) {
    throw new RequestError('A text field is too long.');
  }
  return result;
}

function numberInRange(value, label, minimum, maximum, defaultValue) {
  const result = value === undefined || value === '' ? defaultValue : Number(value);
  if (!Number.isFinite(result) || result < minimum || result > maximum) {
    throw new RequestError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return result;
}

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

module.exports = { RequestError, numberInRange, optionalString, requiredString };
