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
let isConnected = false;
let connectionError = null;

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    const testPool = mysql.createPool({
      ...config,
      connectionLimit: 1,
      waitForConnections: false,
      enableKeepAlive: false
    });
    await testPool.execute('SELECT 1');
    await testPool.end();
    return true;
  } catch (error) {
    connectionError = error;
    console.error('Database connection test failed:', error.message);
    return false;
  }
}

/**
 * 获取数据库连接池
 * @throws {Error} 如果连接失败会抛出错误
 */
function getPool() {
  if (!pool) {
    try {
      pool = mysql.createPool({
        ...config,
        // 单用户桌面应用的优化配置
        connectionLimit: 5,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });

      // 监听连接事件
      pool.on('connection', () => {
        if (!isConnected) {
          isConnected = true;
          connectionError = null;
        }
      });

      pool.on('error', (err) => {
        console.error('MySQL pool error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          isConnected = false;
        }
      });
    } catch (error) {
      connectionError = error;
      throw new Error(`Failed to create database pool: ${error.message}`);
    }
  }
  return pool;
}

/**
 * 检查数据库是否已连接
 */
function isDatabaseConnected() {
  return isConnected && !connectionError;
}

/**
 * 获取连接错误信息
 */
function getConnectionError() {
  return connectionError;
}

/**
 * 关闭连接池
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}

/**
 * 执行查询
 * @throws {Error} 如果查询失败会抛出错误
 */
async function query(sql, params = []) {
  const pool = getPool();
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Query execution failed:', error.message);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

module.exports = {
  getPool,
  closePool,
  query,
  testConnection,
  isDatabaseConnected,
  getConnectionError
};
