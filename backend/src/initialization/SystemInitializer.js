const JSONStorageManager = require('../storage/JSONStorageManager');
const { SimpleEventBus } = require('../events/SimpleEventBus');
const path = require('path');

/**
 * System Initializer
 * 
 * Responsible for:
 * - Setting up the JSON storage directory structure
 * - Initializing core system components
 * - Creating default configurations and data
 * - Performing system health checks
 * - Preparing the system for service startup
 */
class SystemInitializer {
  constructor(config = {}) {
    this.config = {
      storagePath: config.storagePath || './data/storage',
      createSampleData: config.createSampleData !== false,
      enableHealthCheck: config.enableHealthCheck !== false,
      ...config
    };
    
    this.storageManager = null;
    this.eventBus = null;
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) {
      console.log('🔄 System already initialized');
      return { storageManager: this.storageManager, eventBus: this.eventBus };
    }
    
    console.log('🚀 Initializing Maverick System...');
    
    try {
      // 1. Initialize storage manager
      await this.initializeStorage();
      
      // 2. Initialize event bus
      await this.initializeEventBus();
      
      // 3. Create directory structure
      await this.createDirectoryStructure();
      
      // 4. Create default configurations
      await this.createDefaultConfigurations();
      
      // 5. Create sample data if enabled
      if (this.config.createSampleData) {
        await this.createSampleData();
      }
      
      // 6. Perform health check
      if (this.config.enableHealthCheck) {
        await this.performInitialHealthCheck();
      }
      
      this.initialized = true;
      console.log('✅ Maverick System initialized successfully');
      
      return {
        storageManager: this.storageManager,
        eventBus: this.eventBus
      };
      
    } catch (error) {
      console.error('❌ System initialization failed:', error);
      throw error;
    }
  }
  
  async initializeStorage() {
    console.log('📁 Initializing JSON storage manager...');
    
    this.storageManager = new JSONStorageManager(this.config.storagePath);
    await this.storageManager.initialize();
    
    console.log(`✅ Storage initialized at: ${this.storageManager.basePath}`);
  }
  
  async initializeEventBus() {
    console.log('📡 Initializing event bus...');
    
    this.eventBus = new SimpleEventBus({
      maxHistorySize: 5000,
      enableTracing: true,
      enableRateLimit: false,
      retryAttempts: 3
    });
    
    console.log('✅ Event bus initialized');
  }
  
  async createDirectoryStructure() {
    console.log('🏗️ Creating directory structure...');
    
    const directories = [
      // Core directories (already created by JSONStorageManager)
      'projects',
      'agents',
      'system',
      'temp/locks',
      'backups',
      
      // Additional service directories
      'system/services',
      'system/logs',
      'system/metrics',
      'system/health',
      
      // Plugin directories
      'plugins',
      'plugins/agents',
      'plugins/templates',
      'plugins/extensions',
      
      // Cache directories
      'cache',
      'cache/task-graphs',
      'cache/quality-metrics',
      'cache/agent-performance',
      
      // Export/import directories
      'export',
      'import',
      
      // Development and testing
      'development',
      'development/test-projects',
      'development/sandbox'
    ];
    
    const fs = require('fs-extra');
    
    for (const dir of directories) {
      const fullPath = path.join(this.storageManager.basePath, dir);
      await fs.ensureDir(fullPath);
    }
    
    console.log(`✅ Created ${directories.length} directories`);
  }
  
  async createDefaultConfigurations() {
    console.log('⚙️ Creating default configurations...');
    
    // System configuration
    const systemConfig = {
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: {
        enhancedOrchestration: true,
        intelligentAgentMatching: true,
        qualityFeedback: true,
        hotLoading: true,
        backupSystem: true
      },
      limits: {
        maxConcurrentProjects: 10,
        maxConcurrentTasks: 50,
        maxAgentInstances: 20,
        maxHistorySize: 10000
      },
      timeouts: {
        taskExecution: 600000, // 10 minutes
        agentResponse: 30000,  // 30 seconds
        systemHealth: 5000     // 5 seconds
      },
      quality: {
        minimumScore: 0.7,
        targetScore: 0.9,
        enableAutoRework: true,
        maxReworkAttempts: 3
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    await this.storageManager.saveSystemConfig(systemConfig);
    
    // Agent registry configuration
    const agentConfig = {
      autoDiscovery: true,
      hotReloading: true,
      pluginDirectories: ['./plugins/agents'],
      defaultCapabilities: {
        timeout: 300000, // 5 minutes
        retries: 3,
        qualityThreshold: 0.8
      },
      loadBalancing: {
        strategy: 'quality_weighted', // round_robin, quality_weighted, least_busy
        enableHealthCheck: true,
        healthCheckInterval: 30000
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    await this.storageManager.saveJSON(
      path.join(this.storageManager.basePath, 'system', 'agent-config.json'),
      agentConfig
    );
    
    // Task orchestration configuration
    const orchestrationConfig = {
      defaultStrategy: 'dependency_optimized', // sequential, parallel, dependency_optimized
      maxConcurrentTasks: 5,
      taskTimeout: 900000, // 15 minutes
      checkpointInterval: 60000, // 1 minute
      enableQualityGates: true,
      enableTaskRecovery: true,
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        baseDelay: 1000
      },
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    await this.storageManager.saveJSON(
      path.join(this.storageManager.basePath, 'system', 'orchestration-config.json'),
      orchestrationConfig
    );
    
    console.log('✅ Default configurations created');
  }
  
  async createSampleData() {
    console.log('📝 Creating sample data...');
    
    // Sample agent definitions
    const sampleAgents = {
      'react-frontend-specialist': {
        id: 'react-frontend-specialist',
        name: 'React Frontend Specialist',
        version: '1.0.0',
        specialization: 'Frontend Development',
        capabilities: {
          'frontend': { efficiency: 0.95, experience: 'expert' },
          'react': { efficiency: 0.98, experience: 'expert' },
          'javascript': { efficiency: 0.94, experience: 'expert' },
          'typescript': { efficiency: 0.92, experience: 'expert' },
          'css': { efficiency: 0.88, experience: 'advanced' },
          'html': { efficiency: 0.90, experience: 'expert' }
        },
        configuration: {
          maxConcurrentTasks: 3,
          estimatedTaskTime: 20,
          qualityThreshold: 0.90,
          retryAttempts: 2
        },
        status: 'available',
        pluginPath: null,
        lastHealthCheck: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      
      'python-backend-specialist': {
        id: 'python-backend-specialist',
        name: 'Python Backend Specialist',
        version: '1.0.0',
        specialization: 'Backend Development',
        capabilities: {
          'backend': { efficiency: 0.96, experience: 'expert' },
          'python': { efficiency: 0.98, experience: 'expert' },
          'api_development': { efficiency: 0.94, experience: 'expert' },
          'database': { efficiency: 0.91, experience: 'advanced' },
          'docker': { efficiency: 0.87, experience: 'advanced' },
          'testing': { efficiency: 0.89, experience: 'advanced' }
        },
        configuration: {
          maxConcurrentTasks: 4,
          estimatedTaskTime: 25,
          qualityThreshold: 0.88,
          retryAttempts: 3
        },
        status: 'available',
        pluginPath: null,
        lastHealthCheck: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      
      'code-review-specialist': {
        id: 'code-review-specialist',
        name: 'Code Review Specialist',
        version: '1.0.0',
        specialization: 'Code Review & Quality Assurance',
        capabilities: {
          'code_quality': { efficiency: 0.95, experience: 'expert' },
          'security_review': { efficiency: 0.92, experience: 'expert' },
          'performance_analysis': { efficiency: 0.88, experience: 'advanced' },
          'best_practices': { efficiency: 0.94, experience: 'expert' },
          'static_analysis': { efficiency: 0.93, experience: 'expert' }
        },
        configuration: {
          maxConcurrentTasks: 6,
          estimatedTaskTime: 10,
          qualityThreshold: 0.95,
          retryAttempts: 1
        },
        status: 'available',
        pluginPath: null,
        lastHealthCheck: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      
      'qa-testing-specialist': {
        id: 'qa-testing-specialist',
        name: 'QA Testing Specialist',
        version: '1.0.0',
        specialization: 'Quality Assurance & Testing',
        capabilities: {
          'unit_testing': { efficiency: 0.91, experience: 'expert' },
          'integration_testing': { efficiency: 0.89, experience: 'advanced' },
          'e2e_testing': { efficiency: 0.87, experience: 'advanced' },
          'test_automation': { efficiency: 0.93, experience: 'expert' },
          'performance_testing': { efficiency: 0.85, experience: 'intermediate' }
        },
        configuration: {
          maxConcurrentTasks: 4,
          estimatedTaskTime: 15,
          qualityThreshold: 0.90,
          retryAttempts: 2
        },
        status: 'available',
        pluginPath: null,
        lastHealthCheck: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    
    // Save sample agents
    for (const [agentId, agentData] of Object.entries(sampleAgents)) {
      await this.storageManager.saveAgent(agentData);
    }
    
    // Sample project template
    const sampleProject = {
      id: 'sample-react-app',
      name: 'Sample React Application',
      description: 'A demonstration project showing multi-agent coordination',
      status: 'completed',
      requirements: {
        originalPrompt: 'Create a modern React application with user authentication and task management',
        parsedRequirements: [
          'React frontend with modern UI',
          'User authentication system',
          'Task management functionality',
          'Responsive design',
          'Unit tests',
          'Documentation'
        ]
      },
      configuration: {
        maxConcurrentTasks: 5,
        qualityThreshold: 0.8,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 }
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    
    await this.storageManager.saveProject(sampleProject);
    
    // Sample task graph for the project
    const sampleTaskGraph = {
      id: 'sample-task-graph',
      projectId: 'sample-react-app',
      version: 1,
      graphDefinition: {
        nodes: {
          'setup-project': {
            id: 'setup-project',
            type: 'setup',
            status: 'completed',
            config: {
              framework: 'react',
              features: ['routing', 'state-management'],
              estimatedDuration: 15
            },
            dependencies: [],
            priority: 1,
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            startedAt: new Date(Date.now() - 86300000).toISOString(),
            completedAt: new Date(Date.now() - 86100000).toISOString(),
            qualityScore: 0.92,
            assignedAgent: 'react-frontend-specialist'
          },
          'implement-auth': {
            id: 'implement-auth',
            type: 'feature',
            status: 'completed',
            config: {
              feature: 'authentication',
              provider: 'jwt',
              estimatedDuration: 30
            },
            dependencies: [
              { nodeId: 'setup-project', type: 'completion', condition: { status: 'completed' } }
            ],
            priority: 2,
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(Date.now() - 86000000).toISOString(),
            startedAt: new Date(Date.now() - 85800000).toISOString(),
            completedAt: new Date(Date.now() - 83400000).toISOString(),
            qualityScore: 0.89,
            assignedAgent: 'python-backend-specialist'
          },
          'implement-tasks': {
            id: 'implement-tasks',
            type: 'feature',
            status: 'completed',
            config: {
              feature: 'task-management',
              crud: true,
              estimatedDuration: 45
            },
            dependencies: [
              { nodeId: 'implement-auth', type: 'completion', condition: { status: 'completed', quality: '>= 0.8' } }
            ],
            priority: 3,
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(Date.now() - 83000000).toISOString(),
            startedAt: new Date(Date.now() - 82800000).toISOString(),
            completedAt: new Date(Date.now() - 80100000).toISOString(),
            qualityScore: 0.94,
            assignedAgent: 'react-frontend-specialist'
          },
          'final-review': {
            id: 'final-review',
            type: 'quality',
            status: 'completed',
            config: {
              reviewType: 'comprehensive',
              threshold: 0.9,
              estimatedDuration: 20
            },
            dependencies: [
              { nodeId: 'implement-tasks', type: 'completion', condition: { status: 'completed', quality: '>= 0.8' } }
            ],
            priority: 4,
            retryCount: 0,
            maxRetries: 3,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            startedAt: new Date(Date.now() - 3300000).toISOString(),
            completedAt: new Date(Date.now() - 1800000).toISOString(),
            qualityScore: 0.96,
            assignedAgent: 'code-review-specialist'
          }
        },
        edges: [
          { from: 'setup-project', to: 'implement-auth', condition: { type: 'completion' } },
          { from: 'implement-auth', to: 'implement-tasks', condition: { type: 'completion', quality: '>= 0.8' } },
          { from: 'implement-tasks', to: 'final-review', condition: { type: 'completion', quality: '>= 0.8' } }
        ]
      },
      isActive: false,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    await this.storageManager.saveTaskGraph('sample-react-app', sampleTaskGraph);
    
    // Sample quality metrics
    const sampleQualityMetrics = [
      {
        id: 'quality-1',
        projectId: 'sample-react-app',
        taskId: 'setup-project',
        agentId: 'react-frontend-specialist',
        taskType: 'setup',
        overallScore: 0.92,
        breakdown: {
          codeQuality: 0.94,
          security: 0.90,
          performance: 0.88,
          testCoverage: 0.95
        },
        performanceMetrics: {
          executionTime: 850,
          memoryUsage: 128,
          cpuUsage: 35
        },
        timestamp: new Date(Date.now() - 86100000).toISOString()
      },
      {
        id: 'quality-2',
        projectId: 'sample-react-app',
        taskId: 'implement-auth',
        agentId: 'python-backend-specialist',
        taskType: 'feature',
        overallScore: 0.89,
        breakdown: {
          codeQuality: 0.87,
          security: 0.95,
          performance: 0.85,
          testCoverage: 0.88
        },
        performanceMetrics: {
          executionTime: 2400,
          memoryUsage: 256,
          cpuUsage: 45
        },
        timestamp: new Date(Date.now() - 83400000).toISOString()
      }
    ];
    
    for (const metric of sampleQualityMetrics) {
      await this.storageManager.saveQualityMetrics('sample-react-app', metric);
    }
    
    console.log('✅ Sample data created');
  }
  
  async performInitialHealthCheck() {
    console.log('💓 Performing initial health check...');
    
    const healthStatus = {
      system: 'healthy',
      components: {},
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    };
    
    // Check storage
    try {
      const stats = await this.storageManager.getStorageStats();
      healthStatus.components.storage = {
        status: 'healthy',
        stats: stats
      };
    } catch (error) {
      healthStatus.components.storage = {
        status: 'unhealthy',
        error: error.message
      };
      healthStatus.system = 'degraded';
    }
    
    // Check event bus
    try {
      const busHealth = await this.eventBus.healthCheck();
      healthStatus.components.eventBus = {
        status: 'healthy',
        stats: busHealth.stats
      };
    } catch (error) {
      healthStatus.components.eventBus = {
        status: 'unhealthy',
        error: error.message
      };
      healthStatus.system = 'degraded';
    }
    
    // Check directory structure
    try {
      const fs = require('fs-extra');
      const requiredDirs = ['projects', 'agents', 'system'];
      let dirCheck = true;
      
      for (const dir of requiredDirs) {
        const dirPath = path.join(this.storageManager.basePath, dir);
        if (!await fs.pathExists(dirPath)) {
          dirCheck = false;
          break;
        }
      }
      
      healthStatus.components.directories = {
        status: dirCheck ? 'healthy' : 'unhealthy'
      };
      
      if (!dirCheck) {
        healthStatus.system = 'unhealthy';
      }
      
    } catch (error) {
      healthStatus.components.directories = {
        status: 'unhealthy',
        error: error.message
      };
      healthStatus.system = 'unhealthy';
    }
    
    // Save health status
    await this.storageManager.saveSystemHealth(healthStatus);
    
    if (healthStatus.system === 'healthy') {
      console.log('✅ System health check passed');
    } else {
      console.log(`⚠️ System health check completed with status: ${healthStatus.system}`);
    }
    
    return healthStatus;
  }
  
  async getInitializationSummary() {
    if (!this.initialized) {
      return { status: 'not_initialized' };
    }
    
    const storageStats = await this.storageManager.getStorageStats();
    const eventBusStats = this.eventBus.getStats();
    const systemHealth = await this.storageManager.loadSystemHealth();
    
    return {
      status: 'initialized',
      timestamp: new Date().toISOString(),
      storage: {
        basePath: this.storageManager.basePath,
        stats: storageStats
      },
      eventBus: {
        stats: eventBusStats
      },
      health: systemHealth,
      components: {
        storageManager: !!this.storageManager,
        eventBus: !!this.eventBus
      }
    };
  }
}

module.exports = SystemInitializer;