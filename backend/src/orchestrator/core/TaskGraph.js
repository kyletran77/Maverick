const { v4: uuidv4 } = require('uuid');

/**
 * Enhanced Task Graph with Integration Intelligence
 * 
 * Core features:
 * - Dependency management with rich context
 * - Integration contract validation
 * - Critical path optimization
 * - Data flow analysis
 * - Smart task prioritization
 */
class TaskGraph {
  constructor() {
    this.nodes = new Map();           // taskId -> task with context
    this.edges = new Map();           // taskId -> Set of dependencies
    this.reverseEdges = new Map();    // taskId -> Set of dependents
    this.integrationPoints = new Map(); // taskId -> contracts
    this.criticalPath = new Set();    // Tasks on critical path
    this.readyTasks = new Set();      // Currently ready tasks
  }

  /**
   * Build graph with integration awareness
   */
  async buildGraph(blueprint, tasks) {
    console.log(`🔗 Building task graph with ${tasks.length} tasks`);
    
    // Clear existing data
    this.clear();
    
    // Step 1: Create nodes with rich context
    for (const task of tasks) {
      this.addNode(task);
    }

    // Step 2: Build explicit dependencies
    this.buildExplicitDependencies(tasks);
    
    // Step 3: Infer data flow dependencies
    this.inferDataDependencies(tasks);
    
    // Step 4: Infer integration dependencies
    this.inferIntegrationDependencies(tasks);
    
    // Step 5: Validate and optimize
    this.validateGraph();
    this.calculateCriticalPath();
    this.updateReadyTasks();
    
    console.log(`✅ Task graph built with ${this.nodes.size} nodes and ${this.criticalPath.size} critical path tasks`);
  }

  /**
   * Add a task node with rich context
   */
  addNode(task) {
    const nodeId = task.id || uuidv4();
    
    const node = {
      id: nodeId,
      ...task,
      status: 'pending',
      
      // Rich context for perfect integration
      context: {
        inputs: task.requiredInputs || [],      // What this task needs
        outputs: task.providedOutputs || [],    // What this task produces
        contracts: task.integrationContracts || {}, // How it connects
        validation: task.validationCriteria || []   // How to verify
      },
      
      // Domain-specific metadata
      domain: {
        type: task.domain?.type || 'general',
        compliance: task.complianceRequirements || [],
        businessRules: task.businessLogic || []
      },
      
      // Execution metadata
      assignedTo: null,
      startedAt: null,
      completedAt: null,
      result: null,
      qualityScore: null
    };
    
    this.nodes.set(nodeId, node);
    this.edges.set(nodeId, new Set());
    this.reverseEdges.set(nodeId, new Set());
    
    return nodeId;
  }

  /**
   * Build explicit dependencies from task definitions
   */
  buildExplicitDependencies(tasks) {
    for (const task of tasks) {
      const taskId = task.id;
      const dependencies = task.dependencies || [];
      
      for (const dep of dependencies) {
        const depId = typeof dep === 'string' ? dep : dep.taskId;
        const depType = typeof dep === 'object' ? dep.type : 'completion';
        
        this.addDependency(taskId, depId, depType);
      }
    }
  }

  /**
   * Infer dependencies from data flow
   */
  inferDataDependencies(tasks) {
    for (const task of tasks) {
      const taskNode = this.nodes.get(task.id);
      if (!taskNode) continue;
      
      for (const input of taskNode.context.inputs) {
        // Find tasks that produce this input
        const producers = this.findTasksProducing(input, tasks);
        
        for (const producer of producers) {
          if (producer.id !== task.id) {
            this.addDependency(task.id, producer.id, 'data');
          }
        }
      }
    }
  }

  /**
   * Ensure integration points are properly ordered
   */
  inferIntegrationDependencies(tasks) {
    for (const task of tasks) {
      const taskNode = this.nodes.get(task.id);
      if (!taskNode) continue;
      
      const contracts = taskNode.context.contracts;
      
      // Example: Frontend component needs API endpoint ready
      if (contracts.consumesAPI) {
        const apiProvider = tasks.find(t => 
          t.context?.contracts?.providesAPI === contracts.consumesAPI
        );
        
        if (apiProvider && apiProvider.id !== task.id) {
          this.addDependency(task.id, apiProvider.id, 'integration');
        }
      }
      
      // Database schema dependencies
      if (contracts.requiresSchema) {
        const schemaProvider = tasks.find(t =>
          t.context?.contracts?.definesSchema === contracts.requiresSchema
        );
        
        if (schemaProvider && schemaProvider.id !== task.id) {
          this.addDependency(task.id, schemaProvider.id, 'schema');
        }
      }
    }
  }

  /**
   * Add a dependency relationship
   */
  addDependency(taskId, dependencyId, type = 'completion') {
    if (!this.nodes.has(taskId) || !this.nodes.has(dependencyId)) {
      console.warn(`Cannot add dependency: task ${taskId} or ${dependencyId} not found`);
      return;
    }
    
    // Add forward edge
    this.edges.get(taskId).add({ taskId: dependencyId, type });
    
    // Add reverse edge
    this.reverseEdges.get(dependencyId).add({ taskId, type });
    
    console.log(`📎 Added ${type} dependency: ${taskId} depends on ${dependencyId}`);
  }

  /**
   * Get tasks ready for execution with context
   */
  getReadyTasks() {
    const ready = [];
    
    for (const [taskId, task] of this.nodes) {
      if (task.status !== 'pending') continue;
      
      const dependencies = this.edges.get(taskId) || new Set();
      const allDepsComplete = this.areDependenciesSatisfied(taskId);
      
      if (allDepsComplete) {
        ready.push({
          ...task,
          // Include context for specialist
          dependencyOutputs: this.collectDependencyOutputs(taskId),
          criticalPath: this.criticalPath.has(taskId),
          priority: this.calculateTaskPriority(taskId)
        });
      }
    }
    
    return this.prioritizeTasks(ready);
  }

  /**
   * Check if all dependencies are satisfied
   */
  areDependenciesSatisfied(taskId) {
    const dependencies = this.edges.get(taskId) || new Set();
    
    return Array.from(dependencies).every(dep => {
      const depTask = this.nodes.get(dep.taskId);
      if (!depTask) return false;
      
      // Check completion
      if (depTask.status !== 'completed') return false;
      
      // Validate integration contract if needed
      if (dep.type === 'integration' || dep.type === 'data') {
        return this.validateDependencyContract(depTask, this.nodes.get(taskId));
      }
      
      return true;
    });
  }

  /**
   * Validate integration contracts between tasks
   */
  validateDependencyContract(provider, consumer) {
    const providerOutputs = provider.context.outputs;
    const consumerInputs = consumer.context.inputs;
    
    // Ensure the provider's output matches consumer's expected input
    return consumerInputs.every(requirement => 
      providerOutputs.some(provided => 
        this.isCompatibleContract(provided, requirement)
      )
    );
  }

  /**
   * Check if two contracts are compatible
   */
  isCompatibleContract(provided, required) {
    // Simple compatibility check - can be enhanced
    if (typeof provided === 'string' && typeof required === 'string') {
      return provided === required;
    }
    
    if (typeof provided === 'object' && typeof required === 'object') {
      return provided.type === required.type || 
             provided.schema === required.schema ||
             provided.api === required.api;
    }
    
    return false;
  }

  /**
   * Collect outputs from completed dependencies
   */
  collectDependencyOutputs(taskId) {
    const dependencies = this.edges.get(taskId) || new Set();
    const outputs = {};
    
    for (const dep of dependencies) {
      const depTask = this.nodes.get(dep.taskId);
      if (depTask && depTask.status === 'completed' && depTask.result) {
        outputs[dep.taskId] = {
          type: dep.type,
          result: depTask.result,
          outputs: depTask.context.outputs
        };
      }
    }
    
    return outputs;
  }

  /**
   * Smart task prioritization
   */
  prioritizeTasks(tasks) {
    return tasks.sort((a, b) => {
      // Priority 1: Critical path tasks
      if (a.criticalPath && !b.criticalPath) return -1;
      if (!a.criticalPath && b.criticalPath) return 1;
      
      // Priority 2: Tasks with many dependents (unblock more work)
      const aDependents = (this.reverseEdges.get(a.id) || new Set()).size;
      const bDependents = (this.reverseEdges.get(b.id) || new Set()).size;
      if (aDependents !== bDependents) return bDependents - aDependents;
      
      // Priority 3: Integration tasks (establish contracts early)
      const aIntegration = this.isIntegrationTask(a);
      const bIntegration = this.isIntegrationTask(b);
      if (aIntegration && !bIntegration) return -1;
      if (!aIntegration && bIntegration) return 1;
      
      // Priority 4: Estimated duration (quick tasks first for momentum)
      const aDuration = a.estimatedDuration || 60;
      const bDuration = b.estimatedDuration || 60;
      return aDuration - bDuration;
    });
  }

  /**
   * Check if task establishes integration points
   */
  isIntegrationTask(task) {
    const contracts = task.context.contracts;
    return contracts.providesAPI || 
           contracts.definesSchema || 
           contracts.establishesInterface;
  }

  /**
   * Calculate task priority score
   */
  calculateTaskPriority(taskId) {
    const task = this.nodes.get(taskId);
    if (!task) return 0;
    
    let priority = 0;
    
    // Critical path bonus
    if (this.criticalPath.has(taskId)) priority += 100;
    
    // Dependents count (unblocking factor)
    const dependents = (this.reverseEdges.get(taskId) || new Set()).size;
    priority += dependents * 10;
    
    // Integration task bonus
    if (this.isIntegrationTask(task)) priority += 50;
    
    // Quick task bonus (for momentum)
    const duration = task.estimatedDuration || 60;
    if (duration < 30) priority += 20;
    
    return priority;
  }

  /**
   * Calculate critical path for better scheduling
   */
  calculateCriticalPath() {
    this.criticalPath.clear();
    
    // Topological sort to get execution order
    const sorted = this.topologicalSort();
    if (!sorted) return; // Graph has cycles
    
    // Calculate longest path (critical path)
    const distances = new Map();
    
    for (const taskId of sorted) {
      const deps = this.edges.get(taskId) || new Set();
      let maxDistance = 0;
      
      for (const dep of deps) {
        const depDistance = distances.get(dep.taskId) || 0;
        const depDuration = this.nodes.get(dep.taskId)?.estimatedDuration || 0;
        maxDistance = Math.max(maxDistance, depDistance + depDuration);
      }
      
      distances.set(taskId, maxDistance);
    }
    
    // Find the maximum distance (project duration)
    const maxDistance = Math.max(...distances.values());
    
    // Mark all tasks that are on the critical path
    for (const [taskId, distance] of distances) {
      const taskDuration = this.nodes.get(taskId)?.estimatedDuration || 0;
      if (distance + taskDuration >= maxDistance * 0.95) { // Within 5% of critical path
        this.criticalPath.add(taskId);
      }
    }
    
    console.log(`🎯 Critical path identified with ${this.criticalPath.size} tasks`);
  }

  /**
   * Topological sort to detect cycles and get execution order
   */
  topologicalSort() {
    const visited = new Set();
    const visiting = new Set();
    const result = [];
    
    const visit = (taskId) => {
      if (visiting.has(taskId)) {
        console.error('❌ Cycle detected in task graph!');
        return false;
      }
      
      if (visited.has(taskId)) return true;
      
      visiting.add(taskId);
      
      const deps = this.edges.get(taskId) || new Set();
      for (const dep of deps) {
        if (!visit(dep.taskId)) return false;
      }
      
      visiting.delete(taskId);
      visited.add(taskId);
      result.push(taskId);
      
      return true;
    };
    
    // Visit all nodes
    for (const taskId of this.nodes.keys()) {
      if (!visited.has(taskId)) {
        if (!visit(taskId)) return null; // Cycle detected
      }
    }
    
    return result.reverse(); // Reverse for correct dependency order
  }

  /**
   * Find tasks that produce a specific output
   */
  findTasksProducing(requiredOutput, allTasks) {
    return allTasks.filter(task => {
      const outputs = task.context?.outputs || task.providedOutputs || [];
      return outputs.some(output => this.isCompatibleData(output, requiredOutput));
    });
  }

  /**
   * Check if two data items are compatible
   */
  isCompatibleData(provided, required) {
    // Simple data compatibility check
    if (typeof provided === 'string' && typeof required === 'string') {
      return provided.toLowerCase().includes(required.toLowerCase()) ||
             required.toLowerCase().includes(provided.toLowerCase());
    }
    
    if (typeof provided === 'object' && typeof required === 'object') {
      return provided.type === required.type ||
             provided.format === required.format;
    }
    
    return false;
  }

  /**
   * Update task status and recalculate ready tasks
   */
  updateTaskStatus(taskId, status, result = null) {
    const task = this.nodes.get(taskId);
    if (!task) return false;
    
    const oldStatus = task.status;
    task.status = status;
    
    if (status === 'in_progress') {
      task.startedAt = new Date().toISOString();
      this.readyTasks.delete(taskId);
    } else if (status === 'completed') {
      task.completedAt = new Date().toISOString();
      task.result = result;
      this.readyTasks.delete(taskId);
      // Update ready tasks as new ones might be available
      this.updateReadyTasks();
    } else if (status === 'failed') {
      task.failedAt = new Date().toISOString();
      task.error = result?.error || 'Unknown error';
      this.readyTasks.delete(taskId);
    }
    
    console.log(`📊 Task ${taskId} status: ${oldStatus} → ${status}`);
    return true;
  }

  /**
   * Update the set of ready tasks
   */
  updateReadyTasks() {
    this.readyTasks.clear();
    
    for (const [taskId, task] of this.nodes) {
      if (task.status === 'pending' && this.areDependenciesSatisfied(taskId)) {
        this.readyTasks.add(taskId);
      }
    }
  }

  /**
   * Check if the entire graph is complete
   */
  isComplete() {
    for (const [taskId, task] of this.nodes) {
      if (task.status !== 'completed' && task.status !== 'skipped') {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate graph integrity
   */
  validateGraph() {
    // Check for cycles
    const sorted = this.topologicalSort();
    if (!sorted) {
      throw new Error('Task graph contains cycles - cannot execute');
    }
    
    // Check for orphaned tasks (no path to completion)
    for (const [taskId] of this.nodes) {
      if (!this.hasPathToCompletion(taskId)) {
        console.warn(`⚠️ Task ${taskId} may be orphaned`);
      }
    }
    
    console.log('✅ Task graph validation passed');
  }

  /**
   * Check if a task has a path to completion
   */
  hasPathToCompletion(taskId) {
    // Simple check - task is not orphaned if it has dependents or no dependencies
    const dependencies = this.edges.get(taskId) || new Set();
    const dependents = this.reverseEdges.get(taskId) || new Set();
    
    return dependencies.size === 0 || dependents.size > 0;
  }

  /**
   * Get graph statistics
   */
  getStatistics() {
    const stats = {
      totalTasks: this.nodes.size,
      pendingTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      readyTasks: this.readyTasks.size,
      criticalPathTasks: this.criticalPath.size,
      totalDependencies: 0
    };
    
    for (const [taskId, task] of this.nodes) {
      stats[`${task.status}Tasks`]++;
      stats.totalDependencies += (this.edges.get(taskId) || new Set()).size;
    }
    
    return stats;
  }

  /**
   * Clear all graph data
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.reverseEdges.clear();
    this.integrationPoints.clear();
    this.criticalPath.clear();
    this.readyTasks.clear();
  }

  /**
   * Export graph for visualization or debugging
   */
  exportGraph() {
    const nodes = [];
    const edges = [];
    
    for (const [taskId, task] of this.nodes) {
      nodes.push({
        id: taskId,
        label: task.title || task.description || taskId,
        status: task.status,
        criticalPath: this.criticalPath.has(taskId),
        specialist: task.assignedTo,
        duration: task.estimatedDuration || 0
      });
    }
    
    for (const [taskId, deps] of this.edges) {
      for (const dep of deps) {
        edges.push({
          from: dep.taskId,
          to: taskId,
          type: dep.type || 'completion'
        });
      }
    }
    
    return { nodes, edges, statistics: this.getStatistics() };
  }
}

module.exports = TaskGraph;