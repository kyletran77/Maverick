const { v4: uuidv4 } = require('uuid');

/**
 * Simple Agent Plugin Interface
 * 
 * Base class for all agent plugins in the Maverick system:
 * - Standardized plugin interface for hot-loading
 * - Capability definition and scoring system
 * - Task execution lifecycle management
 * - Quality metrics and performance tracking
 * - Plugin metadata and configuration
 * - Health monitoring and error handling
 */
class SimpleAgentPlugin {
  constructor(config = {}) {
    // Required plugin properties - must be overridden
    this.id = config.id || this.constructor.name.toLowerCase();
    this.name = config.name || this.constructor.name;
    this.version = config.version || '1.0.0';
    this.description = config.description || 'Agent plugin description';
    
    // Plugin capabilities - must be defined by subclasses
    this.capabilities = config.capabilities || {};
    
    // Plugin configuration
    this.config = {
      maxConcurrentTasks: 3,
      estimatedTaskTime: 15, // minutes
      qualityThreshold: 0.8,
      retryAttempts: 2,
      timeout: 300000, // 5 minutes
      healthCheckInterval: 60000, // 1 minute
      ...config
    };
    
    // Plugin state
    this.status = 'initializing';
    this.health = 'unknown';
    this.lastHealthCheck = null;
    this.loadedAt = new Date().toISOString();
    this.lastUsed = null;
    
    // Task tracking
    this.activeTasks = new Map(); // taskId -> task info
    this.taskHistory = [];
    this.performanceMetrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      averageQualityScore: 0,
      successRate: 0
    };
    
    // Plugin metadata
    this.metadata = {
      author: config.author || 'Unknown',
      tags: config.tags || [],
      category: config.category || 'general',
      pluginPath: null,
      hotReloaded: false,
      dependencies: config.dependencies || []
    };
    
    console.log(`🔌 SimpleAgentPlugin created: ${this.name} (${this.id})`);
  }
  
  // ==================== PLUGIN LIFECYCLE ====================
  
  async initialize() {
    console.log(`🚀 Initializing plugin: ${this.name}`);
    
    try {
      this.status = 'initializing';
      
      // Validate plugin configuration
      this.validatePlugin();
      
      // Run plugin-specific initialization
      await this.onInitialize();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.status = 'ready';
      this.health = 'healthy';
      console.log(`✅ Plugin ${this.name} initialized successfully`);
      
    } catch (error) {
      this.status = 'error';
      this.health = 'unhealthy';
      console.error(`❌ Failed to initialize plugin ${this.name}:`, error);
      throw error;
    }
  }
  
  async onInitialize() {
    // Override in subclasses for plugin-specific initialization
    console.log(`🔧 Running initialization for ${this.name}`);
  }
  
  async shutdown() {
    console.log(`🛑 Shutting down plugin: ${this.name}`);
    
    try {
      this.status = 'shutting_down';
      
      // Cancel all active tasks
      await this.cancelAllTasks();
      
      // Run plugin-specific cleanup
      await this.onShutdown();
      
      // Clear health monitoring
      this.stopHealthMonitoring();
      
      this.status = 'stopped';
      console.log(`✅ Plugin ${this.name} shut down successfully`);
      
    } catch (error) {
      this.status = 'error';
      console.error(`❌ Error shutting down plugin ${this.name}:`, error);
      throw error;
    }
  }
  
  async onShutdown() {
    // Override in subclasses for plugin-specific cleanup
    console.log(`🧹 Running shutdown cleanup for ${this.name}`);
  }
  
  async reload() {
    console.log(`🔄 Reloading plugin: ${this.name}`);
    
    try {
      await this.shutdown();
      await this.initialize();
      this.metadata.hotReloaded = true;
      this.metadata.lastReload = new Date().toISOString();
      
      console.log(`✅ Plugin ${this.name} reloaded successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to reload plugin ${this.name}:`, error);
      throw error;
    }
  }
  
  // ==================== TASK EXECUTION ====================
  
  async executeTask(task, context = {}) {
    const taskId = task.id || uuidv4();
    const startTime = Date.now();
    
    console.log(`▶️ Plugin ${this.name} executing task: ${taskId}`);
    
    try {
      // Check if plugin can handle the task
      if (!this.canHandleTask(task)) {
        throw new Error(`Plugin ${this.name} cannot handle task type: ${task.type}`);
      }
      
      // Check concurrent task limit
      if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
        throw new Error(`Plugin ${this.name} has reached maximum concurrent tasks: ${this.config.maxConcurrentTasks}`);
      }
      
      // Track active task
      this.activeTasks.set(taskId, {
        task: task,
        context: context,
        startTime: startTime,
        status: 'running'
      });
      
      // Execute with timeout
      const result = await this.executeWithTimeout(task, context);
      
      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Update metrics
      this.updateTaskMetrics(taskId, 'completed', executionTime, result.qualityScore);
      
      // Remove from active tasks
      this.activeTasks.delete(taskId);
      
      this.lastUsed = new Date().toISOString();
      
      console.log(`✅ Plugin ${this.name} completed task: ${taskId} (${executionTime}ms)`);
      
      return {
        taskId: taskId,
        pluginId: this.id,
        result: result,
        executionTime: executionTime,
        qualityScore: result.qualityScore || 0,
        completedAt: new Date().toISOString()
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Update metrics
      this.updateTaskMetrics(taskId, 'failed', executionTime, 0);
      
      // Remove from active tasks
      this.activeTasks.delete(taskId);
      
      console.error(`❌ Plugin ${this.name} failed task: ${taskId} - ${error.message}`);
      
      throw {
        taskId: taskId,
        pluginId: this.id,
        error: error.message,
        executionTime: executionTime,
        failedAt: new Date().toISOString()
      };
    }
  }
  
  async executeWithTimeout(task, context) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task execution timeout (${this.config.timeout}ms) for plugin ${this.name}`));
      }, this.config.timeout);
      
      this.onExecuteTask(task, context)
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
  
  async onExecuteTask(task, context) {
    // MUST be overridden in subclasses
    throw new Error(`Plugin ${this.name} must implement onExecuteTask method`);
  }
  
  // ==================== CAPABILITY SYSTEM ====================
  
  canHandleTask(task) {
    // Check if plugin has required capabilities for the task
    if (!task.requiredCapabilities || task.requiredCapabilities.length === 0) {
      return true; // No specific requirements
    }
    
    for (const requiredCap of task.requiredCapabilities) {
      const capability = this.capabilities[requiredCap];
      if (!capability || capability.efficiency < 0.5) {
        return false;
      }
    }
    
    return true;
  }
  
  getCapabilityScore(task) {
    if (!task.requiredCapabilities || task.requiredCapabilities.length === 0) {
      return 1.0; // Default score if no requirements
    }
    
    let totalScore = 0;
    let capabilityCount = 0;
    
    for (const requiredCap of task.requiredCapabilities) {
      const capability = this.capabilities[requiredCap];
      if (capability) {
        // Combine efficiency and experience
        const experienceMultiplier = {
          'beginner': 0.6,
          'intermediate': 0.8,
          'advanced': 0.9,
          'expert': 1.0
        };
        
        const score = capability.efficiency * (experienceMultiplier[capability.experience] || 0.8);
        totalScore += score;
        capabilityCount++;
      }
    }
    
    if (capabilityCount === 0) {
      return 0; // No matching capabilities
    }
    
    const averageScore = totalScore / capabilityCount;
    
    // Apply performance boost based on historical success
    const performanceBoost = this.performanceMetrics.successRate * 0.1;
    
    return Math.min(1.0, averageScore + performanceBoost);
  }
  
  getEstimatedDuration(task) {
    const baseTime = this.config.estimatedTaskTime;
    const complexityMultiplier = task.complexity || 1.0;
    const capabilityScore = this.getCapabilityScore(task);
    
    // Better capability = faster execution
    const efficiencyMultiplier = 2.0 - capabilityScore;
    
    return Math.round(baseTime * complexityMultiplier * efficiencyMultiplier);
  }
  
  // ==================== HEALTH MONITORING ====================
  
  startHealthMonitoring() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
    }
    
    this.healthTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    console.log(`💓 Health monitoring started for plugin: ${this.name}`);
  }
  
  stopHealthMonitoring() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }
  
  async performHealthCheck() {
    try {
      const health = await this.getHealthStatus();
      this.health = health.status;
      this.lastHealthCheck = new Date().toISOString();
      
      return health;
      
    } catch (error) {
      this.health = 'unhealthy';
      this.lastHealthCheck = new Date().toISOString();
      console.error(`❌ Health check failed for plugin ${this.name}:`, error);
      
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: this.lastHealthCheck
      };
    }
  }
  
  async getHealthStatus() {
    // Default health check - can be overridden
    const now = Date.now();
    const uptime = now - new Date(this.loadedAt).getTime();
    
    const health = {
      status: this.status === 'ready' ? 'healthy' : 'unhealthy',
      uptime: uptime,
      activeTasks: this.activeTasks.size,
      totalTasks: this.performanceMetrics.totalTasks,
      successRate: this.performanceMetrics.successRate,
      averageQualityScore: this.performanceMetrics.averageQualityScore,
      lastUsed: this.lastUsed,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    // Run plugin-specific health checks
    const customHealth = await this.onHealthCheck();
    if (customHealth) {
      Object.assign(health, customHealth);
    }
    
    return health;
  }
  
  async onHealthCheck() {
    // Override in subclasses for custom health checks
    return null;
  }
  
  // ==================== METRICS AND TRACKING ====================
  
  updateTaskMetrics(taskId, status, executionTime, qualityScore = 0) {
    const metrics = this.performanceMetrics;
    
    metrics.totalTasks++;
    
    if (status === 'completed') {
      metrics.completedTasks++;
      
      // Update average execution time
      const currentAvg = metrics.averageExecutionTime;
      metrics.averageExecutionTime = ((currentAvg * (metrics.completedTasks - 1)) + executionTime) / metrics.completedTasks;
      
      // Update average quality score
      const currentQualityAvg = metrics.averageQualityScore;
      metrics.averageQualityScore = ((currentQualityAvg * (metrics.completedTasks - 1)) + qualityScore) / metrics.completedTasks;
      
    } else if (status === 'failed') {
      metrics.failedTasks++;
    }
    
    // Update success rate
    metrics.successRate = metrics.totalTasks > 0 ? metrics.completedTasks / metrics.totalTasks : 0;
    
    // Add to history
    this.taskHistory.push({
      taskId: taskId,
      status: status,
      executionTime: executionTime,
      qualityScore: qualityScore,
      timestamp: new Date().toISOString()
    });
    
    // Keep history manageable
    if (this.taskHistory.length > 100) {
      this.taskHistory.shift();
    }
  }
  
  getMetrics() {
    return {
      ...this.performanceMetrics,
      activeTasks: this.activeTasks.size,
      recentTasks: this.taskHistory.slice(-10),
      uptime: Date.now() - new Date(this.loadedAt).getTime(),
      lastUsed: this.lastUsed
    };
  }
  
  // ==================== UTILITY METHODS ====================
  
  validatePlugin() {
    const required = ['id', 'name', 'version', 'capabilities'];
    
    for (const field of required) {
      if (!this[field]) {
        throw new Error(`Plugin ${this.name || 'unknown'} missing required field: ${field}`);
      }
    }
    
    if (Object.keys(this.capabilities).length === 0) {
      throw new Error(`Plugin ${this.name} must define at least one capability`);
    }
    
    console.log(`✅ Plugin ${this.name} validation passed`);
  }
  
  async cancelAllTasks() {
    console.log(`🚫 Cancelling ${this.activeTasks.size} active tasks for plugin: ${this.name}`);
    
    const cancelPromises = [];
    
    for (const [taskId, taskInfo] of this.activeTasks) {
      cancelPromises.push(this.cancelTask(taskId, 'plugin_shutdown'));
    }
    
    await Promise.allSettled(cancelPromises);
    this.activeTasks.clear();
  }
  
  async cancelTask(taskId, reason = 'cancelled') {
    const taskInfo = this.activeTasks.get(taskId);
    if (!taskInfo) {
      console.warn(`⚠️ Task ${taskId} not found in active tasks for plugin ${this.name}`);
      return;
    }
    
    console.log(`🚫 Cancelling task ${taskId} for plugin ${this.name}: ${reason}`);
    
    try {
      // Run plugin-specific cancellation
      await this.onCancelTask(taskId, taskInfo, reason);
      
      // Update metrics
      const executionTime = Date.now() - taskInfo.startTime;
      this.updateTaskMetrics(taskId, 'cancelled', executionTime, 0);
      
      this.activeTasks.delete(taskId);
      
    } catch (error) {
      console.error(`❌ Error cancelling task ${taskId}:`, error);
    }
  }
  
  async onCancelTask(taskId, taskInfo, reason) {
    // Override in subclasses for custom cancellation logic
    console.log(`🚫 Default task cancellation for ${taskId}: ${reason}`);
  }
  
  // ==================== PLUGIN INFO ====================
  
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      status: this.status,
      health: this.health,
      capabilities: this.capabilities,
      config: this.config,
      metadata: this.metadata,
      metrics: this.getMetrics(),
      lastHealthCheck: this.lastHealthCheck,
      loadedAt: this.loadedAt,
      lastUsed: this.lastUsed
    };
  }
  
  toString() {
    return `${this.name} v${this.version} (${this.id}) - ${this.status}`;
  }
}

module.exports = SimpleAgentPlugin;