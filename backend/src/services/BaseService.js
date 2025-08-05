const { v4: uuidv4 } = require('uuid');

/**
 * Base Service Class
 * 
 * Foundation for all modular services in the Maverick system:
 * - Standardized service lifecycle (initialize, start, stop, cleanup)
 * - Event bus integration with automatic subscription management
 * - JSON storage integration with service-specific data paths
 * - Health monitoring and status reporting
 * - Error handling and recovery mechanisms
 * - Configuration management
 * - Metrics collection and reporting
 */
class BaseService {
  constructor(serviceName, storageManager, eventBus, config = {}) {
    if (!serviceName) {
      throw new Error('Service name is required');
    }
    
    this.serviceName = serviceName;
    this.serviceId = uuidv4();
    this.storage = storageManager;
    this.eventBus = eventBus;
    this.config = {
      // Default configuration
      enableHealthCheck: true,
      healthCheckInterval: 30000, // 30 seconds
      enableMetrics: true,
      metricsInterval: 60000, // 1 minute
      autoRestart: false,
      maxRestartAttempts: 3,
      shutdownTimeout: 10000, // 10 seconds
      ...config
    };
    
    // Service state
    this.status = 'initializing';
    this.startTime = null;
    this.lastHealthCheck = null;
    this.restartCount = 0;
    this.subscriptions = new Map(); // Track event subscriptions
    this.timers = new Map(); // Track intervals/timeouts
    
    // Metrics
    this.metrics = {
      startTime: null,
      uptime: 0,
      eventsHandled: 0,
      eventsPublished: 0,
      errorsCount: 0,
      lastError: null,
      performance: {
        avgResponseTime: 0,
        totalRequests: 0,
        requestTimes: []
      }
    };
    
    // Error handling
    this.errorHandlers = new Map();
    this.setupErrorHandling();
    
    console.log(`🏗️ BaseService created: ${this.serviceName} (${this.serviceId})`);
  }
  
  // ==================== SERVICE LIFECYCLE ====================
  
  async start() {
    try {
      this.status = 'starting';
      this.startTime = new Date();
      this.metrics.startTime = this.startTime;
      
      console.log(`🚀 Starting service: ${this.serviceName}`);
      
      // Initialize storage if not already done
      if (!this.storage.initialized) {
        await this.storage.initialize();
      }
      
      // Run service-specific initialization
      await this.initialize();
      
      // Setup health monitoring
      if (this.config.enableHealthCheck) {
        this.startHealthMonitoring();
      }
      
      // Setup metrics collection
      if (this.config.enableMetrics) {
        this.startMetricsCollection();
      }
      
      // Save service registration
      await this.registerService();
      
      this.status = 'running';
      console.log(`✅ ${this.serviceName} service started successfully`);
      
      // Publish service started event
      await this.publishEvent('service.started', {
        serviceName: this.serviceName,
        serviceId: this.serviceId,
        startTime: this.startTime.toISOString()
      });
      
    } catch (error) {
      this.status = 'failed';
      console.error(`❌ Failed to start service ${this.serviceName}:`, error);
      await this.handleError('startup', error);
      throw error;
    }
  }
  
  async initialize() {
    // Override in subclasses for service-specific initialization
    console.log(`🔧 Initializing ${this.serviceName}...`);
  }
  
  async stop(reason = 'manual') {
    try {
      this.status = 'stopping';
      console.log(`🛑 Stopping service: ${this.serviceName} (reason: ${reason})`);
      
      // Publish service stopping event
      await this.publishEvent('service.stopping', {
        serviceName: this.serviceName,
        serviceId: this.serviceId,
        reason: reason
      });
      
      // Run service-specific cleanup
      await this.cleanup();
      
      // Clear all subscriptions
      await this.clearAllSubscriptions();
      
      // Clear all timers
      this.clearAllTimers();
      
      // Unregister service
      await this.unregisterService();
      
      this.status = 'stopped';
      console.log(`✅ ${this.serviceName} service stopped successfully`);
      
      // Publish service stopped event (final event)
      await this.publishEvent('service.stopped', {
        serviceName: this.serviceName,
        serviceId: this.serviceId,
        uptime: Date.now() - this.startTime.getTime(),
        reason: reason
      });
      
    } catch (error) {
      this.status = 'error';
      console.error(`❌ Error stopping service ${this.serviceName}:`, error);
      throw error;
    }
  }
  
  async cleanup() {
    // Override in subclasses for service-specific cleanup
    console.log(`🧹 Cleaning up ${this.serviceName}...`);
  }
  
  async restart(reason = 'manual') {
    if (this.restartCount >= this.config.maxRestartAttempts) {
      throw new Error(`Maximum restart attempts (${this.config.maxRestartAttempts}) exceeded`);
    }
    
    this.restartCount++;
    console.log(`🔄 Restarting service: ${this.serviceName} (attempt ${this.restartCount})`);
    
    try {
      await this.stop(reason);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
      await this.start();
      
      console.log(`✅ ${this.serviceName} restarted successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to restart service ${this.serviceName}:`, error);
      throw error;
    }
  }
  
  // ==================== EVENT BUS INTEGRATION ====================
  
  async subscribeToEvent(eventType, handler, options = {}) {
    const subscriptionId = await this.eventBus.subscribe(eventType, async (event) => {
      try {
        const startTime = Date.now();
        
        await handler(event);
        
        // Update metrics
        this.metrics.eventsHandled++;
        this.updatePerformanceMetrics(Date.now() - startTime);
        
      } catch (error) {
        this.metrics.errorsCount++;
        this.metrics.lastError = {
          eventType,
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        console.error(`❌ Error handling event ${eventType} in ${this.serviceName}:`, error);
        await this.handleError('event_handling', error, { eventType, event });
      }
    }, options);
    
    // Track subscription for cleanup
    this.subscriptions.set(subscriptionId, { eventType, options });
    
    console.log(`🔗 ${this.serviceName} subscribed to: ${eventType} (${subscriptionId})`);
    return subscriptionId;
  }
  
  async publishEvent(eventType, data, options = {}) {
    try {
      const eventId = await this.eventBus.publish(eventType, data, {
        source: this.serviceName,
        serviceId: this.serviceId,
        ...options
      });
      
      this.metrics.eventsPublished++;
      return eventId;
      
    } catch (error) {
      this.metrics.errorsCount++;
      console.error(`❌ Error publishing event ${eventType} from ${this.serviceName}:`, error);
      throw error;
    }
  }
  
  async clearAllSubscriptions() {
    console.log(`🔓 Clearing ${this.subscriptions.size} subscriptions for ${this.serviceName}`);
    
    for (const [subscriptionId] of this.subscriptions) {
      try {
        await this.eventBus.unsubscribe(subscriptionId);
      } catch (error) {
        console.error(`❌ Error unsubscribing ${subscriptionId}:`, error);
      }
    }
    
    this.subscriptions.clear();
  }
  
  // ==================== STORAGE INTEGRATION ====================
  
  async saveServiceData(key, data) {
    const filePath = `system/services/${this.serviceName}/${key}.json`;
    return await this.storage.saveJSON(
      require('path').join(this.storage.basePath, filePath), 
      data
    );
  }
  
  async loadServiceData(key, defaultValue = null) {
    const filePath = `system/services/${this.serviceName}/${key}.json`;
    return await this.storage.loadJSON(
      require('path').join(this.storage.basePath, filePath), 
      defaultValue
    );
  }
  
  async deleteServiceData(key) {
    const filePath = require('path').join(
      this.storage.basePath, 
      'system/services', 
      this.serviceName, 
      `${key}.json`
    );
    
    const fs = require('fs-extra');
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      console.log(`🗑️ Deleted service data: ${key}`);
    }
  }
  
  // ==================== HEALTH MONITORING ====================
  
  startHealthMonitoring() {
    const healthTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error(`❌ Health check failed for ${this.serviceName}:`, error);
      }
    }, this.config.healthCheckInterval);
    
    this.timers.set('health_check', healthTimer);
    console.log(`💓 Health monitoring started for ${this.serviceName}`);
  }
  
  async performHealthCheck() {
    const health = await this.getHealthStatus();
    this.lastHealthCheck = new Date();
    
    // Save health status
    await this.saveServiceData('health', {
      ...health,
      timestamp: this.lastHealthCheck.toISOString()
    });
    
    // Publish health event if status changed or critical
    if (health.status !== 'healthy') {
      await this.publishEvent('service.health', {
        serviceName: this.serviceName,
        serviceId: this.serviceId,
        health: health
      });
    }
    
    return health;
  }
  
  async getHealthStatus() {
    // Default health check - override in subclasses
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    const memoryUsage = process.memoryUsage();
    
    return {
      status: this.status === 'running' ? 'healthy' : 'unhealthy',
      uptime: uptime,
      memoryUsage: memoryUsage,
      metrics: this.getMetrics(),
      lastError: this.metrics.lastError,
      timestamp: new Date().toISOString()
    };
  }
  
  // ==================== METRICS COLLECTION ====================
  
  startMetricsCollection() {
    const metricsTimer = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error(`❌ Metrics collection failed for ${this.serviceName}:`, error);
      }
    }, this.config.metricsInterval);
    
    this.timers.set('metrics', metricsTimer);
    console.log(`📊 Metrics collection started for ${this.serviceName}`);
  }
  
  async collectMetrics() {
    const metrics = this.getMetrics();
    
    // Save metrics to storage
    await this.saveServiceData('metrics', {
      ...metrics,
      timestamp: new Date().toISOString()
    });
    
    // Publish metrics event
    await this.publishEvent('service.metrics', {
      serviceName: this.serviceName,
      serviceId: this.serviceId,
      metrics: metrics
    });
    
    return metrics;
  }
  
  getMetrics() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    return {
      ...this.metrics,
      uptime: uptime,
      status: this.status,
      subscriptions: this.subscriptions.size,
      timers: this.timers.size,
      restartCount: this.restartCount
    };
  }
  
  updatePerformanceMetrics(responseTime) {
    this.metrics.performance.totalRequests++;
    this.metrics.performance.requestTimes.push(responseTime);
    
    // Keep only last 100 response times for moving average
    if (this.metrics.performance.requestTimes.length > 100) {
      this.metrics.performance.requestTimes.shift();
    }
    
    // Calculate average
    const sum = this.metrics.performance.requestTimes.reduce((a, b) => a + b, 0);
    this.metrics.performance.avgResponseTime = sum / this.metrics.performance.requestTimes.length;
  }
  
  // ==================== ERROR HANDLING ====================
  
  setupErrorHandling() {
    // Global error handlers
    this.errorHandlers.set('startup', async (error, context) => {
      console.error(`💥 Startup error in ${this.serviceName}:`, error);
      if (this.config.autoRestart) {
        await this.restart('startup_error');
      }
    });
    
    this.errorHandlers.set('event_handling', async (error, context) => {
      console.error(`💥 Event handling error in ${this.serviceName}:`, error);
      // Log but don't restart for event handling errors
    });
    
    this.errorHandlers.set('storage', async (error, context) => {
      console.error(`💥 Storage error in ${this.serviceName}:`, error);
      // Storage errors are serious - might need restart
      if (this.config.autoRestart) {
        await this.restart('storage_error');
      }
    });
  }
  
  async handleError(errorType, error, context = {}) {
    this.metrics.errorsCount++;
    this.metrics.lastError = {
      type: errorType,
      message: error.message,
      context: context,
      timestamp: new Date().toISOString()
    };
    
    // Run specific error handler if exists
    const handler = this.errorHandlers.get(errorType);
    if (handler) {
      try {
        await handler(error, context);
      } catch (handlerError) {
        console.error(`❌ Error handler failed:`, handlerError);
      }
    }
    
    // Publish error event
    await this.publishEvent('service.error', {
      serviceName: this.serviceName,
      serviceId: this.serviceId,
      errorType: errorType,
      error: error.message,
      context: context
    });
  }
  
  // ==================== UTILITY METHODS ====================
  
  clearAllTimers() {
    console.log(`⏰ Clearing ${this.timers.size} timers for ${this.serviceName}`);
    
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
      clearTimeout(timer);
    }
    
    this.timers.clear();
  }
  
  async registerService() {
    const serviceInfo = {
      id: this.serviceId,
      name: this.serviceName,
      status: this.status,
      startTime: this.startTime?.toISOString(),
      config: this.config,
      pid: process.pid
    };
    
    await this.storage.saveJSON(
      require('path').join(this.storage.basePath, 'system', 'services', `${this.serviceName}.json`),
      serviceInfo
    );
  }
  
  async unregisterService() {
    const servicePath = require('path').join(
      this.storage.basePath, 
      'system', 
      'services', 
      `${this.serviceName}.json`
    );
    
    const fs = require('fs-extra');
    if (await fs.pathExists(servicePath)) {
      await fs.remove(servicePath);
    }
  }
  
  // ==================== CONFIGURATION ====================
  
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log(`⚙️ Updated configuration for ${this.serviceName}`);
  }
  
  getConfig() {
    return { ...this.config };
  }
  
  // ==================== STATUS AND INFO ====================
  
  getStatus() {
    return {
      serviceName: this.serviceName,
      serviceId: this.serviceId,
      status: this.status,
      startTime: this.startTime?.toISOString(),
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      metrics: this.getMetrics(),
      config: this.config
    };
  }
  
  isRunning() {
    return this.status === 'running';
  }
  
  isHealthy() {
    return this.status === 'running' && this.metrics.errorsCount === 0;
  }
}

module.exports = BaseService;