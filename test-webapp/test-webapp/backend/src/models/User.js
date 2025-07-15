const database = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.avatar_url = data.avatar_url;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create a new user
  static async create({ username, email, password, avatar_url }) {
    try {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      const query = `
        INSERT INTO users (username, email, password_hash, avatar_url)
        VALUES ($1, $2, $3, $4)
        RETURNING id, username, email, avatar_url, created_at, updated_at
      `;
      
      const result = await database.query(query, [username, email, password_hash, avatar_url]);
      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await database.query(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await database.query(query, [username]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Update user
  async update(data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      if (data.username) {
        fields.push(`username = $${paramCount}`);
        values.push(data.username);
        paramCount++;
      }

      if (data.email) {
        fields.push(`email = $${paramCount}`);
        values.push(data.email);
        paramCount++;
      }

      if (data.avatar_url !== undefined) {
        fields.push(`avatar_url = $${paramCount}`);
        values.push(data.avatar_url);
        paramCount++;
      }

      if (data.password) {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(data.password, salt);
        fields.push(`password_hash = $${paramCount}`);
        values.push(password_hash);
        paramCount++;
      }

      if (fields.length === 0) {
        return this;
      }

      values.push(this.id);
      const query = `
        UPDATE users 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, username, email, avatar_url, created_at, updated_at
      `;

      const result = await database.query(query, values);
      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  async delete() {
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      await database.query(query, [this.id]);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password) {
    try {
      return await bcrypt.compare(password, this.password_hash);
    } catch (error) {
      throw error;
    }
  }

  // Get user without sensitive data
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      avatar_url: this.avatar_url,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Get user stats
  async getStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_todos,
          COUNT(CASE WHEN completed = true THEN 1 END) as completed_todos,
          COUNT(CASE WHEN completed = false THEN 1 END) as pending_todos,
          COUNT(CASE WHEN due_date < CURRENT_TIMESTAMP AND completed = false THEN 1 END) as overdue_todos
        FROM todos 
        WHERE user_id = $1
      `;
      
      const result = await database.query(query, [this.id]);
      const stats = result.rows[0];
      
      return {
        total_todos: parseInt(stats.total_todos),
        completed_todos: parseInt(stats.completed_todos),
        pending_todos: parseInt(stats.pending_todos),
        overdue_todos: parseInt(stats.overdue_todos),
        completion_rate: stats.total_todos > 0 ? 
          Math.round((stats.completed_todos / stats.total_todos) * 100) : 0
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
