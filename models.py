from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    is_premium = db.Column(db.Boolean, default=False)
    avatar = db.Column(db.String(200), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)
    two_factor_secret = db.Column(db.String(32), default='')
    two_factor_enabled = db.Column(db.Boolean, default=False)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    models = db.relationship('Model3D', backref='uploader', lazy='dynamic')
    subscriptions = db.relationship('Subscription', backref='user', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin,
            'is_premium': self.is_premium,
            'avatar': self.avatar,
            'created_at': self.created_at.isoformat()
        }


class Region(db.Model):
    __tablename__ = 'regions'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False, index=True)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, default='')
    capital = db.Column(db.String(100), default='')
    population = db.Column(db.String(50), default='')
    founded_year = db.Column(db.String(50), default='')
    image = db.Column(db.String(200), default='')
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    buildings = db.relationship('HistoricalBuilding', backref='region', lazy='dynamic',
                                cascade='all, delete-orphan')
    lost_buildings = db.relationship('LostBuilding', backref='region', lazy='dynamic',
                                     cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'capital': self.capital,
            'population': self.population,
            'founded_year': self.founded_year,
            'image': self.image,
            'order': self.order,
            'buildings_count': self.buildings.count()
        }


class HistoricalBuilding(db.Model):
    __tablename__ = 'historical_buildings'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(150), unique=True, nullable=False, index=True)
    region_id = db.Column(db.Integer, db.ForeignKey('regions.id'), nullable=False)
    era = db.Column(db.String(100), default='')
    year_built = db.Column(db.String(50), default='')
    year_restored = db.Column(db.String(50), default='')
    architect = db.Column(db.String(150), default='')
    style = db.Column(db.String(100), default='')
    description = db.Column(db.Text, default='')
    historical_significance = db.Column(db.Text, default='')
    address = db.Column(db.String(300), default='')
    latitude = db.Column(db.Float, default=0)
    longitude = db.Column(db.Float, default=0)
    image = db.Column(db.String(200), default='')
    is_premium = db.Column(db.Boolean, default=False)
    views_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    models_3d = db.relationship('Model3D', backref='historical_building', lazy='dynamic',
                                cascade='all, delete-orphan',
                                primaryjoin="and_(Model3D.building_id==HistoricalBuilding.id, Model3D.building_id.isnot(None))")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'region_id': self.region_id,
            'region_name': self.region.name if self.region else None,
            'era': self.era,
            'year_built': self.year_built,
            'year_restored': self.year_restored,
            'architect': self.architect,
            'style': self.style,
            'description': self.description,
            'historical_significance': self.historical_significance,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'image': self.image,
            'is_premium': self.is_premium,
            'views_count': self.views_count,
            'models_3d_count': self.models_3d.count()
        }


class Model3D(db.Model):
    __tablename__ = 'models_3d'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    filename = db.Column(db.String(200), nullable=False)
    file_type = db.Column(db.String(20), nullable=False)
    file_size = db.Column(db.Integer, default=0)
    description = db.Column(db.Text, default='')
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    building_id = db.Column(db.Integer, db.ForeignKey('historical_buildings.id'), default=None)
    lost_building_id = db.Column(db.Integer, db.ForeignKey('lost_buildings.id'), default=None)
    is_featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'filename': self.filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'description': self.description,
            'uploaded_by': self.uploaded_by,
            'building_id': self.building_id,
            'is_featured': self.is_featured,
            'created_at': self.created_at.isoformat()
        }


class Subscription(db.Model):
    __tablename__ = 'subscriptions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    plan_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), default='active')
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    payment_id = db.Column(db.String(100), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'plan_type': self.plan_type,
            'status': self.status,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_at': self.created_at.isoformat()
        }


class LostBuilding(db.Model):
    __tablename__ = 'lost_buildings'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(150), unique=True, nullable=False, index=True)
    city = db.Column(db.String(100), nullable=False, index=True)
    region_id = db.Column(db.Integer, db.ForeignKey('regions.id'), nullable=True)
    address = db.Column(db.String(300), default='')
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    era = db.Column(db.String(100), default='')
    year_built = db.Column(db.String(50), default='')
    year_destroyed = db.Column(db.String(50), default='')
    destruction_cause = db.Column(db.String(200), default='')
    style = db.Column(db.String(100), default='')
    description = db.Column(db.Text, default='')
    historical_spravka = db.Column(db.Text, default='')
    architect = db.Column(db.String(150), default='')
    floors = db.Column(db.Integer, default=0)
    materials = db.Column(db.String(200), default='')
    archive_photos = db.Column(db.Text, default='')
    restoration_source = db.Column(db.Text, default='')
    is_verified = db.Column(db.Boolean, default=False)
    views_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    models_3d = db.relationship('Model3D', backref='lost_building_ref', lazy='dynamic',
                                cascade='all, delete-orphan',
                                primaryjoin="and_(Model3D.lost_building_id==LostBuilding.id, Model3D.lost_building_id.isnot(None))")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'city': self.city,
            'region_id': self.region_id,
            'address': self.address,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'era': self.era,
            'year_built': self.year_built,
            'year_destroyed': self.year_destroyed,
            'destruction_cause': self.destruction_cause,
            'style': self.style,
            'description': self.description,
            'historical_spravka': self.historical_spravka,
            'architect': self.architect,
            'floors': self.floors,
            'materials': self.materials,
            'archive_photos': self.archive_photos,
            'restoration_source': self.restoration_source,
            'is_verified': self.is_verified,
            'views_count': self.views_count,
            'models_3d_count': self.models_3d.count()
        }


class Advertisement(db.Model):
    __tablename__ = 'advertisements'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    link_url = db.Column(db.String(500), default='')
    image = db.Column(db.String(200), default='')
    position = db.Column(db.String(50), default='sidebar')
    is_active = db.Column(db.Boolean, default=True)
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime, nullable=True)
    clicks_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'link_url': self.link_url,
            'image': self.image,
            'position': self.position,
            'is_active': self.is_active,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'clicks_count': self.clicks_count
        }
