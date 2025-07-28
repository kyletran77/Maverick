#!/usr/bin/env node

/**
 * Test Enhanced Task Orchestration with Quality Checkpoints
 * 
 * This script tests the new checkpoint-integrated orchestration system
 * to ensure proper task flow with code review and QA checkpoints.
 */

const path = require('path');
const TaskOrchestrator = require('../backend/src/orchestrator/TaskOrchestrator');

// Mock dependencies
const mockIO = {
  emit: (event, data) => {
    console.log(`📡 [SOCKET] ${event}:`, JSON.stringify(data, null, 2));
  }
};

const mockJobStorage = {
  addJob: (job) => {
    console.log(`💾 [STORAGE] Job added:`, job.id);
  }
};

const mockSocket = {
  id: 'test-socket-123',
  emit: (event, data) => {
    console.log(`📡 [CLIENT] ${event}:`, JSON.stringify(data, null, 2));
  }
};

async function testEnhancedOrchestration() {
  console.log('🚀 Testing Enhanced Task Orchestration with Quality Checkpoints\n');
  
  try {
    // Initialize orchestrator
    const orchestrator = new TaskOrchestrator(mockIO, mockJobStorage);
    
    // Test 1: Create task graph with checkpoints
    console.log('🧪 TEST 1: Creating task graph with quality checkpoints');
    console.log('=' .repeat(60));
    
    const taskAnalysis = {
      projectType: 'web_application',
      complexity: 'medium',
      tasks: [
        {
          id: 'task-1',
          type: 'frontend',
          title: 'Frontend Development',
          description: 'Create React frontend with modern UI',
          priority: 'high',
          estimatedHours: 12,
          skills: ['react', 'javascript', 'css'],
          dependencies: []
        },
        {
          id: 'task-2', 
          type: 'backend',
          title: 'Backend API',
          description: 'Build Node.js REST API',
          priority: 'high',
          estimatedHours: 15,
          skills: ['nodejs', 'api_design', 'database'],
          dependencies: []
        },
        {
          id: 'task-3',
          type: 'database',
          title: 'Database Design',
          description: 'Design database schema',
          priority: 'medium',
          estimatedHours: 8,
          skills: ['sql', 'schema_design'],
          dependencies: []
        }
      ],
      estimatedDuration: 35,
      requiredAgents: ['frontend', 'backend', 'database']
    };
    
    const projectId = 'test-project-123';
    const taskGraph = await orchestrator.createTaskGraphWithCheckpoints(taskAnalysis, projectId);
    
    console.log('\n✅ Task Graph Results:');
    console.log(`- Total nodes: ${taskGraph.nodes.length}`);
    console.log(`- Original tasks: ${taskGraph.originalTasks}`);
    console.log(`- Checkpoint tasks: ${taskGraph.checkpointTasks}`);
    console.log(`- Final review tasks: ${taskGraph.finalReviewTasks}`);
    console.log(`- Total edges: ${taskGraph.edges.length}`);
    
    // Test 2: Agent assignment with checkpoint prioritization
    console.log('\n🧪 TEST 2: Agent assignment with checkpoint prioritization');
    console.log('=' .repeat(60));
    
    const agentAssignments = await orchestrator.assignTasksToAgentsWithCheckpoints(taskGraph);
    
    console.log('\n✅ Agent Assignment Results:');
    console.log(`- Total agents: ${agentAssignments.size}`);
    
    agentAssignments.forEach((assignment, agentId) => {
      const agent = assignment.agent;
      console.log(`\n📋 Agent: ${agent.name} (${agent.type})`);
      console.log(`   - Tasks assigned: ${assignment.tasks.length}`);
      console.log(`   - Standard tasks: ${agent.standardTaskCount || 0}`);
      console.log(`   - Checkpoint tasks: ${agent.checkpointTaskCount || 0}`);
      
      assignment.tasks.forEach(task => {
        const taskType = task.isCheckpoint ? 
          `[CHECKPOINT:${task.checkpointType}]` : 
          task.isFinalReview ? '[FINAL-REVIEW]' : '[STANDARD]';
        console.log(`     • ${taskType} ${task.title}`);
      });
    });
    
    // Test 3: Checkpoint dependency validation
    console.log('\n🧪 TEST 3: Checkpoint dependency validation');
    console.log('=' .repeat(60));
    
    console.log('\n🔗 Dependency Chain Analysis:');
    
    // Analyze dependency chains
    const dependencyChains = analyzeDependencyChains(taskGraph);
    dependencyChains.forEach((chain, index) => {
      console.log(`\nChain ${index + 1}:`);
      chain.forEach((task, stepIndex) => {
        const indent = '  '.repeat(stepIndex);
        const taskType = task.isCheckpoint ? 
          `[${task.checkpointType.toUpperCase()}]` : 
          task.isFinalReview ? '[FINAL]' : '[TASK]';
        console.log(`${indent}${stepIndex + 1}. ${taskType} ${task.title}`);
      });
    });
    
    // Test 4: Quality checkpoint flow simulation
    console.log('\n🧪 TEST 4: Quality checkpoint flow simulation');
    console.log('=' .repeat(60));
    
    await simulateCheckpointFlow(orchestrator, taskGraph, projectId, mockSocket);
    
    console.log('\n🎉 Enhanced Orchestration Tests Completed Successfully!');
    console.log('\n📊 Summary:');
    console.log(`✅ Task graph creation with ${taskGraph.checkpointTasks} checkpoints`);
    console.log(`✅ Agent assignment with checkpoint prioritization`);
    console.log(`✅ Dependency chain validation`);
    console.log(`✅ Checkpoint flow simulation`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

function analyzeDependencyChains(taskGraph) {
  const chains = [];
  const visited = new Set();
  
  // Find root tasks (no dependencies)
  const rootTasks = taskGraph.nodes.filter(node => {
    const dependencies = taskGraph.edges.filter(edge => edge.target === node.id);
    return dependencies.length === 0;
  });
  
  // Build chains from each root
  rootTasks.forEach(rootNode => {
    if (!visited.has(rootNode.id)) {
      const chain = buildChain(rootNode, taskGraph, visited);
      if (chain.length > 0) {
        chains.push(chain);
      }
    }
  });
  
  return chains;
}

function buildChain(node, taskGraph, visited) {
  if (visited.has(node.id)) {
    return [];
  }
  
  visited.add(node.id);
  const chain = [node.data];
  
  // Find children
  const childEdges = taskGraph.edges.filter(edge => edge.source === node.id);
  childEdges.forEach(edge => {
    const childNode = taskGraph.nodes.find(n => n.id === edge.target);
    if (childNode && !visited.has(childNode.id)) {
      const childChain = buildChain(childNode, taskGraph, visited);
      chain.push(...childChain);
    }
  });
  
  return chain;
}

async function simulateCheckpointFlow(orchestrator, taskGraph, projectId, socket) {
  console.log('\n🎭 Simulating checkpoint flow...');
  
  // Simulate a standard task completion
  const standardTask = taskGraph.nodes.find(n => !n.data.isCheckpoint && !n.data.isFinalReview);
  if (standardTask) {
    console.log(`\n📝 Simulating completion of standard task: ${standardTask.data.title}`);
    
    // Find its checkpoints
    const checkpoints = taskGraph.nodes.filter(n => 
      n.data.originalTaskId === standardTask.id
    );
    
    console.log(`🔍 Found ${checkpoints.length} checkpoints for this task:`);
    checkpoints.forEach(checkpoint => {
      console.log(`   • ${checkpoint.data.checkpointType}: ${checkpoint.data.title}`);
    });
    
    // Simulate checkpoint handling
    for (const checkpoint of checkpoints) {
      console.log(`\n🔍 Simulating ${checkpoint.data.checkpointType} checkpoint...`);
      
      try {
        // Mock the checkpoint completion
        await mockCheckpointCompletion(
          orchestrator, 
          projectId, 
          checkpoint.id, 
          checkpoint.data, 
          socket
        );
        
        console.log(`✅ ${checkpoint.data.checkpointType} checkpoint completed successfully`);
        
      } catch (error) {
        console.log(`❌ ${checkpoint.data.checkpointType} checkpoint failed:`, error.message);
      }
    }
  }
}

async function mockCheckpointCompletion(orchestrator, projectId, taskId, task, socket) {
  // Create a mock project for testing
  const mockProject = {
    id: projectId,
    projectPath: '/test/project/path',
    taskGraph: {
      nodes: [
        { 
          id: task.originalTaskId, 
          data: { 
            id: task.originalTaskId,
            title: 'Original Task',
            description: 'Mock original task'
          } 
        }
      ]
    }
  };
  
  // Mock the active projects
  orchestrator.activeProjects.set(projectId, mockProject);
  
  // Simulate checkpoint completion
  console.log(`   🔄 Processing ${task.checkpointType} checkpoint...`);
  
  // Mock checkpoint validation results
  if (task.checkpointType === 'code_review') {
    console.log('   📋 Performing code quality analysis...');
    console.log('   🔒 Running security assessment...');
    console.log('   📊 Generating quality metrics...');
  } else if (task.checkpointType === 'qa_testing') {
    console.log('   🧪 Running test suite...');
    console.log('   📈 Collecting coverage metrics...');
    console.log('   🚀 Validating deployment readiness...');
  }
  
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return true;
}

// Run the tests
if (require.main === module) {
  testEnhancedOrchestration().catch(console.error);
}

module.exports = { testEnhancedOrchestration }; 