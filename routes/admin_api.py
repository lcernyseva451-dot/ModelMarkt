from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import Region, HistoricalBuilding, LostBuilding, Advertisement, Model3D

admin_api_bp = Blueprint('admin_api', __name__)


@admin_api_bp.route('/admin')
def admin_page():
    return render_template('admin.html')


# ==================== РЕГИОНЫ ====================

@admin_api_bp.route('/api/admin/regions', methods=['GET'])
@jwt_required()
def admin_get_regions():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403
    regions = Region.query.all()
    return jsonify([r.to_dict() for r in regions]), 200


@admin_api_bp.route('/api/admin/regions', methods=['POST'])
@jwt_required()
def admin_create_region():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    data = request.get_json()
    name = data.get('name', '').strip()
    slug = data.get('slug', '').strip()

    if not name or not slug:
        return jsonify({'error': 'Укажите название и slug'}), 400

    if Region.query.filter_by(slug=slug).first():
        return jsonify({'error': 'Slug уже существует'}), 409

    region = Region(
        name=name,
        slug=slug,
        description=data.get('description', ''),
        capital=data.get('capital', ''),
        population=data.get('population', ''),
        founded_year=data.get('founded_year', ''),
        order=data.get('order', 0)
    )
    db.session.add(region)
    db.session.commit()
    return jsonify(region.to_dict()), 201


@admin_api_bp.route('/api/admin/regions/<int:region_id>', methods=['PUT'])
@jwt_required()
def admin_update_region(region_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    region = Region.query.get_or_404(region_id)
    data = request.get_json()

    for field in ['name', 'slug', 'description', 'capital', 'population', 'founded_year', 'order']:
        if field in data:
            setattr(region, field, data[field])

    db.session.commit()
    return jsonify(region.to_dict()), 200


@admin_api_bp.route('/api/admin/regions/<int:region_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_region(region_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    region = Region.query.get_or_404(region_id)
    db.session.delete(region)
    db.session.commit()
    return jsonify({'message': 'Регион удалён'}), 200


# ==================== СОХРАНИВШИЕСЯ ЗДАНИЯ ====================

@admin_api_bp.route('/api/admin/buildings', methods=['GET'])
@jwt_required()
def admin_get_buildings():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    buildings = HistoricalBuilding.query.all()
    result = []
    for b in buildings:
        d = b.to_dict()
        d['region_name'] = b.region.name if b.region else None
        result.append(d)
    return jsonify(result), 200


@admin_api_bp.route('/api/admin/buildings', methods=['POST'])
@jwt_required()
def admin_create_building():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    data = request.get_json()
    name = data.get('name', '').strip()
    slug = data.get('slug', '').strip()
    region_id = data.get('region_id')

    if not name or not slug or not region_id:
        return jsonify({'error': 'Заполните название, slug и регион'}), 400

    if HistoricalBuilding.query.filter_by(slug=slug).first():
        return jsonify({'error': 'Slug уже существует'}), 409

    building = HistoricalBuilding(
        name=name,
        slug=slug,
        region_id=region_id,
        era=data.get('era', ''),
        year_built=data.get('year_built', ''),
        year_restored=data.get('year_restored', ''),
        architect=data.get('architect', ''),
        style=data.get('style', ''),
        description=data.get('description', ''),
        historical_significance=data.get('historical_significance', ''),
        address=data.get('address', ''),
        latitude=data.get('latitude', 0),
        longitude=data.get('longitude', 0),
        is_premium=data.get('is_premium', False)
    )
    db.session.add(building)
    db.session.commit()
    return jsonify(building.to_dict()), 201


@admin_api_bp.route('/api/admin/buildings/<int:building_id>', methods=['PUT'])
@jwt_required()
def admin_update_building(building_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    building = HistoricalBuilding.query.get_or_404(building_id)
    data = request.get_json()

    for field in ['name', 'slug', 'era', 'year_built', 'year_restored', 'architect',
                  'style', 'description', 'historical_significance', 'address',
                  'latitude', 'longitude', 'is_premium']:
        if field in data:
            setattr(building, field, data[field])

    db.session.commit()
    return jsonify(building.to_dict()), 200


@admin_api_bp.route('/api/admin/buildings/<int:building_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_building(building_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    building = HistoricalBuilding.query.get_or_404(building_id)
    db.session.delete(building)
    db.session.commit()
    return jsonify({'message': 'Здание удалено'}), 200


# ==================== УТРАЧЕННЫЕ ЗДАНИЯ ====================

@admin_api_bp.route('/api/admin/lost-buildings', methods=['GET'])
@jwt_required()
def admin_get_lost_buildings():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    buildings = LostBuilding.query.all()
    return jsonify([b.to_dict() for b in buildings]), 200


@admin_api_bp.route('/api/admin/lost-buildings', methods=['POST'])
@jwt_required()
def admin_create_lost_building():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    data = request.get_json()
    name = data.get('name', '').strip()
    slug = data.get('slug', '').strip()
    city = data.get('city', '').strip()
    lat = data.get('latitude', 0)
    lon = data.get('longitude', 0)

    if not name or not slug or not city or not lat or not lon:
        return jsonify({'error': 'Заполните название, slug, город и координаты'}), 400

    if LostBuilding.query.filter_by(slug=slug).first():
        return jsonify({'error': 'Slug уже существует'}), 409

    building = LostBuilding(
        name=name,
        slug=slug,
        city=city,
        region_id=data.get('region_id'),
        address=data.get('address', ''),
        latitude=lat,
        longitude=lon,
        era=data.get('era', ''),
        year_built=data.get('year_built', ''),
        year_destroyed=data.get('year_destroyed', ''),
        destruction_cause=data.get('destruction_cause', ''),
        style=data.get('style', ''),
        description=data.get('description', ''),
        historical_spravka=data.get('historical_spravka', ''),
        architect=data.get('architect', ''),
        floors=data.get('floors', 0),
        materials=data.get('materials', ''),
        restoration_source=data.get('restoration_source', ''),
        is_verified=data.get('is_verified', False)
    )
    db.session.add(building)
    db.session.commit()
    return jsonify(building.to_dict()), 201


@admin_api_bp.route('/api/admin/lost-buildings/<int:building_id>', methods=['PUT'])
@jwt_required()
def admin_update_lost_building(building_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    building = LostBuilding.query.get_or_404(building_id)
    data = request.get_json()

    for field in ['name', 'slug', 'city', 'address', 'latitude', 'longitude',
                  'era', 'year_built', 'year_destroyed', 'destruction_cause',
                  'style', 'description', 'historical_spravka', 'architect',
                  'floors', 'materials', 'restoration_source', 'is_verified']:
        if field in data:
            setattr(building, field, data[field])

    db.session.commit()
    return jsonify(building.to_dict()), 200


@admin_api_bp.route('/api/admin/lost-buildings/<int:building_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_lost_building(building_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    building = LostBuilding.query.get_or_404(building_id)
    db.session.delete(building)
    db.session.commit()
    return jsonify({'message': 'Здание удалено'}), 200


# ==================== РЕКЛАМА ====================

@admin_api_bp.route('/api/admin/ads', methods=['GET'])
@jwt_required()
def admin_get_ads():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    ads = Advertisement.query.all()
    return jsonify([a.to_dict() for a in ads]), 200


# ==================== СТАТИСТИКА ====================

@admin_api_bp.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def admin_stats():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    from models import User, Subscription
    return jsonify({
        'users': User.query.count(),
        'regions': Region.query.count(),
        'historic_buildings': HistoricalBuilding.query.count(),
        'lost_buildings': LostBuilding.query.count(),
        'models_3d': Model3D.query.count(),
        'subscriptions': Subscription.query.filter_by(status='active').count(),
        'ads': Advertisement.query.count()
    }), 200


# ==================== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ====================

@admin_api_bp.route('/api/admin/users', methods=['GET'])
@jwt_required()
def admin_get_users():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    from models import User
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'is_admin': u.is_admin,
        'is_premium': u.is_premium,
        'created_at': u.created_at.isoformat() if u.created_at else None
    } for u in users]), 200


@admin_api_bp.route('/api/admin/users/<int:user_id>/admin', methods=['PUT'])
@jwt_required()
def admin_toggle_admin(user_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    from models import User
    user = User.query.get_or_404(user_id)
    user.is_admin = not user.is_admin
    db.session.commit()
    return jsonify({'message': f'Статус админа {"назначен" if user.is_admin else "убран"} для {user.username}'}), 200


@admin_api_bp.route('/api/admin/users/<int:user_id>/premium', methods=['PUT'])
@jwt_required()
def admin_toggle_premium(user_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён'}), 403

    from models import User
    user = User.query.get_or_404(user_id)
    user.is_premium = not user.is_premium
    db.session.commit()
    return jsonify({'message': f'Премиум {"включён" if user.is_premium else "выключен"} для {user.username}'}), 200
