/**
 * @conceptkernel/ck-client-js - ConceptKernel JavaScript Client Library
 *
 * Copyright (c) 2024-2025 ConceptKernel.org
 * Contact: peter@styk.ai & dorota@styk.ai
 * Repository: https://github.com/ConceptKernel/ck-client-js
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
 */

console.log('[CK Client Library] Loading ConceptKernel client library with verbose logging...');

/**
 * UrnParser - Utility for parsing and normalizing ConceptKernel URNs
 */
class UrnParser {
  /**
   * Parse a ConceptKernel URN
   * @param {string} urn - URN to parse (e.g., "ckp://System.Wss:v0.1#schema")
   * @returns {Object} Parsed URN components
   */
  static parse(urn) {
    // ckp://System.Wss:v0.1#schema
    const match = urn.match(/^ckp:\/\/([^:]+)(?::([^#]+))?(?:#(.+))?$/);
    if (!match) throw new Error(`Invalid URN: ${urn}`);

    return {
      kernel: match[1],
      version: match[2] || null,
      fragment: match[3] || null
    };
  }

  /**
   * Build a URN from components
   * @param {string} kernel - Kernel name
   * @param {string} [version] - Optional version
   * @param {string} [fragment] - Optional fragment
   * @returns {string} Complete URN
   */
  static build(kernel, version, fragment) {
    let urn = `ckp://${kernel}`;
    if (version) urn += `:${version}`;
    if (fragment) urn += `#${fragment}`;
    return urn;
  }

  /**
   * Normalize a URN or simple kernel name
   * @param {string} input - URN or kernel name (e.g., "System.Wss" or "ckp://System.Wss:v0.1")
   * @returns {string} Normalized URN
   */
  static normalize(input) {
    // Convert "System.Wss" to "ckp://System.Wss"
    if (!input.startsWith('ckp://')) {
      return `ckp://${input}`;
    }
    return input;
  }
}

/**
 * MessageBuilder - Builds edge-based messages with transaction IDs
 */
class MessageBuilder {
  /**
   * @param {string} fromUrn - Source URN (e.g., "ckp://Agent.Alice")
   */
  constructor(fromUrn) {
    this.from = fromUrn;
  }

  /**
   * Generate a transaction ID in format: {timestampMs}-{shortGuid}
   * @returns {string} Transaction ID
   */
  generateTxId() {
    const timestamp = Date.now();
    const guid = Array.from({length: 8}, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `${timestamp}-${guid}`;
  }

  /**
   * Build an edge-based message
   * @param {string} edge - BFO predicate (QUERIES, RESPONDS, ANNOUNCES, etc.)
   * @param {string} to - Target kernel URN
   * @param {Object} payload - Message payload
   * @returns {Object} Edge-based message
   */
  build(edge, to, payload) {
    return {
      txId: this.generateTxId(),
      edge,
      from: this.from,
      to,
      payload
    };
  }
}

class ConceptKernel {
  /**
   * Connect to ConceptKernel gateway with auto-discovery
   *
   * @param {string} gatewayUrl - Gateway URL (e.g., 'http://localhost:56000' for local discovery)
   * @param {Object} [options] - Connection options
   * @param {boolean} [options.autoConnect=true] - Auto-connect WebSocket
   * @param {string} [options.identity='ckp://Agent.Anonymous'] - Client identity URN for edge-based messaging
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
   * // Connect with custom identity
   * const ck = await ConceptKernel.connect('http://localhost:56000', {
   *   identity: 'ckp://Agent.Alice'
   * });
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
      identity: options.identity || 'ckp://Agent.Anonymous',
      ...options
    };

    this.services = null;
    this.lastDiscovery = null;
    this.websocket = null;
    this.token = null;
    this.actor = null;
    this.roles = [];
    this.authenticated = false;

    // Try to restore token from previous session
    this._restoreToken();

    // Initialize MessageBuilder with identity
    this.messageBuilder = new MessageBuilder(this.options.identity);

    // Event handlers
    this._eventHandlers = {
      event: [],
      notification: [],
      request_accepted: [],
      kernel_response: [],
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
      this._cachedKernels = data.kernels || [];

      console.log('[CK Client] Discovered services:', Object.keys(this.services));
      console.log('[CK Client] Cached kernels:', this._cachedKernels.length);
      this._emit('discovered', { services: Object.keys(this.services) });

      return this.services;
    } catch (error) {
      console.error('[CK Client] Service discovery error:', error);
      throw error;
    }
  }

  /**
   * Emit event to a kernel (Edge-based messaging, v1.3.18+)
   *
   * @param {string} kernelUrn - Kernel URN or simple name (e.g., 'System.Wss' or 'ckp://System.Wss:v0.1')
   * @param {Object} payload - Event payload
   * @param {Object} [options] - Emit options
   * @param {string} [options.edge='QUERIES'] - Edge predicate (QUERIES, ANNOUNCES, TRANSFORMS, etc.)
   * @param {number} [options.timeout=10000] - Timeout for response (ms)
   * @returns {Promise<Object>} Response message with txId
   *
   * @example
   * ```javascript
   * // Query System.Wss capabilities
   * const response = await ck.emit('System.Wss', { action: 'capabilities' });
   * console.log('Capabilities:', response.payload);
   *
   * // Use custom edge predicate
   * await ck.emit('System.Bakery', { action: 'fork' }, { edge: 'TRANSFORMS' });
   * ```
   */
  async emit(kernelUrn, payload, options = {}) {
    console.log('[CK Client] emit() called (edge-based) - Kernel:', kernelUrn, 'Payload:', payload);

    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.error('[CK Client] WebSocket not connected!');
      throw new Error('WebSocket not connected. Call connect() first.');
    }

    // Normalize kernel URN and determine edge predicate
    const edge = options.edge || 'QUERIES';
    const to = UrnParser.normalize(kernelUrn);

    // Build edge-based message
    const message = this.messageBuilder.build(edge, to, payload);

    console.log('[CK Client] Sending edge message:', message);
    this.websocket.send(JSON.stringify(message));

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.error('[CK Client] Message timeout after', options.timeout || 10000, 'ms');
        reject(new Error('Message timeout'));
      }, options.timeout || 10000);

      // Listen for RESPONDS edge message
      const handler = (event) => {
        const data = JSON.parse(event.data);

        // Match response by txId and RESPONDS edge predicate
        if (data.txId === message.txId && data.edge === 'RESPONDS') {
          console.log('[CK Client] ✓ Received RESPONDS message:', data);
          clearTimeout(timeout);
          this.websocket.removeEventListener('message', handler);
          resolve(data);
        } else if (data.type === 'error' && data.txId === message.txId) {
          clearTimeout(timeout);
          this.websocket.removeEventListener('message', handler);
          reject(new Error(data.message || data.error || 'Message processing failed'));
        }
      };

      this.websocket.addEventListener('message', handler);
    });
  }

  /**
   * Query a kernel with QUERIES edge (alias for emit with default QUERIES edge)
   *
   * @param {string} kernelUrn - Target kernel URN
   * @param {Object} payload - Query payload
   * @param {Object} [options] - Query options
   * @returns {Promise<Object>} Query response
   *
   * @example
   * ```javascript
   * const result = await ck.query('System.Wss', { action: 'capabilities' });
   * ```
   */
  async query(kernelUrn, payload, options = {}) {
    return this.emit(kernelUrn, payload, { ...options, edge: 'QUERIES' });
  }

  /**
   * Query graph structure from ConceptKernel ontology
   * Note: query_graph action not implemented in System.Wss yet
   *
   * @deprecated Not yet implemented
   */
  async queryGraph(options = {}) {
    console.warn('[CK Client] queryGraph() not yet implemented in System.Wss');
    throw new Error('queryGraph() not yet implemented');
  }

  /**
   * Query graph using custom SPARQL
   * Execute arbitrary SPARQL queries against the ConceptKernel ontology
   *
   * @param {string} sparql - SPARQL query string
   * @param {Object} [options] - Query options
   * @param {string} [options.format='json'] - Result format ('json', 'csv', 'turtle')
   * @returns {Promise<Object>} Query results
   *
   * @example
   * ```javascript
   * // Find all kernels that QUERY System.Gateway
   * const sparql = `
   *   PREFIX ck: <http://conceptkernel.org/ontology#>
   *   SELECT ?kernel ?predicate
   *   WHERE {
   *     ?kernel ?predicate <ckp://System.Gateway> .
   *     FILTER(?predicate = ck:QUERIES)
   *   }
   * `;
   * const results = await ck.querySPARQL(sparql);
   * ```
   */
  async querySPARQL(sparql, options = {}) {
    console.log('[CK Client] querySPARQL() called');
    console.log('[CK Client] SPARQL query:', sparql);

    try {
      const response = await this.emit('System.Wss', {
        action: 'sparql',
        query: sparql,
        format: options.format || 'json',
        timestamp: new Date().toISOString()
      });

      console.log('[CK Client] ✓ SPARQL query response:', response);

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] SPARQL query failed:', error);
      throw error;
    }
  }

  /**
   * Get all predicates (edge types) used in the ontology
   * Useful for understanding available relationship types
   *
   * @returns {Promise<string[]>} List of predicate URNs
   *
   * @example
   * ```javascript
   * const predicates = await ck.getPredicates();
   * console.log('Available predicates:', predicates);
   * // ['QUERIES', 'ANNOUNCES', 'TRANSFORMS', 'DEPENDS_ON', ...]
   * ```
   */
  async getPredicates() {
    console.log('[CK Client] getPredicates() called');

    try {
      const response = await this.emit('System.Wss', {
        action: 'get_predicates',
        timestamp: new Date().toISOString()
      });

      console.log('[CK Client] ✓ Predicates response:', response);

      return response.payload?.predicates || response.predicates || [];
    } catch (error) {
      console.error('[CK Client] Get predicates failed:', error);
      throw error;
    }
  }

  /**
   * List all registered kernels (Continuants)
   * Returns kernels from discovery response
   *
   * @returns {Promise<Object>} Kernels list with count
   *
   * @example
   * ```javascript
   * const result = await ck.listKernels();
   * console.log('Kernels:', result.kernels);
   * console.log('Count:', result.count);
   * ```
   */
  async listKernels() {
    console.log('[CK Client] listKernels() called');

    // Kernels are in the discovery response, not a separate action
    if (!this.services) {
      await this.discover();
    }

    // Get kernels from last discovery
    const kernels = this._cachedKernels || [];

    // Extract kernel names (kernels are objects with {name, type, mode, ...})
    const kernelNames = kernels.map(k => {
      if (typeof k === 'string') return k;
      return k.name || k.urn || String(k);
    });

    return {
      kernels: kernelNames,
      rawKernels: kernels, // Keep raw objects for additional info
      count: kernelNames.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Query storage instances for a kernel (Occurrents)
   *
   * @param {string} kernelUrn - Kernel URN
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Maximum results
   * @returns {Promise<Object>} Storage items
   *
   * @example
   * ```javascript
   * const storage = await ck.queryStorage('ConceptKernel.LLM.Fabric', { limit: 20 });
   * console.log('Items:', storage.storage_items);
   * ```
   */
  async queryStorage(kernelUrn, options = {}) {
    console.log('[CK Client] queryStorage() called:', kernelUrn);

    // Normalize kernel URN
    const kernel = kernelUrn.replace('ckp://', '').split(':')[0];

    try {
      const response = await this.emit('System.Wss', {
        action: 'storage_list',
        kernel: kernel,
        limit: options.limit || 50,
        timestamp: new Date().toISOString()
      });

      console.log('[CK Client] ✓ Storage response:', response);

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] Query storage failed:', error);
      throw error;
    }
  }

  /**
   * Inspect specific storage instance
   *
   * @param {string} kernelUrn - Kernel URN
   * @param {string} item - Storage item filename
   * @returns {Promise<Object>} Storage item details
   *
   * @example
   * ```javascript
   * const item = await ck.inspectStorage('ConceptKernel.LLM.Fabric', '1765113570353-ugu4s78f.inst');
   * console.log('Payload:', item.payload);
   * ```
   */
  async inspectStorage(kernelUrn, item) {
    console.log('[CK Client] inspectStorage() called:', kernelUrn, item);

    const kernel = kernelUrn.replace('ckp://', '').split(':')[0];

    try {
      const response = await this.emit('System.Wss', {
        action: 'storage_inspect',
        kernel: kernel,
        item: item,
        timestamp: new Date().toISOString()
      });

      console.log('[CK Client] ✓ Inspect response:', response);

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] Inspect storage failed:', error);
      throw error;
    }
  }

  /**
   * Get system capabilities
   *
   * @returns {Promise<Object>} System capabilities
   *
   * @example
   * ```javascript
   * const caps = await ck.getCapabilities();
   * console.log('Capabilities:', caps.capabilities);
   * ```
   */
  async getCapabilities() {
    console.log('[CK Client] getCapabilities() called');

    try {
      const response = await this.emit('System.Wss', {
        action: 'capabilities',
        timestamp: new Date().toISOString()
      });

      console.log('[CK Client] ✓ Capabilities response:', response);

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] Get capabilities failed:', error);
      throw error;
    }
  }

  /**
   * Get kernel ontology
   *
   * @returns {Promise<Object>} Full BFO ontology
   *
   * @example
   * ```javascript
   * const ontology = await ck.getOntology();
   * console.log('Actions:', ontology.actions);
   * ```
   */
  async getOntology() {
    console.log('[CK Client] getOntology() called');

    try {
      const response = await this.emit('System.Wss', {
        action: 'ontology',
        timestamp: new Date().toISOString()
      });

      console.log('[CK Client] ✓ Ontology response:', response);

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] Get ontology failed:', error);
      throw error;
    }
  }

  /**
   * Query Process occurrents (BFO temporal entities)
   * Note: Currently not implemented in System.Wss
   * Use queryStorage() to list storage instances instead
   *
   * @deprecated Use queryStorage() or wait for System.Registry API implementation
   * @param {Object} [filters] - Query filters
   * @returns {Promise<Object>} Error or placeholder
   */
  async queryProcesses(filters = {}) {
    console.warn('[CK Client] queryProcesses() not yet implemented in System.Wss');
    console.warn('[CK Client] Use queryStorage() to list storage instances instead');
    throw new Error('queryProcesses() not yet implemented. Use queryStorage() instead.');
  }

  /**
   * Query Workflow occurrents
   * Note: Currently not implemented in System.Wss
   *
   * @deprecated Wait for System.Registry API implementation
   */
  async queryWorkflows(filters = {}) {
    console.warn('[CK Client] queryWorkflows() not yet implemented in System.Wss');
    throw new Error('queryWorkflows() not yet implemented');
  }

  /**
   * Query ImprovementProcess occurrents
   * Note: Currently not implemented in System.Wss
   *
   * @deprecated Wait for System.Registry API implementation
   */
  async queryImprovements(filters = {}) {
    console.warn('[CK Client] queryImprovements() not yet implemented in System.Wss');
    throw new Error('queryImprovements() not yet implemented');
  }

  /**
   * List all kernels in the system
   *
   * @returns {Promise<Object>} { kernels: Array<string>, count: number, rawKernels: Array }
   *
   * @example
   * ```javascript
   * const result = await ck.listKernels();
   * console.log('Found', result.count, 'kernels');
   * result.kernels.forEach(k => console.log(k));
   * ```
   */
  async listKernels() {
    console.log('[CK Client] listKernels() called');

    try {
      const response = await this.query('System.Wss', { action: 'kernels' });
      const payload = response.payload || response;

      return {
        kernels: (payload.kernels || []).map(k => k.name || k),
        count: payload.count || 0,
        rawKernels: payload.kernels || []
      };
    } catch (error) {
      console.error('[CK Client] listKernels failed:', error);
      throw error;
    }
  }

  /**
   * Query storage instances for a kernel
   *
   * @param {string} kernel - Kernel name
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=50] - Max number of items per page
   * @param {number} [options.offset=0] - Offset for pagination
   * @returns {Promise<Object>} { kernel: string, storage_items: Array, count: number, total: number, has_more: boolean }
   *
   * @example
   * ```javascript
   * const result = await ck.queryStorage('ConceptKernel.LLM.Fabric', { limit: 10, offset: 0 });
   * console.log('Found', result.count, 'of', result.total, 'items');
   * ```
   */
  async queryStorage(kernel, options = {}) {
    console.log('[CK Client] queryStorage() called:', kernel, options);

    try {
      const response = await this.query('System.Wss', {
        action: 'storage_list',
        kernel,
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] queryStorage failed:', error);
      throw error;
    }
  }

  /**
   * Create a paginator for storage items
   *
   * @param {string} kernel - Kernel name
   * @param {Object} [options] - Paginator options
   * @param {number} [options.pageSize=10] - Items per page
   * @returns {StoragePaginator} Paginator instance
   *
   * @example
   * ```javascript
   * const paginator = ck.storagePaginator('ConceptKernel.LLM.Fabric', { pageSize: 5 });
   * const page1 = await paginator.next();
   * const page2 = await paginator.next();
   * const prevPage = await paginator.prev();
   * ```
   */
  storagePaginator(kernel, options = {}) {
    return new StoragePaginator(this, kernel, options);
  }

  /**
   * Inspect a specific storage instance
   *
   * @param {string} kernel - Kernel name
   * @param {string} item - Storage item name (e.g., "1765113570353-ugu4s78f.inst")
   * @returns {Promise<Object>} { kernel: string, item: string, path: string, payload: Object }
   *
   * @example
   * ```javascript
   * const result = await ck.inspectStorage('ConceptKernel.LLM.Fabric', '1765113570353-ugu4s78f.inst');
   * console.log('Process URN:', result.payload.processUrn);
   * ```
   */
  async inspectStorage(kernel, item) {
    console.log('[CK Client] inspectStorage() called:', kernel, item);

    try {
      const response = await this.query('System.Wss', {
        action: 'storage_inspect',
        kernel,
        item
      });

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] inspectStorage failed:', error);
      throw error;
    }
  }

  /**
   * Get system capabilities
   *
   * @returns {Promise<Object>} System capabilities
   *
   * @example
   * ```javascript
   * const caps = await ck.getCapabilities();
   * console.log('Capabilities:', caps.capabilities);
   * ```
   */
  async getCapabilities() {
    console.log('[CK Client] getCapabilities() called');

    try {
      const response = await this.query('System.Wss', { action: 'capabilities' });
      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] getCapabilities failed:', error);
      throw error;
    }
  }

  /**
   * Get system ontology
   *
   * @returns {Promise<Object>} System ontology
   *
   * @example
   * ```javascript
   * const ont = await ck.getOntology();
   * console.log('Ontology:', ont.ontology);
   * ```
   */
  async getOntology() {
    console.log('[CK Client] getOntology() called');

    try {
      const response = await this.query('System.Wss', { action: 'ontology' });
      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] getOntology failed:', error);
      throw error;
    }
  }

  /**
   * Get kernel configuration (conceptkernel.yaml)
   *
   * @param {string} kernel - Kernel name
   * @returns {Promise<Object>} { kernel: string, config: string, exists: boolean }
   *
   * @example
   * ```javascript
   * const result = await ck.getConfig('ConceptKernel.LLM.Fabric');
   * console.log('Config:', result.config);
   * ```
   */
  async getConfig(kernel) {
    console.log('[CK Client] getConfig() called:', kernel);

    try {
      const response = await this.query('System.Wss', {
        action: 'config_get',
        kernel
      });

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] getConfig failed:', error);
      throw error;
    }
  }

  /**
   * Get kernel capabilities and introspection data
   *
   * @param {string} kernelUrn - Kernel URN (e.g., "System.Gateway" or "ckp://System.Gateway:v1.0")
   * @returns {Promise<Object>} Kernel capabilities
   *
   * @example
   * ```javascript
   * const capabilities = await ck.introspect('System.Gateway');
   * console.log('Actions:', capabilities.actions);
   * console.log('Edges:', capabilities.edges);
   * console.log('Version:', capabilities.version);
   * ```
   */
  async introspect(kernelUrn) {
    console.log('[CK Client] introspect() called:', kernelUrn);

    try {
      // Try to get kernel-specific capabilities via config
      const config = await this.getConfig(kernelUrn);
      if (config && config.exists) {
        return JSON.parse(config.config);
      }

      // Fall back to system capabilities
      return await this.getCapabilities();
    } catch (error) {
      console.error('[CK Client] Introspect failed:', error);
      throw error;
    }
  }

  /**
   * List pending queue items for a kernel
   *
   * @param {string} kernel - Kernel name
   * @returns {Promise<Object>} { kernel: string, queue_items: Array, count: number }
   *
   * @example
   * ```javascript
   * const queue = await ck.listQueue('ConceptKernel.LLM.Fabric');
   * console.log('Pending items:', queue.count);
   * ```
   */
  async listQueue(kernel) {
    console.log('[CK Client] listQueue() called:', kernel);

    try {
      const response = await this.query('System.Wss', {
        action: 'queue_list',
        kernel
      });

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] listQueue failed:', error);
      throw error;
    }
  }

  /**
   * List edges (predicates) for a kernel
   *
   * @param {string} kernel - Kernel name
   * @returns {Promise<Object>} { incoming_edges: Array, outgoing_edges: Array, total_incoming: number, total_outgoing: number }
   *
   * @example
   * ```javascript
   * const edges = await ck.listEdges('ConceptKernel.LLM.Fabric');
   * console.log('Incoming edges:', edges.total_incoming);
   * console.log('Outgoing edges:', edges.total_outgoing);
   * ```
   */
  async listEdges(kernel) {
    console.log('[CK Client] listEdges() called:', kernel);

    try {
      const response = await this.query('System.Wss', {
        action: 'edges_list',
        kernel
      });

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] listEdges failed:', error);
      throw error;
    }
  }

  /**
   * List recent Process URNs for a kernel
   *
   * @param {string} kernel - Kernel name
   * @param {Object} [options] - Query options
   * @param {number} [options.limit=20] - Max number of processes
   * @returns {Promise<Object>} { kernel: string, processes: Array, count: number }
   *
   * @example
   * ```javascript
   * const processes = await ck.listProcesses('ConceptKernel.LLM.Fabric', { limit: 10 });
   * console.log('Recent processes:', processes.count);
   * processes.processes.forEach(p => console.log(p.process_urn));
   * ```
   */
  async listProcesses(kernel, options = {}) {
    console.log('[CK Client] listProcesses() called:', kernel, options);

    try {
      const response = await this.query('System.Wss', {
        action: 'processes_recent',
        kernel,
        limit: options.limit || 20
      });

      return response.payload || response;
    } catch (error) {
      console.error('[CK Client] listProcesses failed:', error);
      throw error;
    }
  }

  /**
   * Get schema for kernel action
   *
   * @param {string} kernelUrn - Kernel URN
   * @param {string} edge - Edge predicate (QUERIES, TRANSFORMS, etc.)
   * @param {string} action - Action name
   * @returns {Promise<Object>} JSON Schema for action payload
   *
   * @example
   * ```javascript
   * const schema = await ck.getSchema('System.Wss', 'QUERIES', 'capabilities');
   * console.log('Required fields:', schema.required);
   * ```
   */
  async getSchema(kernelUrn, edge, action) {
    const normalizedUrn = UrnParser.normalize(kernelUrn);
    const schemaUrn = `${normalizedUrn}#schema/${edge}/${action}`;

    console.log('[CK Client] getSchema():', schemaUrn);

    try {
      const response = await this.emit('System.Wss', {
        action: 'get_schema',
        schema_urn: schemaUrn,
        timestamp: new Date().toISOString()
      });

      console.log('[CK Client] ✓ Schema response:', response);

      return response.payload?.schema || response.schema || null;
    } catch (error) {
      console.error('[CK Client] Get schema failed:', error);
      throw error;
    }
  }

  /**
   * Check if current user has permission for action
   * Client-side permission checking based on roles
   *
   * @param {string} action - Action name
   * @param {string} [resource] - Optional resource URN
   * @returns {boolean} True if permitted
   *
   * @example
   * ```javascript
   * if (ck.hasPermission('bootstrap_kernel')) {
   *   await ck.bootstrapKernel(config);
   * }
   * ```
   */
  hasPermission(action, resource = null) {
    // Anonymous users have limited permissions
    if (!this.authenticated || this.roles.includes('anonymous')) {
      const anonymousAllowed = [
        'query', 'query_graph', 'query_urn', 'get_predicates',
        'introspect', 'get_schema', 'capabilities'
      ];
      return anonymousAllowed.includes(action);
    }

    // Admin has all permissions
    if (this.roles.includes('admin')) {
      return true;
    }

    // Developer can bootstrap kernels and query
    if (this.roles.includes('developer')) {
      const developerAllowed = [
        'bootstrap_kernel', 'query', 'query_graph', 'query_urn',
        'introspect', 'get_schema', 'sparql'
      ];
      return developerAllowed.includes(action);
    }

    // User can query only
    if (this.roles.includes('user')) {
      const userAllowed = ['query', 'query_graph', 'query_urn', 'introspect'];
      return userAllowed.includes(action);
    }

    return false;
  }

  /**
   * Persist token to localStorage (browser only)
   * Enables anonymous users to maintain identity across sessions
   *
   * @private
   */
  _persistToken() {
    if (typeof localStorage !== 'undefined' && this.token) {
      const tokenData = {
        token: this.token,
        actor: this.actor,
        roles: this.roles,
        authenticated: this.authenticated,
        timestamp: Date.now()
      };
      localStorage.setItem('ckp_token', JSON.stringify(tokenData));
      console.log('[CK Client] Token persisted to localStorage');
    }
  }

  /**
   * Restore token from localStorage (browser only)
   * Automatically called during connection
   *
   * @private
   */
  _restoreToken() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('ckp_token');
      if (stored) {
        try {
          const tokenData = JSON.parse(stored);
          // Check if token is not too old (7 days)
          if (Date.now() - tokenData.timestamp < 7 * 24 * 60 * 60 * 1000) {
            this.token = tokenData.token;
            this.actor = tokenData.actor;
            this.roles = tokenData.roles || [];
            this.authenticated = tokenData.authenticated;
            console.log('[CK Client] Token restored from localStorage:', this.actor);
            return true;
          }
        } catch (err) {
          console.error('[CK Client] Failed to restore token:', err);
        }
      }
    }
    return false;
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

    // Security check: Warn if credentials sent over unencrypted connection
    const wsUrl = this.websocket.url;
    if (wsUrl.startsWith('ws://') && !wsUrl.includes('localhost') && !wsUrl.includes('127.0.0.1')) {
      console.warn('[CK Client] ⚠️  WARNING: Sending credentials over unencrypted WebSocket (ws://)');
      console.warn('[CK Client] ⚠️  Use wss:// for production environments!');
      throw new Error('Insecure connection: credentials cannot be sent over ws:// in production. Use wss:// (localhost/127.0.0.1 excluded for development)');
    }

    if (wsUrl.startsWith('wss://')) {
      console.log('[CK Client] ✓ Secure WebSocket connection (wss://)');
    } else {
      console.log('[CK Client] ℹ️  Development mode: localhost/127.0.0.1 connection allowed');
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

          // Persist upgraded token
          this._persistToken();

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
        current_token: this.token || '',  // Send empty string if null
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
    // Handle edge-based messages (v1.3.18+)
    if (data.edge) {
      console.log('[CK Client] Edge message received:', data.edge, 'from', data.from);

      // Edge-based messages are handled by emit() promise resolver
      // Also emit events for general listeners
      if (data.edge === 'RESPONDS') {
        this._emit('kernel_response', data);
      } else if (data.edge === 'ANNOUNCES') {
        this._emit('event', data);
        this._emit('notification', data);
      }
      return;
    }

    // Handle legacy message types
    switch (data.type) {
      case 'connected':
        // Initial welcome with anonymous token
        this.token = data.token;
        this.actor = data.actor;
        this.roles = data.roles || ['anonymous'];
        this.authenticated = false;
        // Persist anonymous token for session continuity
        this._persistToken();
        break;

      case 'event':
      case 'notification':
        // Normalize kernel field (server might send 'from', 'source', or 'kernel')
        if (!data.kernel && (data.from || data.source)) {
          data.kernel = data.from || data.source;
        }
        this._emit('event', data);
        if (data.type === 'notification') {
          this._emit('notification', data);
        }
        break;

      case 'kernel_request_accepted':
        // Handled by emit() promise resolver
        // Also emit for listeners
        console.log('[CK Client] kernel_request_accepted received:', data);
        this._emit('request_accepted', data);
        break;

      case 'kernel_response':
        // Response from kernel processing (with matching txId)
        console.log('[CK Client] kernel_response received:', data);
        // Normalize kernel field (server might send 'from', 'source', or 'kernel')
        if (!data.kernel && (data.from || data.source)) {
          data.kernel = data.from || data.source;
        }
        this._emit('kernel_response', data);
        break;

      case 'error':
        this._emit('error', { message: data.message, context: data.context });
        break;

      // token_upgraded handled in authenticate() method
      case 'token_upgraded':
        // Persist upgraded token
        this._persistToken();
        break;

      // kernel_bootstrapped handled by bootstrapKernel() method
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

/**
 * Storage Paginator - provides next/prev navigation through storage items
 */
class StoragePaginator {
  constructor(client, kernel, options = {}) {
    this.client = client;
    this.kernel = kernel;
    this.pageSize = options.pageSize || 10;
    this.currentOffset = 0;
    this.currentPage = null;
    this.totalItems = 0;
  }

  /**
   * Fetch the next page
   * @returns {Promise<Object>} Page data with items, metadata, and navigation info
   */
  async next() {
    const result = await this.client.queryStorage(this.kernel, {
      limit: this.pageSize,
      offset: this.currentOffset
    });

    this.currentPage = result;
    this.totalItems = result.total || 0;

    // Only advance offset if there are items returned
    if (result.storage_items && result.storage_items.length > 0) {
      this.currentOffset += result.storage_items.length;
    }

    return {
      items: result.storage_items || [],
      count: result.count || 0,
      total: result.total || 0,
      offset: result.offset || 0,
      hasMore: result.has_more || false,
      hasPrev: (result.offset || 0) > 0,
      pageNumber: Math.floor((result.offset || 0) / this.pageSize) + 1,
      totalPages: Math.ceil((result.total || 0) / this.pageSize)
    };
  }

  /**
   * Fetch the previous page
   * @returns {Promise<Object>} Page data with items, metadata, and navigation info
   */
  async prev() {
    // Calculate previous offset
    const prevOffset = Math.max(0, this.currentOffset - (this.pageSize * 2));
    this.currentOffset = prevOffset;

    return await this.next();
  }

  /**
   * Jump to a specific page (1-indexed)
   * @param {number} pageNum - Page number to jump to (1-indexed)
   * @returns {Promise<Object>} Page data
   */
  async goToPage(pageNum) {
    const offset = (pageNum - 1) * this.pageSize;
    this.currentOffset = Math.max(0, offset);
    return await this.next();
  }

  /**
   * Reset to the first page
   * @returns {Promise<Object>} First page data
   */
  async reset() {
    this.currentOffset = 0;
    return await this.next();
  }

  /**
   * Get current pagination state
   * @returns {Object} Current state
   */
  getState() {
    return {
      currentOffset: this.currentOffset,
      pageSize: this.pageSize,
      totalItems: this.totalItems,
      currentPageNumber: Math.floor(this.currentOffset / this.pageSize) + 1,
      totalPages: Math.ceil(this.totalItems / this.pageSize)
    };
  }
}

// Export for both browser and Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConceptKernel;
}

if (typeof window !== 'undefined') {
  window.ConceptKernel = ConceptKernel;
}
