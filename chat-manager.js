// ===== إدارة المحادثات =====

// متغيرات المحادثات
let chatCachedChats = [];

// ===== تهيئة مدير المحادثات =====
function initializeChatManager(user) {
    try {
        console.log('تهيئة مدير المحادثات للمستخدم:', user.uid);
        chatCachedChats = JSON.parse(localStorage.getItem('dragon_chats')) || [];
        
        // التأكد من وجود المستخدم في قاعدة البيانات
        if (typeof ensureUserExists === 'function' && window.firebaseDb) {
            ensureUserExists(user.uid, {
                name: user.displayName,
                email: user.email,
                photo: user.photoURL,
                online: true,
                lastSeen: Date.now()
            });
        }
        
        // إعداد الاستماع للتحديثات في الوقت الحقيقي
        setTimeout(() => {
            setupRealtimeListeners(user);
        }, 1000);
        
    } catch (error) {
        console.error('خطأ في تهيئة مدير المحادثات:', error);
    }
}

// ===== تحميل المحادثات =====
async function loadChats() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            console.warn('يجب تسجيل الدخول لتحميل المحادثات');
            if (typeof showEmptyState === 'function') {
                showEmptyState('🔒', 'يجب تسجيل الدخول', 'سجّل الدخول لعرض المحادثات');
            }
            return;
        }
        
        // عرض حالة التحميل
        if (typeof showLoadingState === 'function') {
            showLoadingState('جاري تحميل المحادثات...');
        }
        
        // المحادثات المخزنة محلياً
        const localChats = chatCachedChats.filter(chat => 
            chat && chat.id && chat.type
        );
        
        // محاولة جلب المحادثات من Firebase
        let firebaseChats = [];
        try {
            firebaseChats = await loadChatsFromFirebase(currentUser);
        } catch (firebaseError) {
            console.warn('تعذر تحميل المحادثات من Firebase:', firebaseError.message);
        }
        
        // دمج المحادثات
        const allChats = mergeChats(localChats, firebaseChats);
        
        // تحديث التخزين المحلي
        chatCachedChats = allChats;
        localStorage.setItem('dragon_chats', JSON.stringify(allChats));
        
        // عرض المحادثات
        if (typeof displayChatsList === 'function') {
            displayChatsList(allChats);
        }
        
    } catch (error) {
        console.error('خطأ في تحميل المحادثات:', error);
        
        // عرض المحادثات المخزنة محليًا في حالة الخطأ
        if (typeof displayChatsList === 'function' && chatCachedChats.length > 0) {
            displayChatsList(chatCachedChats);
        } else if (typeof showEmptyState === 'function') {
            showEmptyState('💬', 'لا توجد محادثات بعد', 'ابدأ محادثة جديدة');
        }
    }
}

async function loadChatsFromFirebase(user) {
    try {
        if (!user || !user.uid || !window.firebaseDb) {
            return [];
        }
        
        const chats = [];
        
        // جلب المحادثات المباشرة
        const directChatsRef = window.firebaseDb.ref('direct_chats');
        const snapshot = await directChatsRef
            .orderByChild(`participants/${user.uid}`)
            .equalTo(true)
            .once('value');
        
        snapshot.forEach(child => {
            try {
                const chatData = child.val();
                if (chatData && child.key) {
                    chats.push({
                        id: child.key,
                        type: 'direct',
                        name: getChatName(chatData, user.uid),
                        lastMessage: chatData.lastMessage || '',
                        lastMessageTime: chatData.lastMessageTime || chatData.createdAt || Date.now(),
                        unreadCount: 0,
                        ...chatData
                    });
                }
            } catch (e) {
                console.warn('خطأ في معالجة محادثة:', e);
            }
        });
        
        return chats;
    } catch (error) {
        console.error('خطأ في جلب المحادثات من Firebase:', error);
        return [];
    }
}

function getChatName(chatData, currentUserId) {
    if (!chatData) return 'محادثة';
    
    if (chatData.chatName) {
        return chatData.chatName;
    }
    
    if (chatData.participantNames && currentUserId) {
        const otherParticipants = Object.keys(chatData.participantNames || {})
            .filter(uid => uid !== currentUserId)
            .map(uid => chatData.participantNames[uid])
            .filter(name => name);
        
        return otherParticipants.length > 0 ? otherParticipants.join(' و ') : 'محادثة';
    }
    
    return 'محادثة';
}

function mergeChats(localChats, firebaseChats) {
    const mergedChats = [...localChats];
    
    firebaseChats.forEach(firebaseChat => {
        if (!firebaseChat || !firebaseChat.id) return;
        
        const existingIndex = mergedChats.findIndex(chat => 
            chat && chat.id === firebaseChat.id
        );
        
        if (existingIndex === -1) {
            // محادثة جديدة
            mergedChats.push(firebaseChat);
        } else {
            // تحديث المحادثة الموجودة
            const existingChat = mergedChats[existingIndex];
            const firebaseTime = firebaseChat.lastMessageTime || 0;
            const localTime = existingChat.lastMessageTime || 0;
            
            if (firebaseTime > localTime) {
                mergedChats[existingIndex] = {
                    ...existingChat,
                    ...firebaseChat,
                    unreadCount: existingChat.unreadCount || 0
                };
            }
        }
    });
    
    // ترتيب المحادثات حسب الوقت
    return mergedChats
        .filter(chat => chat && chat.id)
        .sort((a, b) => {
            const timeA = a.lastMessageTime || a.createdAt || 0;
            const timeB = b.lastMessageTime || b.createdAt || 0;
            return timeB - timeA;
        });
}

// ===== تحميل المجموعات =====
async function loadGroups() {
    try {
        // عرض حالة التحميل
        if (typeof showLoadingState === 'function') {
            showLoadingState('جاري تحميل المجموعات...');
        }
        
        let groups = [];
        if (typeof getAllGroups === 'function') {
            groups = await getAllGroups();
        } else if (window.firebaseDb) {
            // طريقة بديلة
            groups = await getGroupsFromFirebase();
        }
        
        // تصفية المجموعات الفارغة
        groups = groups.filter(group => group && group.id);
        
        if (typeof displayGroupsList === 'function') {
            displayGroupsList(groups);
        }
        
    } catch (error) {
        console.error('خطأ في تحميل المجموعات:', error);
        
        if (typeof showEmptyState === 'function') {
            const createButton = `<button class="retry-btn" onclick="showGroupModal()">
                <i class="fas fa-plus"></i> أنشئ أول مجموعة
            </button>`;
            
            showEmptyState('👥', 'لا توجد مجموعات بعد', 'كن أول من ينشئ مجموعة!', createButton);
        }
    }
}

async function getGroupsFromFirebase() {
    try {
        if (!window.firebaseDb) return [];
        
        const snapshot = await window.firebaseDb.ref('groups').once('value');
        const groups = [];
        
        snapshot.forEach(child => {
            if (child.key && child.val()) {
                groups.push({
                    id: child.key,
                    ...child.val()
                });
            }
        });
        
        return groups;
    } catch (error) {
        console.error('خطأ في جلب المجموعات:', error);
        return [];
    }
}

// ===== تحميل جهات الاتصال =====
async function loadContacts() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            console.warn('يجب تسجيل الدخول لتحميل جهات الاتصال');
            if (typeof showEmptyState === 'function') {
                showEmptyState('🔒', 'يجب تسجيل الدخول', 'سجّل الدخول لعرض جهات الاتصال');
            }
            return;
        }
        
        // عرض حالة التحميل
        if (typeof showLoadingState === 'function') {
            showLoadingState('جاري تحميل جهات الاتصال...');
        }
        
        let users = [];
        if (typeof getAllUsers === 'function') {
            users = await getAllUsers();
        } else if (window.firebaseDb) {
            // طريقة بديلة
            users = await getUsersFromFirebase();
        }
        
        // تصفية المستخدم الحالي والمستخدمين الفارغين
        const contacts = users.filter(user => 
            user && user.id && user.id !== currentUser.uid
        );
        
        if (typeof displayContactsList === 'function') {
            displayContactsList(contacts, currentUser.uid);
        }
        
    } catch (error) {
        console.error('خطأ في تحميل جهات الاتصال:', error);
        
        if (typeof showEmptyState === 'function') {
            showEmptyState('👤', 'لا توجد جهات اتصال بعد', 'سيظهر المستخدمون الآخرون هنا عند تسجيل دخولهم');
        }
    }
}

async function getUsersFromFirebase() {
    try {
        if (!window.firebaseDb) return [];
        
        const snapshot = await window.firebaseDb.ref('users').once('value');
        const users = [];
        
        snapshot.forEach(child => {
            if (child.key && child.val()) {
                users.push({
                    id: child.key,
                    ...child.val()
                });
            }
        });
        
        return users;
    } catch (error) {
        console.error('خطأ في جلب المستخدمين:', error);
        return [];
    }
}

// ===== بدء محادثة جديدة =====
async function startChatWithUser(otherUserId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            if (typeof showNotification === 'function') {
                showNotification('يجب تسجيل الدخول أولاً', 'error');
            }
            return;
        }
        
        if (!otherUserId) {
            console.error('معرف المستخدم الآخر مطلوب');
            return;
        }
        
        if (typeof showNotification === 'function') {
            showNotification('جاري بدء المحادثة...', 'info');
        }
        
        let chatId;
        if (typeof createDirectChat === 'function') {
            chatId = await createDirectChat(currentUser.uid, otherUserId);
        } else {
            // طريقة بديلة
            chatId = await createSimpleDirectChat(currentUser.uid, otherUserId);
        }
        
        if (chatId) {
            // فتح المحادثة
            openChat(chatId, 'direct');
            
            // إضافة المحادثة إلى القائمة المحلية
            addChatToLocalCache({
                id: chatId,
                type: 'direct',
                name: 'محادثة جديدة',
                lastMessage: '',
                lastMessageTime: Date.now(),
                unreadCount: 0
            });
            
            if (typeof showNotification === 'function') {
                showNotification('تم بدء المحادثة', 'success');
            }
        }
        
    } catch (error) {
        console.error('خطأ في بدء المحادثة:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('فشل بدء المحادثة', 'error');
        }
    }
}

async function createSimpleDirectChat(userId1, userId2) {
    try {
        if (!window.firebaseDb) {
            throw new Error('قاعدة البيانات غير متاحة');
        }
        
        const chatId = userId1 < userId2 ? 
            `${userId1}_${userId2}` : 
            `${userId2}_${userId1}`;
        
        const chatRef = window.firebaseDb.ref('direct_chats/' + chatId);
        const snapshot = await chatRef.once('value');
        
        if (!snapshot.exists()) {
            const chatData = {
                participants: {
                    [userId1]: true,
                    [userId2]: true
                },
                createdAt: Date.now(),
                lastMessage: '',
                lastMessageTime: Date.now(),
                type: 'direct'
            };
            
            await chatRef.set(chatData);
        }
        
        return chatId;
    } catch (error) {
        console.error('خطأ في إنشاء محادثة بسيطة:', error);
        throw error;
    }
}

function addChatToLocalCache(chat) {
    if (!chat || !chat.id) return;
    
    const existingIndex = chatCachedChats.findIndex(c => c && c.id === chat.id);
    
    if (existingIndex === -1) {
        chatCachedChats.unshift(chat);
    } else {
        chatCachedChats[existingIndex] = chat;
    }
    
    localStorage.setItem('dragon_chats', JSON.stringify(chatCachedChats));
}

// ===== إنشاء مجموعة جديدة =====
async function createNewGroup() {
    try {
        const nameInput = document.getElementById('group-name');
        const descInput = document.getElementById('group-desc');
        
        if (!nameInput) {
            console.error('عنصر اسم المجموعة غير موجود');
            return;
        }
        
        const name = nameInput.value.trim();
        if (!name) {
            if (typeof showNotification === 'function') {
                showNotification('يرجى إدخال اسم المجموعة', 'error');
            }
            return;
        }
        
        const currentUser = getCurrentUser();
        if (!currentUser) {
            if (typeof showNotification === 'function') {
                showNotification('يجب تسجيل الدخول', 'error');
            }
            return;
        }
        
        const description = descInput ? descInput.value.trim() : '';
        
        const groupData = {
            name: name,
            description: description,
            creatorId: currentUser.uid,
            creatorName: currentUser.displayName || currentUser.name || 'مستخدم'
        };
        
        let groupId;
        if (typeof createGroup === 'function') {
            groupId = await createGroup(groupData);
        } else {
            groupId = await createSimpleGroup(groupData);
        }
        
        if (groupId) {
            // إغلاق المودال
            if (typeof hideGroupModal === 'function') {
                hideGroupModal();
            }
            
            // إضافة المجموعة إلى القائمة المحلية
            addChatToLocalCache({
                id: groupId,
                type: 'group',
                name: `# ${name}`,
                lastMessage: description || 'مجموعة جديدة',
                lastMessageTime: Date.now(),
                unreadCount: 0
            });
            
            if (typeof showNotification === 'function') {
                showNotification('تم إنشاء المجموعة بنجاح', 'success');
            }
            
            // تحديث قائمة المجموعات
            setTimeout(() => {
                if (typeof loadGroups === 'function') {
                    loadGroups();
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('خطأ في إنشاء المجموعة:', error);
        
        if (typeof showNotification === 'function') {
            showNotification('فشل إنشاء المجموعة', 'error');
        }
    }
}

async function createSimpleGroup(groupData) {
    try {
        if (!window.firebaseDb) {
            throw new Error('قاعدة البيانات غير متاحة');
        }
        
        const groupRef = window.firebaseDb.ref('groups').push();
        const groupId = groupRef.key;
        
        await groupRef.set({
            ...groupData,
            id: groupId,
            createdAt: Date.now(),
            memberCount: 1,
            members: {
                [groupData.creatorId]: true
            }
        });
        
        return groupId;
    } catch (error) {
        console.error('خطأ في إنشاء مجموعة بسيطة:', error);
        throw error;
    }
}

// ===== فتح المحادثة =====
function openChat(chatId, chatType = 'direct') {
    if (!chatId) {
        console.error('معرف المحادثة مطلوب');
        return;
    }
    
    // فتح في نافذة جديدة
    const chatWindow = window.open(
        `chat.html?type=${chatType}&id=${chatId}`,
        '_blank',
        'width=800,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (!chatWindow) {
        if (typeof showNotification === 'function') {
            showNotification('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة.', 'error');
        }
    }
}

// ===== وظائف مساعدة =====
function getCurrentUser() {
    // محاولة الحصول على المستخدم من مصادر مختلفة
    if (window.appCurrentUser) return window.appCurrentUser;
    if (window.firebaseAuth && window.firebaseAuth.currentUser) return window.firebaseAuth.currentUser;
    return null;
}

function setupRealtimeListeners(user) {
    if (!user || !user.uid || !window.firebaseDb) {
        return;
    }
    
    try {
        // تحديث حالة المستخدمين
        window.firebaseDb.ref('users').on('child_changed', (snapshot) => {
            if (typeof loadContacts === 'function') {
                setTimeout(loadContacts, 500);
            }
        });
        
        // تحديث المحادثات المباشرة
        window.firebaseDb.ref('direct_chats').on('child_changed', (snapshot) => {
            if (typeof loadChats === 'function') {
                setTimeout(loadChats, 500);
            }
        });
        
    } catch (error) {
        console.error('خطأ في إعداد مستمعات الوقت الحقيقي:', error);
    }
}

// ===== إعداد الأحداث =====
function setupChatEvents() {
    // زر إنشاء المجموعة في المودال
    const createGroupBtn = document.getElementById('modal-create');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', createNewGroup);
    }
}

// ===== تصدير الوظائف =====
window.initializeChatManager = initializeChatManager;
window.loadChats = loadChats;
window.loadGroups = loadGroups;
window.loadContacts = loadContacts;
window.startChatWithUser = startChatWithUser;
window.openChat = openChat;
window.createNewGroup = createNewGroup;
window.setupChatEvents = setupChatEvents;