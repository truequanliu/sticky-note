// db/queries.js - 数据库查询封装

const { query } = require('./connection');

// SQL 查询常量（避免重复）
const NOTE_SELECT_CLAUSE = `
  n.id,
  n.content,
  n.due_date as dueDate,
  n.color_id as colorId,
  c.name as color,
  n.is_completed as isCompleted,
  n.is_pinned as isPinned,
  n.created_at as createdAt,
  n.updated_at as updatedAt
`;

const NOTE_FROM_CLAUSE = `
  FROM notes n
  LEFT JOIN colors c ON n.color_id = c.id
`;

/**
 * 生成 UUID
 */
function generateId() {
  return require('crypto').randomUUID();
}

/**
 * 获取所有便签
 */
async function getAllNotes() {
  try {
    // 排序规则：已完成沉底，未完成按截止时间升序
    const sql = `
      SELECT ${NOTE_SELECT_CLAUSE} ${NOTE_FROM_CLAUSE}
      ORDER BY
        n.is_completed ASC,
        CASE WHEN n.due_date IS NULL THEN 1 ELSE 0 END,
        n.due_date ASC
    `;
    return await query(sql);
  } catch (error) {
    console.error('Error in getAllNotes:', error);
    throw error;
  }
}

/**
 * 根据 ID 获取便签
 */
async function getNoteById(id) {
  try {
    const sql = `SELECT ${NOTE_SELECT_CLAUSE} ${NOTE_FROM_CLAUSE} WHERE n.id = ?`;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error in getNoteById:', error);
    throw error;
  }
}

// 允许的颜色值白名单
const ALLOWED_COLORS = [
  'yellow', 'orange', 'red', 'pink',
  'sky', 'blue', 'green', 'purple',
  'rose', 'gray'
];

// 默认排序值
const DEFAULT_SORT_ORDER = 999;

// 颜色名称到十六进制代码的映射（共享常量）
const COLOR_HEX_MAP = {
  yellow: '#fff9c4',
  orange: '#ffedd5',
  red: '#ffcdd2',
  pink: '#fce7f3',
  sky: '#e0f2fe',
  blue: '#bbdefb',
  green: '#c8e6c9',
  rose: '#ffe4e6',
  purple: '#e1bee7',
  gray: '#f3f4f6'
};

// 颜色 ID 缓存（颜色映射很少变化）
let colorCache = null;

/**
 * 验证颜色是否有效
 */
function isValidColor(color) {
  return !color || ALLOWED_COLORS.includes(color);
}

/**
 * 获取颜色 ID（带缓存）
 */
async function getColorId(color) {
  if (!color) return null;

  // 验证颜色值
  if (!isValidColor(color)) {
    throw new Error(`Invalid color: ${color}. Allowed values: ${ALLOWED_COLORS.join(', ')}`);
  }

  // 初始化缓存
  if (!colorCache) {
    const colors = await query('SELECT id, name FROM colors');
    colorCache = new Map(colors.map(c => [c.name, c.id]));
  }

  return colorCache.get(color) || null;
}

/**
 * 清除颜色缓存（如颜色表更新时调用）
 */
function invalidateColorCache() {
  colorCache = null;
}

/**
 * 添加便签
 */
async function addNote(data) {
  try {
    const id = generateId();
    const { content, dueDate, color } = data;

    // 验证内容
    if (!content || content.trim().length === 0) {
      throw new Error('Note content cannot be empty');
    }

    // 获取 color_id
    const colorId = await getColorId(color);

    const sql = `
      INSERT INTO notes (id, content, due_date, color_id, is_completed, is_pinned)
      VALUES (?, ?, ?, ?, FALSE, FALSE)
    `;

    await query(sql, [id, content.trim(), dueDate || null, colorId]);
    return await getNoteById(id);
  } catch (error) {
    console.error('Error in addNote:', error);
    throw error;
  }
}

/**
 * 更新便签
 */
async function updateNote(id, data) {
  try {
    const { content, dueDate, color } = data;

    // 验证内容
    if (!content || content.trim().length === 0) {
      throw new Error('Note content cannot be empty');
    }

    // 获取 color_id
    const colorId = await getColorId(color);

    const sql = `
      UPDATE notes
      SET content = ?, due_date = ?, color_id = ?
      WHERE id = ?
    `;

    await query(sql, [content.trim(), dueDate || null, colorId, id]);
    return await getNoteById(id);
  } catch (error) {
    console.error('Error in updateNote:', error);
    throw error;
  }
}

/**
 * 删除便签
 */
async function deleteNote(id) {
  try {
    const sql = 'DELETE FROM notes WHERE id = ?';
    await query(sql, [id]);
    return true;
  } catch (error) {
    console.error('Error in deleteNote:', error);
    throw error;
  }
}

/**
 * 切换完成状态
 */
async function toggleComplete(id) {
  try {
    const sql = 'UPDATE notes SET is_completed = NOT is_completed WHERE id = ?';
    await query(sql, [id]);
    return await getNoteById(id);
  } catch (error) {
    console.error('Error in toggleComplete:', error);
    throw error;
  }
}

/**
 * 切换置顶状态
 */
async function togglePin(id) {
  try {
    const sql = 'UPDATE notes SET is_pinned = NOT is_pinned WHERE id = ?';
    await query(sql, [id]);
    return await getNoteById(id);
  } catch (error) {
    console.error('Error in togglePin:', error);
    throw error;
  }
}

/**
 * 获取未完成的置顶便签
 */
async function getPinnedUncompleted() {
  try {
    // 已过滤未完成，按截止时间升序排列
    const sql = `
      SELECT ${NOTE_SELECT_CLAUSE} ${NOTE_FROM_CLAUSE}
      WHERE n.is_pinned = TRUE AND n.is_completed = FALSE
      ORDER BY
        CASE WHEN n.due_date IS NULL THEN 1 ELSE 0 END,
        n.due_date ASC
    `;
    return await query(sql);
  } catch (error) {
    console.error('Error in getPinnedUncompleted:', error);
    throw error;
  }
}

/**
 * 获取所有颜色
 */
async function getColors() {
  try {
    const sql = 'SELECT id, name, display_name as displayName, hex_code as hexCode FROM colors';
    return await query(sql);
  } catch (error) {
    console.error('Error in getColors:', error);
    throw error;
  }
}

/**
 * 按标签 ID 获取便签
 */
async function getNotesByTagId(tagId) {
  try {
    const sql = `
      SELECT ${NOTE_SELECT_CLAUSE}
      ${NOTE_FROM_CLAUSE}
      WHERE n.color_id = ?
      ORDER BY
        n.is_completed ASC,
        CASE WHEN n.due_date IS NULL THEN 1 ELSE 0 END,
        n.due_date ASC
    `;
    return await query(sql, [tagId]);
  } catch (error) {
    console.error('Error in getNotesByTagId:', error);
    throw error;
  }
}

/**
 * 获取无标签的便签
 */
async function getUntaggedNotes() {
  try {
    const sql = `
      SELECT ${NOTE_SELECT_CLAUSE}
      ${NOTE_FROM_CLAUSE}
      WHERE n.color_id IS NULL
      ORDER BY
        n.is_completed ASC,
        CASE WHEN n.due_date IS NULL THEN 1 ELSE 0 END,
        n.due_date ASC
    `;
    return await query(sql);
  } catch (error) {
    console.error('Error in getUntaggedNotes:', error);
    throw error;
  }
}

/**
 * 按标签获取置顶未完成便签（用于置顶窗口筛选）
 */
async function getPinnedByTagId(tagId) {
  try {
    const sql = `
      SELECT ${NOTE_SELECT_CLAUSE}
      ${NOTE_FROM_CLAUSE}
      WHERE n.is_pinned = TRUE AND n.is_completed = FALSE AND n.color_id = ?
      ORDER BY
        CASE WHEN n.due_date IS NULL THEN 1 ELSE 0 END,
        n.due_date ASC
    `;
    return await query(sql, [tagId]);
  } catch (error) {
    console.error('Error in getPinnedByTagId:', error);
    throw error;
  }
}

/**
 * 获取无标签的置顶未完成便签
 */
async function getPinnedUntagged() {
  try {
    const sql = `
      SELECT ${NOTE_SELECT_CLAUSE}
      ${NOTE_FROM_CLAUSE}
      WHERE n.is_pinned = TRUE AND n.is_completed = FALSE AND n.color_id IS NULL
      ORDER BY
        CASE WHEN n.due_date IS NULL THEN 1 ELSE 0 END,
        n.due_date ASC
    `;
    return await query(sql);
  } catch (error) {
    console.error('Error in getPinnedUntagged:', error);
    throw error;
  }
}

/**
 * 获取所有标签（含待办计数）
 */
async function getAllTags() {
  try {
    const sql = `
      SELECT
        c.id,
        c.name,
        c.display_name as displayName,
        c.hex_code as hexCode,
        c.sort_order as sortOrder,
        (SELECT COUNT(*) FROM notes n WHERE n.color_id = c.id AND n.is_completed = FALSE) as pendingCount
      FROM colors c
      ORDER BY c.sort_order ASC, c.name ASC
    `;
    return await query(sql);
  } catch (error) {
    console.error('Error in getAllTags:', error);
    throw error;
  }
}

/**
 * 根据 ID 获取标签
 */
async function getTagById(id) {
  try {
    const sql = `
      SELECT id, name, display_name as displayName, hex_code as hexCode, sort_order as sortOrder
      FROM colors
      WHERE id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error('Error in getTagById:', error);
    throw error;
  }
}

/**
 * 获取标签使用次数
 */
async function getTagUsageCount(id) {
  try {
    const sql = `
      SELECT COUNT(*) as count
      FROM notes
      WHERE color_id = ?
    `;
    const rows = await query(sql, [id]);
    return rows[0].count;
  } catch (error) {
    console.error('Error in getTagUsageCount:', error);
    throw error;
  }
}

/**
 * 创建标签
 * @param {Object} data - 标签数据
 * @param {string} data.name - 颜色名称（如 'yellow', 'red'）
 * @param {string} data.displayName - 显示名称（如 '工作', '生活'）
 * @param {string} data.hexCode - 十六进制颜色代码（可选，会根据 name 自动设置）
 * @param {number} data.sortOrder - 排序值
 */
async function createTag(data) {
  try {
    const { name, displayName, sortOrder = DEFAULT_SORT_ORDER } = data;

    // 验证颜色名称
    if (!name || name.trim().length === 0) {
      throw new Error('Tag name cannot be empty');
    }

    // 验证颜色值
    if (!isValidColor(name)) {
      throw new Error(`Invalid color name: ${name}. Allowed values: ${ALLOWED_COLORS.join(', ')}`);
    }

    const hexCode = data.hexCode || COLOR_HEX_MAP[name];

    // 不指定 id，让数据库自动生成（AUTO_INCREMENT）
    const sql = `
      INSERT INTO colors (name, display_name, hex_code, sort_order)
      VALUES (?, ?, ?, ?)
    `;

    const result = await query(sql, [name.trim(), displayName.trim() || name.trim(), hexCode, sortOrder]);
    invalidateColorCache();

    // 获取插入的 ID
    const insertId = result.insertId;

    return await getTagById(insertId);
  } catch (error) {
    console.error('Error in createTag:', error);
    throw error;
  }
}

/**
 * 更新标签
 * @param {string} id - 标签 ID
 * @param {Object} data - 标签数据
 * @param {string} data.name - 颜色名称（如 'yellow', 'red'）
 * @param {string} data.displayName - 显示名称（如 '工作', '生活'）
 * @param {string} data.hexCode - 十六进制颜色代码（可选，会根据 name 自动设置）
 * @param {number} data.sortOrder - 排序值
 */
async function updateTag(id, data) {
  try {
    const { name, displayName, sortOrder = DEFAULT_SORT_ORDER } = data;

    // 验证颜色名称
    if (!name || name.trim().length === 0) {
      throw new Error('Tag name cannot be empty');
    }

    // 验证颜色值
    if (!isValidColor(name)) {
      throw new Error(`Invalid color name: ${name}. Allowed values: ${ALLOWED_COLORS.join(', ')}`);
    }

    const hexCode = data.hexCode || COLOR_HEX_MAP[name];

    const sql = `
      UPDATE colors
      SET name = ?, display_name = ?, hex_code = ?, sort_order = ?
      WHERE id = ?
    `;

    await query(sql, [name.trim(), displayName.trim() || name.trim(), hexCode, sortOrder, id]);
    invalidateColorCache();
    return await getTagById(id);
  } catch (error) {
    console.error('Error in updateTag:', error);
    throw error;
  }
}

/**
 * 删除标签
 */
async function deleteTag(id) {
  try {
    const sql = 'DELETE FROM colors WHERE id = ?';
    await query(sql, [id]);
    invalidateColorCache();
    return true;
  } catch (error) {
    console.error('Error in deleteTag:', error);
    throw error;
  }
}

module.exports = {
  // Constants
  ALLOWED_COLORS,
  COLOR_HEX_MAP,
  DEFAULT_SORT_ORDER,

  // Basic note operations
  getAllNotes,
  getNoteById,
  addNote,
  updateNote,
  deleteNote,
  toggleComplete,
  togglePin,
  getPinnedUncompleted,
  getColors,
  invalidateColorCache,

  // Tag management
  getAllTags,
  getTagById,
  getTagUsageCount,
  createTag,
  updateTag,
  deleteTag,

  // Tag filtering
  getNotesByTagId,
  getUntaggedNotes,
  getPinnedByTagId,
  getPinnedUntagged
};
