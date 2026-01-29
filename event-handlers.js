import { signInWithGoogle } from './firebase-config.js';
import { switchTab } from './ui-manager.js';
import { showGroupModal, hideGroupModal, createGroup } from './chat-manager.js';
import { showImageModal } from './chat-manager.js';

// ===== إعداد الأحداث =====
function setupEventListeners(db) {
    // زر الدخول
    document.getElementById('login-btn').addEventListener('click', signInWithGoogle);

    // التبويبات
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab, db);
        });
    });

    // البحث
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // زر الإنشاء
    document.getElementById('create-fab').addEventListener('click', () => {
        if (currentTab === 'chats') {
            showImageModal('general'); // مثال، تحتاج لتحديد chatId
        } else {
            showGroupModal();
        }
    });

    // مودال المجموعة
    document.getElementById('modal-cancel').addEventListener('click', hideGroupModal);
    document.getElementById('modal-create').addEventListener('click', () => createGroup(db));

    // إضافة زر رفع الصورة في المحادثة
    document.addEventListener('chatOpened', (e) => {
        const chatId = e.detail.chatId;
        addImageUploadButton(chatId);
    });

    // تحديث صورة الملف الشخصي
    const userAvatar = document.getElementById('user-avatar');
    if (userAvatar) {
        userAvatar.addEventListener('click', (e) => {
            e.preventDefault();
            showProfilePictureModal();
        });
    }
}

// ===== إضافة زر رفع الصورة =====
function addImageUploadButton(chatId) {
    // البحث عن حاوية إدخال الرسائل في نافذة المحادثة
    const messageInputContainer = document.querySelector('.message-input-container');
    if (messageInputContainer) {
        const imageBtn = document.createElement('button');
        imageBtn.className = 'image-upload-btn';
        imageBtn.innerHTML = '📷';
        imageBtn.title = 'إرسال صورة';
        imageBtn.onclick = () => showImageModal(chatId);
        
        messageInputContainer.prepend(imageBtn);
    }
}

// ===== عرض مودال تحديث صورة الملف الشخصي =====
function showProfilePictureModal() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    
    input.onchange = (e) => {
        if (e.target.files.length > 0) {
            const event = new CustomEvent('profilePictureSelected', {
                detail: { file: e.target.files[0] }
            });
            document.dispatchEvent(event);
        }
    };
    
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
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

export { setupEventListeners };