// Task Manager Application
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('taskmaster-tasks')) || [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.editingTaskId = null;
        this.confirmCallback = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadTheme();
        this.renderTasks();
        this.updateStats();
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Task form submission
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Theme toggle
        document.getElementById('theme-btn').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.closest('.filter-btn').dataset.filter);
            });
        });

        // Search input
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.setSearch(e.target.value);
        });

        // Clear buttons
        document.getElementById('clear-completed').addEventListener('click', () => {
            this.showConfirmModal('Are you sure you want to clear all completed tasks?', () => {
                this.clearCompleted();
            });
        });

        document.getElementById('clear-all').addEventListener('click', () => {
            this.showConfirmModal('Are you sure you want to clear ALL tasks? This cannot be undone.', () => {
                this.clearAll();
            });
        });

        // Modal events
        this.setupModalEvents();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        document.getElementById('task-input').focus();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('search-input').focus();
                        break;
                }
            }
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
    }

    setupModalEvents() {
        // Edit modal events
        document.getElementById('edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEditTask();
        });

        document.getElementById('cancel-edit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.querySelector('#edit-modal .modal-close').addEventListener('click', () => {
            this.closeEditModal();
        });

        // Confirm modal events
        document.getElementById('cancel-confirm').addEventListener('click', () => {
            this.closeConfirmModal();
        });

        document.getElementById('confirm-action').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
                this.closeConfirmModal();
            }
        });

        // Close modals when clicking outside
        document.getElementById('edit-modal').addEventListener('click', (e) => {
            if (e.target.id === 'edit-modal') {
                this.closeEditModal();
            }
        });

        document.getElementById('confirm-modal').addEventListener('click', (e) => {
            if (e.target.id === 'confirm-modal') {
                this.closeConfirmModal();
            }
        });
    }

    // Task Management Methods
    addTask() {
        const taskInput = document.getElementById('task-input');
        const prioritySelect = document.getElementById('priority-select');
        
        const taskText = taskInput.value.trim();
        if (!taskText) return;

        const newTask = {
            id: Date.now().toString(),
            text: taskText,
            priority: prioritySelect.value,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.tasks.unshift(newTask);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();

        // Reset form
        taskInput.value = '';
        prioritySelect.value = 'medium';
        taskInput.focus();

        // Show success feedback
        this.showToast('Task added successfully!', 'success');
    }

    toggleTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            
            const action = task.completed ? 'completed' : 'uncompleted';
            this.showToast(`Task ${action}!`, 'success');
        }
    }

    deleteTask(taskId) {
        this.showConfirmModal('Are you sure you want to delete this task?', () => {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.showToast('Task deleted!', 'success');
        });
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.editingTaskId = taskId;
            document.getElementById('edit-task-input').value = task.text;
            document.getElementById('edit-priority-select').value = task.priority;
            this.showEditModal();
        }
    }

    saveEditTask() {
        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (task) {
            const newText = document.getElementById('edit-task-input').value.trim();
            const newPriority = document.getElementById('edit-priority-select').value;
            
            if (!newText) return;

            task.text = newText;
            task.priority = newPriority;
            
            this.saveTasks();
            this.renderTasks();
            this.closeEditModal();
            this.showToast('Task updated!', 'success');
        }
    }

    clearCompleted() {
        this.tasks = this.tasks.filter(t => !t.completed);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.showToast('Completed tasks cleared!', 'success');
    }

    clearAll() {
        this.tasks = [];
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        this.showToast('All tasks cleared!', 'success');
    }

    // Filtering and Search
    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTasks();
    }

    setSearch(query) {
        this.searchQuery = query.toLowerCase();
        this.renderTasks();
    }

    getFilteredTasks() {
        let filtered = [...this.tasks];

        // Apply filter
        switch (this.currentFilter) {
            case 'completed':
                filtered = filtered.filter(t => t.completed);
                break;
            case 'pending':
                filtered = filtered.filter(t => !t.completed);
                break;
            case 'high':
                filtered = filtered.filter(t => t.priority === 'high');
                break;
        }

        // Apply search
        if (this.searchQuery) {
            filtered = filtered.filter(t => 
                t.text.toLowerCase().includes(this.searchQuery)
            );
        }

        return filtered;
    }

    // Rendering Methods
    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        const emptyState = document.getElementById('empty-state');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            tasksList.style.display = 'none';
            emptyState.style.display = 'block';
            
            if (this.tasks.length === 0) {
                emptyState.innerHTML = `
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tasks yet!</h3>
                    <p>Add your first task above to get started</p>
                `;
            } else {
                emptyState.innerHTML = `
                    <i class="fas fa-search"></i>
                    <h3>No tasks found</h3>
                    <p>Try adjusting your filters or search terms</p>
                `;
            }
            return;
        }

        emptyState.style.display = 'none';
        tasksList.style.display = 'block';
        tasksList.innerHTML = '';

        filteredTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }

    createTaskElement(task) {
        const template = document.getElementById('task-template');
        const taskElement = template.content.cloneNode(true);
        
        const taskItem = taskElement.querySelector('.task-item');
        taskItem.dataset.id = task.id;
        
        if (task.completed) {
            taskItem.classList.add('completed');
        }

        // Set task text
        taskElement.querySelector('.task-text').textContent = task.text;
        
        // Set priority
        const priorityElement = taskElement.querySelector('.task-priority');
        priorityElement.textContent = task.priority;
        priorityElement.className = `task-priority ${task.priority}`;
        
        // Set date
        const dateElement = taskElement.querySelector('.task-date');
        const date = new Date(task.createdAt);
        dateElement.textContent = this.formatDate(date);
        
        // Setup event listeners
        const checkbox = taskElement.querySelector('.task-checkbox');
        checkbox.addEventListener('click', () => this.toggleTask(task.id));
        
        const editBtn = taskElement.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => this.editTask(task.id));
        
        const deleteBtn = taskElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

        return taskElement;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;

        document.getElementById('total-tasks').textContent = total;
        document.getElementById('completed-tasks').textContent = completed;
        document.getElementById('pending-tasks').textContent = pending;
    }

    // Modal Management
    showEditModal() {
        document.getElementById('edit-modal').classList.add('show');
        document.getElementById('edit-task-input').focus();
    }

    closeEditModal() {
        document.getElementById('edit-modal').classList.remove('show');
        this.editingTaskId = null;
    }

    showConfirmModal(message, callback) {
        document.getElementById('confirm-message').textContent = message;
        document.getElementById('confirm-modal').classList.add('show');
        this.confirmCallback = callback;
    }

    closeConfirmModal() {
        document.getElementById('confirm-modal').classList.remove('show');
        this.confirmCallback = null;
    }

    closeModals() {
        this.closeEditModal();
        this.closeConfirmModal();
    }

    // Theme Management
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('taskmaster-theme', newTheme);
        
        const themeIcon = document.querySelector('#theme-btn i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('taskmaster-theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        const themeIcon = document.querySelector('#theme-btn i');
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Storage Management
    saveTasks() {
        localStorage.setItem('taskmaster-tasks', JSON.stringify(this.tasks));
    }

    // Utility Methods
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) {
            return 'Today';
        } else if (days === 1) {
            return 'Yesterday';
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'info'}-circle"></i>
            <span>${message}</span>
        `;
        
        // Add toast styles
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? 'var(--success-color)' : 'var(--primary-color)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: '9999',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Export/Import functionality
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `taskmaster-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showToast('Tasks exported successfully!', 'success');
    }

    importTasks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedTasks = JSON.parse(e.target.result);
                this.tasks = [...this.tasks, ...importedTasks];
                this.saveTasks();
                this.renderTasks();
                this.updateStats();
                this.showToast('Tasks imported successfully!', 'success');
            } catch (error) {
                this.showToast('Error importing tasks. Please check the file format.', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    
    // Make taskManager globally available for debugging
    window.taskManager = taskManager;
    
    // Add keyboard shortcut info to console
    console.log(`
    🎯 TaskMaster Keyboard Shortcuts:
    • Ctrl/Cmd + Enter: Focus on new task input
    • Ctrl/Cmd + F: Focus on search
    • Escape: Close modals
    
    💡 Pro tip: Use the theme toggle in the top right!
    `);
});

// Service Worker registration for PWA (if service-worker.js exists)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Refresh stats when page becomes visible
        if (window.taskManager) {
            window.taskManager.updateStats();
        }
    }
});