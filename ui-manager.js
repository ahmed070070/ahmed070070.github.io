// ===== إدارة واجهة المستخدم =====

// متغيرات الواجهة فقط
let uiCurrentTab = 'chats';

// ===== إدارة الشاشات =====
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

function showLoginScreen() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    hideLoader();
}

function showAppScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    hideLoader();
}

// ===== إدارة التبويبات =====
function switchTab(tabName) {
    uiCurrentTab = tabName;
    
    // تحديث الأزرار النشطة
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // تحديث زر FAB بناءً على التبويب
    updateFABButton(tabName);
    
    // مسح حقل البحث
    document.getElementById('search-input').value = '';
    
    return tabName;
}

function updateFABButton(tabName) {
    const fab = document.getElementById('create-fab');
    if (!fab) return;
    
    if (tabName === 'chats') {
        fab.innerHTML = '<i class="fas fa-comment-medical"></i>';
        fab.title = 'بدء محادثة جديدة';
    } else if (tabName === 'groups') {
        fab.innerHTML = '<i class="fas fa-plus"></i>';
        fab.title = 'إنشاء مجموعة جديدة';
    } else if (tabName === 'contacts') {
        fab.innerHTML = '<i class="fas fa-user-plus"></i>';
        fab.title = 'إضافة جهة اتصال';
    }
}

// ===== إدارة بيانات المستخدم =====
function updateUserUI(user) {
    if (!user) return;
    
    // تحديث الاسم وصورة الملف الشخصي
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar');
    
    if (userNameElement) {
        userNameElement.textContent = user.displayName || user.name || 'مستخدم';
    }
    
    if (userAvatarElement) {
        userAvatarElement.src = user.photoURL || user.photo || '';
        userAvatarElement.alt = `صورة ${user.displayName}`;
    }
    
    // إضافة زر تسجيل الخروج إذا لم يكن موجودًا
    addLogoutButton();
}

function addLogoutButton() {
    const userInfoContainer = document.querySelector('.user-info');
    if (!userInfoContainer || userInfoContainer.querySelector('.logout-btn')) {
        return;
    }
    
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
    logoutBtn.title = 'تسجيل الخروج';
    logoutBtn.addEventListener('click', handleLogout);
    
    userInfoContainer.appendChild(logoutBtn);
}

async function handleLogout() {
    try {
        if (typeof signOutUser === 'function') {
            await signOutUser();
        }
        showNotification('تم تسجيل الخروج بنجاح', 'success');
        showLoginScreen();
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        showNotification('فشل تسجيل الخروج', 'error');
    }
}

// ===== إدارة قائمة المحادثات =====
function showLoadingState(message = 'جاري التحميل...') {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    chatsList.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i>
            <p>${message}</p>
        </div>
    `;
}

function showEmptyState(icon = '💬', message = 'لا توجد بيانات', subtitle = '', button = '') {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    chatsList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <p>${message}</p>
            ${subtitle ? `<p class="empty-subtitle">${subtitle}</p>` : ''}
            ${button ? button : ''}
        </div>
    `;
}

function showErrorState(message = 'حدث خطأ', retryFunction = null) {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    const retryButton = retryFunction ? 
        `<button class="retry-btn" onclick="${retryFunction}()">
            <i class="fas fa-redo"></i> إعادة المحاولة
        </button>` : '';
    
    chatsList.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">❌</div>
            <p>${message}</p>
            ${retryButton}
        </div>
    `;
}

// ===== عرض قائمة المحادثات =====
function displayChatsList(chats) {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    if (!chats || chats.length === 0) {
        showEmptyState('💬', 'لا توجد محادثات بعد', 'ابدأ محادثة جديدة من تبويب جهات الاتصال');
        return;
    }
    
    let html = '';
    chats.forEach(chat => {
        const time = formatTime(chat.lastMessageTime || chat.createdAt);
        const unreadBadge = chat.unreadCount > 0 ? 
            `<div class="chat-unread">${chat.unreadCount}</div>` : '';
        
        html += `
            <div class="chat-item" data-chat-id="${chat.id}" data-chat-type="${chat.type || 'direct'}">
                <div class="chat-avatar ${chat.type === 'group' ? 'group-avatar' : 'user-avatar'}">
                    ${chat.type === 'group' ? '👥' : '👤'}
                </div>
                <div class="chat-info">
                    <div class="chat-header">
                        <div class="chat-name">${chat.name || 'محادثة'}</div>
                        <div class="chat-time">${time}</div>
                    </div>
                    <div class="chat-last-msg">${chat.lastMessage || 'بداية المحادثة'}</div>
                </div>
                ${unreadBadge}
            </div>
        `;
    });
    
    chatsList.innerHTML = html;
    
    // إضافة مستمعات الأحداث للمحادثات
    setupChatItemsListeners();
}

// ===== عرض قائمة المجموعات =====
function displayGroupsList(groups) {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    if (!groups || groups.length === 0) {
        const createButton = `<button class="retry-btn" onclick="showGroupModal()">
            <i class="fas fa-plus"></i> أنشئ أول مجموعة
        </button>`;
        
        showEmptyState('👥', 'لا توجد مجموعات بعد', 'كن أول من ينشئ مجموعة!', createButton);
        return;
    }
    
    let html = '';
    groups.forEach(group => {
        html += `
            <div class="chat-item" data-chat-id="${group.id}" data-chat-type="group">
                <div class="chat-avatar group-avatar">
                    👥
                </div>
                <div class="chat-info">
                    <div class="chat-name"># ${group.name}</div>
                    <div class="chat-last-msg">${group.description || 'مجموعة جديدة'} • ${group.memberCount || 1} أعضاء</div>
                </div>
            </div>
        `;
    });
    
    chatsList.innerHTML = html;
    
    // إضافة مستمعات الأحداث للمجموعات
    setupChatItemsListeners();
}

// ===== عرض قائمة جهات الاتصال =====
function displayContactsList(users, currentUserId) {
    const chatsList = document.getElementById('chats-list');
    if (!chatsList) return;
    
    if (!users || users.length === 0) {
        showEmptyState('👤', 'لا توجد جهات اتصال بعد', 'سيظهر المستخدمون الآخرون هنا عند تسجيل دخولهم');
        return;
    }
    
    let html = '';
    users.forEach(user => {
        if (user.id === currentUserId) return;
        
        const status = user.online ? 
            '<span class="online-status">🟢 متصل</span>' : 
            `<span class="offline-status">آخر ظهور: ${formatTime(user.lastSeen)}</span>`;
        
        const avatarContent = user.photo ? 
            `<img src="${user.photo}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%;">` : 
            '👤';
        
        html += `
            <div class="chat-item" data-user-id="${user.id}">
                <div class="chat-avatar user-avatar">
                    ${avatarContent}
                </div>
                <div class="chat-info">
                    <div class="chat-name">${user.name}</div>
                    <div class="chat-last-msg">${status}</div>
                </div>
            </div>
        `;
    });
    
    chatsList.innerHTML = html;
    
    // إضافة مستمعات الأحداث لجهات الاتصال
    setupContactItemsListeners();
}

// ===== إعداد مستمعات الأحداث =====
function setupChatItemsListeners() {
    document.querySelectorAll('.chat-item[data-chat-id]').forEach(item => {
        item.addEventListener('click', function() {
            const chatId = this.dataset.chatId;
            const chatType = this.dataset.chatType;
            if (typeof openChat === 'function') {
                openChat(chatId, chatType);
            }
        });
    });
}

function setupContactItemsListeners() {
    document.querySelectorAll('.chat-item[data-user-id]').forEach(item => {
        item.addEventListener('click', function() {
            const userId = this.dataset.userId;
            if (typeof startChatWithUser === 'function') {
                startChatWithUser(userId);
            }
        });
    });
}

// ===== إدارة البحث =====
let searchTimer = null;

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimer);
        const query = e.target.value.toLowerCase().trim();
        
        searchTimer = setTimeout(() => {
            filterChatItems(query);
        }, 300);
    });
}

function filterChatItems(query) {
    const items = document.querySelectorAll('.chat-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (query === '' || text.includes(query)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ===== إدارة المودالات =====
function showGroupModal() {
    const modal = document.getElementById('group-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('group-name').focus();
    }
}

function hideGroupModal() {
    const modal = document.getElementById('group-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('group-name').value = '';
        document.getElementById('group-desc').value = '';
    }
}

function setupModalEvents() {
    // إغلاق المودال عند النقر خارج المحتوى
    const modal = document.getElementById('group-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideGroupModal();
            }
        });
    }
    
    // زر الإلغاء
    const cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideGroupModal);
    }
}

// ===== وظائف مساعدة =====
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `${minutes} د`;
    if (hours < 24) return `${hours} س`;
    if (days < 7) return `${days} ي`;
    
    return date.toLocaleDateString('ar-SA');
}

// ===== تصدير الوظائف =====
window.showLoader = showLoader;
window.hideLoader = hideLoader;
window.showLoginScreen = showLoginScreen;
window.showAppScreen = showAppScreen;
window.switchTab = switchTab;
window.updateUserUI = updateUserUI;
window.showLoadingState = showLoadingState;
window.showEmptyState = showEmptyState;
window.showErrorState = showErrorState;
window.displayChatsList = displayChatsList;
window.displayGroupsList = displayGroupsList;
window.displayContactsList = displayContactsList;
window.setupSearch = setupSearch;
window.showGroupModal = showGroupModal;
window.hideGroupModal = hideGroupModal;
window.setupModalEvents = setupModalEvents;
window.formatTime = formatTime;
window.uiCurrentTab = uiCurrentTab;