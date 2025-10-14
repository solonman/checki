import { generateProofreadingReport } from './proofreadingService';
import { format } from 'date-fns';

/**
 * 报告生成服务
 * 支持生成和导出校对报告
 * 支持多种报告格式：PDF、Word、Excel、CSV、HTML
 */

/**
 * 生成单个报告
 * @param {Object} taskData - 任务数据
 * @param {String} format - 报告格式
 * @returns {Promise<Blob>} - 生成的报告文件Blob
 */
export const generateSingleReport = async (taskData, format = 'pdf') => {
  try {
    // 确保任务数据完整
    if (!taskData || !taskData.proofreading_result || !taskData.file_name) {
      throw new Error('任务数据不完整，无法生成报告');
    }

    // 根据格式生成不同类型的报告
    switch (format.toLowerCase()) {
      case 'pdf':
        return await generatePDFReport(taskData);
      case 'docx':
        return await generateWordReport(taskData);
      case 'csv':
        return await generateCSVReport(taskData);
      case 'html':
        return generateHTMLReport(taskData);
      case 'json':
        return generateJSONReport(taskData);
      default:
        throw new Error(`不支持的报告格式: ${format}`);
    }
  } catch (error) {
    console.error('生成单个报告失败:', error);
    throw error;
  }
};


/**
 * 生成统计摘要报告
 * @param {Array} tasksData - 任务数据数组
 * @param {String} format - 报告格式
 * @returns {Promise<Blob>} - 生成的统计报告文件Blob
 */
export const generateSummaryReport = async (tasksData, format = 'pdf') => {
  try {
    if (!tasksData || tasksData.length === 0) {
      throw new Error('任务数据为空，无法生成统计报告');
    }

    // 计算统计数据
    const summaryData = calculateSummaryStatistics(tasksData);
    
    // 生成报告内容
    switch (format.toLowerCase()) {
      case 'pdf':
        return await generateSummaryPDFReport(summaryData, tasksData);
      case 'docx':
        return await generateSummaryWordReport(summaryData, tasksData);
      case 'csv':
        return generateSummaryCSVReport(summaryData, tasksData);
      case 'html':
        return generateSummaryHTMLReport(summaryData, tasksData);
      case 'json':
        return generateSummaryJSONReport(summaryData);
      default:
        throw new Error(`不支持的报告格式: ${format}`);
    }
  } catch (error) {
    console.error('生成统计报告失败:', error);
    throw error;
  }
};

/**
 * 计算统计摘要数据
 * @param {Array} tasksData - 任务数据数组
 * @returns {Object} - 统计摘要数据
 */
const calculateSummaryStatistics = (tasksData) => {
  const validTasks = tasksData.filter(task => 
    task.proofreading_result && 
    task.proofreading_result.statistics
  );

  const totalTasks = validTasks.length;
  let totalErrors = 0;
  let totalSpellingErrors = 0;
  let totalGrammarErrors = 0;
  let totalPunctuationErrors = 0;
  let totalAccuracy = 0;
  
  // 按项目分组统计
  const projectStats = {};
  
  validTasks.forEach(task => {
    const { statistics } = task.proofreading_result;
    totalErrors += statistics.totalErrors || 0;
    totalSpellingErrors += statistics.spellingErrors || 0;
    totalGrammarErrors += statistics.grammarErrors || 0;
    totalPunctuationErrors += statistics.punctuationErrors || 0;
    totalAccuracy += statistics.accuracyRate || 100;
    
    // 按项目统计
    const projectName = task.project || '未分类';
    if (!projectStats[projectName]) {
      projectStats[projectName] = {
        taskCount: 0,
        errorCount: 0,
        accuracySum: 0
      };
    }
    
    projectStats[projectName].taskCount += 1;
    projectStats[projectName].errorCount += statistics.totalErrors || 0;
    projectStats[projectName].accuracySum += statistics.accuracyRate || 100;
  });
  
  // 计算平均准确率
  const averageAccuracy = totalTasks > 0 ? totalAccuracy / totalTasks : 100;
  
  // 计算各项目的平均准确率
  Object.keys(projectStats).forEach(projectName => {
    projectStats[projectName].averageAccuracy = 
      projectStats[projectName].accuracySum / projectStats[projectName].taskCount;
  });
  
  return {
    totalTasks,
    totalErrors,
    totalSpellingErrors,
    totalGrammarErrors,
    totalPunctuationErrors,
    averageAccuracy,
    projectStats
  };
};

/**
 * 生成PDF格式报告
 * 注意：实际项目中需要集成PDF生成库如jspdf等
 * @param {Object} taskData - 任务数据
 * @returns {Promise<Blob>} - 生成的PDF文件Blob
 */
const generatePDFReport = async (taskData) => {
  try {
    // 由于前端PDF生成较为复杂，这里暂时使用文本报告转换为PDF的简化实现
    // 实际项目中可以集成jspdf或pdfmake等库实现更复杂的PDF生成
    const textReport = generateProofreadingReport(taskData.proofreading_result, taskData.file_name);
    
    // 为演示目的，创建一个简单的文本文件Blob
    const blob = new Blob([textReport], { type: 'application/pdf' });
    return blob;
  } catch (error) {
    console.error('生成PDF报告失败:', error);
    throw error;
  }
};

/**
 * 生成Word格式报告
 * @param {Object} taskData - 任务数据
 * @returns {Promise<Blob>} - 生成的Word文件Blob
 */
const generateWordReport = async (taskData) => {
  try {
    // 同样，这里使用简化实现
    // 实际项目中可以使用docx-templates等库生成Word文档
    const textReport = generateProofreadingReport(taskData.proofreading_result, taskData.file_name);
    
    // 创建一个简单的文本文件Blob
    const blob = new Blob([textReport], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    return blob;
  } catch (error) {
    console.error('生成Word报告失败:', error);
    throw error;
  }
};

/**
 * 生成CSV格式报告
 * @param {Object} taskData - 任务数据
 * @returns {Blob} - 生成的CSV文件Blob
 */
const generateCSVReport = (taskData) => {
  try {
    const { proofreading_result, file_name } = taskData;
    const { errors, statistics } = proofreading_result;
    
    // CSV头部
    let csvContent = '类型,原始文本,修正文本,上下文,建议\n';
    
    // 添加错误数据
    errors.forEach(error => {
      const type = getErrorTypeText(error.type);
      const original = error.original || '';
      const corrected = error.corrected || '';
      const context = error.context || '';
      const suggestion = error.suggestion || '';
      
      // 处理CSV格式的特殊字符（转义逗号和引号）
      const escapeCSV = (text) => `"${text.replace(/"/g, '""')}"`;
      
      csvContent += `${escapeCSV(type)},${escapeCSV(original)},${escapeCSV(corrected)},${escapeCSV(context)},${escapeCSV(suggestion)}\n`;
    });
    
    // 添加统计信息
    csvContent += '\n---统计信息---\n';
    csvContent += `总错误数,${statistics.totalErrors}\n`;
    csvContent += `拼写错误,${statistics.spellingErrors}\n`;
    csvContent += `语法错误,${statistics.grammarErrors}\n`;
    csvContent += `标点错误,${statistics.punctuationErrors}\n`;
    csvContent += `准确率,${statistics.accuracyRate}%\n`;
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  } catch (error) {
    console.error('生成CSV报告失败:', error);
    throw error;
  }
};

/**
 * 生成HTML格式报告
 * @param {Object} taskData - 任务数据
 * @returns {Blob} - 生成的HTML文件Blob
 */
const generateHTMLReport = (taskData) => {
  try {
    const { proofreading_result, file_name } = taskData;
    const { errors, statistics, summary } = proofreading_result;
    
    // HTML模板
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${file_name} - 校对报告</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        h1, h2 { color: #333; }
        .header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
        .stats { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .stats table { width: 100%; border-collapse: collapse; }
        .stats td { padding: 8px; border-bottom: 1px solid #eee; }
        .error-list { margin-top: 20px; }
        .error-item { border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        .error-type { font-weight: bold; color: #d32f2f; }
        .context { font-style: italic; color: #666; }
        .summary { margin-top: 30px; padding: 15px; background-color: #e8f5e8; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>校对报告</h1>
        <p>文件名：${file_name}</p>
        <p>生成时间：${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
      </div>
      
      <div class="stats">
        <h2>统计信息</h2>
        <table>
          <tr><td>总错误数：</td><td>${statistics.totalErrors}</td></tr>
          <tr><td>拼写错误：</td><td>${statistics.spellingErrors}</td></tr>
          <tr><td>语法错误：</td><td>${statistics.grammarErrors}</td></tr>
          <tr><td>标点错误：</td><td>${statistics.punctuationErrors}</td></tr>
          <tr><td>准确率：</td><td>${statistics.accuracyRate}%</td></tr>
        </table>
      </div>
      
      <div class="error-list">
        <h2>错误详情</h2>
        ${errors.length > 0 ? 
          errors.map((error, index) => `
            <div class="error-item">
              <p><span class="error-type">${index + 1}. [${getErrorTypeText(error.type)}]</span> ${error.original} → ${error.corrected}</p>
              <p class="context">上下文：${error.context}</p>
              <p>建议：${error.suggestion}</p>
            </div>
          `).join('') : 
          '<p>未发现错误</p>'
        }
      </div>
      
      <div class="summary">
        <h2>总结</h2>
        <p>${summary}</p>
      </div>
    </body>
    </html>
    `;
    
    return new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  } catch (error) {
    console.error('生成HTML报告失败:', error);
    throw error;
  }
};

/**
 * 生成JSON格式报告
 * @param {Object} taskData - 任务数据
 * @returns {Blob} - 生成的JSON文件Blob
 */
const generateJSONReport = (taskData) => {
  try {
    const reportData = {
      fileName: taskData.file_name,
      project: taskData.project || '',
      createdAt: taskData.created_at,
      generatedAt: new Date().toISOString(),
      proofreadingResult: taskData.proofreading_result
    };
    
    const jsonContent = JSON.stringify(reportData, null, 2);
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  } catch (error) {
    console.error('生成JSON报告失败:', error);
    throw error;
  }
};

/**
 * 生成统计摘要PDF报告
 * @param {Object} summaryData - 统计摘要数据
 * @param {Array} tasksData - 任务数据数组
 * @returns {Promise<Blob>} - 生成的PDF文件Blob
 */
const generateSummaryPDFReport = async (summaryData, tasksData) => {
  try {
    // 简化实现，实际项目中需使用PDF生成库
    let reportContent = `=== 校对统计报告 ===\n`;
    reportContent += `生成时间：${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
    reportContent += `总任务数：${summaryData.totalTasks}\n\n`;
    
    reportContent += `--- 总体统计 --->\n`;
    reportContent += `总错误数：${summaryData.totalErrors}\n`;
    reportContent += `拼写错误：${summaryData.totalSpellingErrors}\n`;
    reportContent += `语法错误：${summaryData.totalGrammarErrors}\n`;
    reportContent += `标点错误：${summaryData.totalPunctuationErrors}\n`;
    reportContent += `平均准确率：${summaryData.averageAccuracy.toFixed(2)}%\n\n`;
    
    reportContent += `--- 项目统计 --->\n`;
    Object.keys(summaryData.projectStats).forEach(projectName => {
      const stats = summaryData.projectStats[projectName];
      reportContent += `项目：${projectName}\n`;
      reportContent += `  任务数：${stats.taskCount}\n`;
      reportContent += `  错误数：${stats.errorCount}\n`;
      reportContent += `  平均准确率：${stats.averageAccuracy.toFixed(2)}%\n`;
    });
    
    return new Blob([reportContent], { type: 'application/pdf' });
  } catch (error) {
    console.error('生成统计PDF报告失败:', error);
    throw error;
  }
};

/**
 * 生成统计摘要Word报告
 * @param {Object} summaryData - 统计摘要数据
 * @param {Array} tasksData - 任务数据数组
 * @returns {Promise<Blob>} - 生成的Word文件Blob
 */
const generateSummaryWordReport = async (summaryData, tasksData) => {
  try {
    // 简化实现
    let reportContent = `=== 校对统计报告 ===\n`;
    reportContent += `生成时间：${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
    reportContent += `总任务数：${summaryData.totalTasks}\n\n`;
    
    reportContent += `--- 总体统计 --->\n`;
    reportContent += `总错误数：${summaryData.totalErrors}\n`;
    reportContent += `拼写错误：${summaryData.totalSpellingErrors}\n`;
    reportContent += `语法错误：${summaryData.totalGrammarErrors}\n`;
    reportContent += `标点错误：${summaryData.totalPunctuationErrors}\n`;
    reportContent += `平均准确率：${summaryData.averageAccuracy.toFixed(2)}%\n\n`;
    
    reportContent += `--- 项目统计 --->\n`;
    Object.keys(summaryData.projectStats).forEach(projectName => {
      const stats = summaryData.projectStats[projectName];
      reportContent += `项目：${projectName}\n`;
      reportContent += `  任务数：${stats.taskCount}\n`;
      reportContent += `  错误数：${stats.errorCount}\n`;
      reportContent += `  平均准确率：${stats.averageAccuracy.toFixed(2)}%\n`;
    });
    
    return new Blob([reportContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  } catch (error) {
    console.error('生成统计Word报告失败:', error);
    throw error;
  }
};

/**
 * 生成统计摘要CSV报告
 * @param {Object} summaryData - 统计摘要数据
 * @param {Array} tasksData - 任务数据数组
 * @returns {Blob} - 生成的CSV文件Blob
 */
const generateSummaryCSVReport = (summaryData, tasksData) => {
  try {
    // CSV头部
    let csvContent = '项目名称,任务数,错误数,平均准确率\n';
    
    // 添加各项目统计数据
    Object.keys(summaryData.projectStats).forEach(projectName => {
      const stats = summaryData.projectStats[projectName];
      csvContent += `${projectName},${stats.taskCount},${stats.errorCount},${stats.averageAccuracy.toFixed(2)}%\n`;
    });
    
    // 添加总体统计
    csvContent += '\n---总体统计---\n';
    csvContent += `总任务数: ${summaryData.totalTasks}\n`;
    csvContent += `总错误数: ${summaryData.totalErrors}\n`;
    csvContent += `平均准确率: ${summaryData.averageAccuracy.toFixed(2)}%\n`;
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  } catch (error) {
    console.error('生成统计CSV报告失败:', error);
    throw error;
  }
};

/**
 * 生成统计摘要HTML报告
 * @param {Object} summaryData - 统计摘要数据
 * @param {Array} tasksData - 任务数据数组
 * @returns {Blob} - 生成的HTML文件Blob
 */
const generateSummaryHTMLReport = (summaryData, tasksData) => {
  try {
    // HTML模板
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>校对统计报告</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        h1, h2 { color: #333; }
        .header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
        .stats { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .project-stats { margin-top: 30px; }
        .project-item { border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>校对统计报告</h1>
        <p>生成时间：${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
        <p>总任务数：${summaryData.totalTasks}</p>
      </div>
      
      <div class="stats">
        <h2>总体统计</h2>
        <table>
          <tr><th>统计项</th><th>数值</th></tr>
          <tr><td>总错误数</td><td>${summaryData.totalErrors}</td></tr>
          <tr><td>拼写错误</td><td>${summaryData.totalSpellingErrors}</td></tr>
          <tr><td>语法错误</td><td>${summaryData.totalGrammarErrors}</td></tr>
          <tr><td>标点错误</td><td>${summaryData.totalPunctuationErrors}</td></tr>
          <tr><td>平均准确率</td><td>${summaryData.averageAccuracy.toFixed(2)}%</td></tr>
        </table>
      </div>
      
      <div class="project-stats">
        <h2>项目统计</h2>
        ${Object.keys(summaryData.projectStats).length > 0 ? 
          `<table>
            <tr><th>项目名称</th><th>任务数</th><th>错误数</th><th>平均准确率</th></tr>
            ${Object.keys(summaryData.projectStats).map(projectName => {
              const stats = summaryData.projectStats[projectName];
              return `
                <tr>
                  <td>${projectName}</td>
                  <td>${stats.taskCount}</td>
                  <td>${stats.errorCount}</td>
                  <td>${stats.averageAccuracy.toFixed(2)}%</td>
                </tr>
              `;
            }).join('')}
          </table>` : 
          '<p>暂无项目统计数据</p>'
        }
      </div>
    </body>
    </html>
    `;
    
    return new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  } catch (error) {
    console.error('生成统计HTML报告失败:', error);
    throw error;
  }
};

/**
 * 生成统计摘要JSON报告
 * @param {Object} summaryData - 统计摘要数据
 * @returns {Blob} - 生成的JSON文件Blob
 */
const generateSummaryJSONReport = (summaryData) => {
  try {
    const reportData = {
      generatedAt: new Date().toISOString(),
      totalTasks: summaryData.totalTasks,
      overallStatistics: {
        totalErrors: summaryData.totalErrors,
        totalSpellingErrors: summaryData.totalSpellingErrors,
        totalGrammarErrors: summaryData.totalGrammarErrors,
        totalPunctuationErrors: summaryData.totalPunctuationErrors,
        averageAccuracy: summaryData.averageAccuracy
      },
      projectStatistics: summaryData.projectStats
    };
    
    const jsonContent = JSON.stringify(reportData, null, 2);
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  } catch (error) {
    console.error('生成统计JSON报告失败:', error);
    throw error;
  }
};

/**
 * 获取错误类型文本
 * @param {string} type - 错误类型
 * @returns {string} - 错误类型中文描述
 */
const getErrorTypeText = (type) => {
  const typeMap = {
    spelling: '拼写错误',
    grammar: '语法错误',
    punctuation: '标点错误'
  };
  
  return typeMap[type] || type;
};

/**
 * 下载报告文件
 * @param {Blob} blob - 文件Blob数据
 * @param {String} fileName - 文件名
 */
export const downloadReport = (blob, fileName) => {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('下载报告失败:', error);
    throw error;
  }
};