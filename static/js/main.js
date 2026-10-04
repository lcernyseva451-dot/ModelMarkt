// === Глобальное состояние ===
let currentUser = null;
let token = localStorage.getItem('token');
let scene, camera, renderer, controls, currentModel;

// === Инициализация ===
document.addEventListener('DOMContentLoaded', () => {
    if (token) checkAuth();
    setupEventListeners();
    loadRegions();
    loadBuildings();
    loadStats();
    
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        token = null;
        currentUser = null;
        updateAuthUI(false);
        window.location.href = '/';
    });
    
    document.getElementById('close-viewer')?.addEventListener('click', closeViewer);
});

// === Аутентификация ===
async function checkAuth() {
    try {
        const res = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok || res.status === 422) {
            localStorage.removeItem('token');
            token = null;
            currentUser = null;
            updateAuthUI(false);
        } else {
            const data = await res.json();
            if (res.status === 401 || res.status === 404) {
                localStorage.removeItem('token');
                token = null;
                currentUser = null;
                updateAuthUI(false);
            }
        }
    } catch (err) {
        localStorage.removeItem('token');
        token = null;
        currentUser = null;
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const usernameDisplay = document.getElementById('username-display');

    if (isLoggedIn && currentUser) {
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            usernameDisplay.textContent = currentUser.username;
        }
    } else {
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
    }
}

// === Загрузка регионов ===
async function loadRegions() {
    try {
        const res = await fetch('/api/regions');
        const regions = await res.json();
        const grid = document.querySelector('.regions-grid');
        if (!grid) return;

        if (regions.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Регионов пока нет. Добавьте через админку.</p>';
            return;
        }

        grid.innerHTML = regions.map(region => `
            <div class="region-card" onclick="window.location.href='/region/${region.slug}'">
                <div class="region-icon">🏛️</div>
                <h3>${region.name}</h3>
                <p>${region.description ? region.description.substring(0, 100) + (region.description.length > 100 ? '...' : '') : 'Описание отсутствует'}</p>
                <span class="region-badge">${region.buildings_count || 0} зданий</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load regions:', err);
    }
}

// === Загрузка зданий ===
async function loadBuildings() {
    try {
        const res = await fetch('/api/buildings');
        const buildings = await res.json();
        const grid = document.getElementById('buildings-grid');
        if (!grid) return;

        if (buildings.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <div class="icon">🏘️</div>
                    <h3>Зданий пока нет</h3>
                    <p>Добавьте исторические здания через админку</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = buildings.map(building => `
            <div class="model-card" onclick="window.location.href='/building/${building.slug}'">
                <div class="model-preview">🏛️</div>
                <div class="model-info">
                    <h3>${building.name}</h3>
                    <p>${building.description ? building.description.substring(0, 100) + (building.description.length > 100 ? '...' : '') : 'Без описания'}</p>
                    <span class="model-type">${building.region_name || ''}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load buildings:', err);
    }
}

// === Загрузка статистики ===
async function loadStats() {
    try {
        const regionsEl = document.getElementById('stat-regions');
        const buildingsEl = document.getElementById('stat-buildings');
        const modelsEl = document.getElementById('stat-models');
        const viewsEl = document.getElementById('stat-views');
        
        if (!regionsEl && !buildingsEl) return;
        
        if (regionsEl) {
            const res = await fetch('/api/regions');
            const regions = await res.json();
            regionsEl.textContent = regions.length;
        }
        
        if (buildingsEl) {
            const buildingsRes = await fetch('/api/buildings');
            const buildings = await buildingsRes.json();
            buildingsEl.textContent = buildings.length;
        }
        
        if (modelsEl) modelsEl.textContent = '0';
        if (viewsEl) {
            const buildingsRes = await fetch('/api/buildings');
            const buildings = await buildingsRes.json();
            viewsEl.textContent = buildings.reduce((sum, b) => sum + (b.views_count || 0), 0);
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// === Поиск зданий ===
function searchBuildings() {
    const query = document.getElementById('search-input').value;
    if (!query) return;
    fetch(`/api/buildings?search=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(buildings => {
            const grid = document.getElementById('buildings-grid');
            if (!grid) return;
            if (buildings.length === 0) {
                grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Ничего не найдено</p>';
                return;
            }
            grid.innerHTML = buildings.map(building => `
                <div class="model-card" onclick="window.location.href='/building/${building.slug}'">
                    <div class="model-preview">🏛️</div>
                    <div class="model-info">
                        <h3>${building.name}</h3>
                        <p>${building.description ? building.description.substring(0, 100) : ''}</p>
                        <span class="model-type">${building.region_name || ''}</span>
                    </div>
                </div>
            `).join('');
        });
}

// === 3D Viewer ===
async function openViewer(modelId) {
    showLoading(true);

    try {
        const res = await fetch(`/api/models/${modelId}`);
        const model = await res.json();

        const viewerContainer = document.getElementById('viewer-container');
        const modelsGrid = document.getElementById('models-grid');
        const headerSection = document.querySelector('.header-section');

        if (viewerContainer) viewerContainer.style.display = 'block';
        if (modelsGrid) modelsGrid.style.display = 'none';
        if (headerSection) headerSection.style.display = 'none';

        document.getElementById('viewer-title').textContent = model.name;
        document.getElementById('viewer-info').innerHTML = `
            <p>Тип: <strong>${model.file_type.toUpperCase()}</strong></p>
            <p>Размер: ${(model.file_size / 1024).toFixed(1)} KB</p>
            <p>${model.description || ''}</p>
        `;

        await load3DModel(`/api/models/${modelId}/file?filename=${encodeURIComponent(model.filename)}`, model.file_type);

    } catch (err) {
        console.error('Failed to load model:', err);
        alert('Ошибка загрузки модели');
    } finally {
        showLoading(false);
    }
}



function closeViewer() {
    const viewerContainer = document.getElementById('viewer-container');
    const modelsGrid = document.getElementById('models-grid');
    const headerSection = document.querySelector('.header-section');

    if (viewerContainer) viewerContainer.style.display = 'none';
    if (modelsGrid) modelsGrid.style.display = 'grid';
    if (headerSection) headerSection.style.display = 'block';

    if (renderer) {
        renderer.dispose();
        const container = document.getElementById('canvas-container');
        container.innerHTML = '';
        renderer = null;
    }
    currentModel = null;
}

// === Three.js ===
function load3DModel(url, fileType) {
    const container = document.getElementById('canvas-container');
    container.innerHTML = '';

    // Убедимся что контейнер видим для получения размеров
    const wasHidden = container.style.display === 'none';
    container.style.display = 'block';
    container.style.height = '600px';

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    camera = new THREE.PerspectiveCamera(
        75,
        width / height,
        0.1,
        10000
    );
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

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

    currentModel = null;

    const loader = getLoader(fileType, container, url);
    if (!loader) return;

    // STLLoader работает иначе — возвращает Geometry, а не Object3D
    if (fileType.toLowerCase() === 'stl') {
        console.log('=== Loading STL ===');
        console.log('URL:', url);
        console.log('STLLoader type:', typeof THREE.STLLoader);
        console.log('STLLoader:', THREE.STLLoader);
        
        if (typeof THREE.STLLoader !== 'function') {
            container.innerHTML = '<p style="color:#ef4444;padding:20px;text-align:center;">STLLoader не загружен</p>';
            return;
        }
        
        loader.load(url, (geometry) => {
            console.log('=== Geometry loaded ===');
            console.log('Geometry:', geometry);
            console.log('Position attribute:', geometry.attributes.position);
            console.log('Vertex count:', geometry.attributes.position ? geometry.attributes.position.count : 0);
            
            if (!geometry || !geometry.attributes.position || geometry.attributes.position.count === 0) {
                container.innerHTML = '<p style="color:#ef4444;padding:20px;text-align:center;">Ошибка: геометрия пуста</p>';
                return;
            }
            
            console.log('Creating mesh...');
            const material = new THREE.MeshPhongMaterial({ 
                color: 0x6366f1, 
                specular: 0x111111, 
                shininess: 200,
                side: THREE.DoubleSide 
            });
            const mesh = new THREE.Mesh(geometry, material);
            console.log('Mesh created:', mesh);
            
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            mesh.position.sub(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim;
            mesh.scale.multiplyScalar(scale);
            
            currentModel = mesh;
            scene.add(mesh);
            
            // Пересчитываем bounding box ПОСЛЕ масштабирования
            const newBox = new THREE.Box3().setFromObject(mesh);
            const newSize = newBox.getSize(new THREE.Vector3());
            const newMaxDim = Math.max(newSize.x, newSize.y, newSize.z);
            camera.position.set(newMaxDim * 1.0, newMaxDim * 0.8, newMaxDim * 1.0);
            controls.target.set(0, 0, 0);
            controls.update();
            console.log('Model scaled and positioned correctly!');
        }, (progress) => {
            console.log('Progress:', progress.loaded, 'of', progress.total);
        }, (error) => {
            console.error('=== STL Load Error ===');
            console.error(error);
            container.innerHTML = '<p style="color:#ef4444;padding:20px;text-align:center;">Ошибка: ' + (error.message || 'Неизвестная ошибка') + '</p>';
        });
    } else {
        loader.load(url, (object) => {
            currentModel = object;
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            object.position.sub(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim;
            object.scale.multiplyScalar(scale);
            scene.add(object);

            // Пересчитываем камеру ПОСЛЕ масштабирования
            const newBox = new THREE.Box3().setFromObject(object);
            const newSize = newBox.getSize(new THREE.Vector3());
            const newMaxDim = Math.max(newSize.x, newSize.y, newSize.z);
            camera.position.set(newMaxDim * 1.0, newMaxDim * 0.8, newMaxDim * 1.0);
            controls.target.set(0, 0, 0);
            controls.update();
        }, undefined, (error) => {
            console.error('Error loading 3D model:', error);
            container.innerHTML = '<p style="color:#ef4444;padding:20px;text-align:center;">Ошибка загрузки модели.</p>';
        });
    }

    function animate() {
        requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }
    animate();

    window.addEventListener('resize', onWindowResize);
}

function getLoader(fileType, container, url) {
    switch (fileType.toLowerCase()) {
        case 'obj':
            return new THREE.OBJLoader();
        case 'glb':
        case 'gltf':
            return new THREE.GLTFLoader();
        case 'fbx':
            return new THREE.FBXLoader();
        case 'stl':
            if (typeof THREE.STLLoader === 'function') {
                return new THREE.STLLoader();
            }
            console.warn('STLLoader not loaded');
            return null;
        case 'step':
        case 'stp':
            if (container && url) {
                container.innerHTML = `
                    <div style="padding:60px 40px;text-align:center;background:linear-gradient(135deg, #1e293b, #0f172a);min-height:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                        <div style="font-size:5rem;margin-bottom:24px;">📐</div>
                        <h2 style="margin-bottom:16px;font-size:1.8rem;color:#f1f5f9;">CAD формат STEP</h2>
                        <p style="color:var(--text-muted);font-size:1.1rem;margin-bottom:32px;max-width:500px;line-height:1.6;">
                            Этот формат не поддерживается для просмотра в браузере, но вы можете скачать модель для открытия в CAD-программах (SolidWorks, Fusion 360, FreeCAD и др.)
                        </p>
                        <a href="${url}" download style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg, #6366f1, #4f46e5);color:white;border-radius:12px;font-size:1.1rem;font-weight:600;text-decoration:none;transition:all 0.3s;box-shadow:0 4px 16px rgba(99,102,241,0.3);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 24px rgba(99,102,241,0.4)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 16px rgba(99,102,241,0.3)'">
                            ⬇️ Скачать STEP-модель
                        </a>
                        <p style="margin-top:24px;color:var(--text-muted);font-size:0.9rem;">
                            Совместимо с: SolidWorks, Fusion 360, FreeCAD, AutoCAD, CATIA
                        </p>
                    </div>
                `;
            }
            return null;
        default:
            alert('Формат ' + fileType + ' не поддерживается');
            return null;
    }
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container || !camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// === Утилиты ===
function showLoading(show) {
    const overlay = document.getElementById('loading');
    if (overlay) {
        if (show) overlay.classList.add('show');
        else overlay.classList.remove('show');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupEventListeners() {
    const fileInput = document.getElementById('model-file');
    const fileName = document.getElementById('file-name');
    fileInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileName.textContent = e.target.files[0].name;
        }
    });
}

// === Отслеживание кликов по рекламе ===
function trackAdClick(adId) {
    const token = localStorage.getItem('token');
    fetch(`/api/ads/${adId}/track`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    }).catch(err => console.error('Ad track failed:', err));
}

// === Аудио-перевод (Text-to-Speech) ===
let speechUtterance = null;

function speakText(text, lang) {
    if (!('speechSynthesis' in window)) {
        document.getElementById('audio-status').textContent = 'Ваш браузер не поддерживает аудио-синтез';
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    const langMap = {
        'en': 'en-US',
        'fr': 'fr-FR',
        'zh': 'zh-CN'
    };
    
    utterance.lang = langMap[lang] || lang;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const statusEl = document.getElementById('audio-status');
    if (statusEl) {
        const langNames = { en: 'English', fr: 'Français', zh: '中文' };
        statusEl.textContent = `🔊 Воспроизведение: ${langNames[lang] || lang}...`;
    }

    utterance.onend = () => {
        if (statusEl) statusEl.textContent = '✅ Воспроизведение завершено';
    };

    utterance.onerror = (e) => {
        if (statusEl) statusEl.textContent = '❌ Ошибка воспроизведения';
        console.error('Speech error:', e);
    };

    window.speechUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
    window.speechSynthesis.cancel();
    const statusEl = document.getElementById('audio-status');
    if (statusEl) statusEl.textContent = '⏹ Воспроизведение остановлено';
}

// === Закрытие сайдбара на карте ===
function closeSidebar() {
    const sidebar = document.getElementById('map-sidebar');
    if (sidebar) {
        sidebar.innerHTML = '<div class="sidebar-placeholder"><p>👆 Нажмите на маркер на карте</p></div>';
    }
}

// === Заполнение select регионов для утраченных зданий ===
function populateLostRegionSelects(regions) {
    const select = document.getElementById('lost-region');
    if (!select) return;

    select.innerHTML = '<option value="">Выберите регион</option>' +
        regions.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
}

// === Глобальные функции ===
window.openViewer = openViewer;
window.searchBuildings = searchBuildings;
window.trackAdClick = trackAdClick;
window.speakText = speakText;
window.stopSpeaking = stopSpeaking;
window.closeSidebar = closeSidebar;
window.populateLostRegionSelects = populateLostRegionSelects;
