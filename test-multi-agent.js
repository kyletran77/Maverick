#!/usr/bin/env node

/**
 * Test script for Multi-Agent Orchestration System
 */

const io = require('socket.io-client');
const path = require('path');

const SERVER_URL = 'http://localhost:3000';

class MultiAgentTest {
    constructor() {
        this.socket = null;
        this.testResults = [];
        this.currentTest = null;
    }

    async runTests() {
        console.log('🧪 Testing Multi-Agent Orchestration System...\n');
        
        try {
            // Connect to server
            await this.connect();
            
            // Run test scenarios
            await this.testWebAppCreation();
            await this.testAPICreation();
            await this.testGenericTask();
            
            // Display results
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        } finally {
            if (this.socket) {
                this.socket.disconnect();
            }
        }
    }

    async connect() {
        return new Promise((resolve, reject) => {
            console.log('📡 Connecting to server...');
            this.socket = io(SERVER_URL);
            
            this.socket.on('connect', () => {
                console.log('✅ Connected to server\n');
                this.setupEventHandlers();
                resolve();
            });
            
            this.socket.on('connect_error', (error) => {
                reject(new Error(`Connection failed: ${error.message}`));
            });
            
            setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 5000);
        });
    }

    setupEventHandlers() {
        this.socket.on('execution_plan_created', (plan) => {
            console.log(`📋 Execution plan created for: ${plan.originalTask}`);
            console.log(`   - Subtasks: ${plan.subtasks.length}`);
            console.log(`   - Estimated time: ${plan.totalEstimatedTime} minutes`);
            
            plan.subtasks.forEach((subtask, index) => {
                console.log(`   ${index + 1}. ${subtask.name} (${subtask.type})`);
            });
            console.log();
        });

        this.socket.on('subtask_started', (data) => {
            console.log(`🚀 Started: ${data.subtaskName} (${data.agentName})`);
        });

        this.socket.on('subtask_completed', (data) => {
            console.log(`✅ Completed: ${data.subtaskName} in ${data.duration}`);
        });

        this.socket.on('subtask_failed', (data) => {
            console.log(`❌ Failed: ${data.subtaskName} - ${data.error}`);
        });

        this.socket.on('task_completed', (data) => {
            console.log(`🎉 Task completed: ${data.message}`);
            if (data.summary) {
                console.log(`   - Subtasks: ${data.summary.subtasksCompleted}/${data.summary.totalSubtasks}`);
                console.log(`   - Duration: ${data.summary.duration}`);
                console.log(`   - Agents used: ${data.summary.agentsUsed}`);
            }
            console.log();
            
            if (this.currentTest) {
                this.currentTest.resolve({ success: true, data });
            }
        });

        this.socket.on('task_error', (data) => {
            console.log(`❌ Task error: ${data.error}`);
            if (this.currentTest) {
                this.currentTest.reject(new Error(data.error));
            }
        });

        this.socket.on('agents_update', (agents) => {
            const activeAgents = agents.filter(a => a.status === 'working').length;
            if (activeAgents > 0) {
                console.log(`👥 Active agents: ${activeAgents}`);
            }
        });
    }

    async testWebAppCreation() {
        console.log('🧪 Test 1: Complete Buildable Web App Creation');
        console.log('Task: Create a complete todo app with React frontend and Node.js backend');
        
        const result = await this.submitTask(
            'Create a complete todo app with React frontend and Node.js backend',
            'Complete web application with frontend, backend, database, and deployment ready',
            './test-webapp'
        );
        
        this.testResults.push({
            name: 'Complete Buildable Web App',
            success: result.success,
            details: result.data?.summary || 'No summary available'
        });
    }

    async testAPICreation() {
        console.log('🧪 Test 2: Complete Buildable API Service');
        console.log('Task: Build a REST API for user management with authentication and database');
        
        const result = await this.submitTask(
            'Build a REST API for user management with authentication and database',
            'Complete RESTful API with authentication, database, tests, and documentation',
            './test-api'
        );
        
        this.testResults.push({
            name: 'Complete Buildable API Service',
            success: result.success,
            details: result.data?.summary || 'No summary available'
        });
    }

    async testGenericTask() {
        console.log('🧪 Test 3: Complete Buildable Application');
        console.log('Task: Create a real-time chat application with Socket.io');
        
        const result = await this.submitTask(
            'Create a real-time chat application with Socket.io',
            'Complete real-time chat with frontend, backend, and deployment ready',
            './test-chat'
        );
        
        this.testResults.push({
            name: 'Complete Buildable Application',
            success: result.success,
            details: result.data?.summary || 'No summary available'
        });
    }

    async submitTask(task, description, projectPath) {
        return new Promise((resolve, reject) => {
            this.currentTest = { resolve, reject };
            
            this.socket.emit('submit_task', {
                task: task,
                description: description,
                projectPath: projectPath,
                useGoose: false // Use simulation mode for testing
            });
            
            // Set timeout for test
            setTimeout(() => {
                if (this.currentTest) {
                    this.currentTest.reject(new Error('Test timeout'));
                }
            }, 30000); // 30 second timeout
        });
    }

    displayResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('=' .repeat(50));
        
        let passed = 0;
        let failed = 0;
        
        this.testResults.forEach(test => {
            const status = test.success ? '✅ PASSED' : '❌ FAILED';
            console.log(`${status} - ${test.name}`);
            
            if (test.success) {
                passed++;
            } else {
                failed++;
            }
        });
        
        console.log('=' .repeat(50));
        console.log(`Total: ${this.testResults.length} | Passed: ${passed} | Failed: ${failed}`);
        
        if (failed === 0) {
            console.log('\n🎉 All tests passed! Multi-agent orchestration is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Check the implementation.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new MultiAgentTest();
    tester.runTests().catch(console.error);
}

module.exports = MultiAgentTest; 