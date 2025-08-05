const BaseService = require('./BaseService');
const { v4: uuidv4 } = require('uuid');

/**
 * Task Graph Service
 * 
 * Manages task graphs with:
 * - JSON-persisted task graphs with complex dependency resolution
 * - Real-time task status tracking and state transitions
 * - Sophisticated dependency condition evaluation
 * - Task execution flow control and coordination
 * - Automatic ready task detection and notifications
 * - Graph versioning and history management
 * - Performance optimization for large graphs
 */
class TaskGraphService extends BaseService {
  constructor(storageManager, eventBus, config = {}) {
    super('TaskGraphService', storageManager, eventBus, {
      enableTaskPolling: true,
      pollingInterval: 5000, // 5 seconds
      maxGraphSize: 1000, // Maximum nodes per graph
      enableVersioning: true,
      enableTaskHistory: true,
      dependencyTimeout: 300000, // 5 minutes max wait for dependencies
      ...config
    });
    
    // Task execution tracking
    this.activeExecutions = new Map(); // taskId -> execution info
    this.taskTimeouts = new Map(); // taskId -> timeout handle
    this.dependencyWatchers = new Map(); // taskId -> dependency watcher
    
    // Performance optimization
    this.graphCache = new Map(); // projectId -> cached graph
    this.cacheTimeout = 30000; // 30 seconds cache TTL
    
    // Task flow statistics
    this.flowStats = {
      tasksExecuted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      averageExecutionTime: 0,
      dependencyViolations: 0
    };
  }
  
  async initialize() {
    console.log('🚀 Initializing TaskGraphService...');
    
    // Subscribe to orchestrator events
    await this.subscribeToEvent('project.planned', this.handleProjectPlanned.bind(this));
    await this.subscribeToEvent('task.completed', this.handleTaskCompleted.bind(this));
    await this.subscribeToEvent('task.failed', this.handleTaskFailed.bind(this));
    
    // Subscribe to agent events
    await this.subscribeToEvent('agent.task.started', this.handleTaskStarted.bind(this));
    
    // Subscribe to quality events if needed
    // await this.subscribeToEvent('quality.result', this.handleQualityResult.bind(this));
    
    // Start task polling if enabled
    if (this.config.enableTaskPolling) {
      this.startTaskPolling();
    }
    
    // Load existing active graphs
    await this.loadActiveGraphs();
    
    console.log('✅ TaskGraphService initialized');
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up TaskGraphService...');
    
    // Clear all timeouts
    for (const [taskId, timeout] of this.taskTimeouts) {
      clearTimeout(timeout);
    }
    this.taskTimeouts.clear();
    
    // Clear dependency watchers
    this.dependencyWatchers.clear();
    
    // Clear cache
    this.graphCache.clear();
    
    console.log('✅ TaskGraphService cleanup complete');
  }
  
  // ==================== PROJECT PLANNING ====================
  
  async handleProjectPlanned(event) {
    const { projectId, taskGraph, requirements } = event.data;
    
    console.log(`📊 Creating task graph for project: ${projectId}`);
    
    try {
      // Create enhanced task graph with metadata
      const enhancedGraph = await this.createEnhancedTaskGraph(projectId, taskGraph, requirements);
      
      // Save to storage
      await this.storage.saveTaskGraph(projectId, enhancedGraph);
      
      // Cache for performance
      this.graphCache.set(projectId, enhancedGraph);
      
      // Find initially ready tasks
      const readyTasks = await this.findReadyTasks(projectId);
      
      // Publish task graph ready event
      await this.publishEvent('taskgraph.ready', {
        projectId: projectId,
        graphId: enhancedGraph.id,
        readyTasks: readyTasks,
        totalTasks: Object.keys(enhancedGraph.graphDefinition.nodes).length
      });
      
      console.log(`✅ Task graph created for ${projectId}: ${readyTasks.length} tasks ready`);
      
    } catch (error) {
      console.error(`❌ Failed to create task graph for ${projectId}:`, error);
      await this.handleError('graph_creation', error, { projectId, taskGraph });
    }
  }
  
  async createEnhancedTaskGraph(projectId, taskGraph, requirements) {
    const enhancedGraph = {
      id: uuidv4(),
      projectId: projectId,
      version: 1,
      graphDefinition: {
        nodes: {},
        edges: [],
        metadata: {
          totalNodes: 0,
          completedNodes: 0,
          failedNodes: 0,
          executionOrder: [],
          criticalPath: [],
          estimatedDuration: 0
        }
      },
      requirements: requirements,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      executionStats: {
        startTime: null,
        endTime: null,
        totalDuration: 0,
        taskCompletionTimes: {},
        dependencyWaitTimes: {}
      }
    };
    
    // Process nodes
    if (taskGraph.nodes) {
      for (const [nodeId, node] of Object.entries(taskGraph.nodes)) {
        enhancedGraph.graphDefinition.nodes[nodeId] = await this.enhanceTaskNode(node, projectId);
      }
    }
    
    // Process edges
    if (taskGraph.edges) {
      enhancedGraph.graphDefinition.edges = taskGraph.edges.map(edge => ({
        ...edge,
        id: uuidv4(),
        createdAt: new Date().toISOString()
      }));
    }
    
    // Calculate metadata
    enhancedGraph.graphDefinition.metadata = await this.calculateGraphMetadata(enhancedGraph);
    
    return enhancedGraph;
  }
  
  async enhanceTaskNode(node, projectId) {
    const enhancedNode = {
      ...node,
      id: node.id || uuidv4(),
      projectId: projectId,
      status: node.status || 'pending',
      createdAt: node.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      
      // Execution tracking
      executionHistory: [],
      currentExecution: null,
      
      // Timing information
      estimatedDuration: node.estimatedDuration || this.estimateTaskDuration(node),
      actualDuration: null,
      startedAt: null,
      completedAt: null,
      
      // Quality tracking
      qualityScore: null,
      qualityHistory: [],
      
      // Dependency tracking
      dependencyStatus: 'pending', // pending, satisfied, failed
      dependencyCheckTime: null,
      
      // Retry and error handling
      retryCount: 0,
      maxRetries: node.maxRetries || 3,
      lastError: null,
      
      // Agent assignment
      assignedAgent: null,
      agentInstanceId: null,
      
      // Performance metrics
      performanceMetrics: null
    };
    
    // Validate and enhance dependencies
    if (node.dependencies && node.dependencies.length > 0) {
      enhancedNode.dependencies = node.dependencies.map(dep => ({
        ...dep,
        id: uuidv4(),
        status: 'pending', // pending, satisfied, failed
        lastChecked: null,
        checkCount: 0
      }));
    } else {
      enhancedNode.dependencies = [];
    }
    
    return enhancedNode;
  }
  
  estimateTaskDuration(node) {
    // Simple heuristic for task duration estimation
    const baseDuration = 10; // 10 minutes base
    const complexityMultipliers = {
      'setup': 1.0,
      'frontend': 1.5,
      'backend': 2.0,
      'database': 1.8,
      'testing': 1.2,
      'deployment': 1.3,
      'quality': 0.8
    };
    
    const multiplier = complexityMultipliers[node.type] || 1.0;
    return Math.round(baseDuration * multiplier);
  }
  
  async calculateGraphMetadata(graph) {
    const nodes = Object.values(graph.graphDefinition.nodes);
    
    const metadata = {
      totalNodes: nodes.length,
      completedNodes: nodes.filter(n => n.status === 'completed').length,
      failedNodes: nodes.filter(n => n.status === 'failed').length,
      pendingNodes: nodes.filter(n => n.status === 'pending').length,
      runningNodes: nodes.filter(n => n.status === 'running').length,
      readyNodes: nodes.filter(n => n.status === 'ready').length,
      
      // Calculate estimated duration
      estimatedDuration: nodes.reduce((sum, node) => sum + (node.estimatedDuration || 0), 0),
      
      // Calculate critical path (simplified)
      criticalPath: await this.calculateCriticalPath(graph),
      
      // Execution order based on dependencies
      executionOrder: await this.calculateExecutionOrder(graph),
      
      // Dependency complexity
      averageDependencies: nodes.reduce((sum, node) => sum + (node.dependencies?.length || 0), 0) / nodes.length,
      maxDependencies: Math.max(...nodes.map(node => node.dependencies?.length || 0)),
      
      // Updated timestamp
      lastCalculated: new Date().toISOString()
    };
    
    return metadata;
  }
  
  async calculateCriticalPath(graph) {
    // Simplified critical path calculation
    // In a full implementation, this would use proper CPM algorithm
    const nodes = graph.graphDefinition.nodes;
    const path = [];
    
    // Find nodes with no dependencies (start nodes)
    const startNodes = Object.values(nodes).filter(node => 
      !node.dependencies || node.dependencies.length === 0
    );
    
    // Find longest path from start to end
    for (const startNode of startNodes) {
      const nodePath = await this.findLongestPath(startNode, nodes, []);
      if (nodePath.length > path.length) {
        path.splice(0, path.length, ...nodePath);
      }
    }
    
    return path;
  }
  
  async findLongestPath(currentNode, allNodes, visited) {
    if (visited.includes(currentNode.id)) {
      return []; // Avoid cycles
    }
    
    const newVisited = [...visited, currentNode.id];
    let longestPath = [currentNode.id];
    
    // Find all nodes that depend on this node
    const dependentNodes = Object.values(allNodes).filter(node =>
      node.dependencies?.some(dep => dep.nodeId === currentNode.id)
    );
    
    for (const depNode of dependentNodes) {
      const path = await this.findLongestPath(depNode, allNodes, newVisited);
      if (path.length + 1 > longestPath.length) {
        longestPath = [currentNode.id, ...path];
      }
    }
    
    return longestPath;
  }
  
  async calculateExecutionOrder(graph) {
    // Topological sort for execution order
    const nodes = graph.graphDefinition.nodes;
    const order = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (nodeId) => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node: ${nodeId}`);
      }
      
      if (visited.has(nodeId)) {
        return;
      }
      
      visiting.add(nodeId);
      
      const node = nodes[nodeId];
      if (node.dependencies) {
        for (const dep of node.dependencies) {
          visit(dep.nodeId);
        }
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
    };
    
    // Visit all nodes
    for (const nodeId of Object.keys(nodes)) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }
    
    return order;
  }
  
  // ==================== TASK EXECUTION FLOW ====================
  
  async handleTaskStarted(event) {
    const { taskId, agentId, agentInstanceId, projectId } = event.data;
    
    console.log(`▶️ Task started: ${taskId} by ${agentId}`);
    
    try {
      // Update task status
      await this.updateTaskStatus(projectId, taskId, 'running', {
        startedAt: new Date().toISOString(),
        assignedAgent: agentId,
        agentInstanceId: agentInstanceId
      });
      
      // Track active execution
      this.activeExecutions.set(taskId, {
        projectId,
        agentId,
        agentInstanceId,
        startTime: Date.now(),
        lastProgress: Date.now()
      });
      
      // Set execution timeout
      const timeout = setTimeout(async () => {
        console.warn(`⏰ Task timeout: ${taskId}`);
        await this.handleTaskTimeout(projectId, taskId);
      }, this.config.dependencyTimeout);
      
      this.taskTimeouts.set(taskId, timeout);
      
      // Update statistics
      this.flowStats.tasksExecuted++;
      
    } catch (error) {
      console.error(`❌ Error handling task start for ${taskId}:`, error);
      await this.handleError('task_start', error, { taskId, agentId, projectId });
    }
  }
  
  async handleTaskCompleted(event) {
    const { taskId, agentId, projectId, result, qualityScore, performanceMetrics } = event.data;
    
    console.log(`✅ Task completed: ${taskId} (quality: ${qualityScore})`);
    
    try {
      // Clear timeout
      if (this.taskTimeouts.has(taskId)) {
        clearTimeout(this.taskTimeouts.get(taskId));
        this.taskTimeouts.delete(taskId);
      }
      
      // Calculate execution time
      const execution = this.activeExecutions.get(taskId);
      const executionTime = execution ? Date.now() - execution.startTime : 0;
      
      // Update task status
      await this.updateTaskStatus(projectId, taskId, 'completed', {
        completedAt: new Date().toISOString(),
        result: result,
        qualityScore: qualityScore,
        performanceMetrics: performanceMetrics,
        actualDuration: Math.round(executionTime / 1000 / 60) // minutes
      });
      
      // Remove from active executions
      this.activeExecutions.delete(taskId);
      
      // Update statistics
      this.flowStats.tasksCompleted++;
      this.updateAverageExecutionTime(executionTime);
      
      // Check for newly ready tasks
      const readyTasks = await this.checkDependentTasks(projectId, taskId);
      
      if (readyTasks.length > 0) {
        console.log(`🚀 Found ${readyTasks.length} newly ready tasks`);
        await this.publishEvent('tasks.ready', {
          projectId: projectId,
          readyTasks: readyTasks
        });
      }
      
      // Check if project is complete
      await this.checkProjectCompletion(projectId);
      
    } catch (error) {
      console.error(`❌ Error handling task completion for ${taskId}:`, error);
      await this.handleError('task_completion', error, { taskId, agentId, projectId });
    }
  }
  
  async handleTaskFailed(event) {
    const { taskId, agentId, projectId, error, retryable } = event.data;
    
    console.log(`❌ Task failed: ${taskId} - ${error}`);
    
    try {
      const graph = await this.loadTaskGraph(projectId);
      const task = graph.graphDefinition.nodes[taskId];
      
      if (!task) {
        throw new Error(`Task ${taskId} not found in graph`);
      }
      
      task.retryCount = (task.retryCount || 0) + 1;
      task.lastError = {
        message: error,
        timestamp: new Date().toISOString(),
        agentId: agentId
      };
      
      // Determine if we should retry
      if (retryable && task.retryCount < task.maxRetries) {
        console.log(`🔄 Retrying task ${taskId} (attempt ${task.retryCount + 1}/${task.maxRetries})`);
        
        // Reset task to ready for retry
        await this.updateTaskStatus(projectId, taskId, 'ready', {
          updatedAt: new Date().toISOString(),
          retryCount: task.retryCount,
          lastError: task.lastError
        });
        
        // Publish retry event
        await this.publishEvent('task.retry', {
          projectId: projectId,
          taskId: taskId,
          retryCount: task.retryCount,
          error: error
        });
        
      } else {
        // Mark as permanently failed
        await this.updateTaskStatus(projectId, taskId, 'failed', {
          completedAt: new Date().toISOString(),
          lastError: task.lastError,
          finalFailure: true
        });
        
        // Update statistics
        this.flowStats.tasksFailed++;
        
        // Check if this failure blocks the entire project
        await this.checkProjectFailure(projectId, taskId);
      }
      
      // Remove from active executions
      this.activeExecutions.delete(taskId);
      
      // Clear timeout
      if (this.taskTimeouts.has(taskId)) {
        clearTimeout(this.taskTimeouts.get(taskId));
        this.taskTimeouts.delete(taskId);
      }
      
    } catch (error) {
      console.error(`❌ Error handling task failure for ${taskId}:`, error);
      await this.handleError('task_failure', error, { taskId, agentId, projectId });
    }
  }
  
  async handleTaskTimeout(projectId, taskId) {
    console.warn(`⏰ Task timeout: ${taskId}`);
    
    await this.publishEvent('task.timeout', {
      projectId: projectId,
      taskId: taskId,
      timestamp: new Date().toISOString()
    });
    
    // Treat timeout as failure
    await this.handleTaskFailed({
      data: {
        taskId: taskId,
        agentId: 'system',
        projectId: projectId,
        error: 'Task execution timeout',
        retryable: true
      }
    });
  }
  
  // ==================== DEPENDENCY MANAGEMENT ====================
  
  async checkDependentTasks(projectId, completedTaskId) {
    const graph = await this.loadTaskGraph(projectId);
    const readyTasks = [];
    
    // Find all tasks that depend on the completed task
    for (const [taskId, task] of Object.entries(graph.graphDefinition.nodes)) {
      if (task.status === 'pending' && task.dependencies) {
        let allDependenciesMet = true;
        
        for (const dependency of task.dependencies) {
          if (!await this.isDependencySatisfied(dependency, graph)) {
            allDependenciesMet = false;
            break;
          }
        }
        
        if (allDependenciesMet) {
          // Mark task as ready
          await this.updateTaskStatus(projectId, taskId, 'ready', {
            dependencyStatus: 'satisfied',
            dependencyCheckTime: new Date().toISOString()
          });
          
          readyTasks.push(task);
        }
      }
    }
    
    return readyTasks;
  }
  
  async isDependencySatisfied(dependency, graph) {
    const dependentTask = graph.graphDefinition.nodes[dependency.nodeId];
    
    if (!dependentTask) {
      console.warn(`⚠️ Dependency task not found: ${dependency.nodeId}`);
      return false;
    }
    
    // Check basic completion status
    if (dependentTask.status !== 'completed') {
      return false;
    }
    
    // Check additional conditions if specified
    if (dependency.condition) {
      // Quality condition
      if (dependency.condition.quality) {
        const qualityScore = dependentTask.qualityScore || 0;
        if (!this.meetsQualityCondition(qualityScore, dependency.condition.quality)) {
          return false;
        }
      }
      
      // Custom condition evaluation
      if (dependency.condition.custom) {
        if (!await this.evaluateCustomCondition(dependency.condition.custom, dependentTask)) {
          return false;
        }
      }
      
      // Time-based conditions
      if (dependency.condition.minDuration) {
        const actualDuration = dependentTask.actualDuration || 0;
        if (actualDuration < dependency.condition.minDuration) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  meetsQualityCondition(score, condition) {
    // Parse conditions like ">= 0.7", "< 0.5", "== 0.9"
    const match = condition.match(/([><=]+)\s*([0-9.]+)/);
    if (!match) return false;
    
    const operator = match[1];
    const threshold = parseFloat(match[2]);
    
    switch (operator) {
      case '>=': return score >= threshold;
      case '<=': return score <= threshold;
      case '>': return score > threshold;
      case '<': return score < threshold;
      case '==': return score === threshold;
      default: return false;
    }
  }
  
  async evaluateCustomCondition(condition, task) {
    // Placeholder for custom condition evaluation
    // In a full implementation, this would support a DSL or scripting
    console.log(`📋 Evaluating custom condition for task ${task.id}`);
    return true; // Default to true for now
  }
  
  // ==================== UTILITY METHODS ====================
  
  async updateTaskStatus(projectId, taskId, status, updates = {}) {
    const graph = await this.loadTaskGraph(projectId);
    const task = graph.graphDefinition.nodes[taskId];
    
    if (!task) {
      throw new Error(`Task ${taskId} not found in project ${projectId}`);
    }
    
    // Update task properties
    Object.assign(task, updates, {
      status: status,
      updatedAt: new Date().toISOString()
    });
    
    // Add to execution history
    if (!task.executionHistory) {
      task.executionHistory = [];
    }
    
    task.executionHistory.push({
      status: status,
      timestamp: new Date().toISOString(),
      updates: updates
    });
    
    // Update graph metadata
    graph.graphDefinition.metadata = await this.calculateGraphMetadata(graph);
    graph.lastUpdated = new Date().toISOString();
    
    // Save updated graph
    await this.storage.saveTaskGraph(projectId, graph);
    
    // Update cache
    this.graphCache.set(projectId, graph);
    
    // Publish status update event
    await this.publishEvent('task.status.updated', {
      projectId: projectId,
      taskId: taskId,
      status: status,
      updates: updates
    });
  }
  
  async loadTaskGraph(projectId) {
    // Check cache first
    if (this.graphCache.has(projectId)) {
      const cached = this.graphCache.get(projectId);
      // Check if cache is still valid
      const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
      if (cacheAge < this.cacheTimeout) {
        return cached;
      }
    }
    
    // Load from storage
    const graph = await this.storage.loadTaskGraph(projectId);
    if (graph) {
      this.graphCache.set(projectId, graph);
    }
    
    return graph;
  }
  
  async findReadyTasks(projectId) {
    return await this.storage.findReadyTasks(projectId);
  }
  
  updateAverageExecutionTime(executionTime) {
    const currentAvg = this.flowStats.averageExecutionTime;
    const completedTasks = this.flowStats.tasksCompleted;
    
    this.flowStats.averageExecutionTime = 
      ((currentAvg * (completedTasks - 1)) + executionTime) / completedTasks;
  }
  
  async checkProjectCompletion(projectId) {
    const graph = await this.loadTaskGraph(projectId);
    const nodes = Object.values(graph.graphDefinition.nodes);
    
    const completedTasks = nodes.filter(n => n.status === 'completed').length;
    const failedTasks = nodes.filter(n => n.status === 'failed').length;
    const totalTasks = nodes.length;
    
    if (completedTasks === totalTasks) {
      console.log(`🎉 Project ${projectId} completed successfully!`);
      await this.publishEvent('project.completed', {
        projectId: projectId,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        completedAt: new Date().toISOString()
      });
    } else if (completedTasks + failedTasks === totalTasks && failedTasks > 0) {
      console.log(`❌ Project ${projectId} completed with ${failedTasks} failed tasks`);
      await this.publishEvent('project.completed.with.failures', {
        projectId: projectId,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        failedTasks: failedTasks,
        completedAt: new Date().toISOString()
      });
    }
  }
  
  async checkProjectFailure(projectId, failedTaskId) {
    const graph = await this.loadTaskGraph(projectId);
    
    // Check if the failed task is on the critical path
    const criticalPath = graph.graphDefinition.metadata.criticalPath;
    if (criticalPath.includes(failedTaskId)) {
      console.log(`💥 Critical task failed: ${failedTaskId} - project may be blocked`);
      await this.publishEvent('project.critical.failure', {
        projectId: projectId,
        failedTaskId: failedTaskId,
        criticalPath: criticalPath
      });
    }
  }
  
  startTaskPolling() {
    const pollTimer = setInterval(async () => {
      try {
        await this.pollActiveTasks();
      } catch (error) {
        console.error('❌ Task polling error:', error);
      }
    }, this.config.pollingInterval);
    
    this.timers.set('task_polling', pollTimer);
    console.log('🔄 Task polling started');
  }
  
  async pollActiveTasks() {
    // Check for stale active executions
    const now = Date.now();
    const staleThreshold = 300000; // 5 minutes
    
    for (const [taskId, execution] of this.activeExecutions) {
      if (now - execution.lastProgress > staleThreshold) {
        console.warn(`⚠️ Stale task execution detected: ${taskId}`);
        await this.handleTaskTimeout(execution.projectId, taskId);
      }
    }
  }
  
  async loadActiveGraphs() {
    // Load all active project graphs at startup
    const projects = await this.storage.loadAllProjects();
    let loadedGraphs = 0;
    
    for (const [projectId, project] of Object.entries(projects)) {
      if (project.status === 'active') {
        try {
          const graph = await this.storage.loadTaskGraph(projectId);
          if (graph && graph.isActive) {
            this.graphCache.set(projectId, graph);
            loadedGraphs++;
          }
        } catch (error) {
          console.error(`❌ Failed to load graph for project ${projectId}:`, error);
        }
      }
    }
    
    console.log(`📚 Loaded ${loadedGraphs} active task graphs`);
  }
  
  // ==================== STATUS AND METRICS ====================
  
  async getHealthStatus() {
    const baseHealth = await super.getHealthStatus();
    
    return {
      ...baseHealth,
      taskGraph: {
        activeGraphs: this.graphCache.size,
        activeExecutions: this.activeExecutions.size,
        taskTimeouts: this.taskTimeouts.size,
        flowStats: this.flowStats
      }
    };
  }
  
  getFlowStatistics() {
    return {
      ...this.flowStats,
      activeExecutions: this.activeExecutions.size,
      cachedGraphs: this.graphCache.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TaskGraphService;