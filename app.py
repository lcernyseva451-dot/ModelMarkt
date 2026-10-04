import os
from flask import Flask, render_template, send_from_directory, jsonify, request, session
from extensions import db, jwt
from utils.rate_limiter import rate_limiter, rate_limit
from utils.security import security


def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    db.init_app(app)
    jwt.init_app(app)
    from flask_cors import CORS
    CORS(app)
    
    # Инициализация rate limiter
    rate_limiter.init_app(app)
    
    # Инициализация security middleware
    security.init_app(app)

    # Логирование
    import logging
    from logging.handlers import RotatingFileHandler
    if not app.debug:
        handler = RotatingFileHandler(
            'instance/app.log',
            maxBytes=1024 * 1024 * 5,  # 5 MB
            backupCount=3
        )
        handler.setFormatter(logging.Formatter(
            '[%(asctime)s] %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        handler.setLevel(logging.INFO)
        app.logger.addHandler(handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('ModelMarkt startup')

    os.makedirs('uploads', exist_ok=True)
    os.makedirs('uploads/audio', exist_ok=True)

    from routes.map import map_bp
    from routes.auth import auth_bp
    from routes.admin_api import admin_api_bp
    from routes.upload import upload_bp
    from routes.premium import premium_bp
    from routes.regions import regions_bp
    from routes.ads import ads_bp
    from routes.translate import translate_bp

    app.register_blueprint(map_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_api_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(premium_bp)
    app.register_blueprint(regions_bp)
    app.register_blueprint(ads_bp)
    app.register_blueprint(translate_bp)

    # === Middleware для rate limiting форм ===
    @app.before_request
    def check_rate_limits():
        from utils.rate_limiter import rate_limiter
        from flask import request
        
        # Rate limiting для форм обратной связи (если будет)
        if request.path == '/api/contact' and request.method == 'POST':
            if not rate_limiter.is_allowed(f"form:{request.remote_addr}", app.config.get('RATE_LIMIT_FORMS', 5)):
                return jsonify({'error': 'Слишком много запросов'}), 429
        
        # Rate limiting для чата (если будет)
        if request.path.startswith('/api/chat') and request.method == 'POST':
            if not rate_limiter.is_allowed(f"chat:{request.remote_addr}", app.config.get('RATE_LIMIT_CHAT', 10)):
                return jsonify({'error': 'Слишком много сообщений'}), 429
        
        # Rate limiting для входа
        if request.path == '/api/login' and request.method == 'POST':
            if not rate_limiter.is_allowed(f"login:{request.remote_addr}", app.config.get('RATE_LIMIT_LOGIN', 3)):
                return jsonify({'error': 'Слишком много попыток входа'}), 429

    @app.route('/')
    def index():
        from models import Region, Model3D
        regions = Region.query.all()
        featured_models = Model3D.query.filter_by(is_featured=True).order_by(Model3D.created_at.desc()).limit(6).all()
        return render_template('index.html', regions=regions, featured_models=featured_models)

    @app.route('/translate')
    def translate_page():
        return render_template('translate.html')

    @app.route('/register-models')
    def register_models_page():
        return render_template('register_models.html')

    @app.route('/favicon.ico')
    def favicon():
        return send_from_directory(os.path.join(app.root_path, 'static'), 'favicon.ico', mimetype='image/vnd.microsoft.icon')

    # ==================== ОБРАБОТЧИКИ ОШИБОК ====================

    @app.errorhandler(404)
    def not_found(error):
        if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
            return jsonify({
                'error': 'Страница не найдена',
                'message': 'Запрошенный ресурс не существует или был удалён.'
            }), 404
        return render_template('error.html', error_code=404, error_title='Страница не найдена',
                               error_message='Запрошенная страница не существует'), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
            return jsonify({
                'error': 'Внутренняя ошибка сервера',
                'message': 'Произошла ошибка при обработке запроса.'
            }), 500
        return render_template('error.html', error_code=500, error_title='Ошибка сервера',
                               error_message='На сервере произошла непредвиденная ошибка'), 500

    @app.errorhandler(422)
    def unprocessable_error(error):
        if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
            return jsonify({
                'error': 'Некорректные данные',
                'message': 'Невозможно обработать запрос. Проверьте правильность данных.'
            }), 422
        return jsonify({'error': 'Некорректные данные JWT'}), 422

    @app.errorhandler(409)
    def conflict_error(error):
        return jsonify({'error': 'Конфликт', 'message': 'Ресурс уже существует'}), 409

    with app.app_context():
        import models
        db.create_all()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
