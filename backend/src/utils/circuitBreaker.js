const CircuitBreaker = require('opossum');
const logger = require('./logger');

const defaultOptions = {
  timeout: 15000, // If function takes longer than 15 seconds, trigger a failure
  errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
  resetTimeout: 30000, // After 30 seconds, try again
};

/**
 * Wraps a promise-returning function in a Circuit Breaker
 * @param {Function} action The async function to wrap
 * @param {String} name Identifier for logging
 * @param {Object} options Opossum options
 * @returns {Function} wrapped function
 */
const createCircuitBreaker = (action, name, options = {}) => {
  const mergedOptions = { ...defaultOptions, ...options };
  const breaker = new CircuitBreaker(action, mergedOptions);

  if (options.fallback && typeof options.fallback === 'function') {
    breaker.fallback(options.fallback);
  } else {
    breaker.fallback(() => {
      logger.warn(`[CircuitBreaker] Fallback triggered for ${name}`);
      return Promise.reject(new Error(`${name} is currently unavailable (Circuit Open)`));
    });
  }

  breaker.on('open', () => logger.error(`[CircuitBreaker] 🔴 OPEN: ${name} is failing too often!`));
  breaker.on('halfOpen', () => logger.warn(`[CircuitBreaker] 🟡 HALF-OPEN: Testing if ${name} is back online...`));
  breaker.on('close', () => logger.info(`[CircuitBreaker] 🟢 CLOSED: ${name} has recovered.`));

  // Wrap the fire method
  return async (...args) => {
    return breaker.fire(...args);
  };
};

module.exports = { createCircuitBreaker };
