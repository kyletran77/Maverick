# Project Persistence System

The Maverick Project Persistence System allows you to save task graphs and project plans as JSON files, enabling you to resume projects from where they stopped and track progress over time.

## Overview

The system provides comprehensive project state management with the following capabilities:

- **Task Graph Persistence**: Save complete task graphs with node states and dependencies
- **Progress Tracking**: Monitor task completion, agent assignments, and overall progress
- **Resume Functionality**: Continue projects from any saved state
- **Checkpoint System**: Create recovery points during project execution
- **History Logging**: Track all project events and state changes
- **Frontend UI**: Manage projects through an intuitive web interface

## Architecture

### Core Components

1. **ProjectPersistence Class** (`backend/src/orchestrator/ProjectPersistence.js`)
   - Handles saving/loading project data to/from JSON files
   - Manages project directory structure and metadata
   - Provides progress calculation and analysis

2. **TaskOrchestrator Integration**
   - Auto-saves project state during execution
   - Provides resume functionality
   - Manages project lifecycle

3. **Frontend UI** (Project Management Panel)
   - Lists all available projects
   - Shows progress and status
   - Allows resuming, pausing, and managing projects

4. **WebSocket API**
   - Real-time project management events
   - Project state synchronization

## File Structure

Each project is stored in its own directory under `backend/data/projects/`:

```
backend/data/projects/
├── project-id-1/
│   ├── project.json          # Project metadata and basic info
│   ├── task-graph.json       # Complete task graph structure
│   ├── execution-state.json  # Node states, agent assignments, memory
│   ├── progress.json         # Progress tracking and analytics
│   ├── history.jsonl         # Event log (JSON Lines format)
│   └── checkpoints/          # Recovery checkpoints
│       ├── timestamp-checkpoint-name.json
│       └── ...
└── project-id-2/
    └── ...
```

### JSON Schema

#### project.json
```json
{
  "id": "project-uuid",
  "name": "Project Name",
  "prompt": "Original user prompt",
  "projectPath": "/path/to/project/files",
  "status": "active|paused|completed|failed",
  "createdAt": "2023-12-01T10:00:00.000Z",
  "updatedAt": "2023-12-01T12:30:00.000Z",
  "version": 1,
  "projectType": "web_application|api|desktop_app|...",
  "complexity": "low|medium|high",
  "metrics": {
    "totalTasks": 10,
    "completedTasks": 5,
    "failedTasks": 1,
    "progressPercentage": 50
  },
  "canResume": true,
  "resumeFromState": "paused|ready_to_start|in_progress"
}
```

#### task-graph.json
```json
{
  "id": "project-uuid",
  "nodes": [
    {
      "id": "task-1",
      "type": "task",
      "position": { "x": 100, "y": 200 },
      "data": {
        "title": "Task Title",
        "description": "Task description",
        "status": "pending|in_progress|completed|failed",
        "dependencies": ["other-task-id"],
        "isCheckpoint": false,
        "assignedAgent": "agent-id"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "task-1",
      "target": "task-2",
      "type": "dependency"
    }
  ],
  "projectType": "web_application",
  "complexity": "medium"
}
```

#### execution-state.json
```json
{
  "projectId": "project-uuid",
  "graphState": {
    "status": "executing",
    "currentNodes": ["task-3"],
    "completedNodes": ["task-1", "task-2"],
    "availableNodes": ["task-4"],
    "blockedNodes": ["task-5"]
  },
  "nodeStates": {
    "task-1": {
      "nodeId": "task-1",
      "status": "completed",
      "startTime": "2023-12-01T10:00:00.000Z",
      "endTime": "2023-12-01T10:15:00.000Z",
      "assignedAgent": "frontend-agent",
      "progress": 100
    }
  },
  "agentAssignments": {
    "frontend-agent": {
      "agent": {
        "id": "frontend-agent",
        "name": "Frontend Specialist",
        "type": "frontend_specialist"
      },
      "tasks": [
        {
          "id": "task-1",
          "title": "Setup Frontend",
          "status": "completed"
        }
      ]
    }
  }
}
```

#### progress.json
```json
{
  "projectId": "project-uuid",
  "overallProgress": {
    "percentage": 50,
    "completedTasks": 5,
    "totalTasks": 10,
    "inProgressTasks": 2,
    "pendingTasks": 3
  },
  "taskProgress": [
    {
      "taskId": "task-1",
      "title": "Setup Frontend",
      "status": "completed",
      "progress": 100,
      "assignedAgent": "frontend-agent"
    }
  ],
  "agentProgress": {
    "frontend-agent": {
      "agentName": "Frontend Specialist",
      "totalTasks": 3,
      "completedTasks": 2,
      "progressPercentage": 67
    }
  }
}
```

## API Reference

### Backend API (WebSocket Events)

#### Listing Projects
```javascript
// Request
socket.emit('list_projects', {});

// Response
socket.on('projects_listed', (data) => {
  console.log(data.projects); // Array of project summaries
});
```

#### Getting Project Details
```javascript
// Request
socket.emit('get_project_details', { projectId: 'project-uuid' });

// Response
socket.on('project_details', (data) => {
  console.log(data.project); // Complete project information
});
```

#### Resuming a Project
```javascript
// Request
socket.emit('resume_project', { projectId: 'project-uuid' });

// Response
socket.on('project_resumed_success', (data) => {
  console.log('Project resumed:', data.projectId);
});
```

#### Pausing a Project
```javascript
// Request
socket.emit('pause_project', { projectId: 'project-uuid' });

// Response
socket.on('project_paused_success', (data) => {
  console.log('Project paused:', data.projectId);
});
```

#### Creating Checkpoints
```javascript
// Request
socket.emit('create_project_checkpoint', { 
  projectId: 'project-uuid', 
  checkpointName: 'before-deployment' 
});

// Response
socket.on('checkpoint_created', (data) => {
  console.log('Checkpoint created:', data.checkpoint);
});
```

### Frontend UI

#### Opening the Projects Panel
Click the "Projects" button in the header to open the project management panel.

#### Project Cards
Each project is displayed as a card showing:
- Project name and status
- Creation/update dates
- Project type and complexity
- Progress bar and percentage
- Action buttons (Resume, Details)

#### Project Details Modal
Click on a project card to view detailed information:
- Complete project metadata
- Progress breakdown (total/completed/remaining tasks)
- Original prompt
- Action buttons (Resume, Pause, Create Checkpoint, Delete)

## Usage Examples

### Creating a New Project
Projects are automatically saved when created through the normal Maverick interface:

```javascript
// This happens automatically when you submit a task
socket.emit('submit_task', {
  task: 'Create a todo app with React and Node.js',
  projectPath: '/path/to/project',
  projectName: 'my-todo-app'
});
```

### Resuming an Existing Project
```javascript
// Load available projects
socket.emit('list_projects', {});

// Resume a specific project
socket.emit('resume_project', { projectId: 'existing-project-id' });
```

### Monitoring Progress
```javascript
// Get real-time progress updates
socket.emit('get_project_progress', { projectId: 'project-id' });

socket.on('project_progress', (data) => {
  console.log(`Progress: ${data.progress.overallProgress.percentage}%`);
  console.log(`Tasks: ${data.progress.overallProgress.completedTasks}/${data.progress.overallProgress.totalTasks}`);
});
```

### Creating Recovery Checkpoints
```javascript
// Create a checkpoint before major changes
socket.emit('create_project_checkpoint', {
  projectId: 'project-id',
  checkpointName: 'before-database-migration'
});
```

## Advanced Features

### Auto-Save Functionality
Projects are automatically saved at key points during execution:
- When the project is created
- When tasks complete
- When agents change status
- When the project is paused or completed

### Progress Calculation
The system automatically calculates:
- Overall project progress percentage
- Task-level completion status
- Agent workload and efficiency metrics
- Time estimates and completion predictions

### Resume Intelligence
When resuming a project, the system:
- Validates the saved state
- Restores all agent assignments
- Continues execution from the exact point where it stopped
- Maintains all progress and history data

### Dependency Management
The system handles complex task dependencies:
- Tracks which tasks can be executed immediately
- Identifies blocking relationships
- Automatically unblocks dependent tasks when prerequisites complete

## Error Handling

### Common Issues and Solutions

1. **Project Not Found**
   ```
   Error: Project [id] not found
   ```
   - Solution: Check that the project ID exists using `list_projects`

2. **Cannot Resume Project**
   ```
   Error: Project [id] is not in a resumable state
   ```
   - Solution: Check project status and `canResume` flag

3. **Checkpoint Creation Failed**
   ```
   Error: Failed to create checkpoint
   ```
   - Solution: Ensure project is in an active state and has execution data

### Validation and Recovery
The system includes built-in validation:
- State integrity checks when loading projects
- Automatic recovery from corrupted checkpoints
- Graceful fallbacks for missing data

## Best Practices

### Project Management
1. **Regular Checkpoints**: Create checkpoints before major milestones
2. **Descriptive Names**: Use clear, descriptive project names
3. **Clean Workspace**: Regularly delete completed or unnecessary projects
4. **Monitor Progress**: Check project progress regularly to identify issues

### Performance Optimization
1. **Limit Active Projects**: Avoid running too many projects simultaneously
2. **Regular Cleanup**: Use the cleanup functionality to remove old data
3. **Efficient Naming**: Use consistent naming conventions for easier searching

### Data Safety
1. **Backup Important Projects**: Export critical project data before major changes
2. **Test Resume**: Test project resume functionality before relying on it
3. **Monitor Disk Space**: Project data can accumulate over time

## Integration with Existing Features

### LangGraph State Management
The persistence system integrates seamlessly with the existing LangGraph-inspired state management:
- Preserves stateful graph structures
- Maintains conditional edge evaluations
- Saves memory bank contents and execution context

### Quality Assurance Integration
Projects maintain QA verification data:
- Checkpoint verification results
- Quality scores and metrics
- Testing outcomes and coverage

### Agent Management
Agent states are fully preserved:
- Current task assignments
- Performance metrics
- Execution history and capabilities

## Troubleshooting

### Debug Mode
Enable debug logging by setting the environment variable:
```bash
DEBUG=maverick:persistence node server.js
```

### Manual Recovery
If automatic recovery fails, you can manually inspect project files:
```bash
# View project metadata
cat backend/data/projects/[project-id]/project.json

# Check execution state
cat backend/data/projects/[project-id]/execution-state.json

# Review history
cat backend/data/projects/[project-id]/history.jsonl
```

### Data Migration
When updating the system, use the migration utilities:
```bash
node scripts/migrate-project-data.js
```

## Future Enhancements

### Planned Features
1. **Export/Import**: Export projects as portable archives
2. **Version Control**: Track project changes over time
3. **Collaboration**: Share projects between team members
4. **Templates**: Create project templates from successful projects
5. **Analytics**: Advanced project analytics and insights

### Extensibility
The system is designed to be extensible:
- Custom serializers for new data types
- Plugin system for additional persistence backends
- Hooks for custom validation and processing

## Conclusion

The Maverick Project Persistence System provides a robust foundation for managing complex AI-driven development projects. By automatically saving state and enabling seamless resume functionality, it ensures that no work is lost and projects can be managed efficiently over their entire lifecycle.

For more information, see the test script at `scripts/test-project-persistence.js` which demonstrates all major functionality. 