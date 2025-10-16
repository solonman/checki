import React, { createContext, useState, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useProject } from './ProjectContext';
import { extractTextFromFile } from '../utils/documentParser';
// import { fileAPI, proofreadingAPI } from '../utils/apiClient';

// 创建文件处理上下文
const FileProcessingContext = createContext(null);

/**
 * 文件处理上下文提供者组件
 */
export const FileProcessingProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentProject, uploadFileToTask, saveProofreadingResult } = useProject();
  
  // 文件处理状态
  const [processingFiles, setProcessingFiles] = useState([]);
  const [processingStatus, setProcessingStatus] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [extractionResults, setExtractionResults] = useState({});
  const [activeTasks, setActiveTasks] = useState({});
  
  // 错误状态
  const [errors, setErrors] = useState({});

  /**
   * 开始处理文件
   */
  const startProcessingFile = (file) => {
    const fileId = `${file.name}-${Date.now()}`;
    
    setProcessingFiles(prev => [...prev, file]);
    setProcessingStatus(prev => ({
      ...prev,
      [fileId]: 'waiting'
    }));
    setActiveTasks(prev => ({
      ...prev,
      [fileId]: {
        file,
        id: fileId,
        startTime: new Date().toISOString()
      }
    }));
    
    return fileId;
  };

  /**
   * 更新处理状态
   */
  const updateProcessingStatus = (fileId, status, progress = null) => {
    setProcessingStatus(prev => ({
      ...prev,
      [fileId]: status
    }));
    
    if (progress !== null) {
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: progress
      }));
    }
  };

  /**
   * 设置文件错误
   */
  const setFileError = (fileId, errorMessage) => {
    setErrors(prev => ({
      ...prev,
      [fileId]: errorMessage
    }));
    updateProcessingStatus(fileId, 'error');
  };

  /**
   * 清除文件错误
   */
  const clearFileError = (fileId) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fileId];
      return newErrors;
    });
  };

  /**
   * 检查文件类型是否支持
   */
  const isFileTypeSupported = (file) => {
    const supportedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    
    return supportedTypes.includes(file.type);
  };

  /**
   * 检查文件大小是否超限
   */
  const isFileSizeWithinLimit = (file, maxSizeMB = 50) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  };

  /**
   * 验证文件
   */
  const validateFile = (file) => {
    if (!file) {
      return { valid: false, error: '请选择文件' };
    }
    
    if (!isFileTypeSupported(file)) {
      return { valid: false, error: `不支持的文件类型: ${file.type}` };
    }
    
    if (!isFileSizeWithinLimit(file)) {
      return { valid: false, error: '文件大小超过50MB限制' };
    }
    
    return { valid: true };
  };

  /**
   * 解析单个文件
   */
  const parseFile = async (file) => {
    try {
      const fileId = startProcessingFile(file);
      updateProcessingStatus(fileId, 'parsing');
      
      // 执行文件解析
      const result = await extractTextFromFile(file, {
        onProgress: (progress) => {
          updateProcessingStatus(fileId, 'parsing', progress);
        }
      });
      
      if (result.success) {
        // 保存解析结果
        setExtractionResults(prev => ({
          ...prev,
          [fileId]: result
        }));
        
        updateProcessingStatus(fileId, 'parsed');
        
        // 清理临时任务
        setTimeout(() => {
          setActiveTasks(prev => {
            const newTasks = { ...prev };
            delete newTasks[fileId];
            return newTasks;
          });
        }, 5000);
        
        return { ...result, fileId };
      } else {
        setFileError(fileId, result.error || '文件解析失败');
        return { ...result, fileId };
      }
    } catch (error) {
      const fileId = `${file.name}-${Date.now()}`;
      const errorMessage = error.message || '文件处理时发生意外错误';
      setFileError(fileId, errorMessage);
      return { success: false, error: errorMessage, fileId };
    }
  };

  /**
   * 批量处理文件
   */
  const processBatchFiles = async (files, onProgress) => {
    const results = [];
    let processedCount = 0;
    
    for (const file of files) {
      const result = await parseFile(file);
      results.push(result);
      processedCount++;
      
      // 调用进度回调
      if (onProgress) {
        onProgress({
          processed: processedCount,
          total: files.length,
          percentage: Math.round((processedCount / files.length) * 100),
          currentFile: file,
          result
        });
      }
    }
    
    return results;
  };

  /**
   * 上传并解析文件
   */
  const uploadAndParseFile = async (taskId, file) => {
    try {
      // 验证文件
      const validation = validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const fileId = startProcessingFile(file);
      updateProcessingStatus(fileId, 'parsing');
      
      // 1. 先解析文件
      const parseResult = await extractTextFromFile(file, {
        onProgress: (progress) => {
          updateProcessingStatus(fileId, 'parsing', progress);
        }
      });
      
      if (!parseResult.success) {
        setFileError(fileId, parseResult.error || '文件解析失败');
        return { ...parseResult, fileId };
      }
      
      // 2. 上传文件到服务器
      updateProcessingStatus(fileId, 'uploading');
      
      const uploadResult = await uploadFileToTask(taskId, file);
      
      if (!uploadResult.success) {
        setFileError(fileId, uploadResult.error || '文件上传失败');
        return { 
          success: false, 
          error: uploadResult.error || '文件上传失败', 
          fileId,
          parseResult // 即使上传失败，也返回解析结果
        };
      }
      
      updateProcessingStatus(fileId, 'completed');
      
      // 清理临时数据
      setTimeout(() => {
        setProcessingFiles(prev => prev.filter(f => f.name !== file.name || f.size !== file.size));
        setActiveTasks(prev => {
          const newTasks = { ...prev };
          delete newTasks[fileId];
          return newTasks;
        });
      }, 3000);
      
      return {
        success: true,
        data: {
          upload: uploadResult.data,
          parse: parseResult
        },
        fileId
      };
    } catch (error) {
      const fileId = `${file.name}-${Date.now()}`;
      const errorMessage = error.message || '文件处理失败';
      setFileError(fileId, errorMessage);
      return { success: false, error: errorMessage, fileId };
    }
  };

  /**
   * 保存校对结果到服务器
   */
  const saveProofreadingToServer = async (fileId, taskId, corrections, fileName = 'unknown') => {
    try {
      if (!user || !currentProject) {
        throw new Error('用户未登录或未选择项目');
      }
      
      const resultData = {
        file_id: fileId,
        task_id: taskId,
        project_id: currentProject.id,
        corrections: corrections,
        status: 'completed',
        metadata: {
          timestamp: new Date().toISOString(),
          file_name: fileName
        }
      };
      
      const response = await saveProofreadingResult(resultData);
      
      if (!response.success) {
        throw new Error(response.error || '保存校对结果失败');
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  /**
   * 取消文件处理
   */
  const cancelFileProcessing = (fileId) => {
    // 从处理队列中移除
    setProcessingFiles(prev => prev.filter(file => {
      const task = activeTasks[fileId];
      return !task || !(file.name === task.file.name && file.size === task.file.size);
    }));
    
    // 清除状态
    setProcessingStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[fileId];
      return newStatus;
    });
    
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
    
    setActiveTasks(prev => {
      const newTasks = { ...prev };
      delete newTasks[fileId];
      return newTasks;
    });
    
    clearFileError(fileId);
  };

  /**
   * 获取任务相关文件
   */
  const getTaskFiles = (taskId) => {
    // 从活跃任务中筛选指定taskId的文件
    const taskFiles = [];
    Object.entries(activeTasks).forEach(([fileId, task]) => {
      if (task.taskId === taskId) {
        // 找到对应的文件 - 使用文件名匹配
        const file = processingFiles.find(f => f.name === task.file.name && f.size === task.file.size);
        if (file) {
          taskFiles.push(file);
        }
      }
    });
    return taskFiles;
  };

  /**
   * 清除所有处理状态
   */
  const clearAllProcessing = () => {
    setProcessingFiles([]);
    setProcessingStatus({});
    setUploadProgress({});
    setActiveTasks({});
    setErrors({});
  };

  /**
   * 获取文件处理统计信息
   */
  const getProcessingStats = () => {
    const stats = {
      total: processingFiles.length,
      waiting: 0,
      parsing: 0,
      uploading: 0,
      completed: 0,
      error: 0
    };
    
    Object.values(processingStatus).forEach(status => {
      if (stats.hasOwnProperty(status)) {
        stats[status]++;
      }
    });
    
    return stats;
  };

  // 提供给子组件的值
  const value = {
    // 状态
    processingFiles,
    processingStatus,
    uploadProgress,
    extractionResults,
    activeTasks,
    errors,
    
    // 文件处理方法
    parseFile,
    processBatchFiles,
    uploadAndParseFile,
    saveProofreadingToServer,
    cancelFileProcessing,
    
    // 验证和辅助方法
    validateFile,
    isFileTypeSupported,
    isFileSizeWithinLimit,
    getTaskFiles,
    clearAllProcessing,
    getProcessingStats,
    clearFileError
  };

  return <FileProcessingContext.Provider value={value}>{children}</FileProcessingContext.Provider>;
};

/**
 * 使用文件处理上下文的Hook
 */
export const useFileProcessing = () => {
  const context = useContext(FileProcessingContext);
  
  if (context === null) {
    throw new Error('useFileProcessing必须在FileProcessingProvider内部使用');
  }
  
  return context;
};

export default FileProcessingContext;