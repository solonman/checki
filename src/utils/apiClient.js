// API客户端配置
import supabase from './supabaseClient';
import { initializeDatabase } from './databaseSchema';
import { quickHealthCheck } from './databaseHealth';

/**
 * 用户认证相关API
 */
export const authAPI = {
  // 健康检查 - 使用轻量级检查
  healthCheck: async () => {
    try {
      return await quickHealthCheck();
    } catch (error) {
      console.warn('认证健康检查失败:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },
  
  // 用户注册
  register: async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 用户登录
  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 用户登出
  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取当前用户信息
  getCurrentUser: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message, user: null };
    }
  },
  
  // 更新用户信息
  updateUser: async (updates) => {
    try {
      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 发送密码重置邮件（添加超时保护）
  resetPassword: async (email) => {
    try {
      console.log('API: 开始发送密码重置邮件给:', email);
      
      // 创建超时Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时，请检查网络连接')), 10000); // 10秒超时
      });
      
      // 创建API请求Promise - 使用正确的重定向URL
      const apiPromise = supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      // 使用Promise.race实现超时控制
      const { data, error } = await Promise.race([apiPromise, timeoutPromise]);
      
      console.log('API: 密码重置邮件发送结果:', { data, error });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('API: 发送密码重置邮件失败:', error);
      return { success: false, error: error.message };
    }
  },

  // 确认密码重置（正确的Supabase流程）
  confirmResetPassword: async (newPassword) => {
    try {
      console.log('API: 开始确认密码重置');
      
      // 添加超时保护，避免请求卡住
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('密码重置请求超时，请重试')), 30000)
      );
      
      // 正确的密码重置流程：直接更新用户密码
      // Supabase会在PASSWORD_RECOVERY事件中自动处理令牌验证
      const updatePromise = (async () => {
        console.log('API: 正在更新用户密码...');
        
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword
        });
        
        if (error) {
          console.error('API: 密码更新失败:', error);
          throw error;
        }
        
        console.log('API: 密码更新成功');
        return data;
      })();
      
      const data = await Promise.race([updatePromise, timeoutPromise]);
      
      console.log('API: Supabase响应:', { data });
      console.log('API: 密码重置成功');
      return { success: true, data };
    } catch (error) {
      console.error('API: 密码重置异常:', error);
      
      // 提供更友好的错误信息
      let errorMessage = error.message || '密码重置失败，请重试';
      if (error.message.includes('invalid') || error.message.includes('expired')) {
        errorMessage = '重置链接无效或已过期，请重新请求密码重置';
      }
      
      return { success: false, error: errorMessage };
    }
  },
};

/**
 * 用户信息相关API
 */
export const userAPI = {
  // 获取用户详细信息
  getUserProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, full_name, avatar_url, role, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // 记录不存在
          return { success: true, data: null };
        }
        throw error;
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('获取用户资料失败:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 更新用户详细信息
  updateUserProfile: async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 创建用户详细信息
  createUserProfile: async (userData) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 上传用户头像
  uploadAvatar: async (userId, file) => {
    try {
      const fileName = `${userId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;
      
      // 获取公共URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      // 更新用户头像URL
      await userAPI.updateUserProfile(userId, { avatar_url: publicUrl });
      
      return { success: true, url: publicUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

/**
 * 项目相关API
 */
export const projectAPI = {
  // 健康检查 - 使用轻量级检查
  healthCheck: async () => {
    try {
      return await quickHealthCheck();
    } catch (error) {
      console.warn('健康检查失败:', error.message);
      return {
        success: false,
        error: error.message,
        responseTime: null
      };
    }
  },
  
  // 获取用户的所有项目
  getUserProjects: async (userId) => {
    try {
      if (!userId) {
        return { success: true, data: [] };
      }
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, is_active, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('获取用户项目失败:', error);
      return { success: false, error: error.message, data: [] };
    }
  },
  
  // 创建新项目
  createProject: async (projectData) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 更新项目
  updateProject: async (projectId, updates) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 删除项目
  deleteProject: async (projectId) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取项目详情
  getProjectDetails: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

/**
 * 任务相关API
 */
export const taskAPI = {
  // 获取项目的所有任务
  getProjectTasks: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 创建新任务
  createTask: async (taskData) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 更新任务
  updateTask: async (taskId, updates) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 删除任务
  deleteTask: async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取任务详情
  getTaskDetails: async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

/**
 * 文件相关API
 */
export const fileAPI = {
  // 上传文件
  uploadFile: async (taskId, userId, file) => {
    try {
      // 生成唯一文件名
      const fileName = `${userId}/${taskId}/${Date.now()}-${file.name}`;
      
      // 上传文件到Supabase Storage
      const { data, error } = await supabase.storage
        .from('files')
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;
      
      // 保存文件信息到数据库
      const fileRecord = {
        task_id: taskId,
        user_id: userId,
        name: file.name,
        type: file.type,
        size: file.size,
        storage_path: fileName,
      };
      
      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert(fileRecord)
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      return { success: true, data: dbData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取任务的所有文件
  getTaskFiles: async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取文件URL
  getFileUrl: async (fileId) => {
    try {
      // 先获取文件记录
      const { data: fileRecord, error: recordError } = await supabase
        .from('files')
        .select('storage_path')
        .eq('id', fileId)
        .single();
      
      if (recordError) throw recordError;
      
      // 获取Signed URL
      const { data } = await supabase.storage
        .from('files')
        .createSignedUrl(fileRecord.storage_path, 60 * 60); // 1小时有效期
      
      return { success: true, url: data.signedUrl };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 删除文件
  deleteFile: async (fileId) => {
    try {
      // 先获取文件记录
      const { data: fileRecord, error: recordError } = await supabase
        .from('files')
        .select('storage_path')
        .eq('id', fileId)
        .single();
      
      if (recordError) throw recordError;
      
      // 从存储中删除文件
      await supabase.storage
        .from('files')
        .remove([fileRecord.storage_path]);
      
      // 从数据库中删除记录
      await supabase
        .from('files')
        .delete()
        .eq('id', fileId);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

/**
 * 校对结果相关API
 */
export const proofreadingAPI = {
  // 保存校对结果
  saveResult: async (resultData) => {
    try {
      const { data, error } = await supabase
        .from('proofreading_results')
        .insert(resultData)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取文件的校对结果
  getFileResult: async (fileId) => {
    try {
      const { data, error } = await supabase
        .from('proofreading_results')
        .select('*')
        .eq('file_id', fileId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取任务的所有校对结果
  getTaskResults: async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('proofreading_results')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 更新校对结果
  updateResult: async (resultId, updates) => {
    try {
      const { data, error } = await supabase
        .from('proofreading_results')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', resultId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

/**
 * 团队相关API
 */
export const teamAPI = {
  // 添加团队成员
  addMember: async (projectId, userId, role = 'member') => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          role: role
        })
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取项目团队成员
  getProjectMembers: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*, users(id, email, full_name, avatar_url)')
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 移除团队成员
  removeMember: async (projectId, userId) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 更新成员角色
  updateMemberRole: async (projectId, userId, role) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

/**
 * 文档相关API
 */
export const documentAPI = {
  // 创建文档
  createDocument: async (documentData) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 获取项目文档
  getProjectDocuments: async (projectId) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 更新文档
  updateDocument: async (documentId, updates) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', documentId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 删除文档
  deleteDocument: async (documentId) => {
    try {
      // 先获取文档记录
      const { data: docRecord, error: recordError } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .single();
      
      if (recordError) throw recordError;
      
      // 如果有存储路径，从存储中删除
      if (docRecord.storage_path) {
        await supabase.storage
          .from('documents')
          .remove([docRecord.storage_path]);
      }
      
      // 从数据库中删除
      await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // 上传文档文件
  uploadDocument: async (projectId, userId, file) => {
    try {
      // 生成唯一文件名
      const fileName = `${userId}/${projectId}/${Date.now()}-${file.name}`;
      
      // 上传文件
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;
      
      // 创建文档记录
      const documentData = {
        project_id: projectId,
        user_id: userId,
        name: file.name,
        type: file.type,
        storage_path: fileName,
      };
      
      const { data: docData } = await documentAPI.createDocument(documentData);
      return { success: true, data: docData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

// 定义apiClient变量
const apiClient = {
  auth: authAPI,
  user: userAPI,
  project: projectAPI,
  task: taskAPI,
  file: fileAPI,
  proofreading: proofreadingAPI,
  team: teamAPI,
  document: documentAPI,
  // 模拟interceptors对象以避免错误
  interceptors: {
    request: {
      use: (onFulfilled, onRejected) => {
        // 简单实现，不做实际拦截
        return {
          eject: () => {}
        };
      }
    },
    response: {
      use: (onFulfilled, onRejected) => {
        // 简单实现，不做实际拦截
        return {
          eject: () => {}
        };
      }
    }
  }
};

// 导出apiClient
export default apiClient;

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 在请求发送前可以添加token、请求时间戳等
    config.metadata = {
      startTime: new Date().getTime()
    };
    
    // 如果有需要，可以从localStorage或其他地方获取token并添加到请求头
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    // 计算请求耗时
    const endTime = new Date().getTime();
    const duration = endTime - response.config.metadata.startTime;
    
    console.log(
      `[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`
    );
    
    // 统一处理响应数据格式
    return response.data;
  },
  error => {
    // 错误处理和重试机制
    const config = error.config;
    
    // 计算请求耗时
    if (config?.metadata) {
      const endTime = new Date().getTime();
      const duration = endTime - config.metadata.startTime;
      console.error(
        `[API Response Error] ${config.method?.toUpperCase()} ${config.url} - ${error?.response?.status || 'Network Error'} (${duration}ms)`
      );
    }
    
    // 如果是网络错误或5xx错误，可以尝试重试
    if (!config || !config.retry) {
      return Promise.reject(error);
    }
    
    // 设置默认重试次数和间隔
    config.retryCount = config.retryCount || 0;
    
    // 检查是否超过最大重试次数
    if (config.retryCount >= config.retry.maxCount) {
      return Promise.reject(error);
    }
    
    // 增加重试次数
    config.retryCount += 1;
    
    // 创建延迟函数
    const backoff = new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, config.retry.delay || 1000); // 默认1秒后重试
    });
    
    console.log(`[API Retry] ${config.method?.toUpperCase()} ${config.url} - Attempt ${config.retryCount}/${config.retry.maxCount}`);
    
    // 延迟后重试请求
    return backoff.then(() => {
      return apiClient(config);
    });
  }
);

/**
 * 创建带重试配置的API请求
 * @param {Object} config - axios配置
 * @param {Object} retryConfig - 重试配置
 * @returns {Promise}
 */
export const requestWithRetry = (config, retryConfig = { maxCount: 3, delay: 1000 }) => {
  return apiClient({
    ...config,
    retry: retryConfig
  });
};

// 移除重复的默认导出