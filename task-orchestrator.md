# Task Orchestrator - Core Orchestration Engine

## Overview

The Task Orchestrator (`TaskOrchestrator.js`) is the central brain of the Maverick system, implementing a LangGraph-inspired stateful execution engine for multi-agent task coordination. It manages the complete lifecycle of projects from prompt analysis to final delivery.

## Architecture

### Core Design Patterns

- **Stateful Graph Execution**: LangGraph-inspired state management with persistent context
- **Event-Driven Coordination**: WebSocket-based real-time communication
- **Bulletproof State Tracking**: Comprehensive state persistence and recovery
- **Quality Gate Integration**: Mandatory code review and QA checkpoints

### Key Components

```javascript
class TaskOrchestrator {
  // Core LangGraph-inspired state management
  projectGraphs: Map()     // Stateful project graphs
  graphMemory: Map()       // Memory bank for each graph
  graphState: Map()        // Current state of each graph
  executionContext: Map()  // Execution context tracking
  
  // Enhanced state tracking
  nodeStates: Map()        // Individual node states
  edgeStates: Map()        // Edge execution history
  agentStates: Map()       // Persistent agent states
  stateHistory: Map()      // State transition history
}
```

## Key Flows

### 1. Project Orchestration Flow

```
User Prompt → Prompt Analysis → Task Decomposition → Agent Assignment → 
Stateful Graph Creation → Execution Loop → Quality Gates → Completion
```

#### Implementation Details:
```javascript
async orchestrateProject(prompt, projectPath, socket, options = {}) {
  // 1. Analyze prompt and generate comprehensive task list
  const taskAnalysis = await this.analyzePromptForTasks(prompt, options);
  
  // 2. Create bulletproof stateful graph
  const statefulGraph = await this.createStatefulGraph(taskAnalysis, projectId, socket);
  
  // 3. Assign tasks to specialized agents with checkpoint prioritization
  const agentAssignments = await this.assignTasksToAgentsWithCheckpoints(statefulGraph.graph);
  
  // 4. Execute stateful graph
  await this.executeStatefulGraph(projectId, socket);
}
```

### 2. Stateful Graph Execution

```
Initialize State → Execution Loop → Node Selection → Agent Execution → 
State Updates → Dependency Resolution → Quality Checkpoints → Completion
```

#### State Management:
- **Graph State**: Overall execution status (pending, running, completed, failed)
- **Node States**: Individual task status with progress tracking
- **Edge States**: Dependency completion and validation
- **Memory Bank**: Persistent context across executions

### 3. Quality Gate Pipeline

```
Task Completion → Code Review Checkpoint → QA Testing Checkpoint → 
Dependency Resolution → Next Task Unlocking
```

#### Checkpoint Integration:
- **Automatic Injection**: Quality checkpoints added to every development task
- **Agent Specialization**: Dedicated code review and QA testing agents
- **Dependency Enhancement**: Subsequent tasks depend on checkpoint completion

## Agent Assignment & Coordination

### Agent Selection Algorithm

```javascript
async assignTasksToAgentsWithCheckpoints(taskGraph) {
  for (const task of taskGraph.nodes) {
    // 1. Find best agent based on capabilities
    const agent = this.findBestAgentForTask(task);
    
    // 2. Inject quality checkpoints
    if (this.isStandardDevelopmentTask(task)) {
      this.injectQualityCheckpoints(task, taskGraph);
    }
    
    // 3. Update dependencies with checkpoint requirements
    this.enhanceDependenciesWithCheckpoints(task, taskGraph);
  }
}
```

### Capability-Based Matching

- **Skill Assessment**: Multi-dimensional capability scoring
- **Efficiency Ratings**: Agent-specific performance metrics
- **Workload Balancing**: Optimal task distribution across agents
- **Specialization Priority**: Task routing to most suitable agents

## State Management System

### Persistent State Architecture

```javascript
// State transition handlers
stateTransitionHandlers: Map()

// Conditional edge evaluators  
conditionalEvaluators: Map()

// Memory serializers for state persistence
memorySerializers: Map()

// Recovery mechanisms
recoveryHandlers: Map()
```

### Execution Context Tracking

- **Project Graphs**: Complete task dependency structures
- **Execution History**: Detailed audit trail of all operations
- **Agent States**: Real-time agent status and workload
- **Checkpoint States**: Quality gate validation results

## Error Handling & Recovery

### Timeout Management

```javascript
// Configurable timeout settings
timeoutSettings: {
  default: 16 * 60 * 1000,      // 16 minutes default
  extended: 30 * 60 * 1000,     // 30 minutes for complex tasks
  maxInactivity: 5 * 60 * 1000, // 5 minutes of inactivity
  heartbeatInterval: 60 * 1000  // 60 seconds heartbeat
}
```

### Recovery Mechanisms

- **State Persistence**: Automatic checkpoint creation for resume capability
- **Graceful Degradation**: Fallback to simulation mode on failures
- **Process Cleanup**: Automatic resource management and cleanup
- **Error Propagation**: Comprehensive error reporting via WebSocket

## Real-Time Communication

### WebSocket Event Patterns

```javascript
// Project lifecycle events
socket.emit('project_orchestrated', projectData);
socket.emit('task_started', { taskId, agentId, task });
socket.emit('task_completed', { taskId, agentId, result });
socket.emit('quality_checkpoint_passed', { taskId, checkpointType });

// State transition events
socket.emit('graph_state_changed', { projectId, newState, context });
socket.emit('agent_assigned', { agentId, taskId, estimatedDuration });
```

### Progress Tracking

- **Task-Level Progress**: Individual task completion percentages
- **Project-Level Progress**: Overall project completion status
- **Agent Activity**: Real-time agent workload and performance
- **Quality Metrics**: Code review and QA validation results

## Integration Points

### Goose CLI Integration

```javascript
// Execute task via Goose CLI
await this.gooseIntegration.executeGooseTask(
  task.description, 
  sessionId, 
  socket, 
  projectPath
);
```

### Job Storage Integration

```javascript
// Persist project state
const projectToSave = {
  ...project,
  statefulGraph: statefulGraph,
  taskAnalysis: taskAnalysis,
  graphState: this.graphState.get(projectId),
  nodeStates: this.nodeStates.get(projectId)
};
await this.projectPersistence.saveProject(projectToSave);
```

## Performance Optimizations

### Parallel Execution

- **Concurrent Task Processing**: Multiple agents working simultaneously
- **Dependency-Aware Scheduling**: Optimal task ordering based on dependencies
- **Resource Pool Management**: Efficient agent allocation and reuse

### Memory Management

- **In-Memory State**: Fast access to execution state
- **Selective Persistence**: Periodic state snapshots to disk
- **Garbage Collection**: Automatic cleanup of completed projects

## TODOs & Future Enhancements

### High Priority
- [ ] **Database Integration**: Replace file-based persistence with database storage
- [ ] **Advanced Recovery**: More sophisticated failure recovery mechanisms  
- [ ] **Performance Metrics**: Detailed agent performance analytics
- [ ] **Load Balancing**: Intelligent workload distribution algorithms

### Medium Priority
- [ ] **Workflow Templates**: Pre-defined execution patterns for common project types
- [ ] **Agent Learning**: Machine learning-based agent performance optimization
- [ ] **Multi-Project Support**: Concurrent project execution capabilities
- [ ] **API Rate Limiting**: Throttling for external service integrations

### Low Priority
- [ ] **Visual Workflow Editor**: Drag-and-drop graph creation interface
- [ ] **Custom Quality Gates**: User-defined checkpoint configurations
- [ ] **Agent Marketplace**: Plugin system for third-party agents
- [ ] **Execution Replay**: Debug mode with step-by-step execution replay

## Configuration Options

### Environment Variables
```javascript
// Execution timeouts
TASK_TIMEOUT_DEFAULT=960000      // 16 minutes
TASK_TIMEOUT_EXTENDED=1800000    // 30 minutes

// Parallelism settings
MAX_CONCURRENT_AGENTS=5
MAX_PARALLEL_TASKS=10

// Quality gate settings
ENABLE_CODE_REVIEW=true
ENABLE_QA_TESTING=true
REQUIRE_FINAL_REVIEW=true
```

### Agent Registry Configuration
```javascript
// Agent efficiency thresholds
MIN_AGENT_EFFICIENCY=0.7
PREFERRED_AGENT_EFFICIENCY=0.9

// Task assignment preferences
PREFER_SPECIALIZED_AGENTS=true
ENABLE_WORKLOAD_BALANCING=true
```

The Task Orchestrator serves as the intelligent core that transforms user requirements into coordinated multi-agent execution plans, ensuring quality, reliability, and real-time visibility throughout the development process. 