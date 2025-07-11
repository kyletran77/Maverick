const { v4: uuidv4 } = require('uuid');

/**
 * Agent Manager - Handles individual agent kanban boards and workload management
 * Inspired by LangGraph's node-based agent system with enhanced state management
 */
class AgentManager {
  constructor(io, gooseIntegration) {
    this.io = io;
    this.gooseIntegration = gooseIntegration;
    this.agents = new Map();
    this.agentWorkloads = new Map();
    this.agentSessions = new Map();
    this.eventHandlers = new Map();
    this.taskRetryCount = new Map();
    
    // Agent performance tracking
    this.agentMetrics = new Map();
    this.agentHistory = new Map();
    
    // Initialize event handlers
    this.initializeEventHandlers();
    
    // Initialize retry policies
    this.retryPolicy = {
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      backoffMultiplier: 2
    };
  }

  /**
   * Initialize event handlers for agent communication
   */
  initializeEventHandlers() {
    this.eventHandlers.set('task_assigned', this.handleTaskAssigned.bind(this));
    this.eventHandlers.set('task_started', this.handleTaskStarted.bind(this));
    this.eventHandlers.set('task_completed', this.handleTaskCompleted.bind(this));
    this.eventHandlers.set('task_failed', this.handleTaskFailed.bind(this));
    this.eventHandlers.set('task_moved', this.handleTaskMoved.bind(this));
    this.eventHandlers.set('agent_status_update', this.handleAgentStatusUpdate.bind(this));
    this.eventHandlers.set('workload_update', this.handleWorkloadUpdate.bind(this));
  }

  /**
   * Create and register a new agent with enhanced capabilities
   */
  createAgent(agentType, projectId, capabilities = []) {
    const agentId = uuidv4();
    
    const agent = {
      id: agentId,
      type: agentType.id,
      name: agentType.name,
      capabilities: capabilities.length > 0 ? capabilities : agentType.capabilities,
      specialization: agentType.specialization,
      projectId: projectId,
      status: 'idle',
      currentTasks: [],
      completedTasks: [],
      failedTasks: [],
      kanban: {
        todo: [],
        inProgress: [],
        review: [],
        completed: [],
        blocked: []
      },
      metrics: {
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksBlocked: 0,
        averageTaskTime: 0,
        successRate: 100,
        workloadScore: 0,
        efficiency: agentType.efficiency || {},
        totalWorkingTime: 0,
        lastCompletionTime: null
      },
      preferences: {
        maxConcurrentTasks: agentType.maxConcurrentTasks || 3,
        preferredTaskTypes: agentType.capabilities,
        workingHours: { start: 9, end: 17 },
        qualityThreshold: 0.8
      },
      health: {
        status: 'healthy',
        lastHeartbeat: new Date(),
        errorCount: 0,
        warningCount: 0
      },
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    this.agents.set(agentId, agent);
    this.agentWorkloads.set(agentId, 0);
    this.agentMetrics.set(agentId, {
      totalTasksAssigned: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
      totalTasksRetried: 0,
      averageCompletionTime: 0,
      skillEfficiency: new Map(),
      performanceHistory: []
    });
    this.agentHistory.set(agentId, []);
    
    return agent;
  }

  /**
   * Assign a task to an agent with enhanced validation
   */
  async assignTaskToAgent(agentId, task, priority = 'medium') {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // Check if agent can handle more tasks
    if (agent.currentTasks.length >= agent.preferences.maxConcurrentTasks) {
      throw new Error(`Agent ${agentId} is at maximum capacity (${agent.preferences.maxConcurrentTasks} tasks)`);
    }
    
    // Check agent health
    if (agent.health.status === 'unhealthy') {
      throw new Error(`Agent ${agentId} is unhealthy and cannot accept new tasks`);
    }
    
    // Create enhanced task with agent-specific data
    const enhancedTask = {
      ...task,
      id: task.id || uuidv4(),
      assignedAgent: agentId,
      assignedAt: new Date(),
      priority: priority,
      status: 'assigned',
      kanbanColumn: 'todo',
      agentSpecificData: {
        estimatedEffort: this.estimateTaskEffort(task, agent),
        skillMatch: this.calculateSkillMatch(task, agent),
        dependencies: task.dependencies || [],
        deliverables: task.deliverables || [],
        qualityChecks: this.generateQualityChecks(task),
        retryCount: 0,
        maxRetries: this.retryPolicy.maxRetries
      },
      timeline: {
        assignedAt: new Date(),
        startedAt: null,
        completedAt: null,
        estimatedCompletion: this.calculateEstimatedCompletion(task, agent)
      }
    };
    
    // Add to agent's kanban todo column
    agent.kanban.todo.push(enhancedTask);
    agent.currentTasks.push(enhancedTask);
    
    // Update workload and metrics
    this.updateAgentWorkload(agentId);
    const metrics = this.agentMetrics.get(agentId);
    metrics.totalTasksAssigned++;
    
    // Record assignment in history
    this.recordAgentActivity(agentId, 'task_assigned', {
      taskId: enhancedTask.id,
      taskTitle: enhancedTask.title,
      skillMatch: enhancedTask.agentSpecificData.skillMatch
    });
    
    // Emit event
    this.emitEvent('task_assigned', {
      agentId: agentId,
      task: enhancedTask,
      agent: agent,
      workload: this.agentWorkloads.get(agentId)
    });
    
    return enhancedTask;
  }

  /**
   * Start a task execution with enhanced monitoring
   */
  async startTask(agentId, taskId, socket) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // Find task in todo column
    const taskIndex = agent.kanban.todo.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found in agent's todo list`);
    }
    
    // Move task from todo to inProgress
    const task = agent.kanban.todo.splice(taskIndex, 1)[0];
    task.status = 'in_progress';
    task.kanbanColumn = 'inProgress';
    task.timeline.startedAt = new Date();
    agent.kanban.inProgress.push(task);
    
    // Update agent status
    agent.status = 'working';
    agent.lastActivity = new Date();
    agent.metrics.tasksInProgress++;
    
    // Create Goose session for this task
    const sessionId = `${agentId}-${taskId}`;
    const taskPrompt = this.createTaskPrompt(task, agent);
    
    try {
      // Start Goose CLI execution
      this.agentSessions.set(sessionId, {
        agentId: agentId,
        taskId: taskId,
        startTime: new Date(),
        status: 'running',
        prompt: taskPrompt
      });
      
      // Record task start in history
      this.recordAgentActivity(agentId, 'task_started', {
        taskId: taskId,
        taskTitle: task.title,
        sessionId: sessionId
      });
      
      // Execute with Goose CLI
      await this.gooseIntegration.executeGooseTask(
        taskPrompt,
        sessionId,
        socket,
        task.projectPath || process.cwd()
      );
      
      // Emit event
      this.emitEvent('task_started', {
        agentId: agentId,
        taskId: taskId,
        task: task,
        sessionId: sessionId,
        kanbanUpdate: {
          from: 'todo',
          to: 'inProgress'
        }
      });
      
      return { success: true, sessionId: sessionId };
      
    } catch (error) {
      // Handle failure
      await this.handleTaskFailure(agentId, taskId, error.message);
      throw error;
    }
  }

  /**
   * Complete a task with quality validation
   */
  async completeTask(agentId, taskId, result = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    // Find task in inProgress column
    const taskIndex = agent.kanban.inProgress.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found in agent's inProgress list`);
    }
    
    const task = agent.kanban.inProgress.splice(taskIndex, 1)[0];
    
    // Validate quality if quality checks are defined
    const qualityScore = await this.validateTaskQuality(task, result);
    
    if (qualityScore >= agent.preferences.qualityThreshold) {
      // Task passes quality checks - mark as completed
      task.status = 'completed';
      task.kanbanColumn = 'completed';
      task.timeline.completedAt = new Date();
      task.result = result;
      task.qualityScore = qualityScore;
      
      agent.kanban.completed.push(task);
      agent.completedTasks.push(task);
      
      // Update metrics
      agent.metrics.tasksCompleted++;
      agent.metrics.tasksInProgress--;
      agent.metrics.lastCompletionTime = new Date();
      
      // Calculate task completion time
      const completionTime = task.timeline.completedAt - task.timeline.startedAt;
      agent.metrics.totalWorkingTime += completionTime;
      
      // Update success rate
      const totalTasks = agent.metrics.tasksCompleted + agent.failedTasks.length;
      agent.metrics.successRate = Math.round((agent.metrics.tasksCompleted / totalTasks) * 100);
      
      // Record completion in history
      this.recordAgentActivity(agentId, 'task_completed', {
        taskId: taskId,
        taskTitle: task.title,
        completionTime: completionTime,
        qualityScore: qualityScore
      });
      
      // Emit completion event
      this.emitEvent('task_completed', {
        agentId: agentId,
        taskId: taskId,
        task: task,
        qualityScore: qualityScore,
        kanbanUpdate: {
          from: 'inProgress',
          to: 'completed'
        }
      });
      
    } else {
      // Task fails quality checks - move to review
      task.status = 'review';
      task.kanbanColumn = 'review';
      task.qualityScore = qualityScore;
      task.reviewNotes = `Quality score ${qualityScore} below threshold ${agent.preferences.qualityThreshold}`;
      
      agent.kanban.review.push(task);
      agent.metrics.tasksInProgress--;
      
      // Emit review event
      this.emitEvent('task_moved', {
        agentId: agentId,
        taskId: taskId,
        task: task,
        kanbanUpdate: {
          from: 'inProgress',
          to: 'review'
        },
        reason: 'quality_check_failed'
      });
    }
    
    // Update agent status
    if (agent.kanban.inProgress.length === 0) {
      agent.status = 'idle';
    }
    
    // Update workload
    this.updateAgentWorkload(agentId);
    
    return task;
  }

  /**
   * Handle task failure with retry logic
   */
  async handleTaskFailure(agentId, taskId, errorMessage) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    // Find task in inProgress column
    const taskIndex = agent.kanban.inProgress.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const task = agent.kanban.inProgress.splice(taskIndex, 1)[0];
    
    // Increment retry count
    const retryKey = `${agentId}-${taskId}`;
    const currentRetries = this.taskRetryCount.get(retryKey) || 0;
    this.taskRetryCount.set(retryKey, currentRetries + 1);
    
    if (currentRetries < this.retryPolicy.maxRetries) {
      // Retry the task
      task.status = 'retry';
      task.kanbanColumn = 'todo';
      task.agentSpecificData.retryCount = currentRetries + 1;
      task.errorHistory = task.errorHistory || [];
      task.errorHistory.push({
        attempt: currentRetries + 1,
        error: errorMessage,
        timestamp: new Date()
      });
      
      // Move back to todo with delay
      setTimeout(() => {
        agent.kanban.todo.unshift(task); // Add to front of queue
        
        this.emitEvent('task_retry', {
          agentId: agentId,
          taskId: taskId,
          task: task,
          retryCount: currentRetries + 1,
          kanbanUpdate: {
            from: 'inProgress',
            to: 'todo'
          }
        });
      }, this.retryPolicy.retryDelay * Math.pow(this.retryPolicy.backoffMultiplier, currentRetries));
      
    } else {
      // Max retries reached - move to blocked
      task.status = 'blocked';
      task.kanbanColumn = 'blocked';
      task.errorMessage = errorMessage;
      task.blockedAt = new Date();
      
      agent.kanban.blocked.push(task);
      agent.failedTasks.push(task);
      agent.metrics.tasksBlocked++;
      
      // Update health status
      agent.health.errorCount++;
      if (agent.health.errorCount > 3) {
        agent.health.status = 'unhealthy';
      }
      
      // Record failure in history
      this.recordAgentActivity(agentId, 'task_failed', {
        taskId: taskId,
        taskTitle: task.title,
        errorMessage: errorMessage,
        retryCount: currentRetries
      });
      
      // Emit failure event
      this.emitEvent('task_failed', {
        agentId: agentId,
        taskId: taskId,
        task: task,
        errorMessage: errorMessage,
        kanbanUpdate: {
          from: 'inProgress',
          to: 'blocked'
        }
      });
    }
    
    // Update agent status
    agent.metrics.tasksInProgress--;
    if (agent.kanban.inProgress.length === 0) {
      agent.status = 'idle';
    }
    
    // Update workload
    this.updateAgentWorkload(agentId);
  }

  /**
   * Move task between kanban columns
   */
  moveTaskInKanban(agentId, taskId, fromColumn, toColumn) {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    
    // Find task in source column
    const taskIndex = agent.kanban[fromColumn].findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;
    
    // Move task
    const task = agent.kanban[fromColumn].splice(taskIndex, 1)[0];
    task.kanbanColumn = toColumn;
    task.status = toColumn === 'inProgress' ? 'in_progress' : toColumn;
    agent.kanban[toColumn].push(task);
    
    // Update timestamps
    if (toColumn === 'inProgress') {
      task.timeline.startedAt = new Date();
    } else if (toColumn === 'completed') {
      task.timeline.completedAt = new Date();
    }
    
    // Emit event
    this.emitEvent('task_moved', {
      agentId: agentId,
      taskId: taskId,
      task: task,
      kanbanUpdate: {
        from: fromColumn,
        to: toColumn
      }
    });
    
    return true;
  }

  /**
   * Get agent's kanban board with statistics
   */
  getAgentKanban(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    
    return {
      agentId: agentId,
      name: agent.name,
      type: agent.type,
      specialization: agent.specialization,
      status: agent.status,
      kanban: agent.kanban,
      metrics: agent.metrics,
      workload: this.agentWorkloads.get(agentId),
      health: agent.health,
      statistics: {
        totalTasks: Object.values(agent.kanban).reduce((total, column) => total + column.length, 0),
        completionRate: this.calculateCompletionRate(agentId),
        averageTaskTime: this.calculateAverageTaskTime(agentId),
        currentWorkload: this.calculateCurrentWorkload(agentId)
      }
    };
  }

  /**
   * Get all agent kanban boards
   */
  getAllAgentKanbans() {
    const kanbans = {};
    
    this.agents.forEach((agent, agentId) => {
      kanbans[agentId] = this.getAgentKanban(agentId);
    });
    
    return kanbans;
  }

  /**
   * Update agent workload calculation
   */
  updateAgentWorkload(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    const activeTasks = [
      ...agent.kanban.todo,
      ...agent.kanban.inProgress,
      ...agent.kanban.review
    ];
    
    const totalEffort = activeTasks.reduce((total, task) => {
      return total + (task.agentSpecificData?.estimatedEffort || 1);
    }, 0);
    
    const workload = {
      totalTasks: activeTasks.length,
      totalEffort: totalEffort,
      utilizationRate: Math.min((activeTasks.length / agent.preferences.maxConcurrentTasks) * 100, 100),
      workloadLevel: this.getWorkloadLevel(totalEffort),
      estimatedCompletionTime: this.calculateEstimatedCompletionTime(activeTasks, agent)
    };
    
    this.agentWorkloads.set(agentId, workload);
    agent.metrics.workloadScore = workload.utilizationRate;
    
    return workload;
  }

  /**
   * Calculate estimated completion time for all active tasks
   */
  calculateEstimatedCompletionTime(tasks, agent) {
    const parallelTasks = Math.min(tasks.length, agent.preferences.maxConcurrentTasks);
    if (parallelTasks === 0) return 0;
    
    const totalEffort = tasks.reduce((total, task) => {
      return total + (task.agentSpecificData?.estimatedEffort || 1);
    }, 0);
    
    return Math.ceil(totalEffort / parallelTasks);
  }

  /**
   * Generate quality checks for a task
   */
  generateQualityChecks(task) {
    const checks = [];
    
    // Basic quality checks
    checks.push({
      name: 'completeness',
      description: 'All deliverables are present',
      weight: 0.3
    });
    
    checks.push({
      name: 'functionality',
      description: 'Code runs without errors',
      weight: 0.4
    });
    
    checks.push({
      name: 'standards',
      description: 'Follows coding standards and best practices',
      weight: 0.3
    });
    
    // Task-specific checks
    if (task.type === 'frontend') {
      checks.push({
        name: 'responsiveness',
        description: 'UI is responsive across different screen sizes',
        weight: 0.2
      });
    }
    
    if (task.type === 'backend') {
      checks.push({
        name: 'security',
        description: 'Implements proper security measures',
        weight: 0.2
      });
    }
    
    if (task.type === 'testing') {
      checks.push({
        name: 'coverage',
        description: 'Adequate test coverage',
        weight: 0.3
      });
    }
    
    return checks;
  }

  /**
   * Validate task quality based on defined checks
   */
  async validateTaskQuality(task, result) {
    const checks = task.agentSpecificData?.qualityChecks || [];
    if (checks.length === 0) return 0.8; // Default quality score
    
    // Simulate quality validation (in real implementation, this would analyze the actual output)
    let totalScore = 0;
    let totalWeight = 0;
    
    checks.forEach(check => {
      // Simulate check result (in real implementation, this would perform actual validation)
      const checkScore = Math.random() * 0.4 + 0.6; // Random score between 0.6 and 1.0
      totalScore += checkScore * check.weight;
      totalWeight += check.weight;
    });
    
    return totalWeight > 0 ? totalScore / totalWeight : 0.8;
  }

  /**
   * Create detailed task prompt for Goose CLI
   */
  createTaskPrompt(task, agent) {
    const prompt = `
# Task: ${task.title}

## Description
${task.description}

## Agent Information
- Agent: ${agent.name} (${agent.specialization})
- Skills: ${agent.capabilities.join(', ')}
- Skill Match: ${task.agentSpecificData?.skillMatch || 'N/A'}%

## Requirements
${task.deliverables ? task.deliverables.map(d => `- ${d}`).join('\n') : 'No specific deliverables defined'}

## Quality Criteria
${task.agentSpecificData?.qualityChecks ? 
  task.agentSpecificData.qualityChecks.map(check => `- ${check.name}: ${check.description}`).join('\n') : 
  'Standard quality checks apply'}

## Priority
${task.priority}

## Estimated Effort
${task.agentSpecificData?.estimatedEffort || 'Not specified'} hours

## Dependencies
${task.dependencies && task.dependencies.length > 0 ? 
  'This task depends on: ' + task.dependencies.join(', ') : 
  'No dependencies'}

## Instructions
Please implement this task following best practices for ${agent.specialization}. 
Ensure all deliverables are completed and meet the quality criteria.
If you encounter any issues, document them clearly.

## Project Context
${task.projectPath ? `Project Path: ${task.projectPath}` : 'No project path specified'}
`;
    
    return prompt.trim();
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by project
   */
  getAgentsByProject(projectId) {
    return Array.from(this.agents.values()).filter(agent => agent.projectId === projectId);
  }

  /**
   * Get available agents (not at capacity)
   */
  getAvailableAgents() {
    return Array.from(this.agents.values()).filter(agent => 
      agent.currentTasks.length < agent.preferences.maxConcurrentTasks
    );
  }

  /**
   * Find best agent for a task
   */
  findBestAgentForTask(task, availableAgents = null) {
    const agents = availableAgents || this.getAvailableAgents();
    
    let bestAgent = null;
    let bestScore = 0;
    
    agents.forEach(agent => {
      const skillMatch = this.calculateSkillMatch(task, agent);
      const workloadScore = 1 - (this.agentWorkloads.get(agent.id) || 0);
      const efficiencyScore = this.getAgentEfficiency(agent.id, task.type);
      
      const totalScore = (skillMatch * 0.5) + (workloadScore * 0.3) + (efficiencyScore * 0.2);
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAgent = agent;
      }
    });
    
    return bestAgent;
  }

  /**
   * Get agent efficiency for a specific task type
   */
  getAgentEfficiency(agentId, taskType) {
    const metrics = this.agentMetrics.get(agentId);
    if (!metrics || !metrics.skillEfficiency.has(taskType)) {
      return 0.5; // Default neutral efficiency
    }
    
    const skillData = metrics.skillEfficiency.get(taskType);
    // Higher efficiency = lower average time (inverted)
    return Math.max(0.1, 1 - (skillData.avgTime / 60)); // Normalize to 0-1 range
  }

  /**
   * Emit event to all listeners
   */
  emitEvent(eventType, data) {
    if (this.eventHandlers.has(eventType)) {
      this.eventHandlers.get(eventType)(data);
    }
    
    // Emit to WebSocket clients
    this.io.emit(eventType, data);
  }

  /**
   * Event handlers
   */
  handleTaskAssigned(data) {
    console.log(`Task ${data.task.id} assigned to agent ${data.agentId}`);
  }

  handleTaskStarted(data) {
    console.log(`Agent ${data.agentId} started task ${data.taskId}`);
  }

  handleTaskCompleted(data) {
    console.log(`Agent ${data.agentId} completed task ${data.taskId}`);
  }

  handleTaskFailed(data) {
    console.log(`Agent ${data.agentId} failed task ${data.taskId}: ${data.errorMessage}`);
  }

  handleTaskMoved(data) {
    console.log(`Task ${data.taskId} moved from ${data.kanbanUpdate.from} to ${data.kanbanUpdate.to} by agent ${data.agentId}`);
    if (data.reason) {
      console.log(`Reason: ${data.reason}`);
    }
  }

  handleAgentStatusUpdate(data) {
    console.log(`Agent ${data.agentId} status updated to ${data.status}`);
  }

  handleWorkloadUpdate(data) {
    console.log(`Workload updated for agent ${data.agentId}: ${JSON.stringify(data.workload)}`);
  }

  /**
   * Get comprehensive agent statistics
   */
  getAgentStatistics() {
    const stats = {
      totalAgents: this.agents.size,
      activeAgents: 0,
      idleAgents: 0,
      totalTasksInProgress: 0,
      totalTasksCompleted: 0,
      averageWorkload: 0,
      agentTypes: new Map()
    };
    
    let totalWorkload = 0;
    
    this.agents.forEach(agent => {
      if (agent.status === 'working') {
        stats.activeAgents++;
      } else if (agent.status === 'idle') {
        stats.idleAgents++;
      }
      
      stats.totalTasksInProgress += agent.metrics.tasksInProgress;
      stats.totalTasksCompleted += agent.metrics.tasksCompleted;
      
      const workload = this.agentWorkloads.get(agent.id) || 0;
      totalWorkload += workload;
      
      // Track agent types
      if (!stats.agentTypes.has(agent.type)) {
        stats.agentTypes.set(agent.type, 0);
      }
      stats.agentTypes.set(agent.type, stats.agentTypes.get(agent.type) + 1);
    });
    
    stats.averageWorkload = this.agents.size > 0 ? totalWorkload / this.agents.size : 0;
    
    return stats;
  }

  /**
   * Record agent activity for history
   */
  recordAgentActivity(agentId, eventType, data) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    const activity = {
      timestamp: new Date(),
      eventType: eventType,
      data: data
    };

    this.agentHistory.get(agentId).push(activity);
    // Optionally, you might want to persist this to a database
  }

  /**
   * Calculate completion rate for an agent
   */
  calculateCompletionRate(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return 0;

    const totalTasks = agent.metrics.tasksCompleted + agent.failedTasks.length;
    return totalTasks > 0 ? Math.round((agent.metrics.tasksCompleted / totalTasks) * 100) : 0;
  }

  /**
   * Calculate average task time for an agent
   */
  calculateAverageTaskTime(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return 0;

    const totalTasks = agent.metrics.tasksCompleted + agent.failedTasks.length;
    if (totalTasks === 0) return 0;

    const totalTime = agent.metrics.totalWorkingTime;
    return Math.round(totalTime / totalTasks);
  }

  /**
   * Calculate current workload for an agent
   */
  calculateCurrentWorkload(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return 0;

    const activeTasks = [
      ...agent.kanban.todo,
      ...agent.kanban.inProgress,
      ...agent.kanban.review
    ];

    const totalEffort = activeTasks.reduce((total, task) => {
      return total + (task.agentSpecificData?.estimatedEffort || 1);
    }, 0);

    return Math.round(totalEffort);
  }

  /**
   * Get workload level based on total effort
   */
  getWorkloadLevel(totalEffort) {
    if (totalEffort < 10) return 'low';
    if (totalEffort < 20) return 'medium';
    if (totalEffort < 30) return 'high';
    return 'very_high';
  }

  /**
   * Get all agent states for kanban dashboard
   */
  getAllAgentStates() {
    const states = [];
    
    this.agents.forEach((agent, agentId) => {
      const workload = this.agentWorkloads.get(agentId) || {};
      const state = {
        id: agentId,
        name: agent.name,
        type: agent.type,
        specialization: agent.specialization,
        status: agent.status,
        metrics: agent.metrics,
        workload: workload,
        health: agent.health,
        kanban: agent.kanban,
        statistics: {
          totalTasks: Object.values(agent.kanban).reduce((total, column) => total + column.length, 0),
          completionRate: this.calculateCompletionRate(agentId),
          averageTaskTime: this.calculateAverageTaskTime(agentId),
          currentWorkload: this.calculateCurrentWorkload(agentId)
        }
      };
      states.push(state);
    });
    
    return states;
  }

  /**
   * Calculate skill match between task and agent
   */
  calculateSkillMatch(task, agent) {
    const taskSkills = task.skills || [];
    const agentSkills = agent.capabilities || [];
    
    if (taskSkills.length === 0) return 0.5;
    
    const matchingSkills = taskSkills.filter(skill => agentSkills.includes(skill));
    return matchingSkills.length / taskSkills.length;
  }
}

module.exports = AgentManager; 