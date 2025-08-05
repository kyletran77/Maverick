/**
 * LLM Interface Wrapper
 * 
 * Clean, simple interface for LLM interactions
 * Handles caching, retries, and response formatting
 */
class LLMInterface {
  constructor(config = {}) {
    this.config = {
      provider: config.provider || 'openai',
      model: config.model || 'gpt-4',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2000,
      retryAttempts: config.retryAttempts || 3,
      enableCaching: config.enableCaching !== false,
      ...config
    };
    
    this.cache = new Map();
    this.requestCount = 0;
    
    console.log(`🤖 LLMInterface initialized with ${this.config.provider}/${this.config.model}`);
  }

  /**
   * Main LLM interaction method
   */
  async query(params) {
    const { prompt, systemPrompt, format, context, cacheKey } = params;
    
    this.requestCount++;
    
    // Check cache first
    if (this.config.enableCaching && cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`💾 Using cached response for: ${cacheKey}`);
        return cached;
      }
    }
    
    // Build full prompt
    const fullPrompt = this.buildPrompt(prompt, systemPrompt, format, context);
    
    try {
      const response = await this.makeRequest(fullPrompt);
      const parsed = this.parseResponse(response, format);
      
      // Cache successful responses
      if (this.config.enableCaching && cacheKey) {
        this.cache.set(cacheKey, parsed);
      }
      
      return parsed;
      
    } catch (error) {
      console.error('❌ LLM request failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze user requirements (domain-agnostic)
   */
  async analyzeRequirements(userRequest) {
    return await this.query({
      prompt: `Analyze this request for an internal business tool: "${userRequest}"
      
      Discover and define:
      1. What type of system is this?
      2. What domain/industry is this for?
      3. Who are the end users?
      4. What problems does it solve?
      5. What are the core workflows?
      6. What data will it handle?
      7. What integrations might it need?
      8. What compliance/security concerns exist?
      
      Be specific to their domain and use case. Don't make assumptions.`,
      
      systemPrompt: `You are analyzing requirements for an internal business tool. 
      The domain could be anything - HR, Finance, IT, Operations, etc. 
      Discover what's needed without assumptions.`,
      
      format: 'analysis',
      cacheKey: `requirements_${this.hashString(userRequest)}`
    });
  }

  /**
   * Create project blueprint from analysis
   */
  async createBlueprint(analysis, originalRequest) {
    return await this.query({
      prompt: `Based on this analysis: ${JSON.stringify(analysis)}
      Original request: "${originalRequest}"
      
      Create a complete project blueprint with:
      
      COMPONENTS: What parts need to be built?
      WORKFLOWS: How will users interact with it?
      DATA MODELS: What data structures are needed?
      INTEGRATIONS: What systems does it connect to?
      DEPENDENCIES: What depends on what?
      SUCCESS CRITERIA: How do we know it works?
      
      Think like a senior architect who understands their domain.`,
      
      format: 'blueprint',
      context: { analysis, originalRequest },
      cacheKey: `blueprint_${this.hashString(originalRequest)}`
    });
  }

  /**
   * Generate tasks from blueprint
   */
  async generateTasks(blueprint, specialists) {
    return await this.query({
      prompt: `Given this blueprint: ${JSON.stringify(blueprint)}
      
      Available specialists:
      ${specialists.map(s => `- ${s.name}: ${s.capabilities || s.specialization}`).join('\n')}
      
      Create specific tasks that:
      1. Build each component properly
      2. Ensure all parts integrate perfectly
      3. Handle the domain-specific logic
      4. Test everything thoroughly
      
      For each task specify:
      - What needs to be built (exact deliverables)
      - Which specialist should do it
      - What it depends on (other tasks)
      - What depends on it
      - Required inputs from other tasks  
      - Outputs provided to other tasks
      - Integration contracts (APIs, schemas, interfaces)
      - How to verify it works
      - Estimated duration in minutes`,
      
      systemPrompt: `Create tasks that guarantee perfect integration.
      Each task should know exactly what it receives and what it provides.
      Think like a senior architect ensuring all pieces fit together.`,
      
      format: 'tasks',
      context: { blueprint, specialists }
    });
  }

  /**
   * Select best specialist for a task
   */
  async selectSpecialist(task, specialists, context = {}) {
    return await this.query({
      prompt: `Given this task: ${JSON.stringify(task)}
      
      Available specialists:
      ${specialists.map(s => `- ${s.name}: ${s.capabilities || s.specialization || 'General capabilities'}`).join('\n')}
      
      Context from dependencies: ${JSON.stringify(context)}
      
      Consider:
      1. Task requirements and domain
      2. Required technical skills
      3. Integration points that need understanding
      4. Current specialist workload
      5. Previous successful assignments
      
      Select the best specialist and explain why.
      Also suggest 1-2 alternatives in case the primary choice is unavailable.`,
      
      format: 'selection',
      context: { task, specialists, context }
    });
  }

  /**
   * Build complete prompt with context
   */
  buildPrompt(prompt, systemPrompt, format, context) {
    let fullPrompt = '';
    
    if (systemPrompt) {
      fullPrompt += `SYSTEM: ${systemPrompt}\n\n`;
    }
    
    fullPrompt += `USER: ${prompt}\n\n`;
    
    if (context) {
      fullPrompt += `CONTEXT: ${JSON.stringify(context, null, 2)}\n\n`;
    }
    
    if (format) {
      fullPrompt += `Please format your response as: ${format}\n\n`;
    }
    
    return fullPrompt;
  }

  /**
   * Make the actual LLM request (implement based on your provider)
   */
  async makeRequest(prompt) {
    // This is a placeholder - implement based on your LLM provider
    // For now, return a mock response for testing
    
    console.log(`🤖 LLM Request #${this.requestCount}`);
    console.log(`📝 Prompt: ${prompt.substring(0, 200)}...`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response based on prompt content
    if (prompt.includes('Analyze this request')) {
      return this.mockAnalysisResponse(prompt);
    } else if (prompt.includes('Create a complete blueprint')) {
      return this.mockBlueprintResponse(prompt);
    } else if (prompt.includes('Create specific tasks')) {
      return this.mockTasksResponse(prompt);
    } else if (prompt.includes('Select the best specialist')) {
      return this.mockSpecialistSelection(prompt);
    }
    
    return 'Mock LLM response - please implement actual LLM integration';
  }

  /**
   * Parse LLM response based on expected format
   */
  parseResponse(response, format) {
    try {
      if (format === 'analysis' || format === 'blueprint' || format === 'tasks' || format === 'selection') {
        // Try to parse as JSON first
        if (response.includes('{') && response.includes('}')) {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        }
      }
      
      // Return as-is if no specific format or parsing fails
      return response;
      
    } catch (error) {
      console.warn('⚠️ Failed to parse LLM response, returning raw text');
      return response;
    }
  }

  /**
   * Mock responses for testing (remove when implementing real LLM)
   */
  mockAnalysisResponse(prompt) {
    const request = prompt.match(/request for an internal business tool: "([^"]+)"/)?.[1] || 'unknown';
    
    return JSON.stringify({
      systemType: 'internal_business_tool',
      domain: this.inferDomain(request),
      users: ['employees', 'managers', 'administrators'],
      problems: ['manual processes', 'inefficiency', 'data silos'],
      workflows: ['data entry', 'approval process', 'reporting'],
      dataTypes: ['user records', 'business data', 'audit logs'],
      integrations: ['existing systems', 'databases', 'authentication'],
      compliance: ['data privacy', 'audit trails', 'access control']
    });
  }

  mockBlueprintResponse(prompt) {
    return JSON.stringify({
      components: [
        { name: 'Frontend Interface', type: 'frontend', technology: 'React' },
        { name: 'Backend API', type: 'backend', technology: 'Python/FastAPI' },
        { name: 'Database Layer', type: 'database', technology: 'PostgreSQL' },
        { name: 'Authentication', type: 'auth', technology: 'JWT' }
      ],
      workflows: [
        'User login and authentication',
        'Data entry and validation',
        'Approval workflows',
        'Reporting and analytics'
      ],
      dataModels: [
        { name: 'User', fields: ['id', 'email', 'role'] },
        { name: 'Record', fields: ['id', 'data', 'status', 'created_at'] }
      ],
      integrations: [
        'Authentication system',
        'Existing database',
        'Email notifications'
      ],
      successCriteria: [
        'Users can log in successfully',
        'Data is stored and retrieved correctly',
        'All workflows complete end-to-end'
      ]
    });
  }

  mockTasksResponse(prompt) {
    return JSON.stringify([
      {
        id: 'setup-database',
        title: 'Set up database schema',
        specialist: 'Python Backend',
        dependencies: [],
        requiredInputs: [],
        providedOutputs: ['database_schema', 'connection_config'],
        integrationContracts: { definesSchema: 'main_database' },
        validationCriteria: ['Tables created', 'Migrations run', 'Indexes added'],
        estimatedDuration: 30
      },
      {
        id: 'create-api',
        title: 'Create REST API endpoints',
        specialist: 'Python Backend',
        dependencies: ['setup-database'],
        requiredInputs: ['database_schema'],
        providedOutputs: ['api_endpoints', 'api_documentation'],
        integrationContracts: { providesAPI: '/api/v1' },
        validationCriteria: ['Endpoints respond', 'Data validation works', 'Authentication required'],
        estimatedDuration: 60
      },
      {
        id: 'build-frontend',
        title: 'Build React frontend',
        specialist: 'React Frontend',
        dependencies: ['create-api'],
        requiredInputs: ['api_endpoints', 'api_documentation'],
        providedOutputs: ['frontend_app', 'user_interface'],
        integrationContracts: { consumesAPI: '/api/v1' },
        validationCriteria: ['UI renders', 'API calls work', 'User flows complete'],
        estimatedDuration: 90
      },
      {
        id: 'test-integration',
        title: 'End-to-end testing',
        specialist: 'QA Testing',
        dependencies: ['build-frontend'],
        requiredInputs: ['frontend_app', 'api_endpoints'],
        providedOutputs: ['test_results', 'quality_report'],
        integrationContracts: {},
        validationCriteria: ['All tests pass', 'Performance acceptable', 'Security verified'],
        estimatedDuration: 45
      }
    ]);
  }

  mockSpecialistSelection(prompt) {
    const taskStr = prompt.toLowerCase();
    
    let selected = 'React Frontend';
    if (taskStr.includes('api') || taskStr.includes('backend') || taskStr.includes('database')) {
      selected = 'Python Backend';
    } else if (taskStr.includes('test')) {
      selected = 'QA Testing';
    } else if (taskStr.includes('review') || taskStr.includes('security')) {
      selected = 'Code Review';
    }
    
    return JSON.stringify({
      selected: selected,
      reasoning: `Selected ${selected} based on task requirements and technical skills needed`,
      alternatives: ['General Developer', 'Senior Engineer'],
      confidence: 0.85
    });
  }

  /**
   * Simple domain inference for mock responses
   */
  inferDomain(request) {
    const req = request.toLowerCase();
    
    if (req.includes('employee') || req.includes('hr') || req.includes('onboard')) return 'Human Resources';
    if (req.includes('finance') || req.includes('expense') || req.includes('budget')) return 'Finance';
    if (req.includes('it') || req.includes('asset') || req.includes('inventory')) return 'IT';
    if (req.includes('customer') || req.includes('crm')) return 'Customer Relations';
    if (req.includes('project') || req.includes('task')) return 'Project Management';
    
    return 'General Business';
  }

  /**
   * Simple string hashing for cache keys
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 LLM cache cleared');
  }

  /**
   * Get interface statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      cacheSize: this.cache.size,
      provider: this.config.provider,
      model: this.config.model
    };
  }
}

module.exports = LLMInterface;