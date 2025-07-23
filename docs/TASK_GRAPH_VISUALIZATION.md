# Interactive Task Graph Visualization

## Overview

The Interactive Task Graph Visualization provides a Figma-like interface for viewing and interacting with task execution graphs in real-time. Users can drag nodes around, view task dependencies, monitor progress, and click on tasks to view detailed execution logs.

## Features

### 🎯 Interactive Node Graph
- **Draggable Nodes**: Click and drag task nodes to reposition them in the graph
- **Real-time Updates**: Nodes update their status and progress automatically as tasks execute
- **Dependency Visualization**: Visual arrows show task dependencies and execution flow
- **Status Color Coding**: Nodes change colors based on task status (todo, in_progress, completed, failed, needs_revision)

### 🔧 Graph Controls
- **Center Graph**: Automatically center the graph in the viewport
- **Zoom In/Out**: Zoom controls for detailed viewing
- **Auto Layout**: Apply force-directed layout algorithm to organize nodes
- **Pan Support**: Click and drag empty space to pan around the graph

### 📊 Task Status Indicators
- **Status Icons**: Visual status indicators (⏳ todo, ⚡ in_progress, ✅ completed, ❌ failed, 🔄 needs_revision)
- **Progress Bars**: Real-time progress visualization within each node
- **Agent Assignment**: Shows which agent is assigned to each task

### 📋 Task Logs Modal
- **Click to View**: Click any task node to open detailed logs
- **Tabbed Interface**: Separate tabs for Goose CLI output, agent activity, and system events
- **Real-time Updates**: Logs update automatically as tasks execute
- **Terminal-style Display**: Dark theme with color-coded log levels

## Usage

### Accessing the Task Graph

1. **Submit a Task**: Create a new project by submitting a development task
2. **Switch to Agents View**: The task graph automatically appears when agents are active
3. **View Graph**: The interactive graph displays in the "TASK EXECUTION GRAPH" section

### Interacting with Nodes

#### Dragging Nodes
- **Single Node**: Click and drag any task node to reposition it
- **Connected Updates**: Dependency arrows automatically update when nodes move
- **Smooth Animation**: Nodes have hover effects and smooth transitions

#### Viewing Task Details
- **Click Node**: Click any task node to open the Task Logs Modal
- **Status Information**: View current status, assigned agent, progress percentage
- **Execution Timeline**: See when tasks started and their current state

### Graph Navigation

#### Control Buttons
```
🎯 Center Graph    - Centers all nodes in the viewport
🔍 Zoom In        - Increases zoom level (max 3x)
🔍 Zoom Out       - Decreases zoom level (min 0.1x)
✨ Auto Layout    - Applies force-directed layout algorithm
```

#### Mouse Controls
- **Drag Nodes**: Click and drag individual task nodes
- **Pan Canvas**: Click and drag empty space to pan around
- **Zoom**: Use mouse wheel to zoom in/out
- **Context Menu**: Right-click disabled for better UX

### Task Logs Modal

#### Tab Navigation
- **Goose CLI Output**: Real-time output from Goose CLI execution
- **Agent Activity**: Agent-specific logs and status changes
- **System Events**: System-level events and notifications

#### Log Features
- **Color Coding**: Different colors for info, success, warning, and error messages
- **Timestamps**: Each log entry includes precise timestamps
- **Auto-scroll**: Logs automatically scroll to show latest output
- **Refresh Button**: Manual refresh option for latest logs

## Technical Implementation

### Architecture

```
TaskGraphVisualization Class
├── SVG Rendering Engine
├── Drag & Drop System
├── Real-time Update Handler
├── Graph Layout Algorithm
└── Modal Management
```

### Key Components

#### Node Structure
```javascript
{
  id: "task-id",
  type: "task", 
  position: { x: 100, y: 200 },
  data: {
    title: "Task Title",
    status: "in_progress", 
    progress: 45,
    assignedAgent: "agent-id",
    startedAt: "2024-01-01T12:00:00Z"
  }
}
```

#### Edge Structure
```javascript
{
  id: "source-target",
  source: "source-task-id",
  target: "target-task-id", 
  type: "dependency",
  animated: true
}
```

### Real-time Updates

The graph automatically updates when receiving these Socket.IO events:
- `project_orchestrated` - Initial graph rendering
- `task_started` - Node status change to in_progress
- `task_completed` - Node status change to completed  
- `task_failed` - Node status change to failed
- `task_qa_failed` - Node status change to needs_revision

### CSS Classes

#### Node States
```css
.task-node.todo          /* Blue border, light blue fill */
.task-node.in_progress   /* Orange border, light orange fill */
.task-node.completed     /* Green border, light green fill */
.task-node.failed        /* Red border, light red fill */
.task-node.needs_revision /* Orange border, orange fill */
```

#### Interactive States
```css
.task-node:hover         /* Scale transform on hover */
.task-node.dragging      /* Opacity and scale changes while dragging */
.task-edge.highlighted   /* Red color for highlighted connections */
.task-edge.animated      /* Dashed line animation */
```

## Performance Considerations

### Optimization Features
- **Efficient Rendering**: SVG-based rendering for smooth performance
- **Event Throttling**: Mouse events are throttled to prevent excessive updates
- **Memory Management**: Automatic cleanup of completed sessions
- **Responsive Design**: Adapts to different screen sizes

### Limitations
- **Node Limit**: Optimized for graphs with up to 50 nodes
- **Browser Support**: Requires modern browsers with SVG support
- **Mobile**: Touch interactions supported but best on desktop

## Troubleshooting

### Common Issues

#### Graph Not Showing
- Ensure a task has been submitted and agents are active
- Check that you're in the "Agents Panel" view
- Verify the task graph section is visible above the agent cards

#### Nodes Not Draggable  
- Make sure you're clicking directly on a node, not empty space
- Check that the graph is fully loaded (no loading spinner)
- Try refreshing the browser if interactions are unresponsive

#### Logs Not Loading
- Verify the task has actually started execution
- Check browser console for any JavaScript errors
- Try the refresh button in the logs modal

#### Layout Issues
- Use the "Auto Layout" button to reorganize nodes
- Try the "Center Graph" button to fit nodes in viewport
- Adjust zoom level if nodes appear too small/large

### Debug Information

Enable debugging by opening browser console and checking:
- `taskGraphViz` - Current graph visualization instance
- `taskGraphViz.currentGraph` - Current graph data
- `taskGraphViz.nodePositions` - Node position data
- Socket.IO events in Network tab

## Future Enhancements

### Planned Features
- **Multi-select**: Select multiple nodes for batch operations
- **Minimap**: Overview map for large graphs
- **Export**: Save graph layouts and export as images
- **Filtering**: Filter nodes by status, agent, or other criteria
- **Search**: Find specific tasks within large graphs
- **Undo/Redo**: History management for layout changes

### Integration Opportunities
- **Metrics Dashboard**: Integration with performance metrics
- **Agent Analytics**: Detailed agent performance visualization  
- **Project Templates**: Save and reuse graph layouts
- **Collaboration**: Real-time multi-user graph editing 