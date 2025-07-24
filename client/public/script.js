// Socket.IO connection - Initialize once
let socket;

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
const setupPanel = document.getElementById('setup-panel');
const agentsPanel = document.getElementById('agents-panel');
const consoleMessages = document.getElementById('console-messages');
const visitProjectBtn = document.getElementById('visit-project-btn');
const openIdeBtn = document.getElementById('open-ide-btn');
const backToSetupBtn = document.getElementById('back-to-setup-btn');
const agentModal = document.getElementById('agent-modal');
const modalAgentName = document.getElementById('modal-agent-name');
const modalAgentDetails = document.getElementById('modal-agent-details');

// Directory selection elements
const gooseStatusIndicator = document.getElementById('goose-status-indicator');
const gooseStatusText = document.getElementById('goose-status-text');
const currentPathText = document.getElementById('current-path-text');
const directoryList = document.getElementById('directory-list');
const selectedPath = document.getElementById('selected-path');
const parentDirBtn = document.getElementById('parent-dir-btn');
const refreshDirBtn = document.getElementById('refresh-dir-btn');
const createDirBtn = document.getElementById('create-dir-btn');
const createDirModal = document.getElementById('create-dir-modal');
const newDirName = document.getElementById('new-dir-name');
const parentDirDisplay = document.getElementById('parent-dir-display');

// Project name elements
const projectNameInput = document.getElementById('project-name-input');
const projectPathPreview = document.getElementById('project-path-preview');
const fullProjectPath = document.getElementById('full-project-path');

// State
let agents = new Map();
let completedTasks = 0;
let startTime = Date.now();
let uptimeInterval;
let currentDirectory = '';
let selectedProjectPath = '';
let projectName = '';
let finalProjectPath = '';
let gooseAvailable = false;
let currentSessionId = null;
let currentPlanId = null;
let currentPlan = null;

// Agent type icons
const AGENT_ICONS = {
    'orchestrator': 'fas fa-crown',
    'code_generator': 'fas fa-code',
    'code_reviewer': 'fas fa-search',
    'tester': 'fas fa-bug',
    'documentation': 'fas fa-file-alt',
    'deployment': 'fas fa-rocket',
    // TaskOrchestrator agent types
    'frontend_specialist': 'fab fa-react',
    'backend_specialist': 'fas fa-server',
    'database_architect': 'fas fa-database',
    'test_engineer': 'fas fa-vial',
    'devops_engineer': 'fab fa-docker',
    'documentation_specialist': 'fas fa-book',
    'security_specialist': 'fas fa-shield-alt'
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection only once
    if (!socket) {
        socket = io();
        setupSocketEventHandlers();
    }
    
    initializeEventListeners();
    startUptimeCounter();
    loadHomeDirectory();
    checkGooseStatus();
    addWelcomeMessage();
});

function setupSocketEventHandlers() {
    // Socket event handlers
    socket.on('connect', () => {
        if (connectionStatus) {
            connectionStatus.className = 'status-dot online';
        }
        if (connectionText) {
            connectionText.textContent = 'Connected';
        }
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        if (connectionStatus) {
            connectionStatus.className = 'status-dot offline';
        }
        if (connectionText) {
            connectionText.textContent = 'Disconnected';
        }
        console.log('Disconnected from server');
    });

    socket.on('agents_update', (agentsData) => {
        // Handle both array and object formats
        let agentsArray;
        if (Array.isArray(agentsData)) {
            agentsArray = agentsData;
        } else if (typeof agentsData === 'object' && agentsData !== null) {
            // Convert object to array
            agentsArray = Object.values(agentsData);
        } else {
            console.warn('Invalid agents data format:', agentsData);
            return;
        }
        
        // Prevent processing if we have too many agents (infinite loop protection)
        if (agentsArray.length > 50) {
            console.warn('Too many agents detected, possible infinite loop. Limiting to 50 agents.');
            agentsArray = agentsArray.slice(0, 50);
        }
        
        agents.clear();
        agentsArray.forEach(agent => {
            agents.set(agent.id, agent);
        });
        updateAgentsDisplay();
    });

    socket.on('agent_created', (agent) => {
        agents.set(agent.id, agent);
        updateAgentsDisplay();
        console.log('New agent created:', agent.name);
    });

    socket.on('agent_status_update', (update) => {
        const agent = agents.get(update.agentId);
        if (agent) {
            agent.status = update.status;
            agent.progress = update.progress;
            if (update.message) {
                // Ensure logs array exists
                if (!agent.logs) {
                    agent.logs = [];
                }
                agent.logs.push({
                    timestamp: update.timestamp,
                    message: update.message
                });
            }
            updateAgentsDisplay();
        }
    });

    socket.on('project_orchestrated', (data) => {
        console.log('Project orchestrated:', data);
        addSystemMessage('🚀 Project orchestrated successfully! AI agents are now working on your application...', 'success');
        switchToAgentsView();
    });

    socket.on('orchestration_error', (data) => {
        console.error('Orchestration error:', data.error);
        addSystemMessage(`❌ Orchestration failed: ${data.error}`, 'error');
        
        // Re-enable form
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i><span>Build Application</span>';
        }
    });

    socket.on('task_execution_error', (data) => {
        console.error('Task execution error:', data.error);
        addSystemMessage(`❌ Task execution error: ${data.error}`, 'error');
    });

    socket.on('project_completed', (data) => {
        console.log('Project completed:', data);
        addSystemMessage('🎉 Project completed successfully!', 'success');
        
        // Re-enable form
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i><span>Build Application</span>';
        }
        
        // Show project actions
        showProjectActions();
    });

    socket.on('task_completed', (data) => {
        addSystemMessage(data.message, 'success');
        if (data.summary) {
            let summaryText = `📊 Task Summary:\n• Project: ${data.summary.task}\n• Subtasks: ${data.summary.subtasksCompleted}/${data.summary.totalSubtasks}\n• Agents: ${data.summary.agentsUsed}\n• Duration: ${data.summary.duration}\n• Status: ${data.summary.status}`;
            
            // Add build validation info
            if (data.summary.buildValidation) {
                const validation = data.summary.buildValidation;
                if (validation.buildable) {
                    summaryText += `\n\n✅ PROJECT IS READY!\n📋 Run: ${validation.instructions.join(' && ')}`;
                    showProjectActions();
                } else {
                    summaryText += `\n\n⚠️ Build validation: Some components missing`;
                }
            }
            
            addSystemMessage(summaryText, 'summary');
        }
        
        // Re-enable form
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i><span>Build Application</span>';
        }
        
        currentPlanId = null;
        currentPlan = null;
        completedTasks++;
        if (completedTasksCount) {
            completedTasksCount.textContent = completedTasks;
        }
        
        // Add completion message to console
        addConsoleMessage('🎉 Development completed successfully! Your application is ready.', 'success');
        showProjectActions();
    });

    socket.on('task_error', (data) => {
        addSystemMessage(`❌ Error: ${data.error}`, 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i><span>Build Application</span>';
        }
        currentPlanId = null;
        currentPlan = null;
    });

    socket.on('task_cancelled', (data) => {
        // Re-enable form
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-rocket"></i><span>Build Application</span>';
        }
        
        addSystemMessage(data.message, 'system');
        currentSessionId = null;
        currentPlanId = null;
        currentPlan = null;
    });

    // Multi-agent coordination events
    socket.on('execution_plan_created', (plan) => {
        currentPlan = plan;
        currentPlanId = plan.id;
        displayExecutionPlan(plan);
        addSystemMessage(`🎯 Multi-agent plan created with ${plan.subtasks.length} specialized tasks`, 'system');
        
        // Switch to agents view
        switchToAgentsView();
    });

    socket.on('subtask_started', (data) => {
        addSystemMessage(`🚀 Started: ${data.subtaskName}`, 'system');
    });

    socket.on('subtask_completed', (data) => {
        addSystemMessage(`✅ Completed: ${data.subtaskName} (${data.duration})`, 'success');
    });

    socket.on('subtask_failed', (data) => {
        addSystemMessage(`❌ Failed: ${data.subtaskName} - ${data.error}`, 'error');
    });

    // QA Verification events
    socket.on('qa_verification_started', (data) => {
        addSystemMessage(`🔍 Quality assurance started for: ${data.taskTitle}`, 'system');
    });

    socket.on('qa_verification_completed', (data) => {
        const statusIcon = data.passed ? '✅' : '❌';
        const statusText = data.passed ? 'PASSED' : 'FAILED';
        const scoreText = (data.score * 100).toFixed(1);
        
        addSystemMessage(`${statusIcon} QA Verification ${statusText} (Score: ${scoreText}%)`, 
                         data.passed ? 'success' : 'error');
        
        if (!data.passed && data.issues.length > 0) {
            addSystemMessage(`⚠️ Issues: ${data.issues.slice(0, 3).join(', ')}`, 'warning');
        }
    });

    socket.on('build_validation', (data) => {
        const validation = data.validation;
        if (validation.buildable) {
            addSystemMessage(`🔨 Build validation: Project is ready to build and run!`, 'success');
            if (validation.instructions.length > 0) {
                addSystemMessage(`📋 Quick start: ${validation.instructions[0]}`, 'system');
            }
            showProjectActions();
        } else {
            let issues = [];
            if (!validation.hasPackageJson) issues.push('missing package.json');
            if (!validation.hasReadme) issues.push('missing README');
            if (!validation.hasSourceFiles) issues.push('missing source files');
            
            addSystemMessage(`⚠️ Build validation: ${issues.join(', ')}`, 'error');
        }
    });
}

function initializeEventListeners() {
    // Form submission
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }
    
    // Example task buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const task = this.getAttribute('data-task');
            if (taskInput) {
                taskInput.value = task;
                taskInput.focus();
            }
        });
    });
    
    // Project action buttons
    if (visitProjectBtn) {
        visitProjectBtn.addEventListener('click', visitProject);
    }
    if (openIdeBtn) {
        openIdeBtn.addEventListener('click', openInIde);
    }
    if (backToSetupBtn) {
        backToSetupBtn.addEventListener('click', switchToSetupView);
    }
    
    // Directory navigation
    if (parentDirBtn) {
        parentDirBtn.addEventListener('click', goToParentDirectory);
    }
    if (refreshDirBtn) {
        refreshDirBtn.addEventListener('click', refreshCurrentDirectory);
    }
    if (createDirBtn) {
        createDirBtn.addEventListener('click', showCreateDirModal);
    }
    
    // Project name input
    if (projectNameInput) {
        projectNameInput.addEventListener('input', updateProjectPathPreview);
        projectNameInput.addEventListener('blur', sanitizeProjectName);
    }
    
    // Modal close events
    window.addEventListener('click', function(event) {
        // Close agent modal
        if (event.target === agentModal) {
            closeModal();
        }
        // Close create directory modal
        if (event.target === createDirModal) {
            closeCreateDirModal();
        }
    });
    
    // Handle close button clicks
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('close-btn')) {
            // Find the parent modal and close it
            const modal = event.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
            closeCreateDirModal();
        }
    });
    
    // Console controls
    const clearConsoleBtn = document.getElementById('clear-console-btn');
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', clearConsole);
    }
}

async function checkGooseStatus() {
    try {
        if (gooseStatusIndicator) {
            gooseStatusIndicator.className = 'status-indicator checking';
        }
        if (gooseStatusText) {
            gooseStatusText.textContent = 'Checking System Status...';
        }
        
        const response = await fetch('/api/goose-status');
        const data = await response.json();
        
        if (data.available) {
            gooseAvailable = true;
            if (gooseStatusIndicator) {
                gooseStatusIndicator.className = 'status-indicator available';
            }
            if (gooseStatusText) {
                gooseStatusText.textContent = 'System Ready';
            }
            console.log('Goose CLI available:', data.config);
        } else {
            gooseAvailable = false;
            if (gooseStatusIndicator) {
                gooseStatusIndicator.className = 'status-indicator unavailable';
            }
            if (gooseStatusText) {
                gooseStatusText.textContent = data.message || 'System Not Available';
            }
            console.warn('Goose CLI not available:', data.error);
        }
    } catch (error) {
        console.error('Error checking Goose status:', error);
        gooseAvailable = false;
        if (gooseStatusIndicator) {
            gooseStatusIndicator.className = 'status-indicator unavailable';
        }
        if (gooseStatusText) {
            gooseStatusText.textContent = 'Error checking system status';
        }
    }
}

async function loadHomeDirectory() {
    try {
        if (currentPathText) {
            currentPathText.textContent = 'Loading...';
        }
        if (directoryList) {
            directoryList.innerHTML = '<div class="loading">Loading directories...</div>';
        }
        
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
        if (currentPathText) {
            currentPathText.textContent = 'Error loading directory';
        }
        if (directoryList) {
            directoryList.innerHTML = `<div class="error">Error loading directories: ${error.message}</div>`;
        }
        
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
        if (directoryList) {
            directoryList.innerHTML = '<div class="loading">Loading...</div>';
        }
        if (currentPathText) {
            currentPathText.textContent = 'Loading...';
        }
        
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
        if (currentPathText) {
            currentPathText.textContent = currentDirectory || 'Error';
        }
        if (directoryList) {
            directoryList.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
        addSystemMessage(`Error loading directory: ${error.message}`, 'error');
    }
}

function updateDirectoryDisplay(data) {
    if (currentPathText) {
        currentPathText.textContent = data.currentPath;
    }
    
    // Update parent button state
    if (parentDirBtn) {
        parentDirBtn.disabled = data.currentPath === data.parent;
    }
    
    // Clear and populate directory list
    if (directoryList) {
        directoryList.innerHTML = '';
    }
    
    if (data.directories.length === 0) {
        if (directoryList) {
            directoryList.innerHTML = '<div class="empty">No directories found</div>';
        }
        return;
    }
    
    if (directoryList) {
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
}

function selectDirectory(path) {
    // Update visual selection
    document.querySelectorAll('.directory-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    event.currentTarget.classList.add('selected');
    
    // Update selected path
    selectedProjectPath = path;
    if (selectedPath) {
        selectedPath.textContent = path;
    }
    
    // Update project path preview
    updateProjectPathPreview();
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
    if (parentDirDisplay) {
        parentDirDisplay.textContent = currentDirectory;
    }
    if (newDirName) {
        newDirName.value = '';
    }
    if (createDirModal) {
        createDirModal.style.display = 'block';
    }
    if (newDirName) {
        newDirName.focus();
    }
}

function closeCreateDirModal() {
    if (createDirModal) {
        createDirModal.style.display = 'none';
    }
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
            addSystemMessage(`✅ Directory '${dirName}' created successfully`, 'success');
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
        addSystemMessage(`❌ Error creating directory: ${error.message}`, 'error');
    }
}

function updateProjectPathPreview() {
    if (!projectNameInput || !projectPathPreview || !fullProjectPath) return;
    
    const name = projectNameInput.value.trim();
    projectName = name;
    
    if (name && selectedProjectPath) {
        finalProjectPath = `${selectedProjectPath}/${name}`;
        fullProjectPath.textContent = finalProjectPath;
        projectPathPreview.style.display = 'block';
    } else {
        projectPathPreview.style.display = 'none';
        finalProjectPath = '';
    }
}

function sanitizeProjectName() {
    if (!projectNameInput) return;
    
    let name = projectNameInput.value.trim();
    // Remove special characters and replace spaces with hyphens
    name = name.replace(/[^a-zA-Z0-9\s-_]/g, '');
    name = name.replace(/\s+/g, '-');
    name = name.toLowerCase();
    
    if (name !== projectNameInput.value) {
        projectNameInput.value = name;
        updateProjectPathPreview();
    }
}

function handleTaskSubmit(event) {
    event.preventDefault();
    
    const task = taskInput.value.trim();
    if (!task) return;
    
    // Check if project directory is selected
    if (!selectedProjectPath) {
        addSystemMessage('❌ Please select a project directory before starting', 'error');
        return;
    }
    
    // Check if project name is provided
    if (!projectName) {
        addSystemMessage('❌ Please enter a project name before starting', 'error');
        return;
    }
    
    // Disable form during processing
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Building...</span>';
    }
    
    // Add user message to chat
    addUserMessage(task);
    
    // Show project path in chat if selected
    if (finalProjectPath) {
        addSystemMessage(`📁 Project location: ${finalProjectPath}`, 'system');
    }
    
    // Send task to server
    const taskData = {
        task: task,
        description: `User requested: ${task}`,
        projectPath: finalProjectPath || selectedProjectPath,
        projectName: projectName,
        useGoose: true
    };
    
    socket.emit('submit_task', taskData);
    
    // Clear input
    if (taskInput) {
        taskInput.value = '';
    }
}

function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message user';
    messageElement.innerHTML = `
        <div class="message-content">
            <i class="fas fa-user"></i>
            <div class="message-text">
                <strong>You:</strong> ${message}
            </div>
        </div>
    `;
    if (chatMessages) {
        chatMessages.appendChild(messageElement);
    }
    scrollToBottom();
}

function addSystemMessage(message, type = 'system') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    let icon = 'fas fa-info-circle';
    let title = 'System';
    
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            title = 'Success';
            break;
        case 'error':
            icon = 'fas fa-exclamation-triangle';
            title = 'Error';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-circle';
            title = 'Warning';
            break;
        case 'summary':
            icon = 'fas fa-chart-bar';
            title = 'Summary';
            break;
    }
    
    messageElement.innerHTML = `
        <div class="message-content">
            <i class="${icon}"></i>
            <div class="message-text">
                <strong>${title}:</strong> ${message.replace(/\n/g, '<br>')}
            </div>
        </div>
    `;
    
    if (chatMessages) {
        chatMessages.appendChild(messageElement);
    }
    scrollToBottom();
    
    // Also add to console if agents panel is visible
    if (agentsPanel && agentsPanel.style.display !== 'none') {
        addConsoleMessage(message, type);
    }
}

function addConsoleMessage(message, type = 'info') {
    if (!consoleMessages) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const messageElement = document.createElement('div');
    messageElement.className = `console-line ${type}`;
    
    let prefix = '';
    switch (type) {
        case 'success':
            prefix = '✅ ';
            break;
        case 'error':
            prefix = '❌ ';
            break;
        case 'warning':
            prefix = '⚠️ ';
            break;
        case 'system':
            prefix = '🔧 ';
            break;
        default:
            prefix = 'ℹ️ ';
    }
    
    messageElement.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${prefix}${message}`;
    consoleMessages.appendChild(messageElement);
    consoleMessages.scrollTop = consoleMessages.scrollHeight;
}

function switchToAgentsView() {
    if (setupPanel && agentsPanel) {
        setupPanel.style.display = 'none';
        agentsPanel.style.display = 'block';
        
        // Copy existing chat messages to console
        if (chatMessages && consoleMessages) {
            const messages = chatMessages.querySelectorAll('.message');
            messages.forEach(msg => {
                const type = msg.className.split(' ')[1] || 'info';
                const text = msg.querySelector('.message-text')?.textContent || msg.textContent;
                addConsoleMessage(text, type);
            });
        }
    }
}

function switchToSetupView() {
    if (setupPanel && agentsPanel) {
        setupPanel.style.display = 'flex';
        agentsPanel.style.display = 'none';
        
        // Hide project actions
        hideProjectActions();
        
        // Clear console messages
        if (consoleMessages) {
            consoleMessages.innerHTML = '';
        }
    }
}

function showProjectActions() {
    const projectActions = document.getElementById('project-actions');
    if (projectActions) {
        projectActions.style.display = 'flex';
    }
}

function hideProjectActions() {
    const projectActions = document.getElementById('project-actions');
    if (projectActions) {
        projectActions.style.display = 'none';
    }
}

function visitProject() {
    const pathToOpen = finalProjectPath || selectedProjectPath;
    if (pathToOpen) {
        fetch('/api/visit-project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ projectPath: pathToOpen })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addConsoleMessage(`Opened project directory: ${pathToOpen}`, 'success');
            } else {
                addConsoleMessage(`Failed to open project directory: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            addConsoleMessage(`Error opening project directory: ${error.message}`, 'error');
        });
    } else {
        addConsoleMessage('No project directory selected', 'error');
    }
}

function openInIde() {
    const pathToOpen = finalProjectPath || selectedProjectPath;
    if (pathToOpen) {
        fetch('/api/open-ide', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ projectPath: pathToOpen })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addConsoleMessage(`Opening project in ${data.ide || 'default IDE'}...`, 'success');
            } else {
                addConsoleMessage(`Failed to open project in IDE: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            addConsoleMessage(`Error opening project in IDE: ${error.message}`, 'error');
        });
    } else {
        addConsoleMessage('No project directory selected', 'error');
    }
}

function displayExecutionPlan(plan) {
    const planElement = document.createElement('div');
    planElement.className = 'message plan';
    
    const subtasksList = plan.subtasks.map(subtask => {
        const dependencies = subtask.dependencies.length > 0 ? 
            ` (depends on: ${subtask.dependencies.length} tasks)` : '';
        return `• ${subtask.name} - ${subtask.description}${dependencies}`;
    }).join('\n');
    
    const planText = `🎯 Execution Plan Created\n\nTask: ${plan.originalTask}\n\nSubtasks (${plan.subtasks.length}):\n${subtasksList}\n\nEstimated Time: ${plan.totalEstimatedTime} minutes`;
    
    addSystemMessage(planText, 'system');
}

function scrollToBottom() {
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function updateAgentsDisplay() {
    if (agentsContainer) {
        agentsContainer.innerHTML = '';
    }
    
    const agentArray = Array.from(agents.values());
    
    if (agentsContainer) {
        agentArray.forEach(agent => {
            const agentCard = createAgentCard(agent);
            agentsContainer.appendChild(agentCard);
        });
    }
    
    // Update stats
    if (activeAgentsCount) {
        const activeAgents = agentArray.filter(agent => 
            agent.status === 'working' || agent.status === 'idle'
        ).length;
        activeAgentsCount.textContent = activeAgents;
    }
}

function createAgentCard(agent) {
    const card = document.createElement('div');
    card.className = `agent-card ${agent.status || 'idle'}`;
    card.addEventListener('click', () => showAgentDetails(agent));
    
    const icon = AGENT_ICONS[agent.type] || 'fas fa-robot';
    
    // Handle missing properties gracefully
    const logs = agent.logs || [];
    const currentTask = agent.currentTask || 
                      (logs.length > 0 ? logs[logs.length - 1].message : 'Idle');
    const progress = agent.progress || 0;
    const status = agent.status || 'idle';
    const name = agent.name || 'Unknown Agent';
    
    card.innerHTML = `
        <div class="agent-header">
            <div class="agent-name">
                <i class="${icon}"></i>
                ${name}
            </div>
            <div class="agent-status ${status}">${status}</div>
        </div>
        <div class="agent-progress ${status}">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        <div class="agent-current-task">${currentTask}</div>
    `;
    
    return card;
}

function showAgentDetails(agent) {
    if (modalAgentName) {
        modalAgentName.textContent = `${agent.name || 'Unknown Agent'} Details`;
    }
    
    const details = `
        <div class="agent-detail-section">
            <h4><i class="fas fa-info-circle"></i> Agent Information</h4>
            <div class="agent-info-grid">
                <div class="info-item">
                    <strong>Type:</strong> ${getAgentTypeDescription(agent.type)}
                </div>
                <div class="info-item">
                    <strong>Status:</strong> <span class="status-badge ${agent.status}">${agent.status}</span>
                </div>
                <div class="info-item">
                    <strong>Progress:</strong> 
                    <div class="progress-bar-small">
                        <div class="progress-fill" style="width: ${agent.progress || 0}%"></div>
                        <span class="progress-text">${agent.progress || 0}%</span>
                    </div>
                </div>
                <div class="info-item">
                    <strong>Created:</strong> ${agent.createdAt ? new Date(agent.createdAt).toLocaleString() : 'Unknown'}
                </div>
            </div>
        </div>
        
        <div class="agent-detail-section">
            <h4><i class="fas fa-history"></i> Activity History</h4>
            <div class="agent-logs">
                ${(agent.logs && agent.logs.length > 0) ? agent.logs.map(log => `
                    <div class="log-entry">
                        <div class="log-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</div>
                        <div class="log-message">${log.message}</div>
                    </div>
                `).join('') : '<p class="no-logs">No activity logs available</p>'}
            </div>
        </div>
    `;
    
    if (modalAgentDetails) {
        modalAgentDetails.innerHTML = details;
    }
    if (agentModal) {
        agentModal.style.display = 'block';
    }
}

function closeModal() {
    if (agentModal) {
        agentModal.style.display = 'none';
    }
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
    
    if (uptimeDisplay) {
        uptimeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function clearConsole() {
    if (consoleMessages) {
        consoleMessages.innerHTML = '';
    }
}

function addWelcomeMessage() {
    // The welcome message is now in the HTML, so we don't need to add it via JavaScript
}

// Utility functions
function getAgentTypeDescription(type) {
    const descriptions = {
        'orchestrator': 'Coordinates and manages all other agents',
        'code_generator': 'Generates code based on requirements',
        'code_reviewer': 'Reviews code for quality and standards',
        'tester': 'Creates and runs tests for the code',
        'documentation': 'Creates documentation and guides',
        'deployment': 'Handles deployment and publishing',
        'frontend_specialist': 'Specializes in frontend development',
        'backend_specialist': 'Develops backend APIs and server-side logic',
        'database_architect': 'Designs and optimizes database schemas',
        'test_engineer': 'Creates comprehensive test suites and automation',
        'devops_engineer': 'Handles deployment, CI/CD, and infrastructure',
        'documentation_specialist': 'Creates technical documentation and guides',
        'security_specialist': 'Ensures security best practices and compliance'
    };
    
    return descriptions[type] || 'Specialized AI agent';
}

// Make functions available globally for modal usage
window.createDirectory = createDirectory;
window.closeCreateDirModal = closeCreateDirModal;