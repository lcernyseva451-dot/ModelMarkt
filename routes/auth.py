from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login')
def login_page():
    return render_template('login.html')


@auth_bp.route('/register')
def register_page():
    return render_template('register.html')


@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Нет данных'}), 400

    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')

    if not username or not email or not password:
        return jsonify({'error': 'Заполните все поля'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Пароль минимум 6 символов'}), 400

    if len(username) < 3:
        return jsonify({'error': 'Логин минимум 3 символа'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Пользователь с таким логином уже существует'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Пользователь с таким email уже существует'}), 409

    user = User(username=username, email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Регистрация успешна! Войдите в аккаунт.'}), 201


@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Нет данных'}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Введите логин и пароль'}), 400

    user = User.query.filter_by(username=username).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Неверный логин или пароль'}), 401

    additional_claims = {'is_admin': user.is_admin}
    token = create_access_token(
        identity=user.id,
        additional_claims=additional_claims
    )

    return jsonify({
        'message': 'Вход выполнен',
        'token': token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/api/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({'error': 'Пользователь не найден'}), 404

    return jsonify(user.to_dict()), 200


@auth_bp.route('/api/check-admin', methods=['GET'])
@jwt_required()
def check_admin():
    from flask_jwt_extended import get_jwt
    jwt_data = get_jwt()
    is_admin = jwt_data.get('is_admin', False)

    return jsonify({'is_admin': is_admin}), 200


@auth_bp.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    return jsonify({'message': 'Выход выполнен успешно'}), 200


@auth_bp.route('/error')
def error_page():
    error_code = request.args.get('code', 500)
    error_title = request.args.get('title', 'Ошибка')
    error_message = request.args.get('message', 'Произошла ошибка')
    return render_template('error.html', error_code=error_code,
                           error_title=error_title, error_message=error_message)
