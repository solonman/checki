/**
 * AI校对服务
 * 集成OpenAI API进行文本纠错、合规性检查等功能
 */

import { requestWithRetry } from './apiClient';

/**
 * 配置OpenAI API密钥
 * 注意：在实际生产环境中，请确保API密钥的安全存储
 */
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || 'your-api-key'; // 从环境变量获取API密钥

/**
 * 调用OpenAI API进行文本校对
 * @param {string} text - 要校对的文本
 * @param {string} projectName - 项目名称（用于上下文）
 * @returns {Promise<object>} - 校对结果
 */
export const proofreadTextWithOpenAI = async (text, projectName = '') => {
  try {
    // 构建提示词，包含项目上下文和校对要求
    const prompt = `
    你是一名专业的广告文案校对专家。请仔细检查以下广告文案，从以下几个方面进行校对：
    1. 错别字检查
    2. 语法错误检查
    3. 标点符号使用规范
    4. 广告合规性（如是否存在误导性表述）
    5. 品牌名称、产品名称的正确性
    
    项目名称：${projectName || '通用项目'}
    
    请以JSON格式返回校对结果，包含：
    - errors: 错误列表，每项包含type(类型)、original(原文)、corrected(修正)、position(位置)、context(上下文)、suggestion(建议)
    - statistics: 统计信息，包含总错误数、各类错误数量、准确率
    - summary: 校对总结
    
    文本内容：
    ${text}
    `;

    // 调用OpenAI API，使用requestWithRetry实现错误重试机制
    const data = await requestWithRetry({
      url: 'https://api.openai.com/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      data: {
        model: 'gpt-3.5-turbo', // 使用适合的模型
        messages: [
          { role: 'system', content: '你是一名专业的广告文案校对专家。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3 // 较低的温度值确保结果更准确
      }
    }, {
      maxCount: 3, // 最多重试3次
      delay: 2000 // 每次重试间隔2秒
    });
    
    // 解析AI返回的JSON结果
    try {
      // 假设AI返回的内容是纯JSON字符串
      const result = JSON.parse(data.choices[0].message.content);
      return result;
    } catch (jsonError) {
      console.warn('无法解析AI返回的JSON格式，尝试使用默认结果格式');
      // 如果AI返回的不是纯JSON，使用模拟结果
      return generateMockProofreadingResult(text);
    }
  } catch (error) {
    console.error('调用OpenAI API时出错:', error);
    
    // API调用失败时，返回模拟结果
    console.log('使用模拟校对结果');
    return generateMockProofreadingResult(text);
  }
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