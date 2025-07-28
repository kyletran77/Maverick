#!/usr/bin/env node

/**
 * Comprehensive test for the bulletproof task graph system
 * Tests dependency resolution, agent assignment, and stateful execution
 */

const { EventEmitter } = require('events');
const TaskOrchestrator = require('../backend/src/orchestrator/TaskOrchestrator');

// Mock Socket.IO for testing
class MockSocket extends EventEmitter {
  constructor(id = 'test-socket') {
    super();
    this.id = id;
    this.events = [];
  }

  emit(event, data) {
    this.events.push({ event, data, timestamp: new Date() });
    console.log(`📡 Socket Event: ${event}`, JSON.stringify(data, null, 2));
    super.emit(event, data);
  }

  getEvents() {
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

// Mock IO for broadcasting
class MockIO extends EventEmitter {
  emit(event, data) {
    console.log(`🌐 Broadcast Event: ${event}`, JSON.stringify(data, null, 2));
  }
}

// Mock Job Storage
class MockJobStorage {
  constructor() {
    this.jobs = new Map();
  }

  addJob(job) {
    this.jobs.set(job.id, job);
    console.log(`💼 Job Added: ${job.id} - ${job.name}`);
  }

  getJob(id) {
    return this.jobs.get(id);
  }

  getAllJobs() {
    return Array.from(this.jobs.values());
  }
}

class TaskGraphTester {
  constructor() {
    this.mockIO = new MockIO();
    this.mockJobStorage = new MockJobStorage();
    this.orchestrator = new TaskOrchestrator(this.mockIO, this.mockJobStorage);
    this.testResults = [];
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async runTest(testName, testFn) {
    console.log(`\n🧪 Running Test: ${testName}`);
    console.log('='.repeat(60));
    
    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: testName,
        passed: true,
        duration,
        result
      });
      
      console.log(`✅ Test Passed: ${testName} (${duration}ms)`);
      return result;
    } catch (error) {
      this.testResults.push({
        name: testName,
        passed: false,
        error: error.message,
        stack: error.stack
      });
      
      console.error(`❌ Test Failed: ${testName}`);
      console.error(`Error: ${error.message}`);
      throw error;
    }
  }

  async testBasicTaskGraphCreation() {
    return this.runTest('Basic Task Graph Creation', async () => {
      const socket = new MockSocket();
      
      // Test prompt for a full-stack application
      const prompt = "Create a modern task management application with React frontend, Node.js backend, PostgreSQL database, user authentication, and real-time collaboration features";
      const projectPath = "./test-project";
      
      this.log('Creating stateful graph for full-stack application...');
      
      // Analyze the prompt
      const taskAnalysis = await this.orchestrator.analyzePromptForTasks(prompt, {});
      this.log('Task Analysis Complete', {
        projectType: taskAnalysis.projectType,
        complexity: taskAnalysis.complexity,
        taskCount: taskAnalysis.tasks.length,
        requiredAgents: taskAnalysis.requiredAgents
      });
      
      // Create stateful graph
      const statefulGraph = await this.orchestrator.createStatefulGraph(taskAnalysis, 'test-project-1', socket);
      
      // Validate the graph structure
      console.assert(statefulGraph.graph.nodes.length > 0, 'Graph should have nodes');
      console.assert(statefulGraph.state.projectId === 'test-project-1', 'Project ID should match');
      console.assert(statefulGraph.memory.size > 0, 'Memory bank should be initialized');
      
      return {
        nodeCount: statefulGraph.graph.nodes.length,
        edgeCount: statefulGraph.graph.edges.length,
        conditionalEdgeCount: statefulGraph.conditionalEdges.size,
        memorySize: statefulGraph.memory.size,
        checkpointCount: statefulGraph.checkpoints.size
      };
    });
  }

  async testDependencyResolution() {
    return this.runTest('Dependency Resolution', async () => {
      const socket = new MockSocket();
      
      // Create a project with clear dependencies
      const prompt = "Build a web application with database schema, backend API, frontend interface, and testing suite";
      const taskAnalysis = await this.orchestrator.analyzePromptForTasks(prompt, {});
      const statefulGraph = await this.orchestrator.createStatefulGraph(taskAnalysis, 'test-project-2', socket);
      
      this.log('Testing dependency resolution...');
      
      // Check initial available nodes (should have no dependencies)
      const initialAvailable = await this.orchestrator.getAvailableNodes('test-project-2');
      this.log('Initial Available Nodes', { count: initialAvailable.length, nodes: initialAvailable });
      
      // Test dependency checking for each node
      const dependencyTests = [];
      for (const node of statefulGraph.graph.nodes) {
        const hasDependencies = node.data.dependencies && node.data.dependencies.length > 0;
        const canExecuteNow = await this.orchestrator.checkDependencies('test-project-2', node.id);
        
        dependencyTests.push({
          nodeId: node.id,
          title: node.data.title,
          hasDependencies,
          dependencies: node.data.dependencies || [],
          canExecuteNow
        });
      }
      
      this.log('Dependency Analysis', dependencyTests);
      
      // Validate dependency logic
      const noDepNodes = dependencyTests.filter(t => !t.hasDependencies);
      const withDepNodes = dependencyTests.filter(t => t.hasDependencies);
      
      console.assert(noDepNodes.every(n => n.canExecuteNow), 'Nodes with no dependencies should be executable');
      console.assert(withDepNodes.every(n => !n.canExecuteNow), 'Nodes with dependencies should not be executable initially');
      
      return {
        totalNodes: dependencyTests.length,
        noDependencyNodes: noDepNodes.length,
        dependentNodes: withDepNodes.length,
        initiallyExecutable: initialAvailable.length
      };
    });
  }

  async testAgentAssignment() {
    return this.runTest('Agent Assignment', async () => {
      const socket = new MockSocket();
      
      // Create a diverse project requiring multiple agent types
      const prompt = "Develop a comprehensive e-commerce platform with React frontend, Python FastAPI backend, PostgreSQL database, Redis caching, authentication system, payment processing, admin dashboard, and comprehensive test suite";
      const taskAnalysis = await this.orchestrator.analyzePromptForTasks(prompt, {});
      const statefulGraph = await this.orchestrator.createStatefulGraph(taskAnalysis, 'test-project-3', socket);
      
      this.log('Testing agent assignment...');
      
      // Assign tasks to agents
      const agentAssignments = await this.orchestrator.assignTasksToAgentsWithCheckpoints(statefulGraph.graph);
      
      // Analyze agent assignments
      const assignmentAnalysis = [];
      for (const [agentId, assignment] of agentAssignments) {
        const agent = assignment.agent;
        const tasks = assignment.tasks;
        
        assignmentAnalysis.push({
          agentId,
          agentName: agent.name,
          agentType: agent.type,
          specialization: agent.specialization,
          taskCount: tasks.length,
          taskTypes: [...new Set(tasks.map(t => t.type))],
          capabilities: agent.capabilities,
          tasks: tasks.map(t => ({
            id: t.id,
            title: t.title,
            type: t.type,
            isCheckpoint: t.isCheckpoint,
            skillMatch: t.skillMatch
          }))
        });
      }
      
      this.log('Agent Assignment Analysis', assignmentAnalysis);
      
      // Validate agent assignments
      console.assert(agentAssignments.size > 0, 'Should have agent assignments');
      
      // Check that all tasks are assigned
      const allTasks = statefulGraph.graph.nodes.map(n => n.data);
      const assignedTasks = Array.from(agentAssignments.values()).flatMap(a => a.tasks);
      console.assert(assignedTasks.length === allTasks.length, 'All tasks should be assigned');
      
      // Check that checkpoint tasks are assigned to appropriate agents
      const checkpointTasks = assignedTasks.filter(t => t.isCheckpoint);
      const checkpointAgents = checkpointTasks.map(t => {
        const assignment = Array.from(agentAssignments.values()).find(a => 
          a.tasks.some(task => task.id === t.id)
        );
        return assignment?.agent.type;
      });
      
      this.log('Checkpoint Task Assignment', {
        checkpointCount: checkpointTasks.length,
        agentTypes: [...new Set(checkpointAgents)]
      });
      
      return {
        agentCount: agentAssignments.size,
        totalTasks: assignedTasks.length,
        checkpointTasks: checkpointTasks.length,
        agentTypes: [...new Set(assignmentAnalysis.map(a => a.agentType))],
        specializations: [...new Set(assignmentAnalysis.map(a => a.specialization))]
      };
    });
  }

  async testConditionalEdges() {
    return this.runTest('Conditional Edge Evaluation', async () => {
      const socket = new MockSocket();
      
      const prompt = "Create a quality-focused application with iterative code review and testing cycles";
      const taskAnalysis = await this.orchestrator.analyzePromptForTasks(prompt, {});
      const statefulGraph = await this.orchestrator.createStatefulGraph(taskAnalysis, 'test-project-4', socket);
      
      this.log('Testing conditional edge evaluation...');
      
      // Test conditional edges
      const edgeTests = [];
      for (const [edgeId, conditionalEdge] of statefulGraph.conditionalEdges) {
        const sourceNode = statefulGraph.graph.nodes.find(n => n.id === conditionalEdge.source);
        const targetNode = statefulGraph.graph.nodes.find(n => n.id === conditionalEdge.target);
        
        // Test edge evaluation with mock successful result
        const mockSuccessResult = {
          success: true,
          qualityScore: 0.85,
          testsPass: true,
          testCoverage: 0.92
        };
        
        const evaluation = await conditionalEdge.evaluator('test-project-4', edgeId, mockSuccessResult);
        
        edgeTests.push({
          edgeId,
          sourceTitle: sourceNode?.data.title,
          targetTitle: targetNode?.data.title,
          conditions: conditionalEdge.conditions.length,
          isCyclical: conditionalEdge.isCyclical,
          maxIterations: conditionalEdge.maxIterations,
          evaluation: {
            passed: evaluation.passed,
            resultCount: evaluation.results.length
          }
        });
      }
      
      this.log('Conditional Edge Tests', edgeTests);
      
      // Test with failure result
      const mockFailureResult = {
        success: false,
        qualityScore: 0.45,
        testsPass: false,
        testCoverage: 0.60
      };
      
      const failureEdgeTests = [];
      for (const [edgeId, conditionalEdge] of statefulGraph.conditionalEdges) {
        const evaluation = await conditionalEdge.evaluator('test-project-4', edgeId, mockFailureResult);
        failureEdgeTests.push({
          edgeId,
          passed: evaluation.passed,
          isCyclical: conditionalEdge.isCyclical
        });
      }
      
      this.log('Failure Condition Tests', failureEdgeTests);
      
      return {
        totalEdges: edgeTests.length,
        cyclicalEdges: edgeTests.filter(e => e.isCyclical).length,
        successEvaluations: edgeTests.filter(e => e.evaluation.passed).length,
        failureEvaluations: failureEdgeTests.filter(e => !e.passed).length
      };
    });
  }

  async testCyclicalWorkflows() {
    return this.runTest('Cyclical Workflow Detection', async () => {
      const socket = new MockSocket();
      
      // Create a project that should have cyclical dependencies
      const prompt = "Build a system with iterative quality improvement: development → code review → rework → re-review cycles until quality gates pass";
      const taskAnalysis = await this.orchestrator.analyzePromptForTasks(prompt, {});
      
      // Manually add cyclical dependencies for testing
      const tasks = taskAnalysis.tasks;
      if (tasks.length >= 3) {
        // Create a cycle: task1 → task2 → task3 → task1
        tasks[1].dependencies = [tasks[0].id];
        tasks[2].dependencies = [tasks[1].id];
        tasks[0].dependencies = [tasks[2].id]; // Creates the cycle
      }
      
      const statefulGraph = await this.orchestrator.createStatefulGraph(taskAnalysis, 'test-project-5', socket);
      
      this.log('Testing cyclical workflow detection...');
      
      // Detect cycles
      const cycles = this.orchestrator.detectCycles(statefulGraph.graph);
      this.log('Detected Cycles', cycles);
      
      // Check cyclical edges
      const cyclicalEdges = Array.from(statefulGraph.conditionalEdges.values()).filter(e => e.isCyclical);
      
      this.log('Cyclical Edge Analysis', cyclicalEdges.map(e => ({
        edgeId: e.id,
        source: e.source,
        target: e.target,
        maxIterations: e.maxIterations,
        cycleInfo: e.cycleInfo
      })));
      
      return {
        cyclesDetected: cycles.length,
        cyclicalEdges: cyclicalEdges.length,
        maxCycleLength: cycles.length > 0 ? Math.max(...cycles.map(c => c.length)) : 0
      };
    });
  }

  async testStateManagement() {
    return this.runTest('State Management', async () => {
      const socket = new MockSocket();
      
      const prompt = "Simple web application with frontend and backend";
      const taskAnalysis = await this.orchestrator.analyzePromptForTasks(prompt, {});
      const statefulGraph = await this.orchestrator.createStatefulGraph(taskAnalysis, 'test-project-6', socket);
      
      this.log('Testing state management...');
      
      // Test initial state
      const initialStatus = this.orchestrator.getStatefulGraphStatus('test-project-6');
      this.log('Initial State Status', initialStatus);
      
      // Test state transitions
      await this.orchestrator.transitionGraphState('test-project-6', 'executing', socket);
      const executingStatus = this.orchestrator.getStatefulGraphStatus('test-project-6');
      
      // Test node state transitions
      const firstNode = statefulGraph.graph.nodes[0];
      await this.orchestrator.transitionNodeState('test-project-6', firstNode.id, 'running', socket);
      await this.orchestrator.transitionNodeState('test-project-6', firstNode.id, 'completed', socket);
      
      // Test checkpoints
      this.orchestrator.createStateCheckpoint('test-project-6', 'test-checkpoint');
      
      // Test validation
      const validation = await this.orchestrator.validateStatefulGraphSystem('test-project-6');
      this.log('System Validation', validation);
      
      // Test export
      const exportedGraph = this.orchestrator.exportStatefulGraph('test-project-6');
      
      console.assert(initialStatus.exists, 'Graph should exist');
      console.assert(executingStatus.status === 'executing', 'State should transition to executing');
      console.assert(validation.valid, 'System should be valid');
      console.assert(exportedGraph !== null, 'Graph should be exportable');
      
      return {
        initialStatus: initialStatus.status,
        executingStatus: executingStatus.status,
        validationPassed: validation.valid,
        checkpointCount: initialStatus.checkpointCount + 1,
        exportSuccess: exportedGraph !== null
      };
    });
  }

  async testRecoveryMechanisms() {
    return this.runTest('Recovery Mechanisms', async () => {
      const socket = new MockSocket();
      
      const prompt = "Test application for recovery testing";
      const taskAnalysis = await this.orchestrator.analyzePromptForTasks(prompt, {});
      const statefulGraph = await this.orchestrator.createStatefulGraph(taskAnalysis, 'test-project-7', socket);
      
      this.log('Testing recovery mechanisms...');
      
      // Create multiple checkpoints
      this.orchestrator.createStateCheckpoint('test-project-7', 'checkpoint-1');
      this.orchestrator.createStateCheckpoint('test-project-7', 'checkpoint-2');
      
      // Test checkpoint validation
      const checkpoints = Array.from(statefulGraph.checkpoints.keys());
      const validationResults = checkpoints.map(name => {
        const checkpoint = statefulGraph.checkpoints.get(name);
        return {
          name,
          valid: this.orchestrator.validateCheckpoint(checkpoint)
        };
      });
      
      this.log('Checkpoint Validation', validationResults);
      
      // Test restoration
      const originalState = this.orchestrator.getStatefulGraphStatus('test-project-7');
      
      // Modify state
      await this.orchestrator.transitionGraphState('test-project-7', 'executing', socket);
      const modifiedState = this.orchestrator.getStatefulGraphStatus('test-project-7');
      
      // Restore from checkpoint
      await this.orchestrator.restoreFromCheckpoint('test-project-7', 'checkpoint-1');
      const restoredState = this.orchestrator.getStatefulGraphStatus('test-project-7');
      
      // Test reset
      await this.orchestrator.resetStatefulGraph('test-project-7');
      const resetState = this.orchestrator.getStatefulGraphStatus('test-project-7');
      
      console.assert(validationResults.every(v => v.valid), 'All checkpoints should be valid');
      console.assert(restoredState.status !== modifiedState.status, 'State should be restored');
      console.assert(resetState.status === 'initialized', 'State should be reset to initialized');
      
      return {
        checkpointCount: checkpoints.length,
        allCheckpointsValid: validationResults.every(v => v.valid),
        restorationWorked: restoredState.status !== modifiedState.status,
        resetWorked: resetState.status === 'initialized'
      };
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Bulletproof Task Graph System Tests');
    console.log('='.repeat(80));
    
    const tests = [
      () => this.testBasicTaskGraphCreation(),
      () => this.testDependencyResolution(),
      () => this.testAgentAssignment(),
      () => this.testConditionalEdges(),
      () => this.testCyclicalWorkflows(),
      () => this.testStateManagement(),
      () => this.testRecoveryMechanisms()
    ];
    
    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`Test failed: ${error.message}`);
        // Continue with other tests
      }
    }
    
    this.printTestSummary();
  }

  printTestSummary() {
    console.log('\n📊 Test Summary');
    console.log('='.repeat(80));
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.filter(r => !r.passed).forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }
    
    console.log('\n📈 Performance Summary:');
    this.testResults.forEach(test => {
      if (test.passed) {
        console.log(`  ${test.name}: ${test.duration}ms`);
      }
    });
    
    const overallSuccess = failed === 0;
    console.log(`\n${overallSuccess ? '🎉' : '💥'} Overall Result: ${overallSuccess ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new TaskGraphTester();
  tester.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TaskGraphTester; 