const Todo = require('../models/Todo');

const todoController = {
  // Get all todos for authenticated user
  async getAllTodos(req, res, next) {
    try {
      const userId = req.user.id;
      const options = req.query;

      const todos = await Todo.findByUserId(userId, options);

      res.json({
        success: true,
        data: {
          todos,
          total: todos.length,
          filters: {
            completed: options.completed,
            priority: options.priority,
            category_id: options.category_id,
            search: options.search,
            limit: options.limit,
            offset: options.offset,
            sortBy: options.sortBy,
            sortOrder: options.sortOrder
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get a specific todo
  async getTodo(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const todo = await Todo.findByIdWithCategories(id);

      if (!todo) {
        return res.status(404).json({
          success: false,
          message: 'Todo not found'
        });
      }

      // Check if todo belongs to authenticated user
      if (todo.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: { todo }
      });
    } catch (error) {
      next(error);
    }
  },

  // Create a new todo
  async createTodo(req, res, next) {
    try {
      const userId = req.user.id;
      const { title, description, priority, due_date, categories } = req.body;

      // Validation
      if (!title || title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      const todoData = {
        user_id: userId,
        title: title.trim(),
        description: description ? description.trim() : null,
        priority: priority || 'medium',
        due_date: due_date || null,
        categories: categories || []
      };

      const todo = await Todo.create(todoData);

      res.status(201).json({
        success: true,
        message: 'Todo created successfully',
        data: { todo }
      });
    } catch (error) {
      next(error);
    }
  },

  // Update a todo
  async updateTodo(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const todo = await Todo.findById(id);

      if (!todo) {
        return res.status(404).json({
          success: false,
          message: 'Todo not found'
        });
      }

      // Check if todo belongs to authenticated user
      if (todo.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Validate title if provided
      if (updateData.title !== undefined && (!updateData.title || updateData.title.trim().length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty'
        });
      }

      const updatedTodo = await todo.update(updateData);

      res.json({
        success: true,
        message: 'Todo updated successfully',
        data: { todo: updatedTodo }
      });
    } catch (error) {
      next(error);
    }
  },

  // Delete a todo
  async deleteTodo(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const todo = await Todo.findById(id);

      if (!todo) {
        return res.status(404).json({
          success: false,
          message: 'Todo not found'
        });
      }

      // Check if todo belongs to authenticated user
      if (todo.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await todo.delete();

      res.json({
        success: true,
        message: 'Todo deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Toggle todo completion status
  async toggleTodo(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const todo = await Todo.findById(id);

      if (!todo) {
        return res.status(404).json({
          success: false,
          message: 'Todo not found'
        });
      }

      // Check if todo belongs to authenticated user
      if (todo.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const updatedTodo = await todo.toggleComplete();

      res.json({
        success: true,
        message: `Todo marked as ${updatedTodo.completed ? 'completed' : 'pending'}`,
        data: { todo: updatedTodo }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get overdue todos
  async getOverdueTodos(req, res, next) {
    try {
      const userId = req.user.id;
      const overdueTodos = await Todo.getOverdue(userId);

      res.json({
        success: true,
        data: {
          todos: overdueTodos,
          total: overdueTodos.length
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get todo statistics
  async getTodoStats(req, res, next) {
    try {
      const userId = req.user.id;
      const stats = await Todo.getStats(userId);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  },

  // Bulk operations
  async bulkUpdate(req, res, next) {
    try {
      const { todoIds, updates } = req.body;
      const userId = req.user.id;

      if (!todoIds || !Array.isArray(todoIds) || todoIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'todoIds array is required'
        });
      }

      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Updates object is required'
        });
      }

      const results = [];
      const errors = [];

      for (const todoId of todoIds) {
        try {
          const todo = await Todo.findById(todoId);

          if (!todo) {
            errors.push({ todoId, error: 'Todo not found' });
            continue;
          }

          if (todo.user_id !== userId) {
            errors.push({ todoId, error: 'Access denied' });
            continue;
          }

          const updatedTodo = await todo.update(updates);
          results.push(updatedTodo);
        } catch (error) {
          errors.push({ todoId, error: error.message });
        }
      }

      res.json({
        success: true,
        message: `Bulk update completed. ${results.length} todos updated, ${errors.length} errors`,
        data: {
          updated: results,
          errors
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = todoController;
