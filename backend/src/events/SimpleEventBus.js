const { v4: uuidv4 } = require('uuid');

/**
 * Simple Event Bus
 * 
 * High-performance in-memory event system with:
 * - Pub/Sub pattern with multiple subscribers per event
 * - Event correlation and tracing
 * - Error handling and retry mechanisms
 * - Event history for debugging
 * - Wildcard event subscriptions
 * - Rate limiting and throttling
 * - Optional Redis upgrade path
 */
class SimpleEventBus {
  constructor(options = {}) {
    this.subscribers = new Map(); // event -> [handlers]
    this.wildcardSubscribers = new Map(); // pattern -> [handlers]
    this.eventHistory = []; // For debugging
    this.correlationMap = new Map(); // correlationId -> events
    this.rateLimits = new Map(); // event -> rate limit info
    
    // Configuration
    this.config = {
      maxHistorySize: options.maxHistorySize || 1000,
      enableTracing: options.enableTracing !== false,
      enableRateLimit: options.enableRateLimit || false,
      defaultRateLimit: options.defaultRateLimit || 100, // events per second
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000, // ms
      ...options
    };
    
    this.stats = {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      retriedEvents: 0,
      startTime: new Date(),
      lastEventTime: null
    };
    
    console.log(`📡 SimpleEventBus initialized with ${Object.keys(this.config).length} config options`);
  }
  
  // ==================== CORE PUB/SUB ====================
  
  async publish(eventType, data, options = {}) {
    const event = {
      id: uuidv4(),
      type: eventType,
      data: data,
      timestamp: new Date().toISOString(),
      correlationId: options.correlationId || uuidv4(),
      source: options.source || 'unknown',
      retryable: options.retryable !== false,
      priority: options.priority || 'normal', // low, normal, high, critical
      metadata: options.metadata || {}
    };
    
    this.stats.totalEvents++;
    this.stats.lastEventTime = new Date();
    
    try {
      // Rate limiting check
      if (this.config.enableRateLimit && this.isRateLimited(eventType)) {
        throw new Error(`Rate limit exceeded for event type: ${eventType}`);
      }
      
      // Add to history for debugging
      if (this.config.enableTracing) {
        this.addToHistory(event);
        this.addToCorrelationMap(event);
      }
      
      // Get all handlers (direct + wildcard)
      const handlers = this.getAllHandlers(eventType);
      
      if (handlers.length === 0) {
        console.warn(`⚠️ No handlers found for event: ${eventType}`);
        return event.id;
      }
      
      // Execute handlers based on priority
      await this.executeHandlers(event, handlers);
      
      this.stats.successfulEvents++;
      console.log(`📤 Published event: ${eventType} (${event.id}) to ${handlers.length} handlers`);
      
    } catch (error) {
      this.stats.failedEvents++;
      console.error(`❌ Failed to publish event ${eventType}:`, error.message);
      
      // Retry if enabled
      if (event.retryable && options.retryCount < this.config.retryAttempts) {
        await this.retryEvent(event, options, error);
      }
      
      throw error;
    }
    
    return event.id;
  }
  
  async subscribe(eventType, handler, options = {}) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    
    const subscription = {
      id: uuidv4(),
      handler: handler,
      priority: options.priority || 'normal',
      filter: options.filter || null, // Function to filter events
      once: options.once || false, // One-time subscription
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000, // 30 seconds
      metadata: options.metadata || {}
    };
    
    // Handle wildcard subscriptions
    if (eventType.includes('*')) {
      if (!this.wildcardSubscribers.has(eventType)) {
        this.wildcardSubscribers.set(eventType, []);
      }
      this.wildcardSubscribers.get(eventType).push(subscription);
      console.log(`🔗 Subscribed to wildcard pattern: ${eventType} (${subscription.id})`);
    } else {
      if (!this.subscribers.has(eventType)) {
        this.subscribers.set(eventType, []);
      }
      this.subscribers.get(eventType).push(subscription);
      console.log(`🔗 Subscribed to event: ${eventType} (${subscription.id})`);
    }
    
    return subscription.id;
  }
  
  async unsubscribe(subscriptionId) {
    let found = false;
    
    // Check direct subscriptions
    for (const [eventType, subscriptions] of this.subscribers) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        if (subscriptions.length === 0) {
          this.subscribers.delete(eventType);
        }
        found = true;
        console.log(`🔓 Unsubscribed from event: ${eventType} (${subscriptionId})`);
        break;
      }
    }
    
    // Check wildcard subscriptions
    if (!found) {
      for (const [pattern, subscriptions] of this.wildcardSubscribers) {
        const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
        if (index !== -1) {
          subscriptions.splice(index, 1);
          if (subscriptions.length === 0) {
            this.wildcardSubscribers.delete(pattern);
          }
          found = true;
          console.log(`🔓 Unsubscribed from wildcard: ${pattern} (${subscriptionId})`);
          break;
        }
      }
    }
    
    return found;
  }
  
  // ==================== HANDLER EXECUTION ====================
  
  getAllHandlers(eventType) {
    const handlers = [];
    
    // Direct subscribers
    if (this.subscribers.has(eventType)) {
      handlers.push(...this.subscribers.get(eventType));
    }
    
    // Wildcard subscribers
    for (const [pattern, subscriptions] of this.wildcardSubscribers) {
      if (this.matchPattern(eventType, pattern)) {
        handlers.push(...subscriptions);
      }
    }
    
    // Sort by priority
    return handlers.sort((a, b) => {
      const priorities = { critical: 4, high: 3, normal: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });
  }
  
  async executeHandlers(event, handlers) {
    const results = [];
    
    for (const subscription of handlers) {
      try {
        // Apply filter if exists
        if (subscription.filter && !subscription.filter(event)) {
          continue;
        }
        
        // Execute with timeout
        const result = await this.executeWithTimeout(
          subscription.handler, 
          event, 
          subscription.timeout
        );
        
        results.push({ subscriptionId: subscription.id, result, success: true });
        
        // Remove one-time subscriptions
        if (subscription.once) {
          await this.unsubscribe(subscription.id);
        }
        
      } catch (error) {
        console.error(`❌ Handler failed for ${event.type} (${subscription.id}):`, error.message);
        results.push({ 
          subscriptionId: subscription.id, 
          error: error.message, 
          success: false 
        });
        
        // Retry handler if configured
        if (subscription.maxRetries > 0) {
          await this.retryHandler(event, subscription, error);
        }
      }
    }
    
    return results;
  }
  
  async executeWithTimeout(handler, event, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Handler timeout (${timeout}ms) for event ${event.type}`));
      }, timeout);
      
      Promise.resolve(handler(event))
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
  
  async retryHandler(event, subscription, originalError) {
    for (let attempt = 1; attempt <= subscription.maxRetries; attempt++) {
      try {
        console.log(`🔄 Retrying handler ${subscription.id} (attempt ${attempt}/${subscription.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        
        const result = await this.executeWithTimeout(
          subscription.handler, 
          event, 
          subscription.timeout
        );
        
        console.log(`✅ Handler retry succeeded on attempt ${attempt}`);
        this.stats.retriedEvents++;
        return result;
        
      } catch (retryError) {
        console.error(`❌ Handler retry ${attempt} failed:`, retryError.message);
        
        if (attempt === subscription.maxRetries) {
          console.error(`💥 Handler ${subscription.id} failed after ${subscription.maxRetries} retries`);
        }
      }
    }
  }
  
  // ==================== UTILITY METHODS ====================
  
  matchPattern(eventType, pattern) {
    // Simple wildcard matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(eventType);
  }
  
  isRateLimited(eventType) {
    if (!this.rateLimits.has(eventType)) {
      this.rateLimits.set(eventType, {
        count: 0,
        windowStart: Date.now()
      });
    }
    
    const limit = this.rateLimits.get(eventType);
    const now = Date.now();
    const windowDuration = 1000; // 1 second window
    
    // Reset window if needed
    if (now - limit.windowStart > windowDuration) {
      limit.count = 0;
      limit.windowStart = now;
    }
    
    limit.count++;
    return limit.count > this.config.defaultRateLimit;
  }
  
  addToHistory(event) {
    this.eventHistory.push({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      correlationId: event.correlationId,
      source: event.source
    });
    
    // Maintain history size limit
    if (this.eventHistory.length > this.config.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
  
  addToCorrelationMap(event) {
    if (!this.correlationMap.has(event.correlationId)) {
      this.correlationMap.set(event.correlationId, []);
    }
    
    this.correlationMap.get(event.correlationId).push(event.id);
    
    // Clean up old correlations
    if (this.correlationMap.size > 1000) {
      const oldestKey = this.correlationMap.keys().next().value;
      this.correlationMap.delete(oldestKey);
    }
  }
  
  async retryEvent(event, options, originalError) {
    const retryCount = (options.retryCount || 0) + 1;
    const delay = this.config.retryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
    
    console.log(`🔄 Retrying event ${event.type} (attempt ${retryCount}/${this.config.retryAttempts}) in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.publish(event.type, event.data, {
          ...options,
          retryCount,
          correlationId: event.correlationId
        });
        this.stats.retriedEvents++;
      } catch (retryError) {
        console.error(`❌ Event retry ${retryCount} failed:`, retryError.message);
      }
    }, delay);
  }
  
  // ==================== MONITORING AND DEBUGGING ====================
  
  getStats() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const eventsPerSecond = this.stats.totalEvents / (uptime / 1000);
    
    return {
      ...this.stats,
      uptime: uptime,
      eventsPerSecond: Math.round(eventsPerSecond * 100) / 100,
      subscriptions: {
        direct: this.subscribers.size,
        wildcard: this.wildcardSubscribers.size,
        total: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0) +
               Array.from(this.wildcardSubscribers.values()).reduce((sum, subs) => sum + subs.length, 0)
      }
    };
  }
  
  getEventHistory(correlationId = null) {
    if (correlationId) {
      return this.eventHistory.filter(event => event.correlationId === correlationId);
    }
    return [...this.eventHistory];
  }
  
  getCorrelatedEvents(correlationId) {
    const eventIds = this.correlationMap.get(correlationId) || [];
    return this.eventHistory.filter(event => eventIds.includes(event.id));
  }
  
  listSubscriptions() {
    const subscriptions = [];
    
    for (const [eventType, subs] of this.subscribers) {
      subscriptions.push({
        type: 'direct',
        eventType,
        count: subs.length,
        subscriptions: subs.map(sub => ({
          id: sub.id,
          priority: sub.priority,
          once: sub.once,
          hasFilter: !!sub.filter
        }))
      });
    }
    
    for (const [pattern, subs] of this.wildcardSubscribers) {
      subscriptions.push({
        type: 'wildcard',
        pattern,
        count: subs.length,
        subscriptions: subs.map(sub => ({
          id: sub.id,
          priority: sub.priority,
          once: sub.once,
          hasFilter: !!sub.filter
        }))
      });
    }
    
    return subscriptions;
  }
  
  // ==================== HEALTH AND CLEANUP ====================
  
  async healthCheck() {
    const stats = this.getStats();
    const subscriptions = this.listSubscriptions();
    
    return {
      status: 'healthy',
      stats,
      subscriptions: subscriptions.length,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up SimpleEventBus...');
    
    this.subscribers.clear();
    this.wildcardSubscribers.clear();
    this.eventHistory.length = 0;
    this.correlationMap.clear();
    this.rateLimits.clear();
    
    console.log('✅ SimpleEventBus cleaned up');
  }
  
  // ==================== REDIS UPGRADE PATH ====================
  
  async upgradeToRedis(redisClient) {
    console.log('🔄 Upgrading to Redis-based event bus...');
    
    // This method provides a clear upgrade path to Redis when needed
    // For now, it's a placeholder that maintains the same interface
    
    throw new Error('Redis upgrade not implemented yet. Use RedisEventBus class instead.');
  }
}

// Optional Redis-based event bus for future scaling
class RedisEventBus extends SimpleEventBus {
  constructor(redisClient, options = {}) {
    super(options);
    this.redis = redisClient;
    this.publisher = redisClient.duplicate();
    this.subscriber = redisClient.duplicate();
    
    console.log('📡 RedisEventBus initialized (ready for future implementation)');
  }
  
  async publish(eventType, data, options = {}) {
    // TODO: Implement Redis pub/sub
    // For now, fall back to in-memory
    return super.publish(eventType, data, options);
  }
  
  async subscribe(eventType, handler, options = {}) {
    // TODO: Implement Redis subscriptions
    // For now, fall back to in-memory
    return super.subscribe(eventType, handler, options);
  }
}

module.exports = { SimpleEventBus, RedisEventBus };