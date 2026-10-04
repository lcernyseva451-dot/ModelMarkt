import os


class BaseConfig:
    """Базовая конфигурация"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ryazan3d-historic-secret-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///' + os.path.join(os.path.dirname(__file__), 'instance', 'ryazan3d.db')
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-ryazan-secret-key-2026-minimum-32-chars')
    JWT_ACCESS_TOKEN_EXPIRES = 86400

    PREMIUM_PLANS = {
        'premium': {'name': 'Премиум', 'price_monthly': 499, 'price_yearly': 4990},
    }

    # API Keys (только на сервере)
    YANDEX_MAPS_API_KEY = os.environ.get('YANDEX_MAPS_API_KEY', 'd3470f4a-3831-4740-83f2-2286d7926d9a')
    
    # Rate Limiting
    RATE_LIMIT_FORMS = 5
    RATE_LIMIT_CHAT = 10
    RATE_LIMIT_LOGIN = 3
    
    # 2FA
    TWO_FACTOR_ENABLED = True
    TWO_FACTOR_SECRET_KEY = os.environ.get('TWO_FACTOR_SECRET_KEY', '2fa-secret-key-minimum-32-chars')
    
    # Password Policy
    PASSWORD_MIN_LENGTH = 12
    PASSWORD_REQUIRE_UPPER = True
    PASSWORD_REQUIRE_LOWER = True
    PASSWORD_REQUIRE_DIGIT = True
    PASSWORD_REQUIRE_SPECIAL = True
    
    # Session security
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False
    SESSION_COOKIE_SECURE = True


# Выбор по окружению
env = os.environ.get('FLASK_ENV', 'development')
config = ProductionConfig if env == 'production' else DevelopmentConfig
Config = config
