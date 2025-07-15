-- Todo App Database Schema
-- This file contains the complete database schema for the todo application
-- Database: PostgreSQL

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable citext extension for case-insensitive text
CREATE EXTENSION IF NOT EXISTS "citext";

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CATEGORIES TABLE
-- =============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1', -- Hex color code
    icon VARCHAR(50), -- Icon identifier (e.g., 'work', 'personal', 'shopping')
    sort_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique category names per user
    CONSTRAINT unique_user_category_name UNIQUE (user_id, name)
);

-- =============================================
-- TODOS TABLE
-- =============================================
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 5), -- 1=Low, 2=Normal, 3=High, 4=Urgent, 5=Critical
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    sort_order INTEGER DEFAULT 0,
    estimated_minutes INTEGER, -- Estimated time to complete in minutes
    actual_minutes INTEGER, -- Actual time spent in minutes
    reminder_at TIMESTAMP WITH TIME ZONE,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB, -- Store recurrence rules (daily, weekly, monthly, etc.)
    parent_todo_id UUID REFERENCES todos(id) ON DELETE CASCADE, -- For subtasks
    tags TEXT[], -- Array of tags
    metadata JSONB DEFAULT '{}', -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TODO_ATTACHMENTS TABLE
-- =============================================
CREATE TABLE todo_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TODO_COMMENTS TABLE
-- =============================================
CREATE TABLE todo_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SHARED_TODOS TABLE (for collaboration)
-- =============================================
CREATE TABLE shared_todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate shares
    CONSTRAINT unique_todo_share UNIQUE (todo_id, shared_with_user_id)
);

-- =============================================
-- USER_SESSIONS TABLE (for JWT token management)
-- =============================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ACTIVITY_LOGS TABLE (for audit trail)
-- =============================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., 'todo_created', 'todo_completed', 'user_login'
    entity_type VARCHAR(50), -- e.g., 'todo', 'category', 'user'
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to relevant tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON categories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at 
    BEFORE UPDATE ON todos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todo_comments_updated_at 
    BEFORE UPDATE ON todo_comments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
