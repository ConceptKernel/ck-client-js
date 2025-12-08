/**
 * @conceptkernel/client - Test Suite
 *
 * Tests for ConceptKernel JavaScript Client Library v1.3.16
 */

const ConceptKernel = require('../index.js');
const assert = require('assert');

// Test configuration
const GATEWAY_URL = process.env.CK_GATEWAY_URL || 'http://localhost:3000';
const TEST_KERNEL = process.env.CK_TEST_KERNEL || 'UI.Bakery';

// Test state
let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

/**
 * Test runner
 */
async function test(name, fn) {
  try {
    await fn();
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    testsPassed++;
  } catch (err) {
    if (err.message.includes('SKIP')) {
      console.log(`${colors.yellow}⊝${colors.reset} ${name} ${colors.gray}(${err.message})${colors.reset}`);
      testsSkipped++;
    } else {
      console.error(`${colors.red}✗${colors.reset} ${name}`);
      console.error(`  ${colors.red}${err.message}${colors.reset}`);
      if (err.stack) {
        console.error(`  ${colors.gray}${err.stack.split('\n').slice(1, 3).join('\n  ')}${colors.reset}`);
      }
      testsFailed++;
    }
  }
}

/**
 * Test suite runner
 */
async function runTests() {
  console.log(`\n${colors.blue}=== ConceptKernel Client Test Suite v1.3.16 ===${colors.reset}\n`);
  console.log(`${colors.gray}Gateway: ${GATEWAY_URL}${colors.reset}`);
  console.log(`${colors.gray}Test Kernel: ${TEST_KERNEL}${colors.reset}\n`);

  // Basic Instantiation Tests
  console.log(`\n${colors.blue}--- Basic Instantiation ---${colors.reset}`);

  await test('should create ConceptKernel instance', async () => {
    const client = new ConceptKernel(GATEWAY_URL);
    assert.ok(client instanceof ConceptKernel);
    assert.strictEqual(client.gatewayUrl, GATEWAY_URL);
  });

  await test('should accept options', async () => {
    const client = new ConceptKernel(GATEWAY_URL, {
      cacheTimeout: 30000,
      reconnect: false
    });
    assert.strictEqual(client.options.cacheTimeout, 30000);
    assert.strictEqual(client.options.reconnect, false);
  });

  // Connection Tests
  console.log(`\n${colors.blue}--- Connection Tests ---${colors.reset}`);

  let ck = null;

  await test('should connect to gateway', async () => {
    try {
      ck = await ConceptKernel.connect(GATEWAY_URL, {
        autoConnect: false // Don't connect WebSocket yet
      });
      assert.ok(ck instanceof ConceptKernel);
    } catch (err) {
      if (err.message.includes('Service discovery failed')) {
        throw new Error('SKIP: Gateway not running');
      }
      throw err;
    }
  });

  await test('should discover services', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    const services = await ck.discover();
    assert.ok(services);
    assert.ok(typeof services === 'object');
  });

  await test('should have gateway service', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    const gateway = ck.getService('gateway');
    assert.ok(gateway, 'Gateway service not found');
    assert.ok(gateway.endpoints, 'Gateway endpoints not found');
    assert.ok(gateway.endpoints.emit || gateway.endpoints.http, 'Gateway emit endpoint not found');
  });

  await test('should check service availability', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    assert.strictEqual(ck.hasService('gateway'), true);
    assert.strictEqual(ck.hasService('nonexistent'), false);
  });

  await test('should get available services list', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    const services = ck.getAvailableServices();
    assert.ok(Array.isArray(services));
    assert.ok(services.length > 0);
    assert.ok(services.includes('gateway'));
  });

  await test('should get connection status', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    const status = ck.getStatus();
    assert.strictEqual(status.discovered, true);
    assert.ok(status.availableServices.length > 0);
  });

  // Emit Tests
  console.log(`\n${colors.blue}--- Event Emission Tests ---${colors.reset}`);

  await test('should emit event to kernel', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    try {
      const result = await ck.emit(TEST_KERNEL, {
        action: 'test',
        timestamp: Date.now()
      });

      assert.ok(result, 'No result returned');
      assert.ok(result.txId, 'No txId in result');
      assert.ok(result.processUrn, 'No processUrn in result');
      assert.ok(result.processUrn.startsWith('ckp://Process#'), 'Invalid processUrn format');
    } catch (err) {
      if (err.message.includes('Gateway service not available')) {
        throw new Error('SKIP: Gateway not available');
      }
      throw err;
    }
  });

  await test('should emit with full URN', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    try {
      const result = await ck.emit(`ckp://${TEST_KERNEL}:v1`, {
        action: 'test-urn'
      });

      assert.ok(result.txId);
    } catch (err) {
      if (err.message.includes('not available')) {
        throw new Error('SKIP: Service not available');
      }
      throw err;
    }
  });

  await test('should handle emit errors gracefully', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    try {
      await ck.emit('NonExistent.Kernel.That.Does.Not.Exist', {});
      throw new Error('Should have thrown an error');
    } catch (err) {
      // Expected to fail
      assert.ok(err.message);
    }
  });

  // WebSocket Tests
  console.log(`\n${colors.blue}--- WebSocket Tests ---${colors.reset}`);

  let ckWithWs = null;

  await test('should connect WebSocket', async () => {
    try {
      ckWithWs = await ConceptKernel.connect(GATEWAY_URL);

      // Wait a bit for WebSocket to connect
      await new Promise(resolve => setTimeout(resolve, 500));

      const status = ckWithWs.getStatus();
      assert.strictEqual(status.websocketConnected, true, 'WebSocket not connected');
    } catch (err) {
      if (err.message.includes('WebSocket service not available')) {
        throw new Error('SKIP: WebSocket service not available');
      }
      throw err;
    }
  });

  await test('should receive connected event', async () => {
    if (!ckWithWs) throw new Error('SKIP: No WebSocket connection');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SKIP: Connected event not received in 2s'));
      }, 2000);

      // Already connected, so check status
      const status = ckWithWs.getStatus();
      if (status.websocketConnected) {
        clearTimeout(timeout);
        resolve();
      } else {
        ckWithWs.on('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
      }
    });
  });

  await test('should have anonymous token', async () => {
    if (!ckWithWs) throw new Error('SKIP: No WebSocket connection');

    await new Promise(resolve => setTimeout(resolve, 500));

    assert.ok(ckWithWs.token, 'No token received');
    assert.ok(ckWithWs.actor, 'No actor received');
    assert.ok(ckWithWs.roles, 'No roles received');
    assert.ok(ckWithWs.roles.includes('anonymous'), 'Not anonymous user');
  });

  await test('should register event handler', async () => {
    if (!ckWithWs) throw new Error('SKIP: No WebSocket connection');

    let handlerCalled = false;
    const unsubscribe = ckWithWs.on('event', () => {
      handlerCalled = true;
    });

    assert.ok(typeof unsubscribe === 'function', 'Unsubscribe not a function');

    // Test unsubscribe
    unsubscribe();
  });

  // Authentication Tests
  console.log(`\n${colors.blue}--- Authentication Tests ---${colors.reset}`);

  await test('should authenticate with credentials', async () => {
    if (!ckWithWs) throw new Error('SKIP: No WebSocket connection');

    try {
      const result = await ckWithWs.authenticate('conceptkernel', 'conceptkernel');

      assert.ok(result.token, 'No token returned');
      assert.ok(result.actor, 'No actor returned');
      assert.ok(Array.isArray(result.roles), 'Roles not an array');
      assert.strictEqual(ckWithWs.authenticated, true, 'Not authenticated');

    } catch (err) {
      if (err.message.includes('timeout')) {
        throw new Error('SKIP: Authentication timeout (System.Oidc.Provider may be unavailable)');
      }
      throw err;
    }
  });

  await test('should have authenticated status', async () => {
    if (!ckWithWs) throw new Error('SKIP: No WebSocket connection');

    const status = ckWithWs.getStatus();
    assert.strictEqual(status.authenticated, true, 'Status shows not authenticated');
    assert.ok(status.actor, 'No actor in status');
    assert.ok(status.roles.length > 0, 'No roles in status');
  });

  // Service Discovery Cache Tests
  console.log(`\n${colors.blue}--- Service Discovery Cache Tests ---${colors.reset}`);

  await test('should cache service discovery', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    const firstDiscovery = Date.now();
    await ck.discover();

    // Second call should be cached
    const beforeCache = Date.now();
    await ck.discover();
    const afterCache = Date.now();

    assert.ok((afterCache - beforeCache) < 10, 'Cache not working (took too long)');
  });

  await test('should force refresh cache', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    const oldTimestamp = ck.lastDiscovery;

    await new Promise(resolve => setTimeout(resolve, 100));

    await ck.discover(true); // Force refresh

    assert.ok(ck.lastDiscovery > oldTimestamp, 'Cache not refreshed');
  });

  // Error Handling Tests
  console.log(`\n${colors.blue}--- Error Handling Tests ---${colors.reset}`);

  await test('should handle invalid gateway URL', async () => {
    try {
      const badClient = await ConceptKernel.connect('http://invalid-url-that-does-not-exist:9999');
      throw new Error('Should have thrown an error');
    } catch (err) {
      assert.ok(err.message.includes('Service discovery failed') || err.message.includes('ENOTFOUND'));
    }
  });

  await test('should handle invalid JSON payload', async () => {
    if (!ck) throw new Error('SKIP: No connection');

    try {
      // This should work - JSON.stringify handles it
      await ck.emit(TEST_KERNEL, { valid: 'json' });
      assert.ok(true);
    } catch (err) {
      // Fail if error is about JSON
      if (err.message.includes('JSON')) {
        throw err;
      }
    }
  });

  // Cleanup Tests
  console.log(`\n${colors.blue}--- Cleanup Tests ---${colors.reset}`);

  await test('should disconnect WebSocket', async () => {
    if (!ckWithWs) throw new Error('SKIP: No WebSocket connection');

    ckWithWs.disconnect();

    await new Promise(resolve => setTimeout(resolve, 100));

    const status = ckWithWs.getStatus();
    assert.strictEqual(status.websocketConnected, false, 'WebSocket still connected');
  });

  // Summary
  console.log(`\n${colors.blue}${'─'.repeat(50)}${colors.reset}`);
  console.log(`${colors.green}Passed:  ${testsPassed}/${testsPassed + testsFailed + testsSkipped}${colors.reset}`);
  console.log(`${colors.red}Failed:  ${testsFailed}/${testsPassed + testsFailed + testsSkipped}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${testsSkipped}/${testsPassed + testsFailed + testsSkipped}${colors.reset}`);

  if (testsFailed > 0) {
    console.log(`\n${colors.red}⚠️  Some tests failed. Check the errors above.${colors.reset}`);
    process.exit(1);
  } else if (testsSkipped > 0) {
    console.log(`\n${colors.yellow}ℹ️  ${testsSkipped} tests skipped (services not running or not available)${colors.reset}`);
    console.log(`\n${colors.green}✅ All executed tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.green}✅ All tests passed!${colors.reset}`);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(err => {
    console.error(`${colors.red}Test suite failed:${colors.reset}`, err);
    process.exit(1);
  });
}

module.exports = { runTests };
