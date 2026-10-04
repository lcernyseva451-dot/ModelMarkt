// ============================================
// static/js/map.js — Яндекс Карты
// ============================================

let myMap = null;
let markers = [];
let currentBuilding = null;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadLostBuildings();
});

// === Инициализация карты ===
function initMap() {
    ymaps.ready(function () {
        myMap = new ymaps.Map('map', {
            center: [54.6295, 39.7362],
            zoom: 14,
            controls: ['zoomControl', 'fullscreenControl']
        }, {
            searchControlProvider: 'yandex#search'
        });

        myMap.events.add('click', function () {
            closeSidebar();
        });

        console.log('Yandex Map initialized successfully');
    });
}

// === Загрузка утраченных зданий ===
async function loadLostBuildings() {
    showLoading(true);
    try {
        const res = await fetch('/api/lost-buildings');
        const buildings = await res.json();
        addMarkers(buildings);
        updateStats(buildings);
    } catch (err) {
        console.error('Failed to load lost buildings:', err);
    } finally {
        showLoading(false);
    }
}

// === Добавление маркеров на карту ===
function addMarkers(buildings) {
    markers.forEach(m => myMap.geoObjects.remove(m));
    markers = [];

    buildings.forEach(b => {
        let iconColor = '#f59e0b';
        if (b.is_verified) iconColor = '#22c55e';
        if (b.models_3d_count > 0) iconColor = '#a855f7';

        const placemark = new ymaps.Placemark([b.latitude, b.longitude], {
            balloonContentHeader: `<h3>${escapeHtml(b.name)}</h3>`,
            balloonContentBody: `<p class="popup-era">${escapeHtml(b.era)} · ${escapeHtml(b.year_destroyed)}</p>
                                <p class="popup-cause"><strong>Причина:</strong> ${escapeHtml(b.destruction_cause)}</p>
                                <p class="popup-desc">${escapeHtml(b.description ? b.description.substring(0, 150) : '')}...</p>
                                ${b.models_3d_count > 0 ? '<p class="popup-3d">✅ Есть 3D-модель</p>' : ''}`,
            hintContent: b.name,
            iconColor: iconColor
        }, {
            preset: 'islands#circleIcon',
            iconColor: iconColor
        });

        placemark.events.add('click', function () {
            openSidebar(b);
        });

        myMap.geoObjects.add(placemark);
        markers.push(placemark);
    });
}

// === Открытие сайдбара с деталями ===
async function openSidebar(building) {
    currentBuilding = building;
    const sidebar = document.getElementById('map-sidebar');

    showLoading(true);

    try {
        const res = await fetch(`/api/lost-buildings/${building.id}`);
        const data = await res.json();

        sidebar.innerHTML = `
            <div class="sidebar-building">
                <button class="btn btn-close-sidebar" onclick="closeSidebar()">✕</button>

                <div class="building-title-section">
                    <h2>${escapeHtml(building.name)}</h2>
                    ${building.is_verified ? '<span class="verified-badge">✅ Проверено</span>' : '<span class="unverified-badge">⏳ Ожидает проверки</span>'}
                </div>

                <div class="building-meta">
                    <div class="meta-row">
                        <span class="meta-label">📍 Адрес:</span>
                        <span class="meta-value">${escapeHtml(building.address)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">📅 Эпоха:</span>
                        <span class="meta-value">${escapeHtml(building.era)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">🏗️ Построено:</span>
                        <span class="meta-value">${escapeHtml(building.year_built)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">💥 Утрачено:</span>
                        <span class="meta-value">${escapeHtml(building.year_destroyed)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">❌ Причина:</span>
                        <span class="meta-value">${escapeHtml(building.destruction_cause)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">👤 Архитектор:</span>
                        <span class="meta-value">${escapeHtml(building.architect || 'Неизвестен')}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">🎨 Стиль:</span>
                        <span class="meta-value">${escapeHtml(building.style)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">🏢 Этажность:</span>
                        <span class="meta-value">${building.floors || 'Неизвестно'}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">🧱 Материалы:</span>
                        <span class="meta-value">${escapeHtml(building.materials || 'Неизвестно')}</span>
                    </div>
                </div>

                <div class="building-section">
                    <h3>📖 Историческая справка</h3>
                    <p>${escapeHtml(building.historical_spravka)}</p>
                </div>

                <div class="building-section">
                    <h3>📝 Описание</h3>
                    <p>${escapeHtml(building.description)}</p>
                </div>

                ${data.restoration_source ? `
                <div class="building-section">
                    <h3>🔄 Источник восстановления 3D-модели</h3>
                    <p>${escapeHtml(data.restoration_source)}</p>
                </div>
                ` : ''}

                ${data.models_3d && data.models_3d.length > 0 ? `
                <div class="building-section">
                    <h3>🎮 3D-модели восстановления</h3>
                    <div class="models-grid">
                        ${data.models_3d.map(m => `
                            <div class="model-card" onclick="openLostBuildingViewer(${m.id}, '${escapeHtml(m.name)}')">
                                <div class="model-preview">${m.file_type.toUpperCase()}</div>
                                <div class="model-info">
                                    <h3>${escapeHtml(m.name)}</h3>
                                    <p>${(m.file_size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="building-stats">
                    <span>👁️ Просмотров: ${building.views_count || 0}</span>
                </div>
            </div>
        `;

        sidebar.style.display = 'block';

    } catch (err) {
        console.error('Failed to load building detail:', err);
        sidebar.innerHTML = '<p class="error">Ошибка загрузки данных</p>';
        sidebar.style.display = 'block';
    } finally {
        showLoading(false);
    }
}

// === Закрыть сайдбар ===
function closeSidebar() {
    const sidebar = document.getElementById('map-sidebar');
    if (sidebar) {
        sidebar.innerHTML = `
            <div class="sidebar-placeholder">
                <p>👆 Нажмите на маркер на карте</p>
            </div>
        `;
        sidebar.style.display = 'none';
    }
    currentBuilding = null;
}

// === Открыть детальную страницу здания ===
function openBuildingDetail(buildingId) {
    window.location.href = `/building/lost-${buildingId}`;
}

// === Открыть 3D-вьюер для утраченного здания ===
function openLostBuildingViewer(modelId, modelName) {
    showLoading(true);
    
    try {
        const sidebar = document.getElementById('map-sidebar');
        sidebar.innerHTML = `
            <div class="sidebar-building">
                <button class="btn btn-close-sidebar" onclick="closeSidebar()">✕</button>
                <div class="building-title-section">
                    <h2>${escapeHtml(modelName)}</h2>
                </div>
                <div id="lost-3d-container" style="width:100%;height:400px;background:#0a0a0a;border-radius:8px;margin:16px 0;"></div>
                <p style="color:var(--text-muted);text-align:center;">Используйте мышь для вращения и масштабирования модели</p>
            </div>
        `;
        sidebar.style.display = 'block';
        
        // Загружаем Three.js и модель
        loadLost3DModel(`/api/models/${modelId}/file?filename=`, modelId);
    } catch (err) {
        console.error('Failed to open 3D viewer:', err);
        showLoading(false);
    }
}

// === Загрузка 3D-модели для утраченного здания ===
function loadLost3DModel(url, modelId) {
    const container = document.getElementById('lost-3d-container');
    if (!container) return;
    
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Загрузка 3D-модели...</p>';
    
    // Проверяем, загружен ли Three.js
    if (typeof THREE === 'undefined') {
        // Загружаем Three.js динамически
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => loadLost3DModel(url, modelId);
        document.head.appendChild(script);
        return;
    }
    
    // Загружаем загрузчики
    Promise.all([
        new Promise((resolve) => {
            if (typeof THREE.STLLoader !== 'undefined') resolve();
            else {
                const s = document.createElement('script');
                s.src = '/static/js/STLLoader.js';
                s.onload = resolve;
                document.head.appendChild(s);
            }
        })
    ]).then(() => {
        // Создаём сцену
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a0a);
        
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;
        
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
        camera.position.set(5, 5, 5);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        
        // Освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        scene.add(directionalLight);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-10, -10, -10);
        scene.add(directionalLight2);
        
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        scene.add(gridHelper);
        
        // Определяем тип файла по modelId (упрощённо)
        const fileType = 'stl'; // По умолчанию, в реальности нужно получать из API
        
        const loader = getLoaderForLostModel(fileType);
        if (!loader) {
            container.innerHTML = '<p style="color:var(--error);text-align:center;padding:20px;">Формат файла не поддерживается</p>';
            return;
        }
        
        loader.load(url, (geometry) => {
            const material = new THREE.MeshPhongMaterial({ 
                color: 0x6366f1, 
                specular: 0x111111, 
                shininess: 200,
                side: THREE.DoubleSide 
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            mesh.position.sub(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim;
            mesh.scale.multiplyScalar(scale);
            
            scene.add(mesh);
            
            const newBox = new THREE.Box3().setFromObject(mesh);
            const newSize = newBox.getSize(new THREE.Vector3());
            const newMaxDim = Math.max(newSize.x, newSize.y, newSize.z);
            camera.position.set(newMaxDim * 1.5, newMaxDim * 1.2, newMaxDim * 1.5);
            controls.target.set(0, 0, 0);
            controls.update();
            
            // Анимация
            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            }
            animate();
        }, undefined, (error) => {
            console.error('Error loading 3D model:', error);
            container.innerHTML = '<p style="color:var(--error);text-align:center;padding:20px;">Ошибка загрузки модели</p>';
        });
    });
}

function getLoaderForLostModel(fileType) {
    if (fileType.toLowerCase() === 'stl' && typeof THREE.STLLoader === 'function') {
        return new THREE.STLLoader();
    }
    return null;
}

// === Фильтрация маркеров ===
async function filterMap() {
    const era = document.getElementById('filter-era').value;
    const cause = document.getElementById('filter-cause').value;

    let url = '/api/lost-buildings?';
    if (era) url += `era=${encodeURIComponent(era)}&`;
    if (cause) url += `cause=${encodeURIComponent(cause)}&`;

    showLoading(true);
    try {
        const res = await fetch(url);
        const buildings = await res.json();
        addMarkers(buildings);
    } catch (err) {
        console.error('Filter failed:', err);
    } finally {
        showLoading(false);
    }
}

// === Сбросить фильтры ===
async function resetFilters() {
    document.getElementById('filter-era').value = '';
    document.getElementById('filter-cause').value = '';
    await loadLostBuildings();
}

// === Обновление статистики ===
function updateStats(buildings) {
    const totalViews = buildings.reduce((sum, b) => sum + (b.views_count || 0), 0);
    const with3D = buildings.filter(b => b.models_3d_count > 0).length;
    console.log(`📊 Всего зданий: ${buildings.length}, с 3D: ${with3D}, просмотров: ${totalViews}`);
}

// === Утилиты ===
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === Глобальные функции ===
window.openLostBuildingViewer = openLostBuildingViewer;
window.closeSidebar = closeSidebar;
window.filterMap = filterMap;
window.resetFilters = resetFilters;
