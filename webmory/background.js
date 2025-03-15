// 当扩展安装或更新时初始化存储
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['sessions'], (result) => {
    if (!result.sessions) {
      chrome.storage.local.set({ sessions: [] });
    }
  });
});

// 保存当前所有打开的标签页
async function saveCurrentSession(sessionName) {
  try {
    // 获取当前窗口的所有标签页
    const tabs = await chrome.tabs.query({});
    
    // 提取需要的标签页信息
    const tabsData = tabs.map(tab => ({
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl
    }));
    
    // 创建新的会话对象
    const newSession = {
      id: Date.now().toString(),
      name: sessionName || new Date().toLocaleString(),
      date: new Date().toISOString(),
      tabs: tabsData
    };
    
    // 获取现有会话并添加新会话
    const { sessions } = await chrome.storage.local.get(['sessions']);
    const updatedSessions = [newSession, ...sessions];
    
    // 更新存储
    await chrome.storage.local.set({ sessions: updatedSessions });
    
    return newSession;
  } catch (error) {
    console.error('保存会话失败:', error);
    throw error;
  }
}

// 恢复指定会话的所有标签页
async function restoreSession(sessionId) {
  try {
    // 获取所有会话
    const { sessions } = await chrome.storage.local.get(['sessions']);
    
    // 查找指定会话
    const sessionToRestore = sessions.find(session => session.id === sessionId);
    
    if (!sessionToRestore) {
      throw new Error('未找到指定会话');
    }
    
    // 创建新窗口并打开所有标签页
    const window = await chrome.windows.create({ url: sessionToRestore.tabs[0].url });
    
    // 从第二个标签页开始创建其余标签页
    for (let i = 1; i < sessionToRestore.tabs.length; i++) {
      await chrome.tabs.create({
        windowId: window.id,
        url: sessionToRestore.tabs[i].url
      });
    }
    
    return true;
  } catch (error) {
    console.error('恢复会话失败:', error);
    throw error;
  }
}

// 恢复部分标签页
async function restorePartialSession(sessionId, tabIndices) {
  try {
    // 获取所有会话
    const { sessions } = await chrome.storage.local.get(['sessions']);
    
    // 查找指定会话
    const sessionToRestore = sessions.find(session => session.id === sessionId);
    
    if (!sessionToRestore) {
      throw new Error('未找到指定会话');
    }
    
    // 获取选中标签页的URL
    const tabsToRestore = tabIndices.map(index => sessionToRestore.tabs[index]);
    
    // 创建新窗口并打开第一个标签页
    const window = await chrome.windows.create({ url: tabsToRestore[0].url });
    
    // 从第二个标签页开始创建其余标签页
    for (let i = 1; i < tabsToRestore.length; i++) {
      await chrome.tabs.create({
        windowId: window.id,
        url: tabsToRestore[i].url
      });
    }
    
    return true;
  } catch (error) {
    console.error('恢复部分会话失败:', error);
    throw error;
  }
}

// 删除会话
async function deleteSession(sessionId) {
  try {
    // 获取所有会话
    const { sessions } = await chrome.storage.local.get(['sessions']);
    
    // 过滤掉要删除的会话
    const updatedSessions = sessions.filter(session => session.id !== sessionId);
    
    // 更新存储
    await chrome.storage.local.set({ sessions: updatedSessions });
    
    return true;
  } catch (error) {
    console.error('删除会话失败:', error);
    throw error;
  }
}

// 监听来自弹出窗口的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理各种操作请求
  if (request.action === 'saveSession') {
    saveCurrentSession(request.sessionName)
      .then(session => sendResponse({ success: true, session }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 表示异步发送响应
  }
  
  if (request.action === 'restoreSession') {
    restoreSession(request.sessionId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'restorePartialSession') {
    restorePartialSession(request.sessionId, request.tabIndices)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'deleteSession') {
    deleteSession(request.sessionId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
}); 