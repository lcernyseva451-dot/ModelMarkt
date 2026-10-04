import time
from collections import defaultdict
from functools import wraps
from flask import request, jsonify


class RateLimiter:
    """Rate limiter для форм, чата и других эндпоинтов"""
    
    def __init__(self, app=None):
        self.app = app
        self.requests = defaultdict(list)
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        self.app = app
        # Очистка старых записей каждые 5 минут
        import threading
        def cleanup():
            while True:
                time.sleep(300)
                now = time.time()
                for key in list(self.requests.keys()):
                    self.requests[key] = [t for t in self.requests[key] if now - t < 60]
                    if not self.requests[key]:
                        del self.requests[key]
        threading.Thread(target=cleanup, daemon=True).start()
    
    def is_allowed(self, key, limit, window=60):
        """Проверяет, не превышен ли лимит запросов"""
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < window]
        
        if len(self.requests[key]) >= limit:
            return False
        
        self.requests[key].append(now)
        return True
    
    def get_remaining(self, key, limit, window=60):
        """Возвращает оставшиеся запросы"""
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < window]
        return max(0, limit - len(self.requests[key]))


def rate_limit(limiter, limit, window=60, key_func=None):
    """Декоратор для rate limiting"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if key_func:
                client_key = key_func()
            else:
                client_key = request.remote_addr or 'unknown'
            
            if not limiter.is_allowed(client_key, limit, window):
                remaining = limiter.get_remaining(client_key, limit, window)
                return jsonify({
                    'error': 'Слишком много запросов',
                    'message': f'Лимит: {limit} запросов за {window} сек. Осталось: {remaining}',
                    'retry_after': window
                }), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# Глобальный инстанс
rate_limiter = RateLimiter()
