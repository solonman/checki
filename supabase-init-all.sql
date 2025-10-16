-- Supabase 数据库初始化脚本
-- 运行方法：直接在Supabase SQL编辑器中执行

-- ======================================================
-- 0. 创建健康检查函数
-- ======================================================
CREATE OR REPLACE FUNCTION ping()
RETURNS text AS $$
BEGIN
  RETURN 'pong';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建RSL策略 - 用户可以查看自己的资料
CREATE POLICY "用户可以查看自己的资料" ON users
  FOR SELECT USING (auth.uid() = id);

-- 创建RSL策略 - 用户可以更新自己的资料
CREATE POLICY "用户可以更新自己的资料" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 创建RSL策略 - 用户可以插入自己的资料
CREATE POLICY "用户可以插入自己的资料" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 创建RSL策略 - 服务可以插入用户资料（用于触发器）
CREATE POLICY "服务可以插入用户资料" ON users
  FOR INSERT WITH CHECK (true);

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

-- 启用行级安全
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 创建RSL策略 - 用户可以查看自己的项目
CREATE POLICY "用户可以查看自己的项目" ON projects
  FOR SELECT USING (auth.uid() = user_id);

-- 创建RSL策略 - 用户可以创建自己的项目
CREATE POLICY "用户可以创建自己的项目" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 创建RSL策略 - 用户可以更新自己的项目
CREATE POLICY "用户可以更新自己的项目" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

-- 创建RSL策略 - 用户可以删除自己的项目
CREATE POLICY "用户可以删除自己的项目" ON projects
  FOR DELETE USING (auth.uid() = user_id);

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

-- 启用行级安全
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 创建RSL策略 - 用户可以查看自己项目的任务
CREATE POLICY "用户可以查看自己项目的任务" ON tasks
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- 创建RSL策略 - 用户可以创建自己项目的任务
CREATE POLICY "用户可以创建自己项目的任务" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- 创建RSL策略 - 用户可以更新自己项目的任务
CREATE POLICY "用户可以更新自己项目的任务" ON tasks
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- 创建RSL策略 - 用户可以删除自己项目的任务
CREATE POLICY "用户可以删除自己项目的任务" ON tasks
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.user_id = auth.uid()
    )
  );

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
-- 8. 创建用户注册触发器
-- ======================================================
-- 创建触发器函数：当新用户在auth.users表中创建时，自动在users表中创建对应记录
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 在users表中插入新用户记录，绕过RLS策略
  INSERT INTO public.users (
    id,
    email,
    full_name,
    username,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================================
-- 9. 创建用户更新触发器
-- ======================================================
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- 更新users表中的对应记录
  UPDATE public.users
  SET 
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建更新触发器
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- ======================================================
-- 10. 创建存储桶权限策略（通过Supabase UI手动设置）
-- ======================================================
-- 注意：存储桶的创建和权限设置需要在Supabase控制台手动操作
-- 或者通过Supabase CLI/API进行设置

-- ======================================================
-- 9. 创建示例数据（可选）
-- ======================================================
-- INSERT INTO users (id, username, email, full_name, role) VALUES
-- ('your-user-uuid', 'testuser', 'test@example.com', '测试用户', 'admin');

SELECT '数据库初始化完成！' AS message;