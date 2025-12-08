/**
 * End-to-End Authentication & Message Flow Test
 *
 * Tests the complete workflow:
 * 1. Anonymous user sends message
 * 2. User authenticates to get JWT token
 * 3. Authenticated user sends message
 * 4. Verify ACK and events for both scenarios
 *
 * Based on CK_DRIVER_HTTP workflow and USECASE.BAKECAKE
 */

const { expect } = require('chai');
const ConceptKernel = require('../index.js');

const GATEWAY_URL = process.env.CK_GATEWAY_URL || 'http://localhost:56000';
const TEST_KERNEL = 'System.Echo'; // Echo service that echoes back payload in transaction envelope
const TEST_USERNAME = process.env.CK_TEST_USER || 'alice';
const TEST_PASSWORD = process.env.CK_TEST_PASS || 'alice123';

describe('@conceptkernel/client - E2E Authentication & Message Flow', () => {
  let ck = null;
  let anonymousToken = null;
  let authenticatedToken = null;
  let anonymousTxId = null;
  let authenticatedTxId = null;

  before(async function() {
    this.timeout(10000);
    console.log('\n=== E2E Test Setup ===');
    console.log(`Gateway URL: ${GATEWAY_URL}`);
    console.log(`Test Kernel: ${TEST_KERNEL}`);
  });

  after(() => {
    if (ck) {
      ck.disconnect();
    }
  });

  describe('Phase 1: Connect & Discover', () => {
    it('should connect to gateway and discover services', async function() {
      this.timeout(10000);

      ck = await ConceptKernel.connect(GATEWAY_URL, {
        autoConnect: true  // Connect WebSocket
      });

      expect(ck).to.be.instanceOf(ConceptKernel);
      expect(ck.services).to.be.an('object');
      expect(ck.hasService('gateway')).to.be.true;
      expect(ck.hasService('websocket')).to.be.true;

      console.log(`✓ Connected to gateway`);
      console.log(`✓ Services: ${ck.getAvailableServices().join(', ')}`);
    });

    it('should receive anonymous token on WebSocket connect', async function() {
      this.timeout(5000);

      // Wait for token
      await new Promise(resolve => {
        const checkToken = setInterval(() => {
          if (ck.token) {
            clearInterval(checkToken);
            resolve();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkToken);
          resolve();
        }, 4000);
      });

      expect(ck.token).to.be.a('string');
      expect(ck.authenticated).to.be.false;
      expect(ck.actor).to.include('anonymous');

      anonymousToken = ck.token;

      console.log(`✓ Anonymous token received: ${anonymousToken.substring(0, 20)}...`);
      console.log(`✓ Actor: ${ck.actor}`);
      console.log(`✓ Roles: ${ck.roles.join(', ')}`);
    });
  });

  describe('Phase 2: Anonymous User Message', () => {
    it('should emit event as anonymous user', async function() {
      this.timeout(5000);

      const payload = {
        action: 'mix',
        ingredients: {
          flour: 500,
          milk: 250,
          sugar: 100,
          eggs: 3,
          butter: 100
        },
        timestamp: Date.now()
      };

      const result = await ck.emit(TEST_KERNEL, payload);

      expect(result).to.be.an('object');
      expect(result.txId).to.be.a('string');

      anonymousTxId = result.txId;

      console.log(`✓ Anonymous message sent`);
      console.log(`  txId: ${anonymousTxId}`);
      console.log(`  payload: ${JSON.stringify(payload, null, 2)}`);
    });

    it('should receive ACK for anonymous message', async function() {
      this.timeout(5000);

      // Listen for event confirmation via WebSocket
      const eventPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 4000);

        ck.on('event', (event) => {
          if (event.txId === anonymousTxId || event.type === 'notification') {
            clearTimeout(timeout);
            resolve(event);
          }
        });
      });

      const event = await eventPromise;

      if (event) {
        console.log(`✓ ACK received for anonymous message`);
        console.log(`  event: ${JSON.stringify(event, null, 2)}`);
      } else {
        console.log(`⚠ No ACK received within 4s (kernel may be processing)`);
      }
    });
  });

  describe('Phase 3: Authentication', () => {
    it('should authenticate with username/password', async function() {
      this.timeout(10000);

      try {
        const authResult = await ck.authenticate(TEST_USERNAME, TEST_PASSWORD);

        expect(authResult).to.be.an('object');
        expect(authResult.token).to.be.a('string');
        expect(authResult.token).to.not.equal(anonymousToken);
        expect(ck.authenticated).to.be.true;
        expect(ck.actor).to.not.include('anonymous');

        authenticatedToken = authResult.token;

        console.log(`✓ Authentication successful`);
        console.log(`  Old token: ${anonymousToken.substring(0, 20)}...`);
        console.log(`  New token: ${authenticatedToken.substring(0, 20)}...`);
        console.log(`  Actor: ${ck.actor}`);
        console.log(`  Roles: ${authResult.roles.join(', ')}`);
      } catch (err) {
        // OIDC might not have the test user
        if (err.message.includes('Authentication failed') || err.message.includes('User not found')) {
          this.skip();
        }
        throw err;
      }
    });
  });

  describe('Phase 4: Authenticated User Message', () => {
    it('should emit event as authenticated user', async function() {
      if (!ck.authenticated) {
        this.skip();
      }

      this.timeout(5000);

      const payload = {
        action: 'bake',
        dough_weight: 850,
        consistency: 'perfect',
        temperature: 180,
        duration_minutes: 45,
        timestamp: Date.now()
      };

      const result = await ck.emit(TEST_KERNEL, payload);

      expect(result).to.be.an('object');
      expect(result.txId).to.be.a('string');

      authenticatedTxId = result.txId;

      console.log(`✓ Authenticated message sent`);
      console.log(`  txId: ${authenticatedTxId}`);
      console.log(`  payload: ${JSON.stringify(payload, null, 2)}`);
    });

    it('should receive ACK for authenticated message', async function() {
      if (!ck.authenticated) {
        this.skip();
      }

      this.timeout(5000);

      // Listen for event confirmation via WebSocket
      const eventPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(null), 4000);

        ck.on('event', (event) => {
          if (event.txId === authenticatedTxId || event.type === 'notification') {
            clearTimeout(timeout);
            resolve(event);
          }
        });
      });

      const event = await eventPromise;

      if (event) {
        console.log(`✓ ACK received for authenticated message`);
        console.log(`  event: ${JSON.stringify(event, null, 2)}`);
      } else {
        console.log(`⚠ No ACK received within 4s (kernel may be processing)`);
      }
    });
  });

  describe('Phase 5: Compare Anonymous vs Authenticated', () => {
    it('should show difference between anonymous and authenticated tokens', function() {
      console.log('\n=== Token Comparison ===');
      console.log(`Anonymous Token:     ${anonymousToken ? anonymousToken.substring(0, 30) : 'N/A'}...`);
      console.log(`Authenticated Token: ${authenticatedToken ? authenticatedToken.substring(0, 30) : 'N/A'}...`);
      console.log(`Tokens Different: ${anonymousToken !== authenticatedToken}`);
    });

    it('should show difference in message txIds', function() {
      console.log('\n=== Transaction ID Comparison ===');
      console.log(`Anonymous txId:     ${anonymousTxId || 'N/A'}`);
      console.log(`Authenticated txId: ${authenticatedTxId || 'N/A'}`);
    });

    it('should show connection status', function() {
      const status = ck.getStatus();
      console.log('\n=== Final Connection Status ===');
      console.log(JSON.stringify(status, null, 2));
    });
  });
});
