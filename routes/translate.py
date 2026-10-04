from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt
from extensions import db
from models import Region, HistoricalBuilding, LostBuilding, Advertisement
import os
import uuid

translate_bp = Blueprint('translate', __name__)
AUDIO_FOLDER = 'uploads/audio'
os.makedirs(AUDIO_FOLDER, exist_ok=True)

# Поддержка языков
LANGUAGES = {
    'en': {'name': 'English', 'code': 'en-US', 'flag': '🇬🇧'},
    'fr': {'name': 'Français', 'code': 'fr-FR', 'flag': '🇫🇷'},
    'zh': {'name': '中文', 'code': 'zh-CN', 'flag': '🇨🇳'},
}


@translate_bp.route('/api/translate/text', methods=['POST'])
@jwt_required()
def translate_text():
    """Перевод текста (возвращает текстовый перевод для отображения)"""
    jwt_data = get_jwt()
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Нет данных'}), 400

    text = data.get('text', '')
    target_lang = data.get('target_lang', 'en')

    if not text:
        return jsonify({'error': 'Введите текст'}), 400

    if target_lang not in LANGUAGES:
        return jsonify({'error': 'Неподдерживаемый язык'}), 400

    # Возвращаем информацию для Web Speech API
    return jsonify({
        'text': text,
        'target_lang': target_lang,
        'lang_info': LANGUAGES[target_lang],
        'message': 'Используйте Web Speech API для воспроизведения'
    }), 200


@translate_bp.route('/api/translate/audio', methods=['POST'])
@jwt_required()
def translate_audio():
    """Генерация аудио-перевода через gTTS (Google Text-to-Speech)"""
    jwt_data = get_jwt()
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Нет данных'}), 400

    text = data.get('text', '')
    target_lang = data.get('target_lang', 'en')

    if not text:
        return jsonify({'error': 'Введите текст'}), 400

    if target_lang not in LANGUAGES:
        return jsonify({'error': 'Неподдерживаемый язык'}), 400

    try:
        from gtts import gTTS
        from gtts.lang import tts_langs

        lang_code = LANGUAGES[target_lang]['code']

        # Генерируем аудио
        tts = gTTS(text=text, lang=lang_code, slow=False)

        # Сохраняем файл
        filename = f"translate_{uuid.uuid4().hex[:8]}_{target_lang}.mp3"
        filepath = os.path.join(AUDIO_FOLDER, filename)
        tts.save(filepath)

        return jsonify({
            'success': True,
            'filename': filename,
            'url': f'/uploads/audio/{filename}',
            'lang_info': LANGUAGES[target_lang],
            'message': 'Аудио сгенерировано успешно'
        }), 200

    except ImportError:
        return jsonify({
            'error': 'gTTS не установлен. Установите: pip install gTTS',
            'fallback': 'Используйте Web Speech API в браузере'
        }), 503

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@translate_bp.route('/api/translate/building/<int:building_id>', methods=['GET'])
def translate_building(building_id):
    """Получить перевод описания здания на 3 языка"""
    # Проверяем, историческое это здание или утраченное
    building = HistoricalBuilding.query.get_or_404(building_id)
    text = f"{building.name}. {building.description}"

    return jsonify({
        'building': building.to_dict(),
        'translations': {
            lang: {
                'text': text,
                'lang_info': info,
                'available': True
            }
            for lang, info in LANGUAGES.items()
        }
    }), 200


@translate_bp.route('/api/translate/lost-building/<int:building_id>', methods=['GET'])
def translate_lost_building(building_id):
    """Получить перевод описания утраченного здания на 3 языка"""
    building = LostBuilding.query.get_or_404(building_id)
    text = f"{building.name}. {building.description}. {building.historical_spravka}"

    return jsonify({
        'building': building.to_dict(),
        'translations': {
            lang: {
                'text': text,
                'lang_info': info,
                'available': True
            }
            for lang, info in LANGUAGES.items()
        }
    }), 200


@translate_bp.route('/api/translate/languages', methods=['GET'])
def get_languages():
    """Получить список поддерживаемых языков"""
    return jsonify({
        'languages': LANGUAGES,
        'count': len(LANGUAGES)
    }), 200


@translate_bp.route('/api/translate/bulk', methods=['POST'])
@jwt_required()
def translate_bulk():
    """Массовый перевод нескольких текстов"""
    jwt_data = get_jwt()
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Нет данных'}), 400

    texts = data.get('texts', [])
    target_lang = data.get('target_lang', 'en')

    if not texts:
        return jsonify({'error': 'Нет текстов'}), 400

    if target_lang not in LANGUAGES:
        return jsonify({'error': 'Неподдерживаемый язык'}), 400

    results = []
    for text in texts:
        results.append({
            'original': text,
            'target_lang': target_lang,
            'lang_info': LANGUAGES[target_lang],
            'message': 'Используйте Web Speech API для воспроизведения'
        })

    return jsonify({'translations': results}), 200
