// ===== التهيئة الرئيسية =====
let currentUser = null;
let currentTab = 'chats';
let cachedChats = [];
let db = null;
let auth = null;

// ===== إعدادات Firebase =====
const firebaseConfig = {
    apiKey: "AIzaSyDKxCRD4irEKX7KHLIV6Hli1Z6X-MXwbAs",
    authDomain: "dragon-fb5ba.firebaseapp.com",
    databaseURL: "https://dragon-fb5ba-default-rtdb.firebaseio.com",
    projectId: "dragon-fb5ba",
    storageBucket: "dragon-fb5ba.appspot.com",
    messagingSenderId: "557915458165",
    appId: "1:557915458165:web:2b92d76bc080bf67e4c14f"
};

// ===== التهيئة =====
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. اختبار التخزين أولاً
        testStorageAccess();
        
        // 2. تهيئة Firebase
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.database();
        
        // 3. تعيين الاستمرارية للمصادقة
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            console.log('تم تعيين استمرارية المصادقة على LOCAL');
        } catch (persistenceError) {
            console.warn('تعذر تعيين استمرارية المصادقة:', persistenceError);
        }
        
        // تعيين المتغيرات العامة
        window.db = db;
        window.auth = auth;
        
        // 4. إعداد مستمع المصادقة
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                window.currentUser = user;
                await handleUserLogin(user);
            } else {
                showLogin();
            }
        }, (error) => {
            console.error('خطأ في مستمع المصادقة:', error);
            showNotification('خطأ في جلسة المصادقة', 'error');
            showLogin();
        });
        
        // 5. إعداد الأحداث
        setupEventListeners();
        
        // 6. إخفاء التحميل بعد ثانيتين
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 2000);
        
        // 7. تحقق مما إذا كان هناك خطأ في التخزين
        setTimeout(() => {
            if (document.getElementById('login-screen').style.display !== 'flex' && 
                document.getElementById('app').style.display !== 'flex') {
                showLogin();
            }
        }, 3000);
        
    } catch (error) {
        console.error('خطأ في التهيئة:', error);
        showNotification('خطأ في تهيئة التطبيق', 'error');
        document.getElementById('loader').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

// ===== اختبار صلاحية storage =====
function testStorageAccess() {
    try {
        // اختبار sessionStorage
        sessionStorage.setItem('test', 'test');
        const test = sessionStorage.getItem('test');
        sessionStorage.removeItem('test');
        
        if (test !== 'test') {
            console.warn('sessionStorage غير متاح أو به مشكلة');
        }
        
        // اختبار localStorage
        localStorage.setItem('test', 'test');
        const testLocal = localStorage.getItem('test');
        localStorage.removeItem('test');
        
        if (testLocal !== 'test') {
            console.warn('localStorage غير متاح أو به مشكلة');
        }
        
    } catch (error) {
        console.error('خطأ في اختبار التخزين:', error);
        showNotification('تنبيه: بعض الميزات قد لا تعمل بشكل صحيح', 'warning');
    }
}

// ===== وظائف المساعدة =====
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

// ===== إعداد الأحداث =====
function setupEventListeners() {
    // زر الدخول
    document.getElementById('login-btn').addEventListener('click', signInWithGoogle);

    // التبويبات
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.tab');
            if (clickedTab) {
                switchTab(clickedTab.dataset.tab);
            }
        });
    });

    // البحث
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // زر الإنشاء
    document.getElementById('create-fab').addEventListener('click', showGroupModal);

    // مودال المجموعة
    document.getElementById('modal-cancel').addEventListener('click', hideGroupModal);
    document.getElementById('modal-create').addEventListener('click', createGroup);

    // انقر خارج المودال لإغلاقه
    document.getElementById('group-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('group-modal')) {
            hideGroupModal();
        }
    });
}

// ===== وظائف المصادقة (مُصلحة) =====
async function signInWithGoogle() {
    try {
        const loginBtn = document.getElementById('login-btn');
        const originalHTML = loginBtn.innerHTML;
        
        // إظهار حالة التحميل
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>جاري التسجيل...</span>';
        loginBtn.disabled = true;
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        // استخدم signInWithPopup دائمًا (الأكثر موثوقية)
        const result = await auth.signInWithPopup(provider);
        
        // استعادة حالة الزر
        loginBtn.innerHTML = originalHTML;
        loginBtn.disabled = false;
        
        console.log('تم تسجيل الدخول بنجاح:', result.user.displayName);
        return result.user;
        
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        
        // استعادة حالة الزر
        const loginBtn = document.getElementById('login-btn');
        loginBtn.innerHTML = '<i class="fab fa-google"></i><span>تسجيل الدخول بحساب Google</span>';
        loginBtn.disabled = false;
        
        // عرض رسالة خطأ مفيدة
        let errorMessage = 'فشل تسجيل الدخول';
        
        if (error.code === 'auth/popup-blocked') {
            errorMessage = 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'تم إغلاق نافذة التسجيل. يرجى المحاولة مرة أخرى.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = 'تم إلغاء عملية التسجيل. يرجى المحاولة مرة أخرى.';
        }
        
        showNotification(errorMessage, 'error');
        throw error;
    }
}

async function updateUserProfile(user) {
    try {
        await db.ref('users/' + user.uid).update({
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
            lastSeen: Date.now(),
            online: true,
            provider: 'google',
            registeredAt: Date.now()
        });
        
        return user;
    } catch (error) {
        console.error('خطأ في تحديث بيانات المستخدم:', error);
        throw error;
    }
}

// ===== معالج دخول المستخدم =====
async function handleUserLogin(user) {
    try {
        // تحديث بيانات المستخدم في Firebase
        await updateUserProfile(user);

        // تحديث الواجهة
        document.getElementById('user-name').textContent = user.displayName;
        const avatar = document.getElementById('user-avatar');
        avatar.src = user.photoURL;
        avatar.style.cursor = 'pointer';
        avatar.title = 'انقر لتغيير الصورة';

        // إضافة حدث لتغيير الصورة
        avatar.addEventListener('click', handleProfilePictureUpdate);

        // إضافة زر تسجيل الخروج
        addLogoutButton();

        // إظهار التطبيق
        showApp();

        // تحميل المحادثات
        loadChats();

        // تحديث زر FAB
        updateFABButton(currentTab);
        
        showNotification(`مرحباً ${user.displayName}!`, 'success');

    } catch (error) {
        console.error('خطأ في تحديث بيانات المستخدم:', error);
        showNotification('خطأ في تحميل البيانات', 'error');
    }
}

// ===== تسجيل الخروج =====
async function signOut() {
    try {
        if (currentUser) {
            await db.ref('users/' + currentUser.uid).update({
                online: false,
                lastSeen: Date.now()
            });
        }
        await auth.signOut();
        showNotification('تم تسجيل الخروج بنجاح', 'success');
        showLogin();
    } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
        showNotification('فشل تسجيل الخروج', 'error');
    }
}

// ===== تحديث زر FAB =====
function updateFABButton(tabName) {
    const fab = document.getElementById('create-fab');
    if (!fab) return;
    
    if (tabName === 'groups') {
        fab.innerHTML = '<i class="fas fa-plus"></i>';
        fab.title = 'إنشاء مجموعة';
    } else {
        fab.innerHTML = '<i class="fas fa-plus"></i>';
        fab.title = 'إنشاء جديد';
    }
}

// ===== عرض/إخفاء الواجهات =====
function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
}

function showLogin() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

// ===== التبويبات =====
function switchTab(tabName) {
    currentTab = tabName;
    window.currentTab = tabName;

    // تحديد الأزرار النشطة
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
    });
    
    // العثور على الزر الذي تم النقر عليه
    const clickedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
    if (clickedTab) {
        clickedTab.classList.add('active');
    }

    // عرض المحتوى المناسب
    if (tabName === 'chats') {
        loadChats();
    } else if (tabName === 'groups') {
        loadGroups();
    } else if (tabName === 'contacts') {
        loadContacts();
    }

    // مسح البحث
    document.getElementById('search-input').value = '';
    
    // تحديث زر FAB
    updateFABButton(tabName);
}

// ===== البحث =====
let searchTimer;
function handleSearch(event) {
    clearTimeout(searchTimer);
    const query = event.target.value.toLowerCase();
    
    searchTimer = setTimeout(() => {
        filterItems(query);
    }, 300);
}

function filterItems(query) {
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

// ===== إدارة المجموعات =====
function showGroupModal() {
    document.getElementById('group-modal').style.display = 'flex';
    document.getElementById('group-name').focus();
}

function hideGroupModal() {
    document.getElementById('group-modal').style.display = 'none';
    document.getElementById('group-name').value = '';
    document.getElementById('group-desc').value = '';
}

async function createGroup() {
    const name = document.getElementById('group-name').value.trim();
    const desc = document.getElementById('group-desc').value.trim();

    if (!name) {
        showNotification('يرجى إدخال اسم المجموعة', 'error');
        return;
    }

    try {
        const groupRef = db.ref('groups').push();
        await groupRef.set({
            name: name,
            description: desc,
            creatorId: currentUser.uid,
            creatorName: currentUser.displayName,
            createdAt: Date.now(),
            memberCount: 1,
            members: {
                [currentUser.uid]: true
            }
        });

        hideGroupModal();
        showNotification('تم إنشاء المجموعة بنجاح', 'success');
        
        // تحديث القائمة
        if (currentTab === 'groups') {
            loadGroups();
        }

    } catch (error) {
        console.error('خطأ في إنشاء المجموعة:', error);
        showNotification('فشل إنشاء المجموعة', 'error');
    }
}

// ===== تحميل المحادثات =====
async function loadChats() {
    const chatsList = document.getElementById('chats-list');
    
    try {
        // إظهار حالة التحميل
        chatsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري تحميل المحادثات...</p>
            </div>
        `;

        // جلب المحادثات من التخزين المحلي أولاً
        const cached = localStorage.getItem('dragon_chats');
        cachedChats = cached ? JSON.parse(cached) : [];

        if (cachedChats.length === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <p>لا توجد محادثات بعد</p>
                    <p class="empty-subtitle">ابدأ محادثة جديدة من تبويب جهات الاتصال</p>
                </div>
            `;
            return;
        }

        let html = '';
        cachedChats.forEach(chat => {
            const time = formatTime(chat.lastMessageTime || chat.createdAt);
            
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
                    ${chat.unreadCount > 0 ? `<div class="chat-unread">${chat.unreadCount}</div>` : ''}
                </div>
            `;
        });

        chatsList.innerHTML = html;
        
        // إضافة مستمعات الأحداث ديناميكياً
        chatsList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', function() {
                const chatId = this.dataset.chatId;
                const chatType = this.dataset.chatType;
                openChat(chatId, chatType);
            });
        });

    } catch (error) {
        console.error('خطأ في تحميل المحادثات:', error);
        chatsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <p>خطأ في تحميل المحادثات</p>
                <button class="retry-btn" onclick="loadChats()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// ===== تحميل المجموعات =====
async function loadGroups() {
    const chatsList = document.getElementById('chats-list');
    
    try {
        chatsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري تحميل المجموعات...</p>
            </div>
        `;

        // جلب المجموعات من Firebase
        const snapshot = await db.ref('groups').once('value');
        const groups = [];
        
        snapshot.forEach(child => {
            const group = child.val();
            groups.push({
                id: child.key,
                ...group
            });
        });

        if (groups.length === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <p>لا توجد مجموعات بعد</p>
                    <p class="empty-subtitle">كن أول من ينشئ مجموعة!</p>
                    <button class="retry-btn" onclick="showGroupModal()">أنشئ أول مجموعة</button>
                </div>
            `;
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
        
        // إضافة مستمعات الأحداث ديناميكياً
        chatsList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', function() {
                const chatId = this.dataset.chatId;
                const chatType = this.dataset.chatType;
                openChat(chatId, chatType);
            });
        });

    } catch (error) {
        console.error('خطأ في تحميل المجموعات:', error);
        chatsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <p>خطأ في تحميل المجموعات</p>
                <button class="retry-btn" onclick="loadGroups()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// ===== تحميل جهات الاتصال =====
async function loadContacts() {
    const chatsList = document.getElementById('chats-list');
    
    try {
        chatsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري تحميل جهات الاتصال...</p>
            </div>
        `;

        // جلب المستخدمين من Firebase
        const snapshot = await db.ref('users').once('value');
        const users = [];
        
        snapshot.forEach(child => {
            if (child.key !== currentUser?.uid) {
                const user = child.val();
                users.push({
                    id: child.key,
                    ...user
                });
            }
        });

        if (users.length === 0) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👤</div>
                    <p>لا توجد جهات اتصال بعد</p>
                    <p class="empty-subtitle">سيظهر المستخدمون الآخرون هنا عند تسجيل دخولهم</p>
                </div>
            `;
            return;
        }

        let html = '';
        users.forEach(user => {
            const status = user.online ? 
                '<span class="online-status">🟢 متصل</span>' : 
                `<span class="offline-status">آخر ظهور: ${formatTime(user.lastSeen)}</span>`;
            
            html += `
                <div class="chat-item" data-user-id="${user.id}">
                    <div class="chat-avatar user-avatar">
                        ${user.photo ? 
                            `<img src="${user.photo}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%;">` : 
                            '👤'}
                    </div>
                    <div class="chat-info">
                        <div class="chat-name">${user.name}</div>
                        <div class="chat-last-msg">${status}</div>
                    </div>
                </div>
            `;
        });

        chatsList.innerHTML = html;
        
        // إضافة مستمعات الأحداث ديناميكياً
        chatsList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', function() {
                const userId = this.dataset.userId;
                startChatWith(userId);
            });
        });

    } catch (error) {
        console.error('خطأ في تحميل جهات الاتصال:', error);
        chatsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <p>خطأ في تحميل جهات الاتصال</p>
                <button class="retry-btn" onclick="loadContacts()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// ===== إضافة زر تسجيل الخروج =====
function addLogoutButton() {
    const userInfo = document.querySelector('.user-info');
    if (userInfo && !document.querySelector('.logout-btn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-btn';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i>';
        logoutBtn.title = 'تسجيل الخروج';
        logoutBtn.onclick = signOut;
        userInfo.appendChild(logoutBtn);
    }
}

// ===== تحديث صورة الملف الشخصي =====
async function handleProfilePictureUpdate() {
    showNotification('خاصية تغيير الصورة قريباً...', 'info');
}

// ===== فتح المحادثات =====
function openChat(chatId, chatType) {
    // فتح في نافذة جديدة
    window.open(`chat.html?type=${chatType}&id=${chatId}`, '_blank', 'width=800,height=600');
}

// ===== بدء محادثة جديدة =====
async function startChatWith(userId) {
    if (!currentUser) {
        showNotification('يجب تسجيل الدخول أولاً', 'error');
        return;
    }

    try {
        const chatId = currentUser.uid < userId ? 
            `${currentUser.uid}_${userId}` : 
            `${userId}_${currentUser.uid}`;

        // التحقق من وجود المحادثة
        const chatRef = db.ref('direct_chats/' + chatId);
        const snapshot = await chatRef.once('value');

        if (!snapshot.exists()) {
            // الحصول على بيانات المستخدم الآخر
            const userSnap = await db.ref('users/' + userId).once('value');
            const otherUser = userSnap.val();

            // إنشاء محادثة جديدة
            await chatRef.set({
                participants: {
                    [currentUser.uid]: true,
                    [userId]: true
                },
                participantNames: {
                    [currentUser.uid]: currentUser.displayName,
                    [userId]: otherUser?.name || 'مستخدم'
                },
                createdAt: Date.now(),
                lastMessage: '',
                lastMessageTime: Date.now(),
                type: 'direct'
            });
        }

        // فتح المحادثة
        openChat(chatId, 'direct');

    } catch (error) {
        console.error('خطأ في بدء المحادثة:', error);
        showNotification('فشل بدء المحادثة', 'error');
    }
}

// ===== وظائف الإشعارات =====
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = '<i class="fas fa-info-circle"></i>';
    if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';
    else if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
    else if (type === 'warning') icon = '<i class="fas fa-exclamation-triangle"></i>';
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // إضافة حدث إغلاق
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    });
    
    // إظهار الإشعار
    setTimeout(() => notification.classList.add('show'), 10);
    
    // إخفاء تلقائي بعد 4 ثوانٍ
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 4000);
}

// ===== تصدير الوظائف للنطاق العام =====
window.openChat = openChat;
window.startChatWith = startChatWith;
window.showGroupModal = showGroupModal;
window.loadChats = loadChats;
window.loadGroups = loadGroups;
window.loadContacts = loadContacts;
window.showNotification = showNotification;
window.formatTime = formatTime;

// تعيين المتغيرات العامة
window.currentUser = currentUser;
window.currentTab = currentTab;
window.db = db;
window.auth = auth;

// التأكد من تحميل الصفحة بشكل صحيح
window.addEventListener('load', function() {
    console.log('تم تحميل تطبيق Dragon بنجاح!');
});