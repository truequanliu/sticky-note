# 便签桌面应用

一个基于 Electron + MySQL 开发的便签管理桌面应用，支持标签分类、筛选统计，以及将待办事项钉选在桌面置顶显示。

![版本](https://img.shields.io/badge/version-1.0.0-blue)
![Electron](https://img.shields.io/badge/Electron-28.0.0-9ff)
![Node](https://img.shields.io/badge/Node-18+-green)

## 功能特性

### 核心功能
- ✅ **便签管理** - 创建、编辑、删除便签
- ✅ **任务时间** - 设置任务处理时间，支持日期时间选择
- ✅ **完成状态** - 标记任务完成/未完成，已完成任务显示删除线
- ✅ **过期提醒** - 过期任务以红色高亮显示并带有 ⚠️ 图标
- ✅ **置顶窗口** - 将任务钉选在桌面小窗口显示，始终置顶
- ✅ **拖拽移动** - 桌面小窗口可拖拽到任意位置

### 标签系统
- ✅ **颜色分类** - 10 种预设颜色（黄、橙、红、粉、天蓝、蓝、绿、玫红、紫、灰）
- ✅ **自定义标签名** - 为每种颜色定义有意义的名称（如"工作"、"生活"）
- ✅ **标签排序** - 自定义标签显示顺序
- ✅ **标签筛选** - 按标签筛选便签
- ✅ **统计计数** - 实时显示每个标签的待办数量
- ✅ **全部统计** - "全部"标签显示所有未完成便签总数

### 标签胶囊
- ✅ **内容显示** - 标签胶囊直接显示便签内容（`🟡 便签内容` 格式）
- ✅ **去重显示** - 有标签胶囊时，原便签内容区域自动隐藏
- ✅ **完成标识** - 已完成任务的标签胶囊显示删除线

### 数据存储
- ✅ **MySQL 持久化** - 所有数据存储在 MySQL 数据库中
- ✅ **自动同步** - 主窗口与置顶窗口数据实时同步
- ✅ **状态共享** - 两个窗口共享标签筛选状态

## 界面预览

### 主窗口
```
┌─────────────────────────────────────────────────────────────┐
│  📝 便签管理                              [+ 添加便签] [📌 置顶]  │
├─────────────────────────────────────────────────────────────┤
│  [全部(5)] [🟡 工作(3)] [🔴 紧急(2)] ... [⚙️ 管理]          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🟡 完成项目进度报告                   📅 明天 10:00  │    │
│  │    [✓ 完成] [📍 已钉选] [编辑] [删除]              │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔴 修复线上 BUG ⚠️                       📅 今天 09:00 │    │
│  │    [✓ 完成] [📌 钉选] [编辑] [删除]                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 置顶窗口
```
┌─────────────────────────────┐
│  📌 置顶便签              [×] │
├─────────────────────────────┤
│  🟡 完成项目进度报告         │
│     [✓ 完成] [📌 取消]       │
├─────────────────────────────┤
│  🔴 修复线上 BUG ⚠️         │
│     [✓ 完成] [📌 取消]       │
└─────────────────────────────┘
```

## 安装和运行

### 前置要求

- **Node.js** - v18 或更高版本
- **MySQL** - v5.7 或 v8.0+

### 数据库配置

1. 创建数据库：
   ```sql
   CREATE DATABASE sticky_note CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. 创建数据表：
   ```sql
   USE sticky_note;

   -- 颜色标签表
   CREATE TABLE colors (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(50) NOT NULL UNIQUE,
     display_name VARCHAR(100),
     hex_code VARCHAR(7),
     sort_order INT DEFAULT 999,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- 便签表
   CREATE TABLE notes (
     id CHAR(36) PRIMARY KEY,
     content TEXT NOT NULL,
     due_date DATETIME,
     color_id INT,
     is_completed BOOLEAN DEFAULT FALSE,
     is_pinned BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE SET NULL
   );
   ```

3. 插入默认颜色标签：
   ```sql
   INSERT INTO colors (name, display_name, hex_code, sort_order) VALUES
   ('yellow', '黄色', '#fff9c4', 10),
   ('orange', '橙色', '#ffedd5', 15),
   ('red', '红色', '#ffcdd2', 20),
   ('pink', '粉色', '#fce7f3', 25),
   ('sky', '天蓝', '#e0f2fe', 35),
   ('blue', '蓝色', '#bbdefb', 30),
   ('green', '绿色', '#c8e6c9', 40),
   ('rose', '玫红', '#ffe4e6', 45),
   ('purple', '紫色', '#e1bee7', 50),
   ('gray', '灰色', '#f3f4f6', 55);
   ```

### 配置数据库连接

编辑 `db/connection.js`，修改数据库配置：

```javascript
const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'your_username',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'sticky_note',
  charset: 'utf8mb4'
};
```

或设置环境变量：

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=your_username
export DB_PASSWORD=your_password
export DB_NAME=sticky_note
```

### 安装步骤

1. 进入项目目录：
   ```bash
   cd sticky-note
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 运行应用：
   ```bash
   npm start
   ```

### 打包分发

```bash
# 打包（输出到 dist 目录）
npm run dist

# 仅构建不打包
npm run build
```

## 使用说明

### 主界面操作

| 操作 | 说明 |
|------|------|
| **添加便签** | 点击右上角 "+ 添加便签" 按钮 |
| **编辑便签** | 点击便签卡片上的 "编辑" 按钮 |
| **删除便签** | 点击便签卡片上的 "删除" 按钮（需确认） |
| **完成任务** | 点击 "✓ 完成" 按钮，再次点击可撤销 |
| **钉选便签** | 点击 "📌 钉选" 按钮，将便签添加到置顶窗口 |
| **取消钉选** | 点击 "📍 已钉选" 按钮 |
| **过期提示** | 过期未完成任务显示红色并有 ⚠️ 图标 |

### 标签栏操作

| 操作 | 说明 |
|------|------|
| **全部** | 显示所有未完成的便签 |
| **标签筛选** | 点击标签按钮只显示该标签的便签 |
| **标签计数** | 显示每个标签的待办数量 |
| **管理标签** | 点击 "⚙️ 管理" 按钮进入标签管理 |

### 标签管理

| 操作 | 说明 |
|------|------|
| **新建标签** | 点击 "+ 新建标签" 按钮 |
| **编辑标签** | 修改标签名称和排序 |
| **删除标签** | 仅可删除无待办事项的标签 |
| **排序规则** | 数字越小越靠前，留空则排在最后 |

### 置顶窗口操作

| 操作 | 说明 |
|------|------|
| **查看钉选任务** | 所有钉选且未完成的任务显示在这里 |
| **完成任务** | 点击 "✓ 完成" 按钮 |
| **取消钉选** | 点击 "📌 取消" 按钮 |
| **移动窗口** | 拖拽标题栏移动窗口位置 |
| **关闭窗口** | 点击右上角 × 按钮 |
| **重新打开** | 在主窗口点击 "📌 打开置顶窗口" 按钮 |

### 日期时间显示规则

| 条件 | 显示格式 |
|------|----------|
| 今天 | "今天 HH:mm" |
| 明天 | "明天 HH:mm" |
| 其他日期 | "M月D日 HH:mm" |

## 项目结构

```
sticky-note/
├── main.js              # Electron 主进程入口
├── preload.js           # 预加载脚本（IPC 桥接）
├── index.html           # 主窗口 HTML
├── pin-window.html      # 置顶窗口 HTML
├── app.js               # 主窗口业务逻辑
├── pin-app.js           # 置顶窗口业务逻辑
├── pin-style.css        # 置顶窗口样式
├── style.css            # 主窗口样式
├── utils.js             # 工具函数
├── constants.js         # 常量定义
├── db/
│   ├── connection.js    # MySQL 连接配置
│   └── queries.js       # 数据库查询封装
├── scripts/
│   └── migrate.js       # 数据库迁移脚本
└── package.json         # 项目配置
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Electron** | 28.0.0 | 桌面应用框架 |
| **Node.js** | 18+ | 运行时环境 |
| **MySQL** | 5.7/8.0+ | 数据存储 |
| **mysql2** | 3.19.1 | MySQL 驱动 |
| **electron-builder** | 24.13.3 | 应用打包 |

## 数据库表结构

### colors 表（颜色标签）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT AUTO_INCREMENT | 主键 |
| name | VARCHAR(50) | 颜色名称（yellow, red 等） |
| display_name | VARCHAR(100) | 显示名称（黄色、红色等） |
| hex_code | VARCHAR(7) | 十六进制颜色代码 |
| sort_order | INT | 排序值 |

### notes 表（便签）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | CHAR(36) | UUID 主键 |
| content | TEXT | 便签内容 |
| due_date | DATETIME | 处理时间 |
| color_id | INT | 颜色标签 ID（外键） |
| is_completed | BOOLEAN | 是否完成 |
| is_pinned | BOOLEAN | 是否钉选 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 快捷键

| 按键 | 功能 |
|------|------|
| ESC | 关闭当前打开的模态框 |

## 许可证

MIT License

---

**如有问题或建议，欢迎提出 Issue 或 Pull Request。**
