const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 数据库操作 API
  db: {
    getAll: () => ipcRenderer.invoke('db:getAll'),
    getById: (id) => ipcRenderer.invoke('db:getById', id),
    add: (data) => ipcRenderer.invoke('db:add', data),
    update: (id, data) => ipcRenderer.invoke('db:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:delete', id),
    toggleComplete: (id) => ipcRenderer.invoke('db:toggleComplete', id),
    togglePin: (id) => ipcRenderer.invoke('db:togglePin', id),
    getPinnedUncompleted: () => ipcRenderer.invoke('db:getPinnedUncompleted'),
    getColors: () => ipcRenderer.invoke('db:getColors'),

    // 标签管理 API
    tags: {
      getAll: () => ipcRenderer.invoke('tags:getAll'),
      getById: (id) => ipcRenderer.invoke('tags:getById', id),
      getUsageCount: (id) => ipcRenderer.invoke('tags:getUsageCount', id),
      create: (data) => ipcRenderer.invoke('tags:create', data),
      update: (id, data) => ipcRenderer.invoke('tags:update', id, data),
      delete: (id) => ipcRenderer.invoke('tags:delete', id)
    },

    // 标签筛选 API
    getByTag: (tagId) => ipcRenderer.invoke('notes:getByTag', tagId),
    getPinnedByTag: (tagId) => ipcRenderer.invoke('notes:getPinnedByTag', tagId)
  },

  // 监听数据变更 - 返回清理函数
  onNotesChanged: (callback) => {
    const listener = (event, notes) => callback(event, notes);
    ipcRenderer.on('notes-changed', listener);
    // 返回清理函数
    return () => ipcRenderer.removeListener('notes-changed', listener);
  },

  // 监听标签变更 - 返回清理函数
  onTagsChanged: (callback) => {
    const listener = (event, tags) => callback(event, tags);
    ipcRenderer.on('tags-changed', listener);
    // 返回清理函数
    return () => ipcRenderer.removeListener('tags-changed', listener);
  },

  // 监听筛选状态变更 - 返回清理函数
  onFilterChanged: (callback) => {
    const listener = (event, filter) => callback(event, filter);
    ipcRenderer.on('filter-changed', listener);
    // 返回清理函数
    return () => ipcRenderer.removeListener('filter-changed', listener);
  },

  // 设置筛选标签
  setFilterTag: (tagId) => ipcRenderer.invoke('filter:set', tagId),

  // 获取当前筛选
  getFilter: () => ipcRenderer.invoke('filter:get'),

  // 窗口控制 API
  reopenPinWindow: () => ipcRenderer.invoke('reopen-pin-window'),
  closePinWindow: () => ipcRenderer.invoke('close-pin-window')
});
