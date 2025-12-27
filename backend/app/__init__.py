from flask import Flask
from flask_cors import CORS



def create_app():
    app = Flask(__name__)
    CORS(app)

    from .api.patients import bp as patients_bp
    app.register_blueprint(patients_bp, url_prefix='/api/patients')

    from .api.encounters import bp as encounters_bp
    app.register_blueprint(encounters_bp, url_prefix='/api/encounters')

    from .api.insurers import bp as insurers_bp
    app.register_blueprint(insurers_bp, url_prefix='/api/insurers')

    from .api.dashboard import bp as dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

    from .api.claims import bp as claims_bp
    app.register_blueprint(claims_bp, url_prefix='/api/claims')
    
    from .api.denials import bp as denials_bp
    app.register_blueprint(denials_bp, url_prefix='/api/denials')

    from .api.medications import bp as medications_bp
    app.register_blueprint(medications_bp, url_prefix='/api/medications')

    from .api.procedures import bp as procedures_bp
    app.register_blueprint(procedures_bp, url_prefix='/api/procedures')

    from .api.lab_tests import bp as lab_tests_bp
    app.register_blueprint(lab_tests_bp)

    from .api.diagnoses import bp as diagnoses_bp
    app.register_blueprint(diagnoses_bp, url_prefix='/api/diagnoses')

    from .api.providers import bp as providers_bp
    app.register_blueprint(providers_bp, url_prefix='/api/providers')

    from .api.department_heads import bp as department_heads_bp
    app.register_blueprint(department_heads_bp)

    return app