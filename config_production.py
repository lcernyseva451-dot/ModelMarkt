"""Production configuration with HTTPS and security"""
import os


class ProductionConfig:
    """Production конфигурация"""
    SECRET_KEY = os.environ.get('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError('SECRET_KEY not set! Set environment variable SECRET_KEY')
    
    # Для production используем PostgreSQL или MySQL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///ryazan3d.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100 MB
    
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError('JWT_SECRET_KEY not set!')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours
    
    # HTTPS настройки
    SESSION_COOKIE_SECURE = True  # Только HTTPS cookies
    SESSION_COOKIE_HTTPONLY = True  # Нельзя прочитать через JS
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF защита
    
    # SSL/HTTPS
    SSL_ENABLED = os.environ.get('SSL_ENABLED', 'true').lower() == 'true'
    
    PREMIUM_PLANS = {
        'premium': {'name': 'Премиум', 'price_monthly': 499, 'price_yearly': 4990},
    }
    
    YANDEX_MAPS_API_KEY = os.environ.get('YANDEX_MAPS_API_KEY', '')
    
    # Rate Limiting
    RATE_LIMIT_FORMS = 5
    RATE_LIMIT_CHAT = 10
    RATE_LIMIT_LOGIN = 3
    
    # 2FA
    TWO_FACTOR_ENABLED = True
    TWO_FACTOR_SECRET_KEY = os.environ.get('TWO_FACTOR_SECRET_KEY', os.urandom(32).hex())
    
    # Password Policy
    PASSWORD_MIN_LENGTH = 12
    PASSWORD_REQUIRE_UPPER = True
    PASSWORD_REQUIRE_LOWER = True
    PASSWORD_REQUIRE_DIGIT = True
    PASSWORD_REQUIRE_SPECIAL = True


class StagingConfig(ProductionConfig):
    """Staging конфигурация (для тестирования production)"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///ryazan3d_staging.db')
    SESSION_COOKIE_SECURE = False  # Для staging без HTTPS


class DevelopmentConfig(ProductionConfig):
    """Development конфигурация"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///ryazan3d.db'
    SESSION_COOKIE_SECURE = False
    SSL_ENABLED = False


# Выбор конфигурации
config_by_name = {
    'production': ProductionConfig,
    'staging': StagingConfig,
    'development': DevelopmentConfig,
}
