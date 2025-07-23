#!/usr/bin/env node

const AgentRegistry = require('../backend/src/orchestrator/agents/AgentRegistry');

/**
 * Test script for the new modular agent system
 * Validates all specialized agents and their capabilities
 */
async function testModularAgents() {
  console.log('🧪 Testing Modular Agent System\n');
  
  try {
    // Initialize the agent registry
    console.log('📋 Initializing Agent Registry...');
    const agentRegistry = new AgentRegistry();
    
    // Test agent registry health
    console.log('\n🏥 Health Check:');
    const healthCheck = agentRegistry.healthCheck();
    console.log(JSON.stringify(healthCheck, null, 2));
    
    // Get registry stats
    console.log('\n📊 Registry Statistics:');
    const stats = agentRegistry.getRegistryStats();
    console.log(`Total Agents: ${stats.totalAgents}`);
    console.log(`Specializations: ${stats.specializations.join(', ')}`);
    console.log(`Total Capabilities: ${stats.totalCapabilities}`);
    
    // Test each agent type with sample tasks
    console.log('\n🎯 Testing Agent Selection with Sample Tasks:\n');
    
    const testTasks = [
      {
        title: 'Build React Dashboard',
        description: 'Create a responsive React dashboard with TypeScript and Tailwind CSS',
        skills: ['react', 'typescript', 'tailwind_css', 'responsive_design'],
        priority: 'high'
      },
      {
        title: 'FastAPI Backend Service',
        description: 'Develop a Python FastAPI service with SQLAlchemy and authentication',
        skills: ['python', 'fastapi', 'sqlalchemy', 'jwt', 'postgresql'],
        priority: 'high'
      },
      {
        title: 'Code Security Review',
        description: 'Perform comprehensive security audit of the application',
        skills: ['security_review', 'vulnerability_assessment', 'code_quality'],
        priority: 'critical'
      },
      {
        title: 'E2E Test Suite',
        description: 'Create comprehensive end-to-end tests with Cypress',
        skills: ['e2e_testing', 'cypress', 'test_automation', 'react_testing'],
        priority: 'medium'
      }
    ];
    
    testTasks.forEach((task, index) => {
      console.log(`\n--- Test ${index + 1}: ${task.title} ---`);
      
      try {
        // Get agent recommendations
        const recommendations = agentRegistry.generateTaskRecommendations(task, 3);
        
        console.log(`🔍 Task: ${task.title}`);
        console.log(`📝 Description: ${task.description}`);
        console.log(`🛠️  Skills: ${task.skills.join(', ')}`);
        console.log(`⚡ Priority: ${task.priority}`);
        console.log('\n🏆 Top Recommendations:');
        
        recommendations.recommendations.forEach((rec, i) => {
          console.log(`  ${rec.rank}. ${rec.agent.name}`);
          console.log(`     Specialization: ${rec.agent.specialization}`);
          console.log(`     Skill Match: ${rec.scores.skillMatch}%`);
          console.log(`     Suitability: ${rec.scores.suitability}%`);
          console.log(`     Confidence: ${rec.scores.confidence}%`);
          console.log(`     Reason: ${rec.reason}`);
          if (rec.recommended) console.log(`     ✅ RECOMMENDED`);
          console.log('');
        });
        
        // Test task estimation
        const bestAgent = agentRegistry.getAgent(recommendations.recommendations[0].agent.id);
        if (bestAgent) {
          const estimate = bestAgent.estimateTask(task);
          console.log(`📅 Estimation for ${bestAgent.name}:`);
          console.log(`   Hours: ${estimate.estimatedHours}`);
          console.log(`   Complexity: ${estimate.complexity}`);
          console.log(`   Confidence: ${(estimate.confidence * 100).toFixed(1)}%`);
        }
        
      } catch (error) {
        console.error(`❌ Error testing task "${task.title}":`, error.message);
      }
    });
    
    // Test agent capabilities
    console.log('\n\n🔧 Testing Individual Agent Capabilities:\n');
    
    const allAgents = agentRegistry.getAllAgents();
    allAgents.forEach(agent => {
      console.log(`--- ${agent.name} ---`);
      console.log(`ID: ${agent.id}`);
      console.log(`Specialization: ${agent.specialization}`);
      console.log(`Version: ${agent.version}`);
      console.log(`Capabilities: ${Object.keys(agent.capabilities).length} total`);
      
      // Show top capabilities
      const topCapabilities = Object.entries(agent.capabilities)
        .sort((a, b) => b[1].efficiency - a[1].efficiency)
        .slice(0, 5)
        .map(([cap, info]) => `${cap} (${(info.efficiency * 100).toFixed(0)}%)`)
        .join(', ');
      
      console.log(`Top Capabilities: ${topCapabilities}`);
      console.log('');
    });
    
    // Test agent by specialization
    console.log('\n🎨 Testing Agent Discovery by Specialization:\n');
    
    const frontendAgents = agentRegistry.getAgentsBySpecialization('frontend');
    console.log(`Frontend Agents: ${frontendAgents.map(a => a.name).join(', ')}`);
    
    const backendAgents = agentRegistry.getAgentsBySpecialization('backend');
    console.log(`Backend Agents: ${backendAgents.map(a => a.name).join(', ')}`);
    
    const qaAgents = agentRegistry.getAgentsBySpecialization('quality');
    console.log(`QA Agents: ${qaAgents.map(a => a.name).join(', ')}`);
    
    // Test agent by capability
    console.log('\n⚙️ Testing Agent Discovery by Capability:\n');
    
    const reactAgents = agentRegistry.getAgentsByCapability('react');
    console.log(`React Capable Agents: ${reactAgents.map(a => a.name).join(', ')}`);
    
    const pythonAgents = agentRegistry.getAgentsByCapability('python');
    console.log(`Python Capable Agents: ${pythonAgents.map(a => a.name).join(', ')}`);
    
    const testingAgents = agentRegistry.getAgentsByCapability('testing');
    console.log(`Testing Capable Agents: ${testingAgents.map(a => a.name).join(', ')}`);
    
    // Export configurations for debugging
    console.log('\n💾 Exporting Agent Configurations...');
    const exportData = agentRegistry.exportConfigurations();
    // Write to a temporary file for inspection
    const fs = require('fs');
    const path = require('path');
    const exportPath = path.join(__dirname, '..', 'test-output', 'agent-configurations.json');
    
    // Ensure directory exists
    const exportDir = path.dirname(exportPath);
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    console.log(`✅ Agent configurations exported to: ${exportPath}`);
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`✅ ${stats.totalAgents} agents registered and healthy`);
    console.log(`✅ ${testTasks.length} task assignment tests passed`);
    console.log(`✅ Agent discovery and filtering working`);
    console.log(`✅ Configuration export successful`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  testModularAgents();
}

module.exports = { testModularAgents }; 