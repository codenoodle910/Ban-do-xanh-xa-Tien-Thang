document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Mapbox
    mapboxgl.accessToken = 'pk.eyJ1IjoiaGllcDE5MDUiLCJhIjoiY21yajlqd2Z6MDVpYzM1cTJyd2dlajllNiJ9.xMlOUBFZDiwWQcpRx1d25Q';
    
    // Default initial coordinates centered near Me Linh, Hanoi
    const map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v12', // default colorful map
        center: [105.712, 21.212],
        zoom: 12.5,
        attributionControl: true
    });

    // Set language to Vietnamese
    const language = new MapboxLanguage({
        defaultLanguage: 'vi'
    });
    map.addControl(language);

    // Add navigation controls (zoom in/out) to bottom-left to avoid overlaps
    map.addControl(new mapboxgl.NavigationControl({
        showCompass: false
    }), 'bottom-left');

    // Add geolocation control to locate user
    const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
    });
    map.addControl(geolocateControl, 'bottom-left');

    // Automatically trigger geolocation request once map is loaded
    map.on('load', () => {
        // Trigger locating user automatically
        geolocateControl.trigger();
    });

    let geojsonData = null;
    let mapBounds = null;
    let boundaryVisible = true;

    // Helper to calculate bounding box from GeoJSON coordinates
    function getGeoJSONBounds(geojson) {
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        const coords = geojson.features[0].geometry.coordinates;
        
        function processCoord(c) {
            if (c[0] < minLng) minLng = c[0];
            if (c[1] < minLat) minLat = c[1];
            if (c[0] > maxLng) maxLng = c[0];
            if (c[1] > maxLat) maxLat = c[1];
        }
        
        function traverse(array) {
            if (typeof array[0] === 'number') {
                processCoord(array);
            } else {
                for (let i = 0; i < array.length; i++) {
                    traverse(array[i]);
                }
            }
        }
        
        traverse(coords);
        return [
            [minLng, minLat], // southwest
            [maxLng, maxLat]  // northeast
        ];
    }

    // 2. Load GeoJSON Boundary Data
    fetch('vn_geo.json?v=' + new Date().getTime())
        .then(response => {
            if (!response.ok) throw new Error("Could not load vn_geo.json");
            return response.json();
        })
        .then(data => {
            geojsonData = data;
            
            // Calculate bounds and fit map
            if (geojsonData && geojsonData.features && geojsonData.features.length > 0) {
                mapBounds = getGeoJSONBounds(geojsonData);
                
                // Fly to bounds smoothly
                map.fitBounds(mapBounds, {
                    padding: 50,
                    duration: 1500
                });
            }

            // Draw layer once style is loaded
            if (map.isStyleLoaded()) {
                addBoundaryLayer();
            }

            // Hide Loading Overlay
            document.getElementById('loading-overlay').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-overlay').style.display = 'none';
            }, 500);
        })
        .catch(err => {
            console.error(err);
            document.querySelector('#loading-overlay p').textContent = "Lỗi khi tải dữ liệu bản đồ.";
            document.querySelector('#loading-overlay p').style.color = "#ef4444";
            document.querySelector('.spinner').style.display = 'none';
        });

    // 3. Define and draw boundary layer in Mapbox GL JS
    function addBoundaryLayer() {
        if (!geojsonData) return;

        // Check if source already exists, if not add it
        if (!map.getSource('boundary-source')) {
            map.addSource('boundary-source', {
                type: 'geojson',
                data: geojsonData
            });
        }

        // Add layer if it doesn't exist
        if (!map.getLayer('boundary-layer')) {
            map.addLayer({
                id: 'boundary-layer',
                type: 'line',
                source: 'boundary-source',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                    'visibility': boundaryVisible ? 'visible' : 'none'
                },
                paint: {
                    'line-color': 'rgba(0, 0, 0, 0.5)', // Light black / charcoal
                    'line-width': 2.5,
                    'line-dasharray': [3, 3] // 3px dash, 3px gap
                }
            });

            // Set up interactivity events
            // Just change cursor on hover, no color change
            map.on('mousemove', 'boundary-layer', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'boundary-layer', () => {
                map.getCanvas().style.cursor = '';
            });

            // Click details
            map.on('click', 'boundary-layer', (e) => {
                if (e.features && e.features.length > 0) {
                    showFeatureDetails(e.features[0].properties);
                }
            });
        }
    }

    // Trigger boundary layer drawing and hide Mapbox native boundaries when style changes
    map.on('style.load', () => {
        try {
            const layers = map.getStyle().layers;
            layers.forEach(layer => {
                if (layer.type === 'line' && 
                    (layer.id.includes('admin') || layer.id.includes('boundary') || layer.id.includes('border')) && 
                    layer.id !== 'boundary-layer') {
                    map.setLayoutProperty(layer.id, 'visibility', 'none');
                }
            });
        } catch (e) {
            console.warn("Could not hide Mapbox native boundaries:", e);
        }
        addBoundaryLayer();
        initAdminRoads();
    });

    // 4. UI Interactions & Controls
    
    // Panel Toggle functionality
    const panelToggle = document.getElementById('panel-toggle');
    const panelContent = document.getElementById('panel-content');
    const mapControlsPanel = document.getElementById('map-controls-panel');
    
    panelToggle.addEventListener('click', () => {
        panelContent.classList.toggle('collapsed');
        mapControlsPanel.classList.toggle('collapsed');
    });



    // Style switcher buttons
    const styleBtns = document.querySelectorAll('.style-btn');
    styleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove active class from all
            styleBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            const clickedBtn = e.currentTarget;
            clickedBtn.classList.add('active');
            
            // Set map style
            const nextStyle = clickedBtn.getAttribute('data-style');
            map.setStyle(nextStyle);
        });
    });

    // Boundary visibility checkbox
    const toggleBoundary = document.getElementById('toggle-boundary');
    toggleBoundary.addEventListener('change', (e) => {
        boundaryVisible = e.target.checked;
        if (map.getLayer('boundary-layer')) {
            map.setLayoutProperty('boundary-layer', 'visibility', boundaryVisible ? 'visible' : 'none');
        }
    });

    // Toàn cảnh (Reset View)
    const btnReset = document.getElementById('btn-reset');
    btnReset.addEventListener('click', () => {
        if (mapBounds) {
            map.fitBounds(mapBounds, {
                padding: 50,
                duration: 1500
            });
            hideFeatureDetails();
        }
    });

    // Sidebar Info Panel Functions
    function showFeatureDetails(properties) {
        if (!properties) return;
        const detailsContainer = document.getElementById('feature-details');
        const propertyList = document.getElementById('property-list');
        
        propertyList.innerHTML = '';
        
        const keys = Object.keys(properties);
        if (keys.length === 0) {
            propertyList.innerHTML = '<li><span class="prop-value">Không có thông tin chi tiết</span></li>';
        } else {
            keys.forEach(key => {
                const li = document.createElement('li');
                
                const spanKey = document.createElement('span');
                spanKey.className = 'prop-key';
                spanKey.textContent = formatKey(key);
                
                const spanVal = document.createElement('span');
                spanVal.className = 'prop-value';
                spanVal.textContent = properties[key];
                
                li.appendChild(spanKey);
                li.appendChild(spanVal);
                propertyList.appendChild(li);
            });
        }
        
        detailsContainer.classList.remove('hidden');
    }

    function hideFeatureDetails() {
        document.getElementById('feature-details').classList.add('hidden');
    }

    function formatKey(key) {
        return key.replace(/_/g, ' ')
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase());
    }

    // --- Report Feature Logic ---
    const btnReport = document.getElementById('btn-report');
    const reportModal = document.getElementById('report-modal');
    const btnCloseModal = document.getElementById('close-modal-btn');
    const btnCancelReport = document.getElementById('btn-cancel-report');
    const btnSubmitReport = document.getElementById('btn-submit-report');
    const locationStatus = document.getElementById('location-status');
    const imageUploadArea = document.getElementById('image-upload-area');
    const reportImage = document.getElementById('report-image');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const reportDesc = document.getElementById('report-desc');

    // Lightbox elements
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    const lightboxCounter = document.getElementById('lightbox-counter');

    let currentReportLocation = null;
    let currentReportImages = [];
    
    // --- Data Persistence ---
    let reportsData = JSON.parse(localStorage.getItem('reports')) || [];
    let reports = []; // Will be populated with map markers later
    let editingReportId = null;
    
    let currentLightboxImages = [];
    let currentLightboxIndex = 0;

    function saveReportsToStorage() {
        const dataToSave = reports.map(r => ({
            id: r.id,
            location: r.location,
            desc: r.desc,
            images: r.images,
            status: r.status,
            date: r.date
        }));
        localStorage.setItem('reports', JSON.stringify(dataToSave));
    }

    // --- Admin Road Coloring State ---
    let currentRole = 'USER'; // 'USER' or 'ADMIN'
    let adminColoredRoads = JSON.parse(localStorage.getItem('adminRoads')) || []; // Array of GeoJSON Features
    let selectedRoadFeature = null;
    
    function saveAdminRoadsToStorage() {
        localStorage.setItem('adminRoads', JSON.stringify(adminColoredRoads));
    }
    
    let adminState = 'IDLE'; // 'IDLE', 'SELECT_B', 'CHOOSE_COLOR'
    let adminMarkerA = null;
    let adminMarkerB = null;
    let tempRouteFeature = null;

    const roleToggle = document.getElementById('role-toggle');
    const roleLabelUser = document.getElementById('role-label-user');
    const roleLabelAdmin = document.getElementById('role-label-admin');
    const roadColorPicker = document.getElementById('road-color-picker');
    const colorBtns = document.querySelectorAll('.color-btn');
    const adminInstructionPanel = document.getElementById('admin-instruction-panel');
    const adminInstructionText = document.getElementById('admin-instruction-text');
    const btnAdminCancel = document.getElementById('btn-admin-cancel');
    const btnDeleteRoad = document.getElementById('btn-delete-road');

    function resetAdminState() {
        if (adminMarkerA) adminMarkerA.remove();
        if (adminMarkerB) adminMarkerB.remove();
        adminMarkerA = null;
        adminMarkerB = null;
        tempRouteFeature = null;
        selectedRoadFeature = null;
        adminState = 'IDLE';
        
        roadColorPicker.classList.add('hidden');
        btnDeleteRoad.classList.add('hidden');
        
        if (map.getSource('admin-temp-route')) {
            map.getSource('admin-temp-route').setData({ type: 'FeatureCollection', features: [] });
        }
        
        if (currentRole === 'ADMIN') {
            adminInstructionPanel.classList.remove('hidden');
            adminInstructionText.textContent = "Nhấp vào bản đồ để chọn Điểm Bắt Đầu (Điểm A)";
        } else {
            adminInstructionPanel.classList.add('hidden');
        }
    }

    if (btnAdminCancel) {
        btnAdminCancel.addEventListener('click', resetAdminState);
    }

    // Role Toggle Logic
    if (roleToggle) {
        roleToggle.addEventListener('change', (e) => {
            currentRole = e.target.checked ? 'ADMIN' : 'USER';
            if (currentRole === 'ADMIN') {
                roleLabelAdmin.classList.add('active');
                roleLabelUser.classList.remove('active');
                btnReport.style.display = 'none';
                map.getCanvas().style.cursor = 'crosshair';
                resetAdminState();
            } else {
                roleLabelUser.classList.add('active');
                roleLabelAdmin.classList.remove('active');
                btnReport.style.display = 'flex';
                map.getCanvas().style.cursor = '';
                resetAdminState();
            }
        });
    }

    function initReportsFromStorage() {
        reportsData.forEach(r => {
            const el = document.createElement('div');
            el.className = 'custom-marker';
            const svgIcon = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8z" fill="var(--danger)"/>
                    <circle cx="12" cy="8" r="3" fill="white"/>
                </svg>`;
            el.innerHTML = svgIcon;
            
            const popupHtml = renderPopupContent(r);
            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);
            
            r.marker = new mapboxgl.Marker({ element: el, draggable: true })
                .setLngLat(r.location)
                .setPopup(popup)
                .addTo(map);
                
            r.marker.on('dragend', () => {
                const lngLat = r.marker.getLngLat();
                r.location = [lngLat.lng, lngLat.lat];
                saveReportsToStorage();
            });
            
            reports.push(r);
        });
    }

    map.on('load', () => {
        initReportsFromStorage();
    });

    function initAdminRoads() {
        if (!map.getSource('admin-colored-roads')) {
            map.addSource('admin-colored-roads', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: adminColoredRoads
                }
            });
        }
        
        if (!map.getLayer('admin-colored-roads-layer')) {
            map.addLayer({
                id: 'admin-colored-roads-layer',
                type: 'line',
                source: 'admin-colored-roads',
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': ['get', 'statusColor'],
                    'line-width': 8,
                    'line-opacity': 0.8
                }
            });
        }
        
        // Temp route source for A to B preview
        if (!map.getSource('admin-temp-route')) {
            map.addSource('admin-temp-route', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });
            map.addLayer({
                id: 'admin-temp-route-layer',
                type: 'line',
                source: 'admin-temp-route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#3b82f6', 'line-width': 6, 'line-dasharray': [2, 2], 'line-opacity': 0.8 }
            });
        }
    }

    // Map Click for Admin Road Coloring
    map.on('click', async (e) => {
        if (currentRole !== 'ADMIN') return;
        
        // 1. Check if clicking on an EXISTING colored road
        const coloredFeatures = map.queryRenderedFeatures(e.point, { layers: ['admin-colored-roads-layer'] });
        if (coloredFeatures.length > 0) {
            const clickedLine = coloredFeatures[0];
            const routeId = clickedLine.properties.routeId;
            selectedRoadFeature = adminColoredRoads.find(f => f.properties.routeId === routeId);
            
            if (selectedRoadFeature) {
                // Open color picker for updating
                roadColorPicker.classList.remove('hidden');
                roadColorPicker.style.left = (e.originalEvent.clientX + 10) + 'px';
                roadColorPicker.style.top = (e.originalEvent.clientY + 10) + 'px';
                btnDeleteRoad.classList.remove('hidden'); // Show delete button
                adminInstructionPanel.classList.add('hidden');
                return;
            }
        }

        // 2. Handle A to B routing logic
        if (adminState === 'IDLE') {
            const el = document.createElement('div');
            el.className = 'admin-marker admin-marker-a';
            el.textContent = 'A';
            adminMarkerA = new mapboxgl.Marker({ element: el })
                .setLngLat(e.lngLat)
                .addTo(map);
            
            adminState = 'SELECT_B';
            adminInstructionText.textContent = "Nhấp vào bản đồ để chọn Điểm Kết Thúc (Điểm B)";
        } 
        else if (adminState === 'SELECT_B') {
            const el = document.createElement('div');
            el.className = 'admin-marker admin-marker-b';
            el.textContent = 'B';
            adminMarkerB = new mapboxgl.Marker({ element: el })
                .setLngLat(e.lngLat)
                .addTo(map);

            adminState = 'CHOOSE_COLOR';
            adminInstructionText.textContent = "Đang tìm tuyến đường...";
            
            const lngA = adminMarkerA.getLngLat().lng;
            const latA = adminMarkerA.getLngLat().lat;
            const lngB = e.lngLat.lng;
            const latB = e.lngLat.lat;

            try {
                // Using Mapbox Directions API for driving profile
                const res = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${lngA},${latA};${lngB},${latB}?geometries=geojson&access_token=${mapboxgl.accessToken}`);
                const data = await res.json();
                
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0].geometry;
                    tempRouteFeature = {
                        type: 'Feature',
                        geometry: route,
                        properties: {
                            routeId: 'route-' + Date.now()
                        }
                    };
                    
                    // Draw temp route
                    map.getSource('admin-temp-route').setData(tempRouteFeature);
                    
                    // Show color picker
                    adminInstructionPanel.classList.add('hidden');
                    roadColorPicker.classList.remove('hidden');
                    roadColorPicker.style.left = (e.originalEvent.clientX + 10) + 'px';
                    roadColorPicker.style.top = (e.originalEvent.clientY + 10) + 'px';
                    
                    selectedRoadFeature = tempRouteFeature;
                } else {
                    alert("Không tìm thấy đường nối giữa 2 điểm này.");
                    resetAdminState();
                }
            } catch (err) {
                console.error(err);
                alert("Lỗi kết nối khi tìm đường.");
                resetAdminState();
            }
        }
    });

    // Color Button Logic
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!selectedRoadFeature) return;
            
            const color = e.target.getAttribute('data-color');
            selectedRoadFeature.properties.statusColor = color;
            
            // If it's a new route (not in the array yet)
            if (!adminColoredRoads.some(f => f.properties.routeId === selectedRoadFeature.properties.routeId)) {
                adminColoredRoads.push(selectedRoadFeature);
            }
            
            // Update source
            if (map.getSource('admin-colored-roads')) {
                map.getSource('admin-colored-roads').setData({
                    type: 'FeatureCollection',
                    features: adminColoredRoads
                });
            }
            saveAdminRoadsToStorage();
            
            resetAdminState();
        });
    });

    // Delete Button Logic
    if (btnDeleteRoad) {
        btnDeleteRoad.addEventListener('click', () => {
            if (!selectedRoadFeature) return;
            
            adminColoredRoads = adminColoredRoads.filter(f => f.properties.routeId !== selectedRoadFeature.properties.routeId);
            
            if (map.getSource('admin-colored-roads')) {
                map.getSource('admin-colored-roads').setData({
                    type: 'FeatureCollection',
                    features: adminColoredRoads
                });
            }
            saveAdminRoadsToStorage();
            
            resetAdminState();
        });
    }

    function renderPopupContent(report) {
        let imagesHtml = '';
        if (report.images.length === 1) {
            imagesHtml = `
                <div class="report-popup-gallery single">
                    <div class="img-wrapper" onclick="window.openLightbox('${report.id}', 0)">
                        <img src="${report.images[0]}" alt="Sự cố">
                    </div>
                </div>
            `;
        } else if (report.images.length > 1) {
            const firstTwo = report.images.slice(0, 2);
            imagesHtml = `<div class="report-popup-gallery">`;
            firstTwo.forEach((img, idx) => {
                const isSecondAndMore = (idx === 1 && report.images.length > 2);
                imagesHtml += `
                    <div class="img-wrapper" onclick="window.openLightbox('${report.id}', ${idx})">
                        <img src="${img}" alt="Sự cố">
                        ${isSecondAndMore ? `<div class="more-images-overlay">+${report.images.length - 2}</div>` : ''}
                    </div>
                `;
            });
            imagesHtml += `</div>`;
        }

        return `
            <div class="report-popup" id="popup-${report.id}">
                ${imagesHtml}
                <p>${report.descText}</p>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 5px;">Báo cáo lúc: ${report.timeString}</p>
                <div style="display:flex; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <button class="btn-sm btn-edit" onclick="window.editReport('${report.id}')">Chỉnh sửa</button>
                    <button class="btn-sm btn-delete" onclick="window.deleteReport('${report.id}')">Xóa</button>
                </div>
            </div>
        `;
    }

    // Lightbox Functions
    window.openLightbox = function(reportId, startIndex) {
        const report = reports.find(r => r.id === reportId);
        if (!report || report.images.length === 0) return;
        
        currentLightboxImages = report.images;
        currentLightboxIndex = startIndex;
        updateLightboxView();
        lightboxModal.classList.remove('hidden');
    };

    function updateLightboxView() {
        if (currentLightboxImages.length === 0) return;
        lightboxImg.src = currentLightboxImages[currentLightboxIndex];
        lightboxCounter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;
        
        if (currentLightboxImages.length <= 1) {
            lightboxPrev.style.display = 'none';
            lightboxNext.style.display = 'none';
        } else {
            lightboxPrev.style.display = 'block';
            lightboxNext.style.display = 'block';
        }
    }

    lightboxClose.addEventListener('click', () => {
        lightboxModal.classList.add('hidden');
    });
    
    lightboxPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
        updateLightboxView();
    });

    lightboxNext.addEventListener('click', (e) => {
        e.stopPropagation();
        currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
        updateLightboxView();
    });
    
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal) {
            lightboxModal.classList.add('hidden');
        }
    });

    // Attach to window so onclick can call it
    window.editReport = function(id) {
        const report = reports.find(r => r.id === id);
        if (!report) return;
        
        // Close the popup so it doesn't block the screen
        report.marker.togglePopup();
        
        editingReportId = id;
        currentReportLocation = report.location;
        currentReportImages = [...report.images]; // Copy array
        
        // Populate modal
        reportDesc.value = report.descText;
        renderUploadPreviews();
        
        locationStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Đang chỉnh sửa báo cáo`;
        locationStatus.className = 'location-status success';
        
        btnSubmitReport.textContent = 'Cập nhật';
        btnSubmitReport.disabled = false;
        
        reportModal.classList.remove('hidden');
    };

    window.deleteReport = function(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa báo cáo này không?')) return;
        
        const index = reports.findIndex(r => r.id === id);
        if (index > -1) {
            // Remove marker from map
            reports[index].marker.remove();
            // Remove from array
            reports.splice(index, 1);
            saveReportsToStorage();
        }
    };

    window.removePreviewImage = function(index) {
        currentReportImages.splice(index, 1);
        renderUploadPreviews();
        checkSubmitReady();
    };

    function renderUploadPreviews() {
        if (currentReportImages.length === 0) {
            imagePreviewContainer.classList.add('hidden');
            uploadPlaceholder.style.display = 'flex';
            imagePreviewContainer.innerHTML = '';
        } else {
            imagePreviewContainer.classList.remove('hidden');
            uploadPlaceholder.style.display = 'none';
            
            let html = '';
            currentReportImages.forEach((imgSrc, idx) => {
                html += `
                    <div class="preview-thumbnail-wrapper">
                        <img src="${imgSrc}" alt="Preview">
                        <button class="btn-remove-image" onclick="event.stopPropagation(); window.removePreviewImage(${idx})">✕</button>
                    </div>
                `;
            });
            imagePreviewContainer.innerHTML = html;
        }
    }

    function openReportModal() {
        reportModal.classList.remove('hidden');
        resetReportForm();
        
        // Get Location
        fetchUserLocation();
    }

    function fetchUserLocation() {
        locationStatus.innerHTML = '<span class="spinner-small"></span> Đang lấy vị trí hiện tại...';
        locationStatus.className = 'location-status';
        btnSubmitReport.disabled = true;

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentReportLocation = [position.coords.longitude, position.coords.latitude];
                    locationStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> Đã lấy vị trí thành công`;
                    locationStatus.className = 'location-status success';
                    checkSubmitReady();
                },
                (error) => {
                    locationStatus.innerHTML = `
                        <div style="display:flex; align-items:center; justify-content:space-between; width:100%">
                            <div style="display:flex; align-items:center; gap: 4px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2z"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                <span>Lỗi định vị. Vui lòng bật vị trí.</span>
                            </div>
                            <button class="btn-sm btn-secondary" style="padding:0.25rem 0.5rem; flex:none" onclick="window.fetchUserLocation()">Thử lại</button>
                        </div>
                    `;
                    locationStatus.className = 'location-status error';
                },
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
            );
        } else {
            locationStatus.innerHTML = 'Trình duyệt không hỗ trợ lấy vị trí';
            locationStatus.className = 'location-status error';
        }
    }
    
    // Bind to window for inline onclick
    window.fetchUserLocation = fetchUserLocation;

    function closeReportModal() {
        reportModal.classList.add('hidden');
    }

    function resetReportForm() {
        currentReportLocation = null;
        currentReportImages = [];
        editingReportId = null;
        reportDesc.value = '';
        reportImage.value = '';
        renderUploadPreviews();
        locationStatus.innerHTML = '<span class="spinner-small"></span> Đang lấy vị trí hiện tại...';
        locationStatus.className = 'location-status';
        btnSubmitReport.textContent = 'Gửi Báo Cáo';
        btnSubmitReport.disabled = true;
    }

    function checkSubmitReady() {
        if (currentReportLocation && currentReportImages.length > 0) {
            btnSubmitReport.disabled = false;
        } else {
            btnSubmitReport.disabled = true;
        }
    }

    btnReport.addEventListener('click', openReportModal);
    btnCloseModal.addEventListener('click', closeReportModal);
    btnCancelReport.addEventListener('click', closeReportModal);

    // Image Upload
    imageUploadArea.addEventListener('click', () => {
        reportImage.click();
    });

    reportImage.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            let loadedCount = 0;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(event) {
                    currentReportImages.push(event.target.result);
                    loadedCount++;
                    if (loadedCount === files.length) {
                        renderUploadPreviews();
                        checkSubmitReady();
                    }
                };
                reader.readAsDataURL(file);
            });
            // Reset input so same files can be selected again if needed
            reportImage.value = '';
        }
    });

    // Submit Report
    btnSubmitReport.addEventListener('click', () => {
        if (!currentReportLocation || currentReportImages.length === 0) return;

        const descText = reportDesc.value.trim() || 'Không có mô tả';
        const now = new Date();
        
        if (editingReportId) {
            // Edit Mode
            const report = reports.find(r => r.id === editingReportId);
            if (report) {
                report.images = [...currentReportImages];
                report.descText = descText;
                
                // Update popup content
                report.marker.getPopup().setHTML(renderPopupContent(report));
            }
            alert('Đã cập nhật báo cáo thành công!');
        } else {
            // Create Mode
            const reportId = 'report-' + now.getTime();
            const timeString = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString('vi-VN');
            
            const newReport = {
                id: reportId,
                location: currentReportLocation,
                images: [...currentReportImages],
                descText: descText,
                timeString: timeString,
                marker: null
            };

            // Create custom marker element
            const el = document.createElement('div');
            el.className = 'custom-marker';

            // Create popup
            const popup = new mapboxgl.Popup({ offset: 25, className: 'custom-report-popup' })
                .setHTML(renderPopupContent(newReport));

            // Add marker to map and make it draggable
            newReport.marker = new mapboxgl.Marker({ element: el, draggable: true })
                .setLngLat(currentReportLocation)
                .setPopup(popup)
                .addTo(map);
                
            newReport.marker.on('dragend', () => {
                const lngLat = newReport.marker.getLngLat();
                newReport.location = [lngLat.lng, lngLat.lat];
                saveReportsToStorage();
            });
                
            reports.push(newReport);
            saveReportsToStorage();
            
            map.flyTo({
                center: currentReportLocation,
                zoom: 16,
                essential: true
            });
            alert('Cảm ơn! Báo cáo của bạn đã được ghi nhận và ghim lên bản đồ.');
        }

        // Close modal and reset
        closeReportModal();
    });
});
