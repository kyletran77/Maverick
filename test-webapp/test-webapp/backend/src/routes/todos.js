const express = require('express');
const router = express.Router();

const todoController = require('../controllers/todoController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all todos with optional filtering, searching, sorting
router.get('/', todoController.getAllTodos);

// Get todo statistics
router.get('/stats', todoController.getTodoStats);

// Get overdue todos
router.get('/overdue', todoController.getOverdueTodos);

// Bulk operations
router.put('/bulk', todoController.bulkUpdate);

// Get specific todo
router.get('/:id', todoController.getTodo);

// Create new todo
router.post('/', todoController.createTodo);

// Update todo
router.put('/:id', todoController.updateTodo);

// Delete todo
router.delete('/:id', todoController.deleteTodo);

// Toggle todo completion status
router.patch('/:id/toggle', todoController.toggleTodo);

module.exports = router;
