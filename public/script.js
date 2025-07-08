// Socket.IO connection
const socket = io();

// DOM elements
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const submitBtn = document.getElementById('submit-btn');
const chatMessages = document.getElementById('chat-messages');
const agentsContainer = document.getElementById('agents-container');
const connectionStatus = document.getElementById('connection-status');
const connectionText = document.getElementById('connection-text');
const activeAgentsCount = document.getElementById('active-agents-count');
const completedTasksCount = document.getElementById('completed-tasks-count');
const uptimeDisplay = document.getElementById('uptime');
const agentModal = document.getElementById('agent-modal');
const modalAgentName = document.getElementById('modal-agent-name');
const modalAgentDetails = document.getElementById('modal-agent-details');

// Directory selection elements
const gooseStatusDot = document.getElementById('goose-status-dot');
const gooseStatusText = document.getElementById('goose-status-text');
const useGooseToggle = document.getElementById('use-goose-toggle');
const modeDescription = document.getElementById('mode-description');
const currentPathText = document.getElementById('current-path-text');
const directoryList = document.getElementById('directory-list');
const selectedPath = document.getElementById('selected-path');
const parentDirBtn = document.getElementById('parent-dir-btn');
const refreshDirBtn = document.getElementById('refresh-dir-btn');
const createDirBtn = document.getElementById('create-dir-btn');
const createDirModal = document.getElementById('create-dir-modal');
const newDirName = document.getElementById('new-dir-name');
const parentDirDisplay = document.getElementById('parent-dir-display');

// State
let agents = new Map();
let completedTasks = 0;
let startTime = Date.now();
let uptimeInterval;
let currentDirectory = '';
let selectedProjectPath = '';
let gooseAvailable = false;
let currentSessionId = null;
let currentPlanId = null;
let currentPlan = null;
let selectedTemplate = null;
let templateConfigurations = {};

// Agent type icons
const AGENT_ICONS = {
    'orchestrator': 'fas fa-crown',
    'code_generator': 'fas fa-code',
    'code_reviewer': 'fas fa-search',
    'tester': 'fas fa-bug',
    'documentation': 'fas fa-file-alt',
    'deployment': 'fas fa-rocket'
};

// Additional global variables
let systemStartTime = new Date();
let agentOutputSections = new Map(); // Track agent output sections

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    socket = io();
    initializeEventListeners();
    startUptimeCounter();
    loadHomeDirectory();
    checkGooseStatus();
    initializeTemplateSystem();
    addSystemMessage('Welcome to Goose Multi-Agent System! 🚀\n\nNew features:\n• Intelligent timeout management (10-20 minutes based on task complexity)\n• Clean agent output sections with collapsible detailed logs\n• Real-time activity monitoring\n• Improved error handling\n\nSelect a project directory and submit a task to get started!');
});

function initializeEventListeners() {
    // Form submission
    taskForm.addEventListener('submit', handleTaskSubmit);
    
    // Example task buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const task = this.getAttribute('data-task');
            taskInput.value = task;
            taskInput.focus();
        });
    });
    
    // Directory navigation
    parentDirBtn.addEventListener('click', goToParentDirectory);
    refreshDirBtn.addEventListener('click', refreshCurrentDirectory);
    createDirBtn.addEventListener('click', showCreateDirModal);
    
    // Toggle switch
    useGooseToggle.addEventListener('change', handleToggleChange);
    
    // Modal close events
    window.addEventListener('click', function(event) {
        if (event.target === agentModal) {
            closeModal();
        }
        if (event.target === createDirModal) {
            closeCreateDirModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
            closeCreateDirModal();
        }
    });
}

async function checkGooseStatus() {
    try {
        gooseStatusDot.className = 'status-dot checking';
        gooseStatusText.textContent = 'Checking Goose CLI...';
        
        const response = await fetch('/api/goose-status');
        const data = await response.json();
        
        if (data.available) {
            gooseAvailable = true;
            gooseStatusDot.className = 'status-dot available';
            gooseStatusText.textContent = 'Goose CLI Available';
            useGooseToggle.disabled = false;
            console.log('Goose CLI config:', data.config);
        } else {
            gooseAvailable = false;
            gooseStatusDot.className = 'status-dot unavailable';
            gooseStatusText.textContent = data.message || 'Goose CLI Not Available';
            useGooseToggle.checked = false;
            useGooseToggle.disabled = true;
            handleToggleChange();
            console.warn('Goose CLI not available:', data.error);
        }
    } catch (error) {
        console.error('Error checking Goose status:', error);
        gooseAvailable = false;
        gooseStatusDot.className = 'status-dot unavailable';
        gooseStatusText.textContent = 'Error checking Goose CLI';
        useGooseToggle.checked = false;
        useGooseToggle.disabled = true;
        handleToggleChange();
    }
}

function handleToggleChange() {
    if (useGooseToggle.checked && gooseAvailable) {
        modeDescription.textContent = 'Real AI agents via Goose CLI';
    } else {
        modeDescription.textContent = 'Simulated agents for demo';
    }
}

async function loadHomeDirectory() {
    try {
        currentPathText.textContent = 'Loading...';
        directoryList.innerHTML = '<div class="loading">Loading directories...</div>';
        
        const response = await fetch('/api/directories');
        const data = await response.json();
        
        if (response.ok) {
            currentDirectory = data.currentPath;
            updateDirectoryDisplay(data);
            
            // Show warning if fallback was used
            if (data.warning) {
                console.warn('Directory access warning:', data.warning);
                addSystemMessage(data.warning, 'system');
            }
        } else {
            throw new Error(data.error || 'Failed to load directories');
        }
    } catch (error) {
        console.error('Error loading home directory:', error);
        currentPathText.textContent = 'Error loading directory';
        directoryList.innerHTML = `<div class="error">Error loading directories: ${error.message}</div>`;
        
        // Try to load current working directory as fallback
        try {
            const fallbackResponse = await fetch('/api/directories?path=.');
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackResponse.ok) {
                currentDirectory = fallbackData.currentPath;
                updateDirectoryDisplay(fallbackData);
                addSystemMessage('Loaded current working directory as fallback', 'system');
            }
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            addSystemMessage('Could not load any directory. Please check permissions.', 'error');
        }
    }
}

async function loadDirectory(path) {
    try {
        directoryList.innerHTML = '<div class="loading">Loading...</div>';
        currentPathText.textContent = 'Loading...';
        
        const response = await fetch(`/api/directories?path=${encodeURIComponent(path)}`);
        const data = await response.json();
        
        if (response.ok) {
            currentDirectory = data.currentPath;
            updateDirectoryDisplay(data);
            
            // Show warning if fallback was used
            if (data.warning) {
                console.warn('Directory access warning:', data.warning);
                addSystemMessage(data.warning, 'system');
            }
        } else {
            throw new Error(data.error || 'Failed to load directory');
        }
    } catch (error) {
        console.error('Error loading directory:', error);
        currentPathText.textContent = currentDirectory || 'Error';
        directoryList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        addSystemMessage(`Error loading directory: ${error.message}`, 'error');
    }
}

function updateDirectoryDisplay(data) {
    currentPathText.textContent = data.currentPath;
    
    // Update parent button state
    parentDirBtn.disabled = data.currentPath === data.parent;
    
    // Clear and populate directory list
    directoryList.innerHTML = '';
    
    if (data.directories.length === 0) {
        directoryList.innerHTML = '<div class="empty">No directories found</div>';
        return;
    }
    
    data.directories.forEach(dir => {
        const dirItem = document.createElement('div');
        dirItem.className = 'directory-item';
        dirItem.innerHTML = `
            <i class="fas fa-folder"></i>
            <span>${dir.name}</span>
        `;
        
        dirItem.addEventListener('click', () => selectDirectory(dir.path));
        dirItem.addEventListener('dblclick', () => loadDirectory(dir.path));
        
        directoryList.appendChild(dirItem);
    });
}

function selectDirectory(path) {
    // Update visual selection
    document.querySelectorAll('.directory-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    event.currentTarget.classList.add('selected');
    
    // Update selected path
    selectedProjectPath = path;
    selectedPath.textContent = path;
}

function goToParentDirectory() {
    if (currentDirectory) {
        const parentPath = currentDirectory.split('/').slice(0, -1).join('/') || '/';
        loadDirectory(parentPath);
    }
}

function refreshCurrentDirectory() {
    if (currentDirectory) {
        loadDirectory(currentDirectory);
    }
}

function showCreateDirModal() {
    parentDirDisplay.textContent = currentDirectory;
    newDirName.value = '';
    createDirModal.style.display = 'block';
    newDirName.focus();
}

function closeCreateDirModal() {
    createDirModal.style.display = 'none';
}

async function createDirectory() {
    const dirName = newDirName.value.trim();
    
    if (!dirName) {
        alert('Please enter a directory name');
        return;
    }
    
    try {
        const response = await fetch('/api/create-directory', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                parentPath: currentDirectory,
                dirName: dirName
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            addSystemMessage(`Directory '${dirName}' created successfully`, 'success');
            closeCreateDirModal();
            refreshCurrentDirectory();
            
            // Auto-select the new directory
            setTimeout(() => {
                selectDirectory(data.path);
            }, 500);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error creating directory:', error);
        addSystemMessage(`Error creating directory: ${error.message}`, 'error');
    }
}

function handleTaskSubmit(event) {
    event.preventDefault();
    
    const task = taskInput.value.trim();
    if (!task) return;
    
    // Check if project directory is selected when using Goose
    if (useGooseToggle.checked && !selectedProjectPath) {
        addSystemMessage('Please select a project directory before submitting a task with Goose CLI', 'error');
        return;
    }
    
    // Disable form during processing
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // Add user message to chat
    addUserMessage(task);
    
    // Show project path in chat if selected
    if (selectedProjectPath) {
        addSystemMessage(`Project directory: ${selectedProjectPath}`, 'system');
    }
    
    // Send task to server
    const taskData = {
        task: task,
        description: `User requested: ${task}`,
        projectPath: selectedProjectPath,
        useGoose: useGooseToggle.checked && gooseAvailable
    };
    
    socket.emit('submit_task', taskData);
    
    // Clear input
    taskInput.value = '';
}

function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

function addSystemMessage(message, type = 'system') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

function displayExecutionPlan(plan) {
    const planElement = document.createElement('div');
    planElement.className = 'message plan';
    
    const subtasksList = plan.subtasks.map(subtask => {
        const dependencies = subtask.dependencies.length > 0 ? 
            ` (depends on: ${subtask.dependencies.length} tasks)` : '';
        return `• ${subtask.name} - ${subtask.description}${dependencies}`;
    }).join('\n');
    
    planElement.innerHTML = `
        <div class="plan-header">
            <strong>🎯 Execution Plan Created</strong>
        </div>
        <div class="plan-details">
            <strong>Task:</strong> ${plan.originalTask}<br>
            <strong>Subtasks (${plan.subtasks.length}):</strong><br>
            <pre>${subtasksList}</pre>
            <strong>Estimated Time:</strong> ${plan.totalEstimatedTime} minutes
        </div>
    `;
    
    chatMessages.appendChild(planElement);
    scrollToBottom();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateAgentsDisplay() {
    agentsContainer.innerHTML = '';
    
    const agentArray = Array.from(agents.values());
    
    agentArray.forEach(agent => {
        const agentCard = createAgentCard(agent);
        agentsContainer.appendChild(agentCard);
    });
    
    // Update stats
    const activeAgents = agentArray.filter(agent => 
        agent.status === 'working' || agent.status === 'idle'
    ).length;
    
    activeAgentsCount.textContent = activeAgents;
}

function createAgentCard(agent) {
    const card = document.createElement('div');
    card.className = `agent-card ${agent.status}`;
    card.addEventListener('click', () => showAgentDetails(agent));
    
    const icon = AGENT_ICONS[agent.type] || 'fas fa-robot';
    const currentTask = agent.logs.length > 0 ? agent.logs[agent.logs.length - 1].message : 'Idle';
    
    card.innerHTML = `
        <div class="agent-header">
            <div class="agent-name">
                <i class="${icon}"></i>
                ${agent.name}
            </div>
            <div class="agent-status ${agent.status}">${agent.status}</div>
        </div>
        <div class="agent-progress ${agent.status}">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${agent.progress}%"></div>
            </div>
        </div>
        <div class="agent-current-task">${currentTask}</div>
    `;
    
    return card;
}

function showAgentDetails(agent) {
    modalAgentName.textContent = `${agent.name} Details`;
    
    const details = `
        <div class="agent-detail-section">
            <h4>Agent Information</h4>
            <p><strong>Type:</strong> ${agent.type}</p>
            <p><strong>Status:</strong> ${agent.status}</p>
            <p><strong>Progress:</strong> ${agent.progress}%</p>
            <p><strong>Created:</strong> ${new Date(agent.createdAt).toLocaleString()}</p>
        </div>
        
        <div class="agent-detail-section">
            <h4>Activity Logs</h4>
            <div class="agent-logs">
                ${agent.logs.map(log => `
                    <div class="log-entry">
                        <div class="log-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</div>
                        <div class="log-message">${log.message}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    modalAgentDetails.innerHTML = details;
    agentModal.style.display = 'block';
}

function closeModal() {
    agentModal.style.display = 'none';
}

function startUptimeCounter() {
    uptimeInterval = setInterval(updateUptime, 1000);
}

function updateUptime() {
    const now = Date.now();
    const diff = now - startTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    uptimeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Socket event handlers
socket.on('connect', () => {
    connectionStatus.className = 'status-dot online';
    connectionText.textContent = 'Connected';
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    connectionStatus.className = 'status-dot offline';
    connectionText.textContent = 'Disconnected';
    console.log('Disconnected from server');
});

socket.on('agents_update', (agentsData) => {
    // Prevent processing if we have too many agents (infinite loop protection)
    if (agentsData.length > 50) {
        console.warn('Too many agents detected, possible infinite loop. Limiting to 50 agents.');
        agentsData = agentsData.slice(0, 50);
    }
    
    agents.clear();
    agentsData.forEach(agent => {
        agents.set(agent.id, agent);
    });
    updateAgentsDisplay();
});

socket.on('agent_created', (agent) => {
    agents.set(agent.id, agent);
    updateAgentsDisplay();
    addSystemMessage(`New agent created: ${agent.name}`, 'system');
});

socket.on('agent_status_update', (update) => {
    const agent = agents.get(update.agentId);
    if (agent) {
        agent.status = update.status;
        agent.progress = update.progress;
        if (update.message) {
            agent.logs.push({
                timestamp: update.timestamp,
                message: update.message
            });
        }
        updateAgentsDisplay();
    }
});

socket.on('goose_output', (data) => {
    // Display important Goose CLI output in agent section
    displayAgentOutput(data.sessionId, data.output, data.type, data.level);
});

socket.on('goose_detailed_output', (data) => {
    // Store detailed output in collapsible section
    addDetailedOutput(data.sessionId, data.output, data.type);
});

socket.on('session_heartbeat', (data) => {
    // Update session activity indicator
    updateSessionActivity(data.sessionId, data.lastActivity, data.inactivityTime);
});

socket.on('goose_status', (data) => {
    addSystemMessage(`Status: ${data.message}`, 'system');
});

socket.on('task_completed', (data) => {
    // Reset submission flag
    window.taskSubmissionInProgress = false;
    
    addSystemMessage(data.message, 'success');
    if (data.summary) {
        let summaryText = `Task: ${data.summary.task}\nSubtasks Completed: ${data.summary.subtasksCompleted}/${data.summary.totalSubtasks}\nAgents Used: ${data.summary.agentsUsed}\nDuration: ${data.summary.duration}\nStatus: ${data.summary.status}`;
        
        // Add build validation info
        if (data.summary.buildValidation) {
            const validation = data.summary.buildValidation;
            if (validation.buildable) {
                summaryText += `\n\n✅ PROJECT IS BUILDABLE!\nRun commands: ${validation.instructions.join(' OR ')}`;
            } else {
                summaryText += `\n\n⚠️ Build validation: Missing some components`;
            }
        }
        
        addSystemMessage(summaryText, 'summary');
    }
    
    // Re-enable form
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
    currentPlanId = null;
    currentPlan = null;
    completedTasks++;
    const completedTasksCount = document.getElementById('completed-tasks-count');
    if (completedTasksCount) {
        completedTasksCount.textContent = completedTasks;
    }
    
    // Clean up agent output sections
    cleanupAgentOutputSections();
});

socket.on('task_error', (data) => {
    // Reset submission flag
    window.taskSubmissionInProgress = false;
    
    addSystemMessage(`Error: ${data.error}`, 'error');
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
    currentPlanId = null;
    currentPlan = null;
});

socket.on('task_cancelled', (data) => {
    // Reset submission flag
    window.taskSubmissionInProgress = false;
    
    // Re-enable form
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }
    
    addSystemMessage(data.message, 'system');
    currentSessionId = null;
    currentPlanId = null;
    currentPlan = null;
});

// New socket events for multi-agent coordination
socket.on('execution_plan_created', (plan) => {
    currentPlan = plan;
    currentPlanId = plan.id;
    displayExecutionPlan(plan);
    addSystemMessage(`Starting multi-agent execution with ${plan.subtasks.length} specialized agents`, 'system');
});

socket.on('subtask_started', (data) => {
    addSystemMessage(`🚀 Started: ${data.subtaskName} (Agent: ${data.agentName})`, 'system');
    createAgentOutputSection(data.sessionId, data.agentName, data.subtaskName);
});

socket.on('subtask_completed', (data) => {
    addSystemMessage(`✅ Completed: ${data.subtaskName} in ${data.duration}`, 'success');
    finalizeAgentOutputSection(data.sessionId, 'completed');
});

socket.on('subtask_failed', (data) => {
    addSystemMessage(`❌ Failed: ${data.subtaskName} - ${data.error}`, 'error');
    finalizeAgentOutputSection(data.sessionId, 'failed');
});

socket.on('build_validation', (data) => {
    const validation = data.validation;
    if (validation.buildable) {
        addSystemMessage(`🔨 Build Validation: Project is ready to build and run!`, 'success');
        if (validation.instructions.length > 0) {
            addSystemMessage(`📋 Quick Start: ${validation.instructions[0]}`, 'system');
        }
    } else {
        let issues = [];
        if (!validation.hasPackageJson) issues.push('missing package.json');
        if (!validation.hasReadme) issues.push('missing README');
        if (!validation.hasSourceFiles) issues.push('missing source files');
        
        addSystemMessage(`⚠️ Build Validation: ${issues.join(', ')}`, 'error');
    }
});

// Add cancel task functionality
function cancelCurrentTask() {
    if (currentPlanId) {
        socket.emit('cancel_task', { planId: currentPlanId });
        addSystemMessage('Cancelling multi-agent plan and all active sessions...', 'system');
    } else if (currentSessionId) {
        socket.emit('cancel_task', { sessionId: currentSessionId });
        addSystemMessage('Cancelling current task...', 'system');
    }
}

// Add keyboard shortcut for cancelling tasks
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'c' && (currentPlanId || currentSessionId)) {
        event.preventDefault();
        cancelCurrentTask();
    }
});

// Make createDirectory available globally for the modal
window.createDirectory = createDirectory;
window.closeCreateDirModal = closeCreateDirModal;

// Utility functions
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

function getAgentTypeDescription(type) {
    const descriptions = {
        'orchestrator': 'Coordinates and manages all other agents',
        'code_generator': 'Generates code based on requirements',
        'code_reviewer': 'Reviews code for quality and standards',
        'tester': 'Creates and runs tests for the code',
        'documentation': 'Creates documentation and guides',
        'deployment': 'Handles deployment and publishing'
    };
    
    return descriptions[type] || 'Specialized agent';
}

// Add some demo functionality for development
function addDemoAgent() {
    const demoAgent = {
        id: 'demo-' + Date.now(),
        type: 'code_generator',
        name: 'Demo Code Generator',
        status: 'working',
        progress: 75,
        logs: [
            { timestamp: new Date(), message: 'Starting code generation' },
            { timestamp: new Date(), message: 'Analyzing requirements' },
            { timestamp: new Date(), message: 'Writing core logic' }
        ],
        createdAt: new Date()
    };
    
    agents.set(demoAgent.id, demoAgent);
    updateAgentsDisplay();
}

// Template system functionality
const templateConfigs = {
    react: {
        title: 'React Application Configuration',
        sections: [
            {
                title: 'Project Details',
                icon: 'fas fa-info-circle',
                fields: [
                    { name: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'my-react-app' },
                    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'A modern React application' }
                ]
            },
            {
                title: 'Framework Options',
                icon: 'fab fa-react',
                fields: [
                    { name: 'typescript', label: 'Use TypeScript', type: 'checkbox', checked: true },
                    { name: 'router', label: 'Include React Router', type: 'checkbox', checked: true },
                    { name: 'stateManagement', label: 'State Management', type: 'select', options: ['None', 'Redux Toolkit', 'Zustand', 'Context API'], value: 'Redux Toolkit' }
                ]
            },
            {
                title: 'Styling & UI',
                icon: 'fas fa-palette',
                fields: [
                    { name: 'styling', label: 'CSS Framework', type: 'select', options: ['Tailwind CSS', 'Material-UI', 'Styled Components', 'CSS Modules'], value: 'Tailwind CSS' },
                    { name: 'components', label: 'UI Components', type: 'checkbox', checked: true }
                ]
            },
            {
                title: 'Features',
                icon: 'fas fa-cogs',
                fields: [
                    { name: 'features', label: 'Include Features', type: 'checkbox-group', options: ['Authentication', 'API Integration', 'Form Handling', 'Testing Setup', 'PWA Support'] }
                ]
            }
        ]
    },
    angular: {
        title: 'Angular Application Configuration',
        sections: [
            {
                title: 'Project Details',
                icon: 'fas fa-info-circle',
                fields: [
                    { name: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'my-angular-app' },
                    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'A modern Angular application' }
                ]
            },
            {
                title: 'Angular Options',
                icon: 'fab fa-angular',
                fields: [
                    { name: 'routing', label: 'Include Routing', type: 'checkbox', checked: true },
                    { name: 'ssr', label: 'Server-Side Rendering', type: 'checkbox', checked: false },
                    { name: 'pwa', label: 'Progressive Web App', type: 'checkbox', checked: false }
                ]
            },
            {
                title: 'UI Framework',
                icon: 'fas fa-palette',
                fields: [
                    { name: 'uiFramework', label: 'UI Framework', type: 'select', options: ['Angular Material', 'PrimeNG', 'Ng-Bootstrap', 'None'], value: 'Angular Material' }
                ]
            },
            {
                title: 'Features',
                icon: 'fas fa-cogs',
                fields: [
                    { name: 'features', label: 'Include Features', type: 'checkbox-group', options: ['Authentication', 'HTTP Interceptors', 'Guards', 'Services', 'Testing Setup'] }
                ]
            }
        ]
    },
    static: {
        title: 'Static Website Configuration',
        sections: [
            {
                title: 'Project Details',
                icon: 'fas fa-info-circle',
                fields: [
                    { name: 'projectName', label: 'Project Name', type: 'text', required: true, placeholder: 'my-website' },
                    { name: 'description', label: 'Description', type: 'textarea', placeholder: 'A modern static website' }
                ]
            },
            {
                title: 'Website Type',
                icon: 'fas fa-globe',
                fields: [
                    { name: 'siteType', label: 'Website Type', type: 'select', options: ['Portfolio', 'Business Landing', 'Blog', 'Documentation', 'Custom'], value: 'Portfolio' },
                    { name: 'pages', label: 'Number of Pages', type: 'select', options: ['1 (Single Page)', '3-5 Pages', '5-10 Pages', '10+ Pages'], value: '3-5 Pages' }
                ]
            },
            {
                title: 'Styling & Features',
                icon: 'fas fa-palette',
                fields: [
                    { name: 'styling', label: 'CSS Framework', type: 'select', options: ['Tailwind CSS', 'Bootstrap', 'Bulma', 'Custom CSS'], value: 'Tailwind CSS' },
                    { name: 'responsive', label: 'Responsive Design', type: 'checkbox', checked: true },
                    { name: 'animations', label: 'CSS Animations', type: 'checkbox', checked: true }
                ]
            },
            {
                title: 'Features',
                icon: 'fas fa-cogs',
                fields: [
                    { name: 'features', label: 'Include Features', type: 'checkbox-group', options: ['Contact Form', 'Image Gallery', 'SEO Optimization', 'Analytics', 'Social Media Links'] }
                ]
            }
        ]
    }
};

function openTemplateModal(templateType) {
    console.log('Opening template modal for:', templateType);
    selectedTemplate = templateType;
    const config = templateConfigs[templateType];
    
    if (!config) {
        console.log('Template config not found for:', templateType);
        addSystemMessage(`Template "${templateType}" configuration coming soon!`, 'system');
        return;
    }
    
    document.getElementById('template-modal-title').textContent = config.title;
    
    const formContainer = document.getElementById('template-config-form');
    formContainer.innerHTML = '';
    
    config.sections.forEach(section => {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'config-section';
        
        const sectionHeader = document.createElement('h4');
        sectionHeader.innerHTML = `<i class="${section.icon}"></i> ${section.title}`;
        sectionDiv.appendChild(sectionHeader);
        
        section.fields.forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = field.type === 'checkbox-group' ? 'config-row full-width' : 'form-group';
            
            if (field.type === 'text' || field.type === 'textarea') {
                const label = document.createElement('label');
                label.textContent = field.label + (field.required ? ' *' : '');
                fieldDiv.appendChild(label);
                
                const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
                input.type = field.type === 'textarea' ? undefined : 'text';
                input.name = field.name;
                input.placeholder = field.placeholder || '';
                input.required = field.required || false;
                fieldDiv.appendChild(input);
                
            } else if (field.type === 'select') {
                const label = document.createElement('label');
                label.textContent = field.label;
                fieldDiv.appendChild(label);
                
                const select = document.createElement('select');
                select.name = field.name;
                field.options.forEach(option => {
                    const optionEl = document.createElement('option');
                    optionEl.value = option;
                    optionEl.textContent = option;
                    optionEl.selected = option === field.value;
                    select.appendChild(optionEl);
                });
                fieldDiv.appendChild(select);
                
            } else if (field.type === 'checkbox') {
                const checkboxDiv = document.createElement('div');
                checkboxDiv.className = 'checkbox-item';
                
                const input = document.createElement('input');
                input.type = 'checkbox';
                input.name = field.name;
                input.checked = field.checked || false;
                checkboxDiv.appendChild(input);
                
                const label = document.createElement('label');
                label.textContent = field.label;
                checkboxDiv.appendChild(label);
                
                fieldDiv.appendChild(checkboxDiv);
                
            } else if (field.type === 'checkbox-group') {
                const label = document.createElement('label');
                label.textContent = field.label;
                fieldDiv.appendChild(label);
                
                const checkboxGroup = document.createElement('div');
                checkboxGroup.className = 'checkbox-group';
                
                field.options.forEach(option => {
                    const checkboxDiv = document.createElement('div');
                    checkboxDiv.className = 'checkbox-item';
                    
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.name = field.name;
                    input.value = option;
                    checkboxDiv.appendChild(input);
                    
                    const label = document.createElement('label');
                    label.textContent = option;
                    checkboxDiv.appendChild(label);
                    
                    checkboxGroup.appendChild(checkboxDiv);
                });
                
                fieldDiv.appendChild(checkboxGroup);
            }
            
            sectionDiv.appendChild(fieldDiv);
        });
        
        formContainer.appendChild(sectionDiv);
    });
    
    document.getElementById('template-config-modal').style.display = 'block';
}

function closeTemplateModal() {
    document.getElementById('template-config-modal').style.display = 'none';
    selectedTemplate = null;
}

function generateFromTemplate() {
    if (!selectedTemplate) {
        console.error('No template selected');
        return;
    }
    
    const formContainer = document.getElementById('template-config-form');
    if (!formContainer) {
        console.error('Template config form not found');
        return;
    }
    
    const config = {};
    console.log('Generating from template:', selectedTemplate);
    
    // Collect form data manually since we're not using a real form element
    const inputs = formContainer.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            if (input.checked) {
                if (config[input.name]) {
                    // Handle checkbox groups
                    if (Array.isArray(config[input.name])) {
                        config[input.name].push(input.value || true);
                    } else {
                        config[input.name] = [config[input.name], input.value || true];
                    }
                } else {
                    // Check if this is part of a checkbox group
                    const allWithSameName = formContainer.querySelectorAll(`input[name="${input.name}"]`);
                    if (allWithSameName.length > 1) {
                        // Checkbox group - store as array
                        config[input.name] = [input.value];
                    } else {
                        // Single checkbox - store as boolean
                        config[input.name] = true;
                    }
                }
            } else {
                // Handle unchecked single checkboxes
                const allWithSameName = formContainer.querySelectorAll(`input[name="${input.name}"]`);
                if (allWithSameName.length === 1 && !config.hasOwnProperty(input.name)) {
                    config[input.name] = false;
                }
            }
        } else if (input.type === 'radio') {
            if (input.checked) {
                config[input.name] = input.value;
            }
        } else {
            // Text, textarea, select
            if (input.name && input.value) {
                config[input.name] = input.value;
            }
        }
    });
    
    // Validate required fields
    const requiredFields = formContainer.querySelectorAll('input[required], select[required], textarea[required]');
    for (let field of requiredFields) {
        if (!field.value.trim()) {
            alert(`Please fill in the required field: ${field.previousElementSibling?.textContent || field.name}`);
            field.focus();
            return;
        }
    }
    
    // Generate task description from template
    const taskDescription = generateTaskFromTemplate(selectedTemplate, config);
    
    // Close modal
    closeTemplateModal();
    
    // Submit the generated task
    submitTaskFromTemplate(taskDescription, config);
}

function generateTaskFromTemplate(templateType, config) {
    const projectName = config.projectName || 'my-project';
    
    const templates = {
        react: `Create a complete React application called "${projectName}" with the following specifications:

Project Details:
- Name: ${projectName}
- Description: ${config.description || 'A modern React application'}

Technical Requirements:
- ${config.typescript ? 'TypeScript' : 'JavaScript'} implementation
- ${config.router ? 'React Router for navigation' : 'Single page application'}
- State management with ${config.stateManagement || 'Context API'}
- Styling with ${config.styling || 'CSS modules'}
- ${config.components ? 'Reusable UI components library' : 'Basic components'}

Features to include:
${Array.isArray(config.features) ? config.features.join(', ') : 'Basic functionality'}

Build a complete, production-ready application with package.json, build scripts, README, and all necessary configuration files.`,

        angular: `Create a complete Angular application called "${projectName}" with the following specifications:

Project Details:
- Name: ${projectName}
- Description: ${config.description || 'A modern Angular application'}

Technical Requirements:
- Latest Angular version with TypeScript
- ${config.routing ? 'Angular Router with lazy loading' : 'Single component application'}
- ${config.ssr ? 'Server-Side Rendering (Angular Universal)' : 'Client-side rendering'}
- ${config.pwa ? 'Progressive Web App features' : 'Standard web application'}
- UI framework: ${config.uiFramework || 'Angular Material'}

Features to include:
${Array.isArray(config.features) ? config.features.join(', ') : 'Basic functionality'}

Build a complete, production-ready application with package.json, build scripts, README, and all necessary configuration files.`,

        static: `Create a complete static website called "${projectName}" with the following specifications:

Project Details:
- Name: ${projectName}
- Description: ${config.description || 'A modern static website'}
- Type: ${config.siteType || 'Portfolio'}
- Pages: ${config.pages || '3-5 Pages'}

Technical Requirements:
- Modern HTML5, CSS3, and JavaScript
- CSS Framework: ${config.styling || 'Tailwind CSS'}
- ${config.responsive ? 'Fully responsive design' : 'Desktop-focused design'}
- ${config.animations ? 'CSS animations and transitions' : 'Static design'}

Features to include:
${Array.isArray(config.features) ? config.features.join(', ') : 'Basic website functionality'}

Build a complete, production-ready website with proper file structure, build process, README, and all necessary assets.`
    };
    
    return templates[templateType] || `Create a ${templateType} application with the specified configuration.`;
}

function submitTaskFromTemplate(taskDescription, config) {
    // Prevent multiple submissions
    if (window.taskSubmissionInProgress) {
        console.log('Task submission already in progress, ignoring duplicate');
        return;
    }
    window.taskSubmissionInProgress = true;
    
    // Add template info to chat
    addSystemMessage(`🚀 Generating ${selectedTemplate} project: ${config.projectName}`, 'system');
    addSystemMessage(taskDescription, 'user');
    
    // Submit to backend
    const taskData = {
        task: taskDescription,
        description: `Generated from ${selectedTemplate} template`,
        projectPath: selectedProjectPath,
        useGoose: document.getElementById('use-goose-toggle').checked,
        templateType: selectedTemplate,
        templateConfig: config
    };
    
    socket.emit('submit_task', taskData);
    
    // Update UI
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }
    
    // Reset submission flag after a delay
    setTimeout(() => {
        window.taskSubmissionInProgress = false;
    }, 2000);
}

// Initialize template system when DOM is ready
function initializeTemplateSystem() {
    // Prevent multiple initializations
    if (window.templateSystemInitialized) {
        return;
    }
    window.templateSystemInitialized = true;
    
    // Add template card click handlers
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', function() {
            const templateType = this.getAttribute('data-template');
            openTemplateModal(templateType);
        });
    });
    
    // Add modal close handlers (use event delegation to prevent duplicates)
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-btn')) {
            closeTemplateModal();
        }
        if (e.target.id === 'template-config-modal') {
            closeTemplateModal();
        }
    });
    
    // Add escape key handler
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('template-config-modal').style.display === 'block') {
            closeTemplateModal();
        }
    });
}

// Make functions available globally
window.closeTemplateModal = closeTemplateModal;
window.generateFromTemplate = generateFromTemplate;

// Export functions for debugging (remove in production)
window.gooseDebug = {
    addDemoAgent,
    agents,
    socket,
    openTemplateModal,
    templateConfigs
}; 

/**
 * Create a collapsible output section for an agent
 */
function createAgentOutputSection(sessionId, agentName, taskName) {
    const chatMessages = document.getElementById('chat-messages');
    
    const agentSection = document.createElement('div');
    agentSection.className = 'agent-output-section';
    agentSection.id = `agent-section-${sessionId}`;
    
    agentSection.innerHTML = `
        <div class="agent-header" onclick="toggleAgentOutput('${sessionId}')">
            <div class="agent-info">
                <i class="fas fa-robot agent-icon"></i>
                <span class="agent-name">${agentName}</span>
                <span class="agent-task">${taskName}</span>
            </div>
            <div class="agent-status">
                <div class="activity-indicator" id="activity-${sessionId}">
                    <div class="pulse"></div>
                </div>
                <span class="status-text" id="status-${sessionId}">Working...</span>
                <i class="fas fa-chevron-down toggle-icon" id="toggle-${sessionId}"></i>
            </div>
        </div>
        <div class="agent-output-content" id="output-${sessionId}">
            <div class="important-output" id="important-${sessionId}"></div>
            <div class="detailed-output-container">
                <div class="detailed-output-toggle" onclick="toggleDetailedOutput('${sessionId}')">
                    <i class="fas fa-terminal"></i>
                    <span>Show Detailed Logs</span>
                    <i class="fas fa-chevron-right detailed-toggle-icon" id="detailed-toggle-${sessionId}"></i>
                </div>
                <div class="detailed-output collapsed" id="detailed-${sessionId}"></div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(agentSection);
    agentOutputSections.set(sessionId, {
        element: agentSection,
        agentName: agentName,
        taskName: taskName,
        status: 'working'
    });
    
    scrollToBottom();
}

/**
 * Display agent output in the appropriate section
 */
function displayAgentOutput(sessionId, output, type, level) {
    const importantOutput = document.getElementById(`important-${sessionId}`);
    if (!importantOutput) return;
    
    const outputElement = document.createElement('div');
    outputElement.className = `output-line ${type} ${level}`;
    
    // Add appropriate icons based on type
    let icon = '';
    switch (type) {
        case 'progress':
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        case 'task':
            icon = '<i class="fas fa-tasks"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    outputElement.innerHTML = `${icon} <span class="output-text">${output}</span>`;
    importantOutput.appendChild(outputElement);
    
    // Auto-scroll if section is visible
    const section = agentOutputSections.get(sessionId);
    if (section && !section.element.classList.contains('collapsed')) {
        importantOutput.scrollTop = importantOutput.scrollHeight;
    }
}

/**
 * Add detailed output to the collapsible detailed section
 */
function addDetailedOutput(sessionId, output, type) {
    const detailedOutput = document.getElementById(`detailed-${sessionId}`);
    if (!detailedOutput) return;
    
    const outputElement = document.createElement('div');
    outputElement.className = `detailed-line ${type}`;
    outputElement.innerHTML = `<span class="timestamp">${new Date().toLocaleTimeString()}</span> ${output}`;
    
    detailedOutput.appendChild(outputElement);
    
    // Auto-scroll if detailed section is visible
    if (!detailedOutput.classList.contains('collapsed')) {
        detailedOutput.scrollTop = detailedOutput.scrollHeight;
    }
}

/**
 * Update session activity indicator
 */
function updateSessionActivity(sessionId, lastActivity, inactivityTime) {
    const activityIndicator = document.getElementById(`activity-${sessionId}`);
    const statusText = document.getElementById(`status-${sessionId}`);
    
    if (activityIndicator && statusText) {
        if (inactivityTime > 60) { // More than 1 minute inactive
            activityIndicator.className = 'activity-indicator inactive';
            statusText.textContent = `Inactive for ${inactivityTime}s`;
        } else {
            activityIndicator.className = 'activity-indicator active';
            statusText.textContent = 'Working...';
        }
    }
}

/**
 * Finalize agent output section when task completes
 */
function finalizeAgentOutputSection(sessionId, status) {
    const section = agentOutputSections.get(sessionId);
    if (!section) return;
    
    const activityIndicator = document.getElementById(`activity-${sessionId}`);
    const statusText = document.getElementById(`status-${sessionId}`);
    
    if (activityIndicator && statusText) {
        activityIndicator.className = `activity-indicator ${status}`;
        statusText.textContent = status === 'completed' ? 'Completed' : 'Failed';
    }
    
    section.status = status;
    
    // Auto-collapse completed sections after 5 seconds
    if (status === 'completed') {
        setTimeout(() => {
            const agentSection = document.getElementById(`agent-section-${sessionId}`);
            if (agentSection) {
                agentSection.classList.add('collapsed');
                const toggleIcon = document.getElementById(`toggle-${sessionId}`);
                if (toggleIcon) {
                    toggleIcon.classList.remove('fa-chevron-down');
                    toggleIcon.classList.add('fa-chevron-right');
                }
            }
        }, 5000);
    }
}

/**
 * Toggle agent output section visibility
 */
function toggleAgentOutput(sessionId) {
    const outputContent = document.getElementById(`output-${sessionId}`);
    const toggleIcon = document.getElementById(`toggle-${sessionId}`);
    const agentSection = document.getElementById(`agent-section-${sessionId}`);
    
    if (outputContent && toggleIcon && agentSection) {
        if (agentSection.classList.contains('collapsed')) {
            agentSection.classList.remove('collapsed');
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-down');
        } else {
            agentSection.classList.add('collapsed');
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-right');
        }
    }
}

/**
 * Toggle detailed output visibility
 */
function toggleDetailedOutput(sessionId) {
    const detailedOutput = document.getElementById(`detailed-${sessionId}`);
    const toggleIcon = document.getElementById(`detailed-toggle-${sessionId}`);
    
    if (detailedOutput && toggleIcon) {
        if (detailedOutput.classList.contains('collapsed')) {
            detailedOutput.classList.remove('collapsed');
            toggleIcon.classList.remove('fa-chevron-right');
            toggleIcon.classList.add('fa-chevron-down');
        } else {
            detailedOutput.classList.add('collapsed');
            toggleIcon.classList.remove('fa-chevron-down');
            toggleIcon.classList.add('fa-chevron-right');
        }
    }
}

/**
 * Clean up agent output sections after task completion
 */
function cleanupAgentOutputSections() {
    // Auto-collapse all completed sections after 10 seconds
    setTimeout(() => {
        agentOutputSections.forEach((section, sessionId) => {
            if (section.status === 'completed') {
                const agentSection = document.getElementById(`agent-section-${sessionId}`);
                if (agentSection) {
                    agentSection.classList.add('collapsed');
                    const toggleIcon = document.getElementById(`toggle-${sessionId}`);
                    if (toggleIcon) {
                        toggleIcon.classList.remove('fa-chevron-down');
                        toggleIcon.classList.add('fa-chevron-right');
                    }
                }
            }
        });
    }, 10000);
} 