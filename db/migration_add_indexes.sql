-- 为现有数据库添加索引的迁移脚本
-- 执行方式: mysql -h 127.0.0.1 -P 33060 -u homestead -p sticky_note < db/migration_add_indexes.sql

USE sticky_note;

-- 添加索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_pinned_completed ON notes(is_pinned, is_completed);
CREATE INDEX IF NOT EXISTS idx_color_id ON notes(color_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON notes(created_at DESC);
