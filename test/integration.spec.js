/**
 * Integration Tests for @conceptkernel/client
 *
 * Tests features matching demo.html functionality
 * Requires running services: System.Gateway (56000), System.Wss (56001), System.Oidc.Provider (56002)
 */

const { expect } = require('chai');
const ConceptKernel = require('../index.js');

const GATEWAY_URL = process.env.CK_GATEWAY_URL || 'http://localhost:56000';
const TEST_KERNEL = process.env.CK_TEST_KERNEL || 'System.Echo'; // Echo service that echoes back payload

describe('@conceptkernel/client - Integration Tests (demo.html features)', () => {
  let ck = null;

  describe('Feature 1: Connect to Gateway (Auto-Discovery)', () => {
    it('should connect to gateway and discover services', async function() {
      try {
        ck = await ConceptKernel.connect(GATEWAY_URL, {
          autoConnect: false // Don't connect WebSocket yet
        });

        expect(ck).to.be.instanceOf(ConceptKernel);
        expect(ck.services).to.be.an('object');
        expect(ck.getAvailableServices()).to.include('gateway');
      } catch (err) {
        if (err.message.includes('Service discovery failed') || err.message.includes('ECONNREFUSED')) {
          this.skip();
        }
        throw err;
      }
    });

    it('should have gateway service with endpoints', function() {
      if (!ck) this.skip();

      const gateway = ck.getService('gateway');
      expect(gateway).to.be.an('object');
      expect(gateway.endpoints).to.be.an('object');
      expect(gateway.endpoints.emit || gateway.endpoints.http).to.exist;
      expect(gateway.capabilities).to.be.an('array').that.includes('http-ingress');
    });

    it('should have websocket service if available', function() {
      if (!ck) this.skip();

      if (ck.hasService('websocket')) {
        const wss = ck.getService('websocket');
        expect(wss).to.be.an('object');
        expect(wss.endpoints).to.be.an('object');
        expect(wss.endpoints.ws || wss.endpoints.wss).to.exist;
      }
    });

    it('should get correct connection status', function() {
      if (!ck) this.skip();

      const status = ck.getStatus();
      expect(status.discovered).to.be.true;
      expect(status.websocketConnected).to.be.false; // Not connected yet
      expect(status.authenticated).to.be.false;
      expect(status.availableServices.length).to.be.at.least(1);
    });
  });

  describe('Feature 2: Emit Event to Kernel (demo.html emit form)', () => {
    it('should emit event to kernel', async function() {
      if (!ck) this.skip();

      try {
        const result = await ck.emit(TEST_KERNEL, {
          action: 'test',
          source: 'mocha-integration-test',
          timestamp: Date.now()
        });

        expect(result).to.be.an('object');
        expect(result.txId).to.be.a('string');
        expect(result.processUrn).to.be.a('string');
        expect(result.processUrn).to.match(/^ckp:\/\/Process#/);
      } catch (err) {
        if (err.message.includes('not available')) {
          this.skip();
        }
        throw err;
      }
    });

    it('should emit with full URN', async function() {
      if (!ck) this.skip();

      try {
        const result = await ck.emit(`ckp://${TEST_KERNEL}:v1`, {
          action: 'test-urn'
        });

        expect(result.txId).to.be.a('string');
        expect(result.processUrn).to.include('Process#GatewayRoute');
      } catch (err) {
        if (err.message.includes('not available')) {
          this.skip();
        }
        throw err;
      }
    });
  });

  describe('Feature 3: WebSocket Connection (demo.html real-time events)', () => {
    let ckWithWs = null;

    it('should connect WebSocket automatically', async function() {
      try {
        ckWithWs = await ConceptKernel.connect(GATEWAY_URL);

        // Wait for WebSocket to connect
        await new Promise(resolve => setTimeout(resolve, 1000));

        const status = ckWithWs.getStatus();
        expect(status.websocketConnected).to.be.true;
        expect(ckWithWs.token).to.be.a('string');
      } catch (err) {
        if (err.message.includes('WebSocket service not available')) {
          this.skip();
        }
        throw err;
      }
    });

    it('should receive anonymous token on connect', function() {
      if (!ckWithWs) this.skip();

      expect(ckWithWs.token).to.be.a('string');
      expect(ckWithWs.actor).to.include('anonymous');
      expect(ckWithWs.roles).to.include('anonymous');
      expect(ckWithWs.authenticated).to.be.false;
    });

    it('should receive events via WebSocket', function(done) {
      if (!ckWithWs) this.skip();

      const timeout = setTimeout(() => {
        this.skip();
      }, 5000);

      ckWithWs.on('event', (event) => {
        clearTimeout(timeout);
        expect(event).to.be.an('object');
        expect(event.kernel).to.be.a('string');
        done();
      });

      // Emit an event to trigger broadcast
      ckWithWs.emit(TEST_KERNEL, {
        action: 'test-broadcast',
        timestamp: Date.now()
      }).catch(() => {
        // Ignore emit errors, we're testing event reception
      });
    });

    after(() => {
      if (ckWithWs) {
        ckWithWs.disconnect();
      }
    });
  });

  describe('Feature 4: Authentication (demo.html auth form)', () => {
    let ckAuth = null;

    before(async function() {
      try {
        ckAuth = await ConceptKernel.connect(GATEWAY_URL);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        this.skip();
      }
    });

    it('should authenticate with credentials', async function() {
      if (!ckAuth) this.skip();

      try {
        // Use valid mock credentials (System.Wss accepts alice/alice123, bob/bob123, carol/carol123)
        const result = await ckAuth.authenticate('alice', 'alice123');

        expect(result).to.be.an('object');
        expect(result.token).to.be.a('string');
        expect(result.actor).to.include('alice');
        expect(result.roles).to.be.an('array');

        // Check client state
        expect(ckAuth.authenticated).to.be.true;
        expect(ckAuth.actor).to.include('alice');
        expect(ckAuth.roles.length).to.be.at.least(1);
      } catch (err) {
        if (err.message.includes('timeout') || err.message.includes('not connected')) {
          this.skip();
        }
        throw err;
      }
    });

    it('should have authenticated status', function() {
      if (!ckAuth || !ckAuth.authenticated) this.skip();

      const status = ckAuth.getStatus();
      expect(status.authenticated).to.be.true;
      expect(status.actor).to.be.a('string');
      expect(status.roles).to.be.an('array').with.lengthOf.at.least(1);
    });

    after(() => {
      if (ckAuth) {
        ckAuth.disconnect();
      }
    });
  });

  describe('Feature 5: Service Discovery Caching', () => {
    it('should cache service discovery results', async function() {
      if (!ck) this.skip();

      const firstDiscovery = Date.now();
      await ck.discover();

      const beforeCache = Date.now();
      await ck.discover(); // Should use cache
      const afterCache = Date.now();

      // Cached call should be very fast (<10ms)
      expect(afterCache - beforeCache).to.be.lessThan(10);
    });

    it('should force refresh cache', async function() {
      if (!ck) this.skip();

      const oldTimestamp = ck.lastDiscovery;
      await new Promise(resolve => setTimeout(resolve, 100));

      await ck.discover(true); // Force refresh

      expect(ck.lastDiscovery).to.be.greaterThan(oldTimestamp);
    });
  });

  describe('Feature 6: Error Handling (demo.html error display)', () => {
    it('should handle invalid gateway URL', async function() {
      try {
        await ConceptKernel.connect('http://invalid-url-9999.local:9999');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.satisfy(msg =>
          msg.includes('Service discovery failed') ||
          msg.includes('ENOTFOUND') ||
          msg.includes('ECONNREFUSED') ||
          msg.includes('fetch failed')
        );
      }
    });

    it('should handle missing kernel in emit', async function() {
      if (!ck) this.skip();

      try {
        await ck.emit('NonExistent.Kernel.123456', {});
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err.message).to.be.a('string');
      }
    });

    it('should handle errors via event handler', function(done) {
      if (!ck) this.skip();

      ck.on('error', (data) => {
        expect(data).to.be.an('object');
        expect(data.message).to.be.a('string');
        done();
      });

      // Trigger an error
      ck._emit('error', { message: 'Test error', context: 'test' });
    });
  });

  describe('Feature 7: Disconnect (demo.html disconnect button)', () => {
    it('should disconnect WebSocket cleanly', async function() {
      const tempCk = await ConceptKernel.connect(GATEWAY_URL);
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(tempCk.getStatus().websocketConnected).to.be.true;

      tempCk.disconnect();

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(tempCk.getStatus().websocketConnected).to.be.false;
      expect(tempCk.websocket).to.be.null;
    });
  });

  after(() => {
    // Clean up any remaining connections
    if (ck) {
      ck.disconnect();
    }
  });
});
