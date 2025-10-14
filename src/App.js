import { useState, useEffect, lazy, Suspense } from 'react'; // 添加lazy和Suspense导入
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { FileTextOutlined, HomeOutlined } from '@ant-design/icons';
import DocumentPreview from './components/DocumentPreview';
import { I18nProvider } from './context/i18nContext';
import { proofreadTextWithOpenAI, generateProofreadingReport } from './utils/proofreadingService';
import PrivateRoute from './components/PrivateRoute';
import ProtectedRoute from './components/ProtectedRoute';
import { isValidFileFormat, isValidFileSize, getFileType, generateUniqueFileName } from './utils/fileUtils';
import { extractTextFromFile } from './utils/documentParser';
import supabase from './utils/supabaseClient';
import fileQueue from './utils/fileProcessingQueue';
import './App.css';

// 导入新的上下文提供者
import { ContextProvider } from './contexts/ContextProvider';
import { useAuth } from './contexts/AuthContext';

// 使用React.lazy实现代码分割和懒加载
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const DocxTest = lazy(() => import('./components/DocxTest'));

function App() {
  return (
    <I18nProvider>
      <ContextProvider>
        <Router>
          <Suspense fallback={<div className="loading-page">加载中...</div>}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><UserProfilePage /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
              <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboardPage /></ProtectedRoute>} />
              <Route path="/docx-test" element={<PrivateRoute><DocxTest /></PrivateRoute>} />
            </Routes>
          </Suspense>
        </Router>
      </ContextProvider>
    </I18nProvider>
  );
}

// 主布局组件
function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState('');
  const [file, setFile] = useState(null);
  // 添加当前任务状态管理
  const [currentTask, setCurrentTask] = useState('外滩瑞府国庆产品软文');
  const [showProofreadingResult, setShowProofreadingResult] = useState(true); // 默认显示校对结果页面
  const [showProjectManagement, setShowProjectManagement] = useState(false); // 控制是否显示项目管理页面
  const [isUploading, setIsUploading] = useState(false); // 文件上传加载状态
  // 校对结果相关状态
  const [fileType, setFileType] = useState('text'); // 文件类型：text 或 image
  const [extractedContent, setExtractedContent] = useState(''); // 提取的文件内容
  const [proofreadingResult, setProofreadingResult] = useState(null); // 校对结果
  // 用户下拉菜单状态
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // 项目相关状态管理
  const [projects, setProjects] = useState({
    "外滩瑞府": {
      name: "外滩瑞府",
      standardInfo: [],
      logos: []
    },
    "康定壹拾玖": {
      name: "康定壹拾玖",
      standardInfo: [],
      logos: []
    }
  });
  
  // 处理任务队列状态
  const [queueStatus, setQueueStatus] = useState({ totalTasks: 0, currentTasks: 0 });
  const [activeTaskProgress, setActiveTaskProgress] = useState(0);
  
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedManagementProject, setSelectedManagementProject] = useState(null);
  const [newStandardInfo, setNewStandardInfo] = useState('');
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFileData, setPreviewFileData] = useState(null);
  // 统计信息状态
  const [statistics, setStatistics] = useState({
    totalFiles: 0,
    spellingErrors: 0,
    infoErrors: 0,
    complianceIssues: 0,
    logoDifferences: 0
  });
  
  // 从localStorage加载任务数据
  const [projectTasks, setProjectTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem('projectTasks');
      if (savedTasks) {
        return JSON.parse(savedTasks);
      }
    } catch (error) {
      console.error('加载项目任务数据失败:', error);
    }
    // 默认项目任务数据
    return {
      "外滩瑞府": [
        "国庆价值软文",
        "国庆刷屏",
        "周末活动主题背景"
      ],
      "康定壹拾玖": [
        "艺术大展预防海报"
      ]
    };
  });

  // 跟踪展开的项目
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  // 切换项目展开/折叠状态
  const toggleProject = (project) => {
    const newExpandedProjects = new Set(expandedProjects);
    if (newExpandedProjects.has(project)) {
      newExpandedProjects.delete(project);
    } else {
      newExpandedProjects.add(project);
    }
    setExpandedProjects(newExpandedProjects);
  };

  // 添加点击外部关闭下拉菜单的功能
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserDropdown && !event.target.closest('.user-section')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserDropdown, projectTasks]);
  
  // 当组件加载且用户已登录时，从localStorage加载历史任务数据和显示统计信息
  useEffect(() => {
    // 无论用户是否登录，都显示默认统计信息
    calculateStatistics([]);
    
    if (user) {
      try {
        const savedTasks = localStorage.getItem('proofreadingTasks');
        if (savedTasks) {
          const tasksData = JSON.parse(savedTasks);
          
          // 构建项目-任务映射
          const tasksByProject = {};
          tasksData.forEach(task => {
            if (!tasksByProject[task.project]) {
              tasksByProject[task.project] = [];
            }
            if (!tasksByProject[task.project].includes(task.fileName)) {
              tasksByProject[task.project].push(task.fileName);
            }
          });
          
          // 合并现有项目和从localStorage加载的项目
          const mergedTasks = { ...projectTasks };
          Object.keys(tasksByProject).forEach(project => {
            mergedTasks[project] = tasksByProject[project];
          });
          
          setProjectTasks(mergedTasks);
          
          // 使用实际数据计算统计信息
          calculateStatistics(tasksData);
          
          console.log('历史任务数据已从localStorage加载');
        }
      } catch (error) {
        console.error('从localStorage加载历史任务数据失败:', error);
      }
    }
  }, [user, projectTasks]);
  
  // 监控文件处理队列状态
  useEffect(() => {
    // 定期更新队列状态
    const intervalId = setInterval(() => {
      const status = fileQueue.getQueueStatus();
      setQueueStatus(status);
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // 计算统计信息
  const calculateStatistics = (tasksData) => {
    let totalFiles = tasksData.length;
    let spellingErrors = 0;
    let infoErrors = 0;
    let complianceIssues = 0;
    let logoDifferences = 0;

    tasksData.forEach(task => {
      if (task.proofreadingResult && task.proofreadingResult.statistics) {
        spellingErrors += task.proofreadingResult.statistics.spellingErrors || 0;
        // 假设信息错误包含语法错误
        infoErrors += task.proofreadingResult.statistics.grammarErrors || 0;
        // 假设合规问题包含标点错误
        complianceIssues += task.proofreadingResult.statistics.punctuationErrors || 0;
      }
      // 这里可以根据需要添加更多统计计算逻辑
    });

    // 为了演示效果，设置一些默认值
    if (totalFiles === 0) {
      totalFiles = 87;
      spellingErrors = 243;
      infoErrors = 54;
      complianceIssues = 23;
      logoDifferences = 9;
    }

    setStatistics({
      totalFiles,
      spellingErrors,
      infoErrors,
      complianceIssues,
      logoDifferences
    });
  };

  // 项目管理按钮点击处理函数
  const handleProjectManagement = () => {
    setShowProjectManagement(true);
    setShowProofreadingResult(false);
  };

  // 关闭项目管理页面
  const handleCloseProjectManagement = () => {
    setShowProjectManagement(false);
    setShowProofreadingResult(true);
  };

  // 新建项目
  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      alert('请输入项目名称');
      return;
    }
    
    if (projects[newProjectName.trim()]) {
      alert('项目名称已存在');
      return;
    }
    
    setProjects(prev => ({
      ...prev,
      [newProjectName.trim()]: {
        name: newProjectName.trim(),
        standardInfo: [],
        logos: []
      }
    }));
    
    // 同时更新projectTasks，确保新建的项目在历史记录中可见
    setProjectTasks(prev => ({
      ...prev,
      [newProjectName.trim()]: []
    }));
    
    setNewProjectName('');
  };

  // 选择项目进行管理
  const handleSelectProject = (projectName) => {
    setSelectedManagementProject(projectName);
  };

  // 添加标准信息
  const handleAddStandardInfo = (infoContent) => {
    if (!infoContent || !selectedManagementProject) {
      return;
    }
    
    const updatedProjects = {
      ...projects,
      [selectedManagementProject]: {
        ...projects[selectedManagementProject],
        standardInfo: [...projects[selectedManagementProject].standardInfo, infoContent]
      }
    };
    
    setProjects(updatedProjects);
    
    // 保存到localStorage
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
  };

  // 添加LOGO
  const handleAddLogo = (event) => {
    if (!event.target.files || !event.target.files[0] || !selectedManagementProject) {
      return;
    }
    
    const logoFile = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      setProjects(prev => ({
        ...prev,
        [selectedManagementProject]: {
          ...prev[selectedManagementProject],
          logos: [...prev[selectedManagementProject].logos, {
            name: logoFile.name,
            url: e.target.result
          }]
        }
      }));
    };
    
    reader.readAsDataURL(logoFile);
  };

  // 预览标准信息或LOGO
  const handlePreview = (content, type, fileName = '预览文件', fileType = null) => {
    // 使用新的预览组件
    setPreviewFileData({
      data: content,
      type,
      fileName,
      fileType
    });
    setPreviewVisible(true);
  };

  // 关闭预览
  const handleClosePreview = () => {
    setPreviewVisible(false);
    setPreviewFileData(null);
  };

  // 保留旧的预览逻辑以兼容现有调用（逐步迁移）
  const handleOldPreview = (content, type) => {
    if (type === 'text') {
      let processedContent = content;
      if (typeof processedContent !== 'string') {
        processedContent = String(processedContent);
      }
      if (!processedContent.trim()) {
        processedContent = '文件内容为空';
      }
      setPreviewContent(processedContent);
    } else {
      setPreviewContent(content);
    }
    setPreviewType(type);
  };

  // 删除标准信息
  const handleDeleteStandardInfo = (index) => {
    if (!selectedManagementProject) return;
    
    setProjects(prev => ({
      ...prev,
      [selectedManagementProject]: {
        ...prev[selectedManagementProject],
        standardInfo: prev[selectedManagementProject].standardInfo.filter((_, i) => i !== index)
      }
    }));
  };

  // 删除LOGO
  const handleDeleteLogo = (index) => {
    if (!selectedManagementProject) return;
    
    setProjects(prev => ({
      ...prev,
      [selectedManagementProject]: {
        ...prev[selectedManagementProject],
        logos: prev[selectedManagementProject].logos.filter((_, i) => i !== index)
      }
    }));
  };

  // 删除项目
  const handleDeleteProject = (projectName) => {
    if (window.confirm(`确定要删除项目"${projectName}"吗？所有标准信息和LOGO也将被删除。`)) {
      setProjects(prev => {
        const newProjects = { ...prev };
        delete newProjects[projectName];
        return newProjects;
      });
      
      if (selectedManagementProject === projectName) {
        setSelectedManagementProject(null);
      }
    }
  };

  // 新任务按钮点击处理函数
  const handleNewTask = () => {
    setShowProofreadingResult(false);
    setShowProjectManagement(false);
    setFile(null);
    setSelectedProject('');
  };

  // 文件上传处理函数
  const handleFileUpload = (event) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      
      // 验证文件格式
      if (!isValidFileFormat(selectedFile)) {
        alert('不支持的文件格式，请上传docx、jpg或png格式的文件');
        return;
      }
      
      // 验证文件大小（10MB限制）
      if (!isValidFileSize(selectedFile, 10)) {
        alert('文件大小超过限制（10MB）');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  // 拖拽上传处理
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const droppedFile = event.dataTransfer.files[0];
      
      // 验证文件格式
      if (!isValidFileFormat(droppedFile)) {
        alert('不支持的文件格式，请上传docx、jpg或png格式的文件');
        return;
      }
      
      // 验证文件大小（10MB限制）
      if (!isValidFileSize(droppedFile, 10)) {
        alert('文件大小超过限制（10MB）');
        return;
      }
      
      setFile(droppedFile);
    }
  };

  // 点击上传区域触发文件选择
  const handleUploadClick = () => {
    document.getElementById('file-input').click();
  };

  // 提交上传
  const handleSubmit = () => {
    if (!file) {
      alert('请先上传文件');
      return;
    }
    
    if (!selectedProject) {
      alert('请选择项目');
      return;
    }
    
    // 设置加载状态
    setIsUploading(true);
    setActiveTaskProgress(0);
    
    // 将文件处理任务添加到队列
    fileQueue.addTask(async (onProgress) => {
      try {
        // 生成唯一文件名
        const uniqueFileName = generateUniqueFileName(file.name);
        
        // 上传文件到Supabase存储
        onProgress && onProgress({ stage: 'uploading', progress: 0.1 });
        const { data, error } = await supabase.storage
          .from('proofreading_files')
          .upload(`/${user.id}/${uniqueFileName}`, file, { contenttype: file.type });
        
        if (error) {
          throw new Error(`文件上传失败: ${error.message}`);
        }
        
        // 获取上传文件的公共URL
        onProgress && onProgress({ stage: 'uploading', progress: 0.2 });
        const { data: { publicUrl } } = supabase.storage
          .from('proofreading_files')
          .getPublicUrl(`/${user.id}/${uniqueFileName}`);
          
        // 提取文件内容用于AI校对
        onProgress && onProgress({ stage: 'extracting', progress: 0.3 });
        const fileContent = await extractTextFromFile(file);
        
        // 获取文件类型
        onProgress && onProgress({ stage: 'processing', progress: 0.4 });
        const type = getFileType(file);
        const contentType = type === 'docx' ? 'text' : 'image';
        
        // 创建任务记录
        const taskRecord = {
          userId: user.id,
          fileName: file.name,
          fileType: type,
          contentType: contentType,
          filePath: data.path,
          fileUrl: publicUrl,
          fileContent: fileContent,
          project: selectedProject || null,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        
        // 这里可以将任务记录保存到数据库
        console.log('任务记录:', taskRecord);
        
        // 执行AI校对的进度回调
        const proofreadingProgressCallback = (proofProgress) => {
          // 将OCR/校对进度映射到整体进度的40%-90%区间
          const mappedProgress = 0.4 + (proofProgress * 0.5);
          onProgress && onProgress({ stage: 'proofreading', progress: mappedProgress });
        };
        
        // 执行AI校对
        onProgress && onProgress({ stage: 'proofreading', progress: 0.5 });
        let result;
        
        // 根据文件类型处理校对
        if (contentType === 'text') {
          // 对于文本文件，直接进行校对
          result = await proofreadTextWithOpenAI(fileContent, selectedProject, proofreadingProgressCallback);
        } else if (contentType === 'image') {
          // 对于图片文件，使用提取的内容进行校对
          result = await proofreadTextWithOpenAI(fileContent, selectedProject, proofreadingProgressCallback);
        }
        
        // 更新状态
        return {
          fileContent,
          result,
          contentType,
          type,
          taskRecord
        };
      } catch (error) {
        console.error('文件处理过程中出错:', error);
        throw error;
      }
    }, {
      fileName: file.name,
      priority: 1,
      onProgress: (progressInfo) => {
        // 更新UI显示的进度
        setActiveTaskProgress(Math.round(progressInfo.progress * 100));
        console.log(`任务进度: ${file.name} - ${progressInfo.stage}: ${Math.round(progressInfo.progress * 100)}%`);
      }
    }).then(({ fileContent, result, contentType, type, taskRecord }) => {
      try {
        // 设置文件类型和提取的内容
        setFileType(contentType);
        setExtractedContent(fileContent);
        setProofreadingResult(result);
        
        setCurrentTask(file.name);
        setShowProofreadingResult(true);
        
        // 将新任务添加到历史记录
        setProjectTasks(prevTasks => {
          const newTasks = { ...prevTasks };
          // 确保选中的项目存在于任务记录中
          if (!newTasks[selectedProject]) {
            newTasks[selectedProject] = [];
          }
          // 添加新任务，避免重复
          if (!newTasks[selectedProject].includes(file.name)) {
            newTasks[selectedProject].push(file.name);
          }
          return newTasks;
        });
        
        // 保存任务数据到localStorage
        try {
          const taskData = {
            project: selectedProject,
            fileName: file.name,
            fileType: type,
            contentType: contentType,
            fileContent: fileContent,
            proofreadingResult: result,
            createdAt: new Date().toISOString()
          };
          
          // 获取现有任务列表
          const existingTasks = JSON.parse(localStorage.getItem('proofreadingTasks') || '[]');
          
          // 检查任务是否已存在，如果存在则更新，否则添加
          const existingIndex = existingTasks.findIndex(
            item => item.project === selectedProject && item.fileName === file.name
          );
          
          if (existingIndex >= 0) {
            existingTasks[existingIndex] = taskData;
          } else {
            existingTasks.push(taskData);
          }
          
          // 保存回localStorage
          localStorage.setItem('proofreadingTasks', JSON.stringify(existingTasks));
          console.log('任务数据已保存到localStorage');
        } catch (storageError) {
          console.error('保存任务数据失败:', storageError);
          // 这里不显示错误提示，因为即使保存失败，应用仍然可以继续使用
        }
        
        alert('文件处理完成！');
      } catch (finalError) {
        console.error('处理结果过程中出错:', finalError);
        alert(`处理结果失败: ${finalError.message}`);
      } finally {
        // 隐藏加载状态
        setIsUploading(false);
        setActiveTaskProgress(0);
      }
    }).catch(error => {
      console.error('任务执行失败:', error);
      alert(`任务失败: ${error.message || '未知错误'}`);
      setIsUploading(false);
      setActiveTaskProgress(0);
    });
  };

  // 退出登录处理
  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      logout();
    }
  };

  // 下载校对报告
  const handleDownloadReport = () => {
    if (!proofreadingResult) {
      alert('没有可下载的校对结果');
      return;
    }
    
    try {
      // 生成校对报告文本
      const reportText = generateProofreadingReport(proofreadingResult, currentTask);
      
      // 创建Blob对象
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 设置文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${currentTask.replace(/[^a-zA-Z0-9.-]/g, '_')}_校对报告_${timestamp}.txt`;
      link.download = fileName;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('生成或下载报告失败:', error);
      alert('下载报告失败，请稍后重试');
    }
  };

  // 点击历史任务项
  const handleTaskClick = (project, task) => {
    setCurrentTask(task);
    setShowProofreadingResult(true);
    setShowProjectManagement(false);
    
    // 尝试从localStorage加载历史任务数据
    try {
      const savedTasks = localStorage.getItem('proofreadingTasks');
      if (savedTasks) {
        const tasksData = JSON.parse(savedTasks);
        const taskData = tasksData.find(item => 
          item.project === project && item.fileName === task
        );
        
        if (taskData) {
          // 加载任务数据
          setFileType(taskData.contentType);
          setExtractedContent(taskData.fileContent);
          
          // 如果有保存的校对结果，也加载它
          if (taskData.proofreadingResult) {
            setProofreadingResult(taskData.proofreadingResult);
          } else {
            // 如果没有保存的校对结果，生成一个模拟结果
            setProofreadingResult(generateMockProofreadingResult());
          }
          
          console.log('历史任务数据已加载:', taskData);
          return;
        }
      }
      
      // 如果没有找到保存的数据，设置默认值
      setFileType('text');
      setExtractedContent('这是一个历史任务。由于没有保存的原始内容，此内容为示例。\n\n点击新任务可以上传新的文档进行校对。');
      setProofreadingResult(generateMockProofreadingResult());
    } catch (error) {
      console.error('加载历史任务数据失败:', error);
      alert('加载历史任务数据失败');
    }
  };
  
  // 生成模拟校对结果
  const generateMockProofreadingResult = () => {
    return {
      errors: [
        {
          type: 'spelling',
          original: '示例',
          corrected: '示例文本',
          context: '这是一个历史任务。由于没有保存的原始内容，此内容为示例文本。',
          suggestion: '建议添加更多描述'
        },
        {
          type: 'grammar',
          original: '点击新任务可以上传',
          corrected: '点击新任务按钮可以上传',
          context: '点击新任务可以上传新的文档进行校对。',
          suggestion: '建议添加"按钮"使句子更完整'
        }
      ],
      statistics: {
        totalErrors: 2,
        spellingErrors: 1,
        grammarErrors: 1,
        punctuationErrors: 0,
        accuracyRate: 95.5
      },
      summary: '此任务已完成校对，发现2处错误，总体准确率为95.5%。建议检查内容的完整性和准确性。'
    };
  };

  // 处理添加LOGO按钮点击
  const handleAddLogoClick = () => {
    document.getElementById('logo-upload').click();
  };

  // 处理添加标准信息按钮点击
  const handleAddStandardInfoClick = () => {
    document.getElementById('standard-info-upload').click();
  };

  // 处理标准信息文件上传
  const handleAddStandardInfoFile = (event) => {
    if (!event.target.files || !event.target.files[0] || !selectedManagementProject) {
      return;
    }
    
    const infoFile = event.target.files[0];
    const reader = new FileReader();
    
    // 设置错误处理
    reader.onerror = (error) => {
      console.error('文件读取错误:', error);
      handleAddStandardInfo({
        name: infoFile.name,
        content: `文件读取失败：无法读取文件内容\n文件名：${infoFile.name}\n文件大小：${formatFileSize(infoFile.size)}`,
        type: 'text'
      });
    };
    
    reader.onload = (e) => {
      // 根据文件类型处理内容
      if (infoFile.type.includes('image/')) {
        // 图片文件，直接使用DataURL
        handleAddStandardInfo({ name: infoFile.name, content: e.target.result, type: 'image' });
      } else {
        // 文本文件，尝试解析内容
        try {
          let content = e.target.result;
          
          // 1. 移除UTF-8 BOM
          if (content.charCodeAt(0) === 0xFEFF) {
            content = content.substring(1);
          }
          
          // 2. 检测是否包含中文字符
          const hasChineseChars = /[\u4e00-\u9fa5]/.test(content);
          
          // 3. 检测是否有明显的编码问题迹象
          // - 连续的不可打印字符或控制字符
          // - 中文显示为乱码（如连续的\ufffd字符）
          const invalidChars = (content.match(/\ufffd/g) || []).length;
          const hasManyInvalidChars = invalidChars > content.length * 0.1;
          
          // 4. 检测不可打印字符比例，扩大检测范围
          const printableChars = content.replace(/[\x00-\x1F\x7F-\x9F]/g, '').length;
          const nonPrintableRatio = (content.length - printableChars) / content.length;
          
          // 5. 对常见的二进制文件类型进行特殊处理
          const binaryExtensions = ['.docx', '.pdf', '.doc', '.xls', '.xlsx', '.zip'];
          const isBinaryFile = binaryExtensions.some(ext => 
            infoFile.name.toLowerCase().endsWith(ext)
          );
          
          // 6. 如果检测到编码问题或二进制文件，提供明确提示
          if (hasManyInvalidChars || nonPrintableRatio > 0.3 || isBinaryFile) {
            if (isBinaryFile) {
              handleAddStandardInfo({
                name: infoFile.name,
                content: `此文件为${infoFile.name.split('.').pop().toUpperCase()}二进制格式，无法直接显示内容。\n建议：\n1. 对于文档类文件，请先转换为纯文本(.txt)格式\n2. 或复制文档内容到文本文件中再上传\n文件名：${infoFile.name}\n文件大小：${formatFileSize(infoFile.size)}`,
                type: 'text'
              });
            } else {
              // 对于其他可能有编码问题的文件
              handleAddStandardInfo({
                name: infoFile.name,
                content: `检测到文件可能存在编码问题，无法正确显示内容。\n建议：\n1. 确保文件使用UTF-8编码保存\n2. 尝试将文件另存为纯文本(.txt)格式\n3. 检查文件是否被损坏\n文件名：${infoFile.name}\n文件大小：${formatFileSize(infoFile.size)}`,
                type: 'text'
              });
            }
            return;
          }
          
          // 7. 尝试清理内容中的控制字符，保留有用文本
          let cleanContent = content.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          
          // 8. 如果清理后的内容太短，说明可能还是有问题
          if (cleanContent.length < 10 && content.length > 50) {
            handleAddStandardInfo({
              name: infoFile.name,
              content: `文件内容主要由不可显示的字符组成，可能不是文本文件。\n建议尝试其他格式的文件。\n文件名：${infoFile.name}\n文件大小：${formatFileSize(infoFile.size)}`,
              type: 'text'
            });
            return;
          }
          
          // 9. 如果一切正常，使用清理后的内容
          handleAddStandardInfo({ name: infoFile.name, content: cleanContent, type: 'text' });
        } catch (error) {
          console.error('解析文件内容时出错:', error);
          handleAddStandardInfo({
            name: infoFile.name,
            content: `解析文件内容时出错：${error.message}\n文件名：${infoFile.name}\n文件大小：${formatFileSize(infoFile.size)}`,
            type: 'text'
          });
        }
      }
    };
    
    // 对于文本文件，指定UTF-8编码读取，并添加错误处理
    if (infoFile.type.includes('image/')) {
      reader.readAsDataURL(infoFile);
    } else {
      // 先尝试UTF-8编码读取
      reader.readAsText(infoFile, 'UTF-8');
      // 增强文件读取的鲁棒性，防止读取失败导致的预览问题
      setTimeout(() => {
        if (reader.readyState === FileReader.LOADING) {
          console.warn('文件读取超时，可能是大文件或特殊编码文件');
          // 取消读取，避免长时间阻塞
          reader.abort();
          handleAddStandardInfo({
            name: infoFile.name,
            content: `文件读取超时，可能是大文件或特殊编码文件
建议：
1. 检查文件大小，过大的文件可能需要分批处理
2. 确认文件编码格式是否为UTF-8
文件名：${infoFile.name}
文件大小：${formatFileSize(infoFile.size)}`,
            type: 'text'
          });
        }
      }, 10000); // 10秒超时
    }
  };
  
  // 格式化文件大小显示
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="app-layout">
      {/* 左侧边栏 */}
      <aside className="sidebar">
        {/* Logo区域 */}
        <div className="sidebar-header">
          <img 
            src="/checki.png" 
            className="app-logo" 
            alt="AI校稿logo" 
          />
        </div>
        <div className="sidebar-menu">
          {/* 单个校对按钮已移除 */}
        </div>
        
        {/* 统计信息区域 - 新布局 */}
        <div className="statistics-section">
          <div className="statistics-card">
            <div className="main-stats">
              <div className="file-count">
                <div className="file-number">{statistics.totalFiles}</div>
                <div className="file-label">文件数</div>
              </div>
              <div className="detail-stats">
                <div className="detail-row">
                  <div className="detail-item">
                    <div className="detail-number">{statistics.spellingErrors}</div>
                    <div className="detail-label">错别字</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-number">{statistics.infoErrors}</div>
                    <div className="detail-label">信息错误</div>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-item">
                    <div className="detail-number">{statistics.complianceIssues}</div>
                    <div className="detail-label">合规问题</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-number">{statistics.logoDifferences}</div>
                    <div className="detail-label">LOGO差异</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 项目任务列表 - 简化版本 */}
        <div className="projects-section">
          {Object.entries(projectTasks).map(([project, tasks], projectIndex) => (
            <div key={projectIndex} className="project-item">
              <div 
                className={`project-name ${expandedProjects.has(project) ? 'expanded' : 'collapsed'}`}
                onClick={() => toggleProject(project)}
              >
                <span className="project-title">{project}</span>
                <span className="task-count">{tasks.length}</span>
              </div>
              {expandedProjects.has(project) && (
                <div className="task-list">
                  {tasks.map((task, taskIndex) => (
                    <div 
                      key={taskIndex} 
                      className="task-item"
                      onClick={() => handleTaskClick(project, task)}
                    >
                      {task}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* 用户信息区域 - 点击用户名弹出下拉菜单 */}
        {user && (
          <div className="user-section">
            <div className="user-profile-trigger" onClick={() => setShowUserDropdown(!showUserDropdown)}>
              <div className="user-avatar">
                {user.email.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{user.email.split('@')[0]}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
            {/* 下拉菜单 */}
            {showUserDropdown && (
              <div className="user-dropdown">
                <a href="/profile" className="dropdown-item" onClick={() => setShowUserDropdown(false)}>
                  个人信息
                </a>
                <a href="/settings" className="dropdown-item" onClick={() => setShowUserDropdown(false)}>
                  系统设置
                </a>
                <button className="dropdown-item logout-btn" onClick={() => {
                  handleLogout();
                  setShowUserDropdown(false);
                }}>
                  退出
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
      
      {/* 右侧主内容区 */}
      <main className="main-content">
        {showProjectManagement ? (
          // 项目管理页面
          <div className="project-management-page">
            <div className="result-header">
              <div className="document-title">项目管理</div>
              <div className="header-actions">
                <button className="new-task-btn" onClick={handleCloseProjectManagement}>
                  返回
                </button>
              </div>
            </div>
            
            <div className="result-content" style={{ padding: '24px' }}>
              {/* 左侧项目列表 */}
              <div style={{
                width: '250px',
                background: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px',
                marginRight: '24px'
              }}>
                <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}>项目列表</h3>
                
                {/* 新建项目 */}
                <div style={{ marginBottom: '24px' }}>
                  <input 
                    type="text" 
                    placeholder="请输入新项目名称" 
                    value={newProjectName} 
                    onChange={(e) => setNewProjectName(e.target.value)}
                    style={{
                      width: 'calc(100% - 80px)',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginRight: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <button 
                    onClick={handleCreateProject}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#e0e0e0',
                      color: '#333',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    新建
                  </button>
                </div>
                
                {/* 项目列表 */}
                <div>
                  {Object.keys(projects).map((projectName, index) => (
                    <div key={index} style={{ marginBottom: '12px' }}>
                      <div 
                        style={{
                          padding: '12px',
                          backgroundColor: 'transparent',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: selectedManagementProject === projectName ? 'bold' : 'normal'
                        }}
                        onClick={() => handleSelectProject(projectName)}
                      >
                        {projectName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 右侧项目详情 */}
              <div style={{
                flex: 1,
                background: '#ffffff',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                {selectedManagementProject ? (
                  <div>
                    {/* 项目标准LOGO */}
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>项目标准LOGO</h3>
                        <button 
                          onClick={handleAddLogoClick}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          上传
                        </button>
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.gif" 
                          onChange={handleAddLogo}
                          style={{ display: 'none' }}
                          id="logo-upload"
                        />
                      </div>
                       
                      {/* LOGO列表 */}
                      <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '16px', display: 'flex', gap: '24px' }}>
                        {projects[selectedManagementProject].logos.map((logo, index) => (
                          <div key={index} style={{
                            textAlign: 'center'
                          }}>
                            <div 
                              style={{
                                width: '100px',
                                height: '100px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                backgroundColor: '#f9f9f9'
                              }}
                              onClick={() => handlePreview(logo.url, 'image')}
                            >
                              <img 
                                src={logo.url} 
                                alt={logo.name} 
                                style={{ maxWidth: '80px', maxHeight: '80px' }}
                              />
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLogo(index);
                              }}
                              style={{
                                marginTop: '8px',
                                padding: '4px 12px',
                                backgroundColor: 'transparent',
                                color: '#666',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 项目标准信息 */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>项目标准信息</h3>
                        <button 
                          onClick={handleAddStandardInfoClick}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          上传
                        </button>
                        <input 
                          type="file" 
                          accept=".txt,.docx,.pdf,.jpg,.jpeg,.png,.gif" 
                          onChange={handleAddStandardInfoFile}
                          style={{ display: 'none' }}
                          id="standard-info-upload"
                        />
                      </div>
                       
                      {/* 标准信息列表 */}
                      <div style={{ borderTop: '1px solid #e0e0e0' }}>
                        {projects[selectedManagementProject].standardInfo.map((info, index) => {
                          // 处理新的信息对象格式
                          const isObject = typeof info === 'object' && info !== null;
                          const title = isObject ? 
                            (info.name.length > 30 ? info.name.substring(0, 30) + '...' : info.name) : 
                            (info.length > 30 ? info.substring(0, 30) + '...' : info);
                          
                          const previewContent = isObject ? info.content : info;
                          const previewType = isObject ? info.type : 'text';
                          
                          return (
                            <div key={index} style={{
                              padding: '12px 0',
                              borderBottom: '1px solid #f0f0f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div 
                                style={{ cursor: 'pointer', color: '#333' }}
                                onClick={() => handleOldPreview(previewContent, previewType)}
                              >
                                {title}
                              </div>
                              <button 
                                onClick={() => handleDeleteStandardInfo(index)}
                                style={{
                                  padding: '4px 12px',
                                  backgroundColor: 'transparent',
                                  color: '#666',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                删除
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
                    选择一个项目查看详情
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : showProofreadingResult ? (
          // 校对结果呈现页面
          <div className="proofreading-result">
            {/* 顶部导航 */}
            <div className="result-header">
              {/* 左侧标题 */}
              <div className="document-title">
                {currentTask}
              </div>
              {/* 预览按钮 */}
              <button 
                className="preview-btn"
                onClick={() => handlePreview(extractedContent, fileType, currentTask)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#1890ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginRight: '12px'
                }}
              >
                预览文档
              </button>
              {/* 右侧操作按钮 */}
              <div className="header-actions">
                <button className="new-task-btn" onClick={handleNewTask}>
                  + 新任务
                </button>
                <button className="project-management-btn" onClick={handleProjectManagement}>
                  项目管理
                </button>
              </div>
            </div>
            
            {/* 内容展示区域 */}
            <div className="result-content">
              {/* 原文/原图 */}
              <div className="original-content">
                <div className="content-header">
                  原 稿
                </div>
                <div className="content-body">
                  {fileType === 'text' ? (
                    <div className="text-content">
                      {extractedContent || '暂无文本内容'}
                    </div>
                  ) : (
                    <div className="image-content">
                      {extractedContent ? (
                        <img 
                          src={extractedContent} 
                          alt="原图" 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <div className="content-placeholder">暂无图片内容</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 校对报告 */}
              <div className="report-content">
                <div className="content-header">
                  校对报告
                  <button className="download-btn" onClick={handleDownloadReport}>
                    ⤓ 下载
                  </button>
                </div>
                <div className="content-body">
                  {proofreadingResult ? (
                    <div className="proofreading-details">
                      {/* 统计信息 */}
                      <div className="statistics">
                        <h4>校对统计</h4>
                        <div className="stats-grid">
                          <div className="stat-item">
                            <span className="stat-label">总错误数</span>
                            <span className="stat-value">{proofreadingResult.statistics.totalErrors}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">拼写错误</span>
                            <span className="stat-value">{proofreadingResult.statistics.spellingErrors}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">语法错误</span>
                            <span className="stat-value">{proofreadingResult.statistics.grammarErrors}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">标点错误</span>
                            <span className="stat-value">{proofreadingResult.statistics.punctuationErrors}</span>
                          </div>
                          <div className="stat-item accuracy">
                            <span className="stat-label">准确率</span>
                            <span className="stat-value">{proofreadingResult.statistics.accuracyRate}%</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 错误列表 */}
                      <div className="errors-list">
                        <h4>错误详情</h4>
                        {proofreadingResult.errors.map((error, index) => (
                          <div key={index} className={`error-item error-${error.type}`}>
                            <div className="error-header">
                              <span className="error-type">
                                {error.type === 'spelling' && '拼写错误'}
                                {error.type === 'grammar' && '语法错误'}
                                {error.type === 'punctuation' && '标点错误'}
                              </span>
                            </div>
                            <div className="error-context">
                              {error.context}
                            </div>
                            <div className="error-suggestion">
                              <span className="original-text">{error.original}</span>
                              <span className="arrow">→</span>
                              <span className="corrected-text">{error.corrected}</span>
                            </div>
                            <div className="error-note">
                              {error.suggestion}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 总结 */}
                      <div className="summary">
                        <h4>总结</h4>
                        <p>{proofreadingResult.summary}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="content-placeholder">
                      校对报告内容将显示在这里
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 上传页面
          <div className="upload-container">
            {/* 右上角项目管理按钮 */}
            <div className="header-actions" style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              zIndex: 10 
            }}>
              <button className="project-management-btn" onClick={handleProjectManagement}>
                项目管理
              </button>
            </div>
            
            {/* 内容显示区域 */}
            <div className="content-area" style={{ paddingTop: '50px' }}>
              {/* 上传区域 - 调整为上下居中对齐 */}
              <div className="upload-section">
                <h2>请上传待校对稿件（支持docx/jpg/png）</h2>
                {queueStatus.totalTasks > 0 && (
                  <div className="queue-status">
                    <p>队列状态: {queueStatus.currentTasks} / {queueStatus.totalTasks} 任务进行中</p>
                  </div>
                )}
                <div 
                  className={`upload-box ${isUploading ? 'uploading' : ''}`}
                  onClick={handleUploadClick}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}
                >
                  {isUploading ? (
                    <div className="upload-loading">
                      <div className="loading-spinner"></div>
                      <span>正在上传...</span>
                      {activeTaskProgress > 0 && (
                        <div className="progress-container">
                          <div className="progress-bar">
                            <div 
                              className="progress-fill" 
                              style={{ width: `${activeTaskProgress}%` }}
                            ></div>
                          </div>
                          <span className="progress-text">{activeTaskProgress}%</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <span>{file ? file.name : '拖拽文件到此处或点击上传'}</span>
                    </div>
                  )}
                  <input 
                    type="file" 
                    id="file-input" 
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    accept=".docx,.jpg,.png"
                    disabled={isUploading}
                  />
                </div>
                
                {/* 表单控制区域 */}
                <div className="form-controls">
                  <select 
                    className="project-select"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                  >
                    <option value="">请选择项目（不选则只校对文字）</option>
                    {Object.keys(projects).map((project, index) => (
                      <option key={index} value={project}>{project}</option>
                    ))}
                  </select>
                  <button className="submit-btn" onClick={handleSubmit} disabled={isUploading}>
                    {isUploading ? '上传中...' : '提交'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* 文档预览组件 */}
      <DocumentPreview
        visible={previewVisible}
        onClose={handleClosePreview}
        fileData={previewFileData?.data}
        fileName={previewFileData?.fileName}
        fileType={previewFileData?.fileType}
      />
      
      {/* 旧的预览弹窗（保留以兼容现有调用） */}
      {previewContent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e0e0e0', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>
                {previewType === 'text' ? '文本预览' : '图片预览'}
              </h3>
              <button 
                onClick={() => setPreviewContent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>
            {previewType === 'text' ? (
              <div 
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: '1.6',
                  fontSize: '14px',
                  color: '#333',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, source-code-pro, monospace',
                  padding: '12px',
                  backgroundColor: '#f9f9f9',
                  borderRadius: '4px',
                  maxHeight: 'calc(90vh - 120px)',
                  overflow: 'auto'
                }}
              >
                {previewContent}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img 
                  src={previewContent} 
                  alt="预览" 
                  style={{
                    maxWidth: '100%', 
                    maxHeight: 'calc(90vh - 120px)',
                    objectFit: 'contain',
                    borderRadius: '4px',
                    border: '1px solid #e0e0e0'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;