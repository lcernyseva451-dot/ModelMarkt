// === Админ-панель ===

let token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    loadAdminModels();
    loadAdminRegions();
    loadAdminBuildings();
    loadAdminLostBuildings();
    loadAdminStats();
    loadAdminUsers();
    setupUploadForm();
    setupRegionForm();
    setupBuildingForm();
    setupLostForm();
    setupEventListeners();
});

// === Утраченные здания ===
async function loadAdminLostBuildings() {
    try {
        const res = await fetch('/api/admin/lost-buildings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const buildings = await res.json();
        renderAdminLostBuildings(buildings);
    } catch (err) {
        console.error('Failed to load lost buildings:', err);
    }
}

function renderAdminLostBuildings(buildings) {
    const list = document.getElementById('admin-lost-buildings-list');
    if (!list) return;

    if (buildings.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">🏚️</div><h3>Утраченных зданий пока нет</h3></div>';
        return;
    }

    list.innerHTML = buildings.map(b => `
        <div class="model-list-item">
            <div class="info">
                <h3>${escapeHtml(b.name)}</h3>
                <p>${escapeHtml(b.city)} · ${escapeHtml(b.era)} · ${escapeHtml(b.destruction_cause)}</p>
            </div>
        </div>
    `).join('');
}

async function setupLostForm() {
    const form = document.getElementById('lost-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById('lost-name').value.trim(),
            slug: document.getElementById('lost-slug').value.trim(),
            city: document.getElementById('lost-city').value.trim(),
            region_id: document.getElementById('lost-region').value ? parseInt(document.getElementById('lost-region').value) : null,
            address: document.getElementById('lost-address').value.trim(),
            latitude: parseFloat(document.getElementById('lost-lat').value) || 0,
            longitude: parseFloat(document.getElementById('lost-lon').value) || 0,
            era: document.getElementById('lost-era').value.trim(),
            year_built: document.getElementById('lost-year-built').value.trim(),
            year_destroyed: document.getElementById('lost-year-destroyed').value.trim(),
            destruction_cause: document.getElementById('lost-cause').value.trim(),
            style: document.getElementById('lost-style').value.trim(),
            architect: document.getElementById('lost-architect').value.trim(),
            floors: parseInt(document.getElementById('lost-floors').value) || 0,
            materials: document.getElementById('lost-materials').value.trim(),
            description: document.getElementById('lost-desc').value.trim(),
            historical_spravka: document.getElementById('lost-spravka').value.trim(),
            restoration_source: document.getElementById('lost-source').value.trim(),
            is_verified: document.getElementById('lost-verified').checked
        };

        try {
            const res = await fetch('/api/admin/lost-buildings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                alert('Здание добавлено!');
                form.reset();
                loadAdminLostBuildings();
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка');
            }
        } catch (err) {
            alert('Ошибка соединения');
        }
    });
}

// === Аутентификация ===
async function checkAdminAccess() {
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        const res = await fetch('/api/check-admin', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            localStorage.removeItem('token');
            token = null;
            window.location.href = '/login';
            return;
        }

        const data = await res.json();

        if (!data.is_admin) {
            alert('Доступ запрещён. Только для администраторов.');
            window.location.href = '/';
            return;
        }

        const userRes = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (userRes.ok) {
            currentUser = await userRes.json();
            updateAuthUI(true);
        }
    } catch (err) {
        console.error('Admin check failed:', err);
        window.location.href = '/login';
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

// === Табы админки ===
function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`tab-${tabName}`).style.display = 'block';
    event.target.classList.add('active');
}

// === Статистика ===
async function loadAdminStats() {
    try {
        const res = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const stats = await res.json();
            document.getElementById('admin-stat-users').textContent = stats.users || 0;
            document.getElementById('admin-stat-regions').textContent = stats.regions || 0;
            document.getElementById('admin-stat-buildings').textContent = stats.historic_buildings || 0;
            document.getElementById('admin-stat-3d').textContent = stats.models_3d || 0;
            document.getElementById('admin-stat-views').textContent = stats.lost_buildings || 0;
            document.getElementById('admin-stat-premium').textContent = stats.subscriptions || 0;
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// === 3D Модели ===
async function loadAdminModels() {
    try {
        const res = await fetch('/api/models');
        const models = await res.json();
        renderAdminModels(models);
    } catch (err) {
        console.error('Failed to load models:', err);
    }
}

function renderAdminModels(models) {
    const list = document.getElementById('admin-models-list');
    if (!list) return;

    if (models.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">📦</div><h3>Моделей пока нет</h3></div>';
        return;
    }

    list.innerHTML = models.map(model => `
        <div class="model-list-item">
            <div class="info">
                <h3>${escapeHtml(model.name)}</h3>
                <p>
                    <span class="model-type">${model.file_type.toUpperCase()}</span>
                    ${model.description ? `— ${escapeHtml(model.description)}` : ''}
                    — ${(model.file_size / 1024).toFixed(1)} KB
                </p>
            </div>
            <button class="btn btn-danger btn-sm" onclick="deleteModel(${model.id})">Удалить</button>
        </div>
    `).join('');
}

async function deleteModel(modelId) {
    if (!confirm('Удалить модель?')) return;

    try {
        const res = await fetch(`/api/models/${modelId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            alert('Модель удалена');
            loadAdminModels();
        } else {
            const data = await res.json();
            alert(data.error || 'Ошибка удаления');
        }
    } catch (err) {
        alert('Ошибка соединения');
    }
}

// === Регионы ===
async function loadAdminRegions() {
    try {
        const res = await fetch('/api/admin/regions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const regions = await res.json();
        renderAdminRegions(regions);
        populateRegionSelects(regions);
    } catch (err) {
        console.error('Failed to load regions:', err);
    }
}

function renderAdminRegions(regions) {
    const list = document.getElementById('admin-regions-list');
    if (!list) return;

    if (regions.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">🗺️</div><h3>Регионов пока нет</h3></div>';
        return;
    }

    list.innerHTML = regions.map(r => `
        <div class="model-list-item">
            <div class="info">
                <h3>${escapeHtml(r.name)}</h3>
                <p>${escapeHtml(r.description?.substring(0, 100))}... — ${r.buildings_count} зданий</p>
            </div>
        </div>
    `).join('');
}

function populateRegionSelects(regions) {
    const buildingSelect = document.getElementById('building-region');
    if (buildingSelect) {
        buildingSelect.innerHTML = '<option value="">Выберите регион</option>' +
            regions.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
    }

    const lostSelect = document.getElementById('lost-region');
    if (lostSelect) {
        lostSelect.innerHTML = '<option value="">Выберите регион</option>' +
            regions.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
    }
}

async function setupRegionForm() {
    const form = document.getElementById('region-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById('region-name').value.trim(),
            slug: document.getElementById('region-slug').value.trim(),
            description: document.getElementById('region-desc').value.trim(),
            capital: document.getElementById('region-capital').value.trim(),
            population: document.getElementById('region-population').value.trim(),
            founded_year: document.getElementById('region-founded').value.trim()
        };

        try {
            const res = await fetch('/api/admin/regions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                alert('Регион добавлен!');
                form.reset();
                loadAdminRegions();
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка');
            }
        } catch (err) {
            alert('Ошибка соединения');
        }
    });
}

// === Здания ===
async function loadAdminBuildings() {
    try {
        const res = await fetch('/api/admin/buildings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const buildings = await res.json();
        renderAdminBuildings(buildings);
    } catch (err) {
        console.error('Failed to load buildings:', err);
    }
}

function renderAdminBuildings(buildings) {
    const list = document.getElementById('admin-buildings-list');
    if (!list) return;

    if (buildings.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">🏛️</div><h3>Зданий пока нет</h3></div>';
        return;
    }

    list.innerHTML = buildings.map(b => `
        <div class="model-list-item">
            <div class="info">
                <h3>${escapeHtml(b.name)}</h3>
                <p>${escapeHtml(b.era)} · ${escapeHtml(b.year_built)} — ${escapeHtml(b.region_name || '')}</p>
            </div>
        </div>
    `).join('');
}

async function setupBuildingForm() {
    const form = document.getElementById('building-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            name: document.getElementById('building-name').value.trim(),
            slug: document.getElementById('building-slug').value.trim(),
            region_id: parseInt(document.getElementById('building-region').value),
            era: document.getElementById('building-era').value.trim(),
            year_built: document.getElementById('building-year').value.trim(),
            architect: document.getElementById('building-architect').value.trim(),
            style: document.getElementById('building-style').value.trim(),
            address: document.getElementById('building-address').value.trim(),
            description: document.getElementById('building-desc').value.trim(),
            historical_significance: document.getElementById('building-hist').value.trim(),
            is_premium: document.getElementById('building-premium').checked
        };

        try {
            const res = await fetch('/api/admin/buildings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                alert('Здание добавлено!');
                form.reset();
                loadAdminBuildings();
            } else {
                const err = await res.json();
                alert(err.error || 'Ошибка');
            }
        } catch (err) {
            alert('Ошибка соединения');
        }
    });
}

// === Загрузка файлов ===
function setupUploadForm() {
    const form = document.getElementById('upload-form');
    if (!form) return;

    form.addEventListener('submit', handleUpload);
}

// === Пользователи ===
async function loadAdminUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const users = await res.json();
            renderAdminUsers(users);
        }
    } catch (err) {
        console.error('Failed to load users:', err);
    }
}

function renderAdminUsers(users) {
    const list = document.getElementById('admin-users-list');
    if (!list) return;

    if (users.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">👥</div><h3>Пользователей пока нет</h3></div>';
        return;
    }

    list.innerHTML = users.map(user => `
        <div class="model-list-item">
            <div class="info">
                <h3>${escapeHtml(user.username)}</h3>
                <p>
                    ${user.is_admin ? '<span class="model-type" style="background:rgba(245,158,11,0.2);color:#f59e0b;">Админ</span>' : ''}
                    ${user.is_premium ? '⭐ Премиум' : ''}
                    — ${user.email}
                </p>
            </div>
            <div style="display:flex;gap:8px;">
                <button class="btn btn-sm" onclick="toggleAdmin(${user.id})">${user.is_admin ? 'Убрать админа' : 'Назначить'}</button>
                <button class="btn btn-sm" onclick="togglePremium(${user.id})">${user.is_premium ? 'Убрать премиум' : 'Дать премиум'}</button>
            </div>
        </div>
    `).join('');
}

async function toggleAdmin(userId) {
    try {
        const res = await fetch(`/api/admin/users/${userId}/admin`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert('Группа пользователя изменена');
            loadAdminUsers();
        }
    } catch (err) {
        alert('Ошибка');
    }
}

async function togglePremium(userId) {
    try {
        const res = await fetch(`/api/admin/users/${userId}/premium`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert('Статус премиума изменён');
            loadAdminUsers();
        }
    } catch (err) {
        alert('Ошибка');
    }
}

async function handleUpload(e) {
    e.preventDefault();

    const nameInput = document.getElementById('model-name');
    const descInput = document.getElementById('model-description');
    const fileInput = document.getElementById('model-file');
    const errorDiv = document.getElementById('upload-error');
    const successDiv = document.getElementById('upload-success');

    const file = fileInput.files[0];
    if (!file) {
        errorDiv.textContent = 'Выберите файл';
        errorDiv.classList.add('show');
        return;
    }

    const name = nameInput.value.trim() || file.name.replace(/\.[^.]+$/, '');
    const description = descInput.value.trim();

    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            successDiv.textContent = 'Модель успешно загружена!';
            successDiv.classList.add('show');
            errorDiv.classList.remove('show');

            nameInput.value = '';
            descInput.value = '';
            fileInput.value = '';
            document.getElementById('file-name').textContent = 'Выберите файл (.obj, .glb, .gltf, .fbx, .stl, .ply)';

            loadAdminModels();
        } else {
            errorDiv.textContent = data.error;
            errorDiv.classList.add('show');
        }
    } catch (err) {
        errorDiv.textContent = 'Ошибка соединения';
        errorDiv.classList.add('show');
    }
}

// === Утилиты ===
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const overlay = document.getElementById('loading');
    if (overlay) {
        if (show) overlay.classList.add('show');
        else overlay.classList.remove('show');
    }
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
