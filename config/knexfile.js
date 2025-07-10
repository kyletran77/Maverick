/**
 * Knex configuration file
 * This file configures the database connection for different environments
 */

const path = require('path');

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../database/dev.sqlite3')
    },
    migrations: {
      directory: path.join(__dirname, '../database/migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../database/seeds')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        // Enable foreign key constraints
        conn.run('PRAGMA foreign_keys = ON', done)
      }
    }
  },
  
  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:'
    },
    migrations: {
      directory: path.join(__dirname, '../database/migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../database/seeds')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, done) => {
        conn.run('PRAGMA foreign_keys = ON', done)
      }
    }
  },
  
  production: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, '../database/production.sqlite3')
    },
    migrations: {
      directory: path.join(__dirname, '../database/migrations')
    },
    seeds: {
      directory: path.join(__dirname, '../database/seeds')
    },
    useNullAsDefault: true,
    pool: {
      min: 2,
      max: 10,
      afterCreate: (conn, done) => {
        conn.run('PRAGMA foreign_keys = ON', done)
      }
    }
  }
};
