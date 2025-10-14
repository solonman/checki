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
    // 存储桶配置数组
    const buckets = [
      {
        name: 'avatars',
        public: true,
        description: '用户头像存储'
      },
      {
        name: 'files',
        public: false,
        description: '上传文件存储'
      },
      {
        name: 'documents',
        public: false,
        description: '项目文档存储'
      }
    ];

    // 创建或更新存储桶
    for (const bucket of buckets) {
      // 检查存储桶是否存在
      const { data: existingBucket, error: checkError } = await supabase.storage
        .getBucket(bucket.name);
      
      if (!existingBucket) {
        // 创建新存储桶
        await supabase.storage.createBucket(bucket.name, { 
          public: bucket.public,
          allowedMimeTypes: getBucketAllowedMimeTypes(bucket.name),
          fileSizeLimit: bucket.name === 'avatars' ? 5 * 1024 * 1024 : 50 * 1024 * 1024 // 头像5MB，其他50MB
        });
        console.log(`创建存储桶 ${bucket.name} 成功`);
      } else {
        console.log(`存储桶 ${bucket.name} 已存在`);
      }
      
      // 设置存储桶权限策略（对于非公开存储桶）
      if (!bucket.public) {
        await setupStorageAccessPolicy(bucket.name);
      }
    }
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

export default {
  initializeDatabase,
  setupStorageBuckets,
  checkDatabaseInitialized,
  runMigrations
};