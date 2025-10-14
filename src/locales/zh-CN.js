// 中文语言包
export default {
  // 公共组件
  common: {
    yes: '是',
    no: '否',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    confirm: '确认',
    loading: '加载中...',
    success: '操作成功',
    error: '操作失败',
    warning: '警告',
    info: '提示',
  },
  
  // 导航
  navigation: {
    dashboard: '仪表盘',
    projects: '项目管理',
    tasks: '任务管理',
    settings: '系统设置',
    admin: '管理员中心',
    logout: '退出登录',
  },
  
  // 上传页面
  upload: {
    title: '请上传待校对稿件',
    supportedFormats: '支持docx/jpg/png格式',
    dragDrop: '拖拽文件到此处或点击上传',
    selectProject: '请选择项目（不选则只校对文字）',
    submit: '提交',
    uploading: '正在上传...',
    queueStatus: '队列状态: {current} / {total} 任务进行中',
    newTask: '+ 新任务',
  },
  
  // 校对结果页面
  result: {
    originalContent: '原 稿',
    proofreadingReport: '校对报告',
    downloadReport: '⤓ 下载',
    statistics: '校对统计',
    totalErrors: '总错误数',
    spellingErrors: '拼写错误',
    grammarErrors: '语法错误',
    punctuationErrors: '标点错误',
    accuracy: '准确率',
    errorsList: '错误详情',
    summary: '总结',
    spellingError: '拼写错误',
    grammarError: '语法错误',
    punctuationError: '标点错误',
    originalText: '原文',
    correctedText: '修改建议',
  },
  
  // 设置页面
  settings: {
    pageTitle: '系统设置',
    pageDescription: '管理您的应用偏好和通知设置',
    basicSettings: '基本设置',
    language: '语言',
    theme: '暗黑模式',
    defaultProject: '默认项目',
    notificationSettings: '通知设置',
    notificationTypes: '通知类型',
    emailNotifications: '电子邮件通知',
    pushNotifications: '推送通知',
    systemNotifications: '系统通知',
    taskCompleteNotifications: '校对完成通知',
    deadlineReminderNotifications: '截止日期提醒',
    saveSettings: '保存设置',
    resetToDefaults: '重置为默认值',
    settingsSavedSuccessfully: '设置保存成功',
    resetToDefaultsMessage: '已重置为默认设置',
  },
  
  // 项目管理
  projects: {
    projectManagement: '项目管理',
    selectProject: '选择一个项目查看详情',
    projectName: '项目名称',
    addProject: '添加项目',
    projectDocuments: '项目文档',
    addDocument: '添加文档',
    deleteDocument: '删除文档',
    preview: '预览',
    logos: 'LOGO管理',
    addLogo: '添加LOGO',
    deleteLogo: '删除LOGO',
    supportedLogoFormats: '支持JPG、PNG、GIF格式',
  },
  
  // 登录/注册
  auth: {
    login: '登录',
    register: '注册',
    email: '邮箱',
    password: '密码',
    confirmPassword: '确认密码',
    forgotPassword: '忘记密码?',
    noAccount: '还没有账号?',
    haveAccount: '已有账号?',
    loginSuccess: '登录成功',
    registerSuccess: '注册成功',
    loginFailed: '登录失败',
    registerFailed: '注册失败',
  },
};