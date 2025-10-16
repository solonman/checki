// 数据库模式定义和初始化
import supabase from './supabaseClient';

/**
 * 创建数据库表结构
 * 此函数包含所有表的创建SQL和初始化逻辑
 */
export const initializeDatabase = async () => {
  try {
    console.log('开始初始化数据库...');
    
    // 按顺序创建表，确保依赖关系正确
    const tableCreationSteps = [
      { name: '用户表', func: createUsersTable },
      { name: '项目表', func: createProjectsTable },
      { name: '任务表', func: createTasksTable },
      { name: '文件表', func: createFilesTable },
      { name: '校对结果表', func: createProofreadingResultsTable },
      { name: '团队成员表', func: createTeamMembersTable },
      { name: '文档表', func: createDocumentsTable }
    ];
    
    // 分批处理表创建，每批最多3个表
    for (let i = 0; i < tableCreationSteps.length; i += 3) {
      const batch = tableCreationSteps.slice(i, i + 3);
      console.log(`创建表批次 ${Math.floor(i/3) + 1}: ${batch.map(item => item.name).join(', ')}`);
      
      await Promise.all(batch.map(async (step) => {
        try {
          await step.func();
          console.log(`✓ ${step.name}创建成功`);
        } catch (error) {
          console.error(`✗ ${step.name}创建失败:`, error.message);
          throw error;
        }
      }));
    }
    
    // 设置行级安全策略
    console.log('设置行级安全策略...');
    await setupRowLevelSecurity();
    console.log('✓ 行级安全策略设置成功');
    
    console.log('数据库初始化完成！');
    return { success: true, message: '数据库初始化成功' };
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 创建用户信息表
 */
const createUsersTable = async () => {
  const { error } = await supabase.from('users').select('*').limit(1);
  
  // 如果表不存在，则创建表
  if (error && error.code === '42P01') { // 表不存在的错误码
    console.log('开始创建users表...');
    try {
      // 尝试使用RPC函数（推荐的方式）
      await supabase.rpc('create_users_table', {});
      console.log('使用RPC函数创建users表成功');
    } catch (rpcError) {
      console.log('RPC函数不可用，尝试其他方式创建表');
      
      // 备选方案：通过API请求或其他方式
      // 在实际环境中，可能需要调整此处逻辑
      // 对于Node.js环境，我们可以提供详细的SQL语句指导
      console.log('users表需要创建，请在Supabase控制台执行以下SQL:');
      console.log(`
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
      `);
      
      // 抛出错误以通知用户需要手动创建
      throw new Error('需要在Supabase控制台创建users表');
    }
  } else {
    console.log('users表已存在');
  }
};

/**
 * 创建项目表
 */
const createProjectsTable = async () => {
  const { error } = await supabase.from('projects').select('*').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('开始创建projects表...');
    try {
      // 尝试使用RPC函数
      await supabase.rpc('create_projects_table', {});
      console.log('使用RPC函数创建projects表成功');
    } catch (rpcError) {
      console.log('projects表需要创建，请在Supabase控制台执行以下SQL:');
      console.log(`
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
      `);
      throw new Error('需要在Supabase控制台创建projects表');
    }
  } else {
    console.log('projects表已存在');
  }
};

/**
 * 创建任务表
 */
const createTasksTable = async () => {
  const { error } = await supabase.from('tasks').select('*').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('开始创建tasks表...');
    try {
      // 尝试使用RPC函数
      await supabase.rpc('create_tasks_table', {});
      console.log('使用RPC函数创建tasks表成功');
    } catch (rpcError) {
      console.log('tasks表需要创建，请在Supabase控制台执行以下SQL:');
      console.log(`
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
      `);
      throw new Error('需要在Supabase控制台创建tasks表');
    }
  } else {
    console.log('tasks表已存在');
  }
};

/**
 * 创建文件表
 */
const createFilesTable = async () => {
  const { error } = await supabase.from('files').select('*').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('开始创建files表...');
    try {
      await supabase.rpc('create_files_table', {});
      console.log('使用RPC函数创建files表成功');
    } catch (rpcError) {
      console.log('files表需要创建，请在Supabase控制台执行以下SQL:');
      console.log(`
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
      `);
      throw new Error('需要在Supabase控制台创建files表');
    }
  } else {
    console.log('files表已存在');
  }
};

/**
 * 创建校对结果表
 */
const createProofreadingResultsTable = async () => {
  const { error } = await supabase.from('proofreading_results').select('*').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('开始创建proofreading_results表...');
    try {
      await supabase.rpc('create_proofreading_results_table', {});
      console.log('使用RPC函数创建proofreading_results表成功');
    } catch (rpcError) {
      console.log('proofreading_results表需要创建，请在Supabase控制台执行以下SQL:');
      console.log(`
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
      `);
      throw new Error('需要在Supabase控制台创建proofreading_results表');
    }
  } else {
    console.log('proofreading_results表已存在');
  }
};

/**
 * 创建团队成员表
 */
const createTeamMembersTable = async () => {
  const { error } = await supabase.from('team_members').select('*').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('开始创建team_members表...');
    try {
      await supabase.rpc('create_team_members_table', {});
      console.log('使用RPC函数创建team_members表成功');
    } catch (rpcError) {
      console.log('team_members表需要创建，请在Supabase控制台执行以下SQL:');
      console.log(`
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
      `);
      throw new Error('需要在Supabase控制台创建team_members表');
    }
  } else {
    console.log('team_members表已存在');
  }
};

/**
 * 创建文档表
 */
const createDocumentsTable = async () => {
  const { error } = await supabase.from('documents').select('*').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('开始创建documents表...');
    try {
      await supabase.rpc('create_documents_table', {});
      console.log('使用RPC函数创建documents表成功');
    } catch (rpcError) {
      console.log('documents表需要创建，请在Supabase控制台执行以下SQL:');
      console.log(`
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
      `);
      throw new Error('需要在Supabase控制台创建documents表');
    }
  } else {
    console.log('documents表已存在');
  }
};

/**
 * 设置行级安全策略
 */
const setupRowLevelSecurity = async () => {
  try {
    // 为每个表启用行级安全
    const tables = ['users', 'projects', 'tasks', 'files', 'proofreading_results', 'team_members', 'documents'];
    
    for (const table of tables) {
      // 启用RLS
      await supabase.sql`ALTER TABLE IF EXISTS ${table} ENABLE ROW LEVEL SECURITY`;
      
      // 创建策略 - 用户只能访问自己的数据
      await supabase.sql`
        CREATE POLICY IF NOT EXISTS "User can access own data" 
        ON ${table} 
        FOR ALL 
        USING (user_id = auth.uid()) 
        WITH CHECK (user_id = auth.uid());
      `;
      
      // 创建管理员策略 - 管理员可以访问所有数据
      await supabase.sql`
        CREATE POLICY IF NOT EXISTS "Admin can access all data" 
        ON ${table} 
        FOR ALL 
        USING (EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = 'admin'
        ));
      `;
    }
    
    console.log('行级安全策略设置完成');
  } catch (error) {
    console.error('设置行级安全策略失败:', error);
  }
};

/**
 * 创建存储桶
 */
export const setupStorageBuckets = async () => {
  try {
    // 创建文件存储桶
    const { data: filesBucket, error: filesError } = await supabase.storage.createBucket('files', {
      public: false,
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'],
      fileSizeLimit: 52428800, // 50MB
    });
    
    // 创建文档存储桶
    const { data: documentsBucket, error: documentsError } = await supabase.storage.createBucket('documents', {
      public: false,
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      fileSizeLimit: 52428800, // 50MB
    });
    
    // 创建头像存储桶
    const { data: avatarsBucket, error: avatarsError } = await supabase.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
      fileSizeLimit: 5242880, // 5MB
    });
    
    console.log('存储桶创建完成');
    return { success: true };
  } catch (error) {
    console.error('创建存储桶失败:', error);
    return { success: false, error: error.message };
  }
};

export default {
  initializeDatabase,
  setupStorageBuckets
};