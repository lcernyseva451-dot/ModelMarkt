"""Security middleware for Flask application"""
from functools import wraps
import re
import html
from flask import request, jsonify, g


class SecurityMiddleware:
    """Security middleware для защиты от XSS, CSRF, SQL-инъекций"""

    # XSS паттерны для фильтрации
    XSS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe',
        r'<object',
        r'<embed',
        r'<link.*rel.*stylesheet',
        r'vbscript:',
        r'<img[^>]*onerror',
    ]

    # SQL-инъекции паттерны
    SQL_PATTERNS = [
        r'(\b(union|select|insert|update|delete|drop|alter|create)\b.*\b(from|into|table|database)\b)',
        r"(--|;)\s*(drop|delete|update|insert)",
        r"'\s*(or|and)\s+'?\d+'?\s*=",
    ]

    def __init__(self, app=None):
        self.app = app
        if app:
            self.init_app(app)

    def init_app(self, app):
        """Инициализация middleware"""
        self.app = app

        # CSP заголовки для всех ответов
        @app.after_request
        def add_security_headers(response):
            # Content Security Policy
            response.headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://api-maps.yandex.ru 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
                "img-src 'self' data: https:; "
                "font-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )
            # X-Frame-Options
            response.headers['X-Frame-Options'] = 'DENY'
            # X-Content-Type-Options
            response.headers['X-Content-Type-Options'] = 'nosniff'
            # X-XSS-Protection
            response.headers['X-XSS-Protection'] = '1; mode=block'
            # Strict-Transport-Security (для HTTPS)
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            # Referrer-Policy
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            # Permissions-Policy
            response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
            return response

        # Middleware для проверки XSS в запросах
        @app.before_request
        def check_xss():
            """Проверка запросов на XSS-атаки"""
            self._check_request_for_xss()

        # Middleware для проверки SQL-инъекций
        @app.before_request
        def check_sql_injection():
            """Проверка запросов на SQL-инъекции"""
            self._check_request_for_sql_injection()

    def _check_request_for_xss(self):
        """Проверяет все данные запроса на XSS"""
        # Проверяем query params
        for key, value in request.args.items():
            if self._contains_xss(value):
                self._log_security_event('XSS', key, value)
                return jsonify({'error': 'Некорректные данные в запросе'}), 400

        # Проверяем JSON body
        if request.is_json and request.get_json(silent=True):
            data = request.get_json(silent=True)
            if isinstance(data, dict):
                for key, value in data.items():
                    if isinstance(value, str) and self._contains_xss(value):
                        self._log_security_event('XSS', key, value)
                        return jsonify({'error': 'Некорректные данные в теле запроса'}), 400

        # Проверяем form data
        if request.form:
            for key, value in request.form.items():
                if self._contains_xss(value):
                    self._log_security_event('XSS', key, value)
                    return jsonify({'error': 'Некорректные данные в форме'}), 400

    def _check_request_for_sql_injection(self):
        """Проверяет запросы на SQL-инъекции"""
        for key, value in request.args.items():
            if self._contains_sql_injection(value):
                self._log_security_event('SQL_INJECTION', key, value)
                return jsonify({'error': 'Некорректные данные в запросе'}), 400

    def _contains_xss(self, text):
        """Проверяет текст на XSS-паттерны"""
        if not text or not isinstance(text, str):
            return False
        text_lower = text.lower()
        for pattern in self.XSS_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        return False

    def _contains_sql_injection(self, text):
        """Проверяет текст на SQL-инъекции"""
        if not text or not isinstance(text, str):
            return False
        for pattern in self.SQL_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _log_security_event(self, event_type, key, value):
        """Логирует событие безопасности"""
        if self.app:
            self.app.logger.warning(
                f'Security event: {event_type} | Key: {key} | Value: {value[:100]}'
            )

    @staticmethod
    def sanitize_input(text):
        """Санитизация пользовательского ввода"""
        if not text or not isinstance(text, str):
            return ''
        return html.escape(text, quote=True)

    @staticmethod
    def validate_email(email):
        """Валидация email"""
        if not email:
            return False
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_username(username):
        """Валидация имени пользователя"""
        if not username or len(username) < 3 or len(username) > 50:
            return False
        return bool(re.match(r'^[a-zA-Z0-9_]+$', username))

    @staticmethod
    def validate_password(password):
        """Валидация пароля"""
        if not password or len(password) < 8:
            return False
        has_upper = bool(re.search(r'[A-ZА-ЯЁ]', password))
        has_lower = bool(re.search(r'[a-zа-яё]', password))
        has_digit = bool(re.search(r'\d', password))
        return has_upper and has_lower and has_digit


# Глобальный инстанс
security = SecurityMiddleware()
