// app.js - 主窗口逻辑

let editingId = null;
let deleteTargetId = null;
let allNotes = [];
let allNotesData = []; // 存储所有便签（不筛选），用于统计"全部"数量
const FILTER_ALL = ''; // 无筛选标记
let currentFilterTagId = FILTER_ALL; // 当前筛选标签 ID
let allTags = []; // 所有标签

/**
 * 获取标签 emoji
 */
function getTagEmoji(colorName) {
  const emojiMap = {
    yellow: '🟡',
    orange: '🟠',
    red: '🔴',
    pink: '🌸',
    sky: '🩵',
    blue: '🔵',
    green: '🟢',
    rose: '🩷',
    purple: '🟣',
    gray: '⚫'
  };
  return emojiMap[colorName] || '📌';
}

// DOM Elements
const noteList = document.getElementById('noteList');
const addNoteBtn = document.getElementById('addNoteBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const noteForm = document.getElementById('noteForm');
const noteId = document.getElementById('noteId');
const noteContent = document.getElementById('noteContent');
const noteDueDate = document.getElementById('noteDueDate');
const noteColor = document.getElementById('noteColor');
const cancelBtn = document.getElementById('cancelBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const reopenPinBtn = document.getElementById('reopenPinBtn');

// Tag management elements
const tagManagerBtn = document.getElementById('manageTagsBtn');
const tagManagerModal = document.getElementById('tagManagerModal');
const closeTagManagerBtn = document.getElementById('closeTagManagerBtn');
const tagListBody = document.getElementById('tagListBody');
const addTagBtn = document.getElementById('addTagBtn');
const tagFormModal = document.getElementById('tagFormModal');
const tagFormTitle = document.getElementById('tagFormTitle');
const tagForm = document.getElementById('tagForm');
const tagId = document.getElementById('tagId');
const tagName = document.getElementById('tagName');
const tagSortOrder = document.getElementById('tagSortOrder');
const tagColor = document.getElementById('tagColor');
const tagFormCancelBtn = document.getElementById('tagFormCancelBtn');
const colorOptions = document.querySelectorAll('.color-option');

/**
 * 加载标签并更新 UI
 */
async function loadTagsAndUpdateUI() {
  allTags = await window.electronAPI.db.tags.getAll();
  renderTabBar();
}

/**
 * 打开标签管理模态框
 */
function openTagManager() {
  tagManagerModal.classList.add('active');
  renderTagList();
  renderTabBar(); // 更新管理按钮的 active 状态
}

/**
 * 关闭标签管理模态框
 */
function closeTagManager() {
  tagManagerModal.classList.remove('active');
  renderTabBar(); // 更新管理按钮的 active 状态
}

/**
 * 渲染标签列表
 */
async function renderTagList() {
  const tags = await window.electronAPI.db.tags.getAll();

  if (tags.length === 0) {
    tagListBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">暂无标签</td>
      </tr>
    `;
    return;
  }

  // 按 sort_order 排序
  const sortedTags = tags.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

  tagListBody.innerHTML = sortedTags.map(tag => `
    <tr data-tag-id="${tag.id}">
      <td>${tag.sortOrder || 999}</td>
      <td>${getTagEmoji(tag.name)}</td>
      <td>${escapeHtml(tag.displayName || tag.name)}</td>
      <td>${tag.pendingCount || 0}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-small" data-action="edit-tag">编辑</button>
        <button class="btn btn-danger btn-small" data-action="delete-tag" ${tag.pendingCount > 0 ? 'disabled' : ''}>
          删除
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * 打开新建标签表单
 */
function openAddTagForm() {
  // 关闭标签管理模态框以避免叠加
  tagManagerModal.classList.remove('active');

  tagFormTitle.textContent = '新建标签';
  tagForm.reset();
  tagId.value = '';
  // 默认选中第一个颜色
  colorOptions.forEach(opt => opt.classList.remove('selected'));
  if (colorOptions.length > 0) {
    colorOptions[0].classList.add('selected');
    tagColor.value = colorOptions[0].dataset.color;
  }
  tagFormModal.classList.add('active');
}

/**
 * 打开编辑标签表单
 */
async function openEditTagForm(id) {
  const tag = await window.electronAPI.db.tags.getById(id);
  if (!tag) {
    console.error('Tag not found:', id);
    return;
  }

  // 关闭标签管理模态框
  tagManagerModal.classList.remove('active');

  tagFormTitle.textContent = '编辑标签';
  tagId.value = id;
  tagName.value = tag.displayName || tag.name;
  tagSortOrder.value = tag.sortOrder || '';

  // 选中对应的颜色
  let found = false;
  colorOptions.forEach(opt => {
    opt.classList.remove('selected');
    if (opt.dataset.color === tag.name) {
      opt.classList.add('selected');
      tagColor.value = tag.name;
      found = true;
    }
  });

  if (!found) {
    console.warn('Color option not found for tag:', tag.name);
  }

  tagFormModal.classList.add('active');
}

/**
 * 关闭标签表单
 */
function closeTagForm() {
  tagFormModal.classList.remove('active');
  tagForm.reset();
  tagId.value = '';
}

/**
 * 处理标签表单提交
 */
async function handleTagFormSubmit(e) {
  e.preventDefault();

  // 验证颜色已选择
  if (!tagColor.value) {
    showError('请选择一个颜色');
    return;
  }

  // 验证标签名称
  if (!tagName.value.trim()) {
    showError('请输入标签名称');
    return;
  }

  const data = {
    name: tagColor.value, // 使用选中的颜色名称
    displayName: tagName.value.trim(),
    sortOrder: tagSortOrder.value ? parseInt(tagSortOrder.value) : 999
  };

  try {
    if (tagId.value) {
      await window.electronAPI.db.tags.update(tagId.value, data);
    } else {
      await window.electronAPI.db.tags.create(data);
    }

    closeTagForm();
    renderTagList();
  } catch (error) {
    showError('操作失败：' + error.message);
  }
}

/**
 * 删除标签
 */
async function deleteTag(id) {
  const usage = await window.electronAPI.db.tags.getUsageCount(id);
  if (usage.count > 0) {
    showError('该标签正在使用中，无法删除');
    return;
  }

  await window.electronAPI.db.tags.delete(id);
  renderTagList();
}

// 初始化
async function init() {
  // 先加载笔记，以便 renderTabBar 能正确计算"全部"数量
  await loadNotes();
  // 再加载标签，以便笔记卡片能正确显示标签信息
  await loadTagsAndUpdateUI();
  // 重新渲染笔记以确保标签信息正确显示
  renderNotes();
  updateReopenPinButton();
}

// 加载便签数据
async function loadNotes() {
  // 先加载所有便签到 allNotesData
  allNotesData = normalizeNotesArray(await window.electronAPI.db.getAll());

  // 根据 currentFilterTagId 筛选显示的便签
  if (!currentFilterTagId || currentFilterTagId === FILTER_ALL) {
    allNotes = allNotesData;
  } else {
    allNotes = normalizeNotesArray(await window.electronAPI.db.getByTag(currentFilterTagId));
  }

  renderNotes();
}

// 渲染便签列表
function renderNotes() {
  if (allNotes.length === 0) {
    noteList.innerHTML = `
      <div class="empty-state">
        <p>暂无待办事项</p>
        <p class="empty-hint">点击上方按钮添加你的第一个便签</p>
      </div>
    `;
    return;
  }

  noteList.innerHTML = allNotes.map(note => createNoteCard(note)).join('');
}

/**
 * 渲染标签栏
 */
function renderTabBar() {
  const tabBar = document.getElementById('tabBar');

  // 计算全部便签数 - 使用 allNotesData 而不是 allNotes
  const allCount = allNotesData.filter(n => !n.isCompleted).length;

  // 更新「全部」Tab 的计数
  const allTab = tabBar.querySelector('[data-tag-id=""]');
  if (allTab) {
    allTab.querySelector('.tab-count').textContent = allCount;
  }

  // 移除旧的标签按钮（保留「全部」和「管理」）
  const oldTagButtons = tabBar.querySelectorAll('.tab:not(.manage-btn):not([data-tag-id=""])');
  oldTagButtons.forEach(btn => btn.remove());

  // 在「管理」按钮前插入标签按钮
  const manageBtn = document.getElementById('manageTagsBtn');

  // If current filter tag has no pending items, reset to ALL
  if (currentFilterTagId && currentFilterTagId !== FILTER_ALL) {
    const currentTag = allTags.find(t => String(t.id) === String(currentFilterTagId));
    if (!currentTag || (currentTag.pendingCount || 0) === 0) {
      currentFilterTagId = FILTER_ALL;
      // Sync with main process:
      window.electronAPI.setFilterTag(FILTER_ALL);
    }
  }

  allTags.filter(tag => (tag.pendingCount || 0) > 0).forEach(tag => {
    const tagBtn = document.createElement('button');
    tagBtn.className = 'tab';
    if (currentFilterTagId === String(tag.id)) {
      tagBtn.classList.add('active');
    }
    tagBtn.dataset.tagId = tag.id;
    tagBtn.innerHTML = `${getTagEmoji(tag.name)} ${tag.displayName || tag.name} <span class="tab-count">${tag.pendingCount || 0}</span>`;

    tabBar.insertBefore(tagBtn, manageBtn);
  });

  // 更新「全部」Tab 的 active 状态
  const allTabBtn = tabBar.querySelector('[data-tag-id=""]');
  if (!currentFilterTagId || currentFilterTagId === FILTER_ALL) {
    allTabBtn.classList.add('active');
  } else {
    allTabBtn.classList.remove('active');
  }

  // 更新管理按钮状态
  if (tagManagerModal?.classList.contains('active')) {
    manageBtn.classList.add('active');
  } else {
    manageBtn.classList.remove('active');
  }
}

/**
 * 切换标签筛选
 */
async function switchTagFilter(tagId) {
  // 同步筛选状态到主进程
  try {
    await window.electronAPI.setFilterTag(tagId);
  } catch (error) {
    console.error('Failed to sync filter state:', error);
    // Continue anyway - local state will still work
  }

  currentFilterTagId = tagId;

  // 更新 active 状态
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.tagId === String(tagId)) {
      tab.classList.add('active');
    }
  });

  // 加载对应标签的便签
  await loadNotes();
}

function createNoteCard(note) {
  const isCompleted = note.isCompleted ? 'completed' : '';
  const isOverdue = isOverdueNote(note) ? 'overdue' : '';
  const colorClass = note.color ? `color-${note.color}` : '';
  const overdueWarning = isOverdueNote(note) && !note.isCompleted ? ' ⚠️' : '';
  const pinButtonLabel = note.isPinned ? '📍 已钉选' : '📌 钉选';
  const completeButtonLabel = note.isCompleted ? '↩️ 撤销' : '✓ 完成';

  // 构建标签胶囊 HTML - 显示便签内容而非标签名
  let tagPillHtml = '';
  if (note.color && note.color !== 'gray') {
    const tag = allTags.find(t => t.name === note.color);
    if (tag) {
      const tagEmoji = getTagEmoji(note.color);
      // 改为显示便签内容（使用 escapeHtml 防止 XSS）
      tagPillHtml = `<span class="tag-pill">${tagEmoji} ${escapeHtml(note.content)}</span>`;
    } else {
      // 未找到对应的标签（可能是初始化时 allTags 还未加载）
      // 暂时不显示标签胶囊，等待 allTags 加载完成后重新渲染
      tagPillHtml = '';
    }
  }

  // 当有标签胶囊时，不显示原来的 note-content（避免重复）
  const noteContentHtml = tagPillHtml ? '' : `
      <div class="note-header">
        <div class="note-content">${escapeHtml(note.content)}</div>
      </div>`;

  return `
    <div class="note-card ${colorClass} ${isCompleted} ${isOverdue}" data-id="${note.id}">
      ${tagPillHtml}
${noteContentHtml}
      <div class="note-meta">
        ${note.dueDate ? `
          <span class="note-due-date ${isOverdue ? 'overdue' : ''}">
            📅 ${formatDate(note.dueDate)}${overdueWarning}
          </span>
        ` : ''}
        <div class="note-actions">
          <button class="btn btn-secondary btn-small btn-toggle-complete" data-action="toggleComplete">
            ${completeButtonLabel}
          </button>
          <button class="btn btn-secondary btn-small btn-toggle-pin" data-action="togglePin">
            ${pinButtonLabel}
          </button>
          <button class="btn btn-secondary btn-small btn-edit" data-action="edit">
            编辑
          </button>
          <button class="btn btn-danger btn-small btn-delete" data-action="delete">
            删除
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * 动态加载标签到颜色选择下拉框
 */
async function populateTagSelect() {
  const select = document.getElementById('noteColor');
  // 保存当前选中的值
  const currentValue = select.value;

  // 清空现有选项，保留"无"选项
  select.innerHTML = '<option value="">无</option>';

  // 从数据库加载所有标签
  const tags = await window.electronAPI.db.tags.getAll();

  // 按排序添加选项
  const sortedTags = tags.sort((a, b) => (a.sortOrder || 999) - (b.sortOrder || 999));

  sortedTags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag.name; // 使用颜色名称作为值（后端期望的是颜色名称）
    option.textContent = `${getTagEmoji(tag.name)} ${tag.displayName || tag.name}`;
    select.appendChild(option);
  });

  // 恢复之前选中的值
  select.value = currentValue;
}

// 打开添加模态框
async function openAddModal() {
  editingId = null;
  modalTitle.textContent = '添加便签';
  noteForm.reset();
  modal.classList.add('active');
  // 动态加载标签列表
  await populateTagSelect();
}

/**
 * 格式化本地日期时间为 datetime-local 输入格式
 * @param {Date|string} date - 日期对象或字符串
 * @returns {string} 格式化后的本地日期时间 (YYYY-MM-DDTHH:mm)
 */
function formatLocalDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const offset = d.getTimezoneOffset() * 60000;
  const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
  return localISOTime;
}

// 编辑便签
async function editNote(id) {
  const note = await window.electronAPI.db.getById(id);
  if (!note) return;

  const normalizedNote = normalizeNoteFields(note);

  editingId = id;
  modalTitle.textContent = '编辑便签';
  noteId.value = id;
  noteContent.value = normalizedNote.content;
  // 处理日期格式 - 使用本地时区
  noteDueDate.value = normalizedNote.dueDate ? formatLocalDateTime(normalizedNote.dueDate) : '';

  // 先动态加载标签列表，再设置选中值
  await populateTagSelect();

  // 设置选中的标签（使用颜色名称 color）
  noteColor.value = normalizedNote.color || '';

  modal.classList.add('active');
}

// 关闭模态框
function closeModal() {
  modal.classList.remove('active');
  noteForm.reset();
  editingId = null;
}

// 处理表单提交
async function handleFormSubmit(e) {
  e.preventDefault();

  const data = {
    content: noteContent.value.trim(),
    dueDate: noteDueDate.value || null,
    color: noteColor.value || null
  };

  if (editingId) {
    await window.electronAPI.db.update(editingId, data);
  } else {
    await window.electronAPI.db.add(data);
  }

  closeModal();
  // 不需要手动加载数据，IPC 事件会自动触发更新
  updateReopenPinButton();
}

// 确认删除
function confirmDeleteNote(id) {
  deleteTargetId = id;
  confirmModal.classList.add('active');
}

// 处理删除
async function handleDelete() {
  if (deleteTargetId) {
    await window.electronAPI.db.delete(deleteTargetId);
    deleteTargetId = null;
    confirmModal.classList.remove('active');
    // 不需要手动加载数据，IPC 事件会自动触发更新
    updateReopenPinButton();
  }
}

// 切换完成状态（乐观更新）
async function toggleComplete(id) {
  // 乐观更新：立即更新 UI
  const note = allNotes.find(n => n.id === id);
  if (note) {
    const originalState = note.isCompleted;
    note.isCompleted = !note.isCompleted;
    renderNotes();
    updateReopenPinButton();

    try {
      await window.electronAPI.db.toggleComplete(id);
    } catch (error) {
      // 失败时回滚
      note.isCompleted = originalState;
      renderNotes();
      updateReopenPinButton();
      showError('操作失败，请重试');
    }
  } else {
    // 如果本地没有找到，直接调用 API
    await window.electronAPI.db.toggleComplete(id);
    updateReopenPinButton();
  }
}

// 切换置顶状态（乐观更新）
async function togglePin(id) {
  // 乐观更新：立即更新 UI
  const note = allNotes.find(n => n.id === id);
  if (note) {
    const originalState = note.isPinned;
    note.isPinned = !note.isPinned;
    renderNotes();
    updateReopenPinButton();

    try {
      await window.electronAPI.db.togglePin(id);
    } catch (error) {
      // 失败时回滚
      note.isPinned = originalState;
      renderNotes();
      updateReopenPinButton();
      showError('操作失败，请重试');
    }
  } else {
    // 如果本地没有找到，直接调用 API
    await window.electronAPI.db.togglePin(id);
    updateReopenPinButton();
  }
}

// 更新重新打开置顶窗口按钮
function updateReopenPinButton() {
  // 使用已加载的 allNotes 数据，避免额外查询
  // 使用 allNotesData 而不是 allNotes，确保获取所有置顶便签
  const hasPinned = allNotesData.some(n => n.isPinned && !n.isCompleted);
  reopenPinBtn.style.display = hasPinned ? 'inline-block' : 'none';
}

// 重新打开置顶窗口
async function reopenPinWindow() {
  await window.electronAPI.reopenPinWindow();
}

// 监听数据变更（保存清理函数用于潜在的清理）
let cleanupNotesChanged = window.electronAPI.onNotesChanged((_event, notes) => {
  try {
    if (Array.isArray(notes)) {
      // 标准化所有便签字段
      const convertedNotes = normalizeNotesArray(notes);

      // 更新 allNotesData（全部数据）
      allNotesData = convertedNotes;

      // 根据 currentFilterTagId 过滤笔记（使用数值比较确保类型一致）
      if (!currentFilterTagId || currentFilterTagId === FILTER_ALL) {
        allNotes = convertedNotes;
      } else {
        const filterId = parseInt(currentFilterTagId, 10);
        allNotes = convertedNotes.filter(note => note.colorId === filterId);
      }

      renderNotes();
    }
    // 更新标签栏计数
    loadTagsAndUpdateUI();
  } catch (error) {
    console.error('Error in notes-changed handler:', error);
  }
});

// 监听标签变更
let cleanupTagsChanged = window.electronAPI.onTagsChanged((_event, tags) => {
  try {
    allTags = tags;
    renderTabBar();
  } catch (error) {
    console.error('Error in tags-changed handler:', error);
  }
});

// 监听筛选状态变更（新增）
let cleanupFilterChanged = window.electronAPI.onFilterChanged((_event, { tagId }) => {
  try {
    currentFilterTagId = tagId;
    loadNotes();
  } catch (error) {
    console.error('Error in filter-changed handler:', error);
  }
});

// 内存清理：页面卸载时移除 IPC 监听器
window.addEventListener('beforeunload', () => {
  if (cleanupNotesChanged) cleanupNotesChanged();
  if (cleanupTagsChanged) cleanupTagsChanged();
  if (cleanupFilterChanged) cleanupFilterChanged();
});

// 显示错误消息
function showError(message) {
  // 创建简单的错误提示
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 初始化执行
init();

// 事件监听
addNoteBtn.addEventListener('click', openAddModal);
cancelBtn.addEventListener('click', closeModal);
noteForm.addEventListener('submit', handleFormSubmit);
confirmDeleteBtn.addEventListener('click', handleDelete);
confirmCancelBtn.addEventListener('click', () => confirmModal.classList.remove('active'));
reopenPinBtn.addEventListener('click', reopenPinWindow);

// 标签栏点击事件
document.getElementById('tabBar').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;

  // 处理管理按钮点击
  if (tab.classList.contains('manage-btn')) {
    openTagManager();
    return;
  }

  const tagId = tab.dataset.tagId;
  switchTagFilter(tagId);
});

// 标签管理相关事件
closeTagManagerBtn.addEventListener('click', closeTagManager);
addTagBtn.addEventListener('click', openAddTagForm);
tagFormCancelBtn.addEventListener('click', closeTagForm);
tagForm.addEventListener('submit', handleTagFormSubmit);

// 颜色选择
colorOptions.forEach(option => {
  option.addEventListener('click', () => {
    colorOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    tagColor.value = option.dataset.color;
  });
});

// 标签列表事件委托
tagListBody.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  const row = button.closest('tr');
  const tagIdValue = row?.dataset.tagId;
  if (!tagIdValue) return;

  const action = button.dataset.action;

  switch (action) {
    case 'edit-tag':
      openEditTagForm(tagIdValue);
      break;
    case 'delete-tag':
      if (button.disabled) return;
      if (confirm('确定要删除这个标签吗？')) {
        deleteTag(tagIdValue);
      }
      break;
  }
});

// ESC 键关闭模态框
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (tagManagerModal.classList.contains('active')) {
      closeTagManager();
    }
    if (tagFormModal.classList.contains('active')) {
      closeTagForm();
    }
  }
});

// 点击模态框外部关闭
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      if (modal === tagManagerModal) {
        closeTagManager();
      }
      if (modal === tagFormModal) {
        closeTagForm();
      }
    }
  });
});

// 事件委托：处理便签卡片按钮点击
noteList.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  const noteCard = button.closest('.note-card');
  const noteId = noteCard?.dataset.id;
  if (!noteId) return;

  const action = button.dataset.action;

  switch (action) {
    case 'toggleComplete':
      toggleComplete(noteId);
      break;
    case 'togglePin':
      togglePin(noteId);
      break;
    case 'edit':
      editNote(noteId);
      break;
    case 'delete':
      confirmDeleteNote(noteId);
      break;
  }
});
