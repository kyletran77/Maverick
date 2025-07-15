const database = require('./connection');

const createTables = async () => {
  try {
    console.log('Starting database migration...');

    // Create users table
    await database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create todos table
    await database.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        due_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create categories table
    await database.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) DEFAULT '#007bff',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `);

    // Create todo_categories junction table
    await database.query(`
      CREATE TABLE IF NOT EXISTS todo_categories (
        id SERIAL PRIMARY KEY,
        todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        UNIQUE(todo_id, category_id)
      )
    `);

    // Create indexes for better performance
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
    `);
    
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    `);
    
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
    `);
    
    await database.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    `);

    // Create updated_at trigger function
    await database.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    await database.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await database.query(`
      DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
      CREATE TRIGGER update_todos_updated_at 
        BEFORE UPDATE ON todos 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables };
