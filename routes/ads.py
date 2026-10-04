from flask import Blueprint, render_template, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import Advertisement

ads_bp = Blueprint('ads', 'ads')


@ads_bp.route('/api/ads', methods=['GET'])
def get_ads():
    position = request.args.get('position', '')
    query = Advertisement.query.filter_by(is_active=True)
    if position:
        query = query.filter_by(position=position)
    ads = query.all()
    return jsonify([a.to_dict() for a in ads]), 200


@ads_bp.route('/api/ads/<int:ad_id>/click', methods=['POST'])
def track_click(ad_id):
    ad = Advertisement.query.get_or_404(ad_id)
    ad.clicks_count = (ad.clicks_count or 0) + 1
    db.session.commit()
    return jsonify({'message': 'OK', 'url': ad.link_url}), 200


@ads_bp.route('/api/ads', methods=['POST'])
@jwt_required()
def create_ad():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён. Только для администраторов.'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных'}), 400

    ad = Advertisement(
        title=data.get('title', 'Без названия'),
        description=data.get('description', ''),
        link_url=data.get('link_url', ''),
        image=data.get('image', ''),
        position=data.get('position', 'sidebar'),
    )
    db.session.add(ad)
    db.session.commit()

    return jsonify(ad.to_dict()), 201


@ads_bp.route('/api/ads/<int:ad_id>', methods=['PUT'])
@jwt_required()
def update_ad(ad_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён. Только для администраторов.'}), 403

    ad = Advertisement.query.get_or_404(ad_id)
    data = request.get_json()

    for field in ['title', 'description', 'link_url', 'image', 'position', 'is_active']:
        if field in data:
            setattr(ad, field, data[field])

    db.session.commit()
    return jsonify(ad.to_dict()), 200


@ads_bp.route('/api/ads/<int:ad_id>', methods=['DELETE'])
@jwt_required()
def delete_ad(ad_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён. Только для администраторов.'}), 403

    ad = Advertisement.query.get_or_404(ad_id)
    db.session.delete(ad)
    db.session.commit()

    return jsonify({'message': 'Реклама удалена'}), 200
