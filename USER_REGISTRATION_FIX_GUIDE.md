# 用户注册数据同步问题修复指南

## 问题描述
用户注册后收到确认邮件，但Supabase的users表中没有对应的用户记录。

## 根本原因
系统缺少自动在users表中创建用户记录的机制。Supabase的认证系统(auth.users)和应用的用户表(public.users)是分开的，需要通过触发器或应用逻辑来同步。

## 解决方案

### 方案一：数据库触发器（推荐）

**重要提示：由于RLS策略冲突，请使用专门的修复脚本**

在Supabase控制台执行以下修复脚本：

```sql
-- 执行专门的修复脚本
\i FIX_USER_REGISTRATION.sql
```

或者手动执行以下步骤：

#### 步骤1：修复RLS策略
```sql
-- 删除可能存在的冲突策略
DROP POLICY IF EXISTS "服务可以插入用户资料" ON users;

-- 创建新的服务级策略，允许触发器插入记录
CREATE POLICY "服务可以插入用户资料" ON users
  FOR INSERT WITH CHECK (true);
```

#### 步骤2：重新创建触发器函数
```sql
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 在users表中插入新用户记录
  -- SECURITY DEFINER权限会自动绕过RLS策略
  INSERT INTO public.users (
    id,
    email,
    full_name,
    username,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    'user',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 步骤3：创建触发器
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 方案二：应用逻辑兜底

应用代码中已添加兜底逻辑，在注册成功后会尝试：
1. 等待触发器执行（1秒延迟）
2. 检查users表中是否有记录
3. 如果没有记录，手动创建用户资料

## 验证步骤

1. **执行触发器SQL**（如果选择方案一）
   - 登录Supabase控制台
   - 进入SQL编辑器
   - 执行上述触发器SQL代码

2. **重新注册测试**
   - 清除浏览器缓存或使用无痕模式
   - 访问注册页面：http://localhost:3000/signup
   - 使用新邮箱注册
   - 检查邮箱确认邮件

3. **验证数据同步**
   - 登录Supabase控制台
   - 查看auth.users表，确认有新用户记录
   - 查看public.users表，确认有对应的用户资料记录

## 技术细节

### 触发器工作原理
- 监听`auth.users`表的INSERT事件
- 当新用户注册时，自动在`public.users`表创建对应记录
- 从用户元数据中提取full_name和username
- 设置默认角色为'user'

### 应用逻辑改进
- 注册函数添加了用户资料创建逻辑
- 使用双重保险确保用户记录创建成功
- 添加了错误处理和日志记录

### 数据库表结构
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);
```

## 故障排除

### 如果触发器未生效
1. 检查SQL是否执行成功
2. 确认触发器函数和触发器已创建
3. 查看Supabase日志了解错误信息

### 如果应用兜底逻辑失败
1. 检查浏览器控制台错误日志
2. 查看网络请求是否成功
3. 确认users表的行级安全策略配置正确

### 403 Forbidden错误
这个错误通常表示RLS策略阻止了操作。解决方案：
1. 确保执行了上述修复脚本
2. 检查是否添加了服务级RLS策略
3. 确认触发器函数使用了SECURITY DEFINER

### 触发器不生效
1. 检查触发器是否创建成功：`SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created'`
2. 确认函数存在且状态正常：`SELECT * FROM information_schema.routines WHERE routine_name = 'handle_new_user'`
3. 查看Supabase日志了解触发器执行错误

### 权限问题
确保数据库用户有权限：
- 在`auth.users`上创建触发器
- 在`public.users`上执行INSERT操作
- 访问用户元数据字段

## 预防措施

1. **定期检查数据一致性**
   - 比对auth.users和public.users的记录数
   - 检查孤立记录（在auth.users但不在public.users）

2. **监控注册流程**
   - 添加注册成功率监控
   - 记录用户资料创建失败的情况

3. **备份策略**
   - 定期备份用户数据
   - 建立数据修复流程