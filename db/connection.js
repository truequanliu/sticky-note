// db/connection.js - MySQL 连接配置

const mysql = require('mysql2/promise');

// 连接配置（支持环境变量，提供默认值）
const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '33060', 10),
  user: process.env.DB_USER || 'homestead',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'sticky_note',
  charset: 'utf8mb4'
};

let pool = null;

/**
 * 获取数据库连接池
 */
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...config,
      // 单用户桌面应用的优化配置
      connectionLimit: 5,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
  }
  return pool;
}

/**
 * 关闭连接池
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * 执行查询
 */
async function query(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = {
  getPool,
  closePool,
  query
};
