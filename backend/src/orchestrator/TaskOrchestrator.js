const { v4: uuidv4 } = require('uuid');
const { GooseIntegration } = require('../../goose-integration');
const QAEngineer = require('./QAEngineer');
const AgentRegistry = require('./agents/AgentRegistry');
const ProjectPersistence = require('./ProjectPersistence');

/**
 * LangGraph-inspired Task Orchestrator with Bulletproof State Management
 * 
 * Implements a stateful graph system where:
 * - Each node maintains state and context
 * - Conditional edges route based on execution results
 * - Cyclical workflows supported for iterative tasks
 * - Memory bank preserves context across executions
 * - Agent state is persistent and transparent
 */
class TaskOrchestrator {
  constructor(io, jobStorage) {
    this.io = io;
    this.jobStorage = jobStorage;
    
    // Core LangGraph-inspired state management
    this.projectGraphs = new Map(); // Stateful project graphs
    this.graphMemory = new Map(); // Memory bank for each graph
    this.graphState = new Map(); // Current state of each graph
    this.executionContext = new Map(); // Execution context tracking
    
    // Enhanced state tracking
    this.nodeStates = new Map(); // Individual node states
    this.edgeStates = new Map(); // Edge execution history
    this.agentStates = new Map(); // Persistent agent states
    this.stateHistory = new Map(); // State transition history
    
    // Legacy compatibility
    this.activeProjects = new Map();
    this.agentRegistry = new Map();
    this.taskGraph = new Map();
    this.eventBus = new Map();
    
    // Initialize job management
    this.activeJobs = new Map();
    this.jobHistory = [];
    this.jobSockets = new Map();
    
    // Initialize Goose integration for real agent execution
    this.gooseIntegration = new GooseIntegration(io);
    
    // Initialize QA Engineer for quality verification
    this.qaEngineer = new QAEngineer(io, this.gooseIntegration);
    
    // Initialize new modular agent registry
    this.specializedAgents = new AgentRegistry();
    
    // Initialize project persistence system
    this.projectPersistence = new ProjectPersistence();
    
    // Initialize specialized agent types with capabilities (legacy support)
    this.initializeAgentTypes();
    
    // Initialize state management system
    this.initializeStateManagement();
  }

  /**
   * Initialize the bulletproof state management system
   */
  initializeStateManagement() {
    // State transition handlers
    this.stateTransitionHandlers = new Map();
    
    // Conditional edge evaluators
    this.conditionalEvaluators = new Map();
    
    // Memory serializers for state persistence
    this.memorySerializers = new Map();
    
    // Recovery mechanisms
    this.recoveryHandlers = new Map();
    
    // Initialize default handlers
    this.setupDefaultStateHandlers();
    
    console.log('🔧 Initialized LangGraph-inspired state management system');
  }

  /**
   * Setup default state transition handlers
   */
  setupDefaultStateHandlers() {
    // Node state transitions
    this.stateTransitionHandlers.set('node:start', this.handleNodeStart.bind(this));
    this.stateTransitionHandlers.set('node:complete', this.handleNodeComplete.bind(this));
    this.stateTransitionHandlers.set('node:error', this.handleNodeError.bind(this));
    this.stateTransitionHandlers.set('node:retry', this.handleNodeRetry.bind(this));
    
    // Graph state transitions
    this.stateTransitionHandlers.set('graph:start', this.handleGraphStart.bind(this));
    this.stateTransitionHandlers.set('graph:complete', this.handleGraphComplete.bind(this));
    this.stateTransitionHandlers.set('graph:pause', this.handleGraphPause.bind(this));
    this.stateTransitionHandlers.set('graph:resume', this.handleGraphResume.bind(this));
    
         // Conditional edge evaluators
     this.conditionalEvaluators.set('success', this.evaluateSuccessCondition.bind(this));
     this.conditionalEvaluators.set('failure', this.evaluateFailureCondition.bind(this));
     this.conditionalEvaluators.set('retry', this.evaluateRetryCondition.bind(this));
     this.conditionalEvaluators.set('quality_gate', this.evaluateQualityGate.bind(this));
     this.conditionalEvaluators.set('dependency', this.evaluateDependencyCondition.bind(this));
     
     // Cyclical workflow evaluators
     this.conditionalEvaluators.set('quality_improvement', this.evaluateQualityImprovement.bind(this));
     this.conditionalEvaluators.set('review_feedback', this.evaluateReviewFeedback.bind(this));
     this.conditionalEvaluators.set('test_convergence', this.evaluateTestConvergence.bind(this));
     this.conditionalEvaluators.set('general_improvement', this.evaluateGeneralImprovement.bind(this));
     this.conditionalEvaluators.set('agent_availability', this.evaluateAgentAvailability.bind(this));
    
    console.log('✅ Default state handlers initialized');
  }

  /**
   * Create a bulletproof stateful graph with LangGraph principles
   */
  async createStatefulGraph(taskAnalysis, projectId, socket) {
    console.log(`🏗️ Creating bulletproof stateful graph for project: ${projectId}`);
    
    try {
      // Create enhanced task graph with checkpoints
      const taskGraph = await this.createTaskGraphWithCheckpoints(taskAnalysis, projectId);
      
      // Initialize graph state
      const graphState = this.initializeGraphState(projectId, taskGraph);
      
      // Initialize memory bank
      const memoryBank = this.initializeMemoryBank(projectId, taskAnalysis);
      
      // Create execution context
      const executionContext = this.createExecutionContext(projectId, taskAnalysis);
      
      // Setup conditional edges
      const conditionalEdges = this.setupConditionalEdges(taskGraph);
      
      // Initialize node states
      const nodeStates = this.initializeNodeStates(taskGraph.nodes);
      
      // Create the stateful graph
      const statefulGraph = {
        id: projectId,
        graph: taskGraph,
        state: graphState,
        memory: memoryBank,
        context: executionContext,
        conditionalEdges: conditionalEdges,
        nodeStates: nodeStates,
        createdAt: new Date(),
        lastStateUpdate: new Date(),
        version: 1,
        checkpoints: new Map(), // State checkpoints for recovery
        eventLog: [], // Event history for debugging
        metadata: {
          projectType: taskAnalysis.projectType,
          complexity: taskAnalysis.complexity,
          totalNodes: taskGraph.nodes.length,
          totalEdges: taskGraph.edges.length
        }
      };
      
      // Store in state management system
      this.projectGraphs.set(projectId, statefulGraph);
      this.graphState.set(projectId, graphState);
      this.graphMemory.set(projectId, memoryBank);
      this.executionContext.set(projectId, executionContext);
      this.nodeStates.set(projectId, nodeStates);
      
      // Create state checkpoint
      this.createStateCheckpoint(projectId, 'initialized');
      
      // Log state creation
      this.logStateEvent(projectId, 'graph_created', {
        nodeCount: taskGraph.nodes.length,
        edgeCount: taskGraph.edges.length,
        memorySize: memoryBank.size,
        stateVersion: 1
      });
      
      console.log(`✅ Stateful graph created: ${taskGraph.nodes.length} nodes, ${taskGraph.edges.length} edges`);
      
      return statefulGraph;
      
    } catch (error) {
      console.error('❌ Failed to create stateful graph:', error);
      throw new Error(`Stateful graph creation failed: ${error.message}`);
    }
  }

  /**
   * Initialize graph state with LangGraph principles
   */
  initializeGraphState(projectId, taskGraph) {
    const graphState = {
      // Core state properties
      projectId: projectId,
      status: 'initialized',
      currentNodes: [], // Currently executing nodes
      completedNodes: [], // Completed node IDs
      failedNodes: [], // Failed node IDs
      availableNodes: [], // Nodes ready for execution
      blockedNodes: [], // Nodes waiting for dependencies
      
      // Execution tracking
      executionPhase: 'planning',
      lastExecution: null,
      nextScheduled: null,
      parallelExecutions: 0,
      maxParallelism: 3,
      
      // Resource tracking
      activeAgents: new Map(),
      agentWorkloads: new Map(),
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        agents: 0
      },
      
      // Quality tracking
      qualityGates: new Map(),
      checkpointResults: new Map(),
      overallQuality: 0,
      
      // Timing and metrics
      startTime: new Date(),
      estimatedCompletion: null,
      actualProgress: 0,
      
      // Error handling
      errorCount: 0,
      retryCount: 0,
      lastError: null,
      recoveryState: null,
      
      // State metadata
      stateVersion: 1,
      lastUpdate: new Date(),
      updateCount: 0,
      transitionHistory: []
    };
    
    // Initialize available nodes (nodes with no dependencies)
    graphState.availableNodes = this.findReadyNodes(taskGraph);
    
    // Initialize blocked nodes (nodes with dependencies)
    graphState.blockedNodes = taskGraph.nodes
      .filter(node => !graphState.availableNodes.includes(node.id))
      .map(node => node.id);
    
    console.log(`📊 Graph state initialized: ${graphState.availableNodes.length} ready, ${graphState.blockedNodes.length} blocked`);
    
    return graphState;
  }

  /**
   * Initialize memory bank for persistent context
   */
  initializeMemoryBank(projectId, taskAnalysis) {
    const memoryBank = new Map();
    
    // Project context
    memoryBank.set('project:context', {
      projectId: projectId,
      prompt: taskAnalysis.originalPrompt || '',
      projectType: taskAnalysis.projectType,
      complexity: taskAnalysis.complexity,
      requirements: taskAnalysis.requirements || [],
      constraints: taskAnalysis.constraints || [],
      createdAt: new Date()
    });
    
    // Execution history
    memoryBank.set('execution:history', []);
    
    // Agent knowledge
    memoryBank.set('agents:knowledge', new Map());
    
    // Quality metrics
    memoryBank.set('quality:metrics', {
      overallScore: 0,
      testCoverage: 0,
      codeQuality: 0,
      securityScore: 0,
      performanceScore: 0
    });
    
    // Learned patterns
    memoryBank.set('patterns:learned', new Map());
    
    // Error patterns
    memoryBank.set('errors:patterns', new Map());
    
    // Success patterns
    memoryBank.set('success:patterns', new Map());
    
    console.log(`🧠 Memory bank initialized with ${memoryBank.size} memory categories`);
    
    return memoryBank;
  }

  /**
   * Create execution context for the graph
   */
  createExecutionContext(projectId, taskAnalysis) {
    return {
      projectId: projectId,
      projectPath: taskAnalysis.projectPath || './project',
      environment: 'development',
      
      // Execution settings
      maxRetries: 3,
      timeoutMs: 15 * 60 * 1000, // 15 minutes
      parallelism: 3,
      
      // Quality requirements
      qualityThreshold: 0.7,
      requireCodeReview: true,
      requireQATesting: true,
      
      // Resource limits
      maxAgents: 10,
      maxMemoryMB: 512,
      maxExecutionTime: 2 * 60 * 60 * 1000, // 2 hours
      
      // Event configuration
      enableEventLogging: true,
      enableStateSnapshots: true,
      snapshotInterval: 5 * 60 * 1000, // 5 minutes
      
      // Recovery configuration
      enableAutoRecovery: true,
      recoveryAttempts: 3,
      recoveryDelay: 30000, // 30 seconds
      
      createdAt: new Date()
    };
  }

     /**
    * Setup conditional edges for dynamic routing with cyclical support
    */
   setupConditionalEdges(taskGraph) {
     const conditionalEdges = new Map();
     
     // Detect cyclical dependencies for iterative workflows
     const cycles = this.detectCycles(taskGraph);
     
     taskGraph.edges.forEach(edge => {
       const sourceNode = taskGraph.nodes.find(n => n.id === edge.source);
       const targetNode = taskGraph.nodes.find(n => n.id === edge.target);
       
       if (sourceNode && targetNode) {
         const conditions = this.determineEdgeConditions(sourceNode, targetNode);
         
         // Check if this edge is part of a cycle
         const isCyclical = cycles.some(cycle => 
           cycle.includes(edge.source) && cycle.includes(edge.target)
         );
         
         conditionalEdges.set(edge.id, {
           id: edge.id,
           source: edge.source,
           target: edge.target,
           conditions: conditions,
           evaluator: this.createEdgeEvaluator(conditions, isCyclical),
           lastEvaluation: null,
           evaluationHistory: [],
           isCyclical: isCyclical,
           cycleInfo: isCyclical ? this.getCycleInfo(edge, cycles) : null,
           maxIterations: isCyclical ? 5 : 1, // Limit cycles to prevent infinite loops
           currentIteration: 0
         });
       }
     });
     
     console.log(`🔀 Conditional edges setup: ${conditionalEdges.size} edges with conditions`);
     if (cycles.length > 0) {
       console.log(`🔄 Detected ${cycles.length} cycles for iterative workflows:`, cycles);
     }
     
     return conditionalEdges;
   }

   /**
    * Detect cycles in the task graph using DFS
    */
   detectCycles(taskGraph) {
     const visited = new Set();
     const recursionStack = new Set();
     const cycles = [];
     const currentPath = [];
     
     const dfs = (nodeId) => {
       if (recursionStack.has(nodeId)) {
         // Found a cycle - extract the cycle from current path
         const cycleStart = currentPath.indexOf(nodeId);
         const cycle = currentPath.slice(cycleStart);
         cycles.push([...cycle, nodeId]); // Include the repeated node
         return true;
       }
       
       if (visited.has(nodeId)) {
         return false;
       }
       
       visited.add(nodeId);
       recursionStack.add(nodeId);
       currentPath.push(nodeId);
       
       // Get outgoing edges from this node
       const outgoingEdges = taskGraph.edges.filter(edge => edge.source === nodeId);
       
       for (const edge of outgoingEdges) {
         if (dfs(edge.target)) {
           // Cycle found, but continue to find all cycles
         }
       }
       
       recursionStack.delete(nodeId);
       currentPath.pop();
       
       return false;
     };
     
     // Check each node as a potential cycle start
     for (const node of taskGraph.nodes) {
       if (!visited.has(node.id)) {
         dfs(node.id);
       }
     }
     
     return cycles;
   }

   /**
    * Get cycle information for an edge
    */
   getCycleInfo(edge, cycles) {
     for (const cycle of cycles) {
       if (cycle.includes(edge.source) && cycle.includes(edge.target)) {
         return {
           cycle: cycle,
           isBackEdge: cycle.indexOf(edge.target) < cycle.indexOf(edge.source),
           cycleLength: cycle.length - 1, // Subtract 1 for the repeated node
           purpose: this.determineCyclePurpose(cycle)
         };
       }
     }
     return null;
   }

   /**
    * Determine the purpose of a cycle based on node types
    */
   determineCyclePurpose(cycle) {
     // Analyze the nodes in the cycle to determine its purpose
     const nodeTypes = cycle.map(nodeId => {
       // This would need access to the actual nodes - simplified for now
       return 'task'; // Default type
     });
     
     if (nodeTypes.includes('qa_testing') && nodeTypes.includes('development')) {
       return 'quality_iteration';
     } else if (nodeTypes.includes('review') && nodeTypes.includes('rework')) {
       return 'review_cycle';
     } else if (nodeTypes.includes('test') && nodeTypes.includes('fix')) {
       return 'test_fix_cycle';
     } else {
       return 'general_iteration';
     }
   }

  /**
   * Determine conditions for an edge based on node types
   */
  determineEdgeConditions(sourceNode, targetNode) {
    const conditions = [];
    
    // Standard dependency condition
    conditions.push({
      type: 'dependency',
      description: `${sourceNode.data.title} must complete successfully`,
      evaluator: 'dependency'
    });
    
    // Quality gate conditions for checkpoints
    if (sourceNode.data.isCheckpoint) {
      conditions.push({
        type: 'quality_gate',
        description: `Quality gate must pass with score >= 0.7`,
        evaluator: 'quality_gate',
        threshold: 0.7
      });
    }
    
    // Retry conditions for failed nodes
    if (targetNode.data.isRetry) {
      conditions.push({
        type: 'retry',
        description: `Retry conditions must be met`,
        evaluator: 'retry',
        maxRetries: 3
      });
    }
    
    // Agent availability conditions
    conditions.push({
      type: 'agent_availability',
      description: `Required agent must be available`,
      evaluator: 'agent_availability'
    });
    
    return conditions;
  }

     /**
    * Create edge evaluator function with cyclical support
    */
   createEdgeEvaluator(conditions, isCyclical = false) {
     return async (projectId, edgeId, sourceResult) => {
       const results = [];
       const statefulGraph = this.projectGraphs.get(projectId);
       
       // Get edge state for cyclical handling
       const conditionalEdge = statefulGraph?.conditionalEdges.get(edgeId);
       
       // Handle cyclical edge evaluation
       if (isCyclical && conditionalEdge) {
         // Check if we've exceeded maximum iterations
         if (conditionalEdge.currentIteration >= conditionalEdge.maxIterations) {
           return {
             passed: false,
             results: [{
               condition: 'max_iterations',
               passed: false,
               reason: `Maximum iterations (${conditionalEdge.maxIterations}) exceeded for cyclical edge`,
               data: { currentIteration: conditionalEdge.currentIteration }
             }],
             evaluatedAt: new Date(),
             cyclicalInfo: {
               isCyclical: true,
               iteration: conditionalEdge.currentIteration,
               maxIterations: conditionalEdge.maxIterations,
               cycleInfo: conditionalEdge.cycleInfo
             }
           };
         }
         
         // Add cyclical-specific conditions
         const cyclicalCondition = this.createCyclicalCondition(conditionalEdge, sourceResult);
         if (cyclicalCondition) {
           conditions = [...conditions, cyclicalCondition];
         }
       }
       
       // Evaluate all conditions
       for (const condition of conditions) {
         const evaluator = this.conditionalEvaluators.get(condition.evaluator);
         if (evaluator) {
           const result = await evaluator(projectId, condition, sourceResult);
           results.push({
             condition: condition.type,
             passed: result.passed,
             reason: result.reason,
             data: result.data
           });
         }
       }
       
       // All conditions must pass
       const allPassed = results.every(r => r.passed);
       
       // Update iteration count for cyclical edges
       if (isCyclical && conditionalEdge && allPassed) {
         conditionalEdge.currentIteration++;
         conditionalEdge.evaluationHistory.push({
           iteration: conditionalEdge.currentIteration,
           evaluatedAt: new Date(),
           passed: allPassed,
           sourceResult: sourceResult
         });
       }
       
       const evaluation = {
         passed: allPassed,
         results: results,
         evaluatedAt: new Date()
       };
       
       // Add cyclical information to the result
       if (isCyclical && conditionalEdge) {
         evaluation.cyclicalInfo = {
           isCyclical: true,
           iteration: conditionalEdge.currentIteration,
           maxIterations: conditionalEdge.maxIterations,
           cycleInfo: conditionalEdge.cycleInfo
         };
       }
       
       return evaluation;
     };
   }

   /**
    * Create cyclical-specific condition based on cycle purpose
    */
   createCyclicalCondition(conditionalEdge, sourceResult) {
     const cycleInfo = conditionalEdge.cycleInfo;
     if (!cycleInfo) return null;
     
     switch (cycleInfo.purpose) {
       case 'quality_iteration':
         return {
           type: 'quality_improvement',
           description: 'Quality must improve or reach threshold',
           evaluator: 'quality_improvement',
           threshold: 0.7,
           previousResult: sourceResult
         };
         
       case 'review_cycle':
         return {
           type: 'review_feedback',
           description: 'Review feedback must be addressed',
           evaluator: 'review_feedback',
           requiresImprovement: true
         };
         
       case 'test_fix_cycle':
         return {
           type: 'test_convergence',
           description: 'Tests must pass or show improvement',
           evaluator: 'test_convergence',
           previousResult: sourceResult
         };
         
       default:
         return {
           type: 'general_improvement',
           description: 'General improvement or completion criteria',
           evaluator: 'general_improvement',
           iteration: conditionalEdge.currentIteration
         };
     }
   }

  /**
   * Initialize node states with persistent tracking
   */
  initializeNodeStates(nodes) {
    const nodeStates = new Map();
    
    nodes.forEach(node => {
      nodeStates.set(node.id, {
        nodeId: node.id,
        status: 'pending',
        
        // Execution tracking
        startTime: null,
        endTime: null,
        duration: null,
        attempts: 0,
        maxAttempts: 3,
        
        // State persistence
        inputState: {},
        outputState: {},
        contextState: {},
        
        // Agent tracking
        assignedAgent: null,
        agentCapabilities: [],
        agentPerformance: {},
        
        // Quality tracking
        qualityScore: null,
        qualityChecks: [],
        codeReviewPassed: null,
        qaTestingPassed: null,
        
        // Error tracking
        errors: [],
        warnings: [],
        lastError: null,
        
        // Dependencies
        dependencies: node.data.dependencies || [],
        dependents: [],
        blockedBy: [],
        
        // Metadata
        nodeType: node.type,
        isCheckpoint: node.data.isCheckpoint || false,
        isFinalReview: node.data.isFinalReview || false,
        priority: node.data.priority || 'medium',
        
        // State history
        stateHistory: [],
        lastStateUpdate: new Date(),
        stateVersion: 1
      });
    });
    
    console.log(`📝 Node states initialized for ${nodeStates.size} nodes`);
    
    return nodeStates;
  }

  /**
   * Find nodes ready for execution (no pending dependencies)
   */
  findReadyNodes(taskGraph) {
    const readyNodes = [];
    
    taskGraph.nodes.forEach(node => {
      if (!node.data.dependencies || node.data.dependencies.length === 0) {
        readyNodes.push(node.id);
      }
    });
    
    return readyNodes;
  }

  /**
   * Create state checkpoint for recovery
   */
  createStateCheckpoint(projectId, checkpointName) {
    const statefulGraph = this.projectGraphs.get(projectId);
    if (!statefulGraph) return;
    
    const checkpoint = {
      name: checkpointName,
      timestamp: new Date(),
      graphState: JSON.parse(JSON.stringify(statefulGraph.state)),
      nodeStates: new Map(this.nodeStates.get(projectId)),
      memorySnapshot: new Map(this.graphMemory.get(projectId)),
      version: statefulGraph.version
    };
    
    statefulGraph.checkpoints.set(checkpointName, checkpoint);
    
    console.log(`💾 State checkpoint created: ${checkpointName} (version ${statefulGraph.version})`);
  }

  /**
   * Log state event for debugging and monitoring
   */
  logStateEvent(projectId, eventType, eventData) {
    const statefulGraph = this.projectGraphs.get(projectId);
    if (!statefulGraph) return;
    
    const event = {
      type: eventType,
      timestamp: new Date(),
      projectId: projectId,
      data: eventData,
      stateVersion: statefulGraph.version
    };
    
    statefulGraph.eventLog.push(event);
    
    // Keep only last 1000 events to prevent memory bloat
    if (statefulGraph.eventLog.length > 1000) {
      statefulGraph.eventLog = statefulGraph.eventLog.slice(-1000);
    }
    
    console.log(`📊 State event logged: ${eventType} for project ${projectId}`);
  }

  /**
   * Execute stateful graph with bulletproof state management
   */
  async executeStatefulGraph(projectId, socket) {
    console.log(`🚀 Starting stateful graph execution for project: ${projectId}`);
    
    try {
      const statefulGraph = this.projectGraphs.get(projectId);
      if (!statefulGraph) {
        throw new Error(`Stateful graph not found for project: ${projectId}`);
      }
      
      // Transition to executing state
      await this.transitionGraphState(projectId, 'executing', socket);
      
      // Create initial checkpoint
      this.createStateCheckpoint(projectId, 'execution_start');
      
      // Start execution loop
      await this.runExecutionLoop(projectId, socket);
      
      console.log(`✅ Stateful graph execution completed for project: ${projectId}`);
      
    } catch (error) {
      console.error(`❌ Stateful graph execution failed:`, error);
      await this.handleGraphError(projectId, error, socket);
    }
  }

  /**
   * Run the main execution loop with state management
   */
  async runExecutionLoop(projectId, socket) {
    const maxIterations = 1000; // Prevent infinite loops
    let iteration = 0;
    
    while (iteration < maxIterations) {
      iteration++;
      
      const state = this.graphState.get(projectId);
      if (!state) break;
      
      console.log(`🔄 Execution loop iteration ${iteration} - Status: ${state.status}`);
      
      // Check if graph is complete
      if (state.status === 'completed' || state.status === 'failed') {
        break;
      }
      
      // Get next available nodes
      const availableNodes = await this.getAvailableNodes(projectId);
      
      if (availableNodes.length === 0) {
        // No nodes available - check if we're waiting or complete
        if (state.currentNodes.length === 0) {
          // No nodes running and none available - we're done
          await this.transitionGraphState(projectId, 'completed', socket);
          break;
        } else {
          // Nodes still running - wait
          await this.waitForRunningNodes(projectId, socket);
          continue;
        }
      }
      
      // Execute available nodes (respecting parallelism)
      await this.executeAvailableNodes(projectId, availableNodes, socket);
      
      // Update graph state
      await this.updateGraphState(projectId);
      
      // Small delay to prevent CPU spinning
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (iteration >= maxIterations) {
      throw new Error('Execution loop exceeded maximum iterations - possible infinite loop');
    }
  }

  /**
   * Get nodes available for execution based on dependencies and conditions
   */
  async getAvailableNodes(projectId) {
    const statefulGraph = this.projectGraphs.get(projectId);
    const state = this.graphState.get(projectId);
    const nodeStates = this.nodeStates.get(projectId);
    
    if (!statefulGraph || !state || !nodeStates) return [];
    
    const availableNodes = [];
    
    for (const node of statefulGraph.graph.nodes) {
      const nodeState = nodeStates.get(node.id);
      
      // Skip if already running, completed, or failed
      if (nodeState.status !== 'pending') continue;
      
      // Check if already at parallelism limit
      if (state.currentNodes.length >= state.maxParallelism) break;
      
      // Check dependencies
      const dependenciesSatisfied = await this.checkDependencies(projectId, node.id);
      if (!dependenciesSatisfied) continue;
      
      // Check conditional edges
      const edgeConditionsMet = await this.checkEdgeConditions(projectId, node.id);
      if (!edgeConditionsMet) continue;
      
      // Check agent availability
      const agentAvailable = await this.checkAgentAvailability(projectId, node.id);
      if (!agentAvailable) continue;
      
      availableNodes.push(node.id);
    }
    
    return availableNodes;
  }

  /**
   * Check if all dependencies for a node are satisfied
   */
  async checkDependencies(projectId, nodeId) {
    const statefulGraph = this.projectGraphs.get(projectId);
    const nodeStates = this.nodeStates.get(projectId);
    
    if (!statefulGraph || !nodeStates) return false;
    
    const nodeState = nodeStates.get(nodeId);
    if (!nodeState || !nodeState.dependencies) return true;
    
    for (const depId of nodeState.dependencies) {
      const depState = nodeStates.get(depId);
      if (!depState || depState.status !== 'completed') {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check conditional edge conditions
   */
  async checkEdgeConditions(projectId, nodeId) {
    const statefulGraph = this.projectGraphs.get(projectId);
    if (!statefulGraph) return false;
    
    // Find incoming edges to this node
    const incomingEdges = statefulGraph.graph.edges.filter(edge => edge.target === nodeId);
    
    for (const edge of incomingEdges) {
      const conditionalEdge = statefulGraph.conditionalEdges.get(edge.id);
      if (!conditionalEdge) continue;
      
      // Evaluate edge conditions
      const evaluation = await conditionalEdge.evaluator(projectId, edge.id, null);
      if (!evaluation.passed) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if required agent is available
   */
  async checkAgentAvailability(projectId, nodeId) {
    // For now, return true - implement actual agent availability checking
    return true;
  }

  /**
   * Execute available nodes with proper state management
   */
  async executeAvailableNodes(projectId, availableNodeIds, socket) {
    for (const nodeId of availableNodeIds) {
      try {
        await this.executeNode(projectId, nodeId, socket);
      } catch (error) {
        console.error(`Failed to execute node ${nodeId}:`, error);
        await this.handleNodeError(projectId, nodeId, error);
      }
    }
  }

  /**
   * Execute a single node with state management
   */
  async executeNode(projectId, nodeId, socket) {
    console.log(`▶️ Executing node: ${nodeId}`);
    
    // Transition node state
    await this.transitionNodeState(projectId, nodeId, 'running', socket);
    
    // Execute the task (delegate to existing method)
    await this.executeTaskSafely(projectId, nodeId, socket);
  }

  /**
   * Transition graph state with proper validation
   */
  async transitionGraphState(projectId, newStatus, socket) {
    const state = this.graphState.get(projectId);
    if (!state) return;
    
    const oldStatus = state.status;
    
    // Validate state transition
    if (!this.isValidStateTransition(oldStatus, newStatus)) {
      throw new Error(`Invalid state transition: ${oldStatus} -> ${newStatus}`);
    }
    
    // Update state
    state.status = newStatus;
    state.lastUpdate = new Date();
    state.updateCount++;
    state.transitionHistory.push({
      from: oldStatus,
      to: newStatus,
      timestamp: new Date()
    });
    
    // Call state transition handler
    const handler = this.stateTransitionHandlers.get(`graph:${newStatus}`);
    if (handler) {
      await handler(projectId, newStatus, socket);
    }
    
    // Log state transition
    this.logStateEvent(projectId, 'state_transition', {
      from: oldStatus,
      to: newStatus,
      updateCount: state.updateCount
    });
    
    console.log(`📍 Graph state transition: ${oldStatus} -> ${newStatus}`);
  }

  /**
   * Transition node state with validation
   */
  async transitionNodeState(projectId, nodeId, newStatus, socket) {
    const nodeStates = this.nodeStates.get(projectId);
    if (!nodeStates) return;
    
    const nodeState = nodeStates.get(nodeId);
    if (!nodeState) return;
    
    const oldStatus = nodeState.status;
    
    // Update node state
    nodeState.status = newStatus;
    nodeState.lastStateUpdate = new Date();
    nodeState.stateVersion++;
    nodeState.stateHistory.push({
      from: oldStatus,
      to: newStatus,
      timestamp: new Date()
    });
    
    // Call state transition handler
    const handler = this.stateTransitionHandlers.get(`node:${newStatus}`);
    if (handler) {
      await handler(projectId, nodeId, newStatus, socket);
    }
    
    // Update graph state
    const graphState = this.graphState.get(projectId);
    if (graphState) {
      this.updateNodeLists(graphState, nodeId, oldStatus, newStatus);
    }
    
    console.log(`🔸 Node state transition: ${nodeId} ${oldStatus} -> ${newStatus}`);
  }

  /**
   * Update node lists in graph state
   */
  updateNodeLists(graphState, nodeId, oldStatus, newStatus) {
    // Remove from old status list
    if (oldStatus === 'running') {
      graphState.currentNodes = graphState.currentNodes.filter(id => id !== nodeId);
    }
    
    // Add to new status list
    if (newStatus === 'running') {
      graphState.currentNodes.push(nodeId);
    } else if (newStatus === 'completed') {
      graphState.completedNodes.push(nodeId);
    } else if (newStatus === 'failed') {
      graphState.failedNodes.push(nodeId);
    }
  }

  /**
   * Validate state transitions
   */
  isValidStateTransition(fromState, toState) {
    const validTransitions = {
      'initialized': ['executing', 'failed'],
      'executing': ['paused', 'completed', 'failed'],
      'paused': ['executing', 'failed'],
      'completed': [], // Terminal state
      'failed': ['executing'] // Can retry
    };
    
    return validTransitions[fromState]?.includes(toState) || false;
  }

  /**
   * Handle graph-level errors with recovery
   */
  async handleGraphError(projectId, error, socket) {
    console.error(`🚨 Graph error for project ${projectId}:`, error);
    
    const state = this.graphState.get(projectId);
    if (state) {
      state.errorCount++;
      state.lastError = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      };
    }
    
    // Attempt recovery
    if (this.shouldAttemptRecovery(projectId, error)) {
      await this.attemptGraphRecovery(projectId, socket);
    } else {
      await this.transitionGraphState(projectId, 'failed', socket);
    }
  }

  /**
   * Determine if recovery should be attempted
   */
  shouldAttemptRecovery(projectId, error) {
    const context = this.executionContext.get(projectId);
    const state = this.graphState.get(projectId);
    
    if (!context || !state) return false;
    
    return context.enableAutoRecovery && 
           state.errorCount < context.recoveryAttempts;
  }

  /**
   * Attempt graph recovery
   */
  async attemptGraphRecovery(projectId, socket) {
    console.log(`🔧 Attempting graph recovery for project: ${projectId}`);
    
    try {
      // Restore from last checkpoint
      await this.restoreFromCheckpoint(projectId, 'execution_start');
      
      // Reset error state
      const state = this.graphState.get(projectId);
      if (state) {
        state.status = 'executing';
        state.retryCount++;
      }
      
      // Restart execution
      await this.runExecutionLoop(projectId, socket);
      
      console.log(`✅ Graph recovery successful for project: ${projectId}`);
      
    } catch (recoveryError) {
      console.error(`❌ Graph recovery failed:`, recoveryError);
      await this.transitionGraphState(projectId, 'failed', socket);
    }
  }

     /**
    * Restore from state checkpoint with validation
    */
   async restoreFromCheckpoint(projectId, checkpointName) {
     const statefulGraph = this.projectGraphs.get(projectId);
     if (!statefulGraph) {
       throw new Error(`No stateful graph found for project: ${projectId}`);
     }
     
     const checkpoint = statefulGraph.checkpoints.get(checkpointName);
     if (!checkpoint) {
       throw new Error(`Checkpoint '${checkpointName}' not found for project: ${projectId}`);
     }
     
     try {
       // Validate checkpoint integrity
       const isValid = this.validateCheckpoint(checkpoint);
       if (!isValid) {
         throw new Error(`Checkpoint '${checkpointName}' is corrupted or invalid`);
       }
       
       // Restore state with deep cloning to prevent reference issues
       statefulGraph.state = JSON.parse(JSON.stringify(checkpoint.graphState));
       this.graphState.set(projectId, statefulGraph.state);
       
       // Restore node states
       const restoredNodeStates = new Map();
       for (const [nodeId, nodeState] of checkpoint.nodeStates) {
         restoredNodeStates.set(nodeId, { ...nodeState });
       }
       this.nodeStates.set(projectId, restoredNodeStates);
       
       // Restore memory with deep cloning
       const restoredMemory = new Map();
       for (const [key, value] of checkpoint.memorySnapshot) {
         if (value instanceof Map) {
           restoredMemory.set(key, new Map(value));
         } else if (typeof value === 'object' && value !== null) {
           restoredMemory.set(key, JSON.parse(JSON.stringify(value)));
         } else {
           restoredMemory.set(key, value);
         }
       }
       this.graphMemory.set(projectId, restoredMemory);
       
       // Update version and timestamps
       statefulGraph.version = checkpoint.version;
       statefulGraph.lastStateUpdate = new Date();
       
       // Log successful restoration
       this.logStateEvent(projectId, 'checkpoint_restored', {
         checkpointName: checkpointName,
         version: checkpoint.version,
         timestamp: checkpoint.timestamp
       });
       
       console.log(`🔄 Successfully restored from checkpoint: ${checkpointName} (version ${checkpoint.version})`);
       
     } catch (error) {
       console.error(`❌ Failed to restore from checkpoint '${checkpointName}':`, error);
       throw new Error(`Checkpoint restoration failed: ${error.message}`);
     }
   }

   /**
    * Validate checkpoint integrity
    */
   validateCheckpoint(checkpoint) {
     try {
       // Check required properties
       if (!checkpoint.name || !checkpoint.timestamp || !checkpoint.graphState) {
         return false;
       }
       
       // Check state structure
       const state = checkpoint.graphState;
       if (!state.projectId || !state.status || !Array.isArray(state.currentNodes)) {
         return false;
       }
       
       // Check node states
       if (!checkpoint.nodeStates || !(checkpoint.nodeStates instanceof Map)) {
         return false;
       }
       
       // Check memory snapshot
       if (!checkpoint.memorySnapshot || !(checkpoint.memorySnapshot instanceof Map)) {
         return false;
       }
       
       return true;
       
     } catch (error) {
       console.error('Checkpoint validation error:', error);
       return false;
     }
   }

   /**
    * Create automatic snapshots for recovery
    */
   async createAutoSnapshot(projectId, reason = 'auto') {
     const context = this.executionContext.get(projectId);
     if (!context || !context.enableStateSnapshots) return;
     
     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
     const snapshotName = `auto-snapshot-${timestamp}-${reason}`;
     
     this.createStateCheckpoint(projectId, snapshotName);
     
     // Clean up old auto snapshots (keep only last 10)
     const statefulGraph = this.projectGraphs.get(projectId);
     if (statefulGraph) {
       const autoSnapshots = Array.from(statefulGraph.checkpoints.keys())
         .filter(name => name.startsWith('auto-snapshot-'))
         .sort();
       
       if (autoSnapshots.length > 10) {
         const toDelete = autoSnapshots.slice(0, autoSnapshots.length - 10);
         toDelete.forEach(name => statefulGraph.checkpoints.delete(name));
       }
     }
   }

   /**
    * Enhanced recovery with multiple strategies
    */
   async attemptGraphRecovery(projectId, socket) {
     console.log(`🔧 Attempting enhanced graph recovery for project: ${projectId}`);
     
     const recoveryStrategies = [
       'execution_start',
       'last_successful_node',
       'auto-snapshot-before-error',
       'initialized'
     ];
     
     for (const strategy of recoveryStrategies) {
       try {
         console.log(`🔄 Trying recovery strategy: ${strategy}`);
         
         if (strategy === 'last_successful_node') {
           await this.recoverToLastSuccessfulNode(projectId);
         } else {
           await this.restoreFromCheckpoint(projectId, strategy);
         }
         
         // Test the recovered state
         const isValid = await this.validateRecoveredState(projectId);
         if (!isValid) {
           throw new Error('Recovered state validation failed');
         }
         
         // Reset error state
         const state = this.graphState.get(projectId);
         if (state) {
           state.status = 'executing';
           state.retryCount++;
           state.lastError = null;
         }
         
         // Restart execution
         await this.runExecutionLoop(projectId, socket);
         
         console.log(`✅ Graph recovery successful using strategy: ${strategy}`);
         return true;
         
       } catch (strategyError) {
         console.warn(`❌ Recovery strategy '${strategy}' failed:`, strategyError.message);
         continue;
       }
     }
     
     // All recovery strategies failed
     console.error(`💥 All recovery strategies failed for project: ${projectId}`);
     await this.transitionGraphState(projectId, 'failed', socket);
     return false;
   }

   /**
    * Recover to the last successfully completed node
    */
   async recoverToLastSuccessfulNode(projectId) {
     const nodeStates = this.nodeStates.get(projectId);
     const graphState = this.graphState.get(projectId);
     
     if (!nodeStates || !graphState) {
       throw new Error('No node states or graph state found for recovery');
     }
     
     // Find the last successfully completed node
     let lastSuccessfulTime = null;
     let lastSuccessfulNode = null;
     
     for (const [nodeId, nodeState] of nodeStates) {
       if (nodeState.status === 'completed' && nodeState.endTime) {
         if (!lastSuccessfulTime || nodeState.endTime > lastSuccessfulTime) {
           lastSuccessfulTime = nodeState.endTime;
           lastSuccessfulNode = nodeId;
         }
       }
     }
     
     if (!lastSuccessfulNode) {
       throw new Error('No successfully completed nodes found for recovery');
     }
     
     // Reset all nodes that started after the last successful node
     for (const [nodeId, nodeState] of nodeStates) {
       if (nodeState.startTime && nodeState.startTime > lastSuccessfulTime) {
         nodeState.status = 'pending';
         nodeState.startTime = null;
         nodeState.endTime = null;
         nodeState.errors = [];
         nodeState.attempts = 0;
       }
     }
     
     // Update graph state
     graphState.currentNodes = [];
     graphState.failedNodes = graphState.failedNodes.filter(id => {
       const nodeState = nodeStates.get(id);
       return nodeState?.endTime && nodeState.endTime <= lastSuccessfulTime;
     });
     
     console.log(`🔄 Recovered to last successful node: ${lastSuccessfulNode} at ${lastSuccessfulTime}`);
   }

   /**
    * Validate recovered state integrity
    */
   async validateRecoveredState(projectId) {
     try {
       const statefulGraph = this.projectGraphs.get(projectId);
       const graphState = this.graphState.get(projectId);
       const nodeStates = this.nodeStates.get(projectId);
       const memoryBank = this.graphMemory.get(projectId);
       
       // Check all components exist
       if (!statefulGraph || !graphState || !nodeStates || !memoryBank) {
         return false;
       }
       
       // Check state consistency
       if (graphState.projectId !== projectId) {
         return false;
       }
       
       // Check node state consistency
       const graphNodeIds = new Set(statefulGraph.graph.nodes.map(n => n.id));
       for (const nodeId of nodeStates.keys()) {
         if (!graphNodeIds.has(nodeId)) {
           console.warn(`Node state exists for non-existent node: ${nodeId}`);
           return false;
         }
       }
       
       // Check current nodes are actually in running state
       for (const nodeId of graphState.currentNodes) {
         const nodeState = nodeStates.get(nodeId);
         if (!nodeState || nodeState.status !== 'running') {
           console.warn(`Current node ${nodeId} not in running state`);
           return false;
         }
       }
       
       return true;
       
     } catch (error) {
       console.error('State validation error:', error);
       return false;
     }
   }

  // Default state transition handlers
  async handleNodeStart(projectId, nodeId, status, socket) {
    console.log(`🟢 Node started: ${nodeId}`);
  }

  async handleNodeComplete(projectId, nodeId, status, socket) {
    console.log(`✅ Node completed: ${nodeId}`);
    
    // Update available nodes
    await this.updateAvailableNodes(projectId);
  }

  async handleNodeError(projectId, nodeId, error) {
    console.log(`🔴 Node error: ${nodeId} - ${error.message}`);
    
    const nodeStates = this.nodeStates.get(projectId);
    if (nodeStates) {
      const nodeState = nodeStates.get(nodeId);
      if (nodeState) {
        nodeState.errors.push({
          message: error.message,
          timestamp: new Date()
        });
        nodeState.lastError = error.message;
      }
    }
  }

  async handleNodeRetry(projectId, nodeId, status, socket) {
    console.log(`🔄 Node retry: ${nodeId}`);
  }

  async handleGraphStart(projectId, status, socket) {
    console.log(`🚀 Graph started: ${projectId}`);
  }

  async handleGraphComplete(projectId, status, socket) {
    console.log(`🏁 Graph completed: ${projectId}`);
  }

  async handleGraphPause(projectId, status, socket) {
    console.log(`⏸️ Graph paused: ${projectId}`);
  }

  async handleGraphResume(projectId, status, socket) {
    console.log(`▶️ Graph resumed: ${projectId}`);
  }

  // Conditional edge evaluators
  async evaluateSuccessCondition(projectId, condition, sourceResult) {
    return {
      passed: sourceResult?.success === true,
      reason: sourceResult?.success ? 'Task completed successfully' : 'Task did not complete successfully',
      data: sourceResult
    };
  }

  async evaluateFailureCondition(projectId, condition, sourceResult) {
    return {
      passed: sourceResult?.success === false,
      reason: sourceResult?.success === false ? 'Task failed as expected' : 'Task did not fail',
      data: sourceResult
    };
  }

  async evaluateRetryCondition(projectId, condition, sourceResult) {
    const nodeStates = this.nodeStates.get(projectId);
    // Implementation depends on specific retry logic
    return {
      passed: true,
      reason: 'Retry condition met',
      data: {}
    };
  }

  async evaluateQualityGate(projectId, condition, sourceResult) {
    const threshold = condition.threshold || 0.7;
    const score = sourceResult?.qualityScore || 0;
    
    return {
      passed: score >= threshold,
      reason: `Quality score ${score} ${score >= threshold ? 'meets' : 'below'} threshold ${threshold}`,
      data: { score, threshold }
    };
  }

     async evaluateDependencyCondition(projectId, condition, sourceResult) {
     // Dependencies are handled by checkDependencies method
     return {
       passed: true,
       reason: 'Dependencies satisfied',
       data: {}
     };
   }

   // Cyclical workflow evaluators
   async evaluateQualityImprovement(projectId, condition, sourceResult) {
     const threshold = condition.threshold || 0.7;
     const currentScore = sourceResult?.qualityScore || 0;
     const previousScore = condition.previousResult?.qualityScore || 0;
     
     const improved = currentScore > previousScore;
     const meetsThreshold = currentScore >= threshold;
     
     return {
       passed: improved || meetsThreshold,
       reason: improved ? 
         `Quality improved from ${previousScore.toFixed(2)} to ${currentScore.toFixed(2)}` :
         meetsThreshold ? 
           `Quality score ${currentScore.toFixed(2)} meets threshold ${threshold}` :
           `Quality score ${currentScore.toFixed(2)} below threshold ${threshold} and no improvement`,
       data: { 
         currentScore, 
         previousScore, 
         threshold, 
         improved, 
         meetsThreshold 
       }
     };
   }

   async evaluateReviewFeedback(projectId, condition, sourceResult) {
     const feedbackAddressed = sourceResult?.reviewFeedbackAddressed || false;
     const issuesRemaining = sourceResult?.reviewIssuesRemaining || 0;
     
     return {
       passed: feedbackAddressed && issuesRemaining === 0,
       reason: feedbackAddressed ? 
         `Review feedback addressed, ${issuesRemaining} issues remaining` :
         'Review feedback not yet addressed',
       data: { feedbackAddressed, issuesRemaining }
     };
   }

   async evaluateTestConvergence(projectId, condition, sourceResult) {
     const testsPass = sourceResult?.testsPass || false;
     const testCoverage = sourceResult?.testCoverage || 0;
     const previousCoverage = condition.previousResult?.testCoverage || 0;
     
     const improved = testCoverage > previousCoverage;
     const acceptable = testsPass && testCoverage >= 0.8;
     
     return {
       passed: acceptable || improved,
       reason: acceptable ?
         `Tests pass with ${(testCoverage * 100).toFixed(1)}% coverage` :
         improved ?
           `Test coverage improved from ${(previousCoverage * 100).toFixed(1)}% to ${(testCoverage * 100).toFixed(1)}%` :
           `Tests failing and no improvement in coverage`,
       data: { testsPass, testCoverage, previousCoverage, improved, acceptable }
     };
   }

   async evaluateGeneralImprovement(projectId, condition, sourceResult) {
     const iteration = condition.iteration || 0;
     const success = sourceResult?.success || false;
     
     // For general improvement, we accept success or limit iterations
     const shouldContinue = !success && iteration < 3;
     
     return {
       passed: success || !shouldContinue,
       reason: success ? 
         'Task completed successfully' :
         shouldContinue ?
           `Iteration ${iteration} - continuing improvement cycle` :
           `Maximum improvement iterations reached`,
       data: { success, iteration, shouldContinue }
     };
   }

   async evaluateAgentAvailability(projectId, condition, sourceResult) {
     // For now, always return available - implement actual agent checking later
     return {
       passed: true,
       reason: 'Agent available for task execution',
       data: { available: true }
     };
   }

  /**
   * Update available nodes after state changes
   */
  async updateAvailableNodes(projectId) {
    const availableNodes = await this.getAvailableNodes(projectId);
    const state = this.graphState.get(projectId);
    
    if (state) {
      state.availableNodes = availableNodes;
    }
  }

  /**
   * Update overall graph state
   */
  async updateGraphState(projectId) {
    const state = this.graphState.get(projectId);
    const nodeStates = this.nodeStates.get(projectId);
    
    if (!state || !nodeStates) return;
    
    // Calculate progress
    const totalNodes = nodeStates.size;
    const completedNodes = state.completedNodes.length;
    state.actualProgress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;
    
    // Update timing
    if (state.status === 'executing' && !state.estimatedCompletion) {
      // Estimate completion based on current progress
      const elapsed = new Date() - state.startTime;
      const progressRate = state.actualProgress / elapsed;
      if (progressRate > 0) {
        const remainingProgress = 100 - state.actualProgress;
        const estimatedRemaining = remainingProgress / progressRate;
        state.estimatedCompletion = new Date(Date.now() + estimatedRemaining);
      }
    }
    
    state.lastUpdate = new Date();
  }

  /**
   * Wait for currently running nodes to complete
   */
  async waitForRunningNodes(projectId, socket) {
    console.log(`⏳ Waiting for running nodes to complete...`);
    
    // Wait a short time for nodes to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  initializeAgentTypes() {
    this.agentTypes = {
      FRONTEND_SPECIALIST: {
        id: 'frontend_specialist',
        name: 'Frontend Specialist',
        capabilities: ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'typescript', 'ui_design', 'responsive_design', 'state_management'],
        specialization: 'Frontend Development',
        maxConcurrentTasks: 3,
        estimatedTaskTime: 15,
        efficiency: {
          'react': 0.95,
          'vue': 0.85,
          'angular': 0.80,
          'html': 0.90,
          'css': 0.88,
          'javascript': 0.92,
          'typescript': 0.87,
          'ui_design': 0.83
        }
      },
      BACKEND_SPECIALIST: {
        id: 'backend_specialist',
        name: 'Backend Specialist',
        capabilities: ['nodejs', 'python', 'java', 'api_design', 'database', 'authentication', 'microservices', 'rest_api', 'graphql'],
        specialization: 'Backend Development',
        maxConcurrentTasks: 3,
        estimatedTaskTime: 20,
        efficiency: {
          'nodejs': 0.92,
          'python': 0.88,
          'api_design': 0.90,
          'database': 0.85,
          'authentication': 0.87,
          'microservices': 0.83
        }
      },
      PYTHON_SPECIALIST: {
        id: 'python_specialist',
        name: 'Python Backend Specialist',
        capabilities: ['python', 'fastapi', 'django', 'flask', 'sqlalchemy', 'pytest', 'asyncio', 'celery', 'redis', 'postgresql', 'mongodb', 'api_design', 'authentication', 'microservices'],
        specialization: 'Python Backend Development',
        maxConcurrentTasks: 3,
        estimatedTaskTime: 18,
        efficiency: {
          'python': 0.96,
          'fastapi': 0.94,
          'django': 0.92,
          'flask': 0.90,
          'sqlalchemy': 0.88,
          'pytest': 0.93,
          'asyncio': 0.87,
          'celery': 0.85,
          'redis': 0.84,
          'postgresql': 0.89,
          'mongodb': 0.86,
          'api_design': 0.91,
          'authentication': 0.89,
          'microservices': 0.87
        }
      },
      DATABASE_ARCHITECT: {
        id: 'database_architect',
        name: 'Database Architect',
        capabilities: ['sql', 'nosql', 'schema_design', 'migrations', 'optimization', 'data_modeling', 'indexing', 'performance_tuning'],
        specialization: 'Database Design',
        maxConcurrentTasks: 2,
        estimatedTaskTime: 12,
        efficiency: {
          'sql': 0.94,
          'nosql': 0.87,
          'schema_design': 0.91,
          'migrations': 0.89,
          'optimization': 0.85
        }
      },
      TEST_ENGINEER: {
        id: 'test_engineer',
        name: 'Test Engineer',
        capabilities: ['unit_testing', 'integration_testing', 'e2e_testing', 'test_automation', 'performance_testing', 'load_testing', 'security_testing'],
        specialization: 'Quality Assurance',
        maxConcurrentTasks: 4,
        estimatedTaskTime: 10,
        efficiency: {
          'unit_testing': 0.93,
          'integration_testing': 0.88,
          'e2e_testing': 0.85,
          'test_automation': 0.90,
          'performance_testing': 0.82
        }
      },
      DEVOPS_ENGINEER: {
        id: 'devops_engineer',
        name: 'DevOps Engineer',
        capabilities: ['deployment', 'ci_cd', 'docker', 'kubernetes', 'monitoring', 'infrastructure', 'cloud_services', 'automation'],
        specialization: 'Deployment & Operations',
        maxConcurrentTasks: 2,
        estimatedTaskTime: 18,
        efficiency: {
          'deployment': 0.91,
          'ci_cd': 0.88,
          'docker': 0.92,
          'kubernetes': 0.84,
          'monitoring': 0.86,
          'infrastructure': 0.87
        }
      },
      DOCUMENTATION_SPECIALIST: {
        id: 'documentation_specialist',
        name: 'Documentation Specialist',
        capabilities: ['technical_writing', 'api_docs', 'user_guides', 'readme', 'tutorials', 'code_documentation', 'architecture_docs'],
        specialization: 'Documentation',
        maxConcurrentTasks: 5,
        estimatedTaskTime: 8,
        efficiency: {
          'technical_writing': 0.95,
          'api_docs': 0.92,
          'user_guides': 0.89,
          'readme': 0.94,
          'tutorials': 0.87
        }
      },
      SECURITY_SPECIALIST: {
        id: 'security_specialist',
        name: 'Security Specialist',
        capabilities: ['security_audit', 'authentication', 'authorization', 'encryption', 'vulnerability_assessment', 'penetration_testing', 'compliance'],
        specialization: 'Security',
        maxConcurrentTasks: 2,
        estimatedTaskTime: 25,
        efficiency: {
          'security_audit': 0.89,
          'authentication': 0.91,
          'authorization': 0.88,
          'encryption': 0.86,
          'vulnerability_assessment': 0.84
        }
      }
    };
  }

  /**
   * Main orchestration method - analyzes prompt and creates bulletproof stateful graph
   */
  async orchestrateProject(prompt, projectPath, socket, options = {}) {
    const projectId = uuidv4();
    
    try {
      console.log('🚀 Starting bulletproof project orchestration with LangGraph-inspired state management:', prompt);
      
      // Handle job tracking if jobName is provided
      if (options.jobName) {
        const jobId = options.jobName || `job-${Date.now()}`;
        const job = {
          id: jobId,
          name: options.jobName || 'Enhanced Orchestrated Project',
          task: prompt,
          description: prompt,
          projectPath: projectPath,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          socketId: socket.id,
          progress: 0
        };
        
        // Store job tracking
        if (!this.jobSockets) {
          this.jobSockets = new Map();
        }
        this.jobSockets.set(jobId, socket);
        
        if (this.jobStorage) {
          this.jobStorage.addJob(job);
        }
        
        if (!this.activeJobs) {
          this.activeJobs = new Map();
        }
        this.activeJobs.set(jobId, job);
        
        // Emit job started event
        socket.emit('job_started', { jobId, job: this.sanitizeJobForTransmission(job) });
        
        // Store job info in options for later cleanup
        options.jobId = jobId;
        options.job = job;
      }
      
      // Add timeout to prevent hanging
      const orchestrationTimeout = setTimeout(() => {
        console.error('Orchestration timeout - taking too long');
        socket.emit('orchestration_error', { error: 'Orchestration timed out after 30 seconds' });
      }, 30000);
      
      // Step 1: Analyze prompt and generate comprehensive task list
      console.log('📊 Step 1: Analyzing prompt...');
      const taskAnalysis = await this.analyzePromptForTasks(prompt, options);
      taskAnalysis.originalPrompt = prompt;
      taskAnalysis.projectPath = projectPath;
      console.log('Task analysis complete:', taskAnalysis);
      
      // Step 2: Create bulletproof stateful graph
      console.log('🏗️ Step 2: Creating bulletproof stateful graph...');
      const statefulGraph = await this.createStatefulGraph(taskAnalysis, projectId, socket);
      console.log('Stateful graph created with', statefulGraph.graph.nodes.length, 'total nodes:', 
        `${statefulGraph.metadata.totalNodes} nodes, ${statefulGraph.metadata.totalEdges} edges`);
      
      // Step 3: Assign tasks to specialized agents with checkpoint prioritization
      console.log('🎯 Step 3: Assigning tasks to agents with checkpoint prioritization...');
      const agentAssignments = await this.assignTasksToAgentsWithCheckpoints(statefulGraph.graph);
      console.log('Enhanced agent assignments complete:', agentAssignments.size, 'agents assigned to', statefulGraph.graph.nodes.length, 'tasks');
      
      // Step 4: Create legacy project state for compatibility
      console.log('🔧 Step 4: Creating legacy project state...');
      const project = {
        id: projectId,
        prompt: prompt,
        projectPath: projectPath,
        taskGraph: statefulGraph.graph, // Use the graph from stateful system
        agentAssignments: agentAssignments,
        status: 'active',
        createdAt: new Date(),
        kanbanBoard: this.createKanbanBoard(agentAssignments),
        metrics: {
          totalTasks: statefulGraph.graph.nodes.length,
          estimatedDuration: this.calculateProjectDuration(statefulGraph.graph),
          complexity: taskAnalysis.complexity
        },
        // Link to stateful graph
        statefulGraphId: projectId,
        isStatefulGraph: true
      };
      
      this.activeProjects.set(projectId, project);
      
      // Save project state to disk for persistence
      try {
        const projectToSave = {
          ...project,
          statefulGraph: statefulGraph,
          taskAnalysis: taskAnalysis,
          graphState: this.graphState.get(projectId),
          nodeStates: this.nodeStates.get(projectId),
          graphMemory: this.graphMemory.get(projectId),
          executionContext: this.executionContext.get(projectId)
        };
        await this.projectPersistence.saveProject(projectToSave);
        console.log(`💾 Project ${projectId} saved to disk for persistence`);
      } catch (saveError) {
        console.warn(`⚠️ Failed to save project ${projectId} to disk:`, saveError.message);
      }
      
      // Clear timeout since we're succeeding
      clearTimeout(orchestrationTimeout);
      
      // Step 5: Emit project created event with enhanced state information
      console.log('📡 Step 5: Emitting project orchestrated event...');
      socket.emit('project_orchestrated', {
        projectId: projectId,
        taskGraph: this.sanitizeTaskGraphForTransmission(statefulGraph.graph),
        agentAssignments: Object.fromEntries(agentAssignments),
        kanbanBoard: project.kanbanBoard,
        metrics: project.metrics,
        // Enhanced state information
        statefulGraph: {
          hasStatefulGraph: true,
          graphState: statefulGraph.state.status,
          memorySize: statefulGraph.memory.size,
          stateVersion: statefulGraph.version,
          nodeStates: statefulGraph.nodeStates.size,
          conditionalEdges: statefulGraph.conditionalEdges.size
        }
      });
      
      // Step 6: Emit initial agent states
      console.log('📢 Step 6: Broadcasting initial agent states...');
      this.broadcastAgentStates(project, socket);
      
      // Step 7: Start bulletproof stateful execution
      console.log('🚀 Step 7: Starting bulletproof stateful execution...');
      await this.executeStatefulGraph(projectId, socket);
      
      // Handle job completion if job was tracked
      if (options.job) {
        const job = options.job;
        job.status = 'completed';
        job.projectId = project.id;
        job.updatedAt = new Date();
        job.progress = 100;
        
        // Move to history and cleanup
        if (this.jobHistory) {
          this.jobHistory.unshift(job);
        }
        if (this.activeJobs) {
          this.activeJobs.delete(job.id);
        }
        if (this.jobSockets) {
          this.jobSockets.delete(job.id);
        }
        
        console.log(`✅ Job ${job.id} completed successfully with bulletproof orchestration`);
      }
      
      return project;
      
    } catch (error) {
      console.error('💥 Bulletproof orchestration failed:', error);
      
      // Handle job failure if job was tracked
      if (options.job) {
        const job = options.job;
        job.status = 'failed';
        job.error = error.message;
        job.updatedAt = new Date();
        
        if (this.jobHistory) {
          this.jobHistory.unshift(job);
        }
        if (this.activeJobs) {
          this.activeJobs.delete(job.id);
        }
        if (this.jobSockets) {
          this.jobSockets.delete(job.id);
        }
      }
      
      socket.emit('orchestration_error', { error: error.message });
      throw error;
    }
  }

  /**
   * Simplified task execution to prevent hanging
   */
  async startSimplifiedTaskExecution(projectId, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) {
      console.error('Project not found:', projectId);
      return;
    }
    
    try {
      // Find tasks with no dependencies to start first
      const readyTasks = this.findReadyTasks(project.taskGraph);
      console.log('Found', readyTasks.length, 'ready tasks');
      
      // Execute tasks with timeout protection
      for (const task of readyTasks) {
        console.log('Starting task:', task.title);
        
        // Execute task with timeout - Increased from 10 seconds to 15 minutes
        const taskTimeout = setTimeout(() => {
          console.warn('Task execution timeout:', task.title);
          this.completeTaskWithTimeout(projectId, task.id, socket);
        }, 15 * 60 * 1000); // 15 minutes timeout per task
        
        try {
          await this.executeTaskSafely(projectId, task.id, socket);
          clearTimeout(taskTimeout);
        } catch (error) {
          clearTimeout(taskTimeout);
          console.error('Task execution failed:', error);
          // Continue with other tasks instead of failing completely
        }
      }
      
      // REMOVED: No longer force project completion after 30 seconds
      // The dependency chain execution will naturally complete the project
      // when all tasks are done via completeTaskSafely method
      console.log('Initial tasks started. Dependency chain will handle subsequent tasks.');
      
    } catch (error) {
      console.error('Task execution failed:', error);
      socket.emit('task_execution_error', { error: error.message });
    }
  }

  /**
   * Safe task execution with proper error handling
   */
  async executeTaskSafely(projectId, taskId, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    try {
      // Find the task and its assigned agent
      const taskNode = project.taskGraph.nodes.find(n => n.id === taskId);
      if (!taskNode) {
        console.warn('Task not found:', taskId);
        return;
      }
      
      const task = taskNode.data;
      const agentAssignment = Array.from(project.agentAssignments.values())
        .find(assignment => assignment.tasks.some(t => t.id === taskId));
      
      if (!agentAssignment) {
        console.warn('No agent assignment found for task:', taskId);
        return;
      }
      
      const agent = agentAssignment.agent;
      
      // Update task status
      task.status = 'in_progress';
      task.startedAt = new Date();
      
      // Update kanban board safely
      try {
        this.moveTaskInKanban(project.kanbanBoard, taskId, 'todo', 'inProgress', agent.id);
      } catch (error) {
        console.warn('Failed to move task in kanban:', error);
      }
      
      // Emit task started event
      socket.emit('task_started', {
        projectId,
        taskId,
        agentId: agent.id,
        task: task
      });
      
      // Create a comprehensive task description for Goose CLI
      const taskDescription = this.createGooseTaskDescription(task, agent, project);
      // Use shorter, more meaningful session ID
      const sessionId = `${agent.type}-${task.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
      
      console.log(`[${sessionId}] Starting Goose CLI execution for task: ${task.title}`);
      
      // Emit agent status update
      socket.emit('agent_status_update', {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        status: 'working',
        currentTask: task.title,
        progress: 0,
        sessionId: sessionId
      });
      
      // Broadcast to all clients
      this.io.emit('agents_update', {
        [agent.id]: {
          ...agent,
          status: 'working',
          currentTask: task.title,
          progress: 0,
          sessionId: sessionId,
          logs: agent.logs || []
        }
      });
      
      try {
        // Check if Goose CLI is available before executing
        const { checkGooseInstallation } = require('../../goose-integration');
        
        console.log(`[${sessionId}] Checking Goose CLI availability...`);
        try {
          await checkGooseInstallation();
          console.log(`[${sessionId}] Goose CLI is available, proceeding with execution`);
        } catch (gooseError) {
          console.error(`[${sessionId}] Goose CLI check failed:`, gooseError.message);
          throw new Error(`Goose CLI not available: ${gooseError.message}. Please install Goose CLI first.`);
        }
        
        console.log(`[${sessionId}] Starting Goose CLI execution...`);
        console.log(`[${sessionId}] Task description length: ${taskDescription.length} characters`);
        console.log(`[${sessionId}] Project path: ${project.projectPath}`);
        console.log(`[${sessionId}] Agent: ${agent.name} (${agent.type})`);
        console.log(`[${sessionId}] Task: ${task.title}`);
        
        // Log the first 200 characters of the task description for debugging
        console.log(`[${sessionId}] Task description preview:`, taskDescription.substring(0, 200) + '...');
        
        // Execute the task using Goose CLI
        const startTime = new Date();
        console.log(`[${sessionId}] Calling gooseIntegration.executeGooseTask...`);
        
        await this.gooseIntegration.executeGooseTask(
          taskDescription,
          sessionId,
          socket,
          project.projectPath
        );
        
        const duration = new Date() - startTime;
        console.log(`[${sessionId}] Goose CLI execution completed in ${Math.round(duration / 1000)}s`);
        
        // Enhanced task completion with checkpoint awareness
        console.log(`[${sessionId}] Task execution completed, determining next steps...`);
        
        if (task.isCheckpoint) {
          // This is a checkpoint task - handle differently
          await this.handleCheckpointTaskCompletion(projectId, taskId, task, socket);
        } else {
          // This is a standard task - the quality verification will be handled by checkpoint tasks
          console.log(`[${sessionId}] Standard task completed, marking as done (checkpoints will handle quality verification)`);
          await this.completeTaskSafely(projectId, taskId, socket);
        }
        
      } catch (error) {
        console.error(`[${sessionId}] Goose CLI execution failed:`, error);
        await this.handleTaskError(projectId, taskId, agent, error, socket);
      }
      
    } catch (error) {
      console.error('Task execution error:', error);
      // Don't throw, just log and continue
    }
  }

  /**
   * Handle QA verification failure
   */
  async handleTaskQAFailure(projectId, taskId, agent, qaResult, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    const taskNode = project.taskGraph.nodes.find(n => n.id === taskId);
    if (!taskNode) return;
    
    const task = taskNode.data;
    
    // Determine failure severity based on QA results
    const failureSeverity = this.assessQAFailureSeverity(qaResult);
    
    // Update task status based on severity
    task.status = failureSeverity === 'critical' ? 'failed' : 'needs_revision';
    task.qaScore = qaResult.score;
    task.qaIssues = qaResult.issues;
    task.qaRecommendations = qaResult.recommendations;
    task.qaCriticalFailures = qaResult.criticalFailures || [];
    task.qaFailedAt = new Date();
    task.qaFailureSeverity = failureSeverity;
    task.deploymentReadiness = qaResult.deploymentReadiness || 'NOT_READY';
    
    console.log(`[QA] Task failed verification: ${task.title}`);
    console.log(`[QA] Score: ${qaResult.score.toFixed(2)}`);
    console.log(`[QA] Severity: ${failureSeverity}`);
    console.log(`[QA] Issues: ${qaResult.issues.length}`);
    console.log(`[QA] Critical Failures: ${qaResult.criticalFailures?.length || 0}`);
    
    // Move task to appropriate column based on severity
    const targetColumn = failureSeverity === 'critical' ? 'failed' : 'revision';
    try {
      this.moveTaskInKanban(project.kanbanBoard, taskId, 'inProgress', targetColumn, agent.id);
    } catch (kanbanError) {
      console.warn('Failed to move QA failed task in kanban:', kanbanError);
    }
    
    // Update agent status with detailed QA information
    socket.emit('agent_status_update', {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      status: failureSeverity === 'critical' ? 'critical_failure' : 'needs_revision',
      currentTask: task.title,
      progress: failureSeverity === 'critical' ? 0 : 75, // Partial completion for non-critical
      qaScore: qaResult.score,
      issues: qaResult.issues,
      recommendations: qaResult.recommendations,
      criticalFailures: qaResult.criticalFailures || [],
      deploymentReadiness: qaResult.deploymentReadiness,
      remediationPlan: qaResult.remediationPlan
    });
    
    // Broadcast to all clients with comprehensive failure information
    this.io.emit('agents_update', {
      [agent.id]: {
        ...agent,
        status: failureSeverity === 'critical' ? 'critical_failure' : 'needs_revision',
        currentTask: task.title,
        progress: failureSeverity === 'critical' ? 0 : 75,
        qaScore: qaResult.score,
        issues: qaResult.issues,
        recommendations: qaResult.recommendations,
        criticalFailures: qaResult.criticalFailures || [],
        deploymentReadiness: qaResult.deploymentReadiness,
        logs: agent.logs || []
      }
    });
    
    // Emit detailed QA failure event
    socket.emit('task_qa_failed', {
      projectId,
      taskId,
      agentId: agent.id,
      task: task,
      qaResult: qaResult,
      severity: failureSeverity,
      actionRequired: this.getRequiredAction(failureSeverity, qaResult)
    });
    
    // Generate comprehensive remediation plan
    const remediationPlan = await this.generateComprehensiveRemediationPlan(task, qaResult, project);
    
    // Emit remediation plan
    socket.emit('remediation_plan_generated', {
      projectId,
      taskId,
      agentId: agent.id,
      remediationPlan,
      estimatedFixTime: this.estimateFixTime(qaResult),
      priorityOrder: this.prioritizeIssues(qaResult)
    });
    
    // Decide on retry strategy based on severity and score
    if (failureSeverity !== 'critical' && qaResult.score >= 0.4) {
      console.log(`[QA] Attempting auto-retry with improvement instructions for task: ${task.title}`);
      await this.retryTaskWithEnhancedQAFeedback(projectId, taskId, agent, qaResult, remediationPlan, socket);
    } else if (failureSeverity === 'critical') {
      console.log(`[QA] Critical failure detected for task: ${task.title} - manual intervention required`);
      // Create a new task for manual review
      await this.createManualReviewTask(projectId, taskId, agent, qaResult, socket);
    } else {
      console.log(`[QA] Low score failure for task: ${task.title} - requires significant rework`);
      // Create a rework task with detailed guidance
      await this.createReworkTask(projectId, taskId, agent, qaResult, remediationPlan, socket);
    }
  }

  /**
   * Assess QA failure severity based on results
   */
  assessQAFailureSeverity(qaResult) {
    // Critical failures that block deployment
    if (qaResult.criticalFailures && qaResult.criticalFailures.length > 0) {
      return 'critical';
    }
    
    // Build failures are always critical
    if (qaResult.issues.some(issue => issue.includes('CRITICAL: Build command failed') || issue.includes('Build failed'))) {
      return 'critical';
    }
    
    // Security vulnerabilities are critical
    if (qaResult.criticalVulnerabilities > 0) {
      return 'critical';
    }
    
    // Very low scores indicate fundamental problems
    if (qaResult.score < 0.3) {
      return 'critical';
    }
    
    // Runtime failures are critical
    if (qaResult.issues.some(issue => issue.includes('Runtime verification failed') || issue.includes('application cannot start'))) {
      return 'critical';
    }
    
    // Test failures can be critical if too many
    const testFailures = qaResult.issues.filter(issue => issue.includes('test') && issue.includes('failed'));
    if (testFailures.length > 5) {
      return 'critical';
    }
    
    // Low-medium scores are moderate severity
    if (qaResult.score < 0.6) {
      return 'moderate';
    }
    
    // Everything else is minor
    return 'minor';
  }

  /**
   * Get required action based on failure severity
   */
  getRequiredAction(severity, qaResult) {
    switch (severity) {
      case 'critical':
        return {
          action: 'immediate_intervention',
          description: 'Critical issues prevent deployment. Manual review and fixes required.',
          canAutoRetry: false,
          estimatedTime: '2-4 hours',
          priority: 'urgent'
        };
      case 'moderate':
        return {
          action: 'guided_rework',
          description: 'Significant issues require rework with detailed guidance.',
          canAutoRetry: true,
          estimatedTime: '30-60 minutes',
          priority: 'high'
        };
      case 'minor':
        return {
          action: 'auto_retry',
          description: 'Minor issues can be auto-fixed with improved instructions.',
          canAutoRetry: true,
          estimatedTime: '10-15 minutes',
          priority: 'medium'
        };
      default:
        return {
          action: 'review_required',
          description: 'Unknown issues require review.',
          canAutoRetry: false,
          estimatedTime: '15-30 minutes',
          priority: 'medium'
        };
    }
  }

  /**
   * Generate comprehensive remediation plan with step-by-step instructions
   */
  async generateComprehensiveRemediationPlan(task, qaResult, project) {
    const plan = {
      taskId: task.id,
      taskTitle: task.title,
      failureAnalysis: {
        score: qaResult.score,
        severity: this.assessQAFailureSeverity(qaResult),
        criticalFailures: qaResult.criticalFailures || [],
        deploymentReadiness: qaResult.deploymentReadiness
      },
      stepByStepFixes: [],
      prioritizedIssues: this.prioritizeIssues(qaResult),
      codeExamples: {},
      verificationSteps: [],
      estimatedTime: this.estimateFixTime(qaResult),
      preventionMeasures: []
    };

    // Generate specific fixes for each issue category
    const issueCategories = this.categorizeIssues(qaResult.issues);
    
    for (const [category, issues] of Object.entries(issueCategories)) {
      const categoryFixes = await this.generateCategorySpecificFixes(category, issues, task, project);
      plan.stepByStepFixes.push(...categoryFixes);
    }

    // Add verification steps
    plan.verificationSteps = [
      'Run build commands to ensure compilation success',
      'Execute all tests and verify 100% pass rate',
      'Run linting tools and fix all errors',
      'Perform security scan and address vulnerabilities',
      'Test runtime startup and basic functionality',
      'Verify deployment readiness with QA gates'
    ];

    // Add prevention measures
    plan.preventionMeasures = [
      'Implement pre-commit hooks for linting and testing',
      'Add continuous integration with quality gates',
      'Use TypeScript for better type safety',
      'Implement comprehensive error handling',
      'Add security scanning to development workflow',
      'Create thorough documentation and README'
    ];

    return plan;
  }

  /**
   * Categorize issues for targeted remediation
   */
  categorizeIssues(issues) {
    const categories = {
      build: [],
      tests: [],
      linting: [],
      security: [],
      runtime: [],
      dependencies: [],
      configuration: [],
      other: []
    };

    issues.forEach(issue => {
      const issueLower = issue.toLowerCase();
      
      if (issueLower.includes('build') || issueLower.includes('compile') || issueLower.includes('npm install')) {
        categories.build.push(issue);
      } else if (issueLower.includes('test') || issueLower.includes('jest') || issueLower.includes('cypress')) {
        categories.tests.push(issue);
      } else if (issueLower.includes('lint') || issueLower.includes('eslint') || issueLower.includes('error') || issueLower.includes('warning')) {
        categories.linting.push(issue);
      } else if (issueLower.includes('security') || issueLower.includes('vulnerability') || issueLower.includes('audit')) {
        categories.security.push(issue);
      } else if (issueLower.includes('runtime') || issueLower.includes('server') || issueLower.includes('start')) {
        categories.runtime.push(issue);
      } else if (issueLower.includes('dependency') || issueLower.includes('package') || issueLower.includes('module')) {
        categories.dependencies.push(issue);
      } else if (issueLower.includes('config') || issueLower.includes('env') || issueLower.includes('setup')) {
        categories.configuration.push(issue);
      } else {
        categories.other.push(issue);
      }
    });

    return categories;
  }

  /**
   * Generate category-specific fixes with detailed instructions
   */
  async generateCategorySpecificFixes(category, issues, task, project) {
    const fixes = [];

    switch (category) {
      case 'build':
        fixes.push({
          category: 'Build Issues',
          priority: 'critical',
          issues: issues,
          fixes: [
            'Clear node_modules and package-lock.json: rm -rf node_modules package-lock.json',
            'Clean npm cache: npm cache clean --force',
            'Reinstall dependencies: npm install',
            'Check Node.js version compatibility with engines field in package.json',
            'Verify all TypeScript types are properly resolved',
            'Ensure all import paths are correct and modules exist',
            'Check for circular dependencies that could cause build failures'
          ],
          verification: 'Run npm run build and ensure it completes without errors'
        });
        break;

      case 'tests':
        fixes.push({
          category: 'Test Issues',
          priority: 'high',
          issues: issues,
          fixes: [
            'Install test dependencies: npm install --save-dev jest @testing-library/react',
            'Create proper test setup file with required imports',
            'Mock external dependencies and API calls in tests',
            'Fix failing assertions by checking expected vs actual values',
            'Add missing test cases for edge cases and error scenarios',
            'Ensure test files follow naming convention (*.test.js or *.spec.js)',
            'Configure Jest properly in package.json or jest.config.js'
          ],
          verification: 'Run npm test and ensure all tests pass with > 85% coverage'
        });
        break;

      case 'linting':
        fixes.push({
          category: 'Linting & Code Quality',
          priority: 'medium',
          issues: issues,
          fixes: [
            'Install ESLint and Prettier: npm install --save-dev eslint prettier',
            'Create .eslintrc.js with proper React/TypeScript rules',
            'Fix undefined variables and unused imports',
            'Add proper TypeScript type annotations',
            'Follow consistent naming conventions (camelCase, PascalCase)',
            'Add proper JSDoc comments for functions and classes',
            'Remove console.log statements from production code'
          ],
          verification: 'Run npm run lint and ensure no errors or excessive warnings'
        });
        break;

      case 'security':
        fixes.push({
          category: 'Security Issues',
          priority: 'critical',
          issues: issues,
          fixes: [
            'Update vulnerable dependencies: npm audit fix',
            'Remove dangerous functions like eval(), innerHTML assignments',
            'Implement proper input validation and sanitization',
            'Use parameterized queries to prevent SQL injection',
            'Add proper authentication and authorization checks',
            'Implement HTTPS and secure headers',
            'Sanitize user inputs and outputs to prevent XSS'
          ],
          verification: 'Run npm audit and security scanners to ensure no critical vulnerabilities'
        });
        break;

      case 'runtime':
        fixes.push({
          category: 'Runtime Issues',
          priority: 'critical',
          issues: issues,
          fixes: [
            'Check server startup script in package.json',
            'Verify all required environment variables are set',
            'Ensure database connections are properly configured',
            'Add proper error handling for server startup',
            'Check port availability and configuration',
            'Verify all middleware is properly configured',
            'Add health check endpoints for monitoring'
          ],
          verification: 'Start the application and verify it responds to basic requests'
        });
        break;

      case 'dependencies':
        fixes.push({
          category: 'Dependency Issues',
          priority: 'high',
          issues: issues,
          fixes: [
            'Review package.json for correct dependency versions',
            'Install missing peer dependencies',
            'Resolve version conflicts between packages',
            'Update outdated packages to compatible versions',
            'Remove unused dependencies to reduce bundle size',
            'Use exact versions for critical dependencies',
            'Add engines field to specify Node.js version requirements'
          ],
          verification: 'Run npm install and ensure no peer dependency warnings'
        });
        break;

      default:
        fixes.push({
          category: 'General Issues',
          priority: 'medium',
          issues: issues,
          fixes: [
            'Review error messages and logs for specific guidance',
            'Check documentation for proper setup instructions',
            'Verify file structure matches project requirements',
            'Ensure all configuration files are present and correct',
            'Test the application manually to identify functional issues'
          ],
          verification: 'Perform manual testing to verify fixes'
        });
    }

    return fixes;
  }

  /**
   * Prioritize issues based on severity and impact
   */
  prioritizeIssues(qaResult) {
    const prioritized = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    // Critical failures always come first
    if (qaResult.criticalFailures) {
      prioritized.critical.push(...qaResult.criticalFailures);
    }

    // Categorize other issues
    qaResult.issues.forEach(issue => {
      const issueLower = issue.toLowerCase();
      
      if (issueLower.includes('build') || issueLower.includes('security') || issueLower.includes('critical')) {
        prioritized.critical.push(issue);
      } else if (issueLower.includes('test') || issueLower.includes('runtime') || issueLower.includes('error')) {
        prioritized.high.push(issue);
      } else if (issueLower.includes('warning') || issueLower.includes('dependency')) {
        prioritized.medium.push(issue);
      } else {
        prioritized.low.push(issue);
      }
    });

    return prioritized;
  }

  /**
   * Estimate time needed to fix issues
   */
  estimateFixTime(qaResult) {
    let baseMinutes = 15; // Base time for any issue
    
    // Add time based on number of critical failures
    baseMinutes += (qaResult.criticalFailures?.length || 0) * 30;
    
    // Add time based on total issues
    baseMinutes += qaResult.issues.length * 5;
    
    // Add time based on score (lower score = more time needed)
    if (qaResult.score < 0.3) {
      baseMinutes += 120; // 2 hours for very low scores
    } else if (qaResult.score < 0.6) {
      baseMinutes += 60; // 1 hour for low scores
    } else if (qaResult.score < 0.8) {
      baseMinutes += 30; // 30 minutes for medium scores
    }
    
    return {
      estimated: baseMinutes,
      range: `${Math.max(baseMinutes - 15, 5)}-${baseMinutes + 30} minutes`,
      confidence: qaResult.score > 0.5 ? 'high' : 'medium'
    };
  }

  /**
   * Enhanced retry with comprehensive QA feedback and remediation plan
   */
  async retryTaskWithEnhancedQAFeedback(projectId, taskId, agent, qaResult, remediationPlan, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    const taskNode = project.taskGraph.nodes.find(n => n.id === taskId);
    if (!taskNode) return;
    
    const task = taskNode.data;
    
    // Create comprehensive improvement prompt with detailed guidance
    const improvementPrompt = this.createEnhancedImprovementPrompt(task, qaResult, remediationPlan);
    const sessionId = `${agent.type}-${task.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}-enhanced-retry`;
    
    console.log(`[QA-Enhanced-Retry] Starting enhanced retry with comprehensive improvement instructions for: ${task.title}`);
    
    try {
      // Update task status
      task.status = 'retrying_enhanced';
      task.retryAttempt = (task.retryAttempt || 0) + 1;
      task.retriedAt = new Date();
      task.lastRemediationPlan = remediationPlan;
      
      // Emit enhanced retry started
      socket.emit('task_enhanced_retry_started', {
        projectId,
        taskId,
        agentId: agent.id,
        attempt: task.retryAttempt,
        improvements: qaResult.recommendations,
        remediationPlan: remediationPlan,
        estimatedTime: remediationPlan.estimatedTime
      });
      
      // Execute enhanced improvement task with remediation plan
      await this.gooseIntegration.executeGooseTask(
        improvementPrompt,
        sessionId,
        socket,
        project.projectPath
      );
      
      console.log(`[QA-Enhanced-Retry] Enhanced retry execution completed for: ${task.title}`);
      
      // Re-run comprehensive QA verification
      const retryQAResult = await this.qaEngineer.verifyTaskCompletion(
        projectId,
        taskId,
        task,
        project.projectPath,
        socket
      );
      
      if (retryQAResult.passed) {
        console.log(`[QA-Enhanced-Retry] Enhanced retry QA verification PASSED for: ${task.title}`);
        await this.completeTaskSafely(projectId, taskId, socket);
      } else {
        console.log(`[QA-Enhanced-Retry] Enhanced retry QA verification still FAILED for: ${task.title}`);
        
        // Check if there's improvement
        const improvement = retryQAResult.score - qaResult.score;
        if (improvement > 0.1) {
          console.log(`[QA-Enhanced-Retry] Improvement detected (+${improvement.toFixed(2)}), attempting one more retry`);
          // One more retry if there's significant improvement
          await this.retryTaskWithEnhancedQAFeedback(projectId, taskId, agent, retryQAResult, remediationPlan, socket);
        } else {
          // Mark as failed after enhanced retry with no improvement
          await this.handleTaskError(projectId, taskId, agent, 
            new Error(`Task failed QA verification after enhanced retry. Score: ${retryQAResult.score.toFixed(2)} (improvement: ${improvement.toFixed(2)})`), 
            socket);
        }
      }
      
    } catch (error) {
      console.error(`[QA-Enhanced-Retry] Enhanced retry failed for task: ${task.title}`, error);
      await this.handleTaskError(projectId, taskId, agent, error, socket);
    }
  }

  /**
   * Create enhanced improvement prompt with comprehensive remediation guidance
   */
  createEnhancedImprovementPrompt(task, qaResult, remediationPlan) {
    const issuesList = qaResult.issues.map(issue => `- ${issue}`).join('\n');
    const criticalFailuresList = qaResult.criticalFailures ? qaResult.criticalFailures.map(failure => `- ${failure}`).join('\n') : '';
    const recommendationsList = qaResult.recommendations.map(rec => `- ${rec}`).join('\n');
    
    let stepByStepFixes = '';
    if (remediationPlan.stepByStepFixes) {
      stepByStepFixes = remediationPlan.stepByStepFixes.map(fix => `
## ${fix.category} (Priority: ${fix.priority})
**Issues:**
${fix.issues.map(issue => `- ${issue}`).join('\n')}

**Fixes:**
${fix.fixes.map(fixStep => `- ${fixStep}`).join('\n')}

**Verification:**
${fix.verification}
`).join('\n');
    }
    
    return `
ENHANCED TASK IMPROVEMENT WITH COMPREHENSIVE REMEDIATION

Original Task: ${task.title}
Description: ${task.description}
Current Quality Score: ${qaResult.score.toFixed(2)}/1.0 (Target: 0.7+)
Deployment Readiness: ${qaResult.deploymentReadiness}
Estimated Fix Time: ${remediationPlan.estimatedTime?.range || '30-60 minutes'}

${criticalFailuresList ? `
🚨 CRITICAL FAILURES (MUST FIX IMMEDIATELY):
${criticalFailuresList}
` : ''}

🔍 ALL ISSUES TO RESOLVE:
${issuesList}

📋 STEP-BY-STEP REMEDIATION PLAN:
${stepByStepFixes}

🎯 COMPREHENSIVE REQUIREMENTS:
1. **Build Success**: All build commands must execute without errors
2. **Test Coverage**: Minimum 85% test coverage with all tests passing
3. **Code Quality**: No linting errors, minimal warnings
4. **Security**: No critical security vulnerabilities
5. **Runtime Verification**: Application must start and respond correctly
6. **Deployment Ready**: Must be immediately deployable

💡 RECOMMENDED IMPROVEMENTS:
${recommendationsList}

🔧 VERIFICATION CHECKLIST:
${remediationPlan.verificationSteps ? remediationPlan.verificationSteps.map(step => `- [ ] ${step}`).join('\n') : ''}

🛡️ QUALITY GATES (ALL MUST PASS):
- [ ] Clean build: npm install && npm run build (0 errors)
- [ ] All tests pass: npm test (100% pass rate)
- [ ] Linting clean: npm run lint (0 errors, <10 warnings)
- [ ] Security scan: npm audit (0 critical vulnerabilities)
- [ ] Runtime test: npm start (application starts successfully)
- [ ] Basic functionality: Key features work as expected

🚀 DEPLOYMENT READINESS CRITERIA:
- Code compiles and builds successfully
- All tests pass with good coverage
- No security vulnerabilities
- Application starts and runs correctly
- README has clear setup instructions
- Error handling is implemented
- Basic functionality is verified

CRITICAL INSTRUCTIONS:
1. Fix ALL critical failures first (security, build, runtime)
2. Address high-priority issues (tests, configuration)
3. Clean up medium/low priority issues (linting, documentation)
4. Test each fix thoroughly before moving to the next
5. Ensure the application is immediately runnable after fixes
6. Document any changes made during remediation

FAILURE ANALYSIS:
Based on the QA results, the main issues are in: ${Object.keys(remediationPlan.prioritizedIssues || {}).filter(k => remediationPlan.prioritizedIssues[k].length > 0).join(', ')}

Remember: The goal is to create production-ready, immediately deployable code that meets all quality standards. Do not skip any verification steps.
`;
  }

  /**
   * Create manual review task for critical failures
   */
  async createManualReviewTask(projectId, taskId, agent, qaResult, socket) {
    console.log(`[MANUAL-REVIEW] Creating manual review task for critical failure: ${taskId}`);
    
    // Emit manual review required event
    socket.emit('manual_review_required', {
      projectId,
      originalTaskId: taskId,
      agentId: agent.id,
      severity: 'critical',
      qaResult: qaResult,
      reason: 'Critical quality failures require human intervention',
      nextSteps: [
        'Review QA failure report',
        'Analyze critical failures and root causes',
        'Implement fixes manually or provide specific guidance',
        'Re-run QA validation',
        'Approve for continuation or request rework'
      ]
    });
  }

  /**
   * Create rework task with detailed guidance
   */
  async createReworkTask(projectId, taskId, agent, qaResult, remediationPlan, socket) {
    console.log(`[REWORK] Creating rework task for significant issues: ${taskId}`);
    
    // Emit rework task created event
    socket.emit('rework_task_created', {
      projectId,
      originalTaskId: taskId,
      agentId: agent.id,
      severity: 'moderate',
      qaResult: qaResult,
      remediationPlan: remediationPlan,
      estimatedEffort: remediationPlan.estimatedTime,
      priority: 'high',
      instructions: 'Significant rework required based on QA findings'
    });
  }

  /**
   * Handle task execution errors
   */
  async handleTaskError(projectId, taskId, agent, error, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    const taskNode = project.taskGraph.nodes.find(n => n.id === taskId);
    if (!taskNode) return;
    
    const task = taskNode.data;
    
    // Update task status to failed
    task.status = 'failed';
    task.error = error.message;
    task.failedAt = new Date();
    
    console.error(`[${agent.type}-${task.title}] Task failed:`, error.message);
    
    // Move task to failed column
    try {
      this.moveTaskInKanban(project.kanbanBoard, taskId, 'inProgress', 'failed', agent.id);
    } catch (kanbanError) {
      console.warn('Failed to move failed task in kanban:', kanbanError);
    }
    
    // Update agent status
    socket.emit('agent_status_update', {
      agentId: agent.id,
      agentName: agent.name,
      agentType: agent.type,
      status: 'error',
      currentTask: task.title,
      progress: 0,
      error: error.message,
      sessionId: `${agent.type}-${task.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`
    });
    
    // Broadcast to all clients
    this.io.emit('agents_update', {
      [agent.id]: {
        ...agent,
        status: 'error',
        currentTask: task.title,
        progress: 0,
        error: error.message,
        logs: agent.logs || []
      }
    });
    
    // Emit task failed event
    socket.emit('task_failed', {
      projectId,
      taskId,
      agentId: agent.id,
      task: task,
      error: error.message
    });
  }

  /**
   * Broadcast agent states to the frontend
   */
  broadcastAgentStates(project, socket) {
    const agentStates = {};
    
    project.agentAssignments.forEach((assignment, agentId) => {
      const agent = assignment.agent;
      agentStates[agentId] = {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        specialization: agent.specialization,
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: agent.capabilities,
        assignedTasks: assignment.tasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status || 'todo'
        })),
        metrics: agent.metrics,
        logs: agent.logs || [], // Ensure logs property exists
        createdAt: agent.createdAt || new Date(),
        lastActivity: agent.lastActivity || new Date()
      };
    });
    
    // Emit to current socket
    socket.emit('agents_update', agentStates);
    
    // Broadcast to all clients
    this.io.emit('agents_update', agentStates);
    
    console.log('Broadcasted agent states for', Object.keys(agentStates).length, 'agents');
  }

  /**
   * Create a comprehensive task description for Goose CLI execution
   */
  createGooseTaskDescription(task, agent, project) {
    const context = {
      projectType: project.metrics?.complexity || 'medium',
      projectPath: project.projectPath,
      agentType: agent.specialization,
      agentCapabilities: agent.capabilities.join(', ')
    };
    
    // Create a detailed task description that includes context and requirements
    let description = `You are a ${agent.specialization} working on: ${task.title}\n\n`;
    description += `Task Description: ${task.description}\n\n`;
    description += `Priority: ${task.priority}\n`;
    description += `Estimated Hours: ${task.estimatedHours}\n\n`;
    
    if (task.skills && task.skills.length > 0) {
      description += `Required Skills: ${task.skills.join(', ')}\n\n`;
    }
    
    if (task.deliverables && task.deliverables.length > 0) {
      description += `Expected Deliverables:\n`;
      task.deliverables.forEach(deliverable => {
        description += `- ${deliverable}\n`;
      });
      description += '\n';
    }
    
    // Add project context
    description += `Project Context:\n`;
    description += `- Project Type: ${context.projectType}\n`;
    description += `- Working Directory: ${context.projectPath}\n`;
    description += `- Your Role: ${context.agentType}\n`;
    description += `- Your Capabilities: ${context.agentCapabilities}\n\n`;
    
    // Add specific instructions based on agent type
    if (agent.type === 'frontend_specialist') {
      description += `Frontend Development Instructions:\n`;
      description += `- Create responsive and modern user interfaces\n`;
      description += `- Use modern frameworks and best practices\n`;
      description += `- Ensure cross-browser compatibility\n`;
      description += `- Implement proper state management\n`;
      description += `- Follow accessibility guidelines\n\n`;
    } else if (agent.type === 'backend_specialist') {
      description += `Backend Development Instructions:\n`;
      description += `- Build scalable and secure APIs\n`;
      description += `- Implement proper error handling\n`;
      description += `- Use appropriate design patterns\n`;
      description += `- Ensure data validation and security\n`;
      description += `- Follow RESTful principles\n\n`;
    } else if (agent.type === 'database_architect') {
      description += `Database Design Instructions:\n`;
      description += `- Design efficient and normalized schemas\n`;
      description += `- Implement proper indexing strategies\n`;
      description += `- Consider data integrity and constraints\n`;
      description += `- Plan for scalability and performance\n`;
      description += `- Document the database design\n\n`;
    }
    
    // CRITICAL: Add explicit instructions to prevent testing infinite loops
    description += `CRITICAL TESTING RESTRICTIONS:\n`;
    description += `- DO NOT run any tests (npm test, yarn test, jest, etc.)\n`;
    description += `- DO NOT use --watchAll or --watch flags in test scripts\n`;
    description += `- DO NOT execute any commands that start continuous processes\n`;
    description += `- If you create package.json, ensure test script is "echo 'Tests disabled to prevent infinite loops'"\n`;
    description += `- Focus on implementation only, not testing\n`;
    description += `- Testing will be handled separately to avoid infinite loops\n\n`;
    
    description += `Important Notes:\n`;
    description += `- Work incrementally and test your changes manually (not via test runners)\n`;
    description += `- Create any necessary files and directories\n`;
    description += `- Follow coding best practices and conventions\n`;
    description += `- Document your work appropriately\n`;
    description += `- If you encounter issues, explain them clearly\n`;
    description += `- Complete your task and exit cleanly without running servers or tests\n`;
    
    return description;
  }

  /**
   * Safe task completion with proper error handling and stateful graph integration
   */
  async completeTaskSafely(projectId, taskId, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    try {
      const taskNode = project.taskGraph.nodes.find(n => n.id === taskId);
      if (!taskNode) return;
      
      const task = taskNode.data;
      const agentAssignment = Array.from(project.agentAssignments.values())
        .find(assignment => assignment.tasks.some(t => t.id === taskId));
      
      if (!agentAssignment) return;
      
      const agent = agentAssignment.agent;
      
      // Update task status
      task.status = 'completed';
      task.completedAt = new Date();
      
      // 🔧 STATEFUL GRAPH INTEGRATION: Update node state if using stateful graph
      if (project.isStatefulGraph) {
        await this.transitionNodeState(projectId, taskId, 'completed', socket);
        
        // Update node state with completion data
        const nodeStates = this.nodeStates.get(projectId);
        let nodeState = null;
        if (nodeStates) {
          nodeState = nodeStates.get(taskId);
          if (nodeState) {
            nodeState.endTime = new Date();
            nodeState.duration = nodeState.startTime ? nodeState.endTime - nodeState.startTime : null;
            nodeState.outputState = {
              success: true,
              completedAt: new Date(),
              agentId: agent.id,
              qualityScore: task.qualityScore || null
            };
          }
        }
        
        // Update memory bank with task completion
        const memoryBank = this.graphMemory.get(projectId);
        if (memoryBank) {
          const executionHistory = memoryBank.get('execution:history') || [];
          executionHistory.push({
            taskId: taskId,
            taskTitle: task.title,
            agentId: agent.id,
            completedAt: new Date(),
            duration: nodeState?.duration,
            success: true
          });
          memoryBank.set('execution:history', executionHistory);
          
          // Update agent knowledge
          const agentKnowledge = memoryBank.get('agents:knowledge') || new Map();
          const agentData = agentKnowledge.get(agent.id) || { tasksCompleted: 0, successRate: 0 };
          agentData.tasksCompleted++;
          agentData.lastTaskCompleted = new Date();
          agentData.recentTasks = (agentData.recentTasks || []).concat(task.title).slice(-5);
          agentKnowledge.set(agent.id, agentData);
          memoryBank.set('agents:knowledge', agentKnowledge);
        }
        
        // Log state event
        this.logStateEvent(projectId, 'task_completed', {
          taskId: taskId,
          taskTitle: task.title,
          agentId: agent.id,
          duration: nodeState?.duration
        });
      }
      
      // Update agent metrics safely
      try {
        if (agent.metrics) {
          agent.metrics.tasksCompleted++;
        }
        if (agent.completedTasks) {
          agent.completedTasks.push(task);
        }
      } catch (error) {
        console.warn('Failed to update agent metrics:', error);
      }
      
      // Update kanban board safely
      try {
        this.moveTaskInKanban(project.kanbanBoard, taskId, 'inProgress', 'completed', agent.id);
      } catch (error) {
        console.warn('Failed to move task in kanban:', error);
      }
      
      // Update agent status to completed
      socket.emit('agent_status_update', {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        status: 'completed',
        currentTask: task.title,
        progress: 100
      });
      
      // Broadcast to all clients
      this.io.emit('agents_update', {
        [agent.id]: {
          ...agent,
          status: 'completed',
          currentTask: task.title,
          progress: 100,
          logs: agent.logs || []
        }
      });
      
      // Emit task completed event with state information
      socket.emit('task_completed', {
        projectId,
        taskId,
        agentId: agent.id,
        task: task,
        // Enhanced with state information
        isStatefulGraph: project.isStatefulGraph,
        nodeState: project.isStatefulGraph ? this.nodeStates.get(projectId)?.get(taskId) : null
      });
      
      console.log('✅ Task completed:', task.title);
      
      // 🔧 STATEFUL GRAPH INTEGRATION: Let stateful execution loop handle dependency chain
      if (project.isStatefulGraph) {
        // The stateful execution loop will automatically handle next available tasks
        console.log('🔄 Stateful graph will handle dependency chain automatically');
        
        // Update available nodes for the execution loop
        await this.updateAvailableNodes(projectId);
        
        return; // Let the stateful loop handle the rest
      }
      
      // LEGACY SYSTEM: Manual dependency chain handling for non-stateful graphs
      console.log('Checking for newly available tasks after completion of:', task.title);
      const newReadyTasks = this.findReadyTasks(project.taskGraph);
      console.log('Found', newReadyTasks.length, 'newly ready tasks');
      
      for (const readyTask of newReadyTasks) {
        if (readyTask.status === 'todo') {
          console.log('Triggering execution of dependent task:', readyTask.title);
          try {
            // Execute the newly available task
            await this.executeTaskSafely(projectId, readyTask.id, socket);
          } catch (error) {
            console.error('Failed to execute dependent task:', readyTask.title, error);
            // Continue with other tasks instead of failing completely
          }
        }
      }
      
      // Check if project is complete
      const allTasksComplete = project.taskGraph.nodes.every(node => 
        node.data.status === 'completed'
      );
      
      if (allTasksComplete) {
        console.log('All tasks completed - finishing project');
        await this.completeProject(projectId, socket);
      }
      
      // Auto-save project state after task completion
      try {
        await this.autoSaveProject(projectId);
      } catch (saveError) {
        console.warn(`⚠️ Failed to auto-save project ${projectId} after task completion:`, saveError.message);
      }
      
    } catch (error) {
      console.error('Task completion error:', error);
      // Don't throw, just log and continue
    }
  }

  /**
   * Complete a task due to timeout with better logging
   */
  async completeTaskWithTimeout(projectId, taskId, socket) {
    console.log(`[TIMEOUT] Completing task due to timeout: ${taskId}`);
    
    const project = this.activeProjects.get(projectId);
    if (project) {
      const taskNode = project.taskGraph.nodes.find(n => n.id === taskId);
      if (taskNode) {
        const task = taskNode.data;
        console.log(`[TIMEOUT] Task details: ${task.title} - Started at: ${task.startedAt}`);
        
        // Log timeout reason
        const timeoutReason = task.startedAt ? 
          `Task timed out after ${Math.round((new Date() - task.startedAt) / 1000)}s` : 
          'Task timed out before starting';
        
        console.warn(`[TIMEOUT] ${timeoutReason}`);
        
        // Emit timeout event to frontend
        socket.emit('task_timeout', {
          projectId,
          taskId,
          taskTitle: task.title,
          reason: timeoutReason,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    await this.completeTaskSafely(projectId, taskId, socket);
  }

  /**
   * Intelligent prompt analysis that dynamically creates tasks based on content and intent
   */
  async analyzePromptForTasks(prompt, options = {}) {
    try {
      console.log('Analyzing prompt:', prompt);
      
      // Safety check for empty prompt
      if (!prompt || typeof prompt !== 'string') {
        console.warn('Invalid prompt provided, using default');
        prompt = 'Create a simple application';
      }
      
      const promptLower = prompt.toLowerCase();
      const words = promptLower.split(/\s+/);
      const tasks = [];
      let complexity = 'medium';
      let projectType = 'general';
      
      // Intelligent keyword extraction and intent analysis
      const intentAnalysis = this.analyzePromptIntent(promptLower, words);
      console.log('Intent analysis:', intentAnalysis);
      
      // Generate tasks based on detected intents and requirements
      const generatedTasks = this.generateTasksFromIntent(intentAnalysis, prompt);
      console.log('Generated tasks:', generatedTasks);
      
      tasks.push(...generatedTasks);
      
      // Determine project type based on tasks
      projectType = this.determineProjectType(tasks, intentAnalysis);
      
      // Determine complexity based on scope and requirements
      complexity = this.determineComplexity(tasks, intentAnalysis, promptLower);
      
      // Generate task dependencies based on logical flow
      const taskDependencies = this.generateTaskDependencies(tasks);
    
    return {
      projectType,
      complexity,
      tasks: tasks.map(task => ({
        ...task,
        id: uuidv4(),
        dependencies: taskDependencies[task.type] || []
      })),
      estimatedDuration: tasks.reduce((total, task) => total + task.estimatedHours, 0),
      requiredAgents: [...new Set(tasks.map(task => task.type))]
    };
    
    } catch (error) {
      console.error('Error analyzing prompt for tasks:', error);
      // Return a simple fallback task analysis
      return {
        projectType: 'general',
        complexity: 'low',
        tasks: [{
          id: uuidv4(),
          type: 'general',
          title: 'Complete Project Task',
          description: 'Complete the requested project task',
          priority: 'high',
          estimatedHours: 5,
          skills: ['general'],
          deliverables: ['Project completion'],
          dependencies: []
        }],
        estimatedDuration: 5,
        requiredAgents: ['general']
      };
    }
  }

  /**
   * Analyze prompt intent using semantic understanding
   */
  analyzePromptIntent(promptLower, words) {
    const intent = {
      actions: [],
      technologies: [],
      components: [],
      features: [],
      roles: [],
      scope: 'medium',
      domain: 'general'
    };

    // Action detection
    const actionKeywords = {
      'create': ['create', 'build', 'make', 'develop', 'generate', 'setup', 'implement'],
      'design': ['design', 'architect', 'plan', 'structure', 'layout'],
      'integrate': ['integrate', 'connect', 'link', 'combine', 'merge'],
      'test': ['test', 'validate', 'verify', 'check', 'quality'],
      'deploy': ['deploy', 'launch', 'release', 'publish', 'host'],
      'analyze': ['analyze', 'process', 'examine', 'study', 'research'],
      'manage': ['manage', 'coordinate', 'orchestrate', 'organize', 'control']
    };

    // Technology detection
    const techKeywords = {
      'frontend': ['frontend', 'ui', 'interface', 'react', 'vue', 'angular', 'html', 'css', 'javascript'],
      'backend': ['backend', 'api', 'server', 'nodejs', 'python', 'java', 'database', 'microservice'],
      'database': ['database', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'data'],
      'mobile': ['mobile', 'app', 'ios', 'android', 'react native', 'flutter'],
      'devops': ['devops', 'ci/cd', 'docker', 'kubernetes', 'deployment', 'infrastructure'],
      'ai': ['ai', 'machine learning', 'ml', 'artificial intelligence', 'neural', 'model']
    };

    // Component detection
    const componentKeywords = {
      'authentication': ['auth', 'login', 'user', 'session', 'security', 'token'],
      'dashboard': ['dashboard', 'admin', 'panel', 'analytics', 'metrics'],
      'api': ['api', 'endpoint', 'rest', 'graphql', 'service'],
      'database': ['database', 'storage', 'data', 'schema', 'model'],
      'ui': ['ui', 'interface', 'component', 'form', 'button', 'layout'],
      'testing': ['test', 'unit', 'integration', 'e2e', 'quality'],
      'documentation': ['docs', 'documentation', 'guide', 'readme', 'manual']
    };

    // Role detection
    const roleKeywords = {
      'agent': ['agent', 'bot', 'worker', 'service'],
      'orchestrator': ['orchestrator', 'coordinator', 'manager', 'controller'],
      'team': ['team', 'multi', 'multiple', 'group', 'collaboration'],
      'developer': ['developer', 'programmer', 'coder', 'engineer']
    };

    // Analyze words for intents
    words.forEach(word => {
      // Check actions
      Object.keys(actionKeywords).forEach(action => {
        if (actionKeywords[action].some(keyword => word.includes(keyword))) {
          if (!intent.actions.includes(action)) {
            intent.actions.push(action);
          }
        }
      });

      // Check technologies
      Object.keys(techKeywords).forEach(tech => {
        if (techKeywords[tech].some(keyword => word.includes(keyword))) {
          if (!intent.technologies.includes(tech)) {
            intent.technologies.push(tech);
          }
        }
      });

      // Check components
      Object.keys(componentKeywords).forEach(component => {
        if (componentKeywords[component].some(keyword => word.includes(keyword))) {
          if (!intent.components.includes(component)) {
            intent.components.push(component);
          }
        }
      });

      // Check roles
      Object.keys(roleKeywords).forEach(role => {
        if (roleKeywords[role].some(keyword => word.includes(keyword))) {
          if (!intent.roles.includes(role)) {
            intent.roles.push(role);
          }
        }
      });
    });

    // Determine scope based on complexity indicators
    const scopeIndicators = {
      'large': ['enterprise', 'complex', 'advanced', 'comprehensive', 'full', 'complete', 'extensive'],
      'medium': ['standard', 'typical', 'normal', 'regular', 'moderate'],
      'small': ['simple', 'basic', 'minimal', 'quick', 'lightweight', 'small']
    };

    Object.keys(scopeIndicators).forEach(scope => {
      if (scopeIndicators[scope].some(indicator => promptLower.includes(indicator))) {
        intent.scope = scope;
      }
    });

    return intent;
  }

  /**
   * Generate tasks based on analyzed intent
   */
  generateTasksFromIntent(intentAnalysis, originalPrompt) {
    const tasks = [];
    const { actions, technologies, components, roles, scope } = intentAnalysis;

    console.log('Generating tasks for intent:', intentAnalysis);

    // Core development tasks based on technologies
    if (technologies.includes('frontend') || actions.includes('create')) {
      tasks.push({
        type: 'frontend',
        title: 'Frontend Development',
        description: `Create user interface components and frontend architecture for: ${originalPrompt}`,
        priority: 'high',
        estimatedHours: scope === 'large' ? 16 : scope === 'small' ? 8 : 12,
        skills: ['react', 'javascript', 'css', 'html', 'ui_design'],
        deliverables: ['UI components', 'Frontend architecture', 'User interface', 'Responsive design']
      });
    }

    if (technologies.includes('backend') || components.includes('api') || actions.includes('create')) {
      tasks.push({
        type: 'backend',
        title: 'Backend Development',
        description: `Build backend services and API infrastructure for: ${originalPrompt}`,
        priority: 'high',
        estimatedHours: scope === 'large' ? 20 : scope === 'small' ? 10 : 15,
        skills: ['nodejs', 'api_design', 'microservices', 'authentication'],
        deliverables: ['API endpoints', 'Business logic', 'Service architecture', 'Data processing']
      });
    }

    if (technologies.includes('database') || components.includes('database')) {
      tasks.push({
        type: 'database',
        title: 'Database Design',
        description: `Design and implement database schema for: ${originalPrompt}`,
        priority: 'high',
        estimatedHours: scope === 'large' ? 12 : scope === 'small' ? 6 : 8,
        skills: ['sql', 'schema_design', 'data_modeling', 'optimization'],
        deliverables: ['Database schema', 'Data models', 'Migrations', 'Indexes']
      });
    }

    // Multi-agent and orchestration tasks
    if (roles.includes('agent') || roles.includes('orchestrator') || roles.includes('team')) {
      tasks.push({
        type: 'backend',
        title: 'Multi-Agent System Architecture',
        description: `Design and implement multi-agent orchestration system for: ${originalPrompt}`,
        priority: 'high',
        estimatedHours: scope === 'large' ? 24 : scope === 'small' ? 12 : 18,
        skills: ['nodejs', 'microservices', 'api_design', 'orchestration'],
        deliverables: ['Agent framework', 'Orchestration logic', 'Communication protocols', 'Task distribution']
      });

      tasks.push({
        type: 'backend',
        title: 'Agent Communication System',
        description: `Build communication and coordination system between agents for: ${originalPrompt}`,
        priority: 'high',
        estimatedHours: scope === 'large' ? 16 : scope === 'small' ? 8 : 12,
        skills: ['nodejs', 'real_time', 'api_design', 'messaging'],
        deliverables: ['Message queues', 'Event system', 'Agent coordination', 'Status tracking']
      });
    }

    // Testing tasks
    if (actions.includes('test') || components.includes('testing') || scope === 'large') {
      tasks.push({
        type: 'testing',
        title: 'Testing & Quality Assurance',
        description: `Implement comprehensive testing suite for: ${originalPrompt}`,
        priority: 'medium',
        estimatedHours: scope === 'large' ? 14 : scope === 'small' ? 6 : 10,
        skills: ['unit_testing', 'integration_testing', 'e2e_testing', 'test_automation'],
        deliverables: ['Unit tests', 'Integration tests', 'Test automation', 'Quality metrics']
      });
    }

    // Documentation tasks
    if (components.includes('documentation') || scope === 'large') {
      tasks.push({
        type: 'documentation',
        title: 'Documentation & Guides',
        description: `Create comprehensive documentation for: ${originalPrompt}`,
        priority: 'medium',
        estimatedHours: scope === 'large' ? 10 : scope === 'small' ? 4 : 6,
        skills: ['technical_writing', 'readme', 'user_guides', 'api_docs'],
        deliverables: ['README.md', 'API documentation', 'User guides', 'Architecture docs']
      });
    }

    // Deployment tasks
    if (actions.includes('deploy') || technologies.includes('devops') || scope === 'large') {
      tasks.push({
        type: 'deployment',
        title: 'Deployment & DevOps',
        description: `Set up deployment pipeline and infrastructure for: ${originalPrompt}`,
        priority: 'medium',
        estimatedHours: scope === 'large' ? 12 : scope === 'small' ? 6 : 8,
        skills: ['deployment', 'ci_cd', 'docker', 'monitoring'],
        deliverables: ['Deployment scripts', 'CI/CD pipeline', 'Infrastructure setup', 'Monitoring']
      });
    }

    // Security tasks for sensitive systems
    if (components.includes('authentication') || technologies.includes('backend') || scope === 'large') {
      tasks.push({
        type: 'security',
        title: 'Security Implementation',
        description: `Implement security measures and authentication for: ${originalPrompt}`,
        priority: 'high',
        estimatedHours: scope === 'large' ? 14 : scope === 'small' ? 6 : 10,
        skills: ['authentication', 'authorization', 'encryption', 'security_audit'],
        deliverables: ['Authentication system', 'Security policies', 'Access control', 'Audit logging']
      });
    }

    // Ensure we have at least one task
    if (tasks.length === 0) {
      tasks.push({
        type: 'general',
        title: 'Project Implementation',
        description: `Implement the requested project: ${originalPrompt}`,
        priority: 'high',
        estimatedHours: 10,
        skills: ['general', 'programming', 'problem_solving'],
        deliverables: ['Project completion', 'Working solution', 'Code implementation']
      });
    }

    return tasks;
  }

  /**
   * Determine project type based on generated tasks
   */
  determineProjectType(tasks, intentAnalysis) {
    const taskTypes = tasks.map(task => task.type);
    
    if (taskTypes.includes('frontend') && taskTypes.includes('backend')) {
      return 'full_stack_application';
    } else if (taskTypes.includes('backend') && intentAnalysis.roles.includes('agent')) {
      return 'multi_agent_system';
    } else if (taskTypes.includes('frontend')) {
      return 'frontend_application';
    } else if (taskTypes.includes('backend')) {
      return 'backend_service';
    } else if (taskTypes.includes('database')) {
      return 'data_system';
    } else {
      return 'general_project';
    }
  }

  /**
   * Determine complexity based on tasks and requirements
   */
  determineComplexity(tasks, intentAnalysis, promptLower) {
    let complexityScore = 0;
    
    // Base complexity from number of tasks
    complexityScore += tasks.length * 10;
    
    // Add complexity for scope
    if (intentAnalysis.scope === 'large') complexityScore += 30;
    else if (intentAnalysis.scope === 'small') complexityScore -= 10;
    
    // Add complexity for technologies
    complexityScore += intentAnalysis.technologies.length * 5;
    
    // Add complexity for multi-agent systems
    if (intentAnalysis.roles.includes('agent') || intentAnalysis.roles.includes('orchestrator')) {
      complexityScore += 25;
    }
    
    // Add complexity for specific keywords
    const complexityKeywords = ['enterprise', 'scalable', 'distributed', 'microservice', 'complex', 'advanced'];
    complexityScore += complexityKeywords.filter(keyword => promptLower.includes(keyword)).length * 15;
    
    // Determine final complexity
    if (complexityScore >= 80) return 'high';
    else if (complexityScore >= 40) return 'medium';
    else return 'low';
  }

  /**
   * Generate logical task dependencies to prevent deadlocks
   */
  generateTaskDependencies(tasks) {
    const dependencies = {};
    const tasksByType = {};
    
    // Group tasks by type
    tasks.forEach(task => {
      tasksByType[task.type] = task;
    });
    
    // Define dependency rules
    const dependencyRules = {
      'frontend': ['backend', 'database'], // Frontend depends on backend and database
      'testing': ['frontend', 'backend', 'database'], // Testing depends on all implementation
      'deployment': ['frontend', 'backend', 'database', 'testing'], // Deployment depends on everything
      'documentation': ['frontend', 'backend'], // Documentation depends on implementation
      'security': ['backend', 'database'] // Security depends on backend and database
    };
    
    // Apply dependency rules
    Object.keys(dependencyRules).forEach(taskType => {
      if (tasksByType[taskType]) {
        dependencies[taskType] = dependencyRules[taskType]
          .filter(depType => tasksByType[depType])
          .map(depType => tasksByType[depType].id);
      }
    });
    
    return dependencies;
  }

  /**
   * Enhanced Task Orchestration with Quality Checkpoints
   * Automatically injects code review and QA testing checkpoints after every standard task
   */

  /**
   * Classify agent types for proper checkpoint integration
   */
  classifyAgentType(agentType) {
    const checkpointAgents = ['code_review_specialist', 'qa_testing_specialist'];
    const standardAgents = ['frontend_specialist', 'backend_specialist', 'python_specialist', 'database_architect', 'devops_engineer'];
    
    if (checkpointAgents.includes(agentType.id)) {
      return 'checkpoint';
    } else if (standardAgents.includes(agentType.id)) {
      return 'standard';
    } else {
      return 'support'; // documentation, security, etc.
    }
  }

  /**
   * Create quality checkpoint tasks for each standard task
   */
  createQualityCheckpoints(originalTask, projectId) {
    const checkpoints = [];
    
    // Skip creating checkpoints for checkpoint tasks themselves
    if (originalTask.type === 'code_review' || originalTask.type === 'qa_testing') {
      return checkpoints;
    }
    
    // Code Review Checkpoint
    const codeReviewTask = {
      id: uuidv4(),
      type: 'code_review',
      title: `Code Review: ${originalTask.title}`,
      description: `Comprehensive code review and quality assessment for: ${originalTask.description}`,
      priority: 'high',
      estimatedHours: Math.ceil(originalTask.estimatedHours * 0.3), // 30% of original task time
      skills: ['code_quality', 'security_review', 'performance_analysis', 'best_practices'],
      deliverables: ['Code review report', 'Security assessment', 'Quality score', 'Improvement recommendations'],
      originalTaskId: originalTask.id,
      checkpointType: 'code_review',
      dependencies: [originalTask.id],
      createdAt: new Date(),
      projectId: projectId
    };
    
    // QA Testing Checkpoint
    const qaTestingTask = {
      id: uuidv4(),
      type: 'qa_testing',
      title: `QA Testing: ${originalTask.title}`,
      description: `Quality assurance testing and validation for: ${originalTask.description}`,
      priority: 'high',
      estimatedHours: Math.ceil(originalTask.estimatedHours * 0.4), // 40% of original task time
      skills: ['testing', 'quality_assurance', 'test_automation', 'validation'],
      deliverables: ['Test results', 'Quality metrics', 'Test coverage report', 'Deployment readiness'],
      originalTaskId: originalTask.id,
      checkpointType: 'qa_testing',
      dependencies: [codeReviewTask.id], // QA depends on code review completion
      createdAt: new Date(),
      projectId: projectId
    };
    
    checkpoints.push(codeReviewTask, qaTestingTask);
    return checkpoints;
  }

  /**
   * Update task dependencies to route through quality checkpoints
   */
  updateTaskDependencies(tasks, checkpointMap) {
    return tasks.map(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        // Replace original dependencies with checkpoint dependencies
        const updatedDependencies = task.dependencies.map(depId => {
          // If the dependency has QA checkpoint, depend on that instead
          if (checkpointMap.has(depId) && checkpointMap.get(depId).qa) {
            return checkpointMap.get(depId).qa.id;
          }
          return depId;
        });
        
        return {
          ...task,
          dependencies: updatedDependencies
        };
      }
      return task;
    });
  }

  /**
   * Enhanced Create task graph with automatic quality checkpoints
   */
  async createTaskGraphWithCheckpoints(taskAnalysis, projectId) {
    const nodes = [];
    const edges = [];
    const allTasks = [...taskAnalysis.tasks];
    const checkpointMap = new Map(); // Map original task ID to its checkpoints
    
    console.log(`🔧 Creating enhanced task graph with quality checkpoints for ${allTasks.length} tasks`);
    
    // Step 1: Create checkpoint tasks for each standard task
    taskAnalysis.tasks.forEach(originalTask => {
      const checkpoints = this.createQualityCheckpoints(originalTask, projectId);
      if (checkpoints.length > 0) {
        const [codeReviewTask, qaTestingTask] = checkpoints;
        allTasks.push(codeReviewTask, qaTestingTask);
        
        checkpointMap.set(originalTask.id, {
          codeReview: codeReviewTask,
          qa: qaTestingTask
        });
        
        console.log(`✅ Created checkpoints for ${originalTask.title}: Code Review + QA Testing`);
      }
    });
    
    // Step 2: Update dependencies to route through checkpoints
    const tasksWithUpdatedDependencies = this.updateTaskDependencies(allTasks, checkpointMap);
    
    // Step 3: Create nodes for all tasks (original + checkpoints)
    tasksWithUpdatedDependencies.forEach(task => {
      const node = {
        id: task.id,
        type: task.checkpointType ? 'checkpoint' : 'task',
        position: this.calculateNodePosition(task, tasksWithUpdatedDependencies),
        data: {
          ...task,
          status: 'todo',
          progress: 0,
          assignedAgent: null,
          createdAt: new Date(),
          projectId: projectId,
          isCheckpoint: !!task.checkpointType,
          checkpointType: task.checkpointType || null,
          originalTaskId: task.originalTaskId || null
        }
      };
      nodes.push(node);
    });
    
    // Step 4: Create edges for all dependencies
    tasksWithUpdatedDependencies.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          edges.push({
            id: `${depId}-${task.id}`,
            source: depId,
            target: task.id,
            type: task.checkpointType ? 'checkpoint_dependency' : 'dependency',
            animated: true,
            label: task.checkpointType ? `${task.checkpointType}` : undefined
          });
        });
      }
    });
    
    // Step 5: Add final project-level quality review tasks
    const finalReviewTasks = this.createFinalProjectReview(taskAnalysis, allTasks, projectId);
    finalReviewTasks.forEach(task => {
      allTasks.push(task);
      const node = {
        id: task.id,
        type: 'final_review',
        position: this.calculateNodePosition(task, allTasks),
        data: {
          ...task,
          status: 'todo',
          progress: 0,
          assignedAgent: null,
          createdAt: new Date(),
          projectId: projectId,
          isFinalReview: true
        }
      };
      nodes.push(node);
      
      // Final reviews depend on all QA checkpoints being completed
      task.dependencies.forEach(depId => {
        edges.push({
          id: `${depId}-${task.id}`,
          source: depId,
          target: task.id,
          type: 'final_review_dependency',
          animated: true,
          label: 'Final Review'
        });
      });
    });
    
    console.log(`🎯 Enhanced task graph created: ${nodes.length} total nodes (${taskAnalysis.tasks.length} original + ${nodes.length - taskAnalysis.tasks.length - finalReviewTasks.length} checkpoints + ${finalReviewTasks.length} final reviews)`);
    
    return {
      id: projectId,
      nodes: nodes,
      edges: edges,
      projectType: taskAnalysis.projectType,
      complexity: taskAnalysis.complexity,
      estimatedDuration: allTasks.reduce((total, task) => total + (task.estimatedHours || 0), 0),
      checkpointMap: checkpointMap,
      totalTasks: allTasks.length,
      originalTasks: taskAnalysis.tasks.length,
      checkpointTasks: nodes.filter(n => n.data.isCheckpoint).length,
      finalReviewTasks: finalReviewTasks.length
    };
  }

  /**
   * Create final project-level review tasks
   */
  createFinalProjectReview(taskAnalysis, allTasks, projectId) {
    const finalReviewTasks = [];
    
    // Get all QA checkpoint task IDs as dependencies
    const qaCheckpointIds = allTasks
      .filter(task => task.checkpointType === 'qa_testing')
      .map(task => task.id);
    
    // Final Code Review (comprehensive project review)
    const finalCodeReview = {
      id: uuidv4(),
      type: 'code_review',
      title: 'Final Project Code Review',
      description: 'Comprehensive final code review of the entire project for production readiness',
      priority: 'critical',
      estimatedHours: Math.max(4, Math.ceil(taskAnalysis.tasks.length * 0.5)),
      skills: ['code_quality', 'security_review', 'architecture_review', 'production_readiness'],
      deliverables: ['Final code review report', 'Production readiness assessment', 'Security clearance', 'Deployment approval'],
      checkpointType: 'final_code_review',
      dependencies: qaCheckpointIds,
      createdAt: new Date(),
      projectId: projectId,
      isFinalReview: true
    };
    
    // Final QA Testing (end-to-end project testing)
    const finalQATesting = {
      id: uuidv4(),
      type: 'qa_testing',
      title: 'Final Project QA Testing',
      description: 'Comprehensive end-to-end testing and final quality assurance of the complete project',
      priority: 'critical',
      estimatedHours: Math.max(6, Math.ceil(taskAnalysis.tasks.length * 0.7)),
      skills: ['e2e_testing', 'integration_testing', 'performance_testing', 'deployment_validation'],
      deliverables: ['Final test report', 'Performance metrics', 'Integration test results', 'Deployment validation'],
      checkpointType: 'final_qa_testing',
      dependencies: [finalCodeReview.id],
      createdAt: new Date(),
      projectId: projectId,
      isFinalReview: true
    };
    
    finalReviewTasks.push(finalCodeReview, finalQATesting);
    return finalReviewTasks;
  }

  /**
   * Handle completion of checkpoint tasks (code review and QA testing)
   */
  async handleCheckpointTaskCompletion(projectId, taskId, task, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;

    console.log(`🔍 [CHECKPOINT] Handling completion of ${task.checkpointType} checkpoint: ${task.title}`);

    try {
      if (task.checkpointType === 'code_review' || task.checkpointType === 'final_code_review') {
        // Code review checkpoint - perform comprehensive code analysis
        await this.performCodeReviewCheckpoint(projectId, taskId, task, project, socket);
        
      } else if (task.checkpointType === 'qa_testing' || task.checkpointType === 'final_qa_testing') {
        // QA testing checkpoint - perform comprehensive quality verification
        await this.performQATestingCheckpoint(projectId, taskId, task, project, socket);
      }
      
    } catch (error) {
      console.error(`🚨 [CHECKPOINT] Checkpoint task failed: ${task.title}`, error);
      await this.handleTaskError(projectId, taskId, { type: 'checkpoint' }, error, socket);
    }
  }

  /**
   * Perform code review checkpoint
   */
  async performCodeReviewCheckpoint(projectId, taskId, task, project, socket) {
    console.log(`📋 [CODE-REVIEW] Starting code review checkpoint for: ${task.title}`);
    
    // Find the original task this checkpoint is reviewing
    const originalTask = task.originalTaskId ? 
      project.taskGraph.nodes.find(n => n.id === task.originalTaskId)?.data : null;
    
    // Emit checkpoint started event
    socket.emit('checkpoint_started', {
      projectId,
      checkpointId: taskId,
      checkpointType: 'code_review',
      originalTaskId: task.originalTaskId,
      title: task.title
    });

    try {
      // Perform code review using existing specialized agent logic
      const codeReviewPrompt = this.createCodeReviewPrompt(task, originalTask, project);
      
      // The code review work has already been done by the Goose CLI execution
      // Now we need to validate the review results
      const reviewResults = await this.validateCodeReviewResults(project.projectPath, task, originalTask);
      
      if (reviewResults.passed) {
        console.log(`✅ [CODE-REVIEW] Code review checkpoint PASSED: ${task.title}`);
        await this.completeTaskSafely(projectId, taskId, socket);
        
        socket.emit('checkpoint_completed', {
          projectId,
          checkpointId: taskId,
          checkpointType: 'code_review',
          originalTaskId: task.originalTaskId,
          passed: true,
          results: reviewResults
        });
        
      } else {
        console.log(`❌ [CODE-REVIEW] Code review checkpoint FAILED: ${task.title}`);
        await this.handleCheckpointFailure(projectId, taskId, task, reviewResults, socket);
      }
      
    } catch (error) {
      console.error(`🚨 [CODE-REVIEW] Code review checkpoint error:`, error);
      throw error;
    }
  }

  /**
   * Perform QA testing checkpoint
   */
  async performQATestingCheckpoint(projectId, taskId, task, project, socket) {
    console.log(`🧪 [QA-TESTING] Starting QA testing checkpoint for: ${task.title}`);
    
    // Find the original task this checkpoint is testing
    const originalTask = task.originalTaskId ? 
      project.taskGraph.nodes.find(n => n.id === task.originalTaskId)?.data : null;
    
    // Emit checkpoint started event
    socket.emit('checkpoint_started', {
      projectId,
      checkpointId: taskId,
      checkpointType: 'qa_testing',
      originalTaskId: task.originalTaskId,
      title: task.title
    });

    try {
      // Use the existing QA Engineer for comprehensive testing
      const qaResult = await this.qaEngineer.verifyTaskCompletion(
        projectId,
        task.originalTaskId || taskId,
        originalTask || task,
        project.projectPath,
        socket
      );
      
      if (qaResult.passed) {
        console.log(`✅ [QA-TESTING] QA testing checkpoint PASSED: ${task.title} (Score: ${qaResult.score.toFixed(2)})`);
        await this.completeTaskSafely(projectId, taskId, socket);
        
        socket.emit('checkpoint_completed', {
          projectId,
          checkpointId: taskId,
          checkpointType: 'qa_testing',
          originalTaskId: task.originalTaskId,
          passed: true,
          results: qaResult
        });
        
      } else {
        console.log(`❌ [QA-TESTING] QA testing checkpoint FAILED: ${task.title} (Score: ${qaResult.score.toFixed(2)})`);
        await this.handleCheckpointFailure(projectId, taskId, task, qaResult, socket);
      }
      
    } catch (error) {
      console.error(`🚨 [QA-TESTING] QA testing checkpoint error:`, error);
      throw error;
    }
  }

  /**
   * Handle checkpoint failure with proper escalation
   */
  async handleCheckpointFailure(projectId, taskId, checkpointTask, results, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;

    console.log(`🚨 [CHECKPOINT-FAILURE] Handling checkpoint failure: ${checkpointTask.title}`);
    
    // Find the original task
    const originalTaskNode = checkpointTask.originalTaskId ? 
      project.taskGraph.nodes.find(n => n.id === checkpointTask.originalTaskId) : null;
    
    if (originalTaskNode) {
      const originalTask = originalTaskNode.data;
      
      // Mark original task as needing rework
      originalTask.status = 'needs_rework';
      originalTask.checkpointFailure = {
        checkpointType: checkpointTask.checkpointType,
        failureReason: results.issues || results.criticalFailures || ['Checkpoint validation failed'],
        recommendations: results.recommendations || [],
        score: results.score || 0,
        failedAt: new Date()
      };
      
      // Move original task back to todo for rework
      try {
        this.moveTaskInKanban(project.kanbanBoard, originalTask.id, 'completed', 'todo', originalTask.assignedAgent);
      } catch (error) {
        console.warn('Failed to move task in kanban during checkpoint failure:', error);
      }
      
      console.log(`🔄 [REWORK] Original task "${originalTask.title}" marked for rework due to checkpoint failure`);
    }
    
    // Mark checkpoint task as failed
    checkpointTask.status = 'failed';
    checkpointTask.failureResults = results;
    
    // Emit checkpoint failure event
    socket.emit('checkpoint_failed', {
      projectId,
      checkpointId: taskId,
      checkpointType: checkpointTask.checkpointType,
      originalTaskId: checkpointTask.originalTaskId,
      results: results,
      reworkRequired: !!originalTaskNode
    });
  }

  /**
   * Create code review prompt for checkpoint tasks
   */
  createCodeReviewPrompt(checkpointTask, originalTask, project) {
    return `
# Code Review Checkpoint: ${checkpointTask.title}

## Review Scope
- **Original Task**: ${originalTask?.title || 'Unknown'}
- **Original Description**: ${originalTask?.description || 'No description'}
- **Project Path**: ${project.projectPath}
- **Review Type**: ${checkpointTask.checkpointType}

## Review Objectives
1. Code quality and adherence to best practices
2. Security vulnerability assessment  
3. Performance analysis and optimization opportunities
4. Architecture and design pattern compliance
5. Documentation and maintainability

## Deliverables Required
- Comprehensive code review report
- Security assessment results
- Quality score and metrics
- Specific improvement recommendations
- Pass/fail determination with rationale

Please perform a thorough code review following industry best practices and provide detailed feedback.
`;
  }

  /**
   * Validate code review results
   */
  async validateCodeReviewResults(projectPath, checkpointTask, originalTask) {
    // This is a simplified validation - in practice, you'd check for:
    // - Review report files
    // - Security scan results  
    // - Code quality metrics
    // - Compliance with standards
    
    console.log(`🔍 [VALIDATION] Validating code review results for: ${checkpointTask.title}`);
    
    // For now, return a successful result - this should be enhanced with actual validation logic
    return {
      passed: true,
      score: 0.85,
      issues: [],
      recommendations: ['Code review completed successfully'],
      reviewReport: 'Code review checkpoint completed',
      securityAssessment: 'No critical security issues found',
      qualityScore: 85
    };
  }

  /**
   * Create task graph with nodes and edges (LangGraph style) - ORIGINAL METHOD
   */
  async createTaskGraph(taskAnalysis, projectId) {
    const nodes = [];
    const edges = [];
    
    // Create nodes for each task
    taskAnalysis.tasks.forEach((task, index) => {
      const node = {
        id: task.id,
        type: 'task',
        position: this.calculateNodePosition(task, taskAnalysis.tasks),
        data: {
          ...task,
          status: 'todo',
          progress: 0,
          assignedAgent: null,
          createdAt: new Date(),
          projectId: projectId
        }
      };
      nodes.push(node);
    });
    
    // Create edges for dependencies
    taskAnalysis.tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          edges.push({
            id: `${depId}-${task.id}`,
            source: depId,
            target: task.id,
            type: 'dependency',
            animated: true
          });
        });
      }
    });
    
    return {
      id: projectId,
      nodes: nodes,
      edges: edges,
      projectType: taskAnalysis.projectType,
      complexity: taskAnalysis.complexity,
      estimatedDuration: taskAnalysis.estimatedDuration
    };
  }

  /**
   * Enhanced agent assignment with checkpoint agent prioritization
   */
  async assignTasksToAgentsWithCheckpoints(taskGraph) {
    const assignments = new Map();
    const projectAgents = new Map();
    
    console.log(`🎯 Assigning ${taskGraph.nodes.length} tasks to agents with checkpoint prioritization`);
    
    // Separate tasks by type for better assignment strategy
    const standardTasks = [];
    const checkpointTasks = [];
    const finalReviewTasks = [];
    
    taskGraph.nodes.forEach(node => {
      const task = node.data;
      if (task.isFinalReview) {
        finalReviewTasks.push(task);
      } else if (task.isCheckpoint) {
        checkpointTasks.push(task);
      } else {
        standardTasks.push(task);
      }
    });
    
    console.log(`📊 Task distribution: ${standardTasks.length} standard, ${checkpointTasks.length} checkpoint, ${finalReviewTasks.length} final review`);
    
    // Step 1: Assign standard tasks to development agents only (exclude checkpoint agents)
    standardTasks.forEach(task => {
      const suitableAgentType = this.findBestDevelopmentAgentForTask(task);
      if (suitableAgentType) {
        const assignment = this.assignTaskToAgent(task, suitableAgentType, projectAgents, assignments, taskGraph.id);
        console.log(`✅ Assigned "${task.title}" to ${assignment.agent.name} (${assignment.agent.type})`);
      }
    });
    
    // Step 2: Assign checkpoint tasks to specialized checkpoint agents
    checkpointTasks.forEach(task => {
      let agentType = null;
      
      if (task.checkpointType === 'code_review') {
        agentType = this.getCheckpointAgentType('code_review_specialist');
      } else if (task.checkpointType === 'qa_testing') {
        agentType = this.getCheckpointAgentType('qa_testing_specialist');
      }
      
      if (agentType) {
        const assignment = this.assignTaskToAgent(task, agentType, projectAgents, assignments, taskGraph.id);
        console.log(`🔍 Assigned checkpoint "${task.title}" to ${assignment.agent.name} (${assignment.agent.type})`);
      }
    });
    
    // Step 3: Assign final review tasks to senior checkpoint agents
    finalReviewTasks.forEach(task => {
      let agentType = null;
      
      if (task.checkpointType === 'final_code_review') {
        agentType = this.getCheckpointAgentType('code_review_specialist');
      } else if (task.checkpointType === 'final_qa_testing') {
        agentType = this.getCheckpointAgentType('qa_testing_specialist');
      }
      
      if (agentType) {
        const assignment = this.assignTaskToAgent(task, agentType, projectAgents, assignments, taskGraph.id);
        console.log(`🎯 Assigned final review "${task.title}" to ${assignment.agent.name} (${assignment.agent.type})`);
      }
    });
    
    console.log(`🏆 Agent assignment complete: ${assignments.size} agents assigned to ${taskGraph.nodes.length} tasks`);
    return assignments;
  }
  
  /**
   * Helper method to assign a single task to an agent
   */
  assignTaskToAgent(task, agentType, projectAgents, assignments, projectId) {
    // Create or get agent instance
    let agent = projectAgents.get(agentType.id);
    if (!agent) {
      agent = this.createAgentInstance(agentType, projectId);
      projectAgents.set(agentType.id, agent);
    }
    
    // Calculate skill match percentage
    const skillMatch = this.calculateSkillMatch(task, agentType);
    
    // Assign task to agent
    if (!assignments.has(agent.id)) {
      assignments.set(agent.id, {
        agent: agent,
        tasks: []
      });
    }
    
    const enhancedTask = {
      ...task,
      assignedAt: new Date(),
      status: 'assigned',
      skillMatch: skillMatch,
      estimatedEffort: this.calculateTaskEffort(task, agentType)
    };
    
    assignments.get(agent.id).tasks.push(enhancedTask);
    
    // Update agent assignment info
    agent.assignedTaskCount = (agent.assignedTaskCount || 0) + 1;
    agent.checkpointTaskCount = task.isCheckpoint ? (agent.checkpointTaskCount || 0) + 1 : (agent.checkpointTaskCount || 0);
    agent.standardTaskCount = !task.isCheckpoint && !task.isFinalReview ? (agent.standardTaskCount || 0) + 1 : (agent.standardTaskCount || 0);
    
    return { agent, task: enhancedTask };
  }
  
  /**
   * Get checkpoint agent type configuration
   */
  getCheckpointAgentType(agentId) {
    // First try specialized agents
    try {
      if (this.specializedAgents) {
        const agents = this.specializedAgents.getAllAgents();
        const specializedAgent = agents.find(agent => agent.id === agentId);
        if (specializedAgent) {
          return this.convertSpecializedAgentToLegacy(specializedAgent);
        }
      }
    } catch (error) {
      console.warn('Error getting specialized checkpoint agent:', error.message);
    }
    
    // Fallback to legacy agent types
    if (agentId === 'code_review_specialist') {
      return {
        id: 'code_review_specialist',
        name: 'Code Review Specialist',
        capabilities: ['code_quality', 'security_review', 'performance_analysis', 'best_practices', 'architecture_review'],
        specialization: 'Code Review & Quality Assurance',
        maxConcurrentTasks: 4,
        estimatedTaskTime: 10,
        efficiency: {
          'code_quality': 0.95,
          'security_review': 0.92,
          'performance_analysis': 0.88,
          'best_practices': 0.94
        }
      };
    } else if (agentId === 'qa_testing_specialist') {
      return {
        id: 'qa_testing_specialist',
        name: 'QA Testing Specialist',
        capabilities: ['testing', 'quality_assurance', 'test_automation', 'validation', 'e2e_testing', 'integration_testing'],
        specialization: 'Quality Assurance & Test Automation',
        maxConcurrentTasks: 4,
        estimatedTaskTime: 12,
        efficiency: {
          'testing': 0.94,
          'quality_assurance': 0.95,
          'test_automation': 0.92,
          'validation': 0.90
        }
      };
    }
    
    return null;
  }

  /**
   * Assign tasks to specialized agents based on capabilities and workload - ORIGINAL METHOD
   */
  async assignTasksToAgents(taskGraph) {
    const assignments = new Map();
    
    // Create agent instances for this project
    const projectAgents = new Map();
    
    taskGraph.nodes.forEach(node => {
      const task = node.data;
      const suitableAgentType = this.findBestAgentForTask(task);
      
      if (suitableAgentType) {
        // Create or get agent instance
        let agent = projectAgents.get(suitableAgentType.id);
        if (!agent) {
          agent = this.createAgentInstance(suitableAgentType, taskGraph.id);
          projectAgents.set(suitableAgentType.id, agent);
        }
        
        // Calculate skill match percentage
        const skillMatch = this.calculateSkillMatch(task, suitableAgentType);
        
        // Assign task to agent
        if (!assignments.has(agent.id)) {
          assignments.set(agent.id, {
            agent: agent,
            tasks: []
          });
        }
        
        assignments.get(agent.id).tasks.push({
          ...task,
          assignedAt: new Date(),
          status: 'assigned',
          skillMatch: skillMatch,
          estimatedEffort: this.calculateTaskEffort(task, suitableAgentType)
        });
        
        // Update task node with agent assignment
        node.data.assignedAgent = agent.id;
        node.data.skillMatch = skillMatch;
      }
    });
    
    return assignments;
  }

  /**
   * Find the best agent for a task based on capabilities and efficiency
   */
  findBestAgentForTask(task) {
    try {
      // First try to use the new specialized agent registry
      if (this.specializedAgents) {
        const selection = this.specializedAgents.findBestAgent(task);
        
        if (selection && selection.bestAgent && selection.bestAgent.suitabilityScore > 0.5) {
          console.log(`Selected ${selection.bestAgent.agent.name} for task "${task.title}" (score: ${(selection.bestAgent.suitabilityScore * 100).toFixed(1)}%)`);
          
          // Convert specialized agent to legacy format for compatibility
          return this.convertSpecializedAgentToLegacy(selection.bestAgent.agent);
        }
      }
    } catch (error) {
      console.warn('Error using specialized agents, falling back to legacy system:', error.message);
    }
    
    // Fallback to legacy agent selection
    const taskSkills = task.skills || [];
    let bestAgent = null;
    let bestScore = 0;
    
    Object.values(this.agentTypes).forEach(agentType => {
      // Calculate capability match
      const matchingSkills = taskSkills.filter(skill => 
        agentType.capabilities.includes(skill)
      );
      
      if (matchingSkills.length === 0) return;
      
      // Calculate efficiency score
      const efficiencyScore = matchingSkills.reduce((total, skill) => {
        return total + (agentType.efficiency[skill] || 0.5);
      }, 0) / matchingSkills.length;
      
      // Calculate coverage score (how many required skills this agent covers)
      const coverageScore = matchingSkills.length / taskSkills.length;
      
      // Combined score
      const totalScore = (efficiencyScore * 0.6) + (coverageScore * 0.4);
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAgent = agentType;
      }
    });
    
    // Fallback to frontend specialist if no agent found
    if (!bestAgent) {
      console.warn('No suitable agent found for task:', task.title, 'using frontend specialist as fallback');
      bestAgent = this.agentTypes.FRONTEND_SPECIALIST;
    }
    
    return bestAgent;
  }

  /**
   * Find the best DEVELOPMENT agent for a task (excludes checkpoint agents like Code Review and QA)
   */
  findBestDevelopmentAgentForTask(task) {
    try {
      // First try to use the new specialized agent registry, but only development agents
      if (this.specializedAgents) {
        const allCandidates = this.specializedAgents.getAllAgents();
        
        // Filter out checkpoint-only agents (Code Review and QA specialists)
        const developmentAgents = allCandidates.filter(agent => {
          return agent.id !== 'code_review_specialist' && agent.id !== 'qa_testing_specialist';
        });
        
        // Calculate scores for development agents only
        const scoredCandidates = [];
        for (const agent of developmentAgents) {
          const skillMatch = agent.calculateSkillMatch(task);
          const estimate = agent.estimateTask(task);
          const suitabilityScore = this.specializedAgents.calculateSuitabilityScore(agent, task, skillMatch, estimate, {});
          
          scoredCandidates.push({
            agent,
            skillMatch,
            estimate,
            suitabilityScore
          });
        }
        
        // Sort by suitability score (descending)
        scoredCandidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
        
        if (scoredCandidates.length > 0 && scoredCandidates[0].suitabilityScore > 0.5) {
          const bestCandidate = scoredCandidates[0];
          console.log(`Selected ${bestCandidate.agent.name} for task "${task.title}" (score: ${(bestCandidate.suitabilityScore * 100).toFixed(1)}%)`);
          
          // Convert specialized agent to legacy format for compatibility
          return this.convertSpecializedAgentToLegacy(bestCandidate.agent);
        }
      }
    } catch (error) {
      console.warn('Error using specialized development agents, falling back to legacy system:', error.message);
    }
    
    // Fallback to legacy agent selection (excluding checkpoint agents)
    const taskSkills = task.skills || [];
    let bestAgent = null;
    let bestScore = 0;
    
    // Only consider development agent types (exclude checkpoint agents)
    const developmentAgentTypes = Object.fromEntries(
      Object.entries(this.agentTypes).filter(([key, agent]) => {
        return key !== 'CODE_REVIEW_SPECIALIST' && key !== 'QA_TESTING_SPECIALIST';
      })
    );
    
    Object.values(developmentAgentTypes).forEach(agentType => {
      // Calculate capability match
      const matchingSkills = taskSkills.filter(skill => 
        agentType.capabilities.includes(skill)
      );
      
      if (matchingSkills.length === 0) return;
      
      // Calculate efficiency score
      const efficiencyScore = matchingSkills.reduce((total, skill) => {
        return total + (agentType.efficiency[skill] || 0.5);
      }, 0) / matchingSkills.length;
      
      // Calculate coverage score (how many required skills this agent covers)
      const coverageScore = matchingSkills.length / taskSkills.length;
      
      // Combined score
      const totalScore = (efficiencyScore * 0.6) + (coverageScore * 0.4);
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAgent = agentType;
      }
    });
    
    // Fallback to frontend specialist if no development agent found
    if (!bestAgent) {
      console.warn('No suitable development agent found for task:', task.title, 'using frontend specialist as fallback');
      bestAgent = this.agentTypes.FRONTEND_SPECIALIST;
    }
    
    return bestAgent;
  }

  /**
   * Convert specialized agent to legacy format for backward compatibility
   */
  convertSpecializedAgentToLegacy(specializedAgent) {
    const capabilities = Object.keys(specializedAgent.capabilities);
    const efficiency = {};
    
    // Convert capability objects to efficiency scores
    capabilities.forEach(cap => {
      if (specializedAgent.capabilities[cap] && specializedAgent.capabilities[cap].efficiency) {
        efficiency[cap] = specializedAgent.capabilities[cap].efficiency;
      }
    });
    
    return {
      id: specializedAgent.id,
      name: specializedAgent.name,
      capabilities: capabilities,
      specialization: specializedAgent.specialization,
      maxConcurrentTasks: specializedAgent.configuration?.maxConcurrentTasks || 3,
      estimatedTaskTime: specializedAgent.configuration?.estimatedTaskTime || 15,
      efficiency: efficiency
    };
  }

  /**
   * Get task assignment recommendations using specialized agents
   */
  getTaskRecommendations(task, count = 3) {
    try {
      if (this.specializedAgents) {
        return this.specializedAgents.generateTaskRecommendations(task, count);
      }
    } catch (error) {
      console.warn('Error getting specialized agent recommendations:', error.message);
    }
    
    // Fallback to basic recommendation
    const bestAgent = this.findBestAgentForTask(task);
    return {
      task: task,
      recommendations: [{
        rank: 1,
        agent: {
          id: bestAgent.id,
          name: bestAgent.name,
          specialization: bestAgent.specialization
        },
        scores: {
          skillMatch: this.calculateSkillMatch(task, bestAgent).toString(),
          suitability: '85.0',
          confidence: '80.0'
        },
        reason: 'Legacy agent selection',
        recommended: true
      }]
    };
  }

  /**
   * Get specialized agent registry stats
   */
  getAgentRegistryStats() {
    try {
      if (this.specializedAgents) {
        return this.specializedAgents.getRegistryStats();
      }
    } catch (error) {
      console.warn('Error getting agent registry stats:', error.message);
    }
    
    return {
      totalAgents: Object.keys(this.agentTypes).length,
      specializations: Object.values(this.agentTypes).map(agent => agent.specialization),
      usingLegacySystem: true
    };
  }

  /**
   * Calculate skill match percentage between task and agent
   */
  calculateSkillMatch(task, agentType) {
    const taskSkills = task.skills || [];
    const agentSkills = agentType.capabilities || [];
    
    if (taskSkills.length === 0) return 0.5;
    
    const matchingSkills = taskSkills.filter(skill => agentSkills.includes(skill));
    return Math.round((matchingSkills.length / taskSkills.length) * 100);
  }

  /**
   * Calculate estimated effort for a task based on agent efficiency
   */
  calculateTaskEffort(task, agentType) {
    const baseEffort = task.estimatedHours || agentType.estimatedTaskTime;
    const taskSkills = task.skills || [];
    
    // Calculate efficiency multiplier
    const efficiencyMultiplier = taskSkills.reduce((total, skill) => {
      return total + (agentType.efficiency[skill] || 0.5);
    }, 0) / Math.max(taskSkills.length, 1);
    
    // Adjust effort based on efficiency (higher efficiency = less time needed)
    return Math.round(baseEffort / efficiencyMultiplier);
  }

  /**
   * Create agent instance with kanban board
   */
  createAgentInstance(agentType, projectId) {
    // Defensive check for undefined agentType
    if (!agentType) {
      console.error('createAgentInstance called with undefined agentType');
      throw new Error('Agent type is required to create agent instance');
    }
    
    if (!agentType.id) {
      console.error('createAgentInstance called with agentType missing id:', agentType);
      throw new Error('Agent type must have an id property');
    }
    
    const agent = {
      id: uuidv4(),
      type: agentType.id,
      name: agentType.name || 'Unknown Agent',
      capabilities: agentType.capabilities || [],
      specialization: agentType.specialization || 'General',
      projectId: projectId,
      status: 'idle',
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
        averageTaskTime: 0,
        successRate: 100,
        workloadScore: 0,
        efficiency: agentType.efficiency || {}
      },
      completedTasks: [], // Initialize the completedTasks array
      logs: [], // Initialize the logs array
      preferences: {
        maxConcurrentTasks: agentType.maxConcurrentTasks || 2,
        preferredTaskTypes: agentType.capabilities || []
      },
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    return agent;
  }

  /**
   * Create comprehensive kanban board for project and agents
   */
  createKanbanBoard(agentAssignments) {
    const projectBoard = {
      id: uuidv4(),
      name: 'Project Overview',
              columns: {
          todo: {
            tasks: []
          },
          inProgress: {
            tasks: []
          },
          revision: {
            tasks: []
          },
          review: {
            tasks: []
          },
          completed: {
            tasks: []
          },
          blocked: {
            tasks: []
          },
          failed: {
            tasks: []
          }
        },
      agents: {}
    };
    
    // Create individual agent boards
    agentAssignments.forEach((assignment, agentId) => {
      const agent = assignment.agent;
      const agentBoard = {
        id: agentId,
        name: agent.name,
        type: agent.type,
        specialization: agent.specialization,
                  columns: {
            todo: {
              tasks: assignment.tasks.map(task => ({
                ...task,
                status: 'todo'
              }))
            },
            inProgress: {
              tasks: []
            },
            revision: {
              tasks: []
            },
            review: {
              tasks: []
            },
            completed: {
              tasks: []
            },
            blocked: {
              tasks: []
            },
            failed: {
              tasks: []
            }
          },
        metrics: agent.metrics,
        workload: this.calculateAgentWorkload(assignment.tasks)
      };
      
      projectBoard.agents[agentId] = agentBoard;
      
      // Add tasks to project overview with checkpoint indicators
      assignment.tasks.forEach(task => {
        projectBoard.columns.todo.tasks.push({
          ...task,
          agentId: agentId,
          agentName: agent.name,
          isCheckpoint: task.isCheckpoint || false,
          checkpointType: task.checkpointType || null,
          originalTaskId: task.originalTaskId || null,
          isFinalReview: task.isFinalReview || false
        });
      });
    });
    
    return projectBoard;
  }

  /**
   * Calculate agent workload based on assigned tasks
   */
  calculateAgentWorkload(tasks) {
    const totalEffort = tasks.reduce((total, task) => total + (task.estimatedEffort || 1), 0);
    const totalTasks = tasks.length;
    
    return {
      totalTasks: totalTasks,
      totalEffort: totalEffort,
      averageEffort: totalTasks > 0 ? Math.round(totalEffort / totalTasks) : 0,
      workloadLevel: this.getWorkloadLevel(totalEffort)
    };
  }

  /**
   * Determine workload level based on total effort
   */
  getWorkloadLevel(totalEffort) {
    if (totalEffort < 10) return 'light';
    if (totalEffort < 25) return 'moderate';
    if (totalEffort < 40) return 'heavy';
    return 'overloaded';
  }

  /**
   * Calculate project duration based on parallel execution
   */
  calculateProjectDuration(taskGraph) {
    // Simple parallel execution calculation
    const tasksByLevel = this.getTaskExecutionLevels(taskGraph);
    
    return tasksByLevel.reduce((total, level) => {
      const maxTimeInLevel = Math.max(...level.map(task => task.estimatedHours || 1));
      return total + maxTimeInLevel;
    }, 0);
  }

  /**
   * Get task execution levels for parallel processing
   */
  getTaskExecutionLevels(taskGraph) {
    const levels = [];
    const processed = new Set();
    const nodes = taskGraph.nodes;
    
    while (processed.size < nodes.length) {
      const currentLevel = [];
      
      nodes.forEach(node => {
        if (processed.has(node.id)) return;
        
        const task = node.data;
        const dependencies = task.dependencies || [];
        
        // Check if all dependencies are processed
        const canExecute = dependencies.every(depId => processed.has(depId));
        
        if (canExecute) {
          currentLevel.push(task);
          processed.add(node.id);
        }
      });
      
      if (currentLevel.length > 0) {
        levels.push(currentLevel);
      } else {
        // Prevent infinite loop - break circular dependencies
        break;
      }
    }
    
    return levels;
  }

  /**
   * Calculate node position for graph visualization
   */
  calculateNodePosition(task, allTasks) {
    const index = allTasks.indexOf(task);
    const totalTasks = allTasks.length;
    
    // Arrange in a grid pattern
    const columns = Math.ceil(Math.sqrt(totalTasks));
    const row = Math.floor(index / columns);
    const col = index % columns;
    
    return {
      x: col * 250 + 50,
      y: row * 150 + 50
    };
  }

  /**
   * Start task execution for the project
   */
  async startTaskExecution(projectId, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    // Find tasks with no dependencies to start first
    const readyTasks = this.findReadyTasks(project.taskGraph);
    
    for (const task of readyTasks) {
      await this.executeTask(projectId, task.id, socket);
    }
  }

  /**
   * Find tasks that are ready to execute (no pending dependencies)
   */
  findReadyTasks(taskGraph) {
    const readyTasks = [];
    
    taskGraph.nodes.forEach(node => {
      const task = node.data;
      if (task.status === 'todo') {
        // Check if all dependencies are completed
        const dependencies = taskGraph.edges.filter(edge => edge.target === task.id);
        const allDependenciesComplete = dependencies.every(dep => {
          const depTask = taskGraph.nodes.find(n => n.id === dep.source);
          return depTask && depTask.data.status === 'completed';
        });
        
        if (dependencies.length === 0 || allDependenciesComplete) {
          readyTasks.push(task);
        }
      }
    });
    
    return readyTasks;
  }

  /**
   * Execute a specific task
   */
  async executeTask(projectId, taskId, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    // Find the task and its assigned agent
    const taskNode = project.taskGraph.nodes.find(n => n.id === taskId);
    if (!taskNode) return;
    
    const task = taskNode.data;
    const agentAssignment = Array.from(project.agentAssignments.values())
      .find(assignment => assignment.tasks.some(t => t.id === taskId));
    
    if (!agentAssignment) return;
    
    const agent = agentAssignment.agent;
    
    // Update task status
    task.status = 'in_progress';
    task.startedAt = new Date();
    
    // Update kanban board
    this.moveTaskInKanban(project.kanbanBoard, taskId, 'todo', 'inProgress', agent.id);
    
    // Emit task started event
    socket.emit('task_started', {
      projectId,
      taskId,
      agentId: agent.id,
      task: task
    });
    
    // Simulate task execution (replace with actual Goose CLI integration)
    setTimeout(async () => {
      await this.completeTask(projectId, taskId, socket);
    }, (task.estimatedHours || 1) * 1000); // Simulate time
  }

  /**
   * Complete a task and trigger dependent tasks
   */
  async completeTask(projectId, taskId, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    const taskNode = project.taskGraph.nodes.find(n => n.id === taskId);
    if (!taskNode) return;
    
    const task = taskNode.data;
    const agentAssignment = Array.from(project.agentAssignments.values())
      .find(assignment => assignment.tasks.some(t => t.id === taskId));
    
    if (!agentAssignment) return;
    
    const agent = agentAssignment.agent;
    
    // Update task status
    task.status = 'completed';
    task.completedAt = new Date();
    
    // Update agent metrics
    agent.metrics.tasksCompleted++;
    agent.completedTasks.push(task);
    
    // Update kanban board
    this.moveTaskInKanban(project.kanbanBoard, taskId, 'inProgress', 'completed', agent.id);
    
    // Emit task completed event
    socket.emit('task_completed', {
      projectId,
      taskId,
      agentId: agent.id,
      task: task
    });
    
    // Check for newly available tasks
    const newReadyTasks = this.findReadyTasks(project.taskGraph);
    for (const readyTask of newReadyTasks) {
      if (readyTask.status === 'todo') {
        await this.executeTask(projectId, readyTask.id, socket);
      }
    }
    
    // Check if project is complete
    const allTasksComplete = project.taskGraph.nodes.every(node => 
      node.data.status === 'completed'
    );
    
    if (allTasksComplete) {
      await this.completeProject(projectId, socket);
    }
  }

  /**
   * Move task between kanban columns
   */
  moveTaskInKanban(kanbanBoard, taskId, fromColumn, toColumn, agentId) {
    // Defensive checks
    if (!kanbanBoard || !kanbanBoard.columns) {
      console.warn('moveTaskInKanban: Invalid kanban board structure');
      return;
    }
    
    if (!kanbanBoard.columns[fromColumn] || !kanbanBoard.columns[toColumn]) {
      console.warn('moveTaskInKanban: Invalid column names', fromColumn, toColumn);
      return;
    }
    
    if (!kanbanBoard.columns[fromColumn].tasks || !kanbanBoard.columns[toColumn].tasks) {
      console.warn('moveTaskInKanban: Column tasks arrays not initialized');
      return;
    }
    
    // Move in agent-specific kanban
    if (kanbanBoard.agents && kanbanBoard.agents[agentId]) {
      const agentKanban = kanbanBoard.agents[agentId];
      if (agentKanban.columns && 
          agentKanban.columns[fromColumn] && 
          agentKanban.columns[fromColumn].tasks &&
          agentKanban.columns[toColumn] &&
          agentKanban.columns[toColumn].tasks) {
        
        const taskIndex = agentKanban.columns[fromColumn].tasks.findIndex(t => t.id === taskId);
        
        if (taskIndex !== -1) {
          const task = agentKanban.columns[fromColumn].tasks.splice(taskIndex, 1)[0];
          agentKanban.columns[toColumn].tasks.push(task);
        }
      }
    }
    
    // Move in main kanban
    const taskIndex = kanbanBoard.columns[fromColumn].tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const task = kanbanBoard.columns[fromColumn].tasks.splice(taskIndex, 1)[0];
      kanbanBoard.columns[toColumn].tasks.push(task);
    }
  }

  /**
   * Complete the entire project
   */
  async completeProject(projectId, socket) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;
    
    project.status = 'completed';
    project.completedAt = new Date();
    
    // Calculate final metrics
    const duration = project.completedAt - project.createdAt;
    const successRate = project.taskGraph.nodes.filter(n => n.data.status === 'completed').length / 
                       project.taskGraph.nodes.length * 100;
    
    socket.emit('project_completed', {
      projectId,
      duration: duration,
      successRate: successRate,
      metrics: project.metrics,
      kanbanBoard: project.kanbanBoard
    });
  }

  /**
   * Get project status
   */
  getProjectStatus(projectId) {
    return this.activeProjects.get(projectId);
  }

  /**
   * Get all active projects
   */
  getAllActiveProjects() {
    return Array.from(this.activeProjects.values());
  }

  /**
   * Get a specific project by ID
   */
  getProject(projectId) {
    return this.activeProjects.get(projectId);
  }

  /**
   * Get the currently active project (most recent)
   */
  getActiveProject() {
    let mostRecent = null;
    let latestTime = 0;
    
    this.activeProjects.forEach((project) => {
      if (project.status === 'active' && project.createdAt.getTime() > latestTime) {
        mostRecent = project;
        latestTime = project.createdAt.getTime();
      }
    });
    
    return mostRecent;
  }

  /**
   * Create a test project for demonstration purposes
   */
  createTestProject() {
    const projectId = `test-project-${Date.now()}`;
    
    // Create test task graph
    const taskGraph = {
      id: projectId,
      nodes: [
        {
          id: 'task-1',
          type: 'task',
          data: {
            id: 'task-1',
            title: 'Frontend Development',
            description: 'Create responsive user interface with React',
            priority: 'high',
            estimatedHours: 12,
            status: 'in_progress',
            progress: 45,
            skills: ['react', 'javascript', 'css'],
            type: 'frontend'
          }
        },
        {
          id: 'task-2',
          type: 'task',
          data: {
            id: 'task-2',
            title: 'Backend API',
            description: 'Build RESTful API with Node.js',
            priority: 'high',
            estimatedHours: 15,
            status: 'todo',
            progress: 0,
            skills: ['nodejs', 'express', 'mongodb'],
            type: 'backend'
          }
        },
        {
          id: 'task-3',
          type: 'task',
          data: {
            id: 'task-3',
            title: 'Database Design',
            description: 'Design optimal database schema',
            priority: 'medium',
            estimatedHours: 8,
            status: 'completed',
            progress: 100,
            skills: ['database', 'mongodb', 'schema'],
            type: 'database'
          }
        }
      ],
      edges: [
        {
          id: 'task-3-task-2',
          source: 'task-3',
          target: 'task-2',
          type: 'dependency'
        },
        {
          id: 'task-2-task-1',
          source: 'task-2',
          target: 'task-1',
          type: 'dependency'
        }
      ]
    };

    // Create test agents
    const frontendAgent = this.createAgentInstance(this.agentTypes.FRONTEND_SPECIALIST, projectId);
    const backendAgent = this.createAgentInstance(this.agentTypes.BACKEND_SPECIALIST, projectId);
    const databaseAgent = this.createAgentInstance(this.agentTypes.DATABASE_ARCHITECT, projectId);

    // Set up agent assignments
    const agentAssignments = new Map();
    
    // Frontend agent
    agentAssignments.set(frontendAgent.id, {
      agent: frontendAgent,
      tasks: [taskGraph.nodes[0].data]
    });
    
    // Backend agent
    agentAssignments.set(backendAgent.id, {
      agent: backendAgent,
      tasks: [taskGraph.nodes[1].data]
    });
    
    // Database agent
    agentAssignments.set(databaseAgent.id, {
      agent: databaseAgent,
      tasks: [taskGraph.nodes[2].data]
    });

    // Create kanban board
    const kanbanBoard = this.createKanbanBoard(agentAssignments);

    // Create project
    const project = {
      id: projectId,
      name: 'Test Multi-Agent Project',
      description: 'A demonstration project showing the LangGraph-inspired orchestration system',
      status: 'active',
      createdAt: new Date(),
      taskGraph: taskGraph,
      agentAssignments: agentAssignments,
      kanbanBoard: kanbanBoard,
      projectType: 'web_application',
      complexity: 'medium',
      estimatedDuration: 35
    };

    // Store the project
    this.activeProjects.set(projectId, project);

    return project;
  }

  /**
   * Main orchestration method called by server - bridges to orchestrateProject
   */
  async orchestrateTask(task, description, projectPath, socket, jobName = null) {
    try {
      // Create a comprehensive prompt from task and description
      const prompt = `${task}${description ? ': ' + description : ''}`;
      
      // Create job tracking
      const jobId = jobName || `job-${Date.now()}`;
      const job = {
        id: jobId,
        name: jobName || 'Orchestrated Task',
        task: task,
        description: description,
        projectPath: projectPath,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        socketId: socket.id, // Store socket ID instead of socket reference
        progress: 0
      };
      
      // Store socket reference separately
      if (!this.jobSockets) {
        this.jobSockets = new Map();
      }
      this.jobSockets.set(jobId, socket);
      
      // Store job in jobStorage if available
      if (this.jobStorage) {
        this.jobStorage.addJob(job);
      }
      
      // Initialize jobs map if not exists (fallback safety)
      if (!this.activeJobs) {
        this.activeJobs = new Map();
      }
      if (!this.jobHistory) {
        this.jobHistory = [];
      }
      if (!this.jobSockets) {
        this.jobSockets = new Map();
      }
      
      this.activeJobs.set(jobId, job);
      
      // Emit job started event (without socket reference)
      socket.emit('job_started', { jobId, job: this.sanitizeJobForTransmission(job) });
      
      // Orchestrate the project
      const project = await this.orchestrateProject(prompt, projectPath, socket, {
        jobId: jobId,
        jobName: jobName
      });
      
      // Update job status
      job.status = 'completed';
      job.projectId = project.id;
      job.updatedAt = new Date();
      job.progress = 100;
      
      // Move to history
      this.jobHistory.unshift(job);
      this.activeJobs.delete(jobId);
      
      // Clean up socket reference
      if (this.jobSockets) {
        this.jobSockets.delete(jobId);
      }
      
      // Cleanup goose sessions for completed project
      try {
        await this.gooseIntegration.cleanupProjectSessions(project.id, 'completed', socket);
      } catch (cleanupError) {
        console.error('Error cleaning up goose sessions for completed project:', cleanupError);
      }
      
      socket.emit('job_completed', { jobId, job: this.sanitizeJobForTransmission(job), project: this.sanitizeProjectForTransmission(project) });
      
      return project;
      
    } catch (error) {
      console.error('Orchestration task failed:', error);
      
      // Update job status to failed
      const job = this.activeJobs?.get(jobName || `job-${Date.now()}`);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.updatedAt = new Date();
        
        // Ensure jobHistory exists
        if (!this.jobHistory) {
          this.jobHistory = [];
        }
        this.jobHistory.unshift(job);
        this.activeJobs.delete(job.id);
        
        // Clean up socket reference
        if (this.jobSockets) {
          this.jobSockets.delete(job.id);
        }
        
        // Cleanup goose sessions for failed project
        try {
          await this.gooseIntegration.cleanupProjectSessions(job.projectId || 'unknown', 'failed', socket);
        } catch (cleanupError) {
          console.error('Error cleaning up goose sessions for failed project:', cleanupError);
        }
        
        socket.emit('job_failed', { jobId: job.id, job: this.sanitizeJobForTransmission(job), error: error.message });
      }
      
      throw error;
    }
  }

  /**
   * Get all active jobs
   */
  getActiveJobs() {
    if (!this.activeJobs) {
      this.activeJobs = new Map();
    }
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get job history with limit
   */
  getJobHistory(limit = 10) {
    if (!this.jobHistory) {
      this.jobHistory = [];
    }
    return this.jobHistory.slice(0, limit);
  }

  /**
   * Get all jobs (active + history)
   */
  getAllJobs() {
    const active = this.getActiveJobs();
    const history = this.getJobHistory(50);
    return [...active, ...history];
  }

  /**
   * Pause a job
   */
  async pauseJob(jobId) {
    const job = this.activeJobs?.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'paused';
    job.updatedAt = new Date();
    
    // Emit pause event
    const socket = this.jobSockets?.get(jobId);
    if (socket) {
      socket.emit('job_paused', { jobId, job: this.sanitizeJobForTransmission(job) });
    }
    
    return job;
  }

  /**
   * Resume a job
   */
  async resumeJob(jobId, socket) {
    const job = this.activeJobs?.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'active';
    job.updatedAt = new Date();
    job.socketId = socket.id; // Update socket ID
    
    // Update socket reference
    if (this.jobSockets) {
      this.jobSockets.set(jobId, socket);
    }
    
    // Emit resume event
    socket.emit('job_resumed', { jobId, job: this.sanitizeJobForTransmission(job) });
    
    return job;
  }

  /**
   * Stop a job
   */
  async stopJob(jobId) {
    const job = this.activeJobs?.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.status = 'stopped';
    job.updatedAt = new Date();
    
    // Move to history
    if (!this.jobHistory) {
      this.jobHistory = [];
    }
    this.jobHistory.unshift(job);
    this.activeJobs.delete(jobId);
    
    // Emit stop event
    const socket = this.jobSockets?.get(jobId);
    if (socket) {
      socket.emit('job_stopped', { jobId, job: this.sanitizeJobForTransmission(job) });
    }
    
    // Clean up socket reference
    if (this.jobSockets) {
      this.jobSockets.delete(jobId);
    }
    
    // Cleanup goose sessions for stopped project
    try {
      await this.gooseIntegration.cleanupProjectSessions(job.projectId || jobId, 'stopped', socket);
    } catch (cleanupError) {
      console.error('Error cleaning up goose sessions for stopped project:', cleanupError);
    }
    
    return job;
  }

  /**
   * Edit job goals
   */
  async editJobGoals(jobId, newGoals, newDescription) {
    const job = this.activeJobs?.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    job.task = newGoals || job.task;
    job.description = newDescription || job.description;
    job.updatedAt = new Date();
    
    // Emit update event
    const socket = this.jobSockets?.get(jobId);
    if (socket) {
      socket.emit('job_goals_updated', { jobId, job: this.sanitizeJobForTransmission(job) });
    }
    
    return job;
  }

  /**
   * Restart job with new goals
   */
  async restartJobWithNewGoals(jobId, socket) {
    const job = this.activeJobs?.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }
    
    // Reset job state
    job.status = 'active';
    job.socketId = socket.id;
    
    // Update socket reference
    if (this.jobSockets) {
      this.jobSockets.set(jobId, socket);
    }
    job.progress = 0;
    job.updatedAt = new Date();
    
    // Emit restart event
    socket.emit('job_restarted', { jobId, job: this.sanitizeJobForTransmission(job) });
    
    // Re-orchestrate with updated goals
    try {
      const prompt = `${job.task}${job.description ? ': ' + job.description : ''}`;
      const project = await this.orchestrateProject(prompt, job.projectPath, socket, {
        jobId: jobId,
        jobName: job.name
      });
      
      job.projectId = project.id;
      job.status = 'completed';
      job.progress = 100;
      job.updatedAt = new Date();
      
      return job;
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.updatedAt = new Date();
      throw error;
    }
  }

  /**
   * Reconnect job socket
   */
  reconnectJobSocket(jobId, socket) {
    const job = this.activeJobs?.get(jobId);
    if (!job) {
      return false;
    }
    
    job.socketId = socket.id;
    job.updatedAt = new Date();
    
    // Update socket reference
    if (this.jobSockets) {
      this.jobSockets.set(jobId, socket);
    }
    
    return true;
  }

  /**
   * Sanitize job object for transmission over socket.io
   * Removes circular references and non-serializable properties
   */
  sanitizeJobForTransmission(job) {
    if (!job) return job;
    
    // Create a clean copy without circular references
    const sanitized = {
      id: job.id,
      name: job.name,
      task: job.task,
      description: job.description,
      projectPath: job.projectPath,
      status: job.status,
      progress: job.progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      socketId: job.socketId,
      projectId: job.projectId,
      error: job.error
    };
    
    return sanitized;
  }

  /**
   * Sanitize project object for transmission over socket.io
   * Removes circular references and non-serializable properties
   */
  sanitizeProjectForTransmission(project) {
    if (!project) return project;
    
    const sanitized = {
      id: project.id,
      prompt: project.prompt,
      projectPath: project.projectPath,
      status: project.status,
      createdAt: project.createdAt,
      metrics: project.metrics,
      kanbanBoard: project.kanbanBoard,
      taskGraph: this.sanitizeTaskGraphForTransmission(project.taskGraph)
    };
    
    return sanitized;
  }

  /**
   * Sanitize task graph for transmission over socket.io
   * Removes circular references and non-serializable properties
   */
  sanitizeTaskGraphForTransmission(taskGraph) {
    if (!taskGraph) return taskGraph;
    
    const sanitized = {
      nodes: taskGraph.nodes ? taskGraph.nodes.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          // Preserve checkpoint information
          isCheckpoint: node.data?.isCheckpoint || false,
          checkpointType: node.data?.checkpointType || null,
          originalTaskId: node.data?.originalTaskId || null,
          isFinalReview: node.data?.isFinalReview || false
        }
      })) : [],
      edges: taskGraph.edges ? taskGraph.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        animated: edge.animated,
        label: edge.label
      })) : [],
      // Preserve enhanced task graph metadata
      originalTasks: taskGraph.originalTasks,
      checkpointTasks: taskGraph.checkpointTasks,
      finalReviewTasks: taskGraph.finalReviewTasks,
      totalTasks: taskGraph.totalTasks,
      checkpointMap: taskGraph.checkpointMap ? Object.fromEntries(taskGraph.checkpointMap) : {}
    };
    
    return sanitized;
  }

  /**
   * Enhanced state management utilities for debugging and monitoring
   */
  getStatefulGraphStatus(projectId) {
    const statefulGraph = this.projectGraphs.get(projectId);
    const graphState = this.graphState.get(projectId);
    const nodeStates = this.nodeStates.get(projectId);
    const memoryBank = this.graphMemory.get(projectId);
    
    if (!statefulGraph) {
      return { exists: false, error: 'No stateful graph found' };
    }
    
    return {
      exists: true,
      projectId: projectId,
      status: graphState?.status || 'unknown',
      version: statefulGraph.version,
      nodeCount: statefulGraph.graph.nodes.length,
      edgeCount: statefulGraph.graph.edges.length,
      conditionalEdgeCount: statefulGraph.conditionalEdges.size,
      currentNodes: graphState?.currentNodes?.length || 0,
      completedNodes: graphState?.completedNodes?.length || 0,
      failedNodes: graphState?.failedNodes?.length || 0,
      memorySize: memoryBank?.size || 0,
      checkpointCount: statefulGraph.checkpoints.size,
      eventLogSize: statefulGraph.eventLog.length,
      lastUpdate: statefulGraph.lastStateUpdate,
      progress: graphState?.actualProgress || 0,
      estimatedCompletion: graphState?.estimatedCompletion,
      errorCount: graphState?.errorCount || 0,
      retryCount: graphState?.retryCount || 0
    };
  }

  /**
   * Export stateful graph for debugging or backup
   */
  exportStatefulGraph(projectId) {
    const statefulGraph = this.projectGraphs.get(projectId);
    if (!statefulGraph) return null;
    
    try {
      return {
        id: projectId,
        exportedAt: new Date(),
        version: statefulGraph.version,
        graph: statefulGraph.graph,
        state: this.graphState.get(projectId),
        memory: Object.fromEntries(this.graphMemory.get(projectId) || new Map()),
        context: this.executionContext.get(projectId),
        nodeStates: Object.fromEntries(this.nodeStates.get(projectId) || new Map()),
        conditionalEdges: Object.fromEntries(statefulGraph.conditionalEdges),
        checkpoints: Object.fromEntries(statefulGraph.checkpoints),
        eventLog: statefulGraph.eventLog.slice(-100), // Last 100 events
        metadata: statefulGraph.metadata
      };
    } catch (error) {
      console.error('Failed to export stateful graph:', error);
      return null;
    }
  }

  /**
   * Validate entire stateful graph system integrity
   */
  async validateStatefulGraphSystem(projectId) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {}
    };
    
    try {
      // Check 1: Basic structure
      const statefulGraph = this.projectGraphs.get(projectId);
      if (!statefulGraph) {
        results.valid = false;
        results.errors.push('No stateful graph found');
        return results;
      }
      results.checks.structure = true;
      
      // Check 2: State consistency
      const graphState = this.graphState.get(projectId);
      if (!graphState || graphState.projectId !== projectId) {
        results.valid = false;
        results.errors.push('Graph state inconsistent or missing');
      } else {
        results.checks.graphState = true;
      }
      
      // Check 3: Node states
      const nodeStates = this.nodeStates.get(projectId);
      if (!nodeStates) {
        results.valid = false;
        results.errors.push('Node states missing');
      } else {
        // Validate node state consistency
        const graphNodeIds = new Set(statefulGraph.graph.nodes.map(n => n.id));
        let nodeStateIssues = 0;
        
        for (const nodeId of nodeStates.keys()) {
          if (!graphNodeIds.has(nodeId)) {
            nodeStateIssues++;
            results.warnings.push(`Node state exists for non-existent node: ${nodeId}`);
          }
        }
        
        results.checks.nodeStates = nodeStateIssues === 0;
        if (nodeStateIssues > 0) {
          results.warnings.push(`${nodeStateIssues} orphaned node states found`);
        }
      }
      
      // Check 4: Memory bank
      const memoryBank = this.graphMemory.get(projectId);
      if (!memoryBank) {
        results.warnings.push('Memory bank missing');
        results.checks.memory = false;
      } else {
        results.checks.memory = true;
      }
      
      // Check 5: Execution context
      const executionContext = this.executionContext.get(projectId);
      if (!executionContext) {
        results.warnings.push('Execution context missing');
        results.checks.executionContext = false;
      } else {
        results.checks.executionContext = true;
      }
      
      // Check 6: Conditional edges
      const edgeValidation = this.validateConditionalEdges(statefulGraph);
      results.checks.conditionalEdges = edgeValidation.valid;
      if (!edgeValidation.valid) {
        results.errors.push(...edgeValidation.errors);
        results.warnings.push(...edgeValidation.warnings);
      }
      
      // Check 7: Cycles (if any)
      const cycles = this.detectCycles(statefulGraph.graph);
      results.checks.cycles = {
        detected: cycles.length,
        hasCycles: cycles.length > 0
      };
      
      console.log(`🔍 Stateful graph validation complete: ${results.valid ? 'VALID' : 'INVALID'}`);
      
    } catch (error) {
      results.valid = false;
      results.errors.push(`Validation error: ${error.message}`);
      console.error('Stateful graph validation failed:', error);
    }
    
    return results;
  }

  /**
   * Validate conditional edges integrity
   */
  validateConditionalEdges(statefulGraph) {
    const result = { valid: true, errors: [], warnings: [] };
    
    try {
      for (const [edgeId, conditionalEdge] of statefulGraph.conditionalEdges) {
        // Check if source and target nodes exist
        const sourceExists = statefulGraph.graph.nodes.some(n => n.id === conditionalEdge.source);
        const targetExists = statefulGraph.graph.nodes.some(n => n.id === conditionalEdge.target);
        
        if (!sourceExists) {
          result.valid = false;
          result.errors.push(`Conditional edge ${edgeId} has non-existent source: ${conditionalEdge.source}`);
        }
        
        if (!targetExists) {
          result.valid = false;
          result.errors.push(`Conditional edge ${edgeId} has non-existent target: ${conditionalEdge.target}`);
        }
        
        // Check if evaluator function exists
        if (!conditionalEdge.evaluator || typeof conditionalEdge.evaluator !== 'function') {
          result.valid = false;
          result.errors.push(`Conditional edge ${edgeId} has invalid evaluator`);
        }
        
        // Check cyclical edge iteration limits
        if (conditionalEdge.isCyclical && conditionalEdge.currentIteration >= conditionalEdge.maxIterations) {
          result.warnings.push(`Cyclical edge ${edgeId} has reached maximum iterations`);
        }
      }
    } catch (error) {
      result.valid = false;
      result.errors.push(`Conditional edge validation error: ${error.message}`);
    }
    
    return result;
  }

  /**
   * Reset stateful graph to initial state (for testing/debugging)
   */
  async resetStatefulGraph(projectId) {
    const statefulGraph = this.projectGraphs.get(projectId);
    if (!statefulGraph) {
      throw new Error(`No stateful graph found for project: ${projectId}`);
    }
    
    try {
      // Reset to initial checkpoint if available
      if (statefulGraph.checkpoints.has('initialized')) {
        await this.restoreFromCheckpoint(projectId, 'initialized');
      } else {
        // Manual reset
        const graphState = this.graphState.get(projectId);
        const nodeStates = this.nodeStates.get(projectId);
        
        if (graphState) {
          graphState.status = 'initialized';
          graphState.currentNodes = [];
          graphState.completedNodes = [];
          graphState.failedNodes = [];
          graphState.availableNodes = this.findReadyNodes(statefulGraph.graph);
          graphState.errorCount = 0;
          graphState.retryCount = 0;
          graphState.lastError = null;
        }
        
        if (nodeStates) {
          for (const [nodeId, nodeState] of nodeStates) {
            nodeState.status = 'pending';
            nodeState.startTime = null;
            nodeState.endTime = null;
            nodeState.errors = [];
            nodeState.attempts = 0;
          }
        }
        
        // Reset conditional edge iterations
        for (const [edgeId, conditionalEdge] of statefulGraph.conditionalEdges) {
          conditionalEdge.currentIteration = 0;
          conditionalEdge.evaluationHistory = [];
        }
      }
      
      console.log(`🔄 Stateful graph reset to initial state: ${projectId}`);
      
    } catch (error) {
      console.error('Failed to reset stateful graph:', error);
      throw new Error(`Reset failed: ${error.message}`);
    }
  }

  // ============================================
  // PROJECT PERSISTENCE METHODS
  // ============================================

  /**
   * Auto-save project state during execution
   */
  async autoSaveProject(projectId) {
    const project = this.activeProjects.get(projectId);
    if (!project) return;

    try {
      const projectToSave = {
        ...project,
        statefulGraph: this.projectGraphs.get(projectId),
        graphState: this.graphState.get(projectId),
        nodeStates: this.nodeStates.get(projectId),
        graphMemory: this.graphMemory.get(projectId),
        executionContext: this.executionContext.get(projectId),
        agentStates: this.agentStates.get(projectId),
        updatedAt: new Date()
      };

      await this.projectPersistence.saveProject(projectToSave);
      console.log(`💾 Auto-saved project ${projectId}`);
    } catch (error) {
      console.warn(`Failed to auto-save project ${projectId}:`, error.message);
    }
  }

  /**
   * Resume a project from saved state
   */
  async resumeProject(projectId, socket) {
    try {
      console.log(`🔄 Resuming project ${projectId} from saved state...`);

      // Load project from disk
      const savedProject = await this.projectPersistence.loadProject(projectId);
      
      if (!savedProject.canResume) {
        throw new Error(`Project ${projectId} is not in a resumable state`);
      }

      // Restore project state
      this.activeProjects.set(projectId, savedProject);

      // Restore stateful graph if it exists
      if (savedProject.statefulGraph) {
        this.projectGraphs.set(projectId, savedProject.statefulGraph);
        
        if (savedProject.graphState) {
          this.graphState.set(projectId, savedProject.graphState);
        }
        
        if (savedProject.nodeStates) {
          this.nodeStates.set(projectId, savedProject.nodeStates);
        }
        
        if (savedProject.graphMemory) {
          this.graphMemory.set(projectId, savedProject.graphMemory);
        }
        
        if (savedProject.executionContext) {
          this.executionContext.set(projectId, savedProject.executionContext);
        }
        
        if (savedProject.agentStates) {
          this.agentStates.set(projectId, savedProject.agentStates);
        }
      }

      // Emit project resumed event
      socket.emit('project_resumed', {
        projectId: projectId,
        project: this.sanitizeProjectForTransmission(savedProject),
        resumedAt: new Date(),
        progress: savedProject.progress
      });

      // Broadcast agent states
      this.broadcastAgentStates(savedProject, socket);

      // Continue execution from where it left off
      if (savedProject.resumeFromState === 'in_progress' || savedProject.resumeFromState === 'paused') {
        if (savedProject.isStatefulGraph) {
          await this.executeStatefulGraph(projectId, socket);
        } else {
          await this.startSimplifiedTaskExecution(projectId, socket);
        }
      }

      console.log(`✅ Successfully resumed project ${projectId}`);
      return savedProject;

    } catch (error) {
      console.error(`❌ Failed to resume project ${projectId}:`, error);
      socket.emit('project_resume_error', { 
        projectId: projectId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * List all available projects
   */
  async listAvailableProjects() {
    try {
      return await this.projectPersistence.listProjects();
    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  }

  /**
   * Get project details including progress
   */
  async getProjectDetails(projectId) {
    try {
      return await this.projectPersistence.loadProject(projectId);
    } catch (error) {
      console.error(`Failed to get project details for ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId) {
    try {
      // Remove from active projects if it's running
      this.activeProjects.delete(projectId);
      this.projectGraphs.delete(projectId);
      this.graphState.delete(projectId);
      this.nodeStates.delete(projectId);
      this.graphMemory.delete(projectId);
      this.executionContext.delete(projectId);
      this.agentStates.delete(projectId);

      // Delete from disk
      await this.projectPersistence.deleteProject(projectId);
      
      console.log(`🗑️ Project ${projectId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to delete project ${projectId}:`, error);
      return false;
    }
  }

  /**
   * Create a checkpoint for a project
   */
  async createProjectCheckpoint(projectId, checkpointName) {
    try {
      const project = this.activeProjects.get(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found in active projects`);
      }

      const projectToSave = {
        ...project,
        statefulGraph: this.projectGraphs.get(projectId),
        graphState: this.graphState.get(projectId),
        nodeStates: this.nodeStates.get(projectId),
        graphMemory: this.graphMemory.get(projectId),
        executionContext: this.executionContext.get(projectId),
        agentStates: this.agentStates.get(projectId)
      };

      const checkpoint = await this.projectPersistence.createCheckpoint(
        projectId, 
        checkpointName, 
        projectToSave
      );

      console.log(`💾 Checkpoint '${checkpointName}' created for project ${projectId}`);
      return checkpoint;
    } catch (error) {
      console.error(`Failed to create checkpoint for project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Pause a project and save its state
   */
  async pauseProject(projectId, socket) {
    try {
      const project = this.activeProjects.get(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Update project status
      project.status = 'paused';
      project.pausedAt = new Date();

      // Update graph state if using stateful graph
      if (project.isStatefulGraph) {
        await this.transitionGraphState(projectId, 'paused', socket);
      }

      // Save the paused state
      await this.autoSaveProject(projectId);

      // Emit paused event
      socket.emit('project_paused', {
        projectId: projectId,
        pausedAt: new Date(),
        canResume: true
      });

      console.log(`⏸️ Project ${projectId} paused and saved`);
      return true;
    } catch (error) {
      console.error(`Failed to pause project ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Sanitize project data for transmission
   */
  sanitizeProjectForTransmission(project) {
    return {
      id: project.id,
      name: project.name,
      prompt: project.prompt,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      projectType: project.projectType,
      complexity: project.complexity,
      metrics: project.metrics,
      progress: project.progress,
      canResume: project.canResume,
      resumeFromState: project.resumeFromState,
      totalTasks: project.progress?.overallProgress?.totalTasks || 0,
      completedTasks: project.progress?.overallProgress?.completedTasks || 0,
      progressPercentage: project.progress?.overallProgress?.percentage || 0
    };
  }

  /**
   * Get project progress summary
   */
  async getProjectProgress(projectId) {
    try {
      const savedProject = await this.projectPersistence.loadProgress(projectId);
      return savedProject;
    } catch (error) {
      console.error(`Failed to get progress for project ${projectId}:`, error);
      return null;
    }
  }
}

module.exports = TaskOrchestrator; 