const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { closePool } = require('./db/connection');
const { getColors, getAllNotes, getPinnedUncompleted,
        getNoteById, addNote, updateNote, deleteNote, toggleComplete, togglePin,
        getAllTags, getTagById, getTagUsageCount, createTag, updateTag, deleteTag,
        getNotesByTagId, getUntaggedNotes, getPinnedByTagId, getPinnedUntagged } = require('./db/queries');

let mainWindow;
let pinWindow;
let tray = null;

// 窗口状态存储文件路径
const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');

/**
 * 读取窗口状态
 * @returns {Promise<Object>} 包含主窗口和置顶窗口的状态
 * @returns {Object} returns.mainWindow 主窗口状态
 * @returns {number} [returns.mainWindow.width] 窗口宽度
 * @returns {number} [returns.mainWindow.height] 窗口高度
 * @returns {number} [returns.mainWindow.x] 窗口X坐标
 * @returns {number} [returns.mainWindow.y] 窗口Y坐标
 * @returns {boolean} [returns.mainWindow.isMaximized] 是否最大化
 * @returns {Object} returns.pinWindow 置顶窗口状态
 */
async function loadWindowState() {
  try {
    await fs.promises.access(windowStateFile);
    const data = await fs.promises.readFile(windowStateFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // 文件不存在或读取错误，返回默认值
    return {
      mainWindow: { width: 900, height: 700 },
      pinWindow: { width: 320, height: 450 }
    };
  }
}

/**
 * 保存窗口状态到文件（异步，带防抖）
 */
let saveStateTimeout = null;
function saveWindowState() {
  // 防抖：避免频繁写入文件
  if (saveStateTimeout) {
    clearTimeout(saveStateTimeout);
  }
  saveStateTimeout = setTimeout(async () => {
    try {
      const state = {};
      if (mainWindow && !mainWindow.isDestroyed()) {
        const [x, y] = mainWindow.getPosition();
        const [width, height] = mainWindow.getSize();
        state.mainWindow = { x, y, width, height, isMaximized: mainWindow.isMaximized() };
      }
      if (pinWindow && !pinWindow.isDestroyed()) {
        const [x, y] = pinWindow.getPosition();
        const [width, height] = pinWindow.getSize();
        state.pinWindow = { x, y, width, height };
      }
      await fs.promises.writeFile(windowStateFile, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save window state:', error);
    }
  }, 500); // 500ms 防抖延迟
}

/**
 * 创建主窗口
 * 恢复上次保存的位置和大小
 */
async function createMainWindow() {
  const savedState = await loadWindowState();
  const mainState = savedState.mainWindow || { width: 900, height: 700 };

  mainWindow = new BrowserWindow({
    width: mainState.width,
    height: mainState.height,
    x: mainState.x,
    y: mainState.y,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 恢复最大化状态
  if (mainState.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.loadFile('index.html');

  // 监听窗口位置和大小变化，保存状态
  mainWindow.on('move', () => saveWindowState());
  mainWindow.on('resize', () => saveWindowState());
  mainWindow.on('maximize', () => saveWindowState());
  mainWindow.on('unmaximize', () => saveWindowState());

  // 关闭时隐藏到托盘而不是关闭
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 创建置顶窗口
 * 如果窗口已存在则显示并聚焦，否则创建新窗口
 * 恢复上次保存的位置和大小
 */
async function createPinWindow() {
  // 如果置顶窗口已存在，显示并聚焦
  if (pinWindow && !pinWindow.isDestroyed()) {
    pinWindow.show();
    pinWindow.focus();
    return;
  }

  const savedState = await loadWindowState();
  const pinState = savedState.pinWindow || { width: 320, height: 450 };

  pinWindow = new BrowserWindow({
    width: pinState.width,
    height: pinState.height,
    x: pinState.x,
    y: pinState.y,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 监听窗口位置变化，保存状态
  pinWindow.on('move', () => saveWindowState());
  pinWindow.on('resize', () => saveWindowState());

  // 窗口加载完成后发送数据（在 loadFile 之前设置监听器，避免竞态条件）
  pinWindow.webContents.once('did-finish-load', () => {
    sendPinnedNotesToPinWindow();
  });

  pinWindow.loadFile('pin-window.html');

  // 使用 { once: true } 防止监听器累积
  pinWindow.once('closed', () => {
    pinWindow = null;
  });
}

/**
 * 创建系统托盘图标和菜单
 */
function createTray() {
  // 创建托盘图标
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray-icon.png'));
  // 确保 icon 不为空
  if (icon.isEmpty()) {
    console.error('Failed to load tray icon');
  }

  tray = new Tray(icon);
  tray.setToolTip('便签');

  // 右键菜单
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // 双击显示主窗口
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createMainWindow();
    }
  });
}

/**
 * 发送置顶便签到置顶窗口
 * @returns {Promise<void>}
 */
async function sendPinnedNotesToPinWindow() {
  if (pinWindow && !pinWindow.isDestroyed()) {
    const pinnedNotes = await getPinnedUncompleted();
    pinWindow.webContents.send('notes-changed', pinnedNotes);
  }
}

/**
 * 通知所有窗口数据已变更
 * 发送所有便签到主窗口，只发送置顶未完成便签到置顶窗口
 * @returns {Promise<void>}
 */
async function notifyNotesChanged() {
  const allNotes = await getAllNotes();
  // 从 allNotes 中过滤出置顶未完成的便签，避免重复查询
  const pinnedNotes = allNotes.filter(n => n.isPinned && !n.isCompleted);

  // 通知主窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('notes-changed', allNotes);
  }

  // 通知置顶窗口
  if (pinWindow && !pinWindow.isDestroyed()) {
    pinWindow.webContents.send('notes-changed', pinnedNotes);
  }
}

/**
 * 通知所有窗口标签已变更
 */
async function notifyTagsChanged() {
  const tags = await getAllTags();

  // 通知主窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('tags-changed', tags);
  }

  // 通知置顶窗口
  if (pinWindow && !pinWindow.isDestroyed()) {
    pinWindow.webContents.send('tags-changed', tags);
  }
}

/**
 * 通知所有窗口筛选状态已变更
 */
function notifyFilterChanged(tagId) {
  // 通知主窗口
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('filter-changed', { tagId });
  }

  // 通知置顶窗口
  if (pinWindow && !pinWindow.isDestroyed()) {
    pinWindow.webContents.send('filter-changed', { tagId });
  }
}

app.whenReady().then(async () => {
  createMainWindow();
  createPinWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createPinWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // 在 Windows 上，关闭所有窗口时退出应用
  // 但由于有托盘，这个逻辑会被阻止（除非用户主动退出）
  if (process.platform !== 'darwin') {
    // 不自动退出，依赖托盘菜单退出
  }
});

app.on('before-quit', async () => {
  // 关闭数据库连接
  await closePool();
});

// ==================== IPC Handlers ====================

// 获取所有便签
ipcMain.handle('db:getAll', async () => {
  return await getAllNotes();
});

// 根据 ID 获取便签
ipcMain.handle('db:getById', async (event, id) => {
  return await getNoteById(id);
});

// 添加便签
ipcMain.handle('db:add', async (event, data) => {
  const note = await addNote(data);
  await notifyNotesChanged();
  return note;
});

// 更新便签
ipcMain.handle('db:update', async (event, id, data) => {
  const note = await updateNote(id, data);
  await notifyNotesChanged();
  return note;
});

// 删除便签
ipcMain.handle('db:delete', async (event, id) => {
  await deleteNote(id);
  await notifyNotesChanged();
  return true;
});

// 切换完成状态
ipcMain.handle('db:toggleComplete', async (event, id) => {
  const note = await toggleComplete(id);
  await notifyNotesChanged();
  return note;
});

// 切换置顶状态
ipcMain.handle('db:togglePin', async (event, id) => {
  const note = await togglePin(id);
  await notifyNotesChanged();
  return note;
});

// 获取未完成的置顶便签
ipcMain.handle('db:getPinnedUncompleted', async () => {
  return await getPinnedUncompleted();
});

// 获取所有颜色
ipcMain.handle('db:getColors', async () => {
  return await getColors();
});

// 重新打开置顶窗口
ipcMain.handle('reopen-pin-window', async () => {
  createPinWindow();
  await sendPinnedNotesToPinWindow();
});

// 关闭置顶窗口
ipcMain.handle('close-pin-window', async () => {
  if (pinWindow && !pinWindow.isDestroyed()) {
    pinWindow.close();
  }
});

// ==================== 标签管理 IPC Handlers ====================

// 获取所有标签（含计数）
ipcMain.handle('tags:getAll', async () => {
  return await getAllTags();
});

// 获取单个标签
ipcMain.handle('tags:getById', async (event, id) => {
  return await getTagById(id);
});

// 检查标签使用次数
ipcMain.handle('tags:getUsageCount', async (event, id) => {
  const count = await getTagUsageCount(id);
  return { count };
});

// 创建标签
ipcMain.handle('tags:create', async (event, data) => {
  const tag = await createTag(data);
  await notifyTagsChanged();
  return tag;
});

// 更新标签
ipcMain.handle('tags:update', async (event, id, data) => {
  const tag = await updateTag(id, data);
  await notifyTagsChanged();
  return tag;
});

// 删除标签
ipcMain.handle('tags:delete', async (event, id) => {
  await deleteTag(id);
  await notifyTagsChanged();
  return true;
});

// ==================== 标签筛选 IPC Handlers ====================

// 按标签获取便签
ipcMain.handle('notes:getByTag', async (event, tagId) => {
  if (tagId === null || tagId === '') {
    return await getAllNotes();
  }
  return await getNotesByTagId(tagId);
});

// 获取无标签便签
ipcMain.handle('notes:getUntagged', async () => {
  return await getUntaggedNotes();
});

// 按标签获取置顶便签
ipcMain.handle('notes:getPinnedByTag', async (event, tagId) => {
  if (tagId === null || tagId === '') {
    return await getPinnedUncompleted();
  }
  return await getPinnedByTagId(tagId);
});

// 获取无标签置顶便签
ipcMain.handle('notes:getPinnedUntagged', async () => {
  return await getPinnedUntagged();
});

// ==================== 筛选状态管理 ====================

let currentFilterTagId = null;

// 设置当前筛选标签
ipcMain.handle('filter:set', async (event, tagId) => {
  currentFilterTagId = tagId;
  notifyFilterChanged(tagId);
  return { tagId };
});

// 获取当前筛选
ipcMain.handle('filter:get', async () => {
  return { tagId: currentFilterTagId };
});
