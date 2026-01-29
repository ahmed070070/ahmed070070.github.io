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

// ===== تهيئة Firebase =====
function initializeFirebase() {
  try {
    // التحقق من عدم تكرار التهيئة
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    const db = firebase.database();
    
    // تخزين في النطاق العام للوصول السهل
    window.firebaseAuth = auth;
    window.firebaseDb = db;
    
    console.log('Firebase تم تهيئته بنجاح');
    return { auth, db };
  } catch (error) {
    console.error('خطأ في تهيئة Firebase:', error);
    throw error;
  }
}

// ===== وظائف المصادقة =====
async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    const result = await window.firebaseAuth.signInWithPopup(provider);
    console.log('تم تسجيل الدخول بنجاح:', result.user.email);
    return result.user;
    
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    
    // تحويل كود الخطأ إلى رسالة مفهومة
    let errorMessage = 'فشل تسجيل الدخول';
    if (error.code === 'auth/popup-blocked') {
      errorMessage = 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'تم إغلاق نافذة التسجيل.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'خطأ في الاتصال بالشبكة.';
    }
    
    throw new Error(errorMessage);
  }
}

async function signOutUser() {
  try {
    if (window.firebaseAuth.currentUser) {
      const userId = window.firebaseAuth.currentUser.uid;
      await window.firebaseDb.ref('users/' + userId).update({
        online: false,
        lastSeen: Date.now()
      });
    }
    
    await window.firebaseAuth.signOut();
    console.log('تم تسجيل الخروج بنجاح');
    return true;
  } catch (error) {
    console.error('خطأ في تسجيل الخروج:', error);
    throw error;
  }
}

async function updateUserProfile(user) {
  try {
    if (!user || !user.uid) {
      throw new Error('بيانات المستخدم غير صالحة');
    }
    
    const userData = {
      name: user.displayName || 'مستخدم',
      email: user.email || '',
      photo: user.photoURL || '',
      lastSeen: Date.now(),
      online: true,
      provider: 'google',
      registeredAt: Date.now()
    };
    
    await window.firebaseDb.ref('users/' + user.uid).set(userData);
    console.log('تم تحديث بيانات المستخدم:', user.uid);
    return user;
  } catch (error) {
    console.error('خطأ في تحديث بيانات المستخدم:', error);
    throw error;
  }
}

// ===== وظائف قاعدة البيانات (بمعالجة الأخطاء) =====
async function getUserById(userId) {
  try {
    if (!userId) return null;
    
    const snapshot = await window.firebaseDb.ref('users/' + userId).once('value');
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('خطأ في جلب بيانات المستخدم:', error);
    return null;
  }
}

async function createDirectChat(userId1, userId2) {
  try {
    if (!userId1 || !userId2) {
      throw new Error('معرفات المستخدمين مطلوبة');
    }
    
    const chatId = userId1 < userId2 ?
      `${userId1}_${userId2}` :
      `${userId2}_${userId1}`;
    
    // جلب بيانات المستخدمين
    const [user1, user2] = await Promise.all([
      getUserById(userId1),
      getUserById(userId2)
    ]);
    
    const chatData = {
      participants: {
        [userId1]: true,
        [userId2]: true
      },
      participantNames: {
        [userId1]: user1?.name || 'مستخدم 1',
        [userId2]: user2?.name || 'مستخدم 2'
      },
      createdAt: Date.now(),
      lastMessage: '',
      lastMessageTime: Date.now(),
      type: 'direct',
      chatName: `${user1?.name || 'مستخدم'} و ${user2?.name || 'مستخدم'}`
    };
    
    await window.firebaseDb.ref('direct_chats/' + chatId).set(chatData);
    console.log('تم إنشاء محادثة مباشرة:', chatId);
    return chatId;
  } catch (error) {
    console.error('خطأ في إنشاء محادثة مباشرة:', error);
    throw error;
  }
}

async function createGroup(groupData) {
  try {
    if (!groupData.name || !groupData.creatorId) {
      throw new Error('بيانات المجموعة غير مكتملة');
    }
    
    const groupRef = window.firebaseDb.ref('groups').push();
    const groupId = groupRef.key;
    
    const completeGroupData = {
      ...groupData,
      id: groupId,
      createdAt: Date.now(),
      memberCount: 1,
      members: {
        [groupData.creatorId]: true
      }
    };
    
    await groupRef.set(completeGroupData);
    console.log('تم إنشاء المجموعة:', groupId);
    return groupId;
  } catch (error) {
    console.error('خطأ في إنشاء المجموعة:', error);
    throw error;
  }
}

async function getAllUsers() {
  try {
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
    
    console.log('تم جلب المستخدمين:', users.length);
    return users;
  } catch (error) {
    console.error('خطأ في جلب جميع المستخدمين:', error);
    return [];
  }
}

async function getAllGroups() {
  try {
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
    
    console.log('تم جلب المجموعات:', groups.length);
    return groups;
  } catch (error) {
    console.error('خطأ في جلب جميع المجموعات:', error);
    return [];
  }
}

// ===== وظائف مساعدة =====
async function ensureUserExists(userId, userData) {
  try {
    const userRef = window.firebaseDb.ref('users/' + userId);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.exists()) {
      await userRef.set({
        ...userData,
        registeredAt: Date.now()
      });
      console.log('تم إنشاء مستخدم جديد:', userId);
    }
    
    return true;
  } catch (error) {
    console.error('خطأ في التأكد من وجود المستخدم:', error);
    return false;
  }
}

// ===== تصدير الوظائف =====
window.initializeFirebase = initializeFirebase;
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.updateUserProfile = updateUserProfile;
window.getUserById = getUserById;
window.createDirectChat = createDirectChat;
window.createGroup = createGroup;
window.getAllUsers = getAllUsers;
window.getAllGroups = getAllGroups;
window.ensureUserExists = ensureUserExists;