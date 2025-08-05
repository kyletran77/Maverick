const BaseService = require('../services/BaseService');
const JSONStorageManager = require('../storage/JSONStorageManager');
const { SimpleEventBus } = require('../events/SimpleEventBus');
const SystemInitializer = require('../initialization/SystemInitializer');
const TaskGraphService = require('../services/TaskGraphService');
const AgentPoolManager = require('../services/AgentPoolManager');
const QualityService = require('../services/QualityService');
const QualityFeedbackEngine = require('../services/QualityFeedbackEngine');
const AgentPerformanceTracker = require('../services/AgentPerformanceTracker');
const { v4: uuidv4 } = require('uuid');

/**
 * Modular Orchestrator
 * 
 * The central coordination system that brings together all modular services:
 * - Manages all service lifecycles and dependencies
 * - Provides unified project management and task coordination
 * - Implements complete event-driven architecture
 * - Handles intelligent agent assignment and load balancing
 * - Manages quality gates and feedback loops
 * - Provides comprehensive monitoring and health checking
 * - Supports hot-reloading and dynamic service management
 */
class ModularOrchestrator extends BaseService {
  constructor(config = {}) {
    // Initialize storage and event bus first
    const storagePath = config.storagePath || './data/storage';
    const storageManager = new JSONStorageManager(storagePath);
    const eventBus = new SimpleEventBus({
      maxHistorySize: config.maxHistorySize || 10000,
      enableTracing: config.enableTracing !== false,
      retryAttempts: config.retryAttempts || 3
    });
    
    super('ModularOrchestrator', storageManager, eventBus, {
      enableHotReloading: true,
      enableQualityGates: true,
      enablePerformanceTracking: true,
      enablePredictiveScheduling: true,
      maxConcurrentProjects: 10,
      maxConcurrentTasks: 50,
      healthCheckInterval: 30000, // 30 seconds
      serviceStartupTimeout: 60000, // 1 minute
      gracefulShutdownTimeout: 30000, // 30 seconds
      ...config
    });
    
    // Core system components
    this.systemInitializer = null;
    this.services = new Map(); // serviceName -> service instance
    this.serviceStates = new Map(); // serviceName -> state info
    this.serviceDependencies = new Map(); // serviceName -> dependencies
    
    // Project and task management
    this.activeProjects = new Map(); // projectId -> project info
    this.activeTasks = new Map(); // taskId -> task info
    this.taskQueue = []; // Pending tasks
    this.agentAssignments = new Map(); // taskId -> agentId
    
    // Service orchestration
    this.orchestrationMetrics = {
      totalProjects: 0,
      completedProjects: 0,
      failedProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageProjectDuration: 0,
      averageTaskDuration: 0,
      systemLoad: 0,
      servicesRunning: 0,
      lastCalculated: null
    };
    
    // Event coordination
    this.eventCoordination = {
      eventSequences: new Map(), // Track multi-step processes
      pendingOperations: new Map(), // Operations waiting for dependencies
      coordinationTimeout: 300000 // 5 minutes
    };
  }
  
  // ==================== SYSTEM INITIALIZATION ====================
  
  async initialize() {
    console.log('🚀 Initializing ModularOrchestrator...');
    
    try {
      // Initialize system infrastructure
      await this.initializeSystem();
      
      // Initialize all modular services
      await this.initializeServices();
      
      // Set up service coordination
      await this.setupServiceCoordination();
      
      // Start system monitoring
      await this.startSystemMonitoring();
      
      // Load existing projects and resume if needed
      await this.resumeActiveProjects();
      
      console.log('✅ ModularOrchestrator initialized successfully');
      
      // Publish system ready event
      await this.publishEvent('system.ready', {
        orchestrator: 'ModularOrchestrator',
        services: Array.from(this.services.keys()),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ ModularOrchestrator initialization failed:', error);
      throw error;
    }
  }
  
  async initializeSystem() {
    console.log('🏗️ Initializing system infrastructure...');
    
    // Initialize system with JSON-first approach
    this.systemInitializer = new SystemInitializer({
      storagePath: this.storage.basePath,
      createSampleData: this.config.createSampleData !== false,
      enableHealthCheck: true
    });
    
    const { storageManager, eventBus } = await this.systemInitializer.initialize();
    
    // Verify our components match
    if (storageManager !== this.storage) {
      console.warn('⚠️ Storage manager mismatch - using orchestrator instance');
    }
    
    console.log('✅ System infrastructure initialized');
  }
  
  async initializeServices() {
    console.log('🔧 Initializing modular services...');
    
    // Define service initialization order based on dependencies
    const serviceDefinitions = [
      {
        name: 'TaskGraphService',
        class: TaskGraphService,
        dependencies: [],
        config: {
          enableTaskPolling: true,
          pollingInterval: 5000,
          maxGraphSize: 1000
        }
      },
      {
        name: 'AgentPoolManager',
        class: AgentPoolManager,
        dependencies: [],
        config: {
          enableHotLoading: this.config.enableHotReloading,
          pluginDirectories: ['./src/plugins/agents'],
          maxConcurrentTasksPerAgent: 3
        }
      },
      {
        name: 'QualityService',
        class: QualityService,
        dependencies: [],
        config: {
          qualityThreshold: 0.8,
          enableQualityGates: this.config.enableQualityGates,
          enableRealTimeScoring: true
        }
      },
      {
        name: 'QualityFeedbackEngine',
        class: QualityFeedbackEngine,
        dependencies: ['QualityService'],
        config: {
          enableRealTimeFeedback: true,
          enablePredictiveModeling: true,
          enableAdaptiveLearning: true
        }
      },
      {
        name: 'AgentPerformanceTracker',
        class: AgentPerformanceTracker,
        dependencies: ['AgentPoolManager', 'QualityService'],
        config: {
          enablePredictiveWeighting: this.config.enablePredictiveScheduling,
          weightUpdateInterval: 60000
        }
      }
    ];
    
    // Initialize services in dependency order
    for (const serviceDef of serviceDefinitions) {
      await this.initializeService(serviceDef);
    }
    
    console.log(`✅ Initialized ${this.services.size} modular services`);
  }
  
  async initializeService(serviceDef) {
    const { name, class: ServiceClass, dependencies, config } = serviceDef;
    
    console.log(`🔧 Initializing service: ${name}`);
    
    try {
      // Check dependencies
      for (const dep of dependencies) {
        if (!this.services.has(dep) || this.serviceStates.get(dep)?.status !== 'running') {
          throw new Error(`Service ${name} depends on ${dep} which is not running`);
        }
      }
      
      // Create service instance
      const service = new ServiceClass(this.storage, this.eventBus, config);
      
      // Store service and state
      this.services.set(name, service);
      this.serviceDependencies.set(name, dependencies);
      this.serviceStates.set(name, {
        status: 'initializing',
        startTime: new Date(),
        dependencies: dependencies,
        config: config
      });
      
      // Start the service
      await service.start();
      
      // Update state
      this.serviceStates.set(name, {
        ...this.serviceStates.get(name),
        status: 'running',
        startedAt: new Date()
      });
      
      console.log(`✅ Service ${name} initialized and running`);
      
    } catch (error) {
      console.error(`❌ Failed to initialize service ${name}:`, error);
      
      this.serviceStates.set(name, {
        ...this.serviceStates.get(name),
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }
  
  // ==================== SERVICE COORDINATION ====================
  
  async setupServiceCoordination() {
    console.log('🔗 Setting up service coordination...');
    
    // Subscribe to cross-service events
    await this.subscribeToEvent('project.*', this.handleProjectEvents.bind(this));
    await this.subscribeToEvent('task.*', this.handleTaskEvents.bind(this));
    await this.subscribeToEvent('agent.*', this.handleAgentEvents.bind(this));
    await this.subscribeToEvent('quality.*', this.handleQualityEvents.bind(this));
    await this.subscribeToEvent('service.*', this.handleServiceEvents.bind(this));
    
    // Set up coordination timers
    this.startCoordinationTimers();
    
    console.log('✅ Service coordination established');
  }
  
  startCoordinationTimers() {
    // Task assignment coordination
    const taskCoordinationTimer = setInterval(async () => {
      await this.coordinateTaskAssignment();
    }, 10000); // Every 10 seconds
    
    // Service health coordination
    const healthCoordinationTimer = setInterval(async () => {
      await this.coordinateServiceHealth();
    }, this.config.healthCheckInterval);
    
    // Load balancing coordination
    const loadBalancingTimer = setInterval(async () => {
      await this.coordinateLoadBalancing();
    }, 60000); // Every minute
    
    this.timers.set('task_coordination', taskCoordinationTimer);
    this.timers.set('health_coordination', healthCoordinationTimer);
    this.timers.set('load_balancing', loadBalancingTimer);
  }
  
  // ==================== PROJECT MANAGEMENT ====================
  
  async createProject(requirements, options = {}) {
    const projectId = uuidv4();
    
    console.log(`🚀 Creating new project: ${projectId}`);
    
    try {
      const project = {
        id: projectId,
        name: options.name || `Project ${projectId.substring(0, 8)}`,
        description: options.description || 'Auto-generated project',
        requirements: requirements,
        status: 'planning',
        configuration: {
          maxConcurrentTasks: options.maxConcurrentTasks || 5,
          qualityThreshold: options.qualityThreshold || 0.8,
          retryPolicy: options.retryPolicy || { maxRetries: 3, backoffMs: 1000 }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: options.createdBy || 'system'
      };
      
      // Save project
      await this.storage.saveProject(project);
      this.activeProjects.set(projectId, project);
      
      // Publish project creation event
      await this.publishEvent('project.created', {
        projectId: projectId,
        project: project
      });
      
      // Start project planning
      await this.planProject(projectId);
      
      console.log(`✅ Project created: ${projectId}`);
      return projectId;
      
    } catch (error) {
      console.error(`❌ Failed to create project:`, error);
      throw error;
    }
  }
  
  async planProject(projectId) {
    console.log(`📋 Planning project: ${projectId}`);
    
    const project = this.activeProjects.get(projectId) || await this.storage.loadProject(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }
    
    try {
      // Update project status
      project.status = 'planning';
      project.updatedAt = new Date().toISOString();
      await this.storage.saveProject(project);
      
      // Generate task graph based on requirements
      const taskGraph = await this.generateTaskGraph(project);
      
      // Publish project planned event (TaskGraphService will handle this)
      await this.publishEvent('project.planned', {
        projectId: projectId,
        taskGraph: taskGraph,
        requirements: project.requirements
      });
      
      console.log(`✅ Project planned: ${projectId}`);
      
    } catch (error) {
      console.error(`❌ Failed to plan project ${projectId}:`, error);
      
      // Update project status to failed
      project.status = 'failed';
      project.error = error.message;
      project.updatedAt = new Date().toISOString();
      await this.storage.saveProject(project);
      
      throw error;
    }
  }
  
  async generateTaskGraph(project) {
    // Simple task graph generation based on requirements
    // In a real implementation, this would use AI/ML or rule-based planning
    
    const requirements = project.requirements.parsedRequirements || [project.requirements.originalPrompt];
    const nodes = {};
    const edges = [];
    
    // Generate setup task
    const setupTaskId = 'setup-project';
    nodes[setupTaskId] = {
      id: setupTaskId,
      type: 'setup',
      description: 'Set up project structure and dependencies',
      priority: 1,
      estimatedDuration: 15,
      dependencies: [],
      requiredCapabilities: ['setup', 'project_management']
    };
    
    let previousTaskId = setupTaskId;
    
    // Generate tasks for each requirement
    for (let i = 0; i < requirements.length; i++) {
      const requirement = requirements[i];
      const taskId = `task-${i + 1}`;
      
      // Determine task type based on requirement content
      let taskType = 'feature';
      let capabilities = ['general'];
      
      if (requirement.toLowerCase().includes('test')) {
        taskType = 'testing';
        capabilities = ['testing', 'quality_assurance'];
      } else if (requirement.toLowerCase().includes('frontend') || requirement.toLowerCase().includes('ui')) {
        taskType = 'frontend';
        capabilities = ['frontend', 'ui_design'];
      } else if (requirement.toLowerCase().includes('backend') || requirement.toLowerCase().includes('api')) {
        taskType = 'backend';
        capabilities = ['backend', 'api_development'];
      } else if (requirement.toLowerCase().includes('database')) {
        taskType = 'database';
        capabilities = ['database', 'data_modeling'];
      }
      
      nodes[taskId] = {
        id: taskId,
        type: taskType,
        description: requirement,
        priority: i + 2,
        estimatedDuration: 30,
        dependencies: [
          { nodeId: previousTaskId, type: 'completion', condition: { status: 'completed' } }
        ],
        requiredCapabilities: capabilities
      };
      
      edges.push({
        from: previousTaskId,
        to: taskId,
        condition: { type: 'completion' }
      });
      
      previousTaskId = taskId;
    }
    
    // Add final quality review task
    const reviewTaskId = 'final-review';
    nodes[reviewTaskId] = {
      id: reviewTaskId,
      type: 'quality',
      description: 'Final quality review and testing',
      priority: requirements.length + 2,
      estimatedDuration: 20,
      dependencies: [
        { nodeId: previousTaskId, type: 'completion', condition: { status: 'completed', quality: '>= 0.8' } }
      ],
      requiredCapabilities: ['quality_assurance', 'code_review']
    };
    
    edges.push({
      from: previousTaskId,
      to: reviewTaskId,
      condition: { type: 'completion', quality: '>= 0.8' }
    });
    
    return { nodes, edges };
  }
  
  // ==================== TASK COORDINATION ====================
  
  async coordinateTaskAssignment() {
    // Get ready tasks from TaskGraphService
    const taskGraphService = this.services.get('TaskGraphService');
    const agentPoolManager = this.services.get('AgentPoolManager');
    const performanceTracker = this.services.get('AgentPerformanceTracker');
    
    if (!taskGraphService || !agentPoolManager || !performanceTracker) {
      return; // Services not ready
    }
    
    // Process task queue
    for (const [projectId, project] of this.activeProjects) {
      if (project.status !== 'active') continue;
      
      try {
        // Find ready tasks for this project
        const readyTasks = await taskGraphService.findReadyTasks(projectId);
        
        for (const task of readyTasks) {
          if (this.activeTasks.has(task.id)) continue; // Already assigned
          
          // Find best agent for this task
          const bestAgent = await this.findBestAgentForTask(task);
          
          if (bestAgent) {
            await this.assignTaskToAgent(task, bestAgent);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error in task coordination for project ${projectId}:`, error);
      }
    }
  }
  
  async findBestAgentForTask(task) {
    const agentPoolManager = this.services.get('AgentPoolManager');
    const performanceTracker = this.services.get('AgentPerformanceTracker');
    
    // Get available agents
    const availableAgents = await agentPoolManager.getAvailableAgents();
    
    // Filter agents by capability
    const capableAgents = availableAgents.filter(agent => 
      agentPoolManager.canAgentHandleTask(agent.id, task)
    );
    
    if (capableAgents.length === 0) {
      return null; // No capable agents
    }
    
    // Score agents based on performance and capability match
    const scoredAgents = [];
    
    for (const agent of capableAgents) {
      const weight = performanceTracker.getAgentWeight(agent.id);
      const capabilityScore = agentPoolManager.calculateCapabilityScore(agent.id, task);
      const combinedScore = weight * capabilityScore;
      
      scoredAgents.push({
        agent: agent,
        score: combinedScore,
        weight: weight,
        capabilityScore: capabilityScore
      });
    }
    
    // Sort by score and return best agent
    scoredAgents.sort((a, b) => b.score - a.score);
    
    return scoredAgents[0]?.agent || null;
  }
  
  async assignTaskToAgent(task, agent) {
    console.log(`👤 Assigning task ${task.id} to agent ${agent.id}`);
    
    try {
      const agentPoolManager = this.services.get('AgentPoolManager');
      
      // Assign task through AgentPoolManager
      const assignmentResult = await agentPoolManager.assignTask(task, agent.id);
      
      if (assignmentResult.success) {
        // Track assignment
        this.activeTasks.set(task.id, {
          task: task,
          agentId: agent.id,
          assignedAt: new Date().toISOString(),
          status: 'assigned'
        });
        
        this.agentAssignments.set(task.id, agent.id);
        
        // Publish assignment event
        await this.publishEvent('task.assigned', {
          taskId: task.id,
          agentId: agent.id,
          projectId: task.projectId,
          assignment: assignmentResult
        });
        
        console.log(`✅ Task ${task.id} assigned to agent ${agent.id}`);
      } else {
        console.warn(`⚠️ Failed to assign task ${task.id} to agent ${agent.id}: ${assignmentResult.reason}`);
      }
      
    } catch (error) {
      console.error(`❌ Error assigning task ${task.id} to agent ${agent.id}:`, error);
    }
  }
  
  // ==================== EVENT HANDLERS ====================
  
  async handleProjectEvents(event) {
    const eventType = event.type;
    const projectId = event.data.projectId;
    
    switch (eventType) {
      case 'project.planned':
        await this.handleProjectPlanned(event);
        break;
      case 'project.started':
        await this.handleProjectStarted(event);
        break;
      case 'project.completed':
        await this.handleProjectCompleted(event);
        break;
      case 'project.failed':
        await this.handleProjectFailed(event);
        break;
    }
  }
  
  async handleProjectPlanned(event) {
    const { projectId } = event.data;
    
    // Update project status
    const project = this.activeProjects.get(projectId);
    if (project) {
      project.status = 'active';
      project.startedAt = new Date().toISOString();
      project.updatedAt = new Date().toISOString();
      
      await this.storage.saveProject(project);
      this.activeProjects.set(projectId, project);
      
      // Publish project started event
      await this.publishEvent('project.started', {
        projectId: projectId,
        project: project
      });
      
      console.log(`🎯 Project ${projectId} is now active`);
    }
  }
  
  async handleProjectCompleted(event) {
    const { projectId } = event.data;
    
    console.log(`🎉 Project completed: ${projectId}`);
    
    // Update project status
    const project = this.activeProjects.get(projectId);
    if (project) {
      project.status = 'completed';
      project.completedAt = new Date().toISOString();
      project.updatedAt = new Date().toISOString();
      
      await this.storage.saveProject(project);
      this.activeProjects.delete(projectId); // Remove from active tracking
      
      // Update metrics
      this.orchestrationMetrics.completedProjects++;
      this.updateOrchestrationMetrics();
    }
  }
  
  async handleTaskEvents(event) {
    const eventType = event.type;
    
    switch (eventType) {
      case 'task.started':
        await this.handleTaskStarted(event);
        break;
      case 'task.completed':
        await this.handleTaskCompleted(event);
        break;
      case 'task.failed':
        await this.handleTaskFailed(event);
        break;
      case 'tasks.ready':
        // TaskGraphService found new ready tasks
        await this.coordinateTaskAssignment();
        break;
    }
  }
  
  async handleTaskStarted(event) {
    const { taskId, agentId, projectId } = event.data;
    
    // Update task tracking
    const taskInfo = this.activeTasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'running';
      taskInfo.startedAt = new Date().toISOString();
      this.activeTasks.set(taskId, taskInfo);
    }
    
    console.log(`▶️ Task started: ${taskId} by ${agentId}`);
  }
  
  async handleTaskCompleted(event) {
    const { taskId, agentId, projectId, result, qualityScore } = event.data;
    
    console.log(`✅ Task completed: ${taskId} by ${agentId} (quality: ${qualityScore})`);
    
    // Update task tracking
    const taskInfo = this.activeTasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'completed';
      taskInfo.completedAt = new Date().toISOString();
      taskInfo.result = result;
      taskInfo.qualityScore = qualityScore;
      
      // Remove from active tracking
      this.activeTasks.delete(taskId);
      this.agentAssignments.delete(taskId);
    }
    
    // Update metrics
    this.orchestrationMetrics.completedTasks++;
  }
  
  async handleTaskFailed(event) {
    const { taskId, agentId, projectId, error } = event.data;
    
    console.log(`❌ Task failed: ${taskId} by ${agentId} - ${error}`);
    
    // Update task tracking
    const taskInfo = this.activeTasks.get(taskId);
    if (taskInfo) {
      taskInfo.status = 'failed';
      taskInfo.failedAt = new Date().toISOString();
      taskInfo.error = error;
      
      // Remove from active tracking
      this.activeTasks.delete(taskId);
      this.agentAssignments.delete(taskId);
    }
    
    // Update metrics
    this.orchestrationMetrics.failedTasks++;
  }
  
  async handleAgentEvents(event) {
    const eventType = event.type;
    
    switch (eventType) {
      case 'agent.registered':
        console.log(`👤 New agent registered: ${event.data.agentId}`);
        break;
      case 'agent.unregistered':
        console.log(`👤 Agent unregistered: ${event.data.agentId}`);
        break;
      case 'agent.weight.updated':
        // Agent performance weight updated - may need to rebalance
        await this.coordinateLoadBalancing();
        break;
    }
  }
  
  async handleQualityEvents(event) {
    const eventType = event.type;
    
    switch (eventType) {
      case 'quality.gate.result':
        const { taskId, gateResult } = event.data;
        if (!gateResult.passed) {
          console.log(`🚪 Quality gate failed for task: ${taskId}`);
          // Could trigger task reassignment or rework
        }
        break;
      case 'quality.degradation.alert':
        console.log(`⚠️ Quality degradation alert: ${event.data.type} ${event.data.entityId}`);
        break;
    }
  }
  
  async handleServiceEvents(event) {
    const eventType = event.type;
    const serviceName = event.data.serviceName;
    
    switch (eventType) {
      case 'service.started':
        console.log(`🔧 Service started: ${serviceName}`);
        break;
      case 'service.stopped':
        console.log(`🔧 Service stopped: ${serviceName}`);
        break;
      case 'service.error':
        console.error(`❌ Service error in ${serviceName}: ${event.data.error}`);
        await this.handleServiceError(serviceName, event.data);
        break;
    }
  }
  
  // ==================== SYSTEM MONITORING ====================
  
  async startSystemMonitoring() {
    console.log('📊 Starting system monitoring...');
    
    // Health monitoring
    const healthTimer = setInterval(async () => {
      await this.performSystemHealthCheck();
    }, this.config.healthCheckInterval);
    
    // Metrics collection
    const metricsTimer = setInterval(async () => {
      await this.collectSystemMetrics();
    }, 60000); // Every minute
    
    this.timers.set('system_health', healthTimer);
    this.timers.set('system_metrics', metricsTimer);
    
    console.log('✅ System monitoring started');
  }
  
  async performSystemHealthCheck() {
    const healthStatus = {
      system: 'healthy',
      timestamp: new Date().toISOString(),
      services: {},
      orchestrator: {
        activeProjects: this.activeProjects.size,
        activeTasks: this.activeTasks.size,
        totalServices: this.services.size,
        runningServices: 0
      }
    };
    
    // Check each service
    for (const [serviceName, service] of this.services) {
      try {
        const serviceHealth = await service.getHealthStatus();
        healthStatus.services[serviceName] = serviceHealth;
        
        if (serviceHealth.status === 'healthy') {
          healthStatus.orchestrator.runningServices++;
        } else {
          healthStatus.system = 'degraded';
        }
        
      } catch (error) {
        healthStatus.services[serviceName] = {
          status: 'unhealthy',
          error: error.message
        };
        healthStatus.system = 'degraded';
      }
    }
    
    // Save health status
    await this.storage.saveSystemHealth(healthStatus);
    
    // Publish health status
    await this.publishEvent('system.health', healthStatus);
    
    return healthStatus;
  }
  
  async collectSystemMetrics() {
    // Update orchestration metrics
    this.updateOrchestrationMetrics();
    
    // Collect service metrics
    const serviceMetrics = {};
    for (const [serviceName, service] of this.services) {
      try {
        if (typeof service.getMetrics === 'function') {
          serviceMetrics[serviceName] = service.getMetrics();
        }
      } catch (error) {
        console.error(`❌ Error collecting metrics from ${serviceName}:`, error);
      }
    }
    
    const systemMetrics = {
      timestamp: new Date().toISOString(),
      orchestrator: this.orchestrationMetrics,
      services: serviceMetrics,
      system: {
        uptime: Date.now() - this.startTime.getTime(),
        memoryUsage: process.memoryUsage()
      }
    };
    
    // Save metrics
    await this.saveServiceData('system-metrics', systemMetrics);
    
    // Publish metrics
    await this.publishEvent('system.metrics', systemMetrics);
  }
  
  updateOrchestrationMetrics() {
    // Calculate average durations
    const completedProjects = this.orchestrationMetrics.completedProjects;
    const completedTasks = this.orchestrationMetrics.completedTasks;
    
    // System load calculation
    const maxConcurrentTasks = this.config.maxConcurrentTasks;
    this.orchestrationMetrics.systemLoad = this.activeTasks.size / maxConcurrentTasks;
    
    // Service status
    this.orchestrationMetrics.servicesRunning = Array.from(this.serviceStates.values())
      .filter(state => state.status === 'running').length;
    
    this.orchestrationMetrics.lastCalculated = new Date().toISOString();
  }
  
  // ==================== LOAD BALANCING ====================
  
  async coordinateLoadBalancing() {
    const performanceTracker = this.services.get('AgentPerformanceTracker');
    if (!performanceTracker) return;
    
    // Get system load information
    const globalMetrics = performanceTracker.getGlobalMetrics();
    const systemLoad = this.orchestrationMetrics.systemLoad;
    
    // Publish load information for services to adjust
    await this.publishEvent('system.load.changed', {
      systemLoad: systemLoad,
      activeProjects: this.activeProjects.size,
      activeTasks: this.activeTasks.size,
      globalMetrics: globalMetrics
    });
  }
  
  // ==================== ERROR HANDLING ====================
  
  async handleServiceError(serviceName, errorData) {
    console.error(`🚨 Handling service error in ${serviceName}:`, errorData);
    
    const serviceState = this.serviceStates.get(serviceName);
    if (serviceState) {
      serviceState.lastError = {
        ...errorData,
        timestamp: new Date().toISOString()
      };
      
      // Consider restarting service if configured
      if (this.config.autoRestartServices && serviceState.status === 'running') {
        try {
          console.log(`🔄 Attempting to restart service: ${serviceName}`);
          const service = this.services.get(serviceName);
          if (service) {
            await service.restart('error_recovery');
          }
        } catch (restartError) {
          console.error(`❌ Failed to restart service ${serviceName}:`, restartError);
        }
      }
    }
  }
  
  // ==================== PROJECT RESUME ====================
  
  async resumeActiveProjects() {
    console.log('🔄 Resuming active projects...');
    
    try {
      const allProjects = await this.storage.loadAllProjects();
      let resumedProjects = 0;
      
      for (const [projectId, project] of Object.entries(allProjects)) {
        if (project.status === 'active' || project.status === 'planning') {
          this.activeProjects.set(projectId, project);
          
          // Trigger coordination for active projects
          if (project.status === 'active') {
            await this.coordinateTaskAssignment();
          }
          
          resumedProjects++;
        }
      }
      
      console.log(`✅ Resumed ${resumedProjects} active projects`);
      
    } catch (error) {
      console.error('❌ Error resuming active projects:', error);
    }
  }
  
  // ==================== CLEANUP ====================
  
  async cleanup() {
    console.log('🧹 Cleaning up ModularOrchestrator...');
    
    try {
      // Graceful shutdown of all services
      const shutdownPromises = [];
      
      for (const [serviceName, service] of this.services) {
        console.log(`🛑 Stopping service: ${serviceName}`);
        shutdownPromises.push(
          service.stop('orchestrator_shutdown')
            .catch(error => console.error(`❌ Error stopping ${serviceName}:`, error))
        );
      }
      
      // Wait for all services to stop (with timeout)
      await Promise.race([
        Promise.all(shutdownPromises),
        new Promise(resolve => setTimeout(resolve, this.config.gracefulShutdownTimeout))
      ]);
      
      // Clear data structures
      this.services.clear();
      this.serviceStates.clear();
      this.serviceDependencies.clear();
      this.activeProjects.clear();
      this.activeTasks.clear();
      this.agentAssignments.clear();
      
      console.log('✅ ModularOrchestrator cleanup complete');
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }
  
  // ==================== PUBLIC API ====================
  
  // Project management
  async createAndStartProject(requirements, options = {}) {
    return await this.createProject(requirements, options);
  }
  
  async getProjectStatus(projectId) {
    const project = this.activeProjects.get(projectId) || await this.storage.loadProject(projectId);
    if (!project) return null;
    
    const taskGraphService = this.services.get('TaskGraphService');
    const projectOverview = taskGraphService ? 
      await taskGraphService.getProjectQualityOverview(projectId) : null;
    
    return {
      project: project,
      qualityOverview: projectOverview,
      activeTasks: Array.from(this.activeTasks.values())
        .filter(task => task.task.projectId === projectId)
    };
  }
  
  async pauseProject(projectId) {
    const project = this.activeProjects.get(projectId);
    if (project && project.status === 'active') {
      project.status = 'paused';
      project.pausedAt = new Date().toISOString();
      project.updatedAt = new Date().toISOString();
      
      await this.storage.saveProject(project);
      
      await this.publishEvent('project.paused', { projectId });
      return true;
    }
    return false;
  }
  
  async resumeProject(projectId) {
    const project = this.activeProjects.get(projectId);
    if (project && project.status === 'paused') {
      project.status = 'active';
      project.resumedAt = new Date().toISOString();
      project.updatedAt = new Date().toISOString();
      
      await this.storage.saveProject(project);
      this.activeProjects.set(projectId, project);
      
      await this.publishEvent('project.resumed', { projectId });
      await this.coordinateTaskAssignment();
      return true;
    }
    return false;
  }
  
  // Project management helpers
  getActiveProjects() {
    return Array.from(this.activeProjects.values());
  }
  
  getSystemIntelligence() {
    // Get intelligence data from AgentPerformanceTracker
    const performanceTracker = this.services.get('AgentPerformanceTracker');
    if (performanceTracker) {
      const globalMetrics = performanceTracker.getGlobalMetrics();
      return {
        loadBalancing: globalMetrics.weights || {},
        performancePatterns: globalMetrics.patterns || [],
        adaptiveBehaviors: globalMetrics.adaptations || {}
      };
    }
    return {
      loadBalancing: {},
      performancePatterns: [],
      adaptiveBehaviors: {}
    };
  }
  
  getSystemAlerts(includeResolved = false) {
    // Return sample alerts for demo
    return [
      {
        type: 'performance',
        severity: 'low',
        message: 'Agent utilization below threshold',
        createdAt: Date.now() - 120000
      }
    ];
  }
  
  // System status
  getSystemStatus() {
    return {
      orchestrator: {
        status: this.status,
        uptime: Date.now() - this.startTime.getTime(),
        activeProjects: this.activeProjects.size,
        activeTasks: this.activeTasks.size,
        metrics: this.orchestrationMetrics
      },
      services: Object.fromEntries(
        Array.from(this.serviceStates.entries()).map(([name, state]) => [
          name, {
            status: state.status,
            startedAt: state.startedAt,
            uptime: state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : 0
          }
        ])
      )
    };
  }
  
  // Service management
  getServiceStatus(serviceName) {
    return this.serviceStates.get(serviceName) || null;
  }
  
  async restartService(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      await service.restart('manual_restart');
      return true;
    }
    return false;
  }
}

module.exports = ModularOrchestrator;