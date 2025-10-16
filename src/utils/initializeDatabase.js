import supabase from './supabaseClient';
import { initializeDatabase as setupSchema } from './databaseSchema';

/**
 * 初始化数据库和存储桶
 * 这将设置所有必要的表结构、索引和存储桶
 */
export const initializeDatabase = async () => {
  try {
    console.log('开始初始化数据库...');
    
    // 1. 设置数据库表结构
    await setupSchema();
    console.log('数据库表结构设置完成');
    
    // 2. 设置存储桶
    await setupStorageBuckets();
    console.log('存储桶设置完成');
    
    // 3. 设置用户注册触发器
    await setupUserRegistrationTrigger();
    console.log('用户注册触发器设置完成');
    
    return { success: true, message: '数据库初始化成功' };
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return { 
      success: false, 
      error: error.message, 
      message: '数据库初始化失败，请检查Supabase连接和权限' 
    };
  }
};

/**
 * 设置存储桶和权限
 */
export const setupStorageBuckets = async () => {
  try {
    console.log('开始设置存储桶...');
    
    const buckets = [
      {
        name: 'avatars',
        options: {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5 * 1024 * 1024 // 5MB
        }
      },
      {
        name: 'files',
        options: {
          public: true,
          allowedMimeTypes: ['*'],
          fileSizeLimit: 10 * 1024 * 1024 // 10MB
        }
      },
      {
        name: 'documents',
        options: {
          public: true,
          allowedMimeTypes: ['application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          fileSizeLimit: 20 * 1024 * 1024 // 20MB
        }
      }
    ];

    for (const bucket of buckets) {
      try {
        const created = await createBucketIfNotExists(bucket.name, bucket.options);
        if (created) {
          await setBucketPolicy(bucket.name);
        }
      } catch (error) {
        console.warn(`处理存储桶 ${bucket.name} 时出错，继续处理其他存储桶:`, error.message);
      }
    }

    console.log('存储桶设置完成');
    return true;
  } catch (error) {
    console.error('设置存储桶失败:', error);
    throw error;
  }
};

/**
 * 获取存储桶允许的MIME类型
 */
const getBucketAllowedMimeTypes = (bucketName) => {
  switch (bucketName) {
    case 'avatars':
      return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    case 'files':
      return [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp'
      ];
    case 'documents':
      return [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];
    default:
      return [];
  }
};

/**
 * 设置存储桶访问策略
 */
const setupStorageAccessPolicy = async (bucketName) => {
  try {
    // 创建行级安全策略
    const policySql = `
      -- 删除现有策略
      DROP POLICY IF EXISTS "允许所有者访问${bucketName}" ON storage.objects;
      
      -- 创建新策略 - 允许用户访问自己的文件
      CREATE POLICY "允许所有者访问${bucketName}" ON storage.objects
        FOR ALL
        TO authenticated
        USING (
          bucket_id = '${bucketName}' AND
          (metadata->>'user_id')::text = auth.uid()
        );
        
      -- 创建新策略 - 允许团队成员访问项目文件
      CREATE POLICY "允许团队成员访问${bucketName}" ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
          bucket_id = '${bucketName}' AND
          EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.user_id = auth.uid()
            AND team_members.project_id::text = (metadata->>'project_id')::text
            AND team_members.is_active = true
          )
        );
    `;
    
    // 执行SQL策略
    await supabase.rpc('execute_sql', { sql: policySql });
    console.log(`设置存储桶 ${bucketName} 访问策略成功`);
  } catch (error) {
    console.warn(`设置存储桶 ${bucketName} 访问策略失败，可能需要在Supabase控制台手动配置:`, error);
    // 不抛出错误，因为在某些环境中可能没有执行SQL的权限
  }
};

/**
 * 检查数据库是否已初始化
 */
export const checkDatabaseInitialized = async () => {
  try {
    // 检查表是否存在
    const tablesToCheck = ['users', 'projects', 'tasks', 'files'];
    const missingTables = [];
    
    for (const table of tablesToCheck) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') { // 表不存在错误码
        missingTables.push(table);
      }
    }
    
    // 检查存储桶是否存在
    const bucketsToCheck = ['avatars', 'files', 'documents'];
    const missingBuckets = [];
    
    for (const bucket of bucketsToCheck) {
      const { data } = await supabase.storage.getBucket(bucket);
      if (!data) {
        missingBuckets.push(bucket);
      }
    }
    
    return {
      initialized: missingTables.length === 0 && missingBuckets.length === 0,
      missingTables,
      missingBuckets
    };
  } catch (error) {
    console.error('检查数据库初始化状态失败:', error);
    return { initialized: false, error: error.message };
  }
};

/**
 * 执行数据库迁移
 */
export const runMigrations = async () => {
  try {
    // 检查当前版本
    const { data: versionData, error: versionError } = await supabase
      .from('migrations')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single();
    
    let currentVersion = versionError ? 0 : versionData.version;
    const migrations = [];
    
    // 添加迁移脚本（按版本号排序）
    // 这里可以添加未来的数据库迁移脚本
    
    // 执行未执行的迁移
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        await migration.up();
        // 记录迁移
        await supabase
          .from('migrations')
          .insert({
            version: migration.version,
            applied_at: new Date().toISOString(),
            name: migration.name
          });
        console.log(`迁移 ${migration.version} - ${migration.name} 执行成功`);
        currentVersion = migration.version;
      }
    }
    
    return { success: true, currentVersion };
  } catch (error) {
    console.error('执行数据库迁移失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 设置用户注册触发器
 */
const setupUserRegistrationTrigger = async () => {
  try {
    console.log('开始设置用户注册触发器...');
    
    // 创建触发器函数
    const triggerFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        -- 在users表中插入新用户记录
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
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
          'user',
          NOW(),
          NOW()
        );
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // 创建触发器
    const triggerSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;
    
    // 尝试执行SQL
    try {
      await supabase.rpc('execute_sql', { sql: triggerFunctionSQL });
      await supabase.rpc('execute_sql', { sql: triggerSQL });
      console.log('用户注册触发器设置成功');
    } catch (error) {
      console.log('通过RPC设置触发器失败，请手动执行SQL:', error);
      console.log('触发器函数SQL:');
      console.log(triggerFunctionSQL);
      console.log('触发器SQL:');
      console.log(triggerSQL);
    }
    
  } catch (error) {
    console.error('设置用户注册触发器失败:', error);
    // 不抛出错误，因为触发器是可选的
  }
};

export default {
  initializeDatabase,
  setupStorageBuckets,
  checkDatabaseInitialized,
  runMigrations,
  setupUserRegistrationTrigger
};

  // 检查存储桶是否存在
  const checkBucketExists = async (bucketName) => {
    try {
      const { data, error } = await supabase.storage.from(bucketName).list('', { limit: 1 });
      return !error;
    } catch (error) {
      console.warn(`检查存储桶 ${bucketName} 时出错:`, error.message);
      return false;
    }
  };

  // 创建存储桶（如果不存在）
  const createBucketIfNotExists = async (bucketName, options) => {
    try {
      const exists = await checkBucketExists(bucketName);
      if (exists) {
        console.log(`存储桶 ${bucketName} 已存在`);
        return true;
      }

      console.log(`创建存储桶: ${bucketName}`);
      const { data, error } = await supabase.storage.createBucket(bucketName, options);
      
      if (error) {
        console.error(`创建存储桶 ${bucketName} 失败:`, error.message);
        return false;
      }
      
      console.log(`存储桶 ${bucketName} 创建成功`);
      return true;
    } catch (error) {
      console.error(`创建存储桶 ${bucketName} 时发生错误:`, error.message);
      return false;
    }
  };

  // 设置存储桶访问策略
  const setBucketPolicy = async (bucketName) => {
    try {
      console.log(`设置存储桶 ${bucketName} 的访问策略`);
      
      // 设置存储桶为公开访问
      const { error } = await supabase.storage.from(bucketName).setPublicAccess(true);
      
      if (error) {
        console.error(`设置存储桶 ${bucketName} 访问策略失败:`, error.message);
        return false;
      }
      
      console.log(`存储桶 ${bucketName} 访问策略设置成功`);
      return true;
    } catch (error) {
      console.error(`设置存储桶 ${bucketName} 访问策略时发生错误:`, error.message);
      return false;
    }
  };