from flask import Blueprint, render_template, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import Region, HistoricalBuilding, Model3D, Advertisement

regions_bp = Blueprint('regions', __name__)


@regions_bp.route('/region/<slug>')
def region_detail(slug):
    region = Region.query.filter_by(slug=slug).first_or_404()
    buildings = HistoricalBuilding.query.filter_by(region_id=region.id).all()
    ads_list = Advertisement.query.filter_by(is_active=True, position='sidebar').all()
    return render_template('region.html', region=region, buildings=buildings, sidebar_ads=ads_list)


@regions_bp.route('/building/<slug>')
def building_detail(slug):
    building = HistoricalBuilding.query.filter_by(slug=slug).first_or_404()
    building.views_count = (building.views_count or 0) + 1
    db.session.commit()

    models_3d = Model3D.query.filter_by(building_id=building.id).all()
    nearby = HistoricalBuilding.query.filter(
        HistoricalBuilding.region_id == building.region_id,
        HistoricalBuilding.id != building.id
    ).limit(5).all()

    ads_list = Advertisement.query.filter_by(is_active=True, position='sidebar').all()
    return render_template('building.html', building=building, models_3d=models_3d,
                           nearby=nearby, sidebar_ads=ads_list)


@regions_bp.route('/api/regions', methods=['GET'])
def api_regions():
    regions = Region.query.order_by(Region.order, Region.name).all()
    return jsonify([r.to_dict() for r in regions]), 200


@regions_bp.route('/api/buildings', methods=['GET'])
def api_buildings():
    region_slug = request.args.get('region')
    query = HistoricalBuilding.query

    if region_slug:
        region = Region.query.filter_by(slug=region_slug).first()
        if region:
            query = query.filter_by(region_id=region.id)

    search = request.args.get('search', '')
    if search:
        query = query.filter(
            db.or_(
                HistoricalBuilding.name.ilike(f'%{search}%'),
                HistoricalBuilding.description.ilike(f'%{search}%')
            )
        )

    buildings = query.order_by(HistoricalBuilding.created_at.desc()).all()
    return jsonify([b.to_dict() for b in buildings]), 200


@regions_bp.route('/api/buildings/<int:building_id>/models', methods=['GET'])
def api_building_models(building_id):
    models = Model3D.query.filter_by(building_id=building_id).all()
    return jsonify([m.to_dict() for m in models]), 200
