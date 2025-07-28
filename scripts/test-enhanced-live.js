#!/usr/bin/env node

/**
 * Test Enhanced Orchestration with Live Server
 * 
 * This script connects to the running server and tests the enhanced orchestration
 * to verify that tasks are properly distributed to the right agents.
 */

const io = require('socket.io-client');
const path = require('path');

// Connect to the live server
const socket = io('http://localhost:3000');

let testResults = {
  connected: false,
  jobStarted: false,
  projectOrchestrated: false,
  agentsUpdated: false,
  checkpointsDetected: false,
  codeReviewAssigned: false,
  qaTestingAssigned: false,
  standardAgentsAssigned: false
};

console.log('🚀 Testing Enhanced Orchestration with Live Server\n');

// Set up event listeners
socket.on('connect', () => {
  console.log('✅ Connected to server');
  testResults.connected = true;
  
  // Start the test after connection
  setTimeout(runTest, 1000);
});

socket.on('job_started', (data) => {
  console.log('📝 Job Started:', data.jobId);
  testResults.jobStarted = true;
});

socket.on('project_orchestrated', (data) => {
  console.log('🎯 Project Orchestrated:');
  console.log(`   - Project ID: ${data.projectId}`);
  console.log(`   - Total Tasks: ${data.taskGraph?.nodes?.length || 'N/A'}`);
  console.log(`   - Agents Assigned: ${data.agentAssignments?.size || Object.keys(data.agentAssignments || {}).length}`);
  
  // Debug: Log the structure of the first few nodes
  if (data.taskGraph && data.taskGraph.nodes && data.taskGraph.nodes.length > 0) {
    console.log('   - Sample task node structure:', JSON.stringify(data.taskGraph.nodes[0], null, 2));
    
    // Log more details about the task graph
    console.log('   - Task graph keys:', Object.keys(data.taskGraph));
    console.log('   - Original tasks count:', data.taskGraph.originalTasks);
    console.log('   - Checkpoint tasks count:', data.taskGraph.checkpointTasks);
    console.log('   - Final review tasks count:', data.taskGraph.finalReviewTasks);
  }
  
  testResults.projectOrchestrated = true;
  
  // Analyze the task graph for checkpoints
  if (data.taskGraph && data.taskGraph.nodes) {
    console.log('   - Analyzing task graph structure...');
    
    const checkpointTasks = data.taskGraph.nodes.filter(node => 
      node && node.data && (node.data.isCheckpoint || node.data.checkpointType)
    );
    const standardTasks = data.taskGraph.nodes.filter(node => 
      node && node.data && !node.data.isCheckpoint && !node.data.isFinalReview
    );
    const finalReviewTasks = data.taskGraph.nodes.filter(node => 
      node && node.data && node.data.isFinalReview
    );
    
    console.log(`   - Standard Tasks: ${standardTasks.length}`);
    console.log(`   - Checkpoint Tasks: ${checkpointTasks.length}`);
    console.log(`   - Final Review Tasks: ${finalReviewTasks.length}`);
    
    if (checkpointTasks.length > 0) {
      testResults.checkpointsDetected = true;
      console.log('✅ Quality checkpoints detected!');
      
      // List checkpoint types
      const codeReviewCheckpoints = checkpointTasks.filter(node => 
        node && node.data && node.data.checkpointType === 'code_review'
      );
      const qaTestingCheckpoints = checkpointTasks.filter(node => 
        node && node.data && node.data.checkpointType === 'qa_testing'
      );
      
      console.log(`   - Code Review Checkpoints: ${codeReviewCheckpoints.length}`);
      console.log(`   - QA Testing Checkpoints: ${qaTestingCheckpoints.length}`);
      
      if (codeReviewCheckpoints.length > 0) testResults.codeReviewAssigned = true;
      if (qaTestingCheckpoints.length > 0) testResults.qaTestingAssigned = true;
    }
  }
  
  // Analyze agent assignments
  if (data.agentAssignments) {
    console.log('\n🤖 Agent Assignment Analysis:');
    let agentCount = 0;
    
    for (const [agentId, assignment] of Object.entries(data.agentAssignments)) {
      agentCount++;
      const agent = assignment.agent;
      const tasks = assignment.tasks;
      
      console.log(`   ${agentCount}. ${agent.name} (${agent.type}):`);
      console.log(`      - Tasks: ${tasks.length}`);
      
      tasks.forEach((task, index) => {
        const taskType = task.isCheckpoint ? 
          `[CHECKPOINT:${task.checkpointType}]` : 
          task.isFinalReview ? '[FINAL-REVIEW]' : '[STANDARD]';
        console.log(`        ${index + 1}. ${taskType} ${task.title}`);
      });
      
      // Check if standard development agents are assigned
      if (['frontend_specialist', 'backend_specialist', 'python_specialist', 'database_architect'].includes(agent.type)) {
        testResults.standardAgentsAssigned = true;
      }
    }
  }
});

socket.on('agents_update', (data) => {
  console.log('👥 Agents Update Received');
  testResults.agentsUpdated = true;
});

socket.on('task_started', (data) => {
  console.log(`🔄 Task Started: ${data.task.title} (Agent: ${data.agentId})`);
});

socket.on('checkpoint_started', (data) => {
  console.log(`🔍 Checkpoint Started: ${data.checkpointType} for ${data.title}`);
});

socket.on('checkpoint_completed', (data) => {
  console.log(`✅ Checkpoint Completed: ${data.checkpointType} - ${data.passed ? 'PASSED' : 'FAILED'}`);
});

socket.on('task_error', (data) => {
  console.log('❌ Task Error:', data.error);
});

socket.on('orchestration_error', (data) => {
  console.log('❌ Orchestration Error:', data.error);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

function runTest() {
  console.log('\n🧪 Starting Enhanced Orchestration Test...\n');
  
  // Submit a test task that should trigger the enhanced orchestration
  const testTask = {
    task: 'Create a simple web application with React frontend and Node.js backend',
    description: 'Build a modern web app with user authentication, database integration, and real-time features',
    projectPath: '/tmp/enhanced-test-project',
    projectName: 'enhanced-orchestration-test',
    jobName: `enhanced-test-${Date.now()}`
  };
  
  console.log('📤 Submitting test task...');
  socket.emit('submit_task', testTask);
  
  // Set timeout to analyze results
  setTimeout(analyzeResults, 15000); // Wait 15 seconds for orchestration
}

function analyzeResults() {
  console.log('\n📊 Test Results Analysis:');
  console.log('=' .repeat(50));
  
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const description = getTestDescription(test);
    console.log(`${status} ${description}`);
  });
  
  console.log('\n🎯 Enhanced Orchestration Status:');
  
  if (testResults.checkpointsDetected && testResults.codeReviewAssigned && testResults.qaTestingAssigned) {
    console.log('✅ SUCCESS: Enhanced orchestration with quality checkpoints is working!');
    console.log('   - Quality checkpoints are automatically created');
    console.log('   - Code review and QA testing agents are properly assigned');
    console.log('   - Task dependencies flow through quality gates');
  } else {
    console.log('❌ ISSUES: Enhanced orchestration needs attention:');
    if (!testResults.checkpointsDetected) {
      console.log('   - Quality checkpoints not detected');
    }
    if (!testResults.codeReviewAssigned) {
      console.log('   - Code review checkpoints not assigned');
    }
    if (!testResults.qaTestingAssigned) {
      console.log('   - QA testing checkpoints not assigned');
    }
  }
  
  if (testResults.standardAgentsAssigned) {
    console.log('✅ Standard development agents are properly assigned');
  } else {
    console.log('❌ Standard development agents assignment issue');
  }
  
  console.log('\n🏁 Test completed. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}

function getTestDescription(test) {
  const descriptions = {
    connected: 'Server connection established',
    jobStarted: 'Job tracking initiated',
    projectOrchestrated: 'Project orchestration completed',
    agentsUpdated: 'Agent status updates received',
    checkpointsDetected: 'Quality checkpoints detected',
    codeReviewAssigned: 'Code review checkpoints assigned',
    qaTestingAssigned: 'QA testing checkpoints assigned',
    standardAgentsAssigned: 'Standard development agents assigned'
  };
  
  return descriptions[test] || test;
}

// Handle process exit
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Test interrupted by user');
  socket.disconnect();
  process.exit(1);
});

console.log('🔌 Connecting to server...'); 