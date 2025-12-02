/**
 * @conceptkernel/ck-client-js - ConceptKernel JavaScript Client Library
 *
 * Elegant one-line connectivity to ConceptKernel runtime
 *
 * @example
 * ```javascript
 * // Connect to gateway (auto-discover all services)
 * const ck = await ConceptKernel.connect('http://localhost:56000');
 *
 * // Emit event to kernel (done!)
 * await ck.emit('UI.Bakery', { action: 'mix', ingredients: ['flour', 'eggs'] });
 *
 * // Listen for events
 * ck.on('event', (event) => {
 *   console.log('Received:', event);
 * });
 * ```
 *
 * @license MIT
 */

console.log('[CK Client Library] Loading ConceptKernel client library with verbose logging...');

class ConceptKernel {
  /**
   * Connect to ConceptKernel gateway with auto-discovery
   *
   * @param {string} gatewayUrl - Gateway URL (e.g., 'http://localhost:56000' for local discovery)
   * @param {Object} [options] - Connection options
   * @param {boolean} [options.autoConnect=true] - Auto-connect WebSocket
   * @param {Object} [options.auth] - Authentication credentials
   * @param {string} [options.auth.username] - Username
   * @param {string} [options.auth.password] - Password
   * @param {number} [options.cacheTimeout=60000] - Service discovery cache timeout (ms)
   * @param {boolean} [options.reconnect=true] - Auto-reconnect WebSocket on disconnect
   * @param {number} [options.reconnectDelay=3000] - Reconnect delay (ms)
   * @returns {Promise<ConceptKernel>} Connected client instance
   *
   * @example
   * ```javascript
   * // Connect to local discovery port
   * const ck = await ConceptKernel.connect('http://localhost:56000');
   *
   * // Connect with authentication
   * const ck = await ConceptKernel.connect('http://localhost:56000', {
   *   auth: { username: 'alice', password: 'secret123' }
   * });
   *
   * // Connect to remote gateway
   * const ck = await ConceptKernel.connect('https://gateway.example.com', {
   *   autoConnect: false
   * });
   * ```
   */
  static async connect(gatewayUrl, options = {}) {
    if (!gatewayUrl) {
      throw new Error('gatewayUrl is required (e.g., "http://localhost:56000" for local discovery)');
    }
    console.log('[CK Client] Connecting to gateway:', gatewayUrl);
    console.log('[CK Client] Options:', options);

    const client = new ConceptKernel(gatewayUrl, options);

    console.log('[CK Client] Starting service discovery...');
    await client.discover();
    console.log('[CK Client] Service discovery complete. Services:', client.getAvailableServices());

    if (options.autoConnect !== false && client.hasService('websocket')) {
      console.log('[CK Client] Auto-connecting WebSocket...');
      await client._connectWebSocket();

      // Authenticate if credentials provided
      if (options.auth) {
        console.log('[CK Client] Authenticating with provided credentials...');
        await client.authenticate(options.auth.username, options.auth.password);
      }
    } else {
      console.log('[CK Client] Skipping WebSocket connection (autoConnect=false or no websocket service)');
    }

    console.log('[CK Client] Connection complete!');
    return client;
  }

  /**
   * Create a new ConceptKernel client (use .connect() instead)
   * @private
   */
  constructor(gatewayUrl, options = {}) {
    this.gatewayUrl = gatewayUrl;
    this.options = {
      cacheTimeout: 60000,
      reconnect: true,
      reconnectDelay: 3000,
      ...options
    };

    this.services = null;
    this.lastDiscovery = null;
    this.websocket = null;
    this.token = null;
    this.actor = null;
    this.roles = [];
    this.authenticated = false;

    // Event handlers
    this._eventHandlers = {
      event: [],
      notification: [],
      connected: [],
      authenticated: [],
      disconnected: [],
      error: []
    };
  }

  /**
   * Discover available services from gateway
   * @returns {Promise<Object>} Service map
   */
  async discover(forceRefresh = false) {
    console.log('[CK Client] discover() called, forceRefresh:', forceRefresh);

    // Return cached services if still valid
    if (!forceRefresh && this.services && this.lastDiscovery) {
      const age = Date.now() - this.lastDiscovery;
      if (age < this.options.cacheTimeout) {
        console.log('[CK Client] Using cached services (age:', age, 'ms)');
        return this.services;
      }
    }

    const url = `${this.gatewayUrl}/.well-known/ck-services`;
    console.log('[CK Client] Fetching service discovery:', url);

    try {
      const response = await this._fetch(url);
      console.log('[CK Client] Service discovery response status:', response.status, response.statusText);

      if (!response.ok) {
        console.error('[CK Client] Service discovery failed:', response.status, response.statusText);
        throw new Error(`Service discovery failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[CK Client] Service discovery data:', data);

      this.services = data.services || {};
      this.lastDiscovery = Date.now();
      this.ckVersion = data.ck_version;
      this.domain = data.domain;

      console.log('[CK Client] Discovered services:', Object.keys(this.services));
      this._emit('discovered', { services: Object.keys(this.services) });

      return this.services;
    } catch (error) {
      console.error('[CK Client] Service discovery error:', error);
      throw error;
    }
  }

  /**
   * Emit event to a kernel
   *
   * @param {string} kernelUrn - Kernel URN or simple name (e.g., 'UI.Bakery' or 'ckp://UI.Bakery:v1')
   * @param {Object} payload - Event payload
   * @param {Object} [options] - Emit options
   * @param {string} [options.txId] - Transaction ID (auto-generated if not provided)
   * @returns {Promise<Object>} Result with txId and processUrn
   *
   * @example
   * ```javascript
   * // Simple emit
   * await ck.emit('UI.Bakery', { action: 'mix' });
   *
   * // With full URN
   * await ck.emit('ckp://UI.Bakery:v1', { action: 'bake', temp: 350 });
   *
   * // Get transaction ID
   * const result = await ck.emit('UI.Bakery', { action: 'mix' });
   * console.log('Transaction:', result.txId);
   * ```
   */
  async emit(kernelUrn, payload, options = {}) {
    console.log('[CK Client] emit() called - Kernel:', kernelUrn, 'Payload:', payload);

    const gatewayService = this.getService('gateway');
    console.log('[CK Client] Gateway service:', gatewayService);

    if (!gatewayService) {
      console.error('[CK Client] Gateway service not available!');
      throw new Error('Gateway service not available');
    }

    const emitUrl = gatewayService.endpoints.emit || gatewayService.endpoints.http;
    console.log('[CK Client] Emit URL:', emitUrl);

    if (!emitUrl) {
      console.error('[CK Client] Gateway emit endpoint not found!');
      throw new Error('Gateway emit endpoint not found');
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-CK-Kernel': kernelUrn
    };

    // Include authentication token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      console.log('[CK Client] Including auth token in request');
    }

    if (options.txId) {
      headers['X-CK-TxId'] = options.txId;
    }

    console.log('[CK Client] Sending POST request to:', emitUrl);
    console.log('[CK Client] Headers:', headers);
    console.log('[CK Client] Body:', JSON.stringify(payload));

    try {
      const response = await this._fetch(emitUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      console.log('[CK Client] Emit response status:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Emit failed' }));
        console.error('[CK Client] Emit failed:', error);
        throw new Error(error.error || `Emit failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('[CK Client] Emit result:', result);
      return result;
    } catch (error) {
      console.error('[CK Client] Emit error:', error);
      throw error;
    }
  }

  /**
   * Authenticate with username and password
   *
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Authentication result with token and roles
   *
   * @example
   * ```javascript
   * await ck.authenticate('alice', 'secret123');
   * console.log('Roles:', ck.roles);
   * ```
   */
  async authenticate(username, password) {
    console.log('[CK Client] authenticate() called - Username:', username);
    console.log('[CK Client] WebSocket state:', this.websocket?.readyState);

    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.error('[CK Client] WebSocket not connected!');
      throw new Error('WebSocket not connected. Call connect() first.');
    }

    console.log('[CK Client] Sending upgrade_token message...');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[CK Client] Authentication timeout after 10s');
        reject(new Error('Authentication timeout'));
      }, 10000);

      // Listen for token_upgraded response
      const handler = (event) => {
        console.log('[CK Client] Received WebSocket message during auth:', event.data);
        const data = JSON.parse(event.data);
        console.log('[CK Client] Parsed auth message:', data);

        if (data.type === 'token_upgraded') {
          console.log('[CK Client] Token upgraded successfully!');
          clearTimeout(timeout);
          this.websocket.removeEventListener('message', handler);

          this.token = data.token;
          this.actor = data.actor;
          this.roles = data.roles || [];
          this.authenticated = true;

          console.log('[CK Client] New token:', this.token);
          console.log('[CK Client] Actor:', this.actor);
          console.log('[CK Client] Roles:', this.roles);

          this._emit('authenticated', { actor: this.actor, roles: this.roles });
          resolve({ token: data.token, actor: data.actor, roles: data.roles });
        } else if (data.type === 'error' && data.context === 'upgrade_token') {
          clearTimeout(timeout);
          this.websocket.removeEventListener('message', handler);
          reject(new Error(data.message || 'Authentication failed'));
        }
      };

      this.websocket.addEventListener('message', handler);

      // Send upgrade_token request
      this.websocket.send(JSON.stringify({
        type: 'upgrade_token',
        current_token: this.token,
        credentials: { username, password }
      }));
    });
  }

  /**
   * Bootstrap a new kernel dynamically
   *
   * @param {Object} config - Kernel configuration
   * @param {string} config.kernel - Kernel URN
   * @param {string} config.kernelType - Kernel type (e.g., 'rust:hot', 'node:cold')
   * @param {string} [config.description] - Kernel description
   * @param {string[]} [config.edges] - Edge predicates
   * @returns {Promise<Object>} Bootstrap result
   *
   * @example
   * ```javascript
   * await ck.bootstrapKernel({
   *   kernel: 'ckp://MyApp.Service:v1',
   *   kernelType: 'rust:hot',
   *   description: 'My custom service',
   *   edges: ['System.Gateway', 'System.Wss']
   * });
   * ```
   */
  async bootstrapKernel(config) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    if (!this.authenticated) {
      throw new Error('Authentication required for kernel bootstrap');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Bootstrap timeout'));
      }, 30000);

      const handler = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'kernel_bootstrapped' && data.kernel === config.kernel) {
          clearTimeout(timeout);
          this.websocket.removeEventListener('message', handler);
          resolve(data);
        } else if (data.type === 'error' && data.context === 'bootstrap_kernel') {
          clearTimeout(timeout);
          this.websocket.removeEventListener('message', handler);
          reject(new Error(data.message || 'Bootstrap failed'));
        }
      };

      this.websocket.addEventListener('message', handler);

      this.websocket.send(JSON.stringify({
        type: 'bootstrap_kernel',
        actor: this.actor || 'ckp://System.Oidc.User#anonymous',
        kernel: config.kernel,
        kernel_type: config.kernelType,
        bfo_class: config.bfoClass || 'ckp://BFO#Continuant',
        description: config.description || '',
        edges: config.edges || []
      }));
    });
  }

  /**
   * Register event handler
   *
   * @param {string} eventType - Event type ('event', 'notification', 'connected', 'authenticated', 'disconnected', 'error')
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   *
   * @example
   * ```javascript
   * // Listen for all events
   * ck.on('event', (event) => {
   *   console.log('Event from', event.kernel, ':', event.data);
   * });
   *
   * // Listen for connection status
   * ck.on('connected', () => console.log('Connected!'));
   * ck.on('disconnected', () => console.log('Disconnected'));
   *
   * // Unsubscribe
   * const unsubscribe = ck.on('event', handler);
   * unsubscribe(); // Stop listening
   * ```
   */
  on(eventType, handler) {
    if (!this._eventHandlers[eventType]) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    this._eventHandlers[eventType].push(handler);

    // Return unsubscribe function
    return () => {
      const index = this._eventHandlers[eventType].indexOf(handler);
      if (index > -1) {
        this._eventHandlers[eventType].splice(index, 1);
      }
    };
  }

  /**
   * Get service by name
   * @param {string} serviceName - Service name (gateway, websocket, oidc, registry)
   * @returns {Object|null} Service configuration
   */
  getService(serviceName) {
    if (!this.services) {
      return null;
    }
    return this.services[serviceName] || null;
  }

  /**
   * Check if service is available
   * @param {string} serviceName - Service name
   * @returns {boolean}
   */
  hasService(serviceName) {
    return this.getService(serviceName) !== null;
  }

  /**
   * Get all available service names
   * @returns {string[]}
   */
  getAvailableServices() {
    if (!this.services) return [];
    return Object.keys(this.services);
  }

  /**
   * Get connection status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      discovered: this.services !== null,
      lastDiscovery: this.lastDiscovery,
      cacheAge: this.lastDiscovery ? Date.now() - this.lastDiscovery : null,
      websocketConnected: !!(this.websocket && this.websocket.readyState === WebSocket.OPEN),
      authenticated: this.authenticated,
      actor: this.actor,
      roles: this.roles,
      availableServices: this.getAvailableServices()
    };
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Connect to WebSocket service
   * @private
   */
  async _connectWebSocket() {
    const wsService = this.getService('websocket');

    if (!wsService) {
      throw new Error('WebSocket service not available');
    }

    // Prefer ws:// over wss:// for local development
    const wsUrl = wsService.endpoints.ws || wsService.endpoints.wss;

    if (!wsUrl) {
      throw new Error('No WebSocket endpoint found');
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        this.websocket = ws;
        this._emit('connected', { url: wsUrl });
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._handleWebSocketMessage(data);
        } catch (err) {
          console.error('[ConceptKernel] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        this._emit('disconnected', {});

        // Auto-reconnect if enabled
        if (this.options.reconnect && this.websocket) {
          setTimeout(() => {
            this._connectWebSocket().catch(err => {
              this._emit('error', { message: 'Reconnect failed', error: err });
            });
          }, this.options.reconnectDelay);
        }

        this.websocket = null;
      };

      ws.onerror = (error) => {
        this._emit('error', { message: 'WebSocket error', error });
        reject(error);
      };
    });
  }

  /**
   * Handle WebSocket message
   * @private
   */
  _handleWebSocketMessage(data) {
    switch (data.type) {
      case 'connected':
        // Initial welcome with anonymous token
        this.token = data.token;
        this.actor = data.actor;
        this.roles = data.roles || ['anonymous'];
        this.authenticated = false;
        break;

      case 'event':
      case 'notification':
        this._emit('event', data);
        if (data.type === 'notification') {
          this._emit('notification', data);
        }
        break;

      case 'error':
        this._emit('error', { message: data.message, context: data.context });
        break;

      // token_upgraded and kernel_bootstrapped handled by their respective methods
    }
  }

  /**
   * Emit event to handlers
   * @private
   */
  _emit(eventType, data) {
    if (this._eventHandlers[eventType]) {
      this._eventHandlers[eventType].forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[ConceptKernel] Event handler error (${eventType}):`, err);
        }
      });
    }
  }

  /**
   * Fetch with timeout
   * @private
   */
  async _fetch(url, options = {}) {
    const timeout = options.timeout || 10000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConceptKernel;
}

if (typeof window !== 'undefined') {
  window.ConceptKernel = ConceptKernel;
}
