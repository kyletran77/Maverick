const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * ProjectPersistence - Comprehensive project state management system
 * 
 * Handles saving and loading of:
 * - Task graphs and execution plans
 * - Node states and progress tracking
 * - Agent assignments and execution history
 * - Project metadata and configuration
 * - Checkpoint data for recovery
 */
class ProjectPersistence {
  constructor() {
    this.projectsDirectory = path.join(__dirname, '../../data/projects');
    this.ensureProjectsDirectory();
  }

  /**
   * Ensure the projects directory exists
   */
  ensureProjectsDirectory() {
    if (!fs.existsSync(this.projectsDirectory)) {
      fs.mkdirSync(this.projectsDirectory, { recursive: true });
    }
  }

  /**
   * Get the directory path for a specific project
   */
  getProjectDirectory(projectId) {
    return path.join(this.projectsDirectory, projectId);
  }

  /**
   * Get the main project file path
   */
  getProjectFilePath(projectId) {
    return path.join(this.getProjectDirectory(projectId), 'project.json');
  }

  /**
   * Get the task graph file path
   */
  getTaskGraphFilePath(projectId) {
    return path.join(this.getProjectDirectory(projectId), 'task-graph.json');
  }

  /**
   * Get the execution state file path
   */
  getExecutionStateFilePath(projectId) {
    return path.join(this.getProjectDirectory(projectId), 'execution-state.json');
  }

  /**
   * Get the checkpoints directory path
   */
  getCheckpointsDirectory(projectId) {
    return path.join(this.getProjectDirectory(projectId), 'checkpoints');
  }

  /**
   * Get the progress tracking file path
   */
  getProgressFilePath(projectId) {
    return path.join(this.getProjectDirectory(projectId), 'progress.json');
  }

  /**
   * Get the history log file path
   */
  getHistoryFilePath(projectId) {
    return path.join(this.getProjectDirectory(projectId), 'history.jsonl');
  }

  /**
   * Save a complete project state to disk
   */
  async saveProject(projectData) {
    const projectId = projectData.id;
    const projectDir = this.getProjectDirectory(projectId);

    // Ensure project directory exists
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Ensure checkpoints directory exists
    const checkpointsDir = this.getCheckpointsDirectory(projectId);
    if (!fs.existsSync(checkpointsDir)) {
      fs.mkdirSync(checkpointsDir, { recursive: true });
    }

    try {
      // Save main project metadata
      await this.saveProjectMetadata(projectId, projectData);

      // Save task graph structure
      await this.saveTaskGraph(projectId, projectData.taskGraph || projectData.statefulGraph?.graph);

      // Save execution state (node states, agent states, etc.)
      await this.saveExecutionState(projectId, projectData);

      // Save progress tracking
      await this.saveProgress(projectId, projectData);

      // Log the save operation
      await this.logProjectEvent(projectId, 'project_saved', {
        timestamp: new Date(),
        version: projectData.version || 1,
        status: projectData.status
      });

      console.log(`📁 Project ${projectId} saved successfully to disk`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to save project ${projectId}:`, error);
      throw new Error(`Project save failed: ${error.message}`);
    }
  }

  /**
   * Save project metadata
   */
  async saveProjectMetadata(projectId, projectData) {
    const metadata = {
      id: projectId,
      name: projectData.name || `Project ${projectId}`,
      prompt: projectData.prompt || projectData.originalPrompt,
      projectPath: projectData.projectPath,
      status: projectData.status || 'active',
      createdAt: projectData.createdAt || new Date(),
      updatedAt: new Date(),
      lastSavedAt: new Date(),
      version: (projectData.version || 0) + 1,
      
      // Project type and complexity
      projectType: projectData.taskAnalysis?.projectType || projectData.metadata?.projectType || 'unknown',
      complexity: projectData.taskAnalysis?.complexity || projectData.metadata?.complexity || 'medium',
      
      // Metrics and tracking
      metrics: {
        totalTasks: projectData.metrics?.totalTasks || 0,
        completedTasks: projectData.metrics?.completedTasks || 0,
        failedTasks: projectData.metrics?.failedTasks || 0,
        estimatedDuration: projectData.metrics?.estimatedDuration || 0,
        actualDuration: projectData.metrics?.actualDuration || 0,
        progressPercentage: projectData.metrics?.progressPercentage || 0
      },
      
      // State information
      isStatefulGraph: projectData.isStatefulGraph || false,
      statefulGraphId: projectData.statefulGraphId,
      
      // Resumable information
      canResume: this.determineResumability(projectData),
      resumeFromState: this.determineResumeState(projectData),
      
      // Tags and categorization
      tags: projectData.tags || [],
      category: projectData.category || 'general'
    };

    const filePath = this.getProjectFilePath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Save task graph structure
   */
  async saveTaskGraph(projectId, taskGraph) {
    if (!taskGraph) return;

    const taskGraphData = {
      id: taskGraph.id || projectId,
      nodes: this.serializeNodes(taskGraph.nodes),
      edges: this.serializeEdges(taskGraph.edges),
      projectType: taskGraph.projectType,
      complexity: taskGraph.complexity,
      estimatedDuration: taskGraph.estimatedDuration,
      metadata: taskGraph.metadata || {},
      savedAt: new Date()
    };

    const filePath = this.getTaskGraphFilePath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(taskGraphData, null, 2));
  }

  /**
   * Save execution state including node states, agent assignments, etc.
   */
  async saveExecutionState(projectId, projectData) {
    const executionState = {
      projectId: projectId,
      
      // Graph state (if using stateful graph)
      graphState: this.serializeGraphState(projectData.graphState || projectData.statefulGraph?.state),
      
      // Node states
      nodeStates: this.serializeNodeStates(projectData.nodeStates || projectData.statefulGraph?.nodeStates),
      
      // Agent assignments and states
      agentAssignments: this.serializeAgentAssignments(projectData.agentAssignments),
      agentStates: this.serializeAgentStates(projectData.agentStates || projectData.statefulGraph?.agentStates),
      
      // Execution context
      executionContext: this.serializeExecutionContext(projectData.executionContext || projectData.statefulGraph?.context),
      
      // Memory and conditional edges (for stateful graphs)
      graphMemory: this.serializeGraphMemory(projectData.graphMemory || projectData.statefulGraph?.memory),
      conditionalEdges: this.serializeConditionalEdges(projectData.conditionalEdges || projectData.statefulGraph?.conditionalEdges),
      
      // Kanban board state
      kanbanBoard: projectData.kanbanBoard,
      
      // Event log
      eventLog: projectData.eventLog || projectData.statefulGraph?.eventLog || [],
      
      // Checkpoints
      checkpoints: this.serializeCheckpoints(projectData.checkpoints || projectData.statefulGraph?.checkpoints),
      
      savedAt: new Date(),
      version: (projectData.version || 0) + 1
    };

    const filePath = this.getExecutionStateFilePath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(executionState, null, 2));
  }

  /**
   * Save progress tracking information
   */
  async saveProgress(projectId, projectData) {
    const progress = {
      projectId: projectId,
      
      // Overall progress
      overallProgress: this.calculateOverallProgress(projectData),
      
      // Task-level progress
      taskProgress: this.calculateTaskProgress(projectData),
      
      // Agent-level progress
      agentProgress: this.calculateAgentProgress(projectData),
      
      // Timeline tracking
      timeline: this.buildTimeline(projectData),
      
      // Dependencies and blocking relationships
      dependencies: this.analyzeDependencies(projectData),
      
      // Quality metrics
      qualityMetrics: this.calculateQualityMetrics(projectData),
      
      // Completion estimates
      estimates: this.calculateCompletionEstimates(projectData),
      
      savedAt: new Date()
    };

    const filePath = this.getProgressFilePath(projectId);
    fs.writeFileSync(filePath, JSON.stringify(progress, null, 2));
  }

  /**
   * Load a complete project from disk
   */
  async loadProject(projectId) {
    const projectDir = this.getProjectDirectory(projectId);
    
    if (!fs.existsSync(projectDir)) {
      throw new Error(`Project ${projectId} not found`);
    }

    try {
      // Load project metadata
      const metadata = await this.loadProjectMetadata(projectId);
      
      // Load task graph
      const taskGraph = await this.loadTaskGraph(projectId);
      
      // Load execution state
      const executionState = await this.loadExecutionState(projectId);
      
      // Load progress
      const progress = await this.loadProgress(projectId);
      
      // Load history
      const history = await this.loadHistory(projectId);

      // Reconstruct the project object
      const project = {
        // Basic metadata
        ...metadata,
        
        // Task graph
        taskGraph: taskGraph,
        
        // Execution state
        ...executionState,
        
        // Progress tracking
        progress: progress,
        
        // Historical data
        history: history,
        
        // Resumability information
        isLoaded: true,
        loadedAt: new Date()
      };

      console.log(`📂 Project ${projectId} loaded successfully from disk`);
      return project;

    } catch (error) {
      console.error(`❌ Failed to load project ${projectId}:`, error);
      throw new Error(`Project load failed: ${error.message}`);
    }
  }

  /**
   * Load project metadata
   */
  async loadProjectMetadata(projectId) {
    const filePath = this.getProjectFilePath(projectId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Project metadata file not found: ${filePath}`);
    }

    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Load task graph
   */
  async loadTaskGraph(projectId) {
    const filePath = this.getTaskGraphFilePath(projectId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const taskGraphData = JSON.parse(data);
    
    // Deserialize nodes and edges
    taskGraphData.nodes = this.deserializeNodes(taskGraphData.nodes);
    taskGraphData.edges = this.deserializeEdges(taskGraphData.edges);
    
    return taskGraphData;
  }

  /**
   * Load execution state
   */
  async loadExecutionState(projectId) {
    const filePath = this.getExecutionStateFilePath(projectId);
    if (!fs.existsSync(filePath)) {
      return {};
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const executionState = JSON.parse(data);
    
    // Deserialize complex state objects
    executionState.nodeStates = this.deserializeNodeStates(executionState.nodeStates);
    executionState.agentAssignments = this.deserializeAgentAssignments(executionState.agentAssignments);
    executionState.graphMemory = this.deserializeGraphMemory(executionState.graphMemory);
    executionState.conditionalEdges = this.deserializeConditionalEdges(executionState.conditionalEdges);
    executionState.checkpoints = this.deserializeCheckpoints(executionState.checkpoints);
    
    return executionState;
  }

  /**
   * Load progress tracking
   */
  async loadProgress(projectId) {
    const filePath = this.getProgressFilePath(projectId);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Load project history
   */
  async loadHistory(projectId) {
    const filePath = this.getHistoryFilePath(projectId);
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.warn('Failed to parse history line:', line);
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * List all available projects
   */
  async listProjects() {
    if (!fs.existsSync(this.projectsDirectory)) {
      return [];
    }

    const projectDirectories = fs.readdirSync(this.projectsDirectory)
      .filter(item => {
        const fullPath = path.join(this.projectsDirectory, item);
        return fs.statSync(fullPath).isDirectory();
      });

    const projects = [];
    
    for (const projectId of projectDirectories) {
      try {
        const metadata = await this.loadProjectMetadata(projectId);
        const progress = await this.loadProgress(projectId);
        
        projects.push({
          id: projectId,
          name: metadata.name,
          prompt: metadata.prompt,
          status: metadata.status,
          createdAt: metadata.createdAt,
          updatedAt: metadata.updatedAt,
          progressPercentage: progress?.overallProgress?.percentage || metadata.metrics?.progressPercentage || 0,
          canResume: metadata.canResume,
          projectType: metadata.projectType,
          complexity: metadata.complexity,
          totalTasks: metadata.metrics?.totalTasks || 0,
          completedTasks: metadata.metrics?.completedTasks || 0
        });
      } catch (error) {
        console.warn(`Failed to load project metadata for ${projectId}:`, error.message);
      }
    }

    // Sort by most recently updated
    return projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * Delete a project from disk
   */
  async deleteProject(projectId) {
    const projectDir = this.getProjectDirectory(projectId);
    
    if (!fs.existsSync(projectDir)) {
      return false;
    }

    try {
      // Log deletion before removing files
      await this.logProjectEvent(projectId, 'project_deleted', {
        timestamp: new Date(),
        deletedBy: 'system'
      });

      // Recursively delete project directory
      fs.rmSync(projectDir, { recursive: true, force: true });
      
      console.log(`🗑️ Project ${projectId} deleted successfully`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to delete project ${projectId}:`, error);
      throw new Error(`Project deletion failed: ${error.message}`);
    }
  }

  /**
   * Create a checkpoint for a project
   */
  async createCheckpoint(projectId, checkpointName, projectData) {
    const checkpointsDir = this.getCheckpointsDirectory(projectId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const checkpointFileName = `${timestamp}-${checkpointName}.json`;
    const checkpointPath = path.join(checkpointsDir, checkpointFileName);

    const checkpoint = {
      id: uuidv4(),
      name: checkpointName,
      projectId: projectId,
      timestamp: new Date(),
      projectData: projectData,
      version: (projectData.version || 0) + 1
    };

    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    
    // Log checkpoint creation
    await this.logProjectEvent(projectId, 'checkpoint_created', {
      checkpointName: checkpointName,
      checkpointId: checkpoint.id,
      timestamp: new Date()
    });

    console.log(`💾 Checkpoint '${checkpointName}' created for project ${projectId}`);
    return checkpoint;
  }

  /**
   * Log a project event to the history file
   */
  async logProjectEvent(projectId, eventType, eventData) {
    const event = {
      type: eventType,
      projectId: projectId,
      timestamp: new Date(),
      data: eventData
    };

    const historyPath = this.getHistoryFilePath(projectId);
    const eventLine = JSON.stringify(event) + '\n';
    
    fs.appendFileSync(historyPath, eventLine);
  }

  /**
   * Serialize nodes for storage
   */
  serializeNodes(nodes) {
    if (!nodes) return [];
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        createdAt: node.data.createdAt ? node.data.createdAt.toISOString() : null,
        startedAt: node.data.startedAt ? node.data.startedAt.toISOString() : null,
        completedAt: node.data.completedAt ? node.data.completedAt.toISOString() : null
      }
    }));
  }

  /**
   * Serialize edges for storage
   */
  serializeEdges(edges) {
    if (!edges) return [];
    return edges.map(edge => ({ ...edge }));
  }

  /**
   * Serialize graph state
   */
  serializeGraphState(graphState) {
    if (!graphState) return null;
    return {
      ...graphState,
      startTime: graphState.startTime ? graphState.startTime.toISOString() : null,
      lastUpdate: graphState.lastUpdate ? graphState.lastUpdate.toISOString() : null,
      estimatedCompletion: graphState.estimatedCompletion ? graphState.estimatedCompletion.toISOString() : null
    };
  }

  /**
   * Serialize node states
   */
  serializeNodeStates(nodeStates) {
    if (!nodeStates || !(nodeStates instanceof Map)) return {};
    
    const serialized = {};
    for (const [nodeId, state] of nodeStates) {
      serialized[nodeId] = {
        ...state,
        startTime: state.startTime ? state.startTime.toISOString() : null,
        endTime: state.endTime ? state.endTime.toISOString() : null,
        lastStateUpdate: state.lastStateUpdate ? state.lastStateUpdate.toISOString() : null
      };
    }
    return serialized;
  }

  /**
   * Serialize agent assignments
   */
  serializeAgentAssignments(agentAssignments) {
    if (!agentAssignments) return {};
    
    if (agentAssignments instanceof Map) {
      const serialized = {};
      for (const [agentId, assignment] of agentAssignments) {
        serialized[agentId] = assignment;
      }
      return serialized;
    }
    
    return agentAssignments;
  }

  /**
   * Serialize agent states
   */
  serializeAgentStates(agentStates) {
    if (!agentStates) return {};
    
    if (agentStates instanceof Map) {
      const serialized = {};
      for (const [agentId, state] of agentStates) {
        serialized[agentId] = state;
      }
      return serialized;
    }
    
    return agentStates;
  }

  /**
   * Serialize execution context
   */
  serializeExecutionContext(executionContext) {
    if (!executionContext) return null;
    return {
      ...executionContext,
      createdAt: executionContext.createdAt ? executionContext.createdAt.toISOString() : null
    };
  }

  /**
   * Serialize graph memory
   */
  serializeGraphMemory(graphMemory) {
    if (!graphMemory || !(graphMemory instanceof Map)) return {};
    
    const serialized = {};
    for (const [key, value] of graphMemory) {
      if (value instanceof Map) {
        // Convert nested Maps to objects
        const nestedObj = {};
        for (const [nestedKey, nestedValue] of value) {
          nestedObj[nestedKey] = nestedValue;
        }
        serialized[key] = nestedObj;
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  /**
   * Serialize conditional edges
   */
  serializeConditionalEdges(conditionalEdges) {
    if (!conditionalEdges || !(conditionalEdges instanceof Map)) return {};
    
    const serialized = {};
    for (const [edgeId, edge] of conditionalEdges) {
      serialized[edgeId] = {
        ...edge,
        // Remove function references that can't be serialized
        evaluator: null,
        lastEvaluation: edge.lastEvaluation ? {
          ...edge.lastEvaluation,
          evaluatedAt: edge.lastEvaluation.evaluatedAt ? edge.lastEvaluation.evaluatedAt.toISOString() : null
        } : null
      };
    }
    return serialized;
  }

  /**
   * Serialize checkpoints
   */
  serializeCheckpoints(checkpoints) {
    if (!checkpoints || !(checkpoints instanceof Map)) return {};
    
    const serialized = {};
    for (const [checkpointName, checkpoint] of checkpoints) {
      serialized[checkpointName] = {
        ...checkpoint,
        timestamp: checkpoint.timestamp ? checkpoint.timestamp.toISOString() : null
      };
    }
    return serialized;
  }

  /**
   * Deserialize nodes from storage
   */
  deserializeNodes(nodes) {
    if (!nodes) return [];
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        createdAt: node.data.createdAt ? new Date(node.data.createdAt) : null,
        startedAt: node.data.startedAt ? new Date(node.data.startedAt) : null,
        completedAt: node.data.completedAt ? new Date(node.data.completedAt) : null
      }
    }));
  }

  /**
   * Deserialize edges from storage
   */
  deserializeEdges(edges) {
    if (!edges) return [];
    return edges.map(edge => ({ ...edge }));
  }

  /**
   * Deserialize node states
   */
  deserializeNodeStates(nodeStates) {
    if (!nodeStates) return new Map();
    
    const map = new Map();
    for (const [nodeId, state] of Object.entries(nodeStates)) {
      map.set(nodeId, {
        ...state,
        startTime: state.startTime ? new Date(state.startTime) : null,
        endTime: state.endTime ? new Date(state.endTime) : null,
        lastStateUpdate: state.lastStateUpdate ? new Date(state.lastStateUpdate) : null
      });
    }
    return map;
  }

  /**
   * Deserialize agent assignments
   */
  deserializeAgentAssignments(agentAssignments) {
    if (!agentAssignments) return new Map();
    
    const map = new Map();
    for (const [agentId, assignment] of Object.entries(agentAssignments)) {
      map.set(agentId, assignment);
    }
    return map;
  }

  /**
   * Deserialize graph memory
   */
  deserializeGraphMemory(graphMemory) {
    if (!graphMemory) return new Map();
    
    const map = new Map();
    for (const [key, value] of Object.entries(graphMemory)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Convert nested objects back to Maps if they look like they were Maps
        if (key.includes(':') || Object.keys(value).some(k => typeof k === 'string' && k.includes(':'))) {
          const nestedMap = new Map();
          for (const [nestedKey, nestedValue] of Object.entries(value)) {
            nestedMap.set(nestedKey, nestedValue);
          }
          map.set(key, nestedMap);
        } else {
          map.set(key, value);
        }
      } else {
        map.set(key, value);
      }
    }
    return map;
  }

  /**
   * Deserialize conditional edges
   */
  deserializeConditionalEdges(conditionalEdges) {
    if (!conditionalEdges) return new Map();
    
    const map = new Map();
    for (const [edgeId, edge] of Object.entries(conditionalEdges)) {
      map.set(edgeId, {
        ...edge,
        lastEvaluation: edge.lastEvaluation ? {
          ...edge.lastEvaluation,
          evaluatedAt: edge.lastEvaluation.evaluatedAt ? new Date(edge.lastEvaluation.evaluatedAt) : null
        } : null
      });
    }
    return map;
  }

  /**
   * Deserialize checkpoints
   */
  deserializeCheckpoints(checkpoints) {
    if (!checkpoints) return new Map();
    
    const map = new Map();
    for (const [checkpointName, checkpoint] of Object.entries(checkpoints)) {
      map.set(checkpointName, {
        ...checkpoint,
        timestamp: checkpoint.timestamp ? new Date(checkpoint.timestamp) : null
      });
    }
    return map;
  }

  /**
   * Determine if a project can be resumed
   */
  determineResumability(projectData) {
    // A project can be resumed if:
    // 1. It's not completed or failed permanently
    // 2. It has task graph data
    // 3. It has execution state
    const hasTaskGraph = projectData.taskGraph || projectData.statefulGraph?.graph;
    const hasExecutionState = projectData.nodeStates || projectData.statefulGraph?.nodeStates;
    const isActiveStatus = ['active', 'paused', 'in_progress', 'executing'].includes(projectData.status);
    
    return hasTaskGraph && hasExecutionState && isActiveStatus;
  }

  /**
   * Determine the appropriate resume state
   */
  determineResumeState(projectData) {
    if (!this.determineResumability(projectData)) {
      return 'not_resumable';
    }

    const status = projectData.status;
    const graphState = projectData.graphState || projectData.statefulGraph?.state;
    
    if (status === 'paused' || (graphState && graphState.status === 'paused')) {
      return 'paused';
    } else if (status === 'executing' || (graphState && graphState.status === 'executing')) {
      return 'in_progress';
    } else if (status === 'active') {
      return 'ready_to_start';
    }
    
    return 'ready_to_resume';
  }

  /**
   * Calculate overall progress
   */
  calculateOverallProgress(projectData) {
    const taskGraph = projectData.taskGraph || projectData.statefulGraph?.graph;
    const nodeStates = projectData.nodeStates || projectData.statefulGraph?.nodeStates;
    
    if (!taskGraph || !taskGraph.nodes || !nodeStates) {
      return { percentage: 0, completedTasks: 0, totalTasks: 0 };
    }

    const totalTasks = taskGraph.nodes.length;
    let completedTasks = 0;
    let failedTasks = 0;
    let inProgressTasks = 0;

    for (const node of taskGraph.nodes) {
      const nodeState = nodeStates instanceof Map ? 
        nodeStates.get(node.id) : 
        nodeStates[node.id];
        
      if (nodeState) {
        if (nodeState.status === 'completed') {
          completedTasks++;
        } else if (nodeState.status === 'failed') {
          failedTasks++;
        } else if (nodeState.status === 'running' || nodeState.status === 'in_progress') {
          inProgressTasks++;
        }
      }
    }

    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      percentage,
      completedTasks,
      totalTasks,
      failedTasks,
      inProgressTasks,
      pendingTasks: totalTasks - completedTasks - failedTasks - inProgressTasks
    };
  }

  /**
   * Calculate task-level progress
   */
  calculateTaskProgress(projectData) {
    const taskGraph = projectData.taskGraph || projectData.statefulGraph?.graph;
    const nodeStates = projectData.nodeStates || projectData.statefulGraph?.nodeStates;
    
    if (!taskGraph || !taskGraph.nodes || !nodeStates) {
      return [];
    }

    return taskGraph.nodes.map(node => {
      const nodeState = nodeStates instanceof Map ? 
        nodeStates.get(node.id) : 
        nodeStates[node.id];

      return {
        taskId: node.id,
        title: node.data.title,
        status: nodeState?.status || 'pending',
        progress: nodeState?.progress || 0,
        startTime: nodeState?.startTime,
        endTime: nodeState?.endTime,
        duration: nodeState?.duration,
        assignedAgent: nodeState?.assignedAgent,
        dependencies: node.data.dependencies || [],
        errors: nodeState?.errors || [],
        isCheckpoint: node.data.isCheckpoint || false
      };
    });
  }

  /**
   * Calculate agent-level progress
   */
  calculateAgentProgress(projectData) {
    const agentAssignments = projectData.agentAssignments;
    
    if (!agentAssignments) {
      return {};
    }

    const agentProgress = {};
    const assignments = agentAssignments instanceof Map ? 
      Array.from(agentAssignments.entries()) : 
      Object.entries(agentAssignments);

    for (const [agentId, assignment] of assignments) {
      const agent = assignment.agent || assignment;
      const tasks = assignment.tasks || [];
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'completed').length;
      const failedTasks = tasks.filter(task => task.status === 'failed').length;
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress' || task.status === 'running').length;

      agentProgress[agentId] = {
        agentId,
        agentName: agent.name || agent.id,
        agentType: agent.type || agent.specialization,
        totalTasks,
        completedTasks,
        failedTasks,
        inProgressTasks,
        progressPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      };
    }

    return agentProgress;
  }

  /**
   * Build project timeline
   */
  buildTimeline(projectData) {
    const events = [];
    
    // Add project creation event
    if (projectData.createdAt) {
      events.push({
        timestamp: projectData.createdAt,
        type: 'project_created',
        description: 'Project created',
        data: { projectId: projectData.id }
      });
    }

    // Add events from event log
    if (projectData.eventLog) {
      events.push(...projectData.eventLog.map(event => ({
        timestamp: event.timestamp,
        type: event.type,
        description: event.description || event.type,
        data: event.data
      })));
    }

    // Add events from stateful graph
    if (projectData.statefulGraph && projectData.statefulGraph.eventLog) {
      events.push(...projectData.statefulGraph.eventLog.map(event => ({
        timestamp: event.timestamp,
        type: event.type,
        description: event.description || event.type,
        data: event.data
      })));
    }

    // Sort events by timestamp
    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Analyze dependencies
   */
  analyzeDependencies(projectData) {
    const taskGraph = projectData.taskGraph || projectData.statefulGraph?.graph;
    
    if (!taskGraph || !taskGraph.nodes || !taskGraph.edges) {
      return { dependencies: [], blockers: [], readyTasks: [] };
    }

    const dependencies = taskGraph.edges.map(edge => ({
      from: edge.source,
      to: edge.target,
      type: edge.type || 'dependency'
    }));

    // Find blocking relationships
    const blockers = [];
    const readyTasks = [];

    for (const node of taskGraph.nodes) {
      const incomingEdges = taskGraph.edges.filter(edge => edge.target === node.id);
      
      if (incomingEdges.length === 0) {
        readyTasks.push(node.id);
      } else {
        blockers.push({
          taskId: node.id,
          blockedBy: incomingEdges.map(edge => edge.source)
        });
      }
    }

    return { dependencies, blockers, readyTasks };
  }

  /**
   * Calculate quality metrics
   */
  calculateQualityMetrics(projectData) {
    // This would integrate with the QA system
    return {
      overallScore: 0,
      testCoverage: 0,
      codeQuality: 0,
      securityScore: 0,
      performanceScore: 0,
      deploymentReadiness: 'unknown'
    };
  }

  /**
   * Calculate completion estimates
   */
  calculateCompletionEstimates(projectData) {
    const progress = this.calculateOverallProgress(projectData);
    const taskProgress = this.calculateTaskProgress(projectData);
    
    // Simple estimation based on current progress and average task completion time
    const completedTasks = taskProgress.filter(task => task.status === 'completed');
    const averageTaskTime = completedTasks.length > 0 ? 
      completedTasks.reduce((sum, task) => sum + (task.duration || 0), 0) / completedTasks.length : 
      15 * 60 * 1000; // 15 minutes default

    const remainingTasks = progress.pendingTasks + progress.inProgressTasks;
    const estimatedRemainingTime = remainingTasks * averageTaskTime;

    return {
      estimatedCompletion: new Date(Date.now() + estimatedRemainingTime),
      estimatedRemainingTime,
      averageTaskTime,
      confidence: completedTasks.length > 2 ? 'medium' : 'low'
    };
  }
}

module.exports = ProjectPersistence; 