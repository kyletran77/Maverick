# Project Template System

The Goose Multi-Agent System now includes a comprehensive project template system that allows users to quickly generate complete, buildable projects with just a few clicks and configuration options.

## Available Templates

### 1. React Application
- **Modern React app** with TypeScript/JavaScript options
- **Routing** with React Router
- **State Management** options (Redux Toolkit, Zustand, Context API)
- **Styling** frameworks (Tailwind CSS, Material-UI, Styled Components)
- **Features**: Authentication, API Integration, Form Handling, Testing, PWA

### 2. Angular Application
- **Angular CLI** project with TypeScript
- **Routing** with lazy loading
- **UI Frameworks** (Angular Material, PrimeNG, Ng-Bootstrap)
- **Advanced Features**: SSR, PWA, Guards, Services, HTTP Interceptors

### 3. Vue.js Application
- **Vue 3** with Composition API
- **TypeScript** support
- **State Management** with Pinia or Vuex
- **Modern Tooling** with Vite
- **UI Frameworks** (Vuetify, Quasar, Element Plus)

### 4. Full-Stack Application
- **Frontend**: Choose React, Vue, or Angular
- **Backend**: Node.js/Express, FastAPI, Django
- **Database**: PostgreSQL, MongoDB, MySQL, SQLite
- **Features**: Authentication/JWT, WebSockets, File Upload, Docker

### 5. REST API
- **Frameworks**: Express, Fastify, FastAPI, Flask
- **Database Integration** with ORMs (Prisma, TypeORM, Sequelize)
- **Production Features**: Authentication, Rate Limiting, OpenAPI docs
- **Complete Testing Suite**

### 6. Static Website
- **Website Types**: Portfolio, Business Landing, Blog, Documentation
- **Modern HTML/CSS/JS** with framework options
- **Responsive Design** with animations
- **Features**: Contact Forms, SEO, Analytics, Image Galleries

## How to Use Templates

### 1. Select a Template
- Click on any template card in the "Project Templates" section
- Each template shows the key technologies and features included

### 2. Configure Your Project
- **Project Details**: Set name and description
- **Technology Options**: Choose frameworks, languages, and tools
- **Features**: Select which features to include
- **Styling**: Pick CSS frameworks and UI libraries

### 3. Generate Project
- Click "Generate Project" to create the complete task description
- The system will create a detailed prompt for Goose CLI
- Multiple specialized agents will work on different parts of the project

## Template Configuration Options

### Common Options
- **Project Name**: Used for folder names and package.json
- **Description**: Added to README and package.json
- **TypeScript**: Enable TypeScript support where applicable
- **Testing**: Include test setup and example tests

### Framework-Specific Options
- **React**: Router, state management, styling framework
- **Angular**: Routing, SSR, PWA features, UI framework  
- **Vue**: Router, state management, composition API
- **Full-Stack**: Frontend/backend framework combinations
- **API**: Database type, ORM choice, authentication method
- **Static**: Website type, page count, styling approach

### Feature Toggles
Each template includes relevant feature checkboxes:
- Authentication systems
- API integration
- Form handling and validation
- Testing frameworks
- Documentation generation
- Deployment configuration

## "Always Building" Principle

Every template is designed to generate **immediately buildable projects**:

- ✅ **Complete package.json** with all dependencies
- ✅ **Build scripts** and development commands  
- ✅ **README** with setup and run instructions
- ✅ **Configuration files** (tsconfig, webpack, etc.)
- ✅ **Example code** and basic functionality
- ✅ **Testing setup** with sample tests
- ✅ **Production-ready** code structure

After generation, you can immediately run:
```bash
npm install && npm start
```

## Multi-Agent Orchestration

Templates leverage the multi-agent system:

1. **Orchestrator** analyzes the template configuration
2. **Specialized Agents** handle different aspects:
   - Frontend Agent: UI components and styling
   - Backend Agent: API endpoints and server logic
   - Database Agent: Schema and migrations
   - Testing Agent: Test suites and validation
   - Documentation Agent: README and API docs

3. **Integration Agent** ensures everything works together
4. **Build Validation** confirms the project is immediately runnable

## Extending Templates

To add new templates or modify existing ones:

1. **Add Template Configuration** in `public/script.js`:
   ```javascript
   templateConfigs.newTemplate = {
       title: 'New Template Configuration',
       sections: [/* configuration sections */]
   }
   ```

2. **Add Template Card** in `public/index.html`:
   ```html
   <div class="template-card" data-template="newTemplate">
       <!-- template card content -->
   </div>
   ```

3. **Add Task Generation Logic** in the `generateTaskFromTemplate` function

4. **Update CSS** for any new template-specific styling

## Benefits

- **Rapid Prototyping**: Go from idea to working project in minutes
- **Best Practices**: Templates include industry-standard configurations
- **Consistency**: All projects follow similar structure and conventions
- **Learning Tool**: See how different technologies work together
- **Production Ready**: Generated code is ready for real-world use

The template system transforms the Goose Multi-Agent System from a code generation tool into a complete project delivery platform, embodying the "always building" principle where every interaction results in something immediately useful and runnable. 