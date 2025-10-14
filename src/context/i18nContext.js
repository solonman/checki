import React, { createContext, useState, useEffect, useContext } from 'react';
import zhCN from '../locales/zh-CN';
import enUS from '../locales/en-US';

// 创建多语言上下文
const I18nContext = createContext();

// 支持的语言列表
const supportedLanguages = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' }
];

// 语言资源映射
const resources = {
  'zh': zhCN,
  'en': enUS
};

// 多语言提供者组件
export const I18nProvider = ({ children }) => {
  // 从localStorage获取语言设置，如果没有则使用浏览器语言或默认语言
  const getInitialLanguage = () => {
    // 检查localStorage中的语言设置
    const savedLanguage = localStorage.getItem('appLanguage');
    if (savedLanguage && ['zh', 'en'].includes(savedLanguage)) {
      return savedLanguage;
    }
    
    // 获取浏览器语言
    const browserLanguage = navigator.language.split('-')[0];
    if (['zh', 'en'].includes(browserLanguage)) {
      return browserLanguage;
    }
    
    // 默认使用中文
    return 'zh';
  };
  
  const [language, setLanguage] = useState(getInitialLanguage);
  
  // 当语言改变时，保存到localStorage并更新HTML lang属性
  useEffect(() => {
    localStorage.setItem('appLanguage', language);
    document.documentElement.lang = language;
  }, [language]);
  
  // 切换语言的函数
  const changeLanguage = (newLanguage) => {
    if (['zh', 'en'].includes(newLanguage)) {
      setLanguage(newLanguage);
    }
  };
  
  // 翻译函数
  const t = (key) => {
    const keys = key.split('.');
    let value = resources[language];
    
    for (const k of keys) {
      if (!value || typeof value !== 'object') {
        return key; // 如果找不到对应翻译，返回原key
      }
      value = value[k];
    }
    
    return value !== undefined ? value : key;
  };
  
  // 提供上下文值
  const contextValue = {
    language,
    changeLanguage,
    t,
    supportedLanguages
  };
  
  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

// 自定义钩子，用于在组件中使用多语言功能
export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
};