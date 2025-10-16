/**
 * AI校对服务代理
 * 服务端API代理，用于安全处理OpenAI API调用
 * 避免在前端直接暴露API密钥
 */

import { requestWithRetry } from './apiClient';
import { getEnv, getSensitiveEnv } from '../config/env.config';

/**
 * 服务端OpenAI API配置
 * 注意：此配置仅在服务端使用，不会暴露给前端
 */
const OPENAI_API_CONFIG = {
  apiKey: getEnv('OPENAI_API_KEY'),
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  maxTokens: 1000,
  temperature: 0.3
};

/**
 * 构建校对提示词
 * @param {string} text - 要校对的文本
 * @param {string} projectName - 项目名称
 * @returns {string} - 构建的提示词
 */
const buildProofreadingPrompt = (text, projectName = '') => {
  return `
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
};

/**
 * 调用OpenAI API进行文本校对（服务端专用）
 * @param {string} text - 要校对的文本
 * @param {string} projectName - 项目名称
 * @returns {Promise<object>} - 校对结果
 */
export const callOpenAIProofreadingAPI = async (text, projectName = '') => {
  // 验证API密钥
  if (!OPENAI_API_CONFIG.apiKey || OPENAI_API_CONFIG.apiKey === 'your-api-key') {
    throw new Error('OpenAI API密钥未配置');
  }

  try {
    const prompt = buildProofreadingPrompt(text, projectName);
    
    // 调用OpenAI API
    const response = await requestWithRetry({
      url: `${OPENAI_API_CONFIG.baseURL}/chat/completions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_CONFIG.apiKey}`
      },
      data: {
        model: OPENAI_API_CONFIG.model,
        messages: [
          { role: 'system', content: '你是一名专业的广告文案校对专家。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: OPENAI_API_CONFIG.maxTokens,
        temperature: OPENAI_API_CONFIG.temperature
      }
    }, {
      maxCount: 3,
      delay: 2000
    });

    // 解析AI返回的结果
    if (response && response.choices && response.choices[0]) {
      try {
        const aiContent = response.choices[0].message.content;
        const result = JSON.parse(aiContent);
        
        // 验证结果格式
        if (result.errors && result.statistics && result.summary) {
          return {
            success: true,
            data: result,
            timestamp: new Date().toISOString()
          };
        } else {
          console.warn('AI返回结果格式不完整，使用模拟结果');
          return {
            success: false,
            error: 'AI返回结果格式不完整',
            data: null
          };
        }
      } catch (parseError) {
        console.error('解析AI返回结果失败:', parseError);
        return {
          success: false,
          error: 'AI返回结果格式错误',
          data: null
        };
      }
    } else {
      return {
        success: false,
        error: 'AI API返回格式异常',
        data: null
      };
    }

  } catch (error) {
    console.error('调用OpenAI API失败:', error);
    throw new Error(`AI校对服务调用失败: ${error.message}`);
  }
};

/**
 * 验证请求参数
 * @param {object} requestData - 请求数据
 * @returns {object} - 验证结果
 */
export const validateProofreadingRequest = (requestData) => {
  const errors = [];
  
  if (!requestData.text || typeof requestData.text !== 'string') {
    errors.push('文本内容不能为空且必须是字符串类型');
  }
  
  if (requestData.text && requestData.text.length > 10000) {
    errors.push('文本内容长度不能超过10000字符');
  }
  
  if (requestData.projectName && typeof requestData.projectName !== 'string') {
    errors.push('项目名称必须是字符串类型');
  }
  
  if (requestData.projectName && requestData.projectName.length > 200) {
    errors.push('项目名称长度不能超过200字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

/**
 * 记录API调用日志（用于监控和审计）
 * @param {object} logData - 日志数据
 */
export const logProofreadingAPI = (logData) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    projectName: logData.projectName || 'unknown',
    textLength: logData.text ? logData.text.length : 0,
    success: logData.success,
    error: logData.error || null,
    responseTime: logData.responseTime || null
  };
  
  // 在生产环境中，这里应该发送到日志服务
  if (process.env.NODE_ENV === 'production') {
    // TODO: 发送到日志收集服务
    console.log('AI校对API调用日志:', JSON.stringify(logEntry));
  } else {
    console.log('AI校对API调用日志:', logEntry);
  }
};

/**
 * 获取API使用统计
 * @returns {object} - API使用统计信息
 */
export const getAPIUsageStats = () => {
  // 这里可以实现更复杂的统计逻辑
  return {
    dailyCalls: 0,
    monthlyCalls: 0,
    averageResponseTime: 0,
    successRate: 0,
    lastCallTime: null
  };
};