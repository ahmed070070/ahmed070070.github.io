// ===== التهيئة الرئيسية =====
let currentUser = null;
let currentTab = 'chats';
let cachedChats = [];
let db = null;
let auth = null;

// ===== تهيئة Firebase =====
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
        // 1. تهيئة Firebase
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.database();

        // تعيين المتغيرات العامة
        window.db = db;
        window.auth = auth;

        // 2. إعداد مستمع المصادقة
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                window.currentUser = user;
                await handleUserLogin(user);
            } else {
                showLogin();
            }
        });

        // 3. إعداد الأحداث
        setupEventListeners();

        // 4. إخفاء التحميل
        setTimeout(() => {
            document.getElementById('loader').style.display = 'none';
        }, 1500);

    } catch (error) {
        console.error('خطأ في التهيئة:', error);
        showNotification('خطأ في التهيئة', 'error');
    }
});

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
            switchTab(e.target.closest('.tab').dataset.tab);
        });
    });

    // البحث
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // زر الإنشاء
    document.getElementById('create-fab').addEventListener('click', () => {
        if (currentTab === 'chats') {
            showImageModal('general');
        } else if (currentTab === 'groups') {
            showGroupModal();
        } else {
            // للتبويبات الأخرى
            showNotification('قريباً...', 'info');
        }
    });

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

// ===== وظائف المصادقة =====
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        return result.user;
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        showNotification('فشل تسجيل الدخول', 'error');
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

    } catch (error) {
        console.error('خطأ في تحديث بيانات المستخدم:', error);
        showNotification('خطأ في تحميل البيانات', 'error');
    }
}

// ===== تحديث زر FAB =====
function updateFABButton(tabName) {
    const fab = document.getElementById('create-fab');
    if (!fab) return;
    
    if (tabName === 'chats') {
        fab.innerHTML = '<i class="fas fa-camera"></i>';
        fab.title = 'إرسال صورة';
    } else if (tabName === 'groups') {
        fab.innerHTML = '<i class="fas fa-plus"></i>';
        fab.title = 'إنشاء مجموعة';
    } else {
        fab.innerHTML = '<i class="fas fa-user-plus"></i>';
        fab.title = 'إضافة جهة اتصال';
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
                <div class="chat-item" onclick="openChat('${chat.id}', '${chat.type || 'direct'}')">
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
                    <button class="login-btn" onclick="showGroupModal()" style="margin-top: 1rem; width: auto;">
                        أنشئ أول مجموعة
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        groups.forEach(group => {
            html += `
                <div class="chat-item" onclick="openChat('${group.id}', 'group')">
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
                <div class="chat-item" onclick="startChatWith('${user.id}')">
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
        logoutBtn.onclick = async () => {
            try {
                if (currentUser) {
                    await db.ref('users/' + currentUser.uid).update({
                        online: false,
                        lastSeen: Date.now()
                    });
                }
                await auth.signOut();
                showNotification('تم تسجيل الخروج', 'success');
                showLogin();
            } catch (error) {
                console.error('خطأ في تسجيل الخروج:', error);
                showNotification('فشل تسجيل الخروج', 'error');
            }
        };
        userInfo.appendChild(logoutBtn);
    }
}

// ===== تحديث صورة الملف الشخصي =====
async function handleProfilePictureUpdate() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    
    input.onchange = async (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            
            if (file.size > 5 * 1024 * 1024) {
                showNotification('حجم الصورة كبير جداً (الحد الأقصى 5MB)', 'error');
                return;
            }
            
            showNotification('جاري تحديث الصورة...', 'info');
            
            // هنا يمكنك إضافة كود رفع الصورة إلى imgBB
            // للمثال، سنستخدم URL مباشرة
            const reader = new FileReader();
            reader.onload = async (event) => {
                const dataUrl = event.target.result;
                
                try {
                    // تحديث الصورة في Firebase
                    await db.ref('users/' + currentUser.uid).update({
                        photo: dataUrl,
                        photoUpdated: Date.now()
                    });
                    
                    // تحديث الصورة في الواجهة
                    const avatar = document.getElementById('user-avatar');
                    if (avatar) {
                        avatar.src = dataUrl;
                    }
                    
                    showNotification('تم تحديث صورة الملف الشخصي', 'success');
                } catch (error) {
                    console.error('خطأ في تحديث الصورة:', error);
                    showNotification('فشل تحديث الصورة', 'error');
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

// ===== وظائف الصور =====
let imageModal = null;

function initializeImageModal() {
    if (!imageModal) {
        imageModal = document.createElement('div');
        imageModal.className = 'modal image-modal';
        imageModal.innerHTML = `
            <div class="modal-content image-modal-content">
                <h3 class="modal-title"><i class="fas fa-camera"></i> رفع صورة</h3>
                <div class="image-upload-area" id="image-drop-area">
                    <div class="upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                    <p>اسحب وأفلت الصورة هنا</p>
                    <p>أو</p>
                    <button class="btn-select-image" id="select-image-btn">اختر صورة</button>
                    <input type="file" id="image-input" accept="image/*" style="display: none;">
                </div>
                <div class="image-preview" id="image-preview" style="display: none;">
                    <img id="preview-img" src="" alt="معاينة الصورة">
                    <button class="btn-remove-preview" id="remove-preview"><i class="fas fa-times"></i></button>
                </div>
                <textarea id="image-caption" placeholder="أضف وصفاً للصورة (اختياري)" rows="3"></textarea>
                <div class="modal-buttons">
                    <button class="modal-btn cancel" id="cancel-upload"><i class="fas fa-times"></i> إلغاء</button>
                    <button class="modal-btn create" id="send-image-btn" disabled><i class="fas fa-paper-plane"></i> إرسال</button>
                </div>
            </div>
        `;
        document.body.appendChild(imageModal);
    }
    return imageModal;
}

function showImageModal(chatId) {
    const modal = initializeImageModal();
    modal.style.display = 'flex';
    modal.dataset.chatId = chatId;
    
    // إعداد الأحداث
    const selectBtn = document.getElementById('select-image-btn');
    const fileInput = document.getElementById('image-input');
    const dropArea = document.getElementById('image-drop-area');
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const removeBtn = document.getElementById('remove-preview');
    const cancelBtn = document.getElementById('cancel-upload');
    const sendBtn = document.getElementById('send-image-btn');
    
    let selectedFile = null;
    
    // فتح محدد الملفات
    selectBtn.onclick = () => fileInput.click();
    dropArea.onclick = () => fileInput.click();
    
    // اختيار ملف
    fileInput.onchange = (e) => {
        if (e.target.files.length > 0) {
            handleImageSelect(e.target.files[0]);
        }
    };
    
    // معالجة اختيار الصورة
    function handleImageSelect(file) {
        if (file.size > 10 * 1024 * 1024) {
            showNotification('حجم الصورة كبير جداً (الحد الأقصى 10MB)', 'error');
            return;
        }
        
        selectedFile = file;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            dropArea.style.display = 'none';
            sendBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }
    
    // إزالة المعاينة
    removeBtn.onclick = () => {
        selectedFile = null;
        preview.style.display = 'none';
        dropArea.style.display = 'block';
        sendBtn.disabled = true;
    };
    
    // إلغاء
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // إرسال
    sendBtn.onclick = async () => {
        if (!selectedFile || !chatId) return;
        
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الرفع...';
        
        try {
            // هنا يمكنك إضافة كود رفع الصورة إلى imgBB
            // للمثال، سنقوم بعرض إشعار
            showNotification('جاري رفع الصورة...', 'info');
            
            // محاكاة الرفع
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            showNotification('تم إرسال الصورة بنجاح', 'success');
            modal.style.display = 'none';
            
        } catch (error) {
            console.error('خطأ في إرسال الصورة:', error);
            showNotification(`فشل إرسال الصورة: ${error.message}`, 'error');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال';
        }
    };
}

// ===== بدء محادثة جديدة =====
async function startChatWith(userId) {
    if (!currentUser) return;

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
    
    let icon = 'ℹ️';
    if (type === 'error') icon = '❌';
    else if (type === 'success') icon = '✅';
    else if (type === 'warning') icon = '⚠️';
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // إظهار الإشعار
    setTimeout(() => notification.classList.add('show'), 10);
    
    // إخفاء تلقائي بعد 4 ثوانٍ
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 4000);
}

// ===== تصدير الوظائف للنطاق العام =====
window.showNotification = showNotification;
window.formatTime = formatTime;
window.openChat = openChat;
window.startChatWith = startChatWith;
window.showGroupModal = showGroupModal;
window.showImageModal = showImageModal;
window.loadChats = loadChats;
window.loadGroups = loadGroups;
window.loadContacts = loadContacts;

// تعيين المتغيرات العامة
window.currentUser = currentUser;
window.currentTab = currentTab;
window.db = db;
window.auth = auth;// ===== وظائف النطاق العام =====

// فتح المحادثة
window.openChat = function(chatId, chatType) {
    // فتح في نافذة جديدة لمنع مشاكل الجلسة
    window.open(`chat.html?type=${chatType}&id=${chatId}`, '_blank', 'width=800,height=600');
};

// بدء محادثة جديدة
window.startChatWith = async function(userId) {
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
        window.openChat(chatId, 'direct');
        
    } catch (error) {
        console.error('خطأ في بدء المحادثة:', error);
        showNotification('فشل بدء المحادثة', 'error');
    }
};

// عرض مودال المجموعة
window.showGroupModal = function() {
    document.getElementById('group-modal').style.display = 'flex';
    document.getElementById('group-name').focus();
};

// عرض مودال الصور
window.showImageModal = function(chatId) {
    // استدعاء الوظيفة المحلية
    if (typeof showImageModalInternal === 'function') {
        showImageModalInternal(chatId);
    } else {
        showNotification('جاري تحميل ميزة الصور...', 'info');
    }
};

// تحميل المحادثات
window.loadChats = loadChats;
window.loadGroups = loadGroups;
window.loadContacts = loadContacts;

// تصدير المتغيرات للنطاق العام
window.currentUser = currentUser;
window.currentTab = currentTab;
window.db = db;
window.auth = auth;
window.showNotification = showNotification;
window.formatTime = formatTime;