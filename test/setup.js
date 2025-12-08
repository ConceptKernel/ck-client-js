/**
 * Mocha test setup
 */

// Set up global WebSocket for Node.js tests
global.WebSocket = require('ws');
global.fetch = require('node-fetch');

// Test configuration
process.env.NODE_ENV = 'test';

// Suppress warnings for test
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') {
    return;
  }
  console.warn(warning);
});
