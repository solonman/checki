import React, { useState, useEffect } from 'react';
import { SettingOutlined, BellOutlined, UserOutlined } from '@ant-design/icons';
import { Form, Select, Button, Card, Divider, Switch, message, Typography, Input } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../context/i18nContext';
import '../styles/settings.css';

const { Title, Paragraph } = Typography;
const { Option } = Select;

const SettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { user, updateUserProfile } = useAuth();
  const { t, supportedLanguages, changeLanguage } = useTranslation();
  
  // 初始化表单数据
  useEffect(() => {
    if (user) {
      // 从localStorage获取用户设置，如果没有则使用默认值
      const savedSettings = localStorage.getItem(`userSettings_${user.id}`);
      const settings = savedSettings ? JSON.parse(savedSettings) : {
        language: 'zh',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          system: true,
          taskComplete: true,
          deadlineReminder: true
        }
      };
      
      form.setFieldsValue(settings);
    }
  }, [user, form]);
  
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // 保存设置到localStorage
      if (user) {
        localStorage.setItem(`userSettings_${user.id}`, JSON.stringify(values));
        
        // 如果有需要更新到服务器的设置，可以在这里调用updateUserProfile
        // 例如用户选择的语言偏好等
        if (values.language) {
          await updateUserProfile({ language: values.language });
          // 立即切换应用语言
          changeLanguage(values.language);
        }
      }
      
      message.success(t('settings.settingsSavedSuccessfully'));
    } catch (error) {
      console.error('保存设置失败:', error);
      message.error(error.message || '保存设置失败，请重试');
    } finally {
      setLoading(false);
    }
  };
  
  // 重置设置到默认值
  const handleReset = () => {
    const defaultSettings = {
      language: 'zh',
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        system: true,
        taskComplete: true,
        deadlineReminder: true
      }
    };
    form.setFieldsValue(defaultSettings);
    message.info(t('settings.resetToDefaultsMessage'));
  };
  
  // 应用主题切换
  const handleThemeChange = (checked) => {
    const theme = checked ? 'dark' : 'light';
    form.setFieldValue('theme', theme);
    
    // 这里可以实现实际的主题切换逻辑
    // 例如添加/移除body上的class来切换CSS变量
    document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <Title level={2}><SettingOutlined /> {t('settings.pageTitle')}</Title>
        <Paragraph>{t('settings.pageDescription')}</Paragraph>
      </div>
      
      <Card className="settings-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="settings-form"
        >
          {/* 基本设置部分 */}
          <div className="settings-section">
            <Title level={4}><UserOutlined /> {t('settings.basicSettings')}</Title>
            <Divider />
            
            <Form.Item
              name="language"
              label={t('settings.language')}
              rules={[{ required: true }]}
            >
              <Select placeholder={t('settings.language')}>
                {supportedLanguages.map(lang => (
                  <Option key={lang.value} value={lang.value}>{lang.label}</Option>
                ))}
              </Select>
            </Form.Item>
            
            <Form.Item
              name="theme"
              label={t('settings.theme')}
              valuePropName="checked"
              getValueFromEvent={(checked) => checked ? 'dark' : 'light'}
            >
              <Switch onChange={handleThemeChange} />
            </Form.Item>
            
            <Form.Item
              name="defaultProject"
              label={t('settings.defaultProject')}
            >
              <Input placeholder={t('settings.defaultProject')} />
            </Form.Item>
          </div>
          
          {/* 通知设置部分 */}
          <div className="settings-section">
            <Title level={4}><BellOutlined /> {t('settings.notificationSettings')}</Title>
            <Divider />
            
            <Form.Item label={t('settings.notificationTypes')} className="notification-label">
              <Form.Item
                name={['notifications', 'email']}
                valuePropName="checked"
                noStyle
              >
                <div className="notification-item">
                  <Switch />
                  <span className="notification-text">{t('settings.emailNotifications')}</span>
                </div>
              </Form.Item>
              
              <Form.Item
                name={['notifications', 'push']}
                valuePropName="checked"
                noStyle
              >
                <div className="notification-item">
                  <Switch />
                  <span className="notification-text">{t('settings.pushNotifications')}</span>
                </div>
              </Form.Item>
              
              <Form.Item
                name={['notifications', 'system']}
                valuePropName="checked"
                noStyle
              >
                <div className="notification-item">
                  <Switch />
                  <span className="notification-text">{t('settings.systemNotifications')}</span>
                </div>
              </Form.Item>
              
              <Form.Item
                name={['notifications', 'taskComplete']}
                valuePropName="checked"
                noStyle
              >
                <div className="notification-item">
                  <Switch />
                  <span className="notification-text">{t('settings.taskCompleteNotifications')}</span>
                </div>
              </Form.Item>
              
              <Form.Item
                name={['notifications', 'deadlineReminder']}
                valuePropName="checked"
                noStyle
              >
                <div className="notification-item">
                  <Switch />
                  <span className="notification-text">{t('settings.deadlineReminderNotifications')}</span>
                </div>
              </Form.Item>
            </Form.Item>
          </div>
          
          {/* 操作按钮 */}
          <div className="settings-actions">
            <Button type="primary" htmlType="submit" loading={loading} className="save-button">
              {t('settings.saveSettings')}
            </Button>
            <Button onClick={handleReset} className="reset-button">
              {t('settings.resetToDefaults')}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;