/**
 * @conceptkernel/ck-client-js - TypeScript Definitions
 * ConceptKernel JavaScript Client Library
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
 */

declare module '@conceptkernel/ck-client-js' {
  /**
   * Connection options for ConceptKernel client
   */
  export interface ConnectionOptions {
    /** Auto-connect WebSocket on initialization (default: true) */
    autoConnect?: boolean;
    /** Authentication credentials */
    auth?: {
      username: string;
      password: string;
    };
    /** Service discovery cache timeout in milliseconds (default: 60000) */
    cacheTimeout?: number;
    /** Auto-reconnect WebSocket on disconnect (default: true) */
    reconnect?: boolean;
    /** Reconnect delay in milliseconds (default: 3000) */
    reconnectDelay?: number;
  }

  /**
   * Emit options for kernel invocation
   */
  export interface EmitOptions {
    /** Transaction ID (auto-generated if not provided) */
    txId?: string;
  }

  /**
   * Service endpoint configuration
   */
  export interface ServiceEndpoint {
    http?: string;
    https?: string;
    ws?: string;
    wss?: string;
    emit?: string;
  }

  /**
   * Service configuration
   */
  export interface Service {
    /** Kernel URN */
    urn: string;
    /** Service endpoints */
    endpoints: ServiceEndpoint;
    /** Service capabilities */
    capabilities: string[];
  }

  /**
   * Service discovery response
   */
  export interface ServiceMap {
    [serviceName: string]: Service;
  }

  /**
   * Emit result with transaction tracking
   */
  export interface EmitResult {
    /** Transaction ID */
    txId: string;
    /** BFO Process URN for temporal tracking */
    processUrn: string;
    /** Target kernel URN */
    kernel: string;
    /** Message from gateway */
    message?: string;
  }

  /**
   * Authentication result
   */
  export interface AuthResult {
    /** JWT token */
    token: string;
    /** Actor URN (e.g., ckp://System.Oidc.User#alice) */
    actor: string;
    /** Assigned roles */
    roles: string[];
  }

  /**
   * Kernel bootstrap configuration
   */
  export interface KernelBootstrapConfig {
    /** Kernel URN (e.g., ckp://MyApp.Service:v1) */
    kernel: string;
    /** Kernel type (e.g., 'rust:hot', 'node:cold', 'python:cold') */
    kernelType: string;
    /** Kernel description */
    description?: string;
    /** Edge predicates for routing */
    edges?: string[];
    /** BFO class (default: ckp://BFO#Continuant) */
    bfoClass?: string;
  }

  /**
   * Bootstrap result
   */
  export interface BootstrapResult {
    /** Bootstrap result type */
    type: 'kernel_bootstrapped';
    /** Kernel URN */
    kernel: string;
    /** Bootstrap timestamp */
    timestamp: string;
    /** Process URN */
    processUrn: string;
  }

  /**
   * Event data from WebSocket
   */
  export interface Event {
    /** Event type */
    type: 'event' | 'notification';
    /** Source kernel URN */
    kernel: string;
    /** Transaction ID */
    txId: string;
    /** Event timestamp */
    timestamp: string;
    /** Event payload */
    data: any;
    /** Process URN */
    processUrn?: string;
  }

  /**
   * Connection status
   */
  export interface ConnectionStatus {
    /** Service discovery completed */
    discovered: boolean;
    /** Last discovery timestamp */
    lastDiscovery: number | null;
    /** Service cache age in milliseconds */
    cacheAge: number | null;
    /** WebSocket connection status */
    websocketConnected: boolean;
    /** Authentication status */
    authenticated: boolean;
    /** Current actor URN */
    actor: string | null;
    /** Assigned roles */
    roles: string[];
    /** Available service names */
    availableServices: string[];
  }

  /**
   * Event handler type
   */
  export type EventHandler<T = any> = (data: T) => void;

  /**
   * Unsubscribe function
   */
  export type Unsubscribe = () => void;

  /**
   * ConceptKernel client class
   */
  export default class ConceptKernel {
    /**
     * Connect to ConceptKernel gateway with auto-discovery
     *
     * @param gatewayUrl - Gateway URL (e.g., 'http://localhost:56000' for local discovery)
     * @param options - Connection options
     * @returns Connected client instance
     *
     * @example
     * ```typescript
     * // Connect to local discovery port
     * const ck = await ConceptKernel.connect('http://localhost:56000');
     *
     * // Connect with authentication
     * const ck = await ConceptKernel.connect('http://localhost:56000', {
     *   auth: { username: 'alice', password: 'secret123' }
     * });
     * ```
     */
    static connect(
      gatewayUrl: string,
      options?: ConnectionOptions
    ): Promise<ConceptKernel>;

    /**
     * Gateway URL
     */
    readonly gatewayUrl: string;

    /**
     * Connection options
     */
    readonly options: Required<ConnectionOptions>;

    /**
     * Discovered services
     */
    services: ServiceMap | null;

    /**
     * Last service discovery timestamp
     */
    lastDiscovery: number | null;

    /**
     * WebSocket connection
     */
    websocket: WebSocket | null;

    /**
     * Current JWT token
     */
    token: string | null;

    /**
     * Current actor URN
     */
    actor: string | null;

    /**
     * Assigned roles
     */
    roles: string[];

    /**
     * Authentication status
     */
    authenticated: boolean;

    /**
     * ConceptKernel version
     */
    ckVersion?: string;

    /**
     * Domain name
     */
    domain?: string;

    /**
     * Discover available services from gateway
     *
     * @param forceRefresh - Force refresh even if cache is valid
     * @returns Service map
     */
    discover(forceRefresh?: boolean): Promise<ServiceMap>;

    /**
     * Emit event to a kernel
     *
     * @param kernelUrn - Kernel URN or simple name (e.g., 'UI.Bakery')
     * @param payload - Event payload
     * @param options - Emit options
     * @returns Result with txId and processUrn
     *
     * @example
     * ```typescript
     * // Simple emit
     * await ck.emit('UI.Bakery', { action: 'mix' });
     *
     * // With full URN
     * await ck.emit('ckp://UI.Bakery:v1', { action: 'bake', temp: 350 });
     * ```
     */
    emit(
      kernelUrn: string,
      payload: any,
      options?: EmitOptions
    ): Promise<EmitResult>;

    /**
     * Authenticate with username and password
     *
     * @param username - Username
     * @param password - Password
     * @returns Authentication result with token and roles
     *
     * @example
     * ```typescript
     * await ck.authenticate('alice', 'secret123');
     * console.log('Roles:', ck.roles);
     * ```
     */
    authenticate(username: string, password: string): Promise<AuthResult>;

    /**
     * Bootstrap a new kernel dynamically
     *
     * @param config - Kernel configuration
     * @returns Bootstrap result
     *
     * @example
     * ```typescript
     * await ck.bootstrapKernel({
     *   kernel: 'ckp://MyApp.Service:v1',
     *   kernelType: 'rust:hot',
     *   description: 'My custom service'
     * });
     * ```
     */
    bootstrapKernel(config: KernelBootstrapConfig): Promise<BootstrapResult>;

    /**
     * Register event handler
     *
     * @param eventType - Event type
     * @param handler - Event handler function
     * @returns Unsubscribe function
     *
     * @example
     * ```typescript
     * // Listen for events
     * ck.on('event', (event) => {
     *   console.log('Event:', event);
     * });
     *
     * // Unsubscribe
     * const unsubscribe = ck.on('event', handler);
     * unsubscribe();
     * ```
     */
    on(eventType: 'event', handler: EventHandler<Event>): Unsubscribe;
    on(eventType: 'notification', handler: EventHandler<Event>): Unsubscribe;
    on(eventType: 'connected', handler: EventHandler<{ url: string }>): Unsubscribe;
    on(eventType: 'authenticated', handler: EventHandler<{ actor: string; roles: string[] }>): Unsubscribe;
    on(eventType: 'disconnected', handler: EventHandler<{}>): Unsubscribe;
    on(eventType: 'error', handler: EventHandler<{ message: string; error?: any; context?: string }>): Unsubscribe;

    /**
     * Get service by name
     *
     * @param serviceName - Service name (gateway, websocket, oidc, registry)
     * @returns Service configuration or null
     */
    getService(serviceName: string): Service | null;

    /**
     * Check if service is available
     *
     * @param serviceName - Service name
     * @returns True if service is available
     */
    hasService(serviceName: string): boolean;

    /**
     * Get all available service names
     *
     * @returns Array of service names
     */
    getAvailableServices(): string[];

    /**
     * Get connection status
     *
     * @returns Status object
     */
    getStatus(): ConnectionStatus;

    /**
     * Disconnect WebSocket
     */
    disconnect(): void;
  }

  export = ConceptKernel;
}
