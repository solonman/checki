import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { projectAPI, taskAPI, fileAPI, proofreadingAPI, teamAPI, documentAPI } from '../utils/apiClient';
import { initializeDatabase, checkDatabaseInitialized } from '../utils/initializeDatabase';

// 创建项目上下文
const ProjectContext = createContext(null);

/**
 * 项目上下文提供者组件
 */
export const ProjectProvider = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // 项目状态
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [files, setFiles] = useState([]);
  const [proofreadingResults, setProofreadingResults] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  // 加载状态
  const [loading, setLoading] = useState(false);
  const [databaseInitialized, setDatabaseInitialized] = useState(false);
  const [error, setError] = useState(null);

  // 初始化数据库
  useEffect(() => {
    const setupDatabase = async () => {
      if (isAuthenticated && user) {
        try {
          setLoading(true);
          
          // 首先进行健康检查，获取响应时间
          const healthCheck = await projectAPI.healthCheck().catch(() => ({ 
            success: false, 
            error: '健康检查失败' 
          }));
          
          if (!healthCheck.success) {
            console.warn('健康检查失败，但继续尝试初始化:', healthCheck.error);
            // 如果健康检查失败，仍然尝试继续，可能是权限问题
          }
          
          // 如果健康检查显示需要初始化，则进行初始化
          if (healthCheck.needsInitialization) {
            console.log('检测到数据库需要初始化，开始初始化过程...');
            
            try {
              // 动态导入初始化函数，避免打包时包含
              const { initializeDatabase } = await import('../utils/initializeDatabase');
              
              // 执行初始化，添加超时保护
              const initPromise = initializeDatabase();
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('初始化步骤超时')), 10000) // 每个步骤10秒超时
              );
              
              await Promise.race([initPromise, timeoutPromise]);
              console.log('数据库初始化成功');
              
            } catch (initError) {
              console.error('数据库初始化过程出错:', initError);
              // 初始化失败但继续，可能是部分失败
              if (initError.message === '初始化步骤超时') {
                console.warn('数据库初始化超时，但可能部分成功');
              }
            }
          } else {
            console.log('数据库已初始化，跳过初始化过程');
          }
          
          // 无论初始化是否成功，都标记为完成
          setDatabaseInitialized(true);
          console.log('数据库设置完成');
          
        } catch (err) {
          console.error('数据库设置失败:', err);
          // 即使初始化失败，也允许用户继续使用应用
          setDatabaseInitialized(true);
          console.log('数据库设置失败，但允许继续使用应用');
        } finally {
          setLoading(false);
        }
      }
    };

    setupDatabase();
  }, [isAuthenticated, user]);

  // 加载用户项目
  const loadUserProjects = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 检查服务是否可用
      const healthCheck = await projectAPI.healthCheck().catch(() => ({ success: false }));
      if (!healthCheck.success) {
        console.warn('项目服务不可用，使用离线模式');
        setProjects([]);
        return;
      }
      
      const response = await projectAPI.getUserProjects(user.id);
      
      if (response.success) {
        setProjects(response.data);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError('加载项目失败，请稍后重试');
      console.error('加载项目失败:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // 当用户认证状态变化时加载项目
  useEffect(() => {
    if (isAuthenticated && user && databaseInitialized) {
      loadUserProjects();
    } else {
      setProjects([]);
      setCurrentProject(null);
      setTasks([]);
      setFiles([]);
      setProofreadingResults([]);
    }
  }, [isAuthenticated, user, databaseInitialized, loadUserProjects]);

  /**
   * 创建新项目
   */
  const createProject = async (projectData) => {
    if (!isAuthenticated || !user) {
      return { success: false, error: '用户未登录' };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = {
        ...projectData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const response = await projectAPI.createProject(data);
      
      if (response.success) {
        // 更新项目列表
        setProjects(prevProjects => [response.data, ...prevProjects]);
        return { success: true, data: response.data, message: '项目创建成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '创建项目失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 选择当前项目
   */
  const selectProject = async (projectId) => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取项目详情
      const projectResponse = await projectAPI.getProjectDetails(projectId);
      
      if (projectResponse.success) {
        setCurrentProject(projectResponse.data);
        
        // 加载项目相关数据
        await loadProjectTasks(projectId);
        await loadProjectTeamMembers(projectId);
        await loadProjectDocuments(projectId);
        
        return { success: true, data: projectResponse.data };
      } else {
        setError(projectResponse.error);
        return { success: false, error: projectResponse.error };
      }
    } catch (err) {
      const errorMessage = err.message || '选择项目失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 更新项目
   */
  const updateProject = async (projectId, updates) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await projectAPI.updateProject(projectId, updates);
      
      if (response.success) {
        // 更新项目列表
        setProjects(prevProjects => 
          prevProjects.map(project => 
            project.id === projectId ? response.data : project
          )
        );
        
        // 更新当前项目
        if (currentProject?.id === projectId) {
          setCurrentProject(response.data);
        }
        
        return { success: true, data: response.data, message: '项目更新成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '更新项目失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除项目
   */
  const deleteProject = async (projectId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await projectAPI.deleteProject(projectId);
      
      if (response.success) {
        // 从列表中移除项目
        setProjects(prevProjects => 
          prevProjects.filter(project => project.id !== projectId)
        );
        
        // 如果删除的是当前项目，清空当前项目
        if (currentProject?.id === projectId) {
          setCurrentProject(null);
          setTasks([]);
          setFiles([]);
          setProofreadingResults([]);
          setTeamMembers([]);
          setDocuments([]);
        }
        
        return { success: true, message: '项目删除成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '删除项目失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载项目任务
   */
  const loadProjectTasks = async (projectId) => {
    try {
      const response = await taskAPI.getProjectTasks(projectId);
      
      if (response.success) {
        setTasks(response.data);
      }
    } catch (err) {
      console.error('加载任务失败:', err);
    }
  };

  /**
   * 创建任务
   */
  const createTask = async (taskData) => {
    if (!currentProject) {
      return { success: false, error: '请先选择一个项目' };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = {
        ...taskData,
        project_id: currentProject.id,
        user_id: user?.id || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const response = await taskAPI.createTask(data);
      
      if (response.success) {
        setTasks(prevTasks => [response.data, ...prevTasks]);
        return { success: true, data: response.data, message: '任务创建成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '创建任务失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 上传文件到任务
   */
  const uploadFileToTask = async (taskId, file) => {
    if (!user || !currentProject) {
      return { success: false, error: '请先登录并选择项目' };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fileAPI.uploadFile(taskId, user.id, file);
      
      if (response.success) {
        // 加载该任务的文件列表
        await loadTaskFiles(taskId);
        return { success: true, data: response.data, message: '文件上传成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '上传文件失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载任务文件
   */
  const loadTaskFiles = async (taskId) => {
    try {
      const response = await fileAPI.getTaskFiles(taskId);
      
      if (response.success) {
        // 更新文件列表，只更新特定任务的文件
        setFiles(prevFiles => {
          const otherFiles = prevFiles.filter(file => file.task_id !== taskId);
          return [...otherFiles, ...response.data];
        });
      }
    } catch (err) {
      console.error('加载任务文件失败:', err);
    }
  };

  /**
   * 保存校对结果
   */
  const saveProofreadingResult = async (resultData) => {
    if (!user || !currentProject) {
      return { success: false, error: '请先登录并选择项目' };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const data = {
        ...resultData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const response = await proofreadingAPI.saveResult(data);
      
      if (response.success) {
        setProofreadingResults(prev => [response.data, ...prev]);
        return { success: true, data: response.data, message: '校对结果保存成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '保存校对结果失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载项目团队成员
   */
  const loadProjectTeamMembers = async (projectId) => {
    try {
      const response = await teamAPI.getProjectMembers(projectId);
      
      if (response.success) {
        setTeamMembers(response.data);
      }
    } catch (err) {
      console.error('加载团队成员失败:', err);
    }
  };

  /**
   * 加载项目文档
   */
  const loadProjectDocuments = async (projectId) => {
    try {
      const response = await documentAPI.getProjectDocuments(projectId);
      
      if (response.success) {
        setDocuments(response.data);
      }
    } catch (err) {
      console.error('加载项目文档失败:', err);
    }
  };

  /**
   * 获取文件URL
   */
  const getFileUrl = async (fileId) => {
    try {
      const response = await fileAPI.getFileUrl(fileId);
      
      if (response.success) {
        return { success: true, url: response.url };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '获取文件URL失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  /**
   * 删除文件
   */
  const deleteFile = async (fileId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fileAPI.deleteFile(fileId);
      
      if (response.success) {
        // 从文件列表中移除
        setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
        return { success: true, message: '文件删除成功！' };
      } else {
        setError(response.error);
        return { success: false, error: response.error };
      }
    } catch (err) {
      const errorMessage = err.message || '删除文件失败，请稍后重试';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // 提供给子组件的值
  const value = {
    // 状态
    projects,
    currentProject,
    tasks,
    files,
    proofreadingResults,
    teamMembers,
    documents,
    loading,
    error,
    databaseInitialized,
    
    // 项目方法
    createProject,
    selectProject,
    updateProject,
    deleteProject,
    loadUserProjects,
    
    // 任务方法
    createTask,
    loadProjectTasks,
    
    // 文件方法
    uploadFileToTask,
    loadTaskFiles,
    getFileUrl,
    deleteFile,
    
    // 校对结果方法
    saveProofreadingResult,
    
    // 团队方法
    loadProjectTeamMembers,
    
    // 文档方法
    loadProjectDocuments,
    
    // 辅助方法
    clearError: () => setError(null)
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

/**
 * 使用项目上下文的Hook
 */
export const useProject = () => {
  const context = useContext(ProjectContext);
  
  if (context === null) {
    throw new Error('useProject必须在ProjectProvider内部使用');
  }
  
  return context;
};

export default ProjectContext;