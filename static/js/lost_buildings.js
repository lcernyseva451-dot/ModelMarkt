// === Утраченные здания (дополнение к admin.js) ===

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
    const list = document.getElementById('admin-lost-list');
    if (!list) return;
    if (buildings.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="icon">🏚️</div><h3>Утраченных зданий пока нет</h3></div>';
        return;
    }
    list.innerHTML = buildings.map(b => `
        <div class="model-list-item">
            <div class="info">
                <h3>${escapeHtml(b.name)}</h3>
                <p>${escapeHtml(b.era)} · ${escapeHtml(b.year_destroyed)} — ${escapeHtml(b.city)}</p>
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
            region_id: parseInt(document.getElementById('lost-region').value),
            address: document.getElementById('lost-address').value.trim(),
            latitude: parseFloat(document.getElementById('lost-lat').value),
            longitude: parseFloat(document.getElementById('lost-lon').value),
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
                alert('Утраченное здание добавлено!');
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

function populateLostRegionSelects() {
    const select = document.getElementById('lost-region');
    if (!select) return;

    fetch('/api/admin/regions', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(regions => {
        select.innerHTML = '<option value="">Выберите регион</option>' +
            regions.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('');
    })
    .catch(err => console.error('Failed to load regions:', err));
}
