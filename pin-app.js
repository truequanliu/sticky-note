// pin-app.js - 置顶窗口逻辑

const pinNoteList = document.getElementById('pinNoteList');
const closePinBtn = document.getElementById('closePinBtn');

let pinnedNotes = [];
const FILTER_ALL = ''; // 无筛选标记
let currentFilterTagId = FILTER_ALL; // 当前筛选标签 ID

// 初始化
closePinBtn.addEventListener('click', closePinWindow);

// 监听数据更新（保存清理函数）
let cleanupNotesChanged = window.electronAPI.onNotesChanged((_event, notes) => {
  try {
    // 改为调用 loadPinnedNotes 以正确处理筛选状态
    loadPinnedNotes();
  } catch (error) {
    console.error('Error in notes-changed handler:', error);
  }
});

// 监听筛选状态变更
let cleanupFilterChanged = window.electronAPI.onFilterChanged((_event, { tagId }) => {
  try {
    currentFilterTagId = tagId;
    loadPinnedNotes();
  } catch (error) {
    console.error('Error in filter-changed handler:', error);
  }
});

// 内存清理：页面卸载时移除 IPC 监听器
window.addEventListener('beforeunload', () => {
  if (cleanupNotesChanged) {
    cleanupNotesChanged();
  }
  if (cleanupFilterChanged) {
    cleanupFilterChanged();
  }
});

// 加载置顶便签
async function loadPinnedNotes() {
  if (!currentFilterTagId || currentFilterTagId === FILTER_ALL) {
    pinnedNotes = normalizeNotesArray(await window.electronAPI.db.getPinnedUncompleted());
  } else {
    pinnedNotes = normalizeNotesArray(await window.electronAPI.db.getPinnedByTag(currentFilterTagId));
  }

  renderPinnedNotes();
}

// 渲染置顶便签列表
function renderPinnedNotes() {
  if (pinnedNotes.length === 0) {
    pinNoteList.innerHTML = `
      <div class="empty-state">
        <p>🎉</p>
        <p>全部完成！</p>
      </div>
    `;
    return;
  }

  pinNoteList.innerHTML = pinnedNotes.map(note => createPinNoteCard(note)).join('');
}

function createPinNoteCard(note) {
  const isOverdue = isOverdueNote(note);
  const overdueWarning = isOverdue ? ' ⚠️' : '';
  const colorClass = note.color ? `color-${note.color}` : '';

  return `
    <div class="pin-note-card ${colorClass}" data-id="${note.id}">
      <div class="pin-note-content">${escapeHtml(note.content)}</div>
      <div class="pin-note-meta">
        ${note.dueDate ? `
          <span class="pin-note-due ${isOverdue ? 'overdue' : ''}">
            📅 ${formatDate(note.dueDate)}${overdueWarning}
          </span>
        ` : '<span></span>'}
        <div class="pin-note-actions">
          <button class="pin-btn pin-btn-complete" data-action="complete">
            ✓ 完成
          </button>
          <button class="pin-btn pin-btn-unpin" data-action="unpin">
            📌 取消
          </button>
        </div>
      </div>
    </div>
  `;
}

// 完成便签
async function completeNote(id) {
  await window.electronAPI.db.toggleComplete(id);
  // 不需要手动加载数据，IPC 事件会自动触发更新
}

// 取消置顶
async function unpinNote(id) {
  await window.electronAPI.db.togglePin(id);
  // 不需要手动加载数据，IPC 事件会自动触发更新
}

// 关闭置顶窗口
async function closePinWindow() {
  await window.electronAPI.closePinWindow();
}

// 事件委托：处理置顶便签卡片按钮点击
pinNoteList.addEventListener('click', (e) => {
  const button = e.target.closest('button');
  if (!button) return;

  const noteCard = button.closest('.pin-note-card');
  const noteId = noteCard?.dataset.id;
  if (!noteId) return;

  const action = button.dataset.action;

  switch (action) {
    case 'complete':
      completeNote(noteId);
      break;
    case 'unpin':
      unpinNote(noteId);
      break;
  }
});
