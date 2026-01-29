// ===== التطبيق الرئيسي =====

// المتغيرات العامة للتطبيق
let appCurrentUser = null;
let appCurrentTab = 'chats';

// ===== تهيئة التطبيق =====
async function initializeApp() {
    try {
        // 1. عرض شاشة التحميل
        if (typeof showLoader === 'function') {
            showLoader();
        }
        
        // 2. اختبار التخزين المحلي
        testStorage();
        
        // 3. تهيئة Firebase
        if (typeof initializeFirebase === 'function') {
            const { auth } = initializeFirebase();
            
            // 4. إعداد مستمع حالة المصادقة
            setupAuthListener(auth);
            
        } else {
            console.error('لم يتم تحميل Firebase بشكل صحيح');
            showLoginScreen();
        }
        
        // 5. إعداد الأحداث
        setupAppEvents();
        
        // 6. إخفاء التحميل بعد تأخير قصير
        setTimeout(() => {
            if (typeof hideLoader === 'function') {
                hideLoader();
            }
        }, 2000);
        
    } catch (error) {
        console.error('خطأ في تهيئة التطبيق:', error);
        showErrorMessage('فشل تهيئة التطبيق');
    }
}

// ===== اختبار التخزين =====
function testStorage() {
    try {
        // اختبار localStorage
        localStorage.setItem('test_storage', 'test');
        const test = localStorage.getItem('test_storage');
        localStorage.removeItem('test_storage');
        
        if (test !== 'test') {
            console.warn('localStorage غير متوفر');
            showNotification('قد لا تعمل بعض الميزات بشكل صحيح', 'warning');
        }
    } catch (error) {
        console.error('خطأ في اختبار التخزين:', error);
    }
}

// ===== إعداد مستمع المصادقة =====
function setupAuthListener(auth) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // مستخدم مسجل الدخول
            await handleUserLogin(user);
        } else {
            // لا يوجد مستخدم مسجل
            handleUserLogout();
        }
    }, (error) => {
        console.error('خطأ في مستمع المصادقة:', error);
        showLoginScreen();
    });
}

// ===== معالجة تسجيل الدخول =====
async function handleUserLogin(user) {
    try {
        appCurrentUser = user;
        
        // 1. تحديث ملف المستخدم في Firebase
        if (typeof updateUserProfile === 'function') {
            await updateUserProfile(user);
        }
        
        // 2. تحديث واجهة المستخدم
        if (typeof updateUserUI === 'function') {
            updateUserUI(user);
        }
        
        // 3. تهيئة مدير المحادثات
        if (typeof initializeChatManager === 'function') {
            initializeChatManager(user);
        }
        
        // 4. عرض شاشة التطبيق
        if (typeof showAppScreen === 'function') {
            showAppScreen();
        }
        
        // 5. تحميل المحادثات
        if (typeof loadChats === 'function') {
            await loadChats();
        }
        
        // 6. إعداد علامة التبويب الافتراضية
        appCurrentTab = 'chats';
        
        // 7. إشعار ترحيبي
        if (typeof showNotification === 'function') {
            showNotification(`مرحباً ${user.displayName}!`, 'success');
        }
        
    } catch (error) {
        console.error('خطأ في معالجة تسجيل الدخول:', error);
        showErrorMessage('خطأ في تحميل بيانات المستخدم');
    }
}

// ===== معالجة تسجيل الخروج =====
function handleUserLogout() {
    appCurrentUser = null;
    
    // مسح البيانات المحلية
    clearLocalData();
    
    // عرض شاشة التسجيل
    if (typeof showLoginScreen === 'function') {
        showLoginScreen();
    }
}

// ===== مسح البيانات المحلية =====
function clearLocalData() {
    try {
        // الاحتفاظ فقط بالمحادثات المخزنة
        const savedChats = localStorage.getItem('dragon_chats') || '[]';
        
        // مسح جميع البيانات الأخرى
        localStorage.clear();
        
        // استعادة المحادثات المخزنة
        localStorage.setItem('dragon_chats', savedChats);
        
    } catch (error) {
        console.error('خطأ في مسح البيانات المحلية:', error);
    }
}

// ===== إعداد أحداث التطبيق =====
function setupAppEvents() {
    // 1. زر تسجيل الدخول
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLoginClick);
    }
    
    // 2. التبويبات
    setupTabsEvents();
    
    // 3. البحث
    if (typeof setupSearch === 'function') {
        setupSearch();
    }
    
    // 4. زر الإنشاء (FAB)
    const fabBtn = document.getElementById('create-fab');
    if (fabBtn) {
        fabBtn.addEventListener('click', handleFabClick);
    }
    
    // 5. أحداث المودال
    if (typeof setupModalEvents === 'function') {
        setupModalEvents();
    }
    
    // 6. أحداث المحادثات
    if (typeof setupChatEvents === 'function') {
        setupChatEvents();
    }
    
    // 7. إدارة علامة التبويب البؤرية
    setupFocusEvents();
}

// ===== معالجة النقر على تسجيل الدخول =====
async function handleLoginClick() {
    try {
        const loginBtn = document.getElementById('login-btn');
        const originalText = loginBtn.innerHTML;
        
        // تغيير حالة الزر
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التسجيل...';
        loginBtn.disabled = true;
        
        // تنفيذ تسجيل الدخول
        if (typeof signInWithGoogle === 'function') {
            await signInWithGoogle();
        } else {
            throw new Error('وظيفة تسجيل الدخول غير متوفرة');
        }
        
        // استعادة حالة الزر
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
        
    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        
        // استعادة حالة الزر
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fab fa-google"></i> تسجيل الدخول بحساب Google';
            loginBtn.disabled = false;
        }
        
        // عرض رسالة خطأ مناسبة
        showLoginError(error);
    }
}

// ===== عرض أخطاء تسجيل الدخول =====
function showLoginError(error) {
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
    
    if (typeof showNotification === 'function') {
        showNotification(errorMessage, 'error');
    }
}

// ===== إعداد أحداث التبويبات =====
function setupTabsEvents() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', async (e) => {
            const tabName = tab.dataset.tab;
            
            // تحديث التبويب النشط
            if (typeof switchTab === 'function') {
                appCurrentTab = switchTab(tabName);
            }
            
            // تحميل المحتوى المناسب
            await loadTabContent(tabName);
        });
    });
}

// ===== تحميل محتوى التبويب =====
async function loadTabContent(tabName) {
    try {
        switch (tabName) {
            case 'chats':
                if (typeof loadChats === 'function') {
                    await loadChats();
                }
                break;
                
            case 'groups':
                if (typeof loadGroups === 'function') {
                    await loadGroups();
                }
                break;
                
            case 'contacts':
                if (typeof loadContacts === 'function') {
                    await loadContacts();
                }
                break;
                
            default:
                console.warn('تبويب غير معروف:', tabName);
        }
    } catch (error) {
        console.error(`خطأ في تحميل تبويب ${tabName}:`, error);
        
        if (typeof showErrorState === 'function') {
            showErrorState(`خطأ في تحميل ${tabName}`, `load${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
        }
    }
}

// ===== معالجة نقر زر الإنشاء (FAB) =====
function handleFabClick() {
    switch (appCurrentTab) {
        case 'chats':
            // عرض خيارات بدء محادثة جديدة
            showChatOptions();
            break;
            
        case 'groups':
            // عرض مودال إنشاء مجموعة
            if (typeof showGroupModal === 'function') {
                showGroupModal();
            }
            break;
            
        case 'contacts':
            // عرض خيارات إضافة جهة اتصال
            showContactOptions();
            break;
            
        default:
            console.warn('تبويب غير معروف:', appCurrentTab);
    }
}

// ===== عرض خيارات المحادثة =====
function showChatOptions() {
    // في الإصدار الحالي، نفتح تبويب جهات الاتصال
    if (typeof switchTab === 'function') {
        appCurrentTab = switchTab('contacts');
    }
    
    if (typeof loadContacts === 'function') {
        loadContacts();
    }
    
    if (typeof showNotification === 'function') {
        showNotification('اختر جهة اتصال لبدء محادثة', 'info');
    }
}

// ===== عرض خيارات جهات الاتصال =====
function showContactOptions() {
    // في الإصدار الحالي، لا توجد خيارات إضافية
    if (typeof showNotification === 'function') {
        showNotification('يمكنك بدء محادثة بالنقر على أي جهة اتصال', 'info');
    }
}

// ===== إدارة الأحداث البؤرية =====
function setupFocusEvents() {
    // تحديث البيانات عند العودة إلى الصفحة
    window.addEventListener('focus', handlePageFocus);
    
    // حفظ البيانات عند ترك الصفحة
    window.addEventListener('beforeunload', handlePageUnload);
}

// ===== معالجة التركيز على الصفحة =====
function handlePageFocus() {
    if (appCurrentUser && appCurrentTab && window.firebaseDb) {
        // تحديث المحتوى الحالي
        loadTabContent(appCurrentTab);
        
        // تحديث حالة المستخدم
        window.firebaseDb.ref('users/' + appCurrentUser.uid).update({
            online: true,
            lastSeen: Date.now()
        }).catch(console.error);
    }
}

// ===== معالجة مغادرة الصفحة =====
function handlePageUnload() {
    if (appCurrentUser && window.firebaseDb) {
        // تحديث حالة المستخدم
        setTimeout(() => {
            window.firebaseDb.ref('users/' + appCurrentUser.uid).update({
                online: false,
                lastSeen: Date.now()
            }).catch(() => {
                // تجاهل الأخطاء أثناء الخروج
            });
        }, 100);
    }
}

// ===== وظائف الإشعارات =====
function showNotification(message, type = 'info') {
    // تنفيذ بديل بسيط
    const container = document.getElementById('notifications');
    if (!container) return;
    
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
            <button class="notification-close">✕</button>
        </div>
    `;
    
    container.appendChild(notification);
    
    // إضافة حدث الإغلاق
    notification.querySelector('.notification-close').addEventListener('click', function() {
        notification.remove();
    });
    
    // إظهار الإشعار
    setTimeout(() => notification.classList.add('show'), 10);
    
    // إخفاء تلقائي
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// ===== عرض رسائل الخطأ =====
function showErrorMessage(message) {
    showNotification(message, 'error');
    
    // إظهار شاشة التسجيل بعد الخطأ
    setTimeout(() => {
        if (typeof showLoginScreen === 'function') {
            showLoginScreen();
        }
    }, 3000);
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

// ===== تهيئة عند تحميل الصفحة =====
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة التطبيق
    initializeApp();
    
    // تسجيل رسالة نجاح التحميل
    console.log('تم تحميل تطبيق Dragon بنجاح! 🐉');
});

// ===== تصدير الوظائف العامة =====
window.initializeApp = initializeApp;
window.handleLoginClick = handleLoginClick;
window.showNotification = showNotification;
window.formatTime = formatTime;