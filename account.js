document.addEventListener('DOMContentLoaded', () => {
    // --- Auth Check ---
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // --- Elements ---
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarName = document.getElementById('sidebarName');
    
    const profileAvatar = document.getElementById('profileAvatar');
    const avatarInput = document.getElementById('avatarInput');
    const btnUploadAvatar = document.getElementById('btnUploadAvatar');
    
    const inputName = document.getElementById('inputName');
    const inputPhone = document.getElementById('inputPhone');
    const inputEmail = document.getElementById('inputEmail');
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    
    const reportsList = document.getElementById('reportsList');
    
    // Navigation & Tabs
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-target]');
    const contentCards = document.querySelectorAll('.content-card');
    const btnBack = document.getElementById('btnBack');
    const headerBack = document.getElementById('headerBack');
    
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarNav = document.getElementById('sidebarNav');

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    // --- State ---
    let profileData = JSON.parse(localStorage.getItem('userProfile')) || {
        name: 'Công dân Tiến Thắng',
        phone: '',
        email: '',
        avatar: 'ava.jpg'
    };
    
    let reports = JSON.parse(localStorage.getItem('reports')) || [];

    // --- Init ---
    function init() {
        // Load profile data into inputs
        inputName.value = profileData.name;
        inputPhone.value = profileData.phone;
        inputEmail.value = profileData.email;
        profileAvatar.src = profileData.avatar;
        
        // Update sidebar
        sidebarName.textContent = profileData.name || 'Công dân Tiến Thắng';
        sidebarAvatar.src = profileData.avatar;

        renderReports();
    }

    // --- Tab Switching ---
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Hide all content cards
            contentCards.forEach(card => {
                card.classList.remove('active-tab');
                card.classList.add('hidden-tab');
            });
            
            // Add active to clicked nav
            item.classList.add('active');
            // Show targeted card
            const targetId = item.getAttribute('data-target');
            const targetCard = document.getElementById(targetId);
            if(targetCard) {
                targetCard.classList.remove('hidden-tab');
                targetCard.classList.add('active-tab');
            }
            
            // Close mobile menu if open
            sidebarNav.classList.remove('show');
        });
    });

    // --- Navigation ---
    btnBack.addEventListener('click', () => {
        window.location.href = 'map.html';
    });
    headerBack.addEventListener('click', () => {
        window.location.href = 'map.html';
    });
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }

    // Mobile Menu Toggle
    mobileMenuBtn.addEventListener('click', () => {
        sidebarNav.classList.toggle('show');
    });

    // --- Profile Management ---
    btnUploadAvatar.addEventListener('click', () => {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64Str = event.target.result;
                profileAvatar.src = base64Str;
                profileData.avatar = base64Str;
            };
            reader.readAsDataURL(file);
        }
    });

    btnSaveProfile.addEventListener('click', () => {
        profileData.name = inputName.value;
        profileData.phone = inputPhone.value;
        profileData.email = inputEmail.value;

        localStorage.setItem('userProfile', JSON.stringify(profileData));
        
        // Update sidebar
        sidebarName.textContent = profileData.name || 'Công dân Tiến Thắng';
        sidebarAvatar.src = profileData.avatar;

        alert('Lưu thông tin thành công!');
    });

    // --- Reports Rendering ---
    function renderReports() {
        reportsList.innerHTML = '';

        if (reports.length === 0) {
            reportsList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #888; padding: 2rem;">Bạn chưa có báo cáo nào.</div>`;
            return;
        }

        reports.forEach((report) => {
            const date = report.timeString || new Date(report.timestamp || Date.now()).toLocaleDateString('vi-VN');
            const isResolved = report.status === 'resolved';
            const statusColor = isResolved ? '#2E7D32' : '#F57F17'; // Green or Yellowish
            const statusText = isResolved ? 'Đã khắc phục' : 'Đang xử lý';

            const card = document.createElement('div');
            card.className = 'doc-card';

            const imageUrl = (report.images && report.images.length > 0) ? report.images[0] : report.image;
            const desc = report.descText || report.desc || 'Không có mô tả';

            let imgHTML = '';
            if (imageUrl) {
                imgHTML = `<img src="${imageUrl}" class="doc-img" alt="Report Image" onclick="openLightbox('${imageUrl}')">`;
            } else {
                imgHTML = `<div class="doc-empty">Không có ảnh</div>`;
            }

            let adminCommentHtml = '';
            if (report.adminComment) {
                adminCommentHtml = `
                    <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #F59E0B; padding: 8px; margin-top: 10px; font-size: 0.85rem; border-radius: 0 4px 4px 0;">
                        <strong style="color: #F59E0B; display: block; margin-bottom: 2px;">👨‍💼 Phản hồi từ Admin:</strong>
                        ${report.adminComment}
                    </div>
                `;
            }

            card.innerHTML = `
                ${imgHTML}
                <div class="doc-info">
                    <span class="doc-name" title="${desc}">${desc}</span>
                    <span class="doc-meta" style="border-color: ${statusColor}; color: ${statusColor};">${statusText}</span>
                    ${adminCommentHtml}
                </div>
                <div class="doc-actions">
                    <span style="font-size: 0.8rem; color: #888;">${date}</span>
                    <button class="btn-pill btn-destructive" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;" onclick="deleteReport('${report.id}')">Xóa</button>
                </div>
            `;
            reportsList.appendChild(card);
        });
    }

    // Expose delete func to global scope for inline onclick
    window.deleteReport = function(id) {
        if(confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
            reports = reports.filter(r => r.id !== id);
            localStorage.setItem('reports', JSON.stringify(reports));
            renderReports();
        }
    }

    // --- Lightbox Logic ---
    window.openLightbox = function(src) {
        lightboxImg.src = src;
        lightbox.classList.add('active');
    };

    lightboxClose.addEventListener('click', () => {
        lightbox.classList.remove('active');
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
        }
    });

    init();
});
