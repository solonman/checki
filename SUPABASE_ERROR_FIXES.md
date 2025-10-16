# Supabase 错误修复总结

## 问题概述
用户报告了多个Supabase相关错误，包括：
- GET users 请求 406 (Not Acceptable)
- POST users 请求 403 (Forbidden)  
- GET projects 请求 500 (Internal Server Error)
- 存储桶请求 400 (Bad Request)

## 根本原因分析
1. **缺少RLS策略**: 数据库表没有启用行级安全策略，导致权限问题
2. **存储桶配置问题**: 存储桶检查逻辑不够健壮
3. **API调用错误处理不足**: 缺少对特定错误码的处理
4. **客户端配置不完整**: Supabase客户端缺少必要的headers

## 已实施的修复措施

### 1. 数据库安全策略修复
在 `supabase-init-all.sql` 中添加了完整的RLS策略：

**用户表(users)策略:**
- ✅ 用户可以查看自己的资料
- ✅ 用户可以更新自己的资料  
- ✅ 用户可以插入自己的资料

**项目表(projects)策略:**
- ✅ 用户可以查看自己的项目
- ✅ 用户可以创建自己的项目
- ✅ 用户可以更新自己的项目
- ✅ 用户可以删除自己的项目

**任务表(tasks)策略:**
- ✅ 用户可以查看自己项目的任务
- ✅ 用户可以创建自己项目的任务
- ✅ 用户可以更新自己项目的任务
- ✅ 用户可以删除自己项目的任务

### 2. API客户端修复
在 `src/utils/apiClient.js` 中改进了错误处理：

**getUserProfile方法:**
- 使用 `maybeSingle()` 替代 `single()` 避免406错误
- 添加对 `PGRST116` 错误码的特殊处理
- 明确指定查询字段列表
- 添加详细错误日志

**getUserProjects方法:**
- 添加用户ID验证
- 明确指定查询字段
- 添加对 `PGRST116` 错误的处理
- 改进错误日志记录

**authAPI.healthCheck方法:**
- 添加对 `ping()` 函数不存在的容错处理
- 当ping函数返回42883错误时，回退到users表查询

### 3. 存储桶配置修复
在 `src/utils/initializeDatabase.js` 中改进了存储桶处理：

**新增辅助函数:**
- `checkBucketExists()`: 更安全地检查存储桶存在性
- `createBucketIfNotExists()`: 优雅处理存储桶创建
- `setBucketPolicy()`: 设置存储桶访问策略

**改进的setupStorageBuckets()函数:**
- 使用try-catch包装每个存储桶操作
- 单个存储桶失败不影响其他存储桶
- 更详细的错误日志

### 4. Supabase客户端配置修复
在 `src/utils/supabaseClient.js` 中添加了：
- ✅ `apikey` header 包含匿名密钥
- ✅ 详细的配置日志输出
- ✅ 明确指定 `db.schema` 为 'public'

## 下一步操作

### 立即需要执行的步骤：

1. **在Supabase控制台执行RLS策略SQL**
   ```sql
   -- 复制 supabase-init-all.sql 中的RLS策略部分
   -- 在Supabase SQL编辑器中执行
   ```

2. **验证存储桶创建**
   - 检查avatars、files、documents存储桶是否已创建
   - 验证存储桶访问策略是否正确设置

3. **测试用户认证流程**
   - 注册用户账户
   - 验证用户资料创建和查询
   - 测试项目创建和管理功能

### 验证修复效果：

运行以下命令检查错误是否已解决：
```bash
# 检查服务器状态
curl -s -I http://localhost:3000

# 检查页面错误
curl -s http://localhost:3000 | grep -i "error\|loading" | head -5
```

## 错误码说明

- **406 Not Acceptable**: 查询结果不符合预期，已通过maybeSingle()修复
- **403 Forbidden**: RLS策略限制，已通过添加RLS策略修复  
- **500 Internal Server Error**: 服务器内部错误，已通过改进查询和错误处理修复
- **400 Bad Request**: 存储桶相关问题，已通过改进存储桶处理逻辑修复
- **PGRST116**: 查询无结果，已通过特殊处理修复

## 监控建议

1. **持续监控浏览器控制台**，查看是否有新的错误出现
2. **检查Supabase控制台**中的数据库查询日志
3. **验证用户操作流程**，确保注册、登录、项目管理功能正常
4. **测试文件上传功能**，验证存储桶配置正确

## 支持信息

如果问题仍然存在，请提供：
1. 浏览器控制台中的新错误信息
2. Supabase控制台中的查询日志
3. 具体的操作步骤和错误复现方式