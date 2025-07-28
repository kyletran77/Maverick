const { v4: uuidv4 } = require('uuid');

/**
 * QA Testing Specialist Agent
 * 
 * Specialized in comprehensive testing strategies, test automation, and quality assurance
 * Handles React testing, API testing, E2E testing, and test infrastructure
 */
class QATestingSpecialist {
  constructor() {
    this.id = 'qa_testing_specialist';
    this.name = 'QA Testing Specialist';
    this.version = '1.0.0';
    this.specialization = 'Quality Assurance & Test Automation';
    
    // Core capabilities with efficiency ratings
    this.capabilities = {
      // Frontend Testing
      'react_testing': { efficiency: 0.95, experience: 'expert' },
      'react_testing_library': { efficiency: 0.94, experience: 'expert' },
      'jest': { efficiency: 0.93, experience: 'expert' },
      'cypress': { efficiency: 0.91, experience: 'expert' },
      'playwright': { efficiency: 0.89, experience: 'advanced' },
      'selenium': { efficiency: 0.86, experience: 'advanced' },
      
      // Unit Testing
      'unit_testing': { efficiency: 0.94, experience: 'expert' },
      'test_driven_development': { efficiency: 0.91, experience: 'expert' },
      'mocking': { efficiency: 0.90, experience: 'expert' },
      'test_fixtures': { efficiency: 0.88, experience: 'advanced' },
      'snapshot_testing': { efficiency: 0.87, experience: 'advanced' },
      
      // Integration Testing
      'integration_testing': { efficiency: 0.92, experience: 'expert' },
      'api_testing': { efficiency: 0.93, experience: 'expert' },
      'database_testing': { efficiency: 0.88, experience: 'advanced' },
      'contract_testing': { efficiency: 0.85, experience: 'advanced' },
      'pact_testing': { efficiency: 0.83, experience: 'intermediate' },
      
      // E2E Testing
      'e2e_testing': { efficiency: 0.90, experience: 'expert' },
      'user_journey_testing': { efficiency: 0.89, experience: 'advanced' },
      'cross_browser_testing': { efficiency: 0.87, experience: 'advanced' },
      'mobile_testing': { efficiency: 0.85, experience: 'advanced' },
      'accessibility_testing': { efficiency: 0.86, experience: 'advanced' },
      
      // Performance Testing
      'performance_testing': { efficiency: 0.88, experience: 'advanced' },
      'load_testing': { efficiency: 0.86, experience: 'advanced' },
      'stress_testing': { efficiency: 0.84, experience: 'intermediate' },
      'lighthouse_testing': { efficiency: 0.87, experience: 'advanced' },
      'web_vitals': { efficiency: 0.85, experience: 'advanced' },
      
      // Test Automation
      'test_automation': { efficiency: 0.92, experience: 'expert' },
      'ci_cd_testing': { efficiency: 0.89, experience: 'advanced' },
      'github_actions': { efficiency: 0.87, experience: 'advanced' },
      'test_reporting': { efficiency: 0.88, experience: 'advanced' },
      'parallel_testing': { efficiency: 0.85, experience: 'advanced' },
      
      // Testing Frameworks & Tools
      'vitest': { efficiency: 0.91, experience: 'expert' },
      'testing_library': { efficiency: 0.93, experience: 'expert' },
      'msw': { efficiency: 0.88, experience: 'advanced' }, // Mock Service Worker
      'storybook': { efficiency: 0.86, experience: 'advanced' },
      'chromatic': { efficiency: 0.84, experience: 'intermediate' },
      
      // API Testing Tools
      'postman': { efficiency: 0.89, experience: 'advanced' },
      'insomnia': { efficiency: 0.87, experience: 'advanced' },
      'supertest': { efficiency: 0.90, experience: 'expert' },
      'newman': { efficiency: 0.85, experience: 'advanced' },
      
      // Quality Metrics
      'code_coverage': { efficiency: 0.92, experience: 'expert' },
      'test_coverage': { efficiency: 0.93, experience: 'expert' },
      'quality_gates': { efficiency: 0.89, experience: 'advanced' },
      'test_metrics': { efficiency: 0.87, experience: 'advanced' },
      'defect_tracking': { efficiency: 0.86, experience: 'advanced' }
    };
    
    this.configuration = {
      maxConcurrentTasks: 4,
      estimatedTaskTime: 12, // minutes
      qualityThreshold: 0.90,
      retryAttempts: 2,
      testingStandards: {
        unitTestCoverage: 90,    // 90% minimum unit test coverage
        integrationCoverage: 80, // 80% minimum integration coverage
        e2eCoverage: 70,         // 70% minimum E2E coverage
        performanceScore: 90     // 90+ Lighthouse performance score
      }
    };
    
    this.testingStrategy = {
      pyramid: {
        unit: 0.70,        // 70% unit tests
        integration: 0.20, // 20% integration tests
        e2e: 0.10         // 10% E2E tests
      },
      priorities: {
        critical: ['authentication', 'payment', 'data_integrity'],
        high: ['user_workflows', 'api_endpoints', 'security'],
        medium: ['ui_components', 'validation', 'error_handling'],
        low: ['edge_cases', 'performance', 'accessibility']
      }
    };
    
    this.taskPatterns = [
      // React Testing
      { pattern: /react.*test/i, priority: 'high', estimatedHours: 8 },
      { pattern: /component.*test/i, priority: 'high', estimatedHours: 6 },
      { pattern: /frontend.*test/i, priority: 'high', estimatedHours: 10 },
      
      // API Testing
      { pattern: /api.*test/i, priority: 'high', estimatedHours: 6 },
      { pattern: /backend.*test/i, priority: 'high', estimatedHours: 8 },
      { pattern: /integration.*test/i, priority: 'medium', estimatedHours: 10 },
      
      // E2E Testing
      { pattern: /e2e.*test/i, priority: 'medium', estimatedHours: 12 },
      { pattern: /end.*to.*end/i, priority: 'medium', estimatedHours: 12 },
      { pattern: /user.*journey/i, priority: 'medium', estimatedHours: 8 },
      
      // Performance Testing
      { pattern: /performance.*test/i, priority: 'medium', estimatedHours: 6 },
      { pattern: /load.*test/i, priority: 'medium', estimatedHours: 8 },
      
      // Test Automation
      { pattern: /test.*automation/i, priority: 'high', estimatedHours: 15 },
      { pattern: /ci.*test/i, priority: 'medium', estimatedHours: 4 },
      { pattern: /test.*pipeline/i, priority: 'medium', estimatedHours: 6 }
    ];
  }

  /**
   * Calculate skill match for a given task - RESTRICTIVE MATCHING FOR QA/TESTING TASKS ONLY
   */
  calculateSkillMatch(task) {
    const taskSkills = task.skills || [];
    const taskDescription = (task.description || '').toLowerCase();
    const taskTitle = (task.title || '').toLowerCase();
    
    // CRITICAL: Only match on actual QA/testing tasks, not development tasks
    // Check if this is explicitly a checkpoint/testing task
    if (task.isCheckpoint && (task.checkpointType === 'qa_testing' || task.checkpointType === 'final_qa_testing')) {
      // This is a legitimate QA checkpoint - give high score
      return 95.0;
    }
    
    // Check if task title/type explicitly indicates testing
    const explicitTestingPatterns = [
      /^testing/i,
      /^qa\s+testing/i,
      /^quality\s+assurance/i,
      /^test\s+automation/i,
      /^unit\s+test/i,
      /^integration\s+test/i,
      /^e2e\s+test/i,
      /^end.to.end\s+test/i
    ];
    
    const isExplicitTesting = explicitTestingPatterns.some(pattern => 
      pattern.test(taskTitle) || pattern.test(taskDescription)
    ) || task.type === 'testing';
    
    if (isExplicitTesting) {
      // This is an explicit testing task
      let totalScore = 0;
      let maxScore = 0;
      
      // Direct skill matching for testing-specific skills
      const testingSkills = ['testing', 'unit_testing', 'integration_testing', 'e2e_testing', 'test_automation', 'qa', 'quality_assurance'];
      taskSkills.forEach(skill => {
        const capability = this.capabilities[skill.toLowerCase()];
        if (capability && testingSkills.includes(skill.toLowerCase())) {
          totalScore += capability.efficiency;
          maxScore += 1;
        }
      });
      
      // Pattern matching for testing tasks only
      this.taskPatterns.forEach(pattern => {
        if (pattern.pattern.test(taskDescription) || pattern.pattern.test(taskTitle)) {
          totalScore += 0.9;
          maxScore += 1;
        }
      });
      
      return maxScore > 0 ? Math.min((totalScore / maxScore) * 100, 95) : 90;
    }
    
    // For all other tasks (development tasks), provide very low score
    // QA Testing Specialist should NOT be assigned to development tasks
    
    // Only give minimal score if task has explicit testing-related skills
    const explicitTestingSkills = ['testing', 'unit_testing', 'integration_testing', 'e2e_testing', 'test_automation', 'qa'];
    const hasTestingSkills = taskSkills.some(skill => explicitTestingSkills.includes(skill.toLowerCase()));
    
    if (hasTestingSkills) {
      // Has some testing skills but not a testing task - low score
      return 30.0;
    }
    
    // This is a development task - QA Testing Specialist should not be assigned
    return 0.0;
  }

  /**
   * Generate comprehensive testing strategy prompt
   */
  generateTaskPrompt(task, projectContext = {}) {
    const skillMatch = this.calculateSkillMatch(task);
    const testingType = this.determineTestingType(task);
    const testingScope = this.determineTestingScope(task);
    
    return `
# QA Testing & Automation Task

## Testing Information
- **Title**: ${task.title}
- **Description**: ${task.description}
- **Testing Type**: ${testingType}
- **Testing Scope**: ${testingScope}
- **Skill Match**: ${skillMatch.toFixed(1)}%

## Testing Strategy & Framework

### Testing Pyramid Approach
- **Unit Tests (70%)**: Fast, isolated, comprehensive component testing
- **Integration Tests (20%)**: API endpoints, database interactions, service integration
- **E2E Tests (10%)**: Critical user journeys, cross-browser validation

### Quality Standards
- **Unit Test Coverage**: ≥${this.configuration.testingStandards.unitTestCoverage}%
- **Integration Coverage**: ≥${this.configuration.testingStandards.integrationCoverage}%
- **E2E Coverage**: ≥${this.configuration.testingStandards.e2eCoverage}%
- **Performance Score**: ≥${this.configuration.testingStandards.performanceScore}

## React Frontend Testing

### Component Testing Setup
\`\`\`javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
\`\`\`

### Testing Library Configuration
\`\`\`javascript
// setupTests.js
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

configure({
  testIdAttribute: 'data-testid',
});

// Mock service worker for API mocking
import { server } from './mocks/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
\`\`\`

### Component Test Examples
\`\`\`javascript
// Component.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import Component from './Component';

describe('Component', () => {
  let queryClient;
  
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderWithProviders = (component) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  test('renders correctly with initial state', () => {
    renderWithProviders(<Component />);
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  test('handles user interactions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Component />);
    
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });
});
\`\`\`

## API Testing Strategy

### Backend API Testing
\`\`\`javascript
// api.test.js
import request from 'supertest';
import app from '../app';
import { setupTestDB, cleanupTestDB } from './helpers/database';

describe('API Endpoints', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('POST /api/users', () => {
    test('creates a new user with valid data', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securePassword123'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(userData.email);
      expect(response.body).not.toHaveProperty('password');
    });

    test('returns 400 for invalid email', async () => {
      const invalidUser = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'securePassword123'
      };

      const response = await request(app)
        .post('/api/users')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
\`\`\`

### Mock Service Worker Setup
\`\`\`javascript
// mocks/handlers.js
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/users', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: 1, name: 'John Doe', email: 'john@example.com' },
      ])
    );
  }),

  rest.post('/api/users', (req, res, ctx) => {
    const { name, email } = req.body;
    return res(
      ctx.status(201),
      ctx.json({ id: Date.now(), name, email })
    );
  }),
];
\`\`\`

## E2E Testing with Cypress/Playwright

### Cypress Configuration
\`\`\`javascript
// cypress.config.js
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
  },
});
\`\`\`

### E2E Test Examples
\`\`\`javascript
// cypress/e2e/user-authentication.cy.js
describe('User Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('allows user to login with valid credentials', () => {
    cy.get('[data-testid="email-input"]').type('user@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();

    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="welcome-message"]').should('be.visible');
  });

  it('shows error for invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('user@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();

    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid credentials');
  });

  it('validates required fields', () => {
    cy.get('[data-testid="login-button"]').click();
    
    cy.get('[data-testid="email-error"]').should('contain', 'Email is required');
    cy.get('[data-testid="password-error"]').should('contain', 'Password is required');
  });
});
\`\`\`

## Performance Testing

### Lighthouse CI Configuration
\`\`\`json
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.9}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['warn', {minScore: 0.9}],
        'categories:seo': ['warn', {minScore: 0.9}],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
\`\`\`

### Performance Testing Script
\`\`\`javascript
// performance.test.js
import { chromium } from 'playwright';

describe('Performance Tests', () => {
  test('page load performance', async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto('http://localhost:3000');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
      };
    });
    
    expect(metrics.domContentLoaded).toBeLessThan(2000); // 2 seconds
    expect(metrics.loadComplete).toBeLessThan(3000); // 3 seconds
    
    await browser.close();
  });
});
\`\`\`

## Test Automation & CI/CD

### GitHub Actions Workflow
\`\`\`yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Build application
        run: npm run build
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
\`\`\`

## Testing Deliverables Checklist

### Test Infrastructure
- [ ] Jest configuration with proper setup
- [ ] React Testing Library setup with custom renders
- [ ] Mock Service Worker for API mocking
- [ ] Cypress/Playwright E2E testing setup
- [ ] CI/CD pipeline with automated testing

### Test Coverage
- [ ] Unit tests for all React components (≥90% coverage)
- [ ] Integration tests for API endpoints (≥80% coverage)
- [ ] E2E tests for critical user journeys (≥70% coverage)
- [ ] Performance tests with Lighthouse CI
- [ ] Accessibility testing integration

### Test Quality
- [ ] Comprehensive test documentation
- [ ] Test data management and fixtures
- [ ] Error scenario and edge case coverage
- [ ] Cross-browser compatibility testing
- [ ] Mobile responsiveness testing

### Reporting & Metrics
- [ ] Coverage reports with threshold enforcement
- [ ] Test results dashboard and notifications
- [ ] Performance benchmarking and monitoring
- [ ] Defect tracking and resolution metrics
- [ ] Test execution time optimization

### Quality Gates
- [ ] All tests must pass before merge
- [ ] Coverage thresholds must be met
- [ ] Performance budgets must be respected
- [ ] Security scans must pass
- [ ] Accessibility standards must be met

## Best Practices & Guidelines

### Testing Principles
1. **Write tests first** (TDD approach when possible)
2. **Test behavior, not implementation**
3. **Use descriptive test names and arrange-act-assert pattern**
4. **Keep tests independent and idempotent**
5. **Mock external dependencies appropriately**

### Component Testing Guidelines
- Test user interactions, not internal state
- Use accessibility queries (getByRole, getByLabelText)
- Test error states and loading states
- Verify proper prop handling and default values
- Test keyboard navigation and accessibility

### API Testing Guidelines
- Test all HTTP methods and status codes
- Validate request/response schemas
- Test authentication and authorization
- Test rate limiting and error handling
- Verify data persistence and consistency

Remember: Quality is not an afterthought - build comprehensive testing into the development process to ensure reliable, maintainable, and user-friendly applications.
`;
  }

  /**
   * Determine the type of testing based on task description
   */
  determineTestingType(task) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    if (text.includes('react') || text.includes('component') || text.includes('frontend')) {
      return 'React Component Testing';
    }
    if (text.includes('api') || text.includes('backend') || text.includes('endpoint')) {
      return 'API Testing';
    }
    if (text.includes('e2e') || text.includes('end-to-end') || text.includes('user journey')) {
      return 'End-to-End Testing';
    }
    if (text.includes('performance') || text.includes('load') || text.includes('stress')) {
      return 'Performance Testing';
    }
    if (text.includes('integration')) {
      return 'Integration Testing';
    }
    if (text.includes('automation') || text.includes('ci') || text.includes('pipeline')) {
      return 'Test Automation';
    }
    
    return 'Comprehensive Testing';
  }

  /**
   * Determine testing scope based on context
   */
  determineTestingScope(task) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    if (text.includes('unit')) {
      return 'Unit Testing Focus';
    }
    if (text.includes('integration')) {
      return 'Integration Testing Focus';
    }
    if (text.includes('system') || text.includes('full')) {
      return 'System Testing Focus';
    }
    if (text.includes('regression')) {
      return 'Regression Testing Focus';
    }
    
    return 'Full Testing Coverage';
  }

  /**
   * Estimate testing complexity and time
   */
  estimateTask(task) {
    let baseHours = 8;
    const complexity = this.calculateComplexity(task);
    const testingType = this.determineTestingType(task);
    
    // Adjust based on testing type
    if (testingType.includes('React')) baseHours = 6;
    else if (testingType.includes('API')) baseHours = 8;
    else if (testingType.includes('E2E')) baseHours = 12;
    else if (testingType.includes('Performance')) baseHours = 6;
    else if (testingType.includes('Automation')) baseHours = 15;
    
    // Adjust based on complexity
    if (complexity === 'simple') baseHours *= 0.6;
    else if (complexity === 'complex') baseHours *= 1.4;
    else if (complexity === 'enterprise') baseHours *= 2;
    
    return {
      estimatedHours: Math.ceil(baseHours),
      complexity: complexity,
      testingType: testingType,
      confidence: this.calculateSkillMatch(task) / 100
    };
  }

  /**
   * Calculate task complexity for testing
   */
  calculateComplexity(task) {
    const text = `${task.title} ${task.description}`.toLowerCase();
    
    const complexIndicators = [
      'enterprise', 'microservice', 'distributed', 'automation',
      'performance', 'load testing', 'comprehensive'
    ];
    
    const simpleIndicators = [
      'unit', 'simple', 'basic', 'component', 'single'
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
      testingStrategy: this.testingStrategy,
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
      throw new Error(`QATestingSpecialist missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = QATestingSpecialist; 