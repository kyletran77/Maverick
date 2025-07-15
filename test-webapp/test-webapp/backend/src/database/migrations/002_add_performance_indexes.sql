-- Migration: 002_add_performance_indexes.sql
-- Created: 2025-07-15
-- Description: Add performance indexes for optimal query performance

BEGIN;

-- =============================================
-- USERS TABLE INDEXES
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_verified ON users(is_verified);
CREATE INDEX idx_users_created_at ON users(created_at);

-- =============================================
-- CATEGORIES TABLE INDEXES
-- =============================================
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_user_sort ON categories(user_id, sort_order);
CREATE INDEX idx_categories_user_default ON categories(user_id, is_default) WHERE is_default = true;

-- =============================================
-- TODOS TABLE INDEXES
-- =============================================
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_user_completed ON todos(user_id, is_completed);
CREATE INDEX idx_todos_category_id ON todos(category_id);
CREATE INDEX idx_todos_user_category_completed ON todos(user_id, category_id, is_completed);
CREATE INDEX idx_todos_priority ON todos(priority);
CREATE INDEX idx_todos_user_priority ON todos(user_id, priority);
CREATE INDEX idx_todos_due_date ON todos(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_todos_user_due_active ON todos(user_id, due_date, is_completed) 
    WHERE due_date IS NOT NULL AND is_completed = false;
CREATE INDEX idx_todos_overdue ON todos(user_id, due_date, is_completed) 
    WHERE due_date < CURRENT_TIMESTAMP AND is_completed = false;
CREATE INDEX idx_todos_completed_at ON todos(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX idx_todos_recurring ON todos(is_recurring) WHERE is_recurring = true;
CREATE INDEX idx_todos_parent_id ON todos(parent_todo_id) WHERE parent_todo_id IS NOT NULL;
CREATE INDEX idx_todos_tags ON todos USING GIN(tags);
CREATE INDEX idx_todos_user_sort ON todos(user_id, sort_order);
CREATE INDEX idx_todos_reminder ON todos(reminder_at) WHERE reminder_at IS NOT NULL;
CREATE INDEX idx_todos_created_at ON todos(created_at);
CREATE INDEX idx_todos_user_created ON todos(user_id, created_at);

-- Text search indexes
CREATE INDEX idx_todos_title_search ON todos USING GIN(to_tsvector('english', title));
CREATE INDEX idx_todos_description_search ON todos USING GIN(to_tsvector('english', description));
CREATE INDEX idx_todos_full_text_search ON todos USING GIN(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- =============================================
-- OTHER TABLE INDEXES
-- =============================================
CREATE INDEX idx_todo_attachments_todo_id ON todo_attachments(todo_id);
CREATE INDEX idx_todo_attachments_uploaded_at ON todo_attachments(uploaded_at);

CREATE INDEX idx_todo_comments_todo_id ON todo_comments(todo_id);
CREATE INDEX idx_todo_comments_user_id ON todo_comments(user_id);
CREATE INDEX idx_todo_comments_todo_created ON todo_comments(todo_id, created_at);

CREATE INDEX idx_shared_todos_shared_with ON shared_todos(shared_with_user_id);
CREATE INDEX idx_shared_todos_shared_by ON shared_todos(shared_by_user_id);
CREATE INDEX idx_shared_todos_todo_id ON shared_todos(todo_id);
CREATE INDEX idx_shared_todos_user_permission ON shared_todos(shared_with_user_id, permission_level);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_user_date ON activity_logs(user_id, created_at);

-- =============================================
-- JSONB INDEXES
-- =============================================
CREATE INDEX idx_users_preferences ON users USING GIN(preferences);
CREATE INDEX idx_todos_metadata ON todos USING GIN(metadata);
CREATE INDEX idx_todos_recurrence_pattern ON todos USING GIN(recurrence_pattern);

-- Update statistics
ANALYZE users;
ANALYZE categories;
ANALYZE todos;
ANALYZE todo_attachments;
ANALYZE todo_comments;
ANALYZE shared_todos;
ANALYZE user_sessions;
ANALYZE activity_logs;

COMMIT;
