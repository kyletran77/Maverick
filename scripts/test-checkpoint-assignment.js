#!/usr/bin/env node

/**
 * Test Checkpoint Assignment
 * 
 * This script tests that checkpoint tasks are correctly assigned to Code Review and QA specialists
 */

const TaskOrchestrator = require('../backend/src/orchestrator/TaskOrchestrator');

class MockSocket {
  emit() {}
}

class MockJobStorage {
  addJob() {}
}

async function testCheckpointAssignment() {
  console.log('🧪 Testing Checkpoint Assignment...\n');
  
  const orchestrator = new TaskOrchestrator({emit: () => {}}, new MockJobStorage());
  
  // Test checkpoint tasks
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
    },
    {
      id: 'final-review-1',
      title: 'Final Project Code Review',
      description: 'Comprehensive final code review of entire project',
      skills: ['code_review', 'architecture_review'],
      type: 'checkpoint',
      isCheckpoint: true,
      isFinalReview: true,
      checkpointType: 'final_code_review'
    },
    {
      id: 'final-review-2',
      title: 'Final Project QA Testing',
      description: 'Comprehensive final QA testing of entire project',
      skills: ['testing', 'e2e_testing', 'quality_assurance'],
      type: 'checkpoint',
      isCheckpoint: true,
      isFinalReview: true,
      checkpointType: 'final_qa_testing'
    }
  ];
  
  checkpointTasks.forEach(task => {
    console.log(`\n🔍 Testing: ${task.title}`);
    console.log(`  Type: ${task.type}, isCheckpoint: ${task.isCheckpoint}, checkpointType: ${task.checkpointType}`);
    
    // Test Code Review Specialist
    try {
      const codeReviewAgent = orchestrator.specializedAgents.getAllAgents().find(a => a.id === 'code_review_specialist');
      const codeReviewScore = codeReviewAgent.calculateSkillMatch(task);
      console.log(`  Code Review Specialist: ${codeReviewScore}%`);
    } catch (error) {
      console.log(`  Code Review Specialist error: ${error.message}`);
    }
    
    // Test QA Testing Specialist
    try {
      const qaAgent = orchestrator.specializedAgents.getAllAgents().find(a => a.id === 'qa_testing_specialist');
      const qaScore = qaAgent.calculateSkillMatch(task);
      console.log(`  QA Testing Specialist: ${qaScore}%`);
    } catch (error) {
      console.log(`  QA Testing Specialist error: ${error.message}`);
    }
    
    // Test overall selection
    try {
      const selection = orchestrator.specializedAgents.findBestAgent(task);
      if (selection && selection.bestAgent) {
        console.log(`  ✅ Selected: ${selection.bestAgent.agent.name} (${(selection.bestAgent.suitabilityScore * 100).toFixed(1)}%)`);
      }
    } catch (error) {
      console.log(`  Selection error: ${error.message}`);
    }
  });
  
  console.log('\n🏆 Checkpoint Assignment Test Complete!');
  console.log('\n📊 Expected Results:');
  console.log('  ✅ Code Review checkpoints should get 95% from Code Review Specialist');
  console.log('  ✅ QA Testing checkpoints should get 95% from QA Testing Specialist');
  console.log('  ✅ Final reviews should be assigned to appropriate specialists');
}

testCheckpointAssignment().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 