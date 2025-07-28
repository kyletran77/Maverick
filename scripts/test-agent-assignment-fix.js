#!/usr/bin/env node

/**
 * Test Agent Assignment Fix
 * 
 * This script tests that development tasks are properly assigned to development specialists
 * instead of incorrectly going to Code Review Specialist
 */

const TaskOrchestrator = require('../backend/src/orchestrator/TaskOrchestrator');
const AgentRegistry = require('../backend/src/orchestrator/agents/AgentRegistry');

class MockSocket {
  constructor() {
    this.events = [];
  }
  
  emit(event, data) {
    this.events.push({ event, data, timestamp: new Date() });
    console.log(`📡 Socket Event: ${event}`, data ? Object.keys(data) : '');
  }
}

class MockJobStorage {
  addJob(job) {
    console.log(`💾 Job stored: ${job.id}`);
  }
}

async function testAgentAssignmentFix() {
  console.log('🧪 Testing Agent Assignment Fix...\n');
  
  // Create test instances
  const mockIo = {
    emit: (event, data) => console.log(`🌐 IO Event: ${event}`, data ? Object.keys(data) : '')
  };
  const mockSocket = new MockSocket();
  const mockJobStorage = new MockJobStorage();
  
  const orchestrator = new TaskOrchestrator(mockIo, mockJobStorage);
  
  console.log('✅ Orchestrator initialized\n');
  
  // Test 1: Check agent registry
  console.log('📋 Test 1: Verify Agent Registry');
  if (orchestrator.specializedAgents) {
    const allAgents = orchestrator.specializedAgents.getAllAgents();
    console.log(`Found ${allAgents.length} specialized agents:`);
    allAgents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.id})`);
    });
  } else {
    console.log('❌ No specialized agents found');
    return;
  }
  console.log('');
  
  // Test 2: Create mock development tasks
  console.log('📋 Test 2: Test Development Agent Selection');
  
  const testTasks = [
    {
      id: 'task-1',
      title: 'Frontend Development',
      description: 'Create a React-based user interface with modern components and responsive design',
      skills: ['react', 'javascript', 'css', 'responsive_design'],
      type: 'development',
      isCheckpoint: false,
      isFinalReview: false
    },
    {
      id: 'task-2', 
      title: 'Backend Development',
      description: 'Build REST API with Node.js, Express, and database integration',
      skills: ['nodejs', 'express', 'api_development', 'database'],
      type: 'development',
      isCheckpoint: false,
      isFinalReview: false
    },
    {
      id: 'task-3',
      title: 'Database Design',
      description: 'Design database schema with proper relationships and indexes',
      skills: ['database_design', 'sql', 'data_modeling'],
      type: 'development', 
      isCheckpoint: false,
      isFinalReview: false
    }
  ];
  
  // Test assignment using new method
  testTasks.forEach(task => {
    console.log(`\n🎯 Testing task: ${task.title}`);
    
    // Test old method (should incorrectly assign to Code Review Specialist)
    console.log('❌ Old method (findBestAgentForTask):');
    try {
      const oldAgent = orchestrator.findBestAgentForTask(task);
      console.log(`  Selected: ${oldAgent?.name || 'None'} (${oldAgent?.id || 'N/A'})`);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    
    // Test new method (should correctly assign to development specialist)
    console.log('✅ New method (findBestDevelopmentAgentForTask):');
    try {
      const newAgent = orchestrator.findBestDevelopmentAgentForTask(task);
      console.log(`  Selected: ${newAgent?.name || 'None'} (${newAgent?.id || 'N/A'})`);
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
  });
  
  console.log('\n📋 Test 3: Test Checkpoint Task Assignment');
  
  const checkpointTasks = [
    {
      id: 'checkpoint-1',
      title: 'Code Review: Frontend Development', 
      description: 'Review React frontend code for quality, security, and best practices',
      skills: ['code_review', 'security_review', 'react_review'],
      type: 'checkpoint',
      isCheckpoint: true,
      checkpointType: 'code_review',
      parentTaskId: 'task-1'
    },
    {
      id: 'checkpoint-2',
      title: 'QA Testing: Backend Development',
      description: 'Comprehensive testing of REST API including unit and integration tests',
      skills: ['testing', 'api_testing', 'integration_testing'],
      type: 'checkpoint', 
      isCheckpoint: true,
      checkpointType: 'qa_testing',
      parentTaskId: 'task-2'
    }
  ];
  
  checkpointTasks.forEach(task => {
    console.log(`\n🔍 Testing checkpoint: ${task.title}`);
    
    if (task.checkpointType === 'code_review') {
      const agent = orchestrator.getCheckpointAgentType('code_review_specialist');
      console.log(`  Selected: ${agent?.name || 'None'} (${agent?.id || 'N/A'})`);
    } else if (task.checkpointType === 'qa_testing') {
      const agent = orchestrator.getCheckpointAgentType('qa_testing_specialist');
      console.log(`  Selected: ${agent?.name || 'None'} (${agent?.id || 'N/A'})`);
    }
  });
  
  console.log('\n🏆 Agent Assignment Fix Test Complete!');
  console.log('\n📊 Expected Results:');
  console.log('  ✅ Development tasks should go to Frontend/Backend specialists');
  console.log('  ✅ Code Review checkpoints should go to Code Review Specialist');
  console.log('  ✅ QA Testing checkpoints should go to QA Testing Specialist');
  console.log('  ❌ Development tasks should NOT go to Code Review Specialist');
}

// Run the test
testAgentAssignmentFix().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 