-- Database Indexes for Todo App
-- Optimized indexes for performance and efficient querying

-- =============================================
-- USERS TABLE INDEXES
-- =============================================

-- Index for email lookups (login, password reset)
CREATE INDEX idx_users_email ON users(email);

-- Index for username lookups
CREATE INDEX idx_users_username ON users(username);

-- Index for active users
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Index for user verification status
CREATE INDEX idx_users_verified ON users(is_verified);

-- Index for user creation date (for admin analytics)
CREATE INDEX idx_users_created_at ON users(created_at);

-- =============================================
-- CATEGORIES TABLE INDEXES
-- =============================================

-- Index for user's categories (most common query)
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Composite index for user categories with sort order
CREATE INDEX idx_categories_user_sort ON categories(user_id, sort_order);

-- Index for default categories per user
CREATE INDEX idx_categories_user_default ON categories(user_id, is_default) WHERE is_default = true;

-- =============================================
-- TODOS TABLE INDEXES
-- =============================================

-- Primary index for user's todos (most common query)
CREATE INDEX idx_todos_user_id ON todos(user_id);

-- Composite index for user todos with completion status
CREATE INDEX idx_todos_user_completed ON todos(user_id, is_completed);

-- Index for category-based todos
CREATE INDEX idx_todos_category_id ON todos(category_id);

-- Composite index for user, category, and completion status
CREATE INDEX idx_todos_user_category_completed ON todos(user_id, category_id, is_completed);

-- Index for todo priority queries
CREATE INDEX idx_todos_priority ON todos(priority);

-- Composite index for user todos by priority
CREATE INDEX idx_todos_user_priority ON todos(user_id, priority);

-- Index for due date queries (reminders, overdue)
CREATE INDEX idx_todos_due_date ON todos(due_date) WHERE due_date IS NOT NULL;

-- Composite index for active todos with due dates
CREATE INDEX idx_todos_user_due_active ON todos(user_id, due_date, is_completed) 
    WHERE due_date IS NOT NULL AND is_completed = false;

-- Index for overdue todos
CREATE INDEX idx_todos_overdue ON todos(user_id, due_date, is_completed) 
    WHERE due_date < CURRENT_TIMESTAMP AND is_completed = false;

-- Index for completed todos with completion date
CREATE INDEX idx_todos_completed_at ON todos(completed_at) WHERE completed_at IS NOT NULL;

-- Index for recurring todos
CREATE INDEX idx_todos_recurring ON todos(is_recurring) WHERE is_recurring = true;

-- Index for subtasks (parent-child relationship)
CREATE INDEX idx_todos_parent_id ON todos(parent_todo_id) WHERE parent_todo_id IS NOT NULL;

-- Index for todo tags (using GIN for array operations)
CREATE INDEX idx_todos_tags ON todos USING GIN(tags);

-- Index for todo sort order within user scope
CREATE INDEX idx_todos_user_sort ON todos(user_id, sort_order);

-- Index for reminder queries
CREATE INDEX idx_todos_reminder ON todos(reminder_at) WHERE reminder_at IS NOT NULL;

-- Index for todo creation date
CREATE INDEX idx_todos_created_at ON todos(created_at);

-- Composite index for user todos by creation date
CREATE INDEX idx_todos_user_created ON todos(user_id, created_at);

-- Text search index for todo titles and descriptions
CREATE INDEX idx_todos_title_search ON todos USING GIN(to_tsvector('english', title));
CREATE INDEX idx_todos_description_search ON todos USING GIN(to_tsvector('english', description));

-- Combined text search index
CREATE INDEX idx_todos_full_text_search ON todos USING GIN(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- =============================================
-- TODO_ATTACHMENTS TABLE INDEXES
-- =============================================

-- Index for todo attachments
CREATE INDEX idx_todo_attachments_todo_id ON todo_attachments(todo_id);

-- Index for attachment upload date
CREATE INDEX idx_todo_attachments_uploaded_at ON todo_attachments(uploaded_at);

-- =============================================
-- TODO_COMMENTS TABLE INDEXES
-- =============================================

-- Index for todo comments
CREATE INDEX idx_todo_comments_todo_id ON todo_comments(todo_id);

-- Index for user comments
CREATE INDEX idx_todo_comments_user_id ON todo_comments(user_id);

-- Composite index for todo comments with creation date
CREATE INDEX idx_todo_comments_todo_created ON todo_comments(todo_id, created_at);

-- =============================================
-- SHARED_TODOS TABLE INDEXES
-- =============================================

-- Index for todos shared with a user
CREATE INDEX idx_shared_todos_shared_with ON shared_todos(shared_with_user_id);

-- Index for todos shared by a user
CREATE INDEX idx_shared_todos_shared_by ON shared_todos(shared_by_user_id);

-- Index for specific todo shares
CREATE INDEX idx_shared_todos_todo_id ON shared_todos(todo_id);

-- Composite index for permission-based queries
CREATE INDEX idx_shared_todos_user_permission ON shared_todos(shared_with_user_id, permission_level);

-- =============================================
-- USER_SESSIONS TABLE INDEXES
-- =============================================

-- Index for user sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

-- Index for active sessions
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;

-- Index for session expiration cleanup
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Composite index for user active sessions
CREATE INDEX idx_user_sessions_user_active ON user_sessions(user_id, is_active) WHERE is_active = true;

-- Index for token hash lookups
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);

-- =============================================
-- ACTIVITY_LOGS TABLE INDEXES
-- =============================================

-- Index for user activity logs
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);

-- Index for action-based queries
CREATE INDEX idx_activity_logs_action ON activity_logs(action);

-- Index for entity-based queries
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Index for date-based queries
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Composite index for user activity by date
CREATE INDEX idx_activity_logs_user_date ON activity_logs(user_id, created_at);

-- =============================================
-- PARTIAL INDEXES FOR BETTER PERFORMANCE
-- =============================================

-- Index only active users' active todos
CREATE INDEX idx_active_users_active_todos ON todos(user_id, created_at) 
    WHERE is_completed = false 
    AND user_id IN (SELECT id FROM users WHERE is_active = true);

-- Index for high priority incomplete todos
CREATE INDEX idx_todos_high_priority_active ON todos(user_id, due_date) 
    WHERE priority >= 4 AND is_completed = false;

-- Index for today's todos
CREATE INDEX idx_todos_today ON todos(user_id, due_date) 
    WHERE date_trunc('day', due_date) = date_trunc('day', CURRENT_TIMESTAMP);

-- =============================================
-- JSONB INDEXES FOR METADATA AND PREFERENCES
-- =============================================

-- Index for user preferences (JSONB)
CREATE INDEX idx_users_preferences ON users USING GIN(preferences);

-- Index for todo metadata (JSONB)
CREATE INDEX idx_todos_metadata ON todos USING GIN(metadata);

-- Index for recurrence patterns (JSONB)
CREATE INDEX idx_todos_recurrence_pattern ON todos USING GIN(recurrence_pattern);

-- =============================================
-- STATISTICS AND MAINTENANCE
-- =============================================

-- Update table statistics for better query planning
ANALYZE users;
ANALYZE categories;
ANALYZE todos;
ANALYZE todo_attachments;
ANALYZE todo_comments;
ANALYZE shared_todos;
ANALYZE user_sessions;
ANALYZE activity_logs;
