const { v4: uuidv4 } = require('uuid');

/**
 * Python Backend Specialist Agent
 * 
 * Specialized in modern Python backend development with comprehensive API capabilities
 * Handles FastAPI, Django, Flask, async programming, and modern Python tooling
 */
class PythonBackendSpecialist {
  constructor() {
    this.id = 'python_backend_specialist';
    this.name = 'Python Backend Specialist';
    this.version = '1.0.0';
    this.specialization = 'Python Backend Development';
    
    // Core capabilities with efficiency ratings
    this.capabilities = {
      // Core Python Technologies
      'python': { efficiency: 0.96, experience: 'expert' },
      'asyncio': { efficiency: 0.93, experience: 'expert' },
      'typing': { efficiency: 0.92, experience: 'expert' },
      'pydantic': { efficiency: 0.94, experience: 'expert' },
      
      // Web Frameworks
      'fastapi': { efficiency: 0.95, experience: 'expert' },
      'django': { efficiency: 0.91, experience: 'expert' },
      'django_rest_framework': { efficiency: 0.89, experience: 'advanced' },
      'flask': { efficiency: 0.88, experience: 'advanced' },
      'starlette': { efficiency: 0.87, experience: 'advanced' },
      
      // Database & ORM
      'sqlalchemy': { efficiency: 0.93, experience: 'expert' },
      'alembic': { efficiency: 0.88, experience: 'advanced' },
      'django_orm': { efficiency: 0.90, experience: 'expert' },
      'tortoise_orm': { efficiency: 0.84, experience: 'intermediate' },
      'peewee': { efficiency: 0.82, experience: 'intermediate' },
      
      // Databases
      'postgresql': { efficiency: 0.91, experience: 'expert' },
      'mysql': { efficiency: 0.87, experience: 'advanced' },
      'sqlite': { efficiency: 0.89, experience: 'expert' },
      'mongodb': { efficiency: 0.85, experience: 'advanced' },
      'redis': { efficiency: 0.88, experience: 'advanced' },
      
      // API Development
      'rest_api': { efficiency: 0.94, experience: 'expert' },
      'graphql': { efficiency: 0.86, experience: 'advanced' },
      'openapi': { efficiency: 0.92, experience: 'expert' },
      'swagger': { efficiency: 0.90, experience: 'expert' },
      'api_versioning': { efficiency: 0.87, experience: 'advanced' },
      
      // Authentication & Security
      'jwt': { efficiency: 0.91, experience: 'expert' },
      'oauth2': { efficiency: 0.88, experience: 'advanced' },
      'bcrypt': { efficiency: 0.89, experience: 'expert' },
      'passlib': { efficiency: 0.87, experience: 'advanced' },
      'cors': { efficiency: 0.85, experience: 'advanced' },
      
      // Testing
      'pytest': { efficiency: 0.94, experience: 'expert' },
      'pytest_asyncio': { efficiency: 0.92, experience: 'expert' },
      'unittest': { efficiency: 0.88, experience: 'advanced' },
      'factory_boy': { efficiency: 0.85, experience: 'advanced' },
      'httpx': { efficiency: 0.87, experience: 'advanced' },
      
      // Task Queues & Background Jobs
      'celery': { efficiency: 0.89, experience: 'advanced' },
      'rq': { efficiency: 0.86, experience: 'advanced' },
      'dramatiq': { efficiency: 0.83, experience: 'intermediate' },
      'arq': { efficiency: 0.81, experience: 'intermediate' },
      
      // Deployment & DevOps
      'docker': { efficiency: 0.88, experience: 'advanced' },
      'kubernetes': { efficiency: 0.82, experience: 'intermediate' },
      'uvicorn': { efficiency: 0.91, experience: 'expert' },
      'gunicorn': { efficiency: 0.89, experience: 'advanced' },
      'nginx': { efficiency: 0.84, experience: 'intermediate' },
      
      // Development Tools
      'poetry': { efficiency: 0.90, experience: 'expert' },
      'pip': { efficiency: 0.92, experience: 'expert' },
      'black': { efficiency: 0.87, experience: 'advanced' },
      'isort': { efficiency: 0.86, experience: 'advanced' },
      'flake8': { efficiency: 0.85, experience: 'advanced' },
      'mypy': { efficiency: 0.88, experience: 'advanced' },
      
      // Data Processing & Analytics
      'pandas': { efficiency: 0.86, experience: 'advanced' },
      'numpy': { efficiency: 0.84, experience: 'intermediate' },
      'sqlparse': { efficiency: 0.83, experience: 'intermediate' },
      
      // Monitoring & Logging
      'structlog': { efficiency: 0.85, experience: 'advanced' },
      'sentry': { efficiency: 0.82, experience: 'intermediate' },
      'prometheus': { efficiency: 0.80, experience: 'intermediate' }
    };
    
    this.configuration = {
      maxConcurrentTasks: 3,
      estimatedTaskTime: 18, // minutes
      qualityThreshold: 0.88,
      retryAttempts: 2,
      preferredStackVersions: {
        python: '>=3.10',
        fastapi: '^0.104.0',
        sqlalchemy: '^2.0.0',
        pydantic: '^2.0.0',
        pytest: '^7.0.0'
      }
    };
    
    this.taskPatterns = [
      // API Development
      { pattern: /api.*server/i, priority: 'high', estimatedHours: 15 },
      { pattern: /rest.*api/i, priority: 'high', estimatedHours: 12 },
      { pattern: /graphql.*api/i, priority: 'medium', estimatedHours: 18 },
      { pattern: /microservice/i, priority: 'high', estimatedHours: 20 },
      
      // Web Applications
      { pattern: /web.*app/i, priority: 'high', estimatedHours: 16 },
      { pattern: /backend.*service/i, priority: 'high', estimatedHours: 14 },
      { pattern: /django.*app/i, priority: 'medium', estimatedHours: 18 },
      { pattern: /fastapi.*app/i, priority: 'high', estimatedHours: 12 },
      
      // Database & Data
      { pattern: /database.*design/i, priority: 'medium', estimatedHours: 8 },
      { pattern: /data.*processing/i, priority: 'medium', estimatedHours: 10 },
      { pattern: /migration/i, priority: 'medium', estimatedHours: 4 },
      { pattern: /orm.*model/i, priority: 'medium', estimatedHours: 6 },
      
      // Authentication & Security
      { pattern: /auth.*system/i, priority: 'high', estimatedHours: 12 },
      { pattern: /jwt.*auth/i, priority: 'medium', estimatedHours: 6 },
      { pattern: /oauth/i, priority: 'medium', estimatedHours: 8 },
      { pattern: /security/i, priority: 'high', estimatedHours: 10 },
      
      // Background Tasks
      { pattern: /celery.*task/i, priority: 'medium', estimatedHours: 8 },
      { pattern: /background.*job/i, priority: 'medium', estimatedHours: 6 },
      { pattern: /queue.*system/i, priority: 'medium', estimatedHours: 10 }
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
        totalScore += 0.8; // Bonus for pattern match
        maxScore += 1;
      }
    });
    
    // Technology detection in description
    const techKeywords = Object.keys(this.capabilities);
    techKeywords.forEach(tech => {
      if (taskDescription.includes(tech.replace('_', ' ')) || taskTitle.includes(tech.replace('_', ' '))) {
        const capability = this.capabilities[tech];
        totalScore += capability.efficiency * 0.5; // Partial score for keyword match
        maxScore += 0.5;
      }
    });
    
    return maxScore > 0 ? Math.min((totalScore / maxScore) * 100, 100) : 0;
  }

  /**
   * Generate comprehensive task prompt for Python backend development
   */
  generateTaskPrompt(task, projectContext = {}) {
    const skillMatch = this.calculateSkillMatch(task);
    const detectedTechs = this.detectTechnologies(task);
    const framework = this.selectOptimalFramework(task, detectedTechs);
    
    return `
# Python Backend Development Task

## Task Information
- **Title**: ${task.title}
- **Description**: ${task.description}
- **Priority**: ${task.priority || 'medium'}
- **Skill Match**: ${skillMatch.toFixed(1)}%
- **Recommended Framework**: ${framework}

## Detected Technologies
${detectedTechs.map(tech => `- ${tech} (Efficiency: ${this.capabilities[tech]?.efficiency || 'N/A'})`).join('\n')}

## Technical Requirements

### Core Stack
- **Python**: ${this.configuration.preferredStackVersions.python} with modern async/await
- **Framework**: ${framework} for high-performance API development
- **Database**: PostgreSQL with SQLAlchemy 2.0+ async support
- **Validation**: Pydantic v2 for data validation and serialization
- **Testing**: pytest with async support and comprehensive coverage

### Development Standards
1. **Architecture Patterns**:
   - Clean Architecture with dependency injection
   - Repository pattern for data access
   - Service layer for business logic
   - Domain-driven design principles

2. **Code Quality**:
   - Type hints throughout (mypy compliance)
   - Pydantic models for data validation
   - Async/await for I/O operations
   - Comprehensive error handling

3. **API Design**:
   - RESTful API design principles
   - OpenAPI/Swagger documentation
   - API versioning strategy
   - Proper HTTP status codes
   - Request/response validation

4. **Security**:
   - JWT-based authentication
   - Password hashing with bcrypt
   - Input validation and sanitization
   - CORS configuration
   - Rate limiting

### Project Structure
\`\`\`
${this.generateProjectStructure(framework)}
\`\`\`

### Dependencies & Requirements
\`\`\`python
# Core Framework
${framework}>=0.104.0
uvicorn[standard]>=0.24.0

# Database & ORM
sqlalchemy>=2.0.0
alembic>=1.12.0
asyncpg>=0.29.0  # PostgreSQL async driver

# Data Validation
pydantic>=2.0.0
pydantic-settings>=2.0.0

# Authentication & Security
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6

# Testing
pytest>=7.4.0
pytest-asyncio>=0.21.0
httpx>=0.25.0
factory-boy>=3.3.0

# Development Tools
black>=23.0.0
isort>=5.12.0
flake8>=6.0.0
mypy>=1.5.0

# Monitoring & Logging
structlog>=23.0.0
python-json-logger>=2.0.0
\`\`\`

### Quality Requirements
1. **Code Coverage**: Minimum 85% test coverage
2. **Type Safety**: Full mypy compliance with strict mode
3. **Performance**: Response times <200ms for simple endpoints
4. **Security**: No security vulnerabilities (bandit scan)
5. **Documentation**: Complete OpenAPI documentation

### Build & Development Scripts
\`\`\`bash
# Development
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Testing
pytest --cov=app --cov-report=html
mypy app/
black --check app/
isort --check-only app/
flake8 app/

# Database
alembic upgrade head
alembic revision --autogenerate -m "description"

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
\`\`\`

### Implementation Checklist
- [ ] Project structure with clean architecture
- [ ] Database models with proper relationships
- [ ] API endpoints with validation and documentation
- [ ] Authentication and authorization system
- [ ] Comprehensive test suite (unit + integration)
- [ ] Database migrations with Alembic
- [ ] Environment configuration
- [ ] Error handling and logging
- [ ] API documentation with examples
- [ ] Docker configuration for deployment

### ${framework} Specific Implementation
${this.generateFrameworkSpecificGuidance(framework, task)}

## Performance & Scalability
- Use async/await for all I/O operations
- Implement connection pooling for database
- Add caching layer with Redis for frequently accessed data
- Use background tasks for heavy operations
- Implement proper database indexing
- Add monitoring and health check endpoints

## Security Best Practices
- Validate all inputs with Pydantic models
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Add rate limiting to prevent abuse
- Use HTTPS in production
- Store secrets in environment variables

Remember: Follow the "Always Building" principle - create a complete, production-ready Python backend that can be immediately deployed and includes all necessary components for a robust API service.
`;
  }

  /**
   * Select optimal framework based on task requirements
   */
  selectOptimalFramework(task, detectedTechs) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    // Explicit framework mentions
    if (detectedTechs.includes('fastapi') || text.includes('fastapi')) {
      return 'FastAPI';
    }
    if (detectedTechs.includes('django') || text.includes('django')) {
      return 'Django';
    }
    if (detectedTechs.includes('flask') || text.includes('flask')) {
      return 'Flask';
    }
    
    // Performance-focused indicators
    if (text.includes('high performance') || text.includes('async') || text.includes('real-time')) {
      return 'FastAPI';
    }
    
    // Complex application indicators
    if (text.includes('admin') || text.includes('cms') || text.includes('full application')) {
      return 'Django';
    }
    
    // Simple/microservice indicators
    if (text.includes('microservice') || text.includes('simple') || text.includes('lightweight')) {
      return 'FastAPI';
    }
    
    // Default to FastAPI for modern development
    return 'FastAPI';
  }

  /**
   * Generate project structure based on framework
   */
  generateProjectStructure(framework) {
    if (framework === 'FastAPI') {
      return `app/
├── main.py              # FastAPI application entry point
├── core/
│   ├── config.py        # Application configuration
│   ├── security.py      # Authentication & security
│   └── database.py      # Database connection
├── api/
│   ├── deps.py          # API dependencies
│   ├── v1/
│   │   ├── endpoints/   # API route handlers
│   │   └── __init__.py
│   └── __init__.py
├── models/
│   ├── base.py          # Base SQLAlchemy models
│   ├── user.py          # User models
│   └── __init__.py
├── schemas/
│   ├── user.py          # Pydantic schemas
│   └── __init__.py
├── services/
│   ├── user_service.py  # Business logic
│   └── __init__.py
├── repositories/
│   ├── user_repo.py     # Data access layer
│   └── __init__.py
├── tests/
│   ├── conftest.py      # Test configuration
│   ├── test_api/        # API tests
│   └── test_services/   # Service tests
├── alembic/             # Database migrations
├── requirements.txt     # Dependencies
├── .env.example         # Environment template
├── Dockerfile           # Docker configuration
└── README.md            # Documentation`;
    }
    
    if (framework === 'Django') {
      return `project_name/
├── manage.py
├── requirements.txt
├── .env.example
├── project_name/
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── users/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── tests.py
│   └── core/
│       ├── permissions.py
│       ├── pagination.py
│       └── exceptions.py
├── tests/
├── static/
├── media/
├── locale/
└── README.md`;
    }
    
    // Default Flask structure
    return `app/
├── __init__.py          # Flask application factory
├── main.py              # Application entry point
├── config.py            # Configuration
├── models/
│   ├── user.py          # SQLAlchemy models
│   └── __init__.py
├── api/
│   ├── auth.py          # Authentication routes
│   ├── users.py         # User routes
│   └── __init__.py
├── services/
│   └── user_service.py  # Business logic
├── schemas/
│   └── user.py          # Marshmallow schemas
├── tests/
├── requirements.txt
├── .env.example
└── README.md`;
  }

  /**
   * Generate framework-specific implementation guidance
   */
  generateFrameworkSpecificGuidance(framework, task) {
    if (framework === 'FastAPI') {
      return `
### FastAPI Implementation Details

1. **Application Setup**:
   \`\`\`python
   from fastapi import FastAPI, Depends
   from fastapi.middleware.cors import CORSMiddleware
   
   app = FastAPI(
       title="API Service",
       description="Production-ready API with FastAPI",
       version="1.0.0",
       docs_url="/docs",
       redoc_url="/redoc"
   )
   \`\`\`

2. **Dependency Injection**:
   - Use FastAPI's dependency system for database sessions
   - Implement authentication dependencies
   - Create reusable dependency functions

3. **Async Database Operations**:
   - Use async SQLAlchemy sessions
   - Implement async repository pattern
   - Handle database connections properly

4. **API Documentation**:
   - Automatic OpenAPI schema generation
   - Rich documentation with examples
   - Response models for all endpoints`;
    }
    
    if (framework === 'Django') {
      return `
### Django Implementation Details

1. **Django REST Framework**:
   - Use DRF for API development
   - Implement proper serializers
   - Use ViewSets and routers
   - Add proper permissions and authentication

2. **Database Optimization**:
   - Use select_related and prefetch_related
   - Implement proper database indexing
   - Use database migrations effectively

3. **Testing**:
   - Use Django's test framework
   - Implement factory classes for test data
   - Add API client tests`;
    }
    
    return `
### Flask Implementation Details

1. **Application Factory Pattern**:
   - Use Flask application factory
   - Implement proper configuration management
   - Use Flask extensions effectively

2. **Database Integration**:
   - Use Flask-SQLAlchemy
   - Implement migrations with Flask-Migrate
   - Use proper session management`;
  }

  /**
   * Detect technologies mentioned in task
   */
  detectTechnologies(task) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    const detected = [];
    
    Object.keys(this.capabilities).forEach(tech => {
      const searchTerm = tech.replace('_', ' ');
      if (text.includes(searchTerm) || text.includes(tech)) {
        detected.push(tech);
      }
    });
    
    return detected;
  }

  /**
   * Estimate task complexity and time
   */
  estimateTask(task) {
    let baseHours = 12;
    const complexity = this.calculateComplexity(task);
    
    // Adjust based on complexity
    if (complexity === 'simple') baseHours = 6;
    else if (complexity === 'complex') baseHours = 20;
    else if (complexity === 'enterprise') baseHours = 30;
    
    // Pattern-based adjustments
    this.taskPatterns.forEach(pattern => {
      if (pattern.pattern.test(task.description) || pattern.pattern.test(task.title)) {
        baseHours = Math.max(baseHours, pattern.estimatedHours);
      }
    });
    
    return {
      estimatedHours: baseHours,
      complexity: complexity,
      confidence: this.calculateSkillMatch(task) / 100
    };
  }

  /**
   * Calculate task complexity
   */
  calculateComplexity(task) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    const complexIndicators = [
      'microservice', 'distributed', 'scalable', 'enterprise',
      'real-time', 'websocket', 'async', 'celery', 'queue'
    ];
    
    const simpleIndicators = [
      'simple', 'basic', 'minimal', 'prototype', 'crud'
    ];
    
    const enterpriseIndicators = [
      'enterprise', 'production', 'high-performance',
      'multi-tenant', 'distributed system'
    ];
    
    if (enterpriseIndicators.some(indicator => text.includes(indicator))) {
      return 'enterprise';
    }
    
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
      throw new Error(`PythonBackendSpecialist missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = PythonBackendSpecialist; 