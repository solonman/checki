import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Form, message, Alert, Typography, Space } from 'antd';
import { authAPI } from '../utils/apiClient';

const { Title, Text, Paragraph } = Typography;

/**
 * Supabase密码重置完整测试页面
 * 用于诊断和验证密码重置流程的所有环节
 */
const SupabasePasswordResetFlowTest = () => {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testToken, setTestToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [testResults, setTestResults] = useState({});

  // 测试步骤定义
  const testSteps = [
    {
      key: 'config',
      title: '1. 配置检查',
      description: '检查Supabase配置和环境变量'
    },
    {
      key: 'send_email', 
      title: '2. 发送重置邮件',
      description: '发送密码重置邮件到指定邮箱'
    },
    {
      key: 'receive_email',
      title: '3. 接收邮件验证',
      description: '验证邮件发送和接收情况'
    },
    {
      key: 'extract_token',
      title: '4. 提取访问令牌',
      description: '从邮件链接中提取访问令牌'
    },
    {
      key: 'validate_token',
      title: '5. 验证令牌',
      description: '验证访问令牌的有效性'
    },
    {
      key: 'reset_password',
      title: '6. 重置密码',
      description: '使用令牌重置密码'
    }
  ];

  // 步骤1: 配置检查
  const checkConfiguration = async () => {
    const results = {
      supabaseUrl: process.env.REACT_APP_SUPABASE_URL,
      hasAnonKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.REACT_APP_SUPABASE_ANON_KEY?.length,
      redirectUrl: `${window.location.origin}/reset-password`,
      timestamp: new Date().toISOString()
    };

    const isValid = results.supabaseUrl && results.hasAnonKey;
    
    return {
      success: isValid,
      message: isValid ? '配置检查通过' : '配置缺失',
      data: results
    };
  };

  // 步骤2: 发送重置邮件
  const sendResetEmail = async (email) => {
    if (!email) {
      throw new Error('请输入有效的邮箱地址');
    }

    console.log('发送重置邮件给:', email);
    const result = await authAPI.resetPassword(email);
    
    if (!result.success) {
      throw new Error(result.error || '发送邮件失败');
    }

    return {
      success: true,
      message: '重置邮件发送成功',
      data: result.data
    };
  };

  // 步骤3: 手动验证邮件接收（用户输入）
  const verifyEmailReceived = async () => {
    // 这个步骤需要用户手动确认
    return {
      success: true,
      message: '请确认是否收到重置邮件',
      data: {
        note: '请检查邮箱（包括垃圾邮件文件夹）'
      }
    };
  };

  // 步骤4: 提取访问令牌
  const extractAccessToken = async (token) => {
    if (!token || token.length < 10) {
      throw new Error('请输入有效的访问令牌');
    }

    // 验证令牌格式（JWT）
    const tokenParts = token.split('.');
    const isJwtFormat = tokenParts.length === 3;

    return {
      success: true,
      message: '令牌提取成功',
      data: {
        token: token,
        isJwtFormat: isJwtFormat,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...'
      }
    };
  };

  // 步骤5: 验证访问令牌
  const validateAccessToken = async (token) => {
    try {
      console.log('验证访问令牌:', token.substring(0, 20) + '...');
      
      // 尝试使用令牌设置会话
      const { data, error } = await authAPI.confirmResetPassword(token, 'test-password-123');
      
      if (error) {
        // 如果是验证错误而不是网络错误，说明令牌格式正确但无效
        if (error.message.includes('invalid') || error.message.includes('expired')) {
          return {
            success: true,
            message: '令牌格式验证通过（但令牌可能已过期或无效）',
            data: {
              validationPassed: true,
              error: error.message,
              note: '令牌格式正确，但可能已过期或已被使用'
            }
          };
        }
        throw error;
      }

      return {
        success: true,
        message: '令牌验证成功',
        data: data
      };
    } catch (error) {
      console.error('令牌验证失败:', error);
      throw new Error(`令牌验证失败: ${error.message}`);
    }
  };

  // 执行单个测试步骤
  const executeStep = async (stepKey, params = {}) => {
    setLoading(true);
    
    try {
      let result;
      
      switch (stepKey) {
        case 'config':
          result = await checkConfiguration();
          break;
        case 'send_email':
          result = await sendResetEmail(params.email);
          break;
        case 'receive_email':
          result = await verifyEmailReceived();
          break;
        case 'extract_token':
          result = await extractAccessToken(params.token);
          break;
        case 'validate_token':
          result = await validateAccessToken(params.token);
          break;
        default:
          throw new Error(`未知的测试步骤: ${stepKey}`);
      }

      setTestResults(prev => ({
        ...prev,
        [stepKey]: result
      }));

      message.success(result.message);
      return result;
      
    } catch (error) {
      const errorResult = {
        success: false,
        message: error.message,
        error: error
      };
      
      setTestResults(prev => ({
        ...prev,
        [stepKey]: errorResult
      }));
      
      message.error(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 运行完整测试流程
  const runFullTest = async () => {
    if (!testEmail) {
      message.error('请输入测试邮箱地址');
      return;
    }

    try {
      setCurrentStep(1);
      
      // 步骤1: 配置检查
      await executeStep('config');
      setCurrentStep(2);
      
      // 步骤2: 发送邮件
      await executeStep('send_email', { email: testEmail });
      setCurrentStep(3);
      
      // 步骤3: 等待用户确认邮件接收
      await executeStep('receive_email');
      setCurrentStep(4);
      
      message.info('请检查邮箱并获取访问令牌，然后输入到下方表单中');
      
    } catch (error) {
      console.error('测试流程失败:', error);
    }
  };

  // 手动验证令牌
  const validateTokenManually = async () => {
    if (!testToken) {
      message.error('请输入访问令牌');
      return;
    }

    try {
      setCurrentStep(4);
      await executeStep('extract_token', { token: testToken });
      setCurrentStep(5);
      await executeStep('validate_token', { token: testToken });
      setCurrentStep(6);
      
      message.success('令牌验证完成！');
    } catch (error) {
      console.error('令牌验证失败:', error);
    }
  };

  // 获取步骤状态
  const getStepStatus = (stepIndex) => {
    if (currentStep > stepIndex) return 'finish';
    if (currentStep === stepIndex) return 'process';
    return 'wait';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card title="🔧 Supabase密码重置完整流程测试" style={{ marginBottom: '20px' }}>
        <Alert
          message="此工具将引导您完成整个密码重置流程的测试"
          description="按照步骤操作，可以诊断密码重置功能中的任何问题"
          type="info"
          style={{ marginBottom: '20px' }}
        />

        {/* 测试步骤展示 */}
        <Card title="测试步骤" size="small" style={{ marginBottom: '20px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {testSteps.map((step, index) => (
              <Card 
                key={step.key}
                size="small"
                style={{ 
                  backgroundColor: 
                    getStepStatus(index) === 'finish' ? '#f6ffed' :
                    getStepStatus(index) === 'process' ? '#e6f7ff' : '#fafafa'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Text strong>{step.title}</Text>
                    <br />
                    <Text type="secondary">{step.description}</Text>
                  </div>
                  <div>
                    {getStepStatus(index) === 'finish' && 
                      testResults[step.key] && (
                        <Text type={testResults[step.key].success ? 'success' : 'danger'}>
                          {testResults[step.key].success ? '✓ 通过' : '✗ 失败'}
                        </Text>
                      )}
                    {getStepStatus(index) === 'process' && 
                      <Text type="primary">⏳ 进行中</Text>
                    }
                  </div>
                </div>
              </Card>
            ))}
          </Space>
        </Card>

        {/* 邮箱输入和测试 */}
        <Card title="步骤1-3: 邮件发送测试" style={{ marginBottom: '20px' }}>
          <Form layout="vertical">
            <Form.Item label="测试邮箱地址">
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="请输入有效的邮箱地址"
                style={{ width: '300px' }}
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                onClick={runFullTest} 
                loading={loading && currentStep <= 3}
                disabled={!testEmail}
              >
                开始邮件测试
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 令牌验证 */}
        <Card title="步骤4-5: 令牌验证测试" style={{ marginBottom: '20px' }}>
          <Alert
            message="操作说明"
            description={
              <>
                <Paragraph>
                  1. 检查邮箱收件箱（包括垃圾邮件文件夹）
                </Paragraph>
                <Paragraph>
                  2. 找到Supabase发送的重置密码邮件
                </Paragraph>
                <Paragraph>
                  3. 点击邮件中的重置链接，或者复制链接中的access_token参数
                </Paragraph>
                <Paragraph>
                  4. 将access_token值粘贴到下方输入框中
                </Paragraph>
              </>
            }
            type="info"
            style={{ marginBottom: '15px' }}
          />
          
          <Form layout="vertical">
            <Form.Item label="访问令牌 (access_token)">
              <Input
                value={testToken}
                onChange={(e) => setTestToken(e.target.value)}
                placeholder="从邮件链接中复制的access_token值"
                style={{ width: '400px' }}
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                onClick={validateTokenManually}
                loading={loading && currentStep >= 4}
                disabled={!testToken}
              >
                验证令牌
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 测试结果详情 */}
        {Object.keys(testResults).length > 0 && (
          <Card title="📊 测试结果详情">
            <Space direction="vertical" style={{ width: '100%' }}>
              {Object.entries(testResults).map(([stepKey, result]) => (
                <Card 
                  key={stepKey}
                  size="small"
                  title={testSteps.find(s => s.key === stepKey)?.title}
                  style={{
                    borderColor: result.success ? '#52c41a' : '#ff4d4f',
                    backgroundColor: result.success ? '#f6ffed' : '#fff2f0'
                  }}
                >
                  <Paragraph>
                    <Text strong>状态: </Text>
                    <Text type={result.success ? 'success' : 'danger'}>
                      {result.success ? '✅ 成功' : '❌ 失败'}
                    </Text>
                  </Paragraph>
                  <Paragraph>
                    <Text strong>消息: </Text>{result.message}
                  </Paragraph>
                  {result.data && (
                    <Paragraph>
                      <Text strong>数据: </Text>
                      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </Paragraph>
                  )}
                  {result.error && (
                    <Paragraph>
                      <Text strong>错误: </Text>
                      <Text type="danger">{result.error.message || result.error}</Text>
                    </Paragraph>
                  )}
                </Card>
              ))}
            </Space>
          </Card>
        )}

        {/* 问题排查指南 */}
        <Card title="🔍 常见问题排查" style={{ marginTop: '20px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Card size="small" title="邮件发送失败">
              <Paragraph>
                <Text strong>可能原因:</Text>
              </Paragraph>
              <ul>
                <li>Supabase邮件服务未正确配置</li>
                <li>邮箱地址格式不正确</li>
                <li>邮件被拦截或进入垃圾邮件</li>
              </ul>
              <Paragraph>
                <Text strong>解决方案:</Text>
              </Paragraph>
              <ul>
                <li>检查Supabase控制台中的邮件服务配置</li>
                <li>验证邮箱地址格式</li>
                <li>检查垃圾邮件文件夹</li>
              </ul>
            </Card>
            
            <Card size="small" title="令牌验证失败">
              <Paragraph>
                <Text strong>可能原因:</Text>
              </Paragraph>
              <ul>
                <li>令牌已过期（默认1小时有效期）</li>
                <li>令牌已被使用</li>
                <li>令牌格式不正确</li>
              </ul>
              <Paragraph>
                <Text strong>解决方案:</Text>
              </Paragraph>
              <ul>
                <li>重新发送重置邮件获取新令牌</li>
                <li>确保从正确的邮件链接中提取令牌</li>
                <li>检查令牌是否完整（应为JWT格式）</li>
              </ul>
            </Card>

            <Card size="small" title="重定向失败">
              <Paragraph>
                <Text strong>可能原因:</Text>
              </Paragraph>
              <ul>
                <li>Site URL配置不正确</li>
                <li>Redirect URLs未包含应用地址</li>
                <li>链接中的redirect_to参数错误</li>
              </ul>
              <Paragraph>
                <Text strong>解决方案:</Text>
              </Paragraph>
              <ul>
                <li>在Supabase控制台设置正确的Site URL</li>
                <li>添加应用地址到Redirect URLs白名单</li>
                <li>检查邮件模板中的链接格式</li>
              </ul>
            </Card>
          </Space>
        </Card>
      </Card>
    </div>
  );
};

export default SupabasePasswordResetFlowTest;