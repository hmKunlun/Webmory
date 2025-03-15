// DOM元素引用
const saveSessionBtn = document.getElementById('saveSessionBtn');
const sessionForm = document.getElementById('sessionForm');
const sessionNameInput = document.getElementById('sessionNameInput');
const cancelSaveBtn = document.getElementById('cancelSaveBtn');
const confirmSaveBtn = document.getElementById('confirmSaveBtn');
const sessionsList = document.getElementById('sessionsList');
const noSessions = document.getElementById('noSessions');
const searchInput = document.getElementById('searchInput');
const sessionDetail = document.getElementById('sessionDetail');
const backBtn = document.getElementById('backBtn');
const detailSessionName = document.getElementById('detailSessionName');
const detailSessionDate = document.getElementById('detailSessionDate');
const restoreAllBtn = document.getElementById('restoreAllBtn');
const restoreSelectedBtn = document.getElementById('restoreSelectedBtn');
const selectionCount = document.getElementById('selectionCount');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const tabsList = document.getElementById('tabsList');

// 状态变量
let sessions = [];
let currentSessionId = null;
let selectedTabs = new Set();

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadSessions();
  setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
  // 保存会话按钮
  saveSessionBtn.addEventListener('click', () => {
    sessionForm.classList.add('active');
    sessionNameInput.focus();
  });
  
  // 取消保存按钮
  cancelSaveBtn.addEventListener('click', () => {
    sessionForm.classList.remove('active');
    sessionNameInput.value = '';
  });
  
  // 确认保存按钮
  confirmSaveBtn.addEventListener('click', saveSession);
  
  // 搜索输入框
  searchInput.addEventListener('input', filterSessions);
  
  // 返回按钮
  backBtn.addEventListener('click', () => {
    sessionDetail.classList.remove('active');
    currentSessionId = null;
    selectedTabs.clear();
    updateSelectionCount();
  });
  
  // 恢复所有标签按钮
  restoreAllBtn.addEventListener('click', () => {
    if (currentSessionId) {
      restoreFullSession(currentSessionId);
    }
  });
  
  // 恢复选中标签按钮
  restoreSelectedBtn.addEventListener('click', () => {
    if (currentSessionId && selectedTabs.size > 0) {
      restoreSelectedTabs(currentSessionId, Array.from(selectedTabs));
    }
  });
  
  // 全选按钮
  selectAllBtn.addEventListener('click', () => {
    const checkboxes = tabsList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
      selectedTabs.add(parseInt(checkbox.dataset.index));
    });
    updateSelectionCount();
  });
  
  // 取消全选按钮
  deselectAllBtn.addEventListener('click', () => {
    const checkboxes = tabsList.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    selectedTabs.clear();
    updateSelectionCount();
  });
}

// 加载会话列表
function loadSessions() {
  chrome.storage.local.get(['sessions'], (result) => {
    sessions = result.sessions || [];
    renderSessionsList();
  });
}

// 渲染会话列表
function renderSessionsList(filteredSessions = null) {
  const sessionsToRender = filteredSessions || sessions;
  
  if (sessionsToRender.length === 0) {
    noSessions.style.display = 'flex';
    sessionsList.style.display = 'none';
    return;
  }
  
  noSessions.style.display = 'none';
  sessionsList.style.display = 'block';
  sessionsList.innerHTML = '';
  
  sessionsToRender.forEach(session => {
    const sessionCard = document.createElement('div');
    sessionCard.className = 'session-card';
    sessionCard.dataset.id = session.id;
    
    // 格式化日期
    const sessionDate = new Date(session.date);
    const formattedDate = sessionDate.toLocaleString();
    
    sessionCard.innerHTML = `
      <div class="session-header">
        <div class="session-name">${session.name}</div>
        <span class="date">${formattedDate}</span>
      </div>
      <div class="session-stats">
        <span class="material-icons">tab</span>
        <span>${session.tabs.length} 个标签页</span>
      </div>
      <div class="actions">
        <button class="btn text-btn restore-btn">恢复</button>
        <button class="btn text-btn delete-btn">删除</button>
      </div>
    `;
    
    // 查看会话详情
    sessionCard.addEventListener('click', (e) => {
      // 忽略按钮点击
      if (!e.target.classList.contains('restore-btn') && !e.target.classList.contains('delete-btn')) {
        showSessionDetail(session.id);
      }
    });
    
    // 恢复会话按钮
    const restoreBtn = sessionCard.querySelector('.restore-btn');
    restoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      restoreFullSession(session.id);
    });
    
    // 删除会话按钮
    const deleteBtn = sessionCard.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSession(session.id);
    });
    
    sessionsList.appendChild(sessionCard);
  });
}

// 保存当前会话
function saveSession() {
  const sessionName = sessionNameInput.value.trim() || `会话 ${new Date().toLocaleString()}`;
  
  chrome.runtime.sendMessage(
    { action: 'saveSession', sessionName },
    (response) => {
      if (response.success) {
        sessionForm.classList.remove('active');
        sessionNameInput.value = '';
        loadSessions(); // 重新加载会话列表
      } else {
        alert('保存会话失败: ' + response.error);
      }
    }
  );
}

// 恢复完整会话
function restoreFullSession(sessionId) {
  chrome.runtime.sendMessage(
    { action: 'restoreSession', sessionId },
    (response) => {
      if (!response.success) {
        alert('恢复会话失败: ' + response.error);
      }
    }
  );
}

// 恢复选中的标签页
function restoreSelectedTabs(sessionId, tabIndices) {
  chrome.runtime.sendMessage(
    { action: 'restorePartialSession', sessionId, tabIndices },
    (response) => {
      if (!response.success) {
        alert('恢复标签页失败: ' + response.error);
      }
    }
  );
}

// 删除会话
function deleteSession(sessionId) {
  if (confirm('确定要删除这个会话吗？此操作无法撤销。')) {
    chrome.runtime.sendMessage(
      { action: 'deleteSession', sessionId },
      (response) => {
        if (response.success) {
          loadSessions(); // 重新加载会话列表
          
          // 如果正在查看该会话的详情，则返回会话列表
          if (currentSessionId === sessionId) {
            sessionDetail.classList.remove('active');
            currentSessionId = null;
          }
        } else {
          alert('删除会话失败: ' + response.error);
        }
      }
    );
  }
}

// 显示会话详情
function showSessionDetail(sessionId) {
  const session = sessions.find(s => s.id === sessionId);
  
  if (!session) return;
  
  currentSessionId = sessionId;
  selectedTabs.clear();
  
  // 设置会话详情标题和日期
  detailSessionName.textContent = session.name;
  const sessionDate = new Date(session.date);
  detailSessionDate.textContent = sessionDate.toLocaleString();
  
  // 渲染标签页列表
  renderTabsList(session.tabs);
  
  // 显示详情面板
  sessionDetail.classList.add('active');
}

// 渲染标签页列表
function renderTabsList(tabs) {
  tabsList.innerHTML = '';
  
  tabs.forEach((tab, index) => {
    const tabItem = document.createElement('div');
    tabItem.className = 'tab-item';
    
    const favicon = tab.favIconUrl || 'icons/icon16.png';
    
    tabItem.innerHTML = `
      <input type="checkbox" class="tab-checkbox" data-index="${index}">
      <div class="tab-favicon">
        <img src="${favicon}" alt="favicon" onerror="this.src='icons/icon16.png'">
      </div>
      <div class="tab-info">
        <div class="tab-title">${tab.title}</div>
        <div class="tab-url">${tab.url}</div>
      </div>
    `;
    
    const checkbox = tabItem.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedTabs.add(index);
      } else {
        selectedTabs.delete(index);
      }
      updateSelectionCount();
    });
    
    tabsList.appendChild(tabItem);
  });
  
  updateSelectionCount();
}

// 更新选中标签页计数
function updateSelectionCount() {
  selectionCount.textContent = `${selectedTabs.size}已选`;
  
  if (selectedTabs.size > 0) {
    restoreSelectedBtn.disabled = false;
  } else {
    restoreSelectedBtn.disabled = true;
  }
}

// 过滤会话列表
function filterSessions() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  
  if (!searchTerm) {
    renderSessionsList();
    return;
  }
  
  const filtered = sessions.filter(session => {
    const nameMatch = session.name.toLowerCase().includes(searchTerm);
    const tabMatch = session.tabs.some(tab => 
      tab.title.toLowerCase().includes(searchTerm) || 
      tab.url.toLowerCase().includes(searchTerm)
    );
    
    return nameMatch || tabMatch;
  });
  
  renderSessionsList(filtered);
} 