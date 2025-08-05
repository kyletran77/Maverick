const BaseService = require('./BaseService');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const chokidar = require('chokidar');

/**
 * Agent Pool Manager
 * 
 * Advanced agent management system with:
 * - JSON-based dynamic agent registry with hot-loading
 * - File watcher for automatic plugin discovery and updates
 * - Agent lifecycle management (load, unload, reload, health)
 * - Intelligent task assignment based on capabilities and performance
 * - Agent instance management for concurrent execution
 * - Performance tracking and optimization
 * - Load balancing and health monitoring
 */
class AgentPoolManager extends BaseService {
  constructor(storageManager, eventBus, config = {}) {
    super('AgentPoolManager', storageManager, eventBus, {
      pluginDirectories: ['./plugins/agents', './backend/src/orchestrator/agents'],
      enableHotLoading: true,
      enableHealthMonitoring: true,
      healthCheckInterval: 30000, // 30 seconds
      maxInstancesPerAgent: 5,
      instanceTimeout: 300000, // 5 minutes
      enableLoadBalancing: true,
      loadBalancingStrategy: 'quality_weighted', // round_robin, least_busy, quality_weighted
      ...config
    });
    
    // Agent registry and instances
    this.agents = new Map(); // agentId -> agent info
    this.activeInstances = new Map(); // instanceId -> instance info
    this.agentPlugins = new Map(); // agentId -> loaded plugin class
    
    // File watching for hot-loading
    this.pluginWatchers = new Map(); // directory -> watcher
    this.watchedFiles = new Map(); // filePath -> agentId
    
    // Task assignment and load balancing
    this.taskQueue = new Map(); // agentId -> task queue
    this.assignmentHistory = []; // Recent assignments for analytics
    this.loadBalancer = null;
    
    // Performance tracking
    this.agentMetrics = new Map(); // agentId -> performance metrics
    this.instanceMetrics = new Map(); // instanceId -> instance metrics
    
    // Health monitoring
    this.healthStatuses = new Map(); // agentId -> health status
    this.lastHealthChecks = new Map(); // agentId -> timestamp
  }
  
  async initialize() {
    console.log('🚀 Initializing AgentPoolManager...');
    
    // Subscribe to task assignment events
    await this.subscribeToEvent('tasks.ready', this.handleReadyTasks.bind(this));
    await this.subscribeToEvent('task.completed', this.handleTaskCompleted.bind(this));
    await this.subscribeToEvent('task.failed', this.handleTaskFailed.bind(this));
    
    // Subscribe to agent events
    await this.subscribeToEvent('agent.register', this.handleAgentRegistration.bind(this));
    await this.subscribeToEvent('agent.unregister', this.handleAgentUnregistration.bind(this));
    
    // Load existing agents from storage
    await this.loadAgentsFromStorage();
    
    // Start file watching for hot-loading
    if (this.config.enableHotLoading) {
      await this.startPluginWatching();
    }
    
    // Initialize load balancer
    if (this.config.enableLoadBalancing) {
      this.initializeLoadBalancer();
    }
    
    // Start health monitoring
    if (this.config.enableHealthMonitoring) {
      this.startHealthMonitoring();
    }
    
    console.log(`✅ AgentPoolManager initialized with ${this.agents.size} agents`);
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up AgentPoolManager...');
    
    // Stop file watchers
    for (const [directory, watcher] of this.pluginWatchers) {
      await watcher.close();
    }
    this.pluginWatchers.clear();
    
    // Clean up active instances
    for (const [instanceId, instance] of this.activeInstances) {
      try {
        await this.terminateAgentInstance(instanceId, 'cleanup');
      } catch (error) {
        console.error(`❌ Error terminating instance ${instanceId}:`, error);
      }
    }
    
    this.agents.clear();
    this.agentPlugins.clear();
    this.activeInstances.clear();
    
    console.log('✅ AgentPoolManager cleanup complete');
  }
  
  // ==================== AGENT LOADING AND MANAGEMENT ====================
  
  async loadAgentsFromStorage() {
    console.log('📚 Loading agents from storage...');
    
    const agentRegistry = await this.storage.loadAgents();
    let loadedCount = 0;
    
    for (const [agentId, agentData] of Object.entries(agentRegistry)) {
      try {
        await this.loadSingleAgent(agentId, agentData);
        loadedCount++;
      } catch (error) {
        console.error(`❌ Failed to load agent ${agentId}:`, error);
        
        // Update agent status to error
        agentData.status = 'error';
        agentData.lastError = error.message;
        agentData.updatedAt = new Date().toISOString();
        await this.storage.saveAgent(agentData);
      }
    }
    
    console.log(`✅ Loaded ${loadedCount} agents from storage`);
  }
  
  async loadSingleAgent(agentId, agentData) {
    // Load agent plugin if path is specified
    let AgentClass = null;
    let agentInstance = null;
    
    if (agentData.pluginPath && await fs.pathExists(agentData.pluginPath)) {
      try {
        // Clear require cache for hot-reloading
        delete require.cache[require.resolve(agentData.pluginPath)];
        
        AgentClass = require(agentData.pluginPath);
        agentInstance = new AgentClass();
        
        if (agentInstance.initialize) {
          await agentInstance.initialize();
        }
        
        this.agentPlugins.set(agentId, AgentClass);
        
      } catch (error) {
        console.error(`❌ Failed to load plugin for ${agentId}:`, error);
        throw new Error(`Plugin load failed: ${error.message}`);
      }
    } else {
      // Create a basic agent from the stored data
      agentInstance = this.createBasicAgent(agentData);
    }
    
    // Store agent information
    this.agents.set(agentId, {
      data: agentData,
      instance: agentInstance,
      pluginClass: AgentClass,
      lastHealthCheck: null,
      status: 'available',
      activeInstances: 0,
      totalTasksAssigned: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      loadedAt: new Date().toISOString()
    });
    
    // Initialize metrics
    this.agentMetrics.set(agentId, {
      tasksCompleted: 0,
      tasksAssigned: 0,
      averageQuality: 0,
      averageExecutionTime: 0,
      successRate: 0,
      lastTaskTime: null,
      loadFactor: 0
    });
    
    // Update file watching if plugin path exists
    if (agentData.pluginPath) {
      this.watchedFiles.set(agentData.pluginPath, agentId);
    }
    
    console.log(`✅ Loaded agent: ${agentData.name} (${agentId})`);
  }
  
  createBasicAgent(agentData) {
    // Create a basic agent implementation from stored data
    return {
      id: agentData.id,
      name: agentData.name,
      version: agentData.version,
      specialization: agentData.specialization,
      capabilities: agentData.capabilities,
      configuration: agentData.configuration,
      
      async executeTask(task) {
        // Basic task execution simulation
        console.log(`🤖 ${this.name} executing task: ${task.id}`);
        
        // Simulate execution time based on complexity
        const executionTime = this.estimateExecutionTime(task);
        await new Promise(resolve => setTimeout(resolve, Math.min(executionTime, 5000))); // Max 5s for demo
        
        return {
          status: 'completed',
          result: {
            message: `Task ${task.id} completed by ${this.name}`,
            executionTime: executionTime,
            quality: this.calculateExpectedQuality(task)
          }
        };
      },
      
      estimateExecutionTime(task) {
        const baseTime = 1000; // 1 second base
        const complexity = task.config?.complexity || 1;
        return baseTime * complexity;
      },
      
      calculateExpectedQuality(task) {
        const capabilities = this.capabilities;
        const taskType = task.type;
        
        if (capabilities[taskType]) {
          return capabilities[taskType].efficiency || 0.8;
        }
        
        return 0.7; // Default quality
      },
      
      async healthCheck() {
        return {
          status: 'healthy',
          capabilities: this.capabilities,
          activeInstances: 0,
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        };
      }
    };
  }
  
  // ==================== HOT-LOADING AND FILE WATCHING ====================
  
  async startPluginWatching() {
    console.log('👀 Starting plugin file watching...');
    
    for (const pluginDir of this.config.pluginDirectories) {
      const resolvedDir = path.resolve(pluginDir);
      
      if (await fs.pathExists(resolvedDir)) {
        const watcher = chokidar.watch(resolvedDir, {
          ignored: /[\/\\]\./,
          persistent: true,
          ignoreInitial: false
        });
        
        watcher
          .on('add', (filePath) => this.handlePluginAdded(filePath))
          .on('change', (filePath) => this.handlePluginChanged(filePath))
          .on('unlink', (filePath) => this.handlePluginRemoved(filePath));
        
        this.pluginWatchers.set(pluginDir, watcher);
        console.log(`🔍 Watching for agent plugins in: ${resolvedDir}`);
      } else {
        console.warn(`⚠️ Plugin directory not found: ${resolvedDir}`);
      }
    }
  }
  
  async handlePluginAdded(filePath) {
    if (path.extname(filePath) !== '.js') return;
    
    console.log(`📁 New plugin file detected: ${filePath}`);
    
    try {
      // Try to load the plugin
      const AgentClass = require(filePath);
      
      // Validate it's a proper agent
      const tempAgent = new AgentClass();
      if (!tempAgent.id || !tempAgent.name || !tempAgent.capabilities) {
        console.warn(`⚠️ Invalid agent plugin: ${filePath} - missing required properties`);
        return;
      }
      
      // Check if agent already exists
      if (this.agents.has(tempAgent.id)) {
        console.log(`🔄 Agent ${tempAgent.id} already exists, treating as update`);
        await this.handlePluginChanged(filePath);
        return;
      }
      
      // Auto-register the new agent
      const agentDefinition = {
        id: tempAgent.id,
        name: tempAgent.name,
        version: tempAgent.version || '1.0.0',
        specialization: tempAgent.specialization || 'General',
        capabilities: tempAgent.capabilities,
        configuration: tempAgent.configuration || {},
        pluginPath: filePath,
        status: 'available',
        createdAt: new Date().toISOString(),
        lastHealthCheck: null
      };
      
      await this.registerNewAgent(agentDefinition);
      
      console.log(`🔥 Hot-loaded new agent: ${tempAgent.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to hot-load agent from ${filePath}:`, error);
    }
  }
  
  async handlePluginChanged(filePath) {
    console.log(`🔄 Plugin file changed: ${filePath}`);
    
    // Find agent by plugin path
    const agentId = this.watchedFiles.get(filePath);
    
    if (agentId && this.agents.has(agentId)) {
      try {
        const agentInfo = this.agents.get(agentId);
        
        console.log(`🔄 Reloading agent: ${agentInfo.data.name}`);
        
        // Terminate any active instances
        await this.terminateAgentInstances(agentId, 'reload');
        
        // Clear require cache
        delete require.cache[require.resolve(filePath)];
        
        // Reload the agent
        await this.loadSingleAgent(agentId, agentInfo.data);
        
        // Publish reload event
        await this.publishEvent('agent.reloaded', {
          agentId: agentId,
          name: agentInfo.data.name,
          filePath: filePath
        });
        
        console.log(`✅ Successfully reloaded agent: ${agentInfo.data.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to reload agent ${agentId}:`, error);
        
        // Mark agent as error
        const agentInfo = this.agents.get(agentId);
        if (agentInfo) {
          agentInfo.status = 'error';
          agentInfo.data.status = 'error';
          agentInfo.data.lastError = error.message;
          await this.storage.saveAgent(agentInfo.data);
        }
      }
    }
  }
  
  async handlePluginRemoved(filePath) {
    console.log(`🗑️ Plugin file removed: ${filePath}`);
    
    const agentId = this.watchedFiles.get(filePath);
    
    if (agentId && this.agents.has(agentId)) {
      const agentInfo = this.agents.get(agentId);
      
      // Terminate instances
      await this.terminateAgentInstances(agentId, 'plugin_removed');
      
      // Mark as disabled in storage
      agentInfo.data.status = 'disabled';
      agentInfo.data.disabledReason = 'Plugin file removed';
      agentInfo.data.updatedAt = new Date().toISOString();
      await this.storage.saveAgent(agentInfo.data);
      
      // Remove from active registry but keep in storage for history
      this.agents.delete(agentId);
      this.agentPlugins.delete(agentId);
      this.watchedFiles.delete(filePath);
      
      // Publish removal event
      await this.publishEvent('agent.disabled', {
        agentId: agentId,
        name: agentInfo.data.name,
        reason: 'plugin_removed'
      });
      
      console.log(`❌ Disabled agent due to plugin removal: ${agentInfo.data.name}`);
    }
  }
  
  // ==================== AGENT REGISTRATION ====================
  
  async registerNewAgent(agentDefinition) {
    console.log(`📝 Registering new agent: ${agentDefinition.name}`);
    
    // Validate agent definition
    if (!agentDefinition.id || !agentDefinition.name || !agentDefinition.capabilities) {
      throw new Error('Agent definition missing required fields: id, name, capabilities');
    }
    
    // Save to storage
    const agentData = {
      ...agentDefinition,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await this.storage.saveAgent(agentData);
    
    // Load into memory
    await this.loadSingleAgent(agentData.id, agentData);
    
    // Publish registration event
    await this.publishEvent('agent.registered', {
      agentId: agentData.id,
      name: agentData.name,
      capabilities: agentData.capabilities,
      specialization: agentData.specialization
    });
    
    console.log(`✅ Successfully registered agent: ${agentDefinition.name}`);
    return agentData;
  }
  
  async handleAgentRegistration(event) {
    const { agentDefinition } = event.data;
    await this.registerNewAgent(agentDefinition);
  }
  
  async handleAgentUnregistration(event) {
    const { agentId, reason } = event.data;
    
    console.log(`📤 Unregistering agent: ${agentId} (${reason})`);
    
    if (this.agents.has(agentId)) {
      // Terminate instances
      await this.terminateAgentInstances(agentId, reason);
      
      // Remove from memory
      this.agents.delete(agentId);
      this.agentPlugins.delete(agentId);
      this.agentMetrics.delete(agentId);
      
      // Update storage status
      const agentData = await this.storage.loadAgent(agentId);
      if (agentData) {
        agentData.status = 'unregistered';
        agentData.unregisteredAt = new Date().toISOString();
        agentData.unregistrationReason = reason;
        await this.storage.saveAgent(agentData);
      }
    }
  }
  
  // ==================== TASK ASSIGNMENT ====================
  
  async handleReadyTasks(event) {
    const { projectId, readyTasks } = event.data;
    
    console.log(`📋 Handling ${readyTasks.length} ready tasks for project ${projectId}`);
    
    for (const task of readyTasks) {
      try {
        await this.assignTaskToAgent(projectId, task);
      } catch (error) {
        console.error(`❌ Failed to assign task ${task.id}:`, error);
        await this.handleError('task_assignment', error, { projectId, taskId: task.id });
      }
    }
  }
  
  async assignTaskToAgent(projectId, task) {
    // Find best agent for the task
    const bestAgent = await this.findBestAgentForTask(task);
    
    if (!bestAgent) {
      console.warn(`⚠️ No suitable agent found for task: ${task.id}`);
      await this.publishEvent('task.assignment.failed', {
        projectId: projectId,
        taskId: task.id,
        reason: 'no_suitable_agent'
      });
      return;
    }
    
    // Create agent instance
    const instanceId = await this.spawnAgentInstance(bestAgent.agentId, {
      projectId: projectId,
      taskId: task.id,
      taskConfig: task
    });
    
    // Publish assignment event
    await this.publishEvent('task.assigned', {
      projectId: projectId,
      taskId: task.id,
      agentId: bestAgent.agentId,
      instanceId: instanceId,
      assignmentScore: bestAgent.score,
      assignmentReason: bestAgent.reason
    });
    
    // Start task execution
    await this.executeTaskWithAgent(instanceId, task);
    
    console.log(`📌 Assigned task ${task.id} to ${bestAgent.agentId} (score: ${bestAgent.score.toFixed(3)})`);
  }
  
  async findBestAgentForTask(task) {
    const candidates = [];
    
    for (const [agentId, agentInfo] of this.agents) {
      if (agentInfo.status !== 'available') continue;
      if (agentInfo.activeInstances >= this.config.maxInstancesPerAgent) continue;
      
      // Calculate capability match
      const capabilityScore = this.calculateCapabilityScore(task, agentInfo.data.capabilities);
      if (capabilityScore < 0.3) continue; // Minimum capability threshold
      
      // Get performance metrics
      const metrics = this.agentMetrics.get(agentId);
      const performanceScore = this.calculatePerformanceScore(metrics);
      
      // Calculate load factor
      const loadScore = this.calculateLoadScore(agentInfo);
      
      // Calculate overall suitability score
      const overallScore = this.calculateOverallScore(capabilityScore, performanceScore, loadScore);
      
      candidates.push({
        agentId: agentId,
        agentInfo: agentInfo,
        score: overallScore,
        breakdown: {
          capability: capabilityScore,
          performance: performanceScore,
          load: loadScore
        },
        reason: this.generateAssignmentReason(capabilityScore, performanceScore, loadScore)
      });
    }
    
    // Sort by score (descending)
    candidates.sort((a, b) => b.score - a.score);
    
    // Apply load balancing strategy
    return this.applyLoadBalancingStrategy(candidates);
  }
  
  calculateCapabilityScore(task, capabilities) {
    const taskType = task.type;
    let maxScore = 0;
    
    // Direct capability match
    if (capabilities[taskType]) {
      maxScore = Math.max(maxScore, capabilities[taskType].efficiency || 0);
    }
    
    // Related capability matches
    const relatedCapabilities = this.getRelatedCapabilities(taskType);
    for (const relatedCap of relatedCapabilities) {
      if (capabilities[relatedCap]) {
        const score = (capabilities[relatedCap].efficiency || 0) * 0.8; // 80% for related
        maxScore = Math.max(maxScore, score);
      }
    }
    
    return maxScore;
  }
  
  getRelatedCapabilities(taskType) {
    const relationships = {
      'frontend': ['react', 'vue', 'angular', 'javascript', 'css', 'html'],
      'backend': ['api_development', 'database', 'python', 'node', 'java'],
      'database': ['sql', 'nosql', 'postgresql', 'mongodb'],
      'testing': ['unit_testing', 'integration_testing', 'e2e_testing'],
      'deployment': ['docker', 'kubernetes', 'ci_cd', 'devops']
    };
    
    return relationships[taskType] || [];
  }
  
  calculatePerformanceScore(metrics) {
    if (!metrics || metrics.tasksCompleted === 0) {
      return 0.7; // Default score for new agents
    }
    
    const qualityWeight = 0.4;
    const successRateWeight = 0.3;
    const speedWeight = 0.3;
    
    const qualityScore = metrics.averageQuality || 0.7;
    const successRate = metrics.successRate || 0.7;
    const speedScore = metrics.averageExecutionTime > 0 ? 
      Math.max(0, 1 - (metrics.averageExecutionTime / 600000)) : 0.7; // Normalize to 10 minutes
    
    return (qualityScore * qualityWeight) + 
           (successRate * successRateWeight) + 
           (speedScore * speedWeight);
  }
  
  calculateLoadScore(agentInfo) {
    const maxInstances = this.config.maxInstancesPerAgent;
    const currentLoad = agentInfo.activeInstances / maxInstances;
    return Math.max(0, 1 - currentLoad); // Higher score for lower load
  }
  
  calculateOverallScore(capabilityScore, performanceScore, loadScore) {
    const weights = {
      capability: 0.5,
      performance: 0.3,
      load: 0.2
    };
    
    return (capabilityScore * weights.capability) +
           (performanceScore * weights.performance) +
           (loadScore * weights.load);
  }
  
  generateAssignmentReason(capabilityScore, performanceScore, loadScore) {
    if (capabilityScore > 0.9) return 'excellent_capability_match';
    if (performanceScore > 0.9) return 'high_performance_history';
    if (loadScore > 0.8) return 'low_current_load';
    if (capabilityScore > 0.7) return 'good_capability_match';
    return 'best_available_option';
  }
  
  applyLoadBalancingStrategy(candidates) {
    if (candidates.length === 0) return null;
    
    switch (this.config.loadBalancingStrategy) {
      case 'round_robin':
        return this.roundRobinSelection(candidates);
      
      case 'least_busy':
        return candidates.sort((a, b) => 
          a.agentInfo.activeInstances - b.agentInfo.activeInstances
        )[0];
      
      case 'quality_weighted':
      default:
        return candidates[0]; // Already sorted by overall score
    }
  }
  
  roundRobinSelection(candidates) {
    // Simple round-robin based on assignment history
    const lastAssignments = this.assignmentHistory.slice(-10);
    const agentCounts = new Map();
    
    for (const assignment of lastAssignments) {
      agentCounts.set(assignment.agentId, (agentCounts.get(assignment.agentId) || 0) + 1);
    }
    
    // Find agent with least recent assignments
    return candidates.sort((a, b) => {
      const countA = agentCounts.get(a.agentId) || 0;
      const countB = agentCounts.get(b.agentId) || 0;
      return countA - countB;
    })[0];
  }
  
  // ==================== AGENT INSTANCE MANAGEMENT ====================
  
  async spawnAgentInstance(agentId, taskConfig) {
    const agentInfo = this.agents.get(agentId);
    if (!agentInfo) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    if (agentInfo.activeInstances >= this.config.maxInstancesPerAgent) {
      throw new Error(`Agent ${agentId} has reached maximum instances`);
    }
    
    const instanceId = `${agentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create instance data
    const instanceData = {
      id: instanceId,
      agentId: agentId,
      projectId: taskConfig.projectId,
      taskId: taskConfig.taskId,
      status: 'idle',
      configuration: taskConfig,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    
    // Save to storage
    await this.storage.saveAgentInstance(instanceData);
    
    // Create runtime instance
    let runtimeInstance;
    if (agentInfo.pluginClass) {
      runtimeInstance = new agentInfo.pluginClass();
      if (runtimeInstance.initialize) {
        await runtimeInstance.initialize(taskConfig);
      }
    } else {
      runtimeInstance = agentInfo.instance;
    }
    
    // Store active instance
    this.activeInstances.set(instanceId, {
      instanceData: instanceData,
      runtimeInstance: runtimeInstance,
      agentInfo: agentInfo,
      createdAt: new Date(),
      lastActivity: new Date()
    });
    
    // Update agent instance count
    agentInfo.activeInstances++;
    
    // Set instance timeout
    const timeout = setTimeout(async () => {
      console.warn(`⏰ Instance timeout: ${instanceId}`);
      await this.terminateAgentInstance(instanceId, 'timeout');
    }, this.config.instanceTimeout);
    
    this.timers.set(`instance_${instanceId}`, timeout);
    
    console.log(`🚀 Spawned agent instance: ${instanceId} for ${agentId}`);
    return instanceId;
  }
  
  async terminateAgentInstance(instanceId, reason = 'manual') {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      console.warn(`⚠️ Instance ${instanceId} not found for termination`);
      return;
    }
    
    console.log(`🛑 Terminating agent instance: ${instanceId} (${reason})`);
    
    try {
      // Call cleanup if available
      if (instance.runtimeInstance && instance.runtimeInstance.cleanup) {
        await instance.runtimeInstance.cleanup();
      }
      
      // Update instance status
      instance.instanceData.status = 'terminated';
      instance.instanceData.terminatedAt = new Date().toISOString();
      instance.instanceData.terminationReason = reason;
      
      // Save final state
      await this.storage.saveAgentInstance(instance.instanceData);
      
      // Remove from active instances
      this.activeInstances.delete(instanceId);
      
      // Update agent instance count
      if (instance.agentInfo) {
        instance.agentInfo.activeInstances = Math.max(0, instance.agentInfo.activeInstances - 1);
      }
      
      // Clear timeout
      const timeoutKey = `instance_${instanceId}`;
      if (this.timers.has(timeoutKey)) {
        clearTimeout(this.timers.get(timeoutKey));
        this.timers.delete(timeoutKey);
      }
      
      console.log(`✅ Instance ${instanceId} terminated successfully`);
      
    } catch (error) {
      console.error(`❌ Error terminating instance ${instanceId}:`, error);
    }
  }
  
  async terminateAgentInstances(agentId, reason = 'manual') {
    const instancesToTerminate = [];
    
    for (const [instanceId, instance] of this.activeInstances) {
      if (instance.instanceData.agentId === agentId) {
        instancesToTerminate.push(instanceId);
      }
    }
    
    console.log(`🛑 Terminating ${instancesToTerminate.length} instances for agent ${agentId}`);
    
    for (const instanceId of instancesToTerminate) {
      await this.terminateAgentInstance(instanceId, reason);
    }
  }
  
  // ==================== TASK EXECUTION ====================
  
  async executeTaskWithAgent(instanceId, task) {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    const { instanceData, runtimeInstance, agentInfo } = instance;
    
    try {
      // Update instance status
      instanceData.status = 'busy';
      instanceData.currentTask = task.id;
      instanceData.lastActivity = new Date().toISOString();
      
      // Publish task started event
      await this.publishEvent('agent.task.started', {
        instanceId: instanceId,
        agentId: instanceData.agentId,
        taskId: task.id,
        projectId: instanceData.projectId
      });
      
      // Execute the task
      const startTime = Date.now();
      const result = await runtimeInstance.executeTask(task);
      const executionTime = Date.now() - startTime;
      
      // Update metrics
      await this.updateAgentMetrics(instanceData.agentId, {
        executionTime: executionTime,
        success: result.status === 'completed',
        qualityScore: result.result?.quality || 0.8
      });
      
      // Update instance data
      instanceData.status = 'completed';
      instanceData.result = result;
      instanceData.executionTime = executionTime;
      instanceData.completedAt = new Date().toISOString();
      
      // Publish task completed event
      await this.publishEvent('task.completed', {
        projectId: instanceData.projectId,
        taskId: task.id,
        agentId: instanceData.agentId,
        instanceId: instanceId,
        result: result.result,
        qualityScore: result.result?.quality,
        performanceMetrics: {
          executionTime: executionTime,
          memoryUsage: process.memoryUsage().heapUsed,
          cpuUsage: process.cpuUsage()
        }
      });
      
      // Schedule instance cleanup
      setTimeout(() => {
        this.terminateAgentInstance(instanceId, 'task_completed');
      }, 5000); // 5 second grace period
      
      console.log(`✅ Task ${task.id} completed by ${instanceData.agentId} in ${executionTime}ms`);
      
    } catch (error) {
      console.error(`❌ Task execution failed for ${task.id}:`, error);
      
      // Update metrics for failure
      await this.updateAgentMetrics(instanceData.agentId, {
        success: false,
        error: error.message
      });
      
      // Update instance data
      instanceData.status = 'failed';
      instanceData.error = error.message;
      instanceData.failedAt = new Date().toISOString();
      
      // Publish task failed event
      await this.publishEvent('task.failed', {
        projectId: instanceData.projectId,
        taskId: task.id,
        agentId: instanceData.agentId,
        instanceId: instanceId,
        error: error.message,
        retryable: true
      });
      
      // Schedule instance cleanup
      setTimeout(() => {
        this.terminateAgentInstance(instanceId, 'task_failed');
      }, 1000);
      
      throw error;
    }
  }
  
  // ==================== PERFORMANCE TRACKING ====================
  
  async updateAgentMetrics(agentId, taskResult) {
    const metrics = this.agentMetrics.get(agentId) || {
      tasksCompleted: 0,
      tasksAssigned: 0,
      averageQuality: 0,
      averageExecutionTime: 0,
      successRate: 0,
      lastTaskTime: null,
      loadFactor: 0
    };
    
    metrics.tasksAssigned++;
    
    if (taskResult.success) {
      metrics.tasksCompleted++;
      
      // Update quality average
      if (taskResult.qualityScore) {
        const totalQuality = metrics.averageQuality * (metrics.tasksCompleted - 1) + taskResult.qualityScore;
        metrics.averageQuality = totalQuality / metrics.tasksCompleted;
      }
      
      // Update execution time average
      if (taskResult.executionTime) {
        const totalTime = metrics.averageExecutionTime * (metrics.tasksCompleted - 1) + taskResult.executionTime;
        metrics.averageExecutionTime = totalTime / metrics.tasksCompleted;
      }
    }
    
    // Update success rate
    metrics.successRate = metrics.tasksCompleted / metrics.tasksAssigned;
    metrics.lastTaskTime = new Date().toISOString();
    
    // Update load factor
    const agentInfo = this.agents.get(agentId);
    if (agentInfo) {
      metrics.loadFactor = agentInfo.activeInstances / this.config.maxInstancesPerAgent;
    }
    
    this.agentMetrics.set(agentId, metrics);
    
    // Store metrics in persistent storage
    await this.saveServiceData(`agent_metrics_${agentId}`, metrics);
  }
  
  // ==================== HEALTH MONITORING ====================
  
  startHealthMonitoring() {
    const healthTimer = setInterval(async () => {
      try {
        await this.performAgentHealthChecks();
      } catch (error) {
        console.error('❌ Agent health check error:', error);
      }
    }, this.config.healthCheckInterval);
    
    this.timers.set('health_monitoring', healthTimer);
    console.log('💓 Agent health monitoring started');
  }
  
  async performAgentHealthChecks() {
    for (const [agentId, agentInfo] of this.agents) {
      try {
        let healthStatus;
        
        if (agentInfo.instance && agentInfo.instance.healthCheck) {
          healthStatus = await agentInfo.instance.healthCheck();
        } else {
          healthStatus = {
            status: agentInfo.status === 'available' ? 'healthy' : 'unhealthy',
            activeInstances: agentInfo.activeInstances,
            timestamp: new Date().toISOString()
          };
        }
        
        this.healthStatuses.set(agentId, healthStatus);
        this.lastHealthChecks.set(agentId, new Date());
        
        // Update agent info
        agentInfo.lastHealthCheck = new Date().toISOString();
        agentInfo.data.lastHealthCheck = agentInfo.lastHealthCheck;
        
        // Save health status
        await this.saveServiceData(`agent_health_${agentId}`, healthStatus);
        
      } catch (error) {
        console.error(`❌ Health check failed for agent ${agentId}:`, error);
        
        this.healthStatuses.set(agentId, {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  // ==================== API AND STATUS ====================
  
  async getHealthStatus() {
    const baseHealth = await super.getHealthStatus();
    
    const agentHealthSummary = {
      totalAgents: this.agents.size,
      availableAgents: Array.from(this.agents.values()).filter(a => a.status === 'available').length,
      activeInstances: this.activeInstances.size,
      healthyAgents: Array.from(this.healthStatuses.values()).filter(h => h.status === 'healthy').length
    };
    
    return {
      ...baseHealth,
      agents: agentHealthSummary,
      loadBalancing: {
        strategy: this.config.loadBalancingStrategy,
        recentAssignments: this.assignmentHistory.length
      },
      hotLoading: {
        enabled: this.config.enableHotLoading,
        watchedDirectories: this.pluginWatchers.size,
        watchedFiles: this.watchedFiles.size
      }
    };
  }
  
  getAgentSummary() {
    const summary = {
      totalAgents: this.agents.size,
      agentsByStatus: {},
      agentsBySpecialization: {},
      totalInstances: this.activeInstances.size,
      performanceMetrics: {},
      timestamp: new Date().toISOString()
    };
    
    // Count by status
    for (const agentInfo of this.agents.values()) {
      const status = agentInfo.status;
      summary.agentsByStatus[status] = (summary.agentsByStatus[status] || 0) + 1;
      
      const specialization = agentInfo.data.specialization;
      summary.agentsBySpecialization[specialization] = (summary.agentsBySpecialization[specialization] || 0) + 1;
    }
    
    // Aggregate performance metrics
    let totalTasks = 0;
    let totalQuality = 0;
    let totalExecutionTime = 0;
    let agentsWithMetrics = 0;
    
    for (const metrics of this.agentMetrics.values()) {
      if (metrics.tasksCompleted > 0) {
        totalTasks += metrics.tasksCompleted;
        totalQuality += metrics.averageQuality * metrics.tasksCompleted;
        totalExecutionTime += metrics.averageExecutionTime * metrics.tasksCompleted;
        agentsWithMetrics++;
      }
    }
    
    if (totalTasks > 0) {
      summary.performanceMetrics = {
        totalTasksCompleted: totalTasks,
        averageQuality: totalQuality / totalTasks,
        averageExecutionTime: totalExecutionTime / totalTasks,
        agentsWithHistory: agentsWithMetrics
      };
    }
    
    return summary;
  }
  
  async handleTaskCompleted(event) {
    // Record assignment history for load balancing
    this.assignmentHistory.push({
      agentId: event.data.agentId,
      taskId: event.data.taskId,
      timestamp: new Date().toISOString()
    });
    
    // Keep only recent history
    if (this.assignmentHistory.length > 100) {
      this.assignmentHistory.shift();
    }
  }
  
  async handleTaskFailed(event) {
    // Also record failed assignments
    this.assignmentHistory.push({
      agentId: event.data.agentId,
      taskId: event.data.taskId,
      failed: true,
      timestamp: new Date().toISOString()
    });
  }
  
  initializeLoadBalancer() {
    // Placeholder for advanced load balancing logic
    console.log(`⚖️ Load balancer initialized with strategy: ${this.config.loadBalancingStrategy}`);
  }
}

module.exports = AgentPoolManager;