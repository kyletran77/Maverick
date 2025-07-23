const { v4: uuidv4 } = require('uuid');

/**
 * Code Review Specialist Agent
 * 
 * Specialized in comprehensive code review, security analysis, and quality assessment
 * Handles code quality, security vulnerabilities, performance issues, and best practices
 */
class CodeReviewSpecialist {
  constructor() {
    this.id = 'code_review_specialist';
    this.name = 'Code Review Specialist';
    this.version = '1.0.0';
    this.specialization = 'Code Review & Quality Assurance';
    
    // Core capabilities with efficiency ratings
    this.capabilities = {
      // Code Quality Analysis
      'code_quality': { efficiency: 0.95, experience: 'expert' },
      'static_analysis': { efficiency: 0.93, experience: 'expert' },
      'architecture_review': { efficiency: 0.91, experience: 'expert' },
      'design_patterns': { efficiency: 0.89, experience: 'advanced' },
      'best_practices': { efficiency: 0.94, experience: 'expert' },
      
      // Security Analysis
      'security_review': { efficiency: 0.92, experience: 'expert' },
      'vulnerability_assessment': { efficiency: 0.90, experience: 'expert' },
      'owasp_compliance': { efficiency: 0.88, experience: 'advanced' },
      'penetration_testing': { efficiency: 0.85, experience: 'advanced' },
      'security_patterns': { efficiency: 0.87, experience: 'advanced' },
      
      // Performance Review
      'performance_analysis': { efficiency: 0.88, experience: 'advanced' },
      'memory_optimization': { efficiency: 0.86, experience: 'advanced' },
      'database_optimization': { efficiency: 0.87, experience: 'advanced' },
      'load_testing': { efficiency: 0.84, experience: 'intermediate' },
      'scalability_review': { efficiency: 0.85, experience: 'advanced' },
      
      // Language-Specific Reviews
      'javascript_review': { efficiency: 0.94, experience: 'expert' },
      'typescript_review': { efficiency: 0.92, experience: 'expert' },
      'python_review': { efficiency: 0.93, experience: 'expert' },
      'react_review': { efficiency: 0.91, experience: 'expert' },
      'node_review': { efficiency: 0.90, experience: 'expert' },
      'sql_review': { efficiency: 0.88, experience: 'advanced' },
      
      // Testing & Coverage
      'test_coverage': { efficiency: 0.92, experience: 'expert' },
      'test_quality': { efficiency: 0.90, experience: 'expert' },
      'unit_test_review': { efficiency: 0.91, experience: 'expert' },
      'integration_test_review': { efficiency: 0.89, experience: 'advanced' },
      'e2e_test_review': { efficiency: 0.87, experience: 'advanced' },
      
      // Documentation Review
      'documentation_review': { efficiency: 0.89, experience: 'advanced' },
      'api_documentation': { efficiency: 0.91, experience: 'expert' },
      'code_comments': { efficiency: 0.88, experience: 'advanced' },
      'readme_review': { efficiency: 0.87, experience: 'advanced' },
      
      // Tools & Automation
      'eslint': { efficiency: 0.90, experience: 'expert' },
      'sonarqube': { efficiency: 0.87, experience: 'advanced' },
      'snyk': { efficiency: 0.85, experience: 'advanced' },
      'bandit': { efficiency: 0.84, experience: 'intermediate' },
      'lighthouse': { efficiency: 0.86, experience: 'advanced' },
      'codecov': { efficiency: 0.85, experience: 'advanced' }
    };
    
    this.configuration = {
      maxConcurrentTasks: 4,
      estimatedTaskTime: 10, // minutes
      qualityThreshold: 0.90,
      retryAttempts: 1,
      reviewCriteria: {
        codeQuality: 0.25,      // 25% weight
        security: 0.30,         // 30% weight
        performance: 0.20,      // 20% weight
        testCoverage: 0.15,     // 15% weight
        documentation: 0.10     // 10% weight
      }
    };
    
    this.reviewChecks = {
      critical: [
        'security_vulnerabilities',
        'sql_injection',
        'xss_prevention',
        'authentication_issues',
        'authorization_flaws',
        'data_validation',
        'input_sanitization'
      ],
      high: [
        'error_handling',
        'memory_leaks',
        'performance_bottlenecks',
        'code_duplication',
        'architectural_violations',
        'test_coverage_low'
      ],
      medium: [
        'naming_conventions',
        'code_complexity',
        'documentation_missing',
        'unused_code',
        'type_safety',
        'best_practice_violations'
      ],
      low: [
        'code_formatting',
        'comment_quality',
        'variable_naming',
        'function_length',
        'file_organization'
      ]
    };
    
    this.taskPatterns = [
      // Code Review Tasks
      { pattern: /code.*review/i, priority: 'high', estimatedHours: 3 },
      { pattern: /security.*review/i, priority: 'critical', estimatedHours: 4 },
      { pattern: /quality.*assessment/i, priority: 'high', estimatedHours: 2 },
      { pattern: /performance.*review/i, priority: 'medium', estimatedHours: 3 },
      
      // Post-Development Reviews
      { pattern: /pull.*request/i, priority: 'high', estimatedHours: 1 },
      { pattern: /merge.*review/i, priority: 'high', estimatedHours: 1 },
      { pattern: /release.*review/i, priority: 'critical', estimatedHours: 5 },
      
      // Audit Tasks
      { pattern: /security.*audit/i, priority: 'critical', estimatedHours: 6 },
      { pattern: /compliance.*check/i, priority: 'high', estimatedHours: 4 },
      { pattern: /vulnerability.*scan/i, priority: 'critical', estimatedHours: 3 }
    ];
  }

  /**
   * Calculate skill match for a given task
   */
  calculateSkillMatch(task) {
    const taskSkills = task.skills || [];
    const taskDescription = (task.description || '').toLowerCase();
    const taskTitle = (task.title || '').toLowerCase();
    
    let totalScore = 0;
    let maxScore = 0;
    
    // Direct skill matching
    taskSkills.forEach(skill => {
      const capability = this.capabilities[skill.toLowerCase()];
      if (capability) {
        totalScore += capability.efficiency;
        maxScore += 1;
      }
    });
    
    // Pattern matching for additional context
    this.taskPatterns.forEach(pattern => {
      if (pattern.pattern.test(taskDescription) || pattern.pattern.test(taskTitle)) {
        totalScore += 0.9; // High bonus for review tasks
        maxScore += 1;
      }
    });
    
    // Review keyword detection
    const reviewKeywords = ['review', 'audit', 'security', 'quality', 'vulnerability', 'compliance'];
    reviewKeywords.forEach(keyword => {
      if (taskDescription.includes(keyword) || taskTitle.includes(keyword)) {
        totalScore += 0.8;
        maxScore += 0.8;
      }
    });
    
    return maxScore > 0 ? Math.min((totalScore / maxScore) * 100, 100) : 0;
  }

  /**
   * Generate comprehensive code review prompt
   */
  generateTaskPrompt(task, projectContext = {}) {
    const skillMatch = this.calculateSkillMatch(task);
    const reviewType = this.determineReviewType(task);
    const priority = this.determinePriority(task);
    
    return `
# Code Review & Quality Assessment Task

## Review Information
- **Title**: ${task.title}
- **Description**: ${task.description}
- **Review Type**: ${reviewType}
- **Priority**: ${priority}
- **Skill Match**: ${skillMatch.toFixed(1)}%

## Review Scope & Objectives

### Primary Focus Areas
${this.generateReviewFocus(task, reviewType)}

### Review Criteria Weights
- **Security**: ${(this.configuration.reviewCriteria.security * 100).toFixed(0)}% (Critical Priority)
- **Code Quality**: ${(this.configuration.reviewCriteria.codeQuality * 100).toFixed(0)}%
- **Performance**: ${(this.configuration.reviewCriteria.performance * 100).toFixed(0)}%
- **Test Coverage**: ${(this.configuration.reviewCriteria.testCoverage * 100).toFixed(0)}%
- **Documentation**: ${(this.configuration.reviewCriteria.documentation * 100).toFixed(0)}%

## Security Review Checklist

### Critical Security Issues
${this.reviewChecks.critical.map(check => `- [ ] ${this.formatCheckDescription(check)}`).join('\n')}

### High Priority Security Issues
${this.reviewChecks.high.slice(0, 4).map(check => `- [ ] ${this.formatCheckDescription(check)}`).join('\n')}

### Authentication & Authorization
- [ ] Verify proper authentication mechanisms
- [ ] Check for authorization bypass vulnerabilities
- [ ] Validate session management security
- [ ] Review JWT implementation if applicable
- [ ] Check for privilege escalation issues

### Data Security
- [ ] Validate input sanitization and validation
- [ ] Check for SQL injection vulnerabilities
- [ ] Verify XSS prevention measures
- [ ] Review data encryption at rest and in transit
- [ ] Check for sensitive data exposure

## Code Quality Assessment

### Architecture & Design
- [ ] Evaluate overall architecture patterns
- [ ] Check for proper separation of concerns
- [ ] Verify dependency injection usage
- [ ] Review design pattern implementation
- [ ] Assess code organization and structure

### Code Standards & Best Practices
- [ ] Verify naming conventions compliance
- [ ] Check for code duplication (DRY principle)
- [ ] Evaluate function and class complexity
- [ ] Review error handling strategies
- [ ] Assess logging and monitoring implementation

### Type Safety & Validation
- [ ] Check TypeScript usage and strictness
- [ ] Verify input validation completeness
- [ ] Review data type consistency
- [ ] Check for null/undefined handling
- [ ] Validate API contract adherence

## Performance Review

### Performance Bottlenecks
- [ ] Identify expensive operations
- [ ] Review database query efficiency
- [ ] Check for N+1 query problems
- [ ] Evaluate caching strategies
- [ ] Assess memory usage patterns

### Scalability Considerations
- [ ] Review horizontal scaling readiness
- [ ] Check for stateless design
- [ ] Evaluate resource utilization
- [ ] Review concurrency handling
- [ ] Assess load balancing compatibility

## Testing & Coverage Analysis

### Test Quality Assessment
- [ ] Evaluate test coverage percentage (target: >85%)
- [ ] Review test case comprehensiveness
- [ ] Check for edge case coverage
- [ ] Assess test maintainability
- [ ] Verify integration test completeness

### Test Implementation
- [ ] Review unit test quality and structure
- [ ] Check integration test scenarios
- [ ] Evaluate E2E test coverage
- [ ] Assess mock and stub usage
- [ ] Review test data management

## Documentation Review

### Code Documentation
- [ ] Check inline comment quality and relevance
- [ ] Review function/method documentation
- [ ] Verify API documentation completeness
- [ ] Assess README clarity and accuracy
- [ ] Check for architectural documentation

### Development Documentation
- [ ] Verify setup and installation instructions
- [ ] Check deployment documentation
- [ ] Review troubleshooting guides
- [ ] Assess contribution guidelines
- [ ] Verify environment configuration docs

## Review Tools & Automation

### Static Analysis Tools
\`\`\`bash
# Code Quality
npm run lint                    # ESLint for JavaScript/TypeScript
npm run type-check             # TypeScript compiler
npm run format-check           # Prettier formatting

# Security Scanning
npm audit                      # NPM vulnerability scan
snyk test                      # Snyk security scan
bandit -r . -f json           # Python security scan (if applicable)

# Performance Analysis
npm run lighthouse             # Lighthouse performance audit
npm run bundle-analyzer        # Bundle size analysis
\`\`\`

### Quality Metrics
- **Code Complexity**: Cyclomatic complexity < 10
- **Test Coverage**: Minimum 85% line coverage
- **Security Score**: No critical/high vulnerabilities
- **Performance**: Lighthouse score > 90
- **Maintainability**: SonarQube maintainability rating A

## Review Deliverables

### Review Report Structure
1. **Executive Summary**
   - Overall assessment rating (1-10)
   - Critical issues count
   - Recommendations priority list

2. **Detailed Findings**
   - Security vulnerabilities with severity
   - Code quality issues with impact
   - Performance bottlenecks with solutions
   - Missing test coverage areas

3. **Recommendations**
   - Immediate action items (critical/high)
   - Medium-term improvements
   - Long-term architectural considerations
   - Best practice adoption suggestions

4. **Compliance Assessment**
   - Security standards compliance
   - Industry best practices adherence
   - Internal coding standards compliance

### Review Rating Scale
- **10**: Exceptional - Production ready, exemplary code
- **8-9**: Excellent - Minor improvements needed
- **6-7**: Good - Some issues to address before production
- **4-5**: Fair - Significant improvements required
- **1-3**: Poor - Major rework needed

## Action Items Template

### Critical (Fix Immediately)
- [ ] [Issue Description] - [Location] - [Recommended Fix]

### High Priority (Fix Before Release)
- [ ] [Issue Description] - [Location] - [Recommended Fix]

### Medium Priority (Address in Next Sprint)
- [ ] [Issue Description] - [Location] - [Recommended Fix]

### Low Priority (Technical Debt)
- [ ] [Issue Description] - [Location] - [Recommended Fix]

Remember: The goal is to ensure code quality, security, and maintainability while providing constructive feedback that helps developers improve their skills and the overall codebase quality.
`;
  }

  /**
   * Determine the type of review based on task description
   */
  determineReviewType(task) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    if (text.includes('security') || text.includes('vulnerability')) {
      return 'Security-Focused Review';
    }
    if (text.includes('performance') || text.includes('optimization')) {
      return 'Performance Review';
    }
    if (text.includes('pull request') || text.includes('merge')) {
      return 'Pull Request Review';
    }
    if (text.includes('release') || text.includes('production')) {
      return 'Pre-Release Review';
    }
    if (text.includes('architecture') || text.includes('design')) {
      return 'Architecture Review';
    }
    
    return 'Comprehensive Code Review';
  }

  /**
   * Determine review priority based on context
   */
  determinePriority(task) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    if (text.includes('critical') || text.includes('security') || text.includes('production')) {
      return 'Critical';
    }
    if (text.includes('urgent') || text.includes('release') || text.includes('hotfix')) {
      return 'High';
    }
    if (text.includes('feature') || text.includes('enhancement')) {
      return 'Medium';
    }
    
    return 'Normal';
  }

  /**
   * Generate specific review focus based on task type
   */
  generateReviewFocus(task, reviewType) {
    const focuses = [];
    
    if (reviewType.includes('Security')) {
      focuses.push('- **Security Vulnerabilities**: OWASP Top 10, injection attacks, authentication flaws');
      focuses.push('- **Data Protection**: Input validation, output encoding, secure data handling');
      focuses.push('- **Access Control**: Authorization mechanisms, privilege escalation prevention');
    }
    
    if (reviewType.includes('Performance')) {
      focuses.push('- **Performance Bottlenecks**: Database queries, API response times, memory usage');
      focuses.push('- **Scalability**: Load handling, resource optimization, caching strategies');
      focuses.push('- **Monitoring**: Performance metrics, alerting, health checks');
    }
    
    if (reviewType.includes('Architecture')) {
      focuses.push('- **Design Patterns**: Proper pattern implementation, architectural consistency');
      focuses.push('- **Code Organization**: Module structure, dependency management, separation of concerns');
      focuses.push('- **Maintainability**: Code readability, documentation, extensibility');
    }
    
    if (focuses.length === 0) {
      focuses.push('- **Code Quality**: Standards compliance, best practices, maintainability');
      focuses.push('- **Security**: Vulnerability assessment, secure coding practices');
      focuses.push('- **Testing**: Coverage analysis, test quality, edge case handling');
      focuses.push('- **Documentation**: Code comments, API docs, setup instructions');
    }
    
    return focuses.join('\n');
  }

  /**
   * Format check descriptions for better readability
   */
  formatCheckDescription(check) {
    return check
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Estimate review complexity and time
   */
  estimateTask(task) {
    let baseHours = 2;
    const complexity = this.calculateComplexity(task);
    const reviewType = this.determineReviewType(task);
    
    // Adjust based on review type
    if (reviewType.includes('Security')) baseHours = 4;
    else if (reviewType.includes('Architecture')) baseHours = 5;
    else if (reviewType.includes('Performance')) baseHours = 3;
    else if (reviewType.includes('Pull Request')) baseHours = 1;
    
    // Adjust based on complexity
    if (complexity === 'simple') baseHours *= 0.5;
    else if (complexity === 'complex') baseHours *= 1.5;
    else if (complexity === 'enterprise') baseHours *= 2;
    
    return {
      estimatedHours: Math.ceil(baseHours),
      complexity: complexity,
      reviewType: reviewType,
      confidence: this.calculateSkillMatch(task) / 100
    };
  }

  /**
   * Calculate task complexity for reviews
   */
  calculateComplexity(task) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    const complexIndicators = [
      'enterprise', 'microservice', 'distributed', 'architecture',
      'security audit', 'compliance', 'production'
    ];
    
    const simpleIndicators = [
      'pull request', 'simple', 'basic', 'minor', 'formatting'
    ];
    
    if (complexIndicators.some(indicator => text.includes(indicator))) {
      return 'complex';
    }
    
    if (simpleIndicators.some(indicator => text.includes(indicator))) {
      return 'simple';
    }
    
    return 'medium';
  }

  /**
   * Get agent metadata
   */
  getMetadata() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      specialization: this.specialization,
      capabilities: Object.keys(this.capabilities),
      configuration: this.configuration,
      reviewChecks: this.reviewChecks,
      supportedPatterns: this.taskPatterns.map(p => p.pattern.source)
    };
  }

  /**
   * Validate agent configuration
   */
  validate() {
    const required = ['id', 'name', 'specialization', 'capabilities'];
    const missing = required.filter(field => !this[field]);
    
    if (missing.length > 0) {
      throw new Error(`CodeReviewSpecialist missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = CodeReviewSpecialist; 