-- Supabase 数据库初始化脚本
-- 运行方法：直接在Supabase SQL编辑器中执行

-- ======================================================
-- 1. 创建用户信息表
-- ======================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ======================================================
-- 2. 创建项目表
-- ======================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_is_active ON projects(is_active);

-- ======================================================
-- 3. 创建任务表
-- ======================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  priority VARCHAR(50) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ======================================================
-- 4. 创建文件表
-- ======================================================
CREATE TABLE IF NOT EXISTS files (
  id UUID DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  size BIGINT,
  storage_path TEXT NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_files_task_id ON files(task_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_is_processed ON files(is_processed);

-- ======================================================
-- 5. 创建校对结果表
-- ======================================================
CREATE TABLE IF NOT EXISTS proofreading_results (
  id UUID DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  original_text TEXT,
  proofread_text TEXT,
  corrections JSONB,
  issues JSONB,
  confidence_score FLOAT,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_proofreading_results_file_id ON proofreading_results(file_id);
CREATE INDEX IF NOT EXISTS idx_proofreading_results_task_id ON proofreading_results(task_id);
CREATE INDEX IF NOT EXISTS idx_proofreading_results_user_id ON proofreading_results(user_id);

-- ======================================================
-- 6. 创建团队成员表
-- ======================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (id),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_project_id ON team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- ======================================================
-- 7. 创建文档表
-- ======================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  content TEXT,
  storage_path TEXT,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_template ON documents(is_template);

-- ======================================================
-- 8. 创建存储桶权限策略（通过Supabase UI手动设置）
-- ======================================================
-- 注意：存储桶的创建和权限设置需要在Supabase控制台手动操作
-- 或者通过Supabase CLI/API进行设置

-- ======================================================
-- 9. 创建示例数据（可选）
-- ======================================================
-- INSERT INTO users (id, username, email, full_name, role) VALUES
-- ('your-user-uuid', 'testuser', 'test@example.com', '测试用户', 'admin');

SELECT '数据库初始化完成！' AS message;