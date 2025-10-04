#!/usr/bin/env node
/**
 * Web Server for MCP Todo Tasks
 * 
 * Production-ready web interface with real MCP server integration
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Simple logger for web server
class WebLogger {
  private logLevel: string;

  constructor(logLevel: string = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    return levels.indexOf(level) <= levels.indexOf(this.logLevel);
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}

interface Todo {
  id: string;
  name: string;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
  projectId: string;
  priority: number;
  tags: string[];
}

interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

class WebServer {
  private port: number;
  private dataDir: string;
  private mcpServerUrl: string;
  private logger: WebLogger;

  constructor(port?: number) {
    this.port = port || parseInt(process.env.SERVER_PORT || process.env.PORT || '3300');
    this.dataDir = join(process.cwd(), '.mcp-todo-data');
    this.mcpServerUrl = process.env.MCP_SERVER_URL || `${process.env.BASE_URL || 'http://localhost'}:${this.port}`;
    this.logger = new WebLogger(process.env.LOG_LEVEL || 'info');
  }

  private loadData(): { todos: Todo[], projects: Map<string, Project> } {
    const todos: Todo[] = [];
    const projects = new Map<string, Project>();

    // Load todos
    const todosFile = join(this.dataDir, 'todos.json');
    if (existsSync(todosFile)) {
      try {
        const todosData = JSON.parse(readFileSync(todosFile, 'utf8'));
        Object.values(todosData).forEach(todo => todos.push(todo as Todo));
      } catch (error) {
        this.logger.error('Failed to load todos:', error);
      }
    }

    // Load projects
    const projectsFile = join(this.dataDir, 'projects.json');
    if (existsSync(projectsFile)) {
      try {
        const projectsData = JSON.parse(readFileSync(projectsFile, 'utf8'));
        Object.entries(projectsData).forEach(([id, project]) => {
          projects.set(id, project as Project);
        });
      } catch (error) {
        this.logger.error('Failed to load projects:', error);
      }
    }

    return { todos, projects };
  }

  private generateHTML(todos: Todo[], projects: Map<string, Project>): string {
    const projectGroups = new Map<string, Todo[]>();
    
    // Group todos by project
    todos.forEach(todo => {
      if (!projectGroups.has(todo.projectId)) {
        projectGroups.set(todo.projectId, []);
      }
      projectGroups.get(todo.projectId)!.push(todo);
    });

    // Sort todos by priority (desc) then by creation date (desc)
    projectGroups.forEach(projectTodos => {
      projectTodos.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });

    const totalTodos = todos.length;
    const completedTodos = todos.filter(todo => todo.status === 'completed').length;
    const pendingTodos = todos.filter(todo => todo.status === 'pending').length;
    const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Todo Tasks</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.08);
            border-left: 4px solid #4facfe;
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: #4facfe;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .projects {
            padding: 30px;
        }
        
        .project-section {
            margin-bottom: 40px;
        }
        
        .project-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e9ecef;
        }
        
        .project-icon {
            font-size: 1.5rem;
            margin-right: 10px;
        }
        
        .project-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
        }
        
        .project-count {
            background: #4facfe;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            margin-left: 10px;
        }
        
        .todos-grid {
            display: grid;
            gap: 15px;
        }
        
        .todo-item {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .todo-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        .todo-item.completed {
            opacity: 0.7;
            background: #f8f9fa;
        }
        
        .todo-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .todo-status {
            font-size: 1.2rem;
            margin-right: 10px;
        }
        
        .todo-name {
            font-size: 1.1rem;
            font-weight: 600;
            color: #333;
            flex: 1;
        }
        
        .todo-priority {
            background: #ff6b6b;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .todo-priority.high { background: #ff6b6b; }
        .todo-priority.medium { background: #ffa726; }
        .todo-priority.low { background: #66bb6a; }
        
        .todo-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 15px;
            font-size: 0.9rem;
            color: #666;
        }
        
        .todo-tags {
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        }
        
        .todo-tag {
            background: #e3f2fd;
            color: #1976d2;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8rem;
        }
        
        .todo-date {
            font-size: 0.8rem;
            color: #999;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
        }
        
        .empty-state .icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #4facfe;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 20px;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(79, 172, 254, 0.4);
            transition: all 0.3s ease;
        }
        
        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(79, 172, 254, 0.6);
        }
        
        .tools-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 300px;
        }
        
        .tools-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .tool-btn {
            display: block;
            width: 100%;
            background: #4facfe;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 15px;
            margin-bottom: 8px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: left;
        }
        
        .tool-btn:hover {
            background: #3d8bfe;
            transform: translateX(5px);
        }
        
        .tool-btn.danger {
            background: #ff6b6b;
        }
        
        .tool-btn.danger:hover {
            background: #ff5252;
        }
        
        .tool-btn.success {
            background: #66bb6a;
        }
        
        .tool-btn.success:hover {
            background: #4caf50;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2000;
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .modal-title {
            font-size: 1.3rem;
            font-weight: 600;
            color: #333;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
        }
        
        .form-input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #4facfe;
            box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
        }
        
        .form-select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            background: white;
        }
        
        .form-textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            resize: vertical;
            min-height: 80px;
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        
        .submit-btn {
            background: #4facfe;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 12px 25px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }
        
        .submit-btn:hover {
            background: #3d8bfe;
        }
        
        .todo-actions {
            display: flex;
            gap: 5px;
            margin-top: 10px;
        }
        
        .action-btn {
            padding: 5px 10px;
            border: none;
            border-radius: 5px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .action-btn.complete {
            background: #66bb6a;
            color: white;
        }
        
        .action-btn.delete {
            background: #ff6b6b;
            color: white;
        }
        
        .action-btn:hover {
            opacity: 0.8;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .stats {
                grid-template-columns: repeat(2, 1fr);
                padding: 20px;
            }
            
            .projects {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 MCP Todo Tasks</h1>
            <p>Your personal task management dashboard</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${totalTodos}</div>
                <div class="stat-label">Total Tasks</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${pendingTodos}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${completedTodos}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${completionRate}%</div>
                <div class="stat-label">Completion Rate</div>
            </div>
        </div>
        
        <div class="tools-panel">
            <div class="tools-title">🛠️ MCP Tools</div>
            <button class="tool-btn" onclick="openModal('addModal')">➕ Add Task</button>
            <button class="tool-btn" onclick="openModal('listModal')">📋 List Tasks</button>
            <button class="tool-btn" onclick="openModal('markDoneModal')">✅ Mark Done</button>
            <button class="tool-btn danger" onclick="openModal('removeModal')">🗑️ Remove Task</button>
            <button class="tool-btn danger" onclick="clearAllTasks()">🧹 Clear All</button>
            <button class="tool-btn" onclick="openModal('analyzeModal')">📊 Analyze</button>
            <button class="tool-btn" onclick="openModal('projectModal')">📁 Set Project</button>
        </div>
        
        <div class="projects">
            ${projectGroups.size === 0 ? `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <h3>No tasks found</h3>
                    <p>Start adding tasks using the MCP server in Cursor IDE or use the tools panel</p>
                </div>
            ` : Array.from(projectGroups.entries()).map(([projectId, projectTodos]) => {
                const project = projects.get(projectId);
                const projectName = project ? project.name : projectId;
                
                return `
                    <div class="project-section">
                        <div class="project-header">
                            <div class="project-icon">📁</div>
                            <div class="project-title">${projectName}</div>
                            <div class="project-count">${projectTodos.length} tasks</div>
                        </div>
                        <div class="todos-grid">
                            ${projectTodos.map(todo => `
                                <div class="todo-item ${todo.status === 'completed' ? 'completed' : ''}">
                                    <div class="todo-header">
                                        <div class="todo-status">${todo.status === 'completed' ? '✅' : '⏳'}</div>
                                        <div class="todo-name">${todo.name}</div>
                                        <div class="todo-priority ${todo.priority >= 8 ? 'high' : todo.priority >= 5 ? 'medium' : 'low'}">
                                            Priority ${todo.priority}
                                        </div>
                                    </div>
                                    <div class="todo-meta">
                                        <div class="todo-tags">
                                            ${todo.tags.map(tag => `<span class="todo-tag">${tag}</span>`).join('')}
                                        </div>
                                        <div class="todo-date">
                                            Created: ${new Date(todo.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div class="todo-actions">
                                        <button class="action-btn complete" onclick="markTaskDone('${todo.id}')">✅ Done</button>
                                        <button class="action-btn delete" onclick="removeTask('${todo.id}')">🗑️ Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    </div>
    
    <!-- Modals -->
    <div id="addModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">➕ Add New Task</div>
                <button class="close-btn" onclick="closeModal('addModal')">&times;</button>
            </div>
            <form onsubmit="addTask(event)">
                <div class="form-group">
                    <label class="form-label">Task Name *</label>
                    <input type="text" class="form-input" name="name" required placeholder="Enter task name">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Priority (1-10)</label>
                        <select class="form-select" name="priority">
                            <option value="1">1 - Very Low</option>
                            <option value="2">2 - Low</option>
                            <option value="3">3 - Low</option>
                            <option value="4">4 - Low</option>
                            <option value="5" selected>5 - Medium</option>
                            <option value="6">6 - Medium</option>
                            <option value="7">7 - High</option>
                            <option value="8">8 - High</option>
                            <option value="9">9 - Very High</option>
                            <option value="10">10 - Critical</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Tags (comma-separated)</label>
                        <input type="text" class="form-input" name="tags" placeholder="urgent, backend, frontend">
                    </div>
                </div>
                <button type="submit" class="submit-btn">Add Task</button>
            </form>
        </div>
    </div>
    
    <div id="listModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">📋 List Tasks</div>
                <button class="close-btn" onclick="closeModal('listModal')">&times;</button>
            </div>
            <div class="form-group">
                <label class="form-label">Filter by Status</label>
                <select class="form-select" id="statusFilter" onchange="filterTasks()">
                    <option value="all">All Tasks</option>
                    <option value="pending">Pending Only</option>
                    <option value="completed">Completed Only</option>
                </select>
            </div>
            <div id="filteredTasks"></div>
        </div>
    </div>
    
    <div id="markDoneModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">✅ Mark Task as Done</div>
                <button class="close-btn" onclick="closeModal('markDoneModal')">&times;</button>
            </div>
            <div class="form-group">
                <label class="form-label">Select Task</label>
                <select class="form-select" id="markDoneSelect">
                    <option value="">Choose a pending task...</option>
                </select>
            </div>
            <button class="submit-btn" onclick="markSelectedDone()">Mark as Done</button>
        </div>
    </div>
    
    <div id="removeModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">🗑️ Remove Task</div>
                <button class="close-btn" onclick="closeModal('removeModal')">&times;</button>
            </div>
            <div class="form-group">
                <label class="form-label">Select Task to Remove</label>
                <select class="form-select" id="removeSelect">
                    <option value="">Choose a task...</option>
                </select>
            </div>
            <button class="submit-btn danger" onclick="removeSelectedTask()">Remove Task</button>
        </div>
    </div>
    
    <div id="analyzeModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">📊 Task Analysis</div>
                <button class="close-btn" onclick="closeModal('analyzeModal')">&times;</button>
            </div>
            <div id="analysisContent"></div>
        </div>
    </div>
    
    <div id="projectModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <div class="modal-title">📁 Set Project Context</div>
                <button class="close-btn" onclick="closeModal('projectModal')">&times;</button>
            </div>
            <form onsubmit="setProject(event)">
                <div class="form-group">
                    <label class="form-label">Project Path *</label>
                    <input type="text" class="form-input" name="path" required placeholder="/path/to/project">
                </div>
                <div class="form-group">
                    <label class="form-label">Project Name</label>
                    <input type="text" class="form-input" name="name" placeholder="My Awesome Project">
                </div>
                <button type="submit" class="submit-btn">Set Project</button>
            </form>
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">
        🔄 Refresh
    </button>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => {
            location.reload();
        }, 30000);
        
        // Modal functions
        function openModal(modalId) {
            document.getElementById(modalId).style.display = 'block';
            if (modalId === 'listModal') filterTasks();
            if (modalId === 'markDoneModal') loadPendingTasks();
            if (modalId === 'removeModal') loadAllTasks();
            if (modalId === 'analyzeModal') loadAnalysis();
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
        
        // Add task
        function addTask(event) {
            event.preventDefault();
            const formData = new FormData(event.target);
            const taskData = {
                name: formData.get('name'),
                priority: parseInt(formData.get('priority')),
                tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
            };
            
            // Call MCP server
            callMCPServer('todo_add', taskData).then(() => {
                closeModal('addModal');
                location.reload();
            }).catch(error => {
                alert('Error adding task: ' + error.message);
            });
        }
        
        // Set project
        function setProject(event) {
            event.preventDefault();
            const formData = new FormData(event.target);
            const projectData = {
                path: formData.get('path'),
                name: formData.get('name') || formData.get('path')
            };
            
            callMCPServer('project_set', projectData).then(() => {
                closeModal('projectModal');
                location.reload();
            }).catch(error => {
                alert('Error setting project: ' + error.message);
            });
        }
        
        // Load pending tasks for mark done
        function loadPendingTasks() {
            const select = document.getElementById('markDoneSelect');
            select.innerHTML = '<option value="">Choose a pending task...</option>';
            
            // Get current tasks from the page
            const taskElements = document.querySelectorAll('.todo-item');
            taskElements.forEach(element => {
                if (!element.classList.contains('completed')) {
                    const name = element.querySelector('.todo-name').textContent;
                    const id = element.querySelector('.todo-name').textContent.match(/ID: (todo_[^)]+)/);
                    if (id) {
                        const option = document.createElement('option');
                        option.value = id[1];
                        option.textContent = name;
                        select.appendChild(option);
                    }
                }
            });
        }
        
        // Load all tasks for removal
        function loadAllTasks() {
            const select = document.getElementById('removeSelect');
            select.innerHTML = '<option value="">Choose a task...</option>';
            
            const taskElements = document.querySelectorAll('.todo-item');
            taskElements.forEach(element => {
                const name = element.querySelector('.todo-name').textContent;
                const id = element.querySelector('.todo-name').textContent.match(/ID: (todo_[^)]+)/);
                if (id) {
                    const option = document.createElement('option');
                    option.value = id[1];
                    option.textContent = name;
                    select.appendChild(option);
                }
            });
        }
        
        // Filter tasks
        function filterTasks() {
            const status = document.getElementById('statusFilter').value;
            const container = document.getElementById('filteredTasks');
            
            // This is a simplified version - in a real app you'd call the MCP server
            container.innerHTML = '<p>Filter functionality would call MCP server with status: ' + status + '</p>';
        }
        
        // Load analysis
        function loadAnalysis() {
            const container = document.getElementById('analysisContent');
            container.innerHTML = '<p>Loading analysis...</p>';
            
            // This would call the MCP server in a real implementation
            callMCPServer('todo_analyze', {}).then(result => {
                container.innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
            }).catch(error => {
                container.innerHTML = '<p>Error loading analysis: ' + error.message + '</p>';
            });
        }
        
        // Mark task as done
        function markTaskDone(taskId) {
            callMCPServer('todo_mark_done', { id: taskId }).then(() => {
                location.reload();
            }).catch(error => {
                alert('Error marking task as done: ' + error.message);
            });
        }
        
        // Mark selected task as done
        function markSelectedDone() {
            const taskId = document.getElementById('markDoneSelect').value;
            if (taskId) {
                markTaskDone(taskId);
            }
        }
        
        // Remove task
        function removeTask(taskId) {
            if (confirm('Are you sure you want to remove this task?')) {
                callMCPServer('todo_remove', { id: taskId }).then(() => {
                    location.reload();
                }).catch(error => {
                    alert('Error removing task: ' + error.message);
                });
            }
        }
        
        // Remove selected task
        function removeSelectedTask() {
            const taskId = document.getElementById('removeSelect').value;
            if (taskId) {
                removeTask(taskId);
            }
        }
        
        // Clear all tasks
        function clearAllTasks() {
            if (confirm('Are you sure you want to clear ALL tasks? This cannot be undone!')) {
                callMCPServer('todo_clear', {}).then(() => {
                    location.reload();
                }).catch(error => {
                    alert('Error clearing tasks: ' + error.message);
                });
            }
        }
        
        // Call MCP server with real HTTP requests
        async function callMCPServer(tool, params) {
            try {
                const mcpUrl = '${this.mcpServerUrl}/mcp';
                const response = await fetch(mcpUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: Date.now(),
                        method: 'tools/call',
                        params: {
                            name: tool,
                            arguments: params
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error('HTTP error! status: ' + response.status);
                }

                const result = await response.json();
                
                if (result.error) {
                    throw new Error(result.error.message || 'MCP server error');
                }

                return result.result;
            } catch (error) {
                console.error('MCP server call failed:', error);
                throw error;
            }
        }
    </script>
</body>
</html>`;
  }

  private handleRequest(req: any, res: any): void {
    // Health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: this.port,
        mcpServerUrl: this.mcpServerUrl,
        uptime: process.uptime()
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
      return;
    }

    // Main web interface
    if (req.method === 'GET' && req.url === '/') {
      try {
        const { todos, projects } = this.loadData();
        const html = this.generateHTML(todos, projects);
        
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        });
        res.end(html);
      } catch (error) {
        this.logger.error('Failed to generate HTML:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  public start(): void {
    const server = createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, () => {
      this.logger.info(`🌐 Web server running at ${process.env.BASE_URL || 'http://localhost'}:${this.port}`);
      this.logger.info(`📋 View your tasks in the browser!`);
      this.logger.info(`🔄 Auto-refreshes every 30 seconds`);
      this.logger.info(`🔗 MCP Server URL: ${this.mcpServerUrl}`);
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        this.logger.error(`❌ Port ${this.port} is already in use`);
        this.logger.error(`   Try a different port or stop the other service`);
      } else {
        this.logger.error('Server error:', error);
      }
    });
  }
}

// Start the web server
const port = parseInt(process.env.SERVER_PORT || process.env.PORT || '3300');
new WebServer(port).start();
