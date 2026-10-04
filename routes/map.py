from flask import Blueprint, render_template, jsonify, request, current_app
from extensions import db
from models import LostBuilding, Region, Model3D

map_bp = Blueprint('map', __name__)


@map_bp.route('/map')
def map_page():
    regions = Region.query.all()
    api_key = current_app.config.get('YANDEX_MAPS_API_KEY', '')
    return render_template('map.html', regions=regions, yandex_maps_key=api_key)


@map_bp.route('/api/lost-buildings', methods=['GET'])
def api_lost_buildings():
    city = request.args.get('city', '')
    region_slug = request.args.get('region', '')
    era = request.args.get('era', '')
    cause = request.args.get('cause', '')

    query = LostBuilding.query

    if city:
        query = query.filter(LostBuilding.city.ilike(f'%{city}%'))
    if region_slug:
        region = Region.query.filter_by(slug=region_slug).first()
        if region:
            query = query.filter_by(region_id=region.id)
    if era:
        query = query.filter(LostBuilding.era.ilike(f'%{era}%'))
    if cause:
        query = query.filter(LostBuilding.destruction_cause.ilike(f'%{cause}%'))

    buildings = query.all()
    return jsonify([{
        'id': b.id,
        'name': b.name,
        'city': b.city,
        'address': b.address,
        'latitude': b.latitude,
        'longitude': b.longitude,
        'era': b.era,
        'year_built': b.year_built,
        'year_destroyed': b.year_destroyed,
        'destruction_cause': b.destruction_cause,
        'style': b.style,
        'architect': b.architect,
        'floors': b.floors,
        'materials': b.materials,
        'description': b.description[:200] if b.description else '',
        'historical_spravka': b.historical_spravka or '',
        'models_3d_count': Model3D.query.filter_by(lost_building_id=b.id).count(),
        'is_verified': b.is_verified,
        'views_count': b.views_count or 0
    } for b in buildings]), 200


@map_bp.route('/api/lost-buildings/<int:building_id>', methods=['GET'])
def api_lost_building_detail(building_id):
    building = LostBuilding.query.get_or_404(building_id)
    building.views_count = (building.views_count or 0) + 1
    db.session.commit()

    models_3d = Model3D.query.filter_by(lost_building_id=building_id).all()

    return jsonify({
        'building': building.to_dict(),
        'models_3d': [m.to_dict() for m in models_3d],
        'restoration_source': building.restoration_source or ''
    }), 200


@map_bp.route('/api/cities', methods=['GET'])
def api_cities():
    cities = db.session.query(LostBuilding.city).distinct().all()
    return jsonify([c[0] for c in cities]), 200
