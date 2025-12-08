/**
 * Unit Tests for @conceptkernel/client
 *
 * Tests basic functionality without requiring running servers
 */

const { expect } = require('chai');
const ConceptKernel = require('../index.js');

describe('@conceptkernel/client - Unit Tests', () => {
  describe('Constructor', () => {
    it('should create ConceptKernel instance', () => {
      const client = new ConceptKernel('http://localhost:3000');
      expect(client).to.be.instanceOf(ConceptKernel);
      expect(client.gatewayUrl).to.equal('http://localhost:3000');
    });

    it('should accept options', () => {
      const client = new ConceptKernel('http://localhost:3000', {
        cacheTimeout: 30000,
        reconnect: false,
        reconnectDelay: 5000
      });

      expect(client.options.cacheTimeout).to.equal(30000);
      expect(client.options.reconnect).to.equal(false);
      expect(client.options.reconnectDelay).to.equal(5000);
    });

    it('should set default options', () => {
      const client = new ConceptKernel('http://localhost:3000');

      expect(client.options.cacheTimeout).to.equal(60000);
      expect(client.options.reconnect).to.equal(true);
      expect(client.options.reconnectDelay).to.equal(3000);
    });
  });

  describe('Service Management', () => {
    it('should start with no services', () => {
      const client = new ConceptKernel('http://localhost:3000');
      expect(client.services).to.be.null;
      expect(client.getAvailableServices()).to.be.an('array').that.is.empty;
    });

    it('should check service availability', () => {
      const client = new ConceptKernel('http://localhost:3000');
      expect(client.hasService('gateway')).to.be.false;
      expect(client.getService('gateway')).to.be.null;
    });
  });

  describe('Event Handlers', () => {
    it('should register event handler', () => {
      const client = new ConceptKernel('http://localhost:3000');
      let called = false;

      const unsubscribe = client.on('event', () => {
        called = true;
      });

      expect(unsubscribe).to.be.a('function');
    });

    it('should unsubscribe event handler', () => {
      const client = new ConceptKernel('http://localhost:3000');
      let callCount = 0;

      const unsubscribe = client.on('event', () => {
        callCount++;
      });

      // Emit test event
      client._emit('event', { test: true });
      expect(callCount).to.equal(1);

      // Unsubscribe and emit again
      unsubscribe();
      client._emit('event', { test: true });
      expect(callCount).to.equal(1); // Should not increment
    });

    it('should support multiple event types', () => {
      const client = new ConceptKernel('http://localhost:3000');
      const events = [];

      client.on('event', (data) => events.push({ type: 'event', data }));
      client.on('notification', (data) => events.push({ type: 'notification', data }));
      client.on('connected', (data) => events.push({ type: 'connected', data }));
      client.on('disconnected', (data) => events.push({ type: 'disconnected', data }));
      client.on('error', (data) => events.push({ type: 'error', data }));

      client._emit('event', { test: 1 });
      client._emit('notification', { test: 2 });
      client._emit('connected', { test: 3 });

      expect(events).to.have.lengthOf(3);
      expect(events[0].type).to.equal('event');
      expect(events[1].type).to.equal('notification');
      expect(events[2].type).to.equal('connected');
    });

    it('should throw error for unknown event type', () => {
      const client = new ConceptKernel('http://localhost:3000');

      expect(() => {
        client.on('unknown-event', () => {});
      }).to.throw('Unknown event type');
    });
  });

  describe('Connection Status', () => {
    it('should return initial status', () => {
      const client = new ConceptKernel('http://localhost:3000');
      const status = client.getStatus();

      expect(status).to.be.an('object');
      expect(status.discovered).to.be.false;
      expect(status.websocketConnected).to.be.false;
      expect(status.authenticated).to.be.false;
      expect(status.availableServices).to.be.an('array').that.is.empty;
    });
  });
});
