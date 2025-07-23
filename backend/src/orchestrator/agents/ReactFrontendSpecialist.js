const { v4: uuidv4 } = require('uuid');

/**
 * React Frontend Specialist Agent
 * 
 * Specialized in modern React development with comprehensive frontend capabilities
 * Handles React applications, state management, UI frameworks, and modern tooling
 */
class ReactFrontendSpecialist {
  constructor() {
    this.id = 'react_frontend_specialist';
    this.name = 'React Frontend Specialist';
    this.version = '1.0.0';
    this.specialization = 'React Frontend Development';
    
    // Core capabilities with efficiency ratings
    this.capabilities = {
      // Core React Technologies
      'react': { efficiency: 0.97, experience: 'expert' },
      'react_hooks': { efficiency: 0.96, experience: 'expert' },
      'react_router': { efficiency: 0.94, experience: 'expert' },
      'jsx': { efficiency: 0.95, experience: 'expert' },
      'tsx': { efficiency: 0.93, experience: 'expert' },
      
      // State Management
      'redux_toolkit': { efficiency: 0.92, experience: 'expert' },
      'zustand': { efficiency: 0.90, experience: 'advanced' },
      'context_api': { efficiency: 0.91, experience: 'expert' },
      'recoil': { efficiency: 0.85, experience: 'intermediate' },
      
      // Styling & UI
      'tailwind_css': { efficiency: 0.94, experience: 'expert' },
      'styled_components': { efficiency: 0.89, experience: 'advanced' },
      'mui': { efficiency: 0.87, experience: 'advanced' },
      'chakra_ui': { efficiency: 0.86, experience: 'advanced' },
      'css_modules': { efficiency: 0.88, experience: 'advanced' },
      'sass': { efficiency: 0.85, experience: 'advanced' },
      
      // Build Tools & Bundlers
      'vite': { efficiency: 0.93, experience: 'expert' },
      'webpack': { efficiency: 0.87, experience: 'advanced' },
      'create_react_app': { efficiency: 0.90, experience: 'expert' },
      'next_js': { efficiency: 0.91, experience: 'expert' },
      
      // Testing
      'jest': { efficiency: 0.89, experience: 'advanced' },
      'react_testing_library': { efficiency: 0.92, experience: 'expert' },
      'cypress': { efficiency: 0.84, experience: 'intermediate' },
      'storybook': { efficiency: 0.82, experience: 'intermediate' },
      
      // Core Web Technologies
      'typescript': { efficiency: 0.91, experience: 'expert' },
      'javascript': { efficiency: 0.95, experience: 'expert' },
      'html5': { efficiency: 0.93, experience: 'expert' },
      'css3': { efficiency: 0.90, experience: 'expert' },
      'responsive_design': { efficiency: 0.88, experience: 'advanced' },
      
      // Development Tools
      'eslint': { efficiency: 0.86, experience: 'advanced' },
      'prettier': { efficiency: 0.85, experience: 'advanced' },
      'git': { efficiency: 0.83, experience: 'intermediate' },
      
      // Performance & Optimization
      'code_splitting': { efficiency: 0.84, experience: 'intermediate' },
      'lazy_loading': { efficiency: 0.85, experience: 'intermediate' },
      'pwa': { efficiency: 0.80, experience: 'intermediate' },
      'seo': { efficiency: 0.78, experience: 'intermediate' }
    };
    
    this.configuration = {
      maxConcurrentTasks: 3,
      estimatedTaskTime: 15, // minutes
      qualityThreshold: 0.85,
      retryAttempts: 2,
      preferredStackVersions: {
        react: '^18.0.0',
        typescript: '^5.0.0',
        vite: '^5.0.0',
        tailwindcss: '^3.0.0'
      }
    };
    
    this.taskPatterns = [
      // UI Development
      { pattern: /react.*app/i, priority: 'high', estimatedHours: 12 },
      { pattern: /frontend.*component/i, priority: 'high', estimatedHours: 8 },
      { pattern: /user.*interface/i, priority: 'high', estimatedHours: 10 },
      { pattern: /dashboard/i, priority: 'medium', estimatedHours: 15 },
      { pattern: /responsive.*design/i, priority: 'medium', estimatedHours: 6 },
      
      // State Management
      { pattern: /state.*management/i, priority: 'high', estimatedHours: 4 },
      { pattern: /redux/i, priority: 'medium', estimatedHours: 3 },
      { pattern: /context.*api/i, priority: 'medium', estimatedHours: 2 },
      
      // Routing & Navigation
      { pattern: /routing/i, priority: 'medium', estimatedHours: 3 },
      { pattern: /navigation/i, priority: 'medium', estimatedHours: 2 },
      
      // Styling & Theming
      { pattern: /styling/i, priority: 'medium', estimatedHours: 4 },
      { pattern: /theme/i, priority: 'low', estimatedHours: 3 },
      { pattern: /css/i, priority: 'medium', estimatedHours: 2 }
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
   * Generate comprehensive task prompt for React development
   */
  generateTaskPrompt(task, projectContext = {}) {
    const skillMatch = this.calculateSkillMatch(task);
    const detectedTechs = this.detectTechnologies(task);
    
    return `
# React Frontend Development Task

## Task Information
- **Title**: ${task.title}
- **Description**: ${task.description}
- **Priority**: ${task.priority || 'medium'}
- **Skill Match**: ${skillMatch.toFixed(1)}%

## Detected Technologies
${detectedTechs.map(tech => `- ${tech} (Efficiency: ${this.capabilities[tech]?.efficiency || 'N/A'})`).join('\n')}

## Technical Requirements

### Core Stack
- **React**: ^18.0.0 with modern hooks and functional components
- **TypeScript**: Full type safety and modern TS features
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS for utility-first styling

### Development Standards
1. **Component Architecture**:
   - Use functional components with hooks
   - Implement proper component composition
   - Follow atomic design principles
   - Use TypeScript interfaces for props

2. **State Management**:
   - Use Redux Toolkit for complex state
   - Context API for theme/auth state
   - Local state with useState/useReducer
   - Proper state normalization

3. **Performance**:
   - Implement React.memo for expensive components
   - Use useCallback and useMemo appropriately
   - Implement code splitting with React.lazy
   - Optimize bundle size

4. **Accessibility**:
   - Semantic HTML structure
   - ARIA labels and roles
   - Keyboard navigation support
   - Screen reader compatibility

### Code Quality Requirements
- **Testing**: React Testing Library for unit tests
- **Linting**: ESLint with React and TypeScript rules
- **Formatting**: Prettier for consistent code style
- **Type Safety**: Strict TypeScript configuration

### Project Structure
\`\`\`
src/
├── components/
│   ├── ui/          # Reusable UI components
│   ├── forms/       # Form components
│   └── layout/      # Layout components
├── hooks/           # Custom React hooks
├── store/           # Redux store and slices
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── styles/          # Global styles and Tailwind config
└── __tests__/       # Test files
\`\`\`

### Deliverables Checklist
- [ ] Complete React application with TypeScript
- [ ] Responsive design (mobile-first approach)
- [ ] Component library with proper interfaces
- [ ] State management implementation
- [ ] Unit tests with good coverage (>80%)
- [ ] ESLint and Prettier configuration
- [ ] Package.json with all dependencies
- [ ] README.md with setup instructions
- [ ] Build scripts for development and production

### Quality Gates
- All components must be typed with TypeScript
- No console errors or warnings
- Responsive design across all breakpoints
- Proper error handling and loading states
- Optimized for performance (Lighthouse score >90)

### Build Commands
\`\`\`bash
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
npm run test        # Run tests
npm run lint        # Run linting
npm run type-check  # Type checking
\`\`\`

## Implementation Focus
${this.generateImplementationFocus(task, detectedTechs)}

Remember: Follow the "Always Building" principle - create a complete, immediately runnable React application that demonstrates modern best practices and can serve as a production-ready foundation.
`;
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
   * Generate implementation focus based on task requirements
   */
  generateImplementationFocus(task, detectedTechs) {
    const focuses = [];
    
    if (detectedTechs.includes('redux_toolkit')) {
      focuses.push('- Implement Redux Toolkit for complex state management with RTK Query for API calls');
    }
    
    if (detectedTechs.includes('tailwind_css')) {
      focuses.push('- Use Tailwind CSS for responsive, utility-first styling with custom design system');
    }
    
    if (detectedTechs.includes('react_router')) {
      focuses.push('- Implement React Router v6 with protected routes and lazy loading');
    }
    
    if (detectedTechs.includes('next_js')) {
      focuses.push('- Use Next.js App Router with server components and optimized performance');
    }
    
    if (task.title?.toLowerCase().includes('dashboard')) {
      focuses.push('- Create responsive dashboard with data visualization and real-time updates');
    }
    
    if (task.title?.toLowerCase().includes('form')) {
      focuses.push('- Implement forms with validation using react-hook-form and Zod schema validation');
    }
    
    return focuses.length > 0 ? focuses.join('\n') : '- Focus on creating a modern, performant React application with best practices';
  }

  /**
   * Estimate task complexity and time
   */
  estimateTask(task) {
    let baseHours = 8;
    const complexity = this.calculateComplexity(task);
    
    // Adjust based on complexity
    if (complexity === 'simple') baseHours = 4;
    else if (complexity === 'complex') baseHours = 16;
    else if (complexity === 'enterprise') baseHours = 24;
    
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
      'dashboard', 'admin', 'complex', 'advanced', 'enterprise',
      'microservice', 'real-time', 'websocket', 'charts', 'analytics'
    ];
    
    const simpleIndicators = [
      'simple', 'basic', 'minimal', 'prototype', 'mockup'
    ];
    
    const enterpriseIndicators = [
      'enterprise', 'production', 'scalable', 'multi-tenant',
      'advanced analytics', 'complex workflow'
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
      throw new Error(`ReactFrontendSpecialist missing required fields: ${missing.join(', ')}`);
    }
    
    return true;
  }
}

module.exports = ReactFrontendSpecialist; 