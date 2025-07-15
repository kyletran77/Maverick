const database = require('../database/connection');

class Todo {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.title = data.title;
    this.description = data.description;
    this.completed = data.completed;
    this.priority = data.priority;
    this.due_date = data.due_date;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.categories = data.categories || [];
  }

  // Create a new todo
  static async create({ user_id, title, description, priority = 'medium', due_date, categories = [] }) {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');

      // Create the todo
      const todoQuery = `
        INSERT INTO todos (user_id, title, description, priority, due_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const todoResult = await client.query(todoQuery, [
        user_id, 
        title, 
        description, 
        priority, 
        due_date
      ]);
      
      const todo = new Todo(todoResult.rows[0]);

      // Add categories if provided
      if (categories.length > 0) {
        for (const categoryId of categories) {
          await client.query(
            'INSERT INTO todo_categories (todo_id, category_id) VALUES ($1, $2)',
            [todo.id, categoryId]
          );
        }
      }

      await client.query('COMMIT');
      
      // Fetch todo with categories
      return await Todo.findByIdWithCategories(todo.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Find todo by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM todos WHERE id = $1';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Todo(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find todo by ID with categories
  static async findByIdWithCategories(id) {
    try {
      const query = `
        SELECT 
          t.*,
          COALESCE(
            json_agg(
              CASE WHEN c.id IS NOT NULL THEN
                json_build_object('id', c.id, 'name', c.name, 'color', c.color)
              ELSE NULL END
            ) FILTER (WHERE c.id IS NOT NULL), 
            '[]'
          ) as categories
        FROM todos t
        LEFT JOIN todo_categories tc ON t.id = tc.todo_id
        LEFT JOIN categories c ON tc.category_id = c.id
        WHERE t.id = $1
        GROUP BY t.id, t.user_id, t.title, t.description, t.completed, t.priority, t.due_date, t.created_at, t.updated_at
      `;
      
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new Todo(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find todos by user ID
  static async findByUserId(user_id, options = {}) {
    try {
      const { 
        completed, 
        priority, 
        category_id, 
        limit = 50, 
        offset = 0, 
        sortBy = 'created_at', 
        sortOrder = 'DESC',
        search
      } = options;

      let whereClause = 'WHERE t.user_id = $1';
      const params = [user_id];
      let paramCount = 2;

      if (completed !== undefined) {
        whereClause += ` AND t.completed = $${paramCount}`;
        params.push(completed);
        paramCount++;
      }

      if (priority) {
        whereClause += ` AND t.priority = $${paramCount}`;
        params.push(priority);
        paramCount++;
      }

      if (category_id) {
        whereClause += ` AND tc.category_id = $${paramCount}`;
        params.push(category_id);
        paramCount++;
      }

      if (search) {
        whereClause += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
        paramCount++;
      }

      const query = `
        SELECT 
          t.*,
          COALESCE(
            json_agg(
              CASE WHEN c.id IS NOT NULL THEN
                json_build_object('id', c.id, 'name', c.name, 'color', c.color)
              ELSE NULL END
            ) FILTER (WHERE c.id IS NOT NULL), 
            '[]'
          ) as categories
        FROM todos t
        LEFT JOIN todo_categories tc ON t.id = tc.todo_id
        LEFT JOIN categories c ON tc.category_id = c.id
        ${whereClause}
        GROUP BY t.id, t.user_id, t.title, t.description, t.completed, t.priority, t.due_date, t.created_at, t.updated_at
        ORDER BY t.${sortBy} ${sortOrder}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(limit, offset);
      const result = await database.query(query, params);
      
      return result.rows.map(row => new Todo(row));
    } catch (error) {
      throw error;
    }
  }

  // Update todo
  async update(data) {
    const client = await database.getClient();
    
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramCount = 1;

      if (data.title !== undefined) {
        fields.push(`title = $${paramCount}`);
        values.push(data.title);
        paramCount++;
      }

      if (data.description !== undefined) {
        fields.push(`description = $${paramCount}`);
        values.push(data.description);
        paramCount++;
      }

      if (data.completed !== undefined) {
        fields.push(`completed = $${paramCount}`);
        values.push(data.completed);
        paramCount++;
      }

      if (data.priority !== undefined) {
        fields.push(`priority = $${paramCount}`);
        values.push(data.priority);
        paramCount++;
      }

      if (data.due_date !== undefined) {
        fields.push(`due_date = $${paramCount}`);
        values.push(data.due_date);
        paramCount++;
      }

      if (fields.length > 0) {
        values.push(this.id);
        const query = `
          UPDATE todos 
          SET ${fields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const result = await client.query(query, values);
        Object.assign(this, result.rows[0]);
      }

      // Update categories if provided
      if (data.categories !== undefined) {
        // Remove existing categories
        await client.query('DELETE FROM todo_categories WHERE todo_id = $1', [this.id]);
        
        // Add new categories
        if (data.categories.length > 0) {
          for (const categoryId of data.categories) {
            await client.query(
              'INSERT INTO todo_categories (todo_id, category_id) VALUES ($1, $2)',
              [this.id, categoryId]
            );
          }
        }
      }

      await client.query('COMMIT');
      
      // Return updated todo with categories
      return await Todo.findByIdWithCategories(this.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete todo
  async delete() {
    try {
      const query = 'DELETE FROM todos WHERE id = $1';
      await database.query(query, [this.id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Toggle completion status
  async toggleComplete() {
    try {
      const query = `
        UPDATE todos 
        SET completed = NOT completed
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await database.query(query, [this.id]);
      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      throw error;
    }
  }

  // Get overdue todos for a user
  static async getOverdue(user_id) {
    try {
      const query = `
        SELECT * FROM todos 
        WHERE user_id = $1 
        AND completed = false 
        AND due_date < CURRENT_TIMESTAMP
        ORDER BY due_date ASC
      `;
      
      const result = await database.query(query, [user_id]);
      return result.rows.map(row => new Todo(row));
    } catch (error) {
      throw error;
    }
  }

  // Get todo statistics for a user
  static async getStats(user_id) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN completed = true THEN 1 END) as completed,
          COUNT(CASE WHEN completed = false THEN 1 END) as pending,
          COUNT(CASE WHEN completed = false AND due_date < CURRENT_TIMESTAMP THEN 1 END) as overdue,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority,
          COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_priority,
          COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_priority
        FROM todos 
        WHERE user_id = $1
      `;
      
      const result = await database.query(query, [user_id]);
      const stats = result.rows[0];
      
      return {
        total: parseInt(stats.total),
        completed: parseInt(stats.completed),
        pending: parseInt(stats.pending),
        overdue: parseInt(stats.overdue),
        high_priority: parseInt(stats.high_priority),
        medium_priority: parseInt(stats.medium_priority),
        low_priority: parseInt(stats.low_priority),
        completion_rate: stats.total > 0 ? 
          Math.round((stats.completed / stats.total) * 100) : 0
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Todo;
