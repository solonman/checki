-- 用户注册数据同步问题修复脚本
-- 在Supabase控制台SQL编辑器中执行此脚本

-- ======================================================
-- 1. 修复RLS策略（添加服务级策略）
-- ======================================================

-- 删除可能存在的冲突策略
DROP POLICY IF EXISTS "服务可以插入用户资料" ON users;

-- 创建新的服务级策略，允许触发器插入记录
CREATE POLICY "服务可以插入用户资料" ON users
  FOR INSERT WITH CHECK (true);

-- ======================================================
-- 2. 重新创建触发器函数（确保使用SECURITY DEFINER）
-- ======================================================

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

-- ======================================================
-- 3. 创建触发器
-- ======================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ======================================================
-- 4. 验证修复效果
-- ======================================================

-- 检查触发器是否创建成功
SELECT 
  trigger_name,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 检查函数是否存在
SELECT 
  routine_name,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 检查RLS策略
SELECT 
  polname as policy_name,
  polcmd as command,
  polqual as qualification
FROM pg_policy 
WHERE polrelid = 'public.users'::regclass;

-- ======================================================
-- 5. 测试触发器（可选）
-- ======================================================

-- 注意：执行测试前请确保您知道如何清理测试数据
-- 创建一个测试用户来验证触发器
-- 执行后检查public.users表中是否自动创建了记录

-- 测试步骤：
-- 1. 执行此脚本
-- 2. 在应用中注册新用户
-- 3. 检查auth.users和public.users表中都有新用户记录
-- 4. 如果仍然失败，检查Supabase日志了解详细错误