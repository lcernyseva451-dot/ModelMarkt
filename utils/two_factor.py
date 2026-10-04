import pyotp
import qrcode
import io
import base64
from flask import current_app


class TwoFactorAuth:
    """2FA сервис для админ-панели"""
    
    @staticmethod
    def generate_secret():
        """Генерирует секретный ключ для 2FA"""
        return pyotp.random_base32()
    
    @staticmethod
    def get_totp_uri(secret, email, issuer='ModelMarkt'):
        """Создает URI для QR-кода"""
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=email,
            issuer_name=issuer
        )
    
    @staticmethod
    def generate_qr_code(uri):
        """Генерирует QR-код и возвращает base64"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color='black', back_color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode('utf-8')
    
    @staticmethod
    def verify_code(secret, code):
        """Проверяет 2FA код"""
        totp = pyotp.totp.TOTP(secret)
        return totp.verify(code)
    
    @staticmethod
    def get_current_time_totp(secret):
        """Возвращает текущий активный код"""
        totp = pyotp.totp.TOTP(secret)
        return totp.now()


# Глобальный инстанс
two_factor = TwoFactorAuth()
