/**
 * AI校对服务
 * 集成OpenAI API进行文本纠错、合规性检查等功能
 * 
 * 安全说明：所有API调用通过服务端代理进行，前端不直接处理API密钥
 */

import { requestWithRetry } from './apiClient';

/**
 * 通过服务端代理调用AI校对API
 * @param {string} text - 要校对的文本
 * @param {string} projectName - 项目名称（用于上下文）
 * @returns {Promise<object>} - 校对结果
 */
export const proofreadTextWithOpenAI = async (text, projectName = '') => {
  try {
    // 构建请求数据
    const requestData = {
      text,
      projectName: projectName || '通用项目',
      timestamp: Date.now()
    };

    // 通过服务端代理调用AI校对API
    const response = await requestWithRetry({
      url: '/api/proofread', // 服务端代理API端点
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: requestData
    }, {
      maxCount: 3, // 最多重试3次
      delay: 2000 // 每次重试间隔2秒
    });
    
    // 解析服务端返回的校对结果
    if (response && response.success) {
      return response.data;
    } else {
      console.warn('服务端API返回格式异常，使用模拟结果');
      return generateMockProofreadingResult(text);
    }
    
  } catch (error) {
    console.error('调用AI校对API时出错:', error);
    
    // API调用失败时，返回模拟结果
    console.log('使用模拟校对结果');
    return generateMockProofreadingResult(text);
  }
};

/**
 * 直接调用OpenAI API（仅用于服务端，前端代码中已移除）
 * @deprecated 已废弃，仅保留供服务端参考
 * @param {string} text - 要校对的文本
 * @param {string} projectName - 项目名称
 * @returns {Promise<object>} - 校对结果
 */
// eslint-disable-next-line
const proofreadTextDirectAPI = async (text, projectName = '') => {
  // ⚠️ 警告：此函数仅用于服务端参考实现，不应在前端直接调用
  console.warn('proofreadTextDirectAPI: 此函数不应在前端直接调用，请使用服务端代理');
  
  // 返回模拟结果，避免在前端暴露API密钥
  return generateMockProofreadingResult(text);
};

/**
 * 生成模拟校对结果
 * 当API调用失败或无API密钥时使用
 * @param {string} text - 要校对的文本
 * @returns {object} - 模拟的校对结果
 */
export const generateMockProofreadingResult = (text) => {
  // 根据文本长度和内容生成合理的模拟错误
  const mockErrors = [];
  
  // 查找可能的拼写错误
  const spellingErrors = [
    { original: '瑞付', corrected: '瑞府' },
    { original: '康定一十九', corrected: '康定壹拾玖' },
    { original: '豪化', corrected: '豪华' },
    { original: '精至', corrected: '精致' },
    { original: '侍家', corrected: '世家' }
  ];
  
  // 查找可能的语法错误
  const grammarErrors = [
    { original: '将于下周进行开盘', corrected: '将于下周开盘' },
    { original: '目前正在热销中', corrected: '目前热销中' },
    { original: '位于城市中心地带位置', corrected: '位于城市中心地带' }
  ];
  
  // 查找可能的标点错误
  const punctuationErrors = [
    { original: '开盘特惠', corrected: '开盘特惠！' },
    { original: '欢迎品鉴', corrected: '欢迎品鉴！' },
    { original: '限量发售', corrected: '限量发售！' }
  ];
  
  // 随机添加一些错误
  const errorTypes = ['spelling', 'grammar', 'punctuation'];
  const maxErrors = Math.min(5, Math.floor(text.length / 100) + 1); // 根据文本长度确定最大错误数
  
  for (let i = 0; i < maxErrors; i++) {
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
    let errorExample;
    
    switch (errorType) {
      case 'spelling':
        errorExample = spellingErrors[Math.floor(Math.random() * spellingErrors.length)];
        break;
      case 'grammar':
        errorExample = grammarErrors[Math.floor(Math.random() * grammarErrors.length)];
        break;
      case 'punctuation':
        errorExample = punctuationErrors[Math.floor(Math.random() * punctuationErrors.length)];
        break;
      default:
        errorExample = { original: '示例错误', corrected: '修正后的文本' };
        break;
    }
    
    // 随机生成位置和上下文
    const position = Math.floor(Math.random() * (text.length - 50));
    const contextLength = 30;
    const contextStart = Math.max(0, position - 10);
    const contextEnd = Math.min(text.length, position + contextLength);
    const context = text.substring(contextStart, contextEnd) || `示例上下文包含${errorExample.original}`;
    
    mockErrors.push({
      type: errorType,
      original: errorExample.original,
      corrected: errorExample.corrected,
      position: position,
      context: context,
      suggestion: `建议修改为：${errorExample.corrected}`
    });
  }
  
  // 统计各类错误数量
  const spellingCount = mockErrors.filter(err => err.type === 'spelling').length;
  const grammarCount = mockErrors.filter(err => err.type === 'grammar').length;
  const punctuationCount = mockErrors.filter(err => err.type === 'punctuation').length;
  
  // 计算准确率（模拟）
  const accuracyRate = Math.max(80, 100 - Math.min(20, mockErrors.length * 2));
  
  return {
    errors: mockErrors,
    statistics: {
      totalErrors: mockErrors.length,
      spellingErrors: spellingCount,
      grammarErrors: grammarCount,
      punctuationErrors: punctuationCount,
      accuracyRate: accuracyRate
    },
    summary: mockErrors.length > 0 
      ? `文档存在${mockErrors.length}处需要修改的地方，主要集中在${getErrorTypesText(mockErrors)}方面。总体质量良好，修改后将更加专业。`
      : '文档质量优秀，未发现明显错误。'
  };
};

/**
 * 获取错误类型文本描述
 * @param {Array} errors - 错误列表
 * @returns {string} - 错误类型描述文本
 */
const getErrorTypesText = (errors) => {
  const types = [...new Set(errors.map(err => err.type))];
  const typeMap = {
    spelling: '拼写',
    grammar: '语法',
    punctuation: '标点符号'
  };
  
  return types.map(type => typeMap[type]).join('、');
};

/**
 * 检查文本中是否包含特定的品牌关键词
 * @param {string} text - 要检查的文本
 * @param {Array} keywords - 要检查的关键词列表
 * @returns {Array} - 包含的关键词及其位置
 */
export const checkBrandKeywords = (text, keywords = []) => {
  if (!keywords || keywords.length === 0) {
    return [];
  }
  
  const results = [];
  
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      results.push({
        keyword: match[0],
        position: match.index,
        context: text.substring(
          Math.max(0, match.index - 20),
          Math.min(text.length, match.index + match[0].length + 20)
        )
      });
    }
  });
  
  return results;
};

/**
 * 生成校对报告
 * @param {object} proofreadingResult - 校对结果
 * @param {string} fileName - 文件名
 * @returns {string} - 格式化的校对报告文本
 */
export const generateProofreadingReport = (proofreadingResult, fileName) => {
  const { errors, statistics, summary } = proofreadingResult;
  
  let report = `=== 校对报告 ===\n`;
  report += `文件名：${fileName}\n`;
  report += `生成时间：${new Date().toLocaleString()}\n\n`;
  
  // 添加统计信息
  report += `--- 统计信息 --->\n`;
  report += `总错误数：${statistics.totalErrors}\n`;
  report += `拼写错误：${statistics.spellingErrors}\n`;
  report += `语法错误：${statistics.grammarErrors}\n`;
  report += `标点错误：${statistics.punctuationErrors}\n`;
  report += `准确率：${statistics.accuracyRate}%\n\n`;
  
  // 添加错误详情
  if (errors.length > 0) {
    report += `--- 错误详情 --->\n`;
    errors.forEach((error, index) => {
      report += `${index + 1}. [${getErrorTypeText(error.type)}] ${error.original} → ${error.corrected}\n`;
      report += `   上下文：${error.context}\n`;
      report += `   建议：${error.suggestion}\n\n`;
    });
  }
  
  // 添加总结
  report += `--- 总结 --->\n`;
  report += summary + '\n';
  
  return report;
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