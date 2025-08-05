const LLMInterface = require('../../utils/LLMInterface');
const { v4: uuidv4 } = require('uuid');

/**
 * Requirements Analyzer
 * 
 * LLM-powered requirements analysis that transforms user requests
 * into detailed project blueprints without hardcoded domain knowledge.
 * 
 * Handles any internal business tool across domains:
 * - HR systems (onboarding, performance, etc.)
 * - Finance tools (reporting, expense tracking, etc.)
 * - IT systems (asset management, helpdesk, etc.)
 * - Operations tools (inventory, scheduling, etc.)
 */
class RequirementsAnalyzer {
  constructor(config = {}) {
    this.llm = new LLMInterface(config.llm || {});
    this.config = {
      enableDetailedAnalysis: config.enableDetailedAnalysis !== false,
      includeComplianceAnalysis: config.includeComplianceAnalysis !== false,
      generateTestCriteria: config.generateTestCriteria !== false,
      ...config
    };
    
    console.log('🧠 RequirementsAnalyzer initialized with LLM intelligence');
  }

  /**
   * Main analysis method - transforms user request into complete blueprint
   */
  async analyzeRequest(userRequest, context = {}) {
    console.log(`🔍 Analyzing request: "${userRequest}"`);
    
    try {
      // Step 1: Understand what they want to build
      const analysis = await this.performDomainAnalysis(userRequest, context);
      
      // Step 2: Create comprehensive blueprint
      const blueprint = await this.createProjectBlueprint(analysis, userRequest);
      
      // Step 3: Generate executable tasks
      const tasks = await this.generateProjectTasks(blueprint, context);
      
      // Step 4: Enhance with integration details
      const enhancedTasks = await this.enrichTasksWithIntegration(tasks, blueprint);
      
      const result = {
        originalRequest: userRequest,
        analysis: analysis,
        blueprint: blueprint,
        tasks: enhancedTasks,
        estimatedDuration: this.calculateTotalDuration(enhancedTasks),
        complexity: this.assessComplexity(blueprint, enhancedTasks),
        timestamp: new Date().toISOString()
      };
      
      console.log(`✅ Analysis complete: ${enhancedTasks.length} tasks, ~${result.estimatedDuration}min`);
      return result;
      
    } catch (error) {
      console.error('❌ Requirements analysis failed:', error);
      throw error;
    }
  }

  /**
   * Step 1: Perform domain-agnostic analysis
   */
  async performDomainAnalysis(userRequest, context) {
    console.log('🎯 Performing domain analysis...');
    
    const analysis = await this.llm.analyzeRequirements(userRequest);
    
    // Enhance with additional context if provided
    if (context.existingSystems) {
      analysis.integrationContext = context.existingSystems;
    }
    
    if (context.userTypes) {
      analysis.targetUsers = context.userTypes;
    }
    
    console.log(`📊 Domain identified: ${analysis.domain}`);
    return analysis;
  }

  /**
   * Step 2: Create comprehensive project blueprint
   */
  async createProjectBlueprint(analysis, originalRequest) {
    console.log('📋 Creating project blueprint...');
    
    const blueprint = await this.llm.createBlueprint(analysis, originalRequest);
    
    // Enhance blueprint with technical details
    const enhancedBlueprint = {
      ...blueprint,
      
      // Project metadata
      projectId: uuidv4(),
      domain: analysis.domain,
      complexity: this.inferComplexity(blueprint),
      
      // Technical architecture
      architecture: await this.defineArchitecture(blueprint, analysis),
      
      // Integration requirements
      integrations: await this.identifyIntegrations(blueprint, analysis),
      
      // Quality requirements
      qualityGates: this.defineQualityGates(analysis.domain),
      
      // Compliance requirements
      compliance: this.identifyCompliance(analysis)
    };
    
    console.log(`🏗️ Blueprint created with ${enhancedBlueprint.components?.length || 0} components`);
    return enhancedBlueprint;
  }

  /**
   * Step 3: Generate executable tasks from blueprint
   */
  async generateProjectTasks(blueprint, context) {
    console.log('📝 Generating project tasks...');
    
    // Get available specialists
    const specialists = this.getAvailableSpecialists(context);
    
    // Generate tasks using LLM
    const rawTasks = await this.llm.generateTasks(blueprint, specialists);
    const tasks = Array.isArray(rawTasks) ? rawTasks : [];
    
    // Ensure all tasks have required fields
    const validatedTasks = tasks.map(task => this.validateAndEnhanceTask(task, blueprint));
    
    console.log(`✅ Generated ${validatedTasks.length} executable tasks`);
    return validatedTasks;
  }

  /**
   * Step 4: Enrich tasks with integration contracts
   */
  async enrichTasksWithIntegration(tasks, blueprint) {
    console.log('🔗 Enriching tasks with integration details...');
    
    const enrichedTasks = [];
    
    for (const task of tasks) {
      const enhanced = {
        ...task,
        
        // Ensure unique ID
        id: task.id || uuidv4(),
        
        // Rich integration context
        context: {
          inputs: task.requiredInputs || [],
          outputs: task.providedOutputs || [],
          contracts: task.integrationContracts || {},
          validation: task.validationCriteria || []
        },
        
        // Domain context
        domain: {
          type: blueprint.domain,
          projectId: blueprint.projectId,
          compliance: task.complianceRequirements || [],
          businessRules: task.businessLogic || []
        },
        
        // Execution metadata
        status: 'pending',
        priority: this.calculateTaskPriority(task, tasks),
        estimatedDuration: task.estimatedDuration || 60,
        specialist: task.specialist || 'General',
        dependencies: task.dependencies || []
      };
      
      enrichedTasks.push(enhanced);
    }
    
    // Validate integration completeness
    this.validateIntegrationCompleteness(enrichedTasks);
    
    console.log('🔗 Task integration enrichment complete');
    return enrichedTasks;
  }

  /**
   * Define technical architecture based on requirements
   */
  async defineArchitecture(blueprint, analysis) {
    const components = blueprint.components || [];
    const hasUI = components.some(c => c.type === 'frontend' || c.name?.toLowerCase().includes('interface'));
    const hasAPI = components.some(c => c.type === 'backend' || c.name?.toLowerCase().includes('api'));
    const hasDB = components.some(c => c.type === 'database' || c.name?.toLowerCase().includes('data'));
    
    return {
      pattern: hasUI && hasAPI && hasDB ? 'full-stack' : hasAPI ? 'api-service' : 'frontend-only',
      frontend: hasUI ? { framework: 'React', styling: 'Tailwind CSS' } : null,
      backend: hasAPI ? { framework: 'Python/FastAPI', database: 'PostgreSQL' } : null,
      deployment: { type: 'containerized', platform: 'docker' },
      security: { authentication: 'JWT', authorization: 'RBAC' }
    };
  }

  /**
   * Identify required integrations
   */
  async identifyIntegrations(blueprint, analysis) {
    const integrations = [];
    
    // Common business system integrations
    if (analysis.domain === 'Human Resources') {
      integrations.push('Active Directory', 'Payroll System', 'Benefits Platform');
    } else if (analysis.domain === 'Finance') {
      integrations.push('ERP System', 'Banking API', 'Accounting Software');
    } else if (analysis.domain === 'IT') {
      integrations.push('Asset Management', 'LDAP', 'Monitoring Systems');
    }
    
    // Always include basic integrations
    integrations.push('Email Service', 'Authentication System', 'File Storage');
    
    return integrations.map(name => ({
      name,
      type: 'external_system',
      required: true,
      method: 'API'
    }));
  }

  /**
   * Define quality gates based on domain
   */
  defineQualityGates(domain) {
    const commonGates = [
      { type: 'code_review', required: true },
      { type: 'testing', required: true },
      { type: 'security_scan', required: true }
    ];
    
    // Domain-specific quality gates
    if (domain === 'Finance') {
      commonGates.push({ type: 'financial_audit', required: true });
    } else if (domain === 'Human Resources') {
      commonGates.push({ type: 'privacy_review', required: true });
    } else if (domain === 'IT') {
      commonGates.push({ type: 'infrastructure_review', required: true });
    }
    
    return commonGates;
  }

  /**
   * Identify compliance requirements
   */
  identifyCompliance(analysis) {
    const compliance = ['data_privacy', 'audit_logging'];
    
    if (analysis.domain === 'Finance') {
      compliance.push('sox_compliance', 'financial_reporting');
    } else if (analysis.domain === 'Human Resources') {
      compliance.push('gdpr_compliance', 'employee_privacy');
    } else if (analysis.domain === 'IT') {
      compliance.push('security_standards', 'access_control');
    }
    
    return compliance;
  }

  /**
   * Get available specialists from context
   */
  getAvailableSpecialists(context) {
    // Default specialists
    const defaultSpecialists = [
      { name: 'React Frontend', specialization: 'Frontend Development', capabilities: ['React', 'JavaScript', 'CSS', 'UI/UX'] },
      { name: 'Python Backend', specialization: 'Backend Development', capabilities: ['Python', 'FastAPI', 'PostgreSQL', 'API Design'] },
      { name: 'QA Testing', specialization: 'Quality Assurance', capabilities: ['Testing', 'Automation', 'Quality Control'] },
      { name: 'Code Review', specialization: 'Code Quality', capabilities: ['Security', 'Best Practices', 'Performance'] }
    ];
    
    return context.specialists || defaultSpecialists;
  }

  /**
   * Validate and enhance individual task
   */
  validateAndEnhanceTask(task, blueprint) {
    return {
      id: task.id || uuidv4(),
      title: task.title || task.name || 'Untitled Task',
      description: task.description || task.title || 'No description provided',
      type: task.type || 'implementation',
      specialist: task.specialist || 'General',
      
      // Dependencies
      dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      
      // Integration details
      requiredInputs: Array.isArray(task.requiredInputs) ? task.requiredInputs : [],
      providedOutputs: Array.isArray(task.providedOutputs) ? task.providedOutputs : [],
      integrationContracts: task.integrationContracts || {},
      
      // Validation
      validationCriteria: Array.isArray(task.validationCriteria) ? task.validationCriteria : [],
      
      // Metadata
      estimatedDuration: parseInt(task.estimatedDuration) || 60,
      priority: task.priority || 'medium',
      
      // Compliance
      complianceRequirements: task.complianceRequirements || [],
      businessLogic: task.businessLogic || []
    };
  }

  /**
   * Calculate task priority based on dependencies and impact
   */
  calculateTaskPriority(task, allTasks) {
    let priority = 0;
    
    // Tasks with no dependencies get higher priority
    if (!task.dependencies || task.dependencies.length === 0) {
      priority += 10;
    }
    
    // Tasks that provide integration contracts get higher priority
    if (task.integrationContracts?.providesAPI || task.integrationContracts?.definesSchema) {
      priority += 20;
    }
    
    // Tasks that many others depend on get higher priority
    const dependents = allTasks.filter(t => 
      t.dependencies && t.dependencies.includes(task.id)
    ).length;
    priority += dependents * 5;
    
    // Convert to priority level
    if (priority >= 20) return 'high';
    if (priority >= 10) return 'medium';
    return 'low';
  }

  /**
   * Validate that all integration contracts are complete
   */
  validateIntegrationCompleteness(tasks) {
    const provides = new Set();
    const requires = new Set();
    
    for (const task of tasks) {
      // Track what each task provides
      if (task.context.contracts.providesAPI) {
        provides.add(task.context.contracts.providesAPI);
      }
      if (task.context.contracts.definesSchema) {
        provides.add(task.context.contracts.definesSchema);
      }
      
      // Track what each task requires
      if (task.context.contracts.consumesAPI) {
        requires.add(task.context.contracts.consumesAPI);
      }
      if (task.context.contracts.requiresSchema) {
        requires.add(task.context.contracts.requiresSchema);
      }
    }
    
    // Check for missing providers
    for (const required of requires) {
      if (!provides.has(required)) {
        console.warn(`⚠️ Missing provider for required contract: ${required}`);
      }
    }
    
    console.log(`🔍 Integration validation: ${provides.size} providers, ${requires.size} consumers`);
  }

  /**
   * Calculate total estimated duration
   */
  calculateTotalDuration(tasks) {
    return tasks.reduce((total, task) => total + (task.estimatedDuration || 60), 0);
  }

  /**
   * Assess project complexity
   */
  assessComplexity(blueprint, tasks) {
    let complexity = 0;
    
    // Component count
    complexity += (blueprint.components?.length || 0) * 2;
    
    // Task count  
    complexity += tasks.length;
    
    // Integration count
    complexity += (blueprint.integrations?.length || 0) * 3;
    
    // Dependencies
    const totalDeps = tasks.reduce((sum, task) => sum + (task.dependencies?.length || 0), 0);
    complexity += totalDeps;
    
    if (complexity >= 30) return 'high';
    if (complexity >= 15) return 'medium';
    return 'low';
  }

  /**
   * Infer complexity from blueprint
   */
  inferComplexity(blueprint) {
    const componentCount = blueprint.components?.length || 0;
    const workflowCount = blueprint.workflows?.length || 0;
    const integrationCount = blueprint.integrations?.length || 0;
    
    const score = componentCount * 2 + workflowCount + integrationCount * 3;
    
    if (score >= 20) return 'high';
    if (score >= 10) return 'medium';
    return 'low';
  }

  /**
   * Get analyzer statistics
   */
  getStats() {
    return {
      llmStats: this.llm.getStats(),
      config: this.config
    };
  }
}

module.exports = RequirementsAnalyzer;