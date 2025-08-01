const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const NodeCache = require('node-cache');
const natural = require('natural');
const fs = require('fs').promises;
const path = require('path');

/**
 * Requirements Processor
 * 
 * Processes user prompts into comprehensive Technical Requirements Documents (TRDs)
 * using Goose CLI for AI-powered analysis and template-based fallbacks
 */
class RequirementsProcessor {
  constructor(config, gooseIntegration) {
    this.config = config;
    this.goose = gooseIntegration;
    
    // Initialize caching for performance
    this.cache = new NodeCache({
      stdTTL: config.cache?.ttl || 1800, // 30 minutes
      checkperiod: config.cache?.checkInterval || 300, // 5 minutes
      maxKeys: config.cache?.maxKeys || 1000
    });
    
    // Initialize NLP tools for domain detection
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    
    // Domain keywords for classification
    this.domainKeywords = {
      'web_development': ['website', 'web', 'html', 'css', 'javascript', 'react', 'vue', 'angular', 'frontend', 'backend', 'api', 'server'],
      'mobile_development': ['mobile', 'app', 'ios', 'android', 'react native', 'flutter', 'native', 'smartphone', 'tablet'],
      'data_processing': ['data', 'analytics', 'etl', 'pipeline', 'database', 'warehouse', 'analytics', 'reporting', 'visualization'],
      'ai_ml': ['ai', 'machine learning', 'ml', 'neural', 'model', 'training', 'prediction', 'classification', 'deep learning']
    };
    
    // Load TRD templates
    this.templates = new Map();
    this.loadTemplates();
    
    // Initialize validation schemas
    this.initializeValidationSchemas();
  }

  /**
   * Generate a comprehensive TRD from user prompt
   */
  async generateTRD(userPrompt, context = {}) {
    try {
      console.log('🔍 Starting TRD generation for prompt:', userPrompt.substring(0, 100) + '...');
      
      // Check cache first
      const cacheKey = this.generateCacheKey(userPrompt, context);
      if (this.config.cache?.enableForTRD) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.log('📦 Using cached TRD result');
          return cached;
        }
      }
      
      // Step 1: Detect domain
      const domain = await this.detectDomain(userPrompt);
      console.log(`🎯 Detected domain: ${domain}`);
      
      // Step 2: Get appropriate template
      const template = await this.getTemplate(domain);
      
      // Step 3: Generate TRD using Goose CLI
      let trd;
      try {
        trd = await this.generateTRDWithGoose(userPrompt, template, context, domain);
      } catch (error) {
        console.warn('⚠️ Goose TRD generation failed, using template fallback:', error.message);
        trd = await this.generateFallbackTRD(userPrompt, template, context, domain);
      }
      
      // Step 4: Validate and enrich
      const validatedTRD = await this.validateTRD(trd);
      const enrichedTRD = await this.enrichTRD(validatedTRD, context);
      
      // Step 5: Perform gap analysis
      const gapAnalysis = await this.performGapAnalysis(enrichedTRD);
      
      const result = {
        trd: enrichedTRD,
        gapAnalysis,
        domain,
        confidence: this.calculateConfidence(enrichedTRD, gapAnalysis),
        generationMethod: trd.generationMethod || 'fallback'
      };
      
      // Cache the result
      if (this.config.cache?.enableForTRD) {
        this.cache.set(cacheKey, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ TRD generation failed:', error);
      throw new Error(`Requirements processing failed: ${error.message}`);
    }
  }

  /**
   * Generate TRD using Goose CLI
   */
  async generateTRDWithGoose(userPrompt, template, context, domain) {
    const trdPrompt = this.buildTRDGenerationPrompt(userPrompt, template, context, domain);
    const sessionId = `trd-${Date.now()}`;
    
    try {
      console.log('🤖 Requesting TRD generation from Goose CLI...');
      
      // Create a temporary session for TRD generation
      const gooseResult = await this.goose.executeGooseTask(
        trdPrompt, 
        sessionId, 
        null, // No socket for internal processing
        context.projectPath
      );
      
      const parsedTRD = await this.parseTRDFromGooseOutput(gooseResult, template, domain);
      parsedTRD.generationMethod = 'goose';
      
      return parsedTRD;
      
    } catch (error) {
      console.error('🔧 Goose TRD generation error:', error);
      throw error;
    }
  }

  /**
   * Build prompt for Goose CLI TRD generation
   */
  buildTRDGenerationPrompt(userPrompt, template, context, domain) {
    return `
Create a comprehensive Technical Requirements Document (TRD) for the following project request:

USER REQUEST: "${userPrompt}"

DOMAIN: ${domain}
PROJECT PATH: ${context.projectPath || 'Not specified'}

Please analyze the request and create a detailed TRD with the following structure:

1. PROJECT OVERVIEW
   - Clear summary of what needs to be built
   - Key objectives and success criteria
   - Target users/audience

2. FUNCTIONAL REQUIREMENTS
   - List all major features and capabilities
   - For each requirement, include:
     * Unique ID (req-001, req-002, etc.)
     * Clear description
     * Acceptance criteria (what defines "done")
     * Priority level (Critical/High/Medium/Low)
     * Dependencies on other requirements

3. NON-FUNCTIONAL REQUIREMENTS
   - Performance requirements (response times, throughput)
   - Security requirements (authentication, authorization, data protection)
   - Scalability requirements (concurrent users, data volume)
   - Reliability requirements (uptime, error handling)

4. TECHNICAL CONSTRAINTS
   - Technology stack preferences or requirements
   - Platform constraints (web, mobile, desktop)
   - Integration requirements with existing systems
   - Compliance or regulatory requirements

5. QUALITY GATES
   - Code review requirements
   - Testing requirements (unit, integration, e2e)
   - Security scanning requirements
   - Performance benchmarks

6. RESOURCE REQUIREMENTS
   - Required skills and expertise
   - Estimated timeline
   - Development tools and environments needed

Please provide a comprehensive analysis that captures all aspects of the request. Focus on being specific and actionable rather than generic. Include realistic estimates and identify potential risks or challenges.

Format the response as structured text that can be parsed into a technical document. Be thorough but concise.
`;
  }

  /**
   * Parse TRD from Goose CLI output
   */
  async parseTRDFromGooseOutput(gooseOutput, template, domain) {
    try {
      // Extract the structured content from Goose output
      // Goose output may contain additional metadata, so we need to extract the relevant parts
      
      const trd = {
        id: uuidv4(),
        originalPrompt: gooseOutput.originalTask || '',
        domain: domain,
        functionalRequirements: [],
        nonFunctionalRequirements: {
          performance: {},
          security: {},
          scalability: {},
          reliability: {}
        },
        technicalConstraints: [],
        qualityGates: [],
        resourceRequirements: {},
        riskAssessment: {
          risks: [],
          mitigations: []
        },
        createdAt: new Date(),
        version: 1,
        metadata: {
          generatedBy: 'goose-cli',
          template: template.name || domain,
          confidence: 0.8
        }
      };

      // Parse the output to extract structured information
      const output = gooseOutput.output || gooseOutput.result || gooseOutput.toString();
      
      // Extract functional requirements
      trd.functionalRequirements = this.extractFunctionalRequirements(output);
      
      // Extract non-functional requirements
      trd.nonFunctionalRequirements = this.extractNonFunctionalRequirements(output);
      
      // Extract technical constraints
      trd.technicalConstraints = this.extractTechnicalConstraints(output);
      
      // Extract quality gates
      trd.qualityGates = this.extractQualityGates(output, domain);
      
      // Extract resource requirements
      trd.resourceRequirements = this.extractResourceRequirements(output);
      
      return trd;
      
    } catch (error) {
      console.error('Failed to parse Goose TRD output:', error);
      throw new Error('TRD parsing failed');
    }
  }

  /**
   * Generate fallback TRD when Goose CLI is unavailable
   */
  async generateFallbackTRD(userPrompt, template, context, domain) {
    console.log('🔄 Generating fallback TRD using template-based approach...');
    
    const trd = {
      id: uuidv4(),
      originalPrompt: userPrompt,
      domain: domain,
      functionalRequirements: [],
      nonFunctionalRequirements: {
        performance: { responseTime: '< 3 seconds', throughput: '1000 requests/minute' },
        security: { authentication: 'required', authorization: 'role-based' },
        scalability: { users: '10000 concurrent', dataVolume: '1TB' },
        reliability: { uptime: '99.9%', errorRate: '< 0.1%' }
      },
      technicalConstraints: [],
      qualityGates: [],
      resourceRequirements: {},
      riskAssessment: {
        risks: [],
        mitigations: []
      },
      createdAt: new Date(),
      version: 1,
      metadata: {
        generatedBy: 'template-fallback',
        template: template.name || domain,
        confidence: 0.6
      },
      generationMethod: 'fallback'
    };

    // Use template and keyword analysis to generate basic requirements
    trd.functionalRequirements = this.generateBasicRequirements(userPrompt, domain);
    trd.technicalConstraints = this.generateBasicConstraints(domain);
    trd.qualityGates = this.generateBasicQualityGates(domain);
    trd.resourceRequirements = this.generateBasicResourceRequirements(domain);

    return trd;
  }

  /**
   * Detect domain from user prompt using keyword analysis
   */
  async detectDomain(prompt) {
    const tokens = this.tokenizer.tokenize(prompt.toLowerCase());
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
    
    const domainScores = {};
    
    // Calculate scores for each domain
    for (const [domain, keywords] of Object.entries(this.domainKeywords)) {
      let score = 0;
      
      for (const keyword of keywords) {
        const keywordTokens = this.tokenizer.tokenize(keyword.toLowerCase());
        const stemmedKeywords = keywordTokens.map(token => this.stemmer.stem(token));
        
        // Check for exact matches
        if (prompt.toLowerCase().includes(keyword)) {
          score += 2;
        }
        
        // Check for stemmed matches
        for (const stemmedKeyword of stemmedKeywords) {
          if (stemmedTokens.includes(stemmedKeyword)) {
            score += 1;
          }
        }
      }
      
      domainScores[domain] = score;
    }
    
    // Find the domain with the highest score
    const bestDomain = Object.entries(domainScores)
      .sort(([,a], [,b]) => b - a)[0];
    
    // Return the best domain or default to web development
    return bestDomain[1] > 0 ? bestDomain[0] : 'web_development';
  }

  /**
   * Load TRD templates
   */
  async loadTemplates() {
    try {
      // Create basic templates for each domain
      const webTemplate = {
        name: 'web_development',
        sections: ['frontend', 'backend', 'database', 'deployment'],
        qualityGates: ['code_review', 'testing', 'security_scan'],
        complexity: 0.7
      };
      
      const mobileTemplate = {
        name: 'mobile_development',
        sections: ['platform', 'ui_ux', 'backend_integration', 'deployment'],
        qualityGates: ['ui_testing', 'performance_testing', 'device_testing'],
        complexity: 0.8
      };
      
      const dataTemplate = {
        name: 'data_processing',
        sections: ['data_sources', 'processing_pipeline', 'storage', 'analytics'],
        qualityGates: ['data_validation', 'performance_testing', 'accuracy_testing'],
        complexity: 0.9
      };
      
      const aiTemplate = {
        name: 'ai_ml',
        sections: ['model_architecture', 'training_data', 'evaluation', 'deployment'],
        qualityGates: ['model_validation', 'performance_testing', 'bias_testing'],
        complexity: 1.0
      };
      
      this.templates.set('web_development', webTemplate);
      this.templates.set('mobile_development', mobileTemplate);
      this.templates.set('data_processing', dataTemplate);
      this.templates.set('ai_ml', aiTemplate);
      
      console.log('✅ TRD templates loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load TRD templates:', error);
      // Create minimal fallback template
      this.templates.set('default', {
        name: 'default',
        sections: ['requirements', 'implementation', 'testing'],
        qualityGates: ['code_review', 'testing'],
        complexity: 0.5
      });
    }
  }

  /**
   * Get template for domain
   */
  async getTemplate(domain) {
    return this.templates.get(domain) || this.templates.get('default') || {
      name: 'fallback',
      sections: ['requirements'],
      qualityGates: ['review'],
      complexity: 0.5
    };
  }

  /**
   * Convert TRD to enhanced tasks
   */
  async enrichTasksFromTRD(trd) {
    const tasks = [];
    
    // Convert functional requirements to tasks
    for (const req of trd.functionalRequirements) {
      const task = await this.convertRequirementToTask(req, trd);
      tasks.push(task);
    }
    
    // Add quality gate tasks
    const qualityTasks = await this.generateQualityTasks(trd);
    tasks.push(...qualityTasks);
    
    return tasks;
  }

  /**
   * Convert requirement to detailed task
   */
  async convertRequirementToTask(requirement, trd) {
    return {
      id: uuidv4(),
      trdReference: trd.id,
      functionalRequirementIds: [requirement.id],
      title: requirement.title || requirement.description.substring(0, 50),
      description: requirement.description,
      type: this.determineTaskType(requirement, trd.domain),
      skillRequirements: this.extractSkillRequirements(requirement, trd.domain),
      qualityCriteria: requirement.acceptanceCriteria || [],
      riskFactors: this.assessTaskRisks(requirement),
      estimatedComplexity: this.calculateTaskComplexity(requirement),
      dependencies: requirement.dependencies || [],
      priority: requirement.priority || 'medium',
      createdAt: new Date()
    };
  }

  /**
   * Helper methods for parsing and processing
   */
  
  extractFunctionalRequirements(output) {
    // Parse functional requirements from text output
    const requirements = [];
    const lines = output.split('\n');
    let currentReq = null;
    
    for (const line of lines) {
      if (line.match(/^\d+\.|^req-\d+|^requirement/i)) {
        if (currentReq) {
          requirements.push(currentReq);
        }
        currentReq = {
          id: `req-${requirements.length + 1}`,
          description: line.replace(/^\d+\.|\s*req-\d+\s*:?\s*/i, '').trim(),
          acceptanceCriteria: [],
          priority: 'medium',
          dependencies: []
        };
      } else if (currentReq && line.trim().startsWith('-')) {
        currentReq.acceptanceCriteria.push(line.trim().substring(1).trim());
      }
    }
    
    if (currentReq) {
      requirements.push(currentReq);
    }
    
    return requirements;
  }

  extractNonFunctionalRequirements(output) {
    return {
      performance: this.extractPerformanceRequirements(output),
      security: this.extractSecurityRequirements(output),
      scalability: this.extractScalabilityRequirements(output),
      reliability: this.extractReliabilityRequirements(output)
    };
  }

  extractPerformanceRequirements(output) {
    const perf = {};
    if (output.toLowerCase().includes('response time')) {
      perf.responseTime = '< 3 seconds';
    }
    if (output.toLowerCase().includes('throughput')) {
      perf.throughput = '1000 requests/minute';
    }
    return perf;
  }

  extractSecurityRequirements(output) {
    const security = {};
    if (output.toLowerCase().includes('authentication')) {
      security.authentication = 'required';
    }
    if (output.toLowerCase().includes('authorization')) {
      security.authorization = 'role-based';
    }
    return security;
  }

  extractScalabilityRequirements(output) {
    const scalability = {};
    if (output.toLowerCase().includes('user') || output.toLowerCase().includes('scale')) {
      scalability.users = '10000 concurrent';
    }
    return scalability;
  }

  extractReliabilityRequirements(output) {
    const reliability = {};
    if (output.toLowerCase().includes('uptime') || output.toLowerCase().includes('availability')) {
      reliability.uptime = '99.9%';
    }
    return reliability;
  }

  extractTechnicalConstraints(output) {
    const constraints = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('technology') || 
          line.toLowerCase().includes('platform') ||
          line.toLowerCase().includes('framework')) {
        constraints.push({
          type: 'technology',
          description: line.trim(),
          mandatory: true
        });
      }
    }
    
    return constraints;
  }

  extractQualityGates(output, domain) {
    const template = this.templates.get(domain) || this.templates.get('default');
    return template.qualityGates.map(gate => ({
      name: gate,
      required: true,
      automated: gate.includes('testing') || gate.includes('scan')
    }));
  }

  extractResourceRequirements(output) {
    return {
      estimatedTimeline: '4-6 weeks',
      requiredSkills: this.extractSkillsFromOutput(output),
      teamSize: '3-5 developers',
      tools: ['IDE', 'Version Control', 'Testing Framework']
    };
  }

  extractSkillsFromOutput(output) {
    const skills = [];
    const techKeywords = {
      'React': /react/i,
      'Node.js': /node\.?js/i,
      'Python': /python/i,
      'JavaScript': /javascript|js/i,
      'TypeScript': /typescript|ts/i,
      'HTML/CSS': /html|css/i,
      'Database': /database|sql|mongodb/i
    };
    
    for (const [skill, regex] of Object.entries(techKeywords)) {
      if (regex.test(output)) {
        skills.push(skill);
      }
    }
    
    return skills.length > 0 ? skills : ['General Programming'];
  }

  generateBasicRequirements(prompt, domain) {
    // Generate basic requirements based on prompt analysis
    const requirements = [];
    const promptLower = prompt.toLowerCase();
    
    if (domain === 'web_development') {
      if (promptLower.includes('user') || promptLower.includes('login')) {
        requirements.push({
          id: 'req-001',
          description: 'User authentication system',
          acceptanceCriteria: ['User can login', 'User can logout', 'Password reset functionality'],
          priority: 'high',
          dependencies: []
        });
      }
      
      if (promptLower.includes('api') || promptLower.includes('backend')) {
        requirements.push({
          id: 'req-002',
          description: 'API backend implementation',
          acceptanceCriteria: ['RESTful API endpoints', 'Error handling', 'Data validation'],
          priority: 'high',
          dependencies: []
        });
      }
    }
    
    // Add default requirement if none found
    if (requirements.length === 0) {
      requirements.push({
        id: 'req-001',
        description: 'Core functionality implementation',
        acceptanceCriteria: ['Feature works as described', 'Error handling implemented'],
        priority: 'high',
        dependencies: []
      });
    }
    
    return requirements;
  }

  generateBasicConstraints(domain) {
    const constraints = [];
    
    if (domain === 'web_development') {
      constraints.push({
        type: 'technology',
        description: 'Modern web technologies (HTML5, CSS3, ES6+)',
        mandatory: true
      });
    }
    
    return constraints;
  }

  generateBasicQualityGates(domain) {
    const template = this.templates.get(domain) || this.templates.get('default');
    return template.qualityGates.map(gate => ({
      name: gate,
      required: true,
      automated: gate.includes('testing')
    }));
  }

  generateBasicResourceRequirements(domain) {
    return {
      estimatedTimeline: '2-4 weeks',
      requiredSkills: this.getDomainSkills(domain),
      teamSize: '2-3 developers',
      tools: ['IDE', 'Version Control', 'Testing Framework']
    };
  }

  getDomainSkills(domain) {
    const skillMap = {
      'web_development': ['JavaScript', 'HTML/CSS', 'Node.js', 'React'],
      'mobile_development': ['Swift/Kotlin', 'React Native/Flutter', 'Mobile UI/UX'],
      'data_processing': ['Python', 'SQL', 'Data Analysis', 'ETL'],
      'ai_ml': ['Python', 'Machine Learning', 'Statistics', 'Deep Learning']
    };
    
    return skillMap[domain] || ['General Programming'];
  }

  // Additional helper methods...
  
  determineTaskType(requirement, domain) {
    const desc = requirement.description.toLowerCase();
    
    if (desc.includes('ui') || desc.includes('interface') || desc.includes('frontend')) {
      return 'frontend';
    } else if (desc.includes('api') || desc.includes('backend') || desc.includes('server')) {
      return 'backend';
    } else if (desc.includes('database') || desc.includes('data')) {
      return 'database';
    } else if (desc.includes('test')) {
      return 'testing';
    }
    
    return 'development';
  }

  extractSkillRequirements(requirement, domain) {
    const skills = this.getDomainSkills(domain);
    return {
      primary: skills.slice(0, 2),
      secondary: skills.slice(2),
      complexity: this.calculateTaskComplexity(requirement)
    };
  }

  assessTaskRisks(requirement) {
    const risks = [];
    const desc = requirement.description.toLowerCase();
    
    if (desc.includes('complex') || desc.includes('advanced')) {
      risks.push({ type: 'complexity', level: 'high', description: 'Complex implementation required' });
    }
    
    if (desc.includes('integration') || desc.includes('external')) {
      risks.push({ type: 'integration', level: 'medium', description: 'External integration dependencies' });
    }
    
    return risks;
  }

  calculateTaskComplexity(requirement) {
    let complexity = 3; // Base complexity
    
    const desc = requirement.description.toLowerCase();
    
    if (desc.includes('complex') || desc.includes('advanced')) complexity += 3;
    if (desc.includes('integration')) complexity += 2;
    if (desc.includes('security')) complexity += 2;
    if (desc.includes('performance')) complexity += 1;
    
    return Math.min(10, complexity);
  }

  generateQualityTasks(trd) {
    const qualityTasks = [];
    
    for (const gate of trd.qualityGates) {
      qualityTasks.push({
        id: uuidv4(),
        trdReference: trd.id,
        title: `Quality Gate: ${gate.name}`,
        description: `Execute ${gate.name} quality gate`,
        type: 'quality_gate',
        skillRequirements: {
          primary: ['Quality Assurance'],
          secondary: [],
          complexity: 2
        },
        qualityCriteria: [`${gate.name} passes all checks`],
        riskFactors: [],
        estimatedComplexity: 2,
        dependencies: [],
        priority: 'high',
        createdAt: new Date()
      });
    }
    
    return qualityTasks;
  }

  // Validation and utility methods...
  
  initializeValidationSchemas() {
    this.trdSchema = Joi.object({
      id: Joi.string().required(),
      originalPrompt: Joi.string().required(),
      domain: Joi.string().required(),
      functionalRequirements: Joi.array().items(Joi.object({
        id: Joi.string().required(),
        description: Joi.string().required(),
        acceptanceCriteria: Joi.array().items(Joi.string()),
        priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
        dependencies: Joi.array().items(Joi.string())
      })),
      nonFunctionalRequirements: Joi.object(),
      technicalConstraints: Joi.array(),
      qualityGates: Joi.array(),
      resourceRequirements: Joi.object(),
      riskAssessment: Joi.object(),
      createdAt: Joi.date(),
      version: Joi.number()
    });
  }

  async validateTRD(trd) {
    try {
      const { error, value } = this.trdSchema.validate(trd);
      if (error) {
        console.warn('TRD validation warnings:', error.details);
      }
      return value || trd;
    } catch (error) {
      console.error('TRD validation failed:', error);
      return trd; // Return original if validation fails
    }
  }

  async enrichTRD(trd, context) {
    // Add metadata and computed fields
    trd.metadata = {
      ...trd.metadata,
      totalRequirements: trd.functionalRequirements.length,
      estimatedComplexity: this.calculateTRDComplexity(trd),
      completenessScore: this.calculateCompletenessScore(trd)
    };
    
    return trd;
  }

  async performGapAnalysis(trd) {
    const gaps = [];
    
    // Check for missing sections
    if (trd.functionalRequirements.length === 0) {
      gaps.push({ type: 'missing_requirements', severity: 'high', description: 'No functional requirements defined' });
    }
    
    if (Object.keys(trd.nonFunctionalRequirements.performance || {}).length === 0) {
      gaps.push({ type: 'missing_performance', severity: 'medium', description: 'Performance requirements not specified' });
    }
    
    if (trd.qualityGates.length === 0) {
      gaps.push({ type: 'missing_quality_gates', severity: 'medium', description: 'No quality gates defined' });
    }
    
    return {
      missingRequirements: gaps,
      completenessScore: gaps.length === 0 ? 1.0 : Math.max(0.3, 1.0 - (gaps.length * 0.2)),
      recommendations: this.generateGapRecommendations(gaps)
    };
  }

  generateGapRecommendations(gaps) {
    return gaps.map(gap => {
      switch (gap.type) {
        case 'missing_requirements':
          return 'Consider breaking down the request into specific functional requirements';
        case 'missing_performance':
          return 'Define expected response times and throughput requirements';
        case 'missing_quality_gates':
          return 'Specify testing and quality assurance requirements';
        default:
          return 'Review and enhance the requirement specification';
      }
    });
  }

  calculateConfidence(trd, gapAnalysis) {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence based on completeness
    confidence += gapAnalysis.completenessScore * 0.3;
    
    // Boost confidence based on requirement detail
    if (trd.functionalRequirements.length > 0) {
      const avgCriteriaLength = trd.functionalRequirements.reduce((sum, req) => 
        sum + (req.acceptanceCriteria?.length || 0), 0) / trd.functionalRequirements.length;
      confidence += Math.min(0.2, avgCriteriaLength * 0.05);
    }
    
    // Penalty for generation method
    if (trd.generationMethod === 'fallback') {
      confidence -= 0.2;
    }
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  calculateTRDComplexity(trd) {
    let complexity = 1;
    
    complexity += trd.functionalRequirements.length * 0.1;
    complexity += Object.keys(trd.technicalConstraints).length * 0.05;
    complexity += trd.qualityGates.length * 0.05;
    
    return Math.min(10, complexity);
  }

  calculateCompletenessScore(trd) {
    let score = 0;
    const maxScore = 10;
    
    if (trd.functionalRequirements.length > 0) score += 3;
    if (Object.keys(trd.nonFunctionalRequirements.performance || {}).length > 0) score += 2;
    if (Object.keys(trd.nonFunctionalRequirements.security || {}).length > 0) score += 2;
    if (trd.technicalConstraints.length > 0) score += 1;
    if (trd.qualityGates.length > 0) score += 1;
    if (Object.keys(trd.resourceRequirements).length > 0) score += 1;
    
    return score / maxScore;
  }

  generateCacheKey(prompt, context) {
    return `trd:${Buffer.from(prompt + JSON.stringify(context)).toString('base64').substring(0, 32)}`;
  }
}

module.exports = RequirementsProcessor;