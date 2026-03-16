// constants.js - 应用常量配置

/**
 * 颜色常量
 */
const COLORS = {
  YELLOW: 'yellow',
  BLUE: 'blue',
  GREEN: 'green',
  RED: 'red',
  PURPLE: 'purple'
};

const ALLOWED_COLORS = Object.values(COLORS);

/**
 * 窗口尺寸配置
 */
const WINDOW = {
  MAIN: { width: 900, height: 700 },
  PIN: { width: 320, height: 450 }
};

/**
 * UI 文本
 */
const UI_TEXT = {
  TOOLTIP: '便签',
  TOGGLE_PIN: {
    PINNED: '📍 已钉选',
    UNPINNED: '📌 钉选'
  },
  TOGGLE_COMPLETE: {
    COMPLETED: '↩️ 撤销',
    UNCOMPLETED: '✓ 完成'
  }
};

/**
 * 应用配置
 */
const APP_CONFIG = {
  // 数据库表名
  TABLE_NOTES: 'notes',
  TABLE_COLORS: 'colors',

  // IPC 通道名称
  IPC_CHANNEL: {
    NOTES_CHANGED: 'notes-changed',
    DB_PREFIX: 'db:'
  }
};
