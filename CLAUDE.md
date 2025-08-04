# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development
- `npm run dev` - Start full development environment (backend + frontend with live-server)
- `npm run dev:backend` - Start backend only with nodemon
- `npm run dev:frontend` - Start frontend only with live-server
- `npm start` - Start production server

### Building & Assets
- `npm run build` - Build CSS and copy assets
- `npm run build:css` - Compile Tailwind CSS
- `npm run build:watch` - Watch and rebuild CSS
- `npm run copy-assets` - Copy frontend assets to public directory

### Testing & Quality
- `npm test` - Run Jest tests
- `npm run test:integration` - Run integration tests
- `npm run test:multi-agent` - Test multi-agent functionality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically

### Database Management
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:reset` - Reset database (rollback, migrate, seed)
- `npm run db:status` - Check migration status

### Goose Session Management
- `npm run cleanup:sessions` - Close all active Goose sessions
- `npm run cleanup:emergency` - Emergency cleanup of stuck processes
- `npm run cleanup:health` - Health check for Goose processes
- `npm run cleanup:list` - List active Goose sessions

## Architecture Overview

### Multi-Agent AI Development Platform
Maverick is an AI-powered development platform that uses multiple specialized AI agents to build complete applications from natural language descriptions.

### Core System Components

#### TaskOrchestrator (`backend/src/orchestrator/TaskOrchestrator.js`)
- Central coordination engine for all AI agents and tasks
- Manages task dependencies, execution flow, and quality gates
- Implements Kanban workflow: todo → inProgress → review → completed
- Handles intelligent requirements processing and agent matching
- Features payload size management to prevent CLI prompt overflow

#### EnhancedGooseIntegration (`backend/src/orchestrator/EnhancedGooseIntegration.js`)
- Enhanced wrapper around Goose CLI integration
- Provides caching for AI responses and intelligent session management
- Handles TRD (Technical Requirements Document) generation
- Manages process lifecycle with timeout and activity tracking

#### Agent System (`backend/src/orchestrator/agents/`)
- **AgentRegistry.js** - Central registry for all agent types and capabilities
- **Specialized Agents** - Domain-specific agents (React, Python, QA, Code Review)
- **Quality Gate Agents** - Mandatory validation after every development task

#### Project Management
- **ProjectPersistence.js** - Handles project state, checkpoints, and resumption
- **Checkpoint System** - Automatic saving of project state at key milestones
- Project data stored in `backend/data/projects/` with unique UUIDs

### Quality Assurance Architecture
- **Mandatory QA Gates** - Every development task goes through code review → QA testing
- **QAEngineer.js** - Validates all outputs before task completion  
- **Dependency-Aware Scheduling** - Tasks only proceed after quality gates pass
- **Rework Handling** - Failed checkpoints trigger guided task rework

### Frontend Architecture
- **Real-time WebSocket Communication** - Socket.IO for live updates
- **Modern Responsive Design** - Tailwind CSS with Broadcom branding
- **Progressive Enhancement** - Works across all modern browsers
- **Live Development Console** - Real-time monitoring of agent activities

### Key Architectural Patterns
- **Event-Driven** - WebSocket-based real-time communication via Socket.IO
- **Modular Agent System** - Specialized agents for different development domains
- **Quality Gates** - Built-in QA validation ensures production-ready code
- **Kanban Workflow** - Tasks flow through structured stages with checkpoints

## Important Development Notes

### Goose CLI Integration
- System requires Goose CLI for enhanced AI capabilities
- Falls back to simulated agents when Goose is unavailable
- Session management includes timeout handling and cleanup procedures
- Emergency cleanup scripts available for stuck processes

### Payload Size Management
- TaskOrchestrator includes PromptUtils class to prevent CLI prompt overflow
- MAX_PROMPT_SIZE: 100KB safety limit
- MAX_DESCRIPTION_LENGTH: 2000 characters for descriptions
- Automatic deduplication and cleaning of prompts

### Project Structure
- `backend/` - Node.js/Express server with multi-agent orchestration
- `client/public/` - Frontend assets and compiled outputs
- `client/src/` - Source assets before compilation
- `docs/` - Comprehensive technical documentation
- `scripts/` - Utility scripts for testing and maintenance
- `backend/data/` - Runtime data storage (agents, jobs, projects, checkpoints)

### Configuration Files
- Main package.json defines all npm scripts and dependencies
- Backend has separate package.json for server dependencies
- Tailwind CSS configured for modern responsive design
- Knex.js handles database migrations and seeding

### Cursor IDE Rules
System includes Cursor-specific development rules:
- Modular and agile system design principles
- Event-driven WebSocket communication patterns
- Quality gates with built-in QA validation
- Kanban workflow implementation guidelines