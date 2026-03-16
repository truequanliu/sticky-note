// utils.js - 共享工具函数

/**
 * 检查便签是否已过期
 * @param {Object} note - 便签对象
 * @returns {boolean} 是否已过期
 */
function isOverdueNote(note) {
  if (!note.dueDate || note.isCompleted) return false;
  return new Date(note.dueDate) < new Date();
}

/**
 * 格式化日期显示
 * @param {string} dateString - ISO 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (noteDate.getTime() === today.getTime()) {
    return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (noteDate.getTime() === tomorrow.getTime()) {
    return '明天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * 转义 HTML 特殊字符（防止 XSS）
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 标准化便签字段（将数据库返回的数字转换为布尔值）
 * @param {Object} note - 便签对象
 * @returns {Object} 标准化后的便签对象
 */
function normalizeNoteFields(note) {
  return {
    ...note,
    isCompleted: Boolean(note.isCompleted),
    isPinned: Boolean(note.isPinned)
  };
}

/**
 * 标准化便签数组
 * @param {Array} notes - 便签数组
 * @returns {Array} 标准化后的便签数组
 */
function normalizeNotesArray(notes) {
  return notes.map(normalizeNoteFields);
}
