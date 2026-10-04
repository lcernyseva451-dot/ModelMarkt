import os
import uuid
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import Model3D

upload_bp = Blueprint('upload', __name__)
ALLOWED_EXTENSIONS = {'obj', 'glb', 'gltf', 'fbx', 'stl', 'ply', 'step', 'stp'}
UPLOAD_FOLDER = 'uploads'


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_file():
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён. Только для администраторов.'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'Файл не найден'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400

    if not allowed_file(file.filename):
        return jsonify({
            'error': f'Неподдерживаемый формат. Разрешены: {", ".join(ALLOWED_EXTENSIONS)}'
        }), 400

    original_name = file.filename
    name, ext = os.path.splitext(original_name)
    unique_filename = f"{uuid.uuid4().hex}{ext.lower()}"

    filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(filepath)

    model = Model3D(
        name=name,
        filename=unique_filename,
        file_type=ext.lower().lstrip('.'),
        file_size=os.path.getsize(filepath),
        building_id=request.form.get('building_id') or None,
        is_featured=request.form.get('is_featured') == 'true',
        uploaded_by=get_jwt_identity(),
        description=request.form.get('description', '')
    )

    db.session.add(model)
    db.session.commit()

    return jsonify({
        'message': 'Файл загружен',
        'model': model.to_dict()
    }), 201


@upload_bp.route('/api/models', methods=['GET'])
def api_models():
    models = Model3D.query.order_by(Model3D.created_at.desc()).all()
    return jsonify([m.to_dict() for m in models]), 200


@upload_bp.route('/api/models/featured', methods=['GET'])
def api_featured_models():
    models = Model3D.query.filter_by(is_featured=True).order_by(Model3D.created_at.desc()).limit(6).all()
    return jsonify([m.to_dict() for m in models]), 200


@upload_bp.route('/api/models/<int:model_id>', methods=['GET'])
def api_model_detail(model_id):
    model = Model3D.query.get_or_404(model_id)
    return jsonify(model.to_dict()), 200


@upload_bp.route('/api/models/<int:model_id>', methods=['DELETE'])
@jwt_required()
def delete_model(model_id):
    jwt_data = get_jwt()
    if not jwt_data.get('is_admin'):
        return jsonify({'error': 'Доступ запрещён. Только для администраторов.'}), 403

    model = Model3D.query.get_or_404(model_id)

    # Удалить файл с диска
    filepath = os.path.join(UPLOAD_FOLDER, model.filename)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except OSError:
            pass

    db.session.delete(model)
    db.session.commit()

    return jsonify({'message': 'Модель удалена'}), 200


@upload_bp.route('/api/models/<int:model_id>/file', methods=['GET'])
def api_model_file(model_id):
    from flask import request
    model = Model3D.query.get_or_404(model_id)
    filename = request.args.get('filename', model.filename)
    return send_from_directory(UPLOAD_FOLDER, filename)


@upload_bp.route('/api/models/register-existing', methods=['POST'])
def register_existing_models():
    """Register existing files in uploads folder as 3D models"""
    files_to_register = [
        {
            'filename': 'дом на печать 2(12).STL',
            'name': 'Dom na pechat 2',
            'file_type': 'stl',
            'description': '3D model house printing STL format'
        },
        {
            'filename': 'сборка дома.STEP',
            'name': 'Sborka doma',
            'file_type': 'step',
            'description': '3D assembly model STEP format'
        }
    ]
    
    registered = []
    skipped = []
    
    for file_info in files_to_register:
        filename = file_info['filename']
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        if not os.path.exists(filepath):
            skipped.append({'filename': filename, 'reason': 'file not found'})
            continue
        
        existing = Model3D.query.filter_by(filename=filename).first()
        if existing:
            skipped.append({'filename': filename, 'reason': 'already exists (ID=' + str(existing.id) + ')'})
            continue
        
        file_size = os.path.getsize(filepath)
        model = Model3D(
            name=file_info['name'],
            filename=filename,
            file_type=file_info['file_type'],
            file_size=file_size,
            description=file_info['description'],
            is_featured=True
        )
        
        db.session.add(model)
        registered.append({'filename': filename, 'id': model.id, 'size': file_size})
    
    if registered:
        db.session.commit()
    
    return jsonify({
        'message': 'Registration complete',
        'registered': registered,
        'skipped': skipped
    }), 200
