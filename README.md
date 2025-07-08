# Goose Multi-Agent Visualizer

A comprehensive web-based UI and visualizer for the Goose CLI multi-agent system with project creation capabilities. This tool provides real-time visualization of AI agents working together to complete tasks, with support for both actual Goose CLI integration and simulation mode.

## Features

### 🎯 Core Features
- **Real-time Agent Visualization**: Watch AI agents work together in real-time
- **Goose CLI Integration**: Connect directly to the actual Goose CLI for real AI agent execution
- **Project Directory Selection**: Browse and select directories for project creation
- **Simulation Mode**: Demo mode for testing without Goose CLI
- **Task Management**: Submit and track complex tasks with progress monitoring

### 🔧 Project Management
- **Directory Browser**: Navigate your file system to select project locations
- **Create Directories**: Create new project directories directly from the UI
- **Project Path Selection**: Choose where your AI agents should create projects
- **Workspace Management**: Organize projects in your preferred directory structure

### 📊 Monitoring & Visualization
- **Agent Status Tracking**: Monitor individual agent progress and status
- **Real-time Updates**: Live updates via WebSocket connections
- **Task History**: View completed tasks and their summaries
- **System Statistics**: Track active agents, completed tasks, and uptime

## Prerequisites

- **Node.js** (v14.0.0 or higher)
- **npm** (comes with Node.js)
- **Goose CLI** (optional - for real AI agent execution)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd goose-multi-agent-ui
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Install Goose CLI** (optional but recommended):
   ```bash
   # Follow Goose CLI installation instructions
   # The app will work in simulation mode without it
   ```

## Usage

### Starting the Application

1. **Development mode** (with auto-reload):
   ```bash
   npm run dev
   ```

2. **Production mode**:
   ```bash
   npm start
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

### Using the Interface

#### 1. Check Goose CLI Status
- The app automatically checks if Goose CLI is available
- Status indicator shows:
  - 🟢 **Available**: Goose CLI is installed and working
  - 🔴 **Unavailable**: Goose CLI not found (simulation mode only)
  - 🟡 **Checking**: Currently verifying Goose CLI status

#### 2. Select Execution Mode
- **Toggle Switch**: Choose between Goose CLI and simulation mode
- **Goose CLI Mode**: Uses real AI agents via Goose CLI
- **Simulation Mode**: Demo mode with simulated agents

#### 3. Choose Project Directory
- **Browse Directories**: Navigate through your file system
- **Select Directory**: Click on a folder to select it as your project location
- **Create New Directory**: Use the "+" button to create new project folders
- **Navigation Controls**:
  - 🔼 **Parent Directory**: Go up one level
  - 🔄 **Refresh**: Reload current directory
  - ➕ **Create Directory**: Create new folder

#### 4. Submit Tasks
- **Task Input**: Enter your task description (e.g., "Build a todo app with tests")
- **Example Tasks**: Click on predefined examples to get started
- **Submit**: Press Enter or click the send button
- **Requirements**: Project directory must be selected when using Goose CLI

#### 5. Monitor Progress
- **Agent Cards**: View individual agent status and progress
- **Chat Interface**: Follow task progress and system messages
- **System Stats**: Monitor active agents and completed tasks

### Example Tasks

Try these example tasks to get started:

1. **"Build a simple calculator with tests"**
   - Creates a calculator application with unit tests
   - Demonstrates code generation and testing agents

2. **"Create a REST API with documentation"**
   - Builds a RESTful API with auto-generated documentation
   - Shows API development and documentation agents

3. **"Develop a todo app and deploy it"**
   - Creates a complete todo application with deployment
   - Illustrates full-stack development with deployment agents

## Architecture

### Server Components

- **`server.js`**: Main Express server with Socket.IO integration
- **`goose-integration.js`**: Goose CLI integration and process management
- **API Endpoints**:
  - `/api/directories` - Directory browsing
  - `/api/create-directory` - Directory creation
  - `/api/goose-status` - Goose CLI status check

### Client Components

- **`public/index.html`**: Main UI structure
- **`public/script.js`**: Client-side JavaScript and Socket.IO handling
- **`public/styles.css`**: Responsive CSS styling

### Key Features

#### Real-time Communication
- **WebSocket Events**: Bidirectional communication between client and server
- **Agent Updates**: Live agent status and progress updates
- **Task Management**: Real-time task submission and completion tracking

#### Goose CLI Integration
- **Process Management**: Spawn and manage Goose CLI processes
- **Output Parsing**: Parse JSON and text output from Goose CLI
- **Error Handling**: Graceful fallback to simulation mode

#### Directory Management
- **File System Navigation**: Browse directories with proper permissions
- **Directory Creation**: Create new project directories
- **Path Validation**: Ensure selected paths are valid and accessible

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
GOOSE_PATH=/path/to/goose/cli
NODE_ENV=development
```

### Goose CLI Configuration

Ensure Goose CLI is properly configured:

```bash
# Check Goose CLI installation
goose --version

# View Goose configuration
goose config --show

# Set up Goose for your environment
goose config --set key=value
```

## Troubleshooting

### Common Issues

1. **Goose CLI Not Found**
   - Install Goose CLI following official documentation
   - Ensure Goose CLI is in your system PATH
   - Check Goose CLI configuration

2. **Directory Access Errors**
   - Ensure proper file system permissions
   - Try selecting a different directory
   - Check if the directory exists and is readable

3. **Port Already in Use**
   - Change the port in the environment variables
   - Kill any processes using port 3000
   - Use `npm run dev` to start with auto-reload

4. **WebSocket Connection Issues**
   - Check firewall settings
   - Ensure port 3000 is accessible
   - Try refreshing the browser

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

## Development

### Project Structure

```
goose-multi-agent-ui/
├── server.js              # Main server file
├── goose-integration.js   # Goose CLI integration
├── package.json           # Dependencies and scripts
├── README.md             # This file
└── public/               # Client-side files
    ├── index.html        # Main HTML structure
    ├── script.js         # Client-side JavaScript
    └── styles.css        # CSS styling
```

### Adding New Features

1. **Server-side**: Add new endpoints or Socket.IO events in `server.js`
2. **Client-side**: Update `script.js` for new UI functionality
3. **Styling**: Modify `styles.css` for visual changes
4. **Goose Integration**: Extend `goose-integration.js` for new Goose CLI features

### Testing

- **Manual Testing**: Use the web interface to test functionality
- **Simulation Mode**: Test without requiring Goose CLI
- **Error Scenarios**: Test with invalid directories and tasks

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the GitHub issues
- Create a new issue with detailed information

## Roadmap

- [ ] Task templates and presets
- [ ] Agent performance analytics
- [ ] Project history and bookmarks
- [ ] Multi-user support
- [ ] Plugin system for custom agents
- [ ] Export/import project configurations 