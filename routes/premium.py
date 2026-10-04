from flask import Blueprint, render_template, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import Subscription, User

premium_bp = Blueprint('premium', 'premium')


@premium_bp.route('/premium')
def premium_page():
    return render_template('premium.html')


@premium_bp.route('/api/premium/plans', methods=['GET'])
def get_plans():
    from config import Config
    plans = Config.PREMIUM_PLANS
    return jsonify(plans), 200


@premium_bp.route('/api/premium/activate', methods=['POST'])
@jwt_required()
def activate_premium():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Нет данных'}), 400

    plan_type = data.get('plan_type', 'premium')
    period = data.get('period', 'monthly')  # monthly or yearly

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    from config import Config
    plan = Config.PREMIUM_PLANS.get(plan_type)
    if not plan:
        return jsonify({'error': 'Неизвестный план'}), 400

    price_key = f'price_{period}'
    price = plan.get(price_key, 0)

    from datetime import datetime, timedelta
    if period == 'yearly':
        end_date = datetime.utcnow() + timedelta(days=365)
    else:
        end_date = datetime.utcnow() + timedelta(days=30)

    sub = Subscription(
        user_id=user_id,
        plan_type=plan_type,
        status='active',
        start_date=datetime.utcnow(),
        end_date=end_date,
        payment_id=f'PAY-{user_id}-{int(datetime.utcnow().timestamp())}'
    )
    db.session.add(sub)

    user.is_premium = True
    db.session.commit()

    return jsonify({
        'message': 'Премиум активирован!',
        'subscription': sub.to_dict(),
        'plan_name': plan['name'],
        'price': price
    }), 200


@premium_bp.route('/api/premium/status', methods=['GET'])
@jwt_required()
def get_premium_status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    active_sub = Subscription.query.filter_by(
        user_id=user_id, status='active'
    ).order_by(Subscription.end_date.desc()).first()

    return jsonify({
        'is_premium': user.is_premium,
        'subscription': active_sub.to_dict() if active_sub else None
    }), 200
