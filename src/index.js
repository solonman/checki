/**
 * 应用入口文件
 * 集成环境变量初始化和错误处理
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { initializeEnvironment } from './config/envInitializer';

/**
 * 初始化应用
 */
async function initializeApp() {
  try {
    // 初始化环境变量
    const envResult = initializeEnvironment();
    
    if (!envResult.success) {
      console.error('应用初始化失败:', envResult.message);
      
      // 开发环境下显示详细错误信息
      if (process.env.NODE_ENV === 'development') {
        document.getElementById('root').innerHTML = `
          <div style="padding: 20px; font-family: Arial, sans-serif;">
            <h1 style="color: #ff4d4f;">应用初始化失败</h1>
            <h3>环境变量配置错误：</h3>
            <ul style="color: #ff4d4f;">
              ${envResult.errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
            <p>请检查 .env 文件配置，确保所有必填环境变量都已正确设置。</p>
            <p>参考 .env.example 文件进行配置。</p>
          </div>
        `;
      } else {
        document.getElementById('root').innerHTML = `
          <div style="padding: 20px; font-family: Arial, sans-serif; text-align: center;">
            <h1 style="color: #ff4d4f;">应用初始化失败</h1>
            <p>请联系技术支持或检查应用配置。</p>
          </div>
        `;
      }
      
      return;
    }
    
    // 环境初始化成功，渲染应用
    renderApp();
    
  } catch (error) {
    console.error('应用初始化过程出错:', error);
    document.getElementById('root').innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; text-align: center;">
        <h1 style="color: #ff4d4f;">应用加载失败</h1>
        <p>请刷新页面或联系技术支持。</p>
      </div>
    `;
  }
}

/**
 * 渲染应用
 */
function renderApp() {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  // 性能监控
  reportWebVitals();
}

// 启动应用
initializeApp();
