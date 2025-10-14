# Supabase 数据库设置指南

## 前提条件

- Supabase 项目已创建
- Supabase URL 和 Anon Key 已配置在 `.env` 文件中

## 初始化方法（推荐手动执行SQL脚本）

由于环境限制，推荐直接在Supabase控制台执行SQL脚本来初始化数据库。

### 方法一：在Supabase控制台执行SQL脚本

1. 登录 [Supabase 控制台](https://supabase.com/dashboard)
2. 选择您的项目
3. 导航到 **SQL编辑器** 页面
4. 复制并粘贴 `supabase-init-all.sql` 文件中的全部内容
5. 点击 **运行** 按钮执行脚本
6. 验证所有表是否成功创建（在 **数据库** > **表编辑器** 中查看）

### 方法二：手动创建存储桶

脚本执行后，还需要手动创建以下存储桶：

1. 在Supabase控制台导航到 **存储** 页面
2. 点击 **创建桶** 按钮
3. 依次创建以下三个存储桶：
   - `avatars`：用于存储用户头像
   - `files`：用于存储上传的文件
   - `documents`：用于存储文档文件

### 方法三：为存储桶设置详细权限策略

为每个存储桶设置适当的权限策略，以下是详细步骤：

#### 1. 为已认证用户添加读取权限

对于每个存储桶（avatars、files、documents），重复以下步骤：

1. 点击要配置的存储桶名称
2. 点击 **策略** 选项卡
3. 点击 **新建策略** 按钮
4. 在弹出窗口中：
   - 输入策略名称：例如 "Authenticated users can read"
   - 选择策略类型：**仅读取**
   - 在 "配置使用表达式" 部分，选择：
     - **允许公开访问**：**否**
     - **认证要求**：**是** - 用户必须登录
   - 点击 **添加策略** 按钮

#### 2. 为已认证用户添加写入权限

对于每个存储桶（avatars、files、documents），重复以下步骤：

1. 点击要配置的存储桶名称
2. 点击 **策略** 选项卡
3. 点击 **新建策略** 按钮
4. 在弹出窗口中：
   - 输入策略名称：例如 "Authenticated users can write"
   - 选择策略类型：**仅插入**
   - 在 "配置使用表达式" 部分，选择：
     - **允许公开访问**：**否**
     - **认证要求**：**是** - 用户必须登录
   - 点击 **添加策略** 按钮

#### 3. 为已认证用户添加更新和删除权限（可选）

如果应用需要允许用户更新或删除自己的文件，可以添加以下策略：

1. 点击要配置的存储桶名称
2. 点击 **策略** 选项卡
3. 点击 **新建策略** 按钮
4. 在弹出窗口中：
   - 输入策略名称：例如 "Authenticated users can update and delete"
   - 选择策略类型：**更新和删除**
   - 在 "配置使用表达式" 部分，选择：
     - **允许公开访问**：**否**
     - **认证要求**：**是** - 用户必须登录
   - 点击 **添加策略** 按钮

#### 4. 存储桶特定权限建议

- **avatars 存储桶**：
  - 建议仅允许用户访问自己的头像文件
  - 可以在策略中添加过滤条件，限制用户只能访问以其用户ID开头的文件

- **files 存储桶**：
  - 建议根据应用需求设置更细粒度的权限
  - 可能需要限制用户只能访问其项目中的文件

- **documents 存储桶**：
  - 对于需要共享的文档，可以考虑添加额外的策略允许被共享的用户访问

### 方法三：使用Node.js脚本（仅在Node环境可用时）

如果您的环境中有Node.js，可以运行以下命令：

```bash
npm install
npm run init-db
```

## 数据库结构说明

脚本创建了以下表：

1. `users` - 用户信息表
2. `projects` - 项目表
3. `tasks` - 任务表
4. `files` - 文件表
5. `proofreading_results` - 校对结果表
6. `team_members` - 团队成员表
7. `documents` - 文档表

## 行级安全策略示例

为了保护数据安全，建议为每个表设置行级安全策略。以下是一些基本策略示例：

### users 表策略

```sql
-- 允许用户只能查看和更新自己的信息
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### projects 表策略

```sql
-- 允许用户查看和管理自己创建的项目
CREATE POLICY "Users can view their projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
```

## 故障排除

- 如果表创建失败，请检查是否有足够的权限
- 如果存储桶创建失败，请检查存储空间限制
- 如果遇到权限问题，请确保正确设置了行级安全策略

## 下一步

数据库初始化完成后，您可以开始使用应用程序了。所有表和存储桶都已准备就绪，可以存储和管理数据。

本指南将帮助你在Supabase中初始化应用所需的数据库表和存储桶。

## 前提条件

1. 已创建Supabase项目
2. 已获取Supabase URL和匿名密钥
3. 已在`.env`文件中配置好这些环境变量

## 数据库初始化方法

### 方法一：使用SQL脚本（推荐）

1. 打开Supabase控制台，导航到SQL编辑器
2. 复制并粘贴 `supabase-init-all.sql` 文件中的内容
3. 点击「运行」按钮执行SQL脚本

这个脚本会创建所有必要的表和索引。

### 方法二：使用Node.js脚本（开发环境）

1. 确保已安装Node.js
2. 运行以下命令初始化数据库：

```bash
node init-database.js
```

这个脚本会检查数据库状态，并尝试创建缺失的表和存储桶。

## 存储桶设置

应用需要以下存储桶：

1. **avatars** - 用于存储用户头像（公开访问）
2. **files** - 用于存储上传的文件（私有访问）
3. **documents** - 用于存储项目文档（私有访问）

你可以通过以下方式创建存储桶：

### 方式一：通过Supabase控制台

1. 导航到「存储」部分
2. 点击「新建存储桶」按钮
3. 分别创建上述三个存储桶，并设置相应的访问权限

### 方式二：通过Node.js脚本

运行 `node init-database.js` 脚本，它会尝试创建这些存储桶。

## 行级安全策略设置

为了保护数据安全，建议为每个表设置适当的行级安全策略。以下是推荐的策略示例：

### Users 表

```sql
-- 启用行级安全
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 允许用户查看和更新自己的信息
CREATE POLICY "User can access own data" ON users
  FOR ALL TO authenticated
  USING (auth.uid() = id);

-- 允许管理员访问所有用户数据
CREATE POLICY "Admin can access all users" ON users
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
```

### Projects 表

```sql
-- 启用行级安全
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 允许项目创建者访问
CREATE POLICY "Project owner access" ON projects
  FOR ALL TO authenticated
  USING (user_id = auth.uid());

-- 允许团队成员访问（需要结合team_members表）
CREATE POLICY "Team member access" ON projects
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM team_members 
    WHERE project_id = projects.id 
    AND user_id = auth.uid()
  ));
```

请为其他表也设置类似的安全策略。

## 故障排除

### 常见问题

1. **连接错误**：检查`.env`文件中的Supabase URL和密钥是否正确
2. **权限错误**：确保使用的Supabase密钥有足够的权限创建表和存储桶
3. **表创建失败**：可能是因为缺少权限或数据库连接问题，请尝试使用方法一（SQL脚本）

### 手动检查

如果自动初始化失败，可以使用以下步骤检查数据库状态：

1. 检查表是否存在：
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

2. 检查存储桶是否存在：使用Supabase控制台的存储部分

## 下一步

初始化数据库后，你可以：
1. 开始使用应用的核心功能
2. 创建测试用户和项目数据
3. 根据需要自定义数据库结构

如有任何问题，请查看Supabase文档或联系技术支持。