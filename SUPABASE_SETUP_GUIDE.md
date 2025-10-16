# Supabase 设置指南

## 🎯 目标
完成Supabase的正确配置，解决健康检查404错误问题

## 🔍 问题分析
浏览器控制台出现404错误是因为：
1. `ping` RPC函数在Supabase数据库中不存在
2. 健康检查调用 `supabase.rpc('ping')` 返回404

## 🚀 解决步骤

### 步骤1：数据库初始化
1. 登录你的Supabase控制台
2. 打开SQL编辑器
3. 复制并执行 `supabase-init-all.sql` 文件中的SQL脚本
4. 确保包含新的`ping`函数创建语句

### 步骤2：验证环境变量
确保 `.env` 文件中的配置正确：
```env
REACT_APP_SUPABASE_URL=https://ajnytephnzbvsqxjvzwk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbnl0ZXBobnpidnNxeGp2endrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNTA0OTMsImV4cCI6MjA3NTcyNjQ5M30.HBoZxEuqcn29vPfIBHd8NB1H5uaBXDogVE_1WGPHJe8
```

### 步骤3：创建存储桶（必需）
1. 在Supabase控制台中，进入"Storage"页面
2. 创建以下存储桶：
   - `files` - 用于文件上传
   - `avatars` - 用于用户头像
3. 设置适当的权限策略

### 步骤4：验证设置
重启应用后，健康检查应该正常工作：
- 如果`ping`函数存在：返回`pong`
- 如果`ping`函数不存在：尝试基本连接测试

## 🔧 代码改进
我已经增强了健康检查逻辑：
1. **容错处理**：当`ping`函数不存在时，自动回退到基本连接测试
2. **更好的错误信息**：区分不同类型的连接问题
3. **超时机制**：防止无限等待

## 📋 检查清单
- [ ] 执行了数据库初始化SQL
- [ ] 创建了`ping`函数
- [ ] 配置了存储桶
- [ ] 设置了正确的环境变量
- [ ] 重启了开发服务器

## 🐛 故障排除
如果仍然遇到问题：

1. **检查Supabase服务状态**：访问Supabase状态页面
2. **验证API密钥**：确保使用了正确的anon密钥
3. **检查网络连接**：确认可以访问Supabase URL
4. **查看控制台日志**：获取详细的错误信息

## 📞 支持
如果需要进一步帮助，请提供：
- 完整的错误日志
- Supabase项目URL
- 执行的SQL脚本结果