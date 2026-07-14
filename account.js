document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const btnBack = document.getElementById('btn-back');
    const inputName = document.getElementById('profile-name');
    const inputPhone = document.getElementById('profile-phone');
    const imgAvatar = document.getElementById('profile-avatar');
    const uploadAvatar = document.getElementById('avatar-upload');
    const btnSave = document.getElementById('btn-save-profile');
    const reportsList = document.getElementById('reports-list');
    
    // Lightbox elements
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const lightboxCounter = document.getElementById('lightbox-counter');
    
    let currentLightboxImages = [];
    let currentImageIndex = 0;

    // --- Navigation ---
    btnBack.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    // --- Profile Management ---
    function loadProfile() {
        const name = localStorage.getItem('user_name') || '';
        const phone = localStorage.getItem('user_phone') || '';
        const avatar = localStorage.getItem('user_avatar');

        inputName.value = name;
        inputPhone.value = phone;
        if (avatar) {
            imgAvatar.src = avatar;
        }
    }

    uploadAvatar.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imgAvatar.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    btnSave.addEventListener('click', () => {
        const name = inputName.value.trim();
        const phone = inputPhone.value.trim();
        const avatar = imgAvatar.src;

        localStorage.setItem('user_name', name);
        localStorage.setItem('user_phone', phone);
        if (!avatar.includes('via.placeholder.com')) {
            localStorage.setItem('user_avatar', avatar);
        }

        // Show feedback
        const originalText = btnSave.textContent;
        btnSave.textContent = 'Đã lưu thành công!';
        btnSave.style.backgroundColor = 'var(--primary)';
        btnSave.style.color = '#000';
        
        setTimeout(() => {
            btnSave.textContent = originalText;
            btnSave.style.backgroundColor = '';
            btnSave.style.color = '';
        }, 2000);
    });

    // --- My Reports ---
    function loadReports() {
        // Load all reports from local storage (assuming they belong to this device)
        const reportsRaw = localStorage.getItem('reports');
        let reports = [];
        try {
            reports = reportsRaw ? JSON.parse(reportsRaw) : [];
        } catch(e) {
            console.error("Lỗi khi đọc báo cáo:", e);
        }

        if (reports.length === 0) {
            reportsList.innerHTML = '<p class="empty-state">Bạn chưa có báo cáo nào.</p>';
            return;
        }

        reportsList.innerHTML = '';
        
        // Sort newest first
        reports.sort((a, b) => b.timestamp - a.timestamp);

        reports.forEach(report => {
            const date = new Date(report.timestamp);
            const dateString = date.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
            
            const card = document.createElement('div');
            card.className = 'report-item glass-panel';
            
            // Image handling (multiple or single)
            let imageHtml = '';
            let imagesArray = [];
            
            if (report.images && report.images.length > 0) {
                imagesArray = report.images;
                imageHtml = `<div class="report-item-img" style="background-image: url('${report.images[0]}')">
                                ${report.images.length > 1 ? `<span class="img-count">+${report.images.length - 1}</span>` : ''}
                             </div>`;
            } else if (report.image) {
                imagesArray = [report.image];
                imageHtml = `<div class="report-item-img" style="background-image: url('${report.image}')"></div>`;
            } else {
                imageHtml = `<div class="report-item-img empty-img">Không ảnh</div>`;
            }

            card.innerHTML = `
                ${imageHtml}
                <div class="report-item-content">
                    <div class="report-item-header">
                        <span class="report-date">${dateString}</span>
                        <span class="report-status status-pending">Đã ghi nhận</span>
                    </div>
                    <p class="report-desc">${report.description || 'Không có mô tả'}</p>
                    <div class="report-meta">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span>${report.lng.toFixed(5)}, ${report.lat.toFixed(5)}</span>
                    </div>
                </div>
            `;
            
            // Add click event for image to open lightbox
            const imgDiv = card.querySelector('.report-item-img');
            if (imagesArray.length > 0) {
                imgDiv.style.cursor = 'pointer';
                imgDiv.addEventListener('click', () => {
                    openLightbox(imagesArray, 0);
                });
            }

            reportsList.appendChild(card);
        });
    }

    // --- Lightbox Functions ---
    function openLightbox(images, index) {
        currentLightboxImages = images;
        currentImageIndex = index;
        updateLightboxImage();
        
        lightboxModal.classList.remove('hidden');
        
        if (images.length > 1) {
            lightboxPrev.style.display = 'block';
            lightboxNext.style.display = 'block';
            lightboxCounter.style.display = 'block';
        } else {
            lightboxPrev.style.display = 'none';
            lightboxNext.style.display = 'none';
            lightboxCounter.style.display = 'none';
        }
    }

    function updateLightboxImage() {
        lightboxImg.src = currentLightboxImages[currentImageIndex];
        lightboxCounter.textContent = `${currentImageIndex + 1} / ${currentLightboxImages.length}`;
    }

    function closeLightbox() {
        lightboxModal.classList.add('hidden');
    }

    lightboxClose.addEventListener('click', closeLightbox);
    
    lightboxPrev.addEventListener('click', () => {
        currentImageIndex = (currentImageIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
        updateLightboxImage();
    });

    lightboxNext.addEventListener('click', () => {
        currentImageIndex = (currentImageIndex + 1) % currentLightboxImages.length;
        updateLightboxImage();
    });

    // Close on background click
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) {
            closeLightbox();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightboxModal.classList.contains('hidden')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') lightboxPrev.click();
            if (e.key === 'ArrowRight') lightboxNext.click();
        }
    });

    // Init
    loadProfile();
    loadReports();
});
