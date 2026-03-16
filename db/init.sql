-- 数据库初始化脚本

-- 创建数据库
CREATE DATABASE IF NOT EXISTS sticky_note CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sticky_note;

-- 创建颜色表
CREATE TABLE IF NOT EXISTS colors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    display_name VARCHAR(20) NOT NULL,
    hex_code VARCHAR(20) NOT NULL,
    sort_order INT DEFAULT 999,
    icon VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建便签表
CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(36) PRIMARY KEY,
    content TEXT NOT NULL,
    due_date DATETIME DEFAULT NULL,
    color_id INT DEFAULT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_pinned_completed ON notes(is_pinned, is_completed);
CREATE INDEX IF NOT EXISTS idx_color_id ON notes(color_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON notes(created_at DESC);

-- 初始化颜色数据
INSERT IGNORE INTO colors (name, display_name, hex_code, sort_order) VALUES
    ('yellow', '黄色', '#fff9c4', 10),
    ('blue', '蓝色', '#bbdefb', 30),
    ('green', '绿色', '#c8e6c9', 40),
    ('red', '红色', '#ffcdd2', 20),
    ('purple', '紫色', '#e1bee7', 50);

-- 迁移脚本：添加新字段
-- 注意：MySQL 不支持 IF NOT EXISTS，需手动检查或先执行会报错时忽略
ALTER TABLE colors ADD COLUMN sort_order INT DEFAULT 999;
ALTER TABLE colors ADD COLUMN icon VARCHAR(50) DEFAULT NULL;

-- 更新现有颜色的排序值
UPDATE colors SET sort_order = 10 WHERE name = 'yellow' AND sort_order = 999;
UPDATE colors SET sort_order = 20 WHERE name = 'red' AND sort_order = 999;
UPDATE colors SET sort_order = 30 WHERE name = 'blue' AND sort_order = 999;
UPDATE colors SET sort_order = 40 WHERE name = 'green' AND sort_order = 999;
UPDATE colors SET sort_order = 50 WHERE name = 'purple' AND sort_order = 999;

-- 添加新颜色
INSERT IGNORE INTO colors (name, display_name, hex_code, sort_order) VALUES
    ('orange', '橙色', '#ffedd5', 15),
    ('pink', '粉色', '#fce7f3', 25),
    ('sky', '天蓝', '#e0f2fe', 35),
    ('rose', '玫红', '#ffe4e6', 45),
    ('gray', '灰色', '#f3f4f6', 55);

-- 创建索引优化筛选查询
CREATE INDEX IF NOT EXISTS idx_color_id_completed ON notes(color_id, is_completed);
