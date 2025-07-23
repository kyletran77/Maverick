const { v4: uuidv4 } = require('uuid');
const { GooseIntegration } = require('../../goose-integration');
const QAEngineer = require('./QAEngineer');
const AgentRegistry = require('./agents/AgentRegistry');

/**
 * LangGraph-inspired Task Orchestrator
 * Creates comprehensive task lists from prompts and assigns them to specialized agents
 * Implements kanban-style workflow with state management and dependency resolution
 */
class TaskOrchestrator {
  constructor(io, jobStorage) {
    this.io = io;
    this.jobStorage = jobStorage;
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
    
    // Initialize specialized agent types with capabilities (legacy support)
    this.initializeAgentTypes();
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
   * Main orchestration method - analyzes prompt and creates comprehensive task list
   */
  async orchestrateProject(prompt, projectPath, socket, options = {}) {
    const projectId = uuidv4();
    
    try {
      console.log('Starting project orchestration:', prompt);
      
      // Add timeout to prevent hanging
      const orchestrationTimeout = setTimeout(() => {
        console.error('Orchestration timeout - taking too long');
        socket.emit('orchestration_error', { error: 'Orchestration timed out after 30 seconds' });
      }, 30000);
      
      // Step 1: Analyze prompt and generate comprehensive task list
      console.log('Step 1: Analyzing prompt...');
      const taskAnalysis = await this.analyzePromptForTasks(prompt, options);
      console.log('Task analysis complete:', taskAnalysis);
      
      // Step 2: Create task graph with dependencies
      console.log('Step 2: Creating task graph...');
      const taskGraph = await this.createTaskGraph(taskAnalysis, projectId);
      console.log('Task graph created with', taskGraph.nodes.length, 'tasks');
      
      // Step 3: Assign tasks to specialized agents
      console.log('Step 3: Assigning tasks to agents...');
      const agentAssignments = await this.assignTasksToAgents(taskGraph);
      console.log('Agent assignments complete:', agentAssignments.size, 'agents');
      
      // Step 4: Create project state
      console.log('Step 4: Creating project state...');
      const project = {
        id: projectId,
        prompt: prompt,
        projectPath: projectPath,
        taskGraph: taskGraph,
        agentAssignments: agentAssignments,
        status: 'active',
        createdAt: new Date(),
        kanbanBoard: this.createKanbanBoard(agentAssignments),
        metrics: {
          totalTasks: taskGraph.nodes.length,
          estimatedDuration: this.calculateProjectDuration(taskGraph),
          complexity: taskAnalysis.complexity
        }
      };
      
      this.activeProjects.set(projectId, project);
      
      // Clear timeout since we're succeeding
      clearTimeout(orchestrationTimeout);
      
      // Step 5: Emit project created event
      console.log('Step 5: Emitting project orchestrated event...');
      socket.emit('project_orchestrated', {
        projectId: projectId,
        taskGraph: this.sanitizeTaskGraphForTransmission(taskGraph),
        agentAssignments: agentAssignments,
        kanbanBoard: project.kanbanBoard,
        metrics: project.metrics
      });
      
      // Step 6: Emit initial agent states
      console.log('Step 6: Broadcasting initial agent states...');
      this.broadcastAgentStates(project, socket);
      
      // Step 7: Start task execution (simplified)
      console.log('Step 7: Starting task execution...');
      await this.startSimplifiedTaskExecution(projectId, socket);
      
      return project;
      
    } catch (error) {
      console.error('Orchestration failed:', error);
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
        
        // QA Verification Gate - Verify task completion before marking as completed
        console.log(`[${sessionId}] Starting QA verification for task: ${task.title}`);
        const qaResult = await this.qaEngineer.verifyTaskCompletion(
          projectId,
          taskId,
          task,
          project.projectPath,
          socket
        );
        
        if (qaResult.passed) {
          console.log(`[${sessionId}] QA verification PASSED (Score: ${qaResult.score.toFixed(2)})`);
          // Task completed successfully and passed QA
          await this.completeTaskSafely(projectId, taskId, socket);
        } else {
          console.log(`[${sessionId}] QA verification FAILED (Score: ${qaResult.score.toFixed(2)})`);
          console.log(`[${sessionId}] Issues found:`, qaResult.issues);
          
          // Mark task as requiring revision
          await this.handleTaskQAFailure(projectId, taskId, agent, qaResult, socket);
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
   * Safe task completion with proper error handling
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
      
      // Emit task completed event
      socket.emit('task_completed', {
        projectId,
        taskId,
        agentId: agent.id,
        task: task
      });
      
      console.log('Task completed:', task.title);
      
      // CRITICAL FIX: Check for newly available tasks and trigger them
      // This was missing from the original completeTaskSafely method
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
   * Create task graph with nodes and edges (LangGraph style)
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
   * Assign tasks to specialized agents based on capabilities and workload
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
      
      // Add tasks to project overview
      assignment.tasks.forEach(task => {
        projectBoard.columns.todo.tasks.push({
          ...task,
          agentId: agentId,
          agentName: agent.name
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
        title: node.title,
        description: node.description,
        type: node.type,
        status: node.status,
        dependencies: node.dependencies,
        assignedAgent: node.assignedAgent,
        estimatedTime: node.estimatedTime,
        priority: node.priority,
        complexity: node.complexity,
        position: node.position
      })) : [],
      edges: taskGraph.edges ? taskGraph.edges.map(edge => ({
        from: edge.from,
        to: edge.to,
        type: edge.type
      })) : []
    };
    
    return sanitized;
  }
}

module.exports = TaskOrchestrator; 