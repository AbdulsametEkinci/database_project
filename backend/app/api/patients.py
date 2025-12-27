from flask import Blueprint, request, jsonify
from ..models import PatientsModel, InsurersModel
from mysql.connector import Error

bp = Blueprint("patients", __name__)


def _safe_int(value):
    try:
        return int(value)
    except:
        return None


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


@bp.get("/")
def list_patients():
    """Get all patients with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "registration_date")
        direction = request.args.get("direction", "desc").lower()

        filters = {
            'patient_id': _value_or_none(request.args.get('patient_id')),
            'first_name': _value_or_none(request.args.get('first_name')),
            'last_name': _value_or_none(request.args.get('last_name')),
            'gender': _value_or_none(request.args.get('gender')),
            'insurance_type': _value_or_none(request.args.get('insurance_type')),
            'age_exact': _safe_int(request.args.get('age')),
            'registration_from': _value_or_none(request.args.get('registration_from')),
            'city': _value_or_none(request.args.get('city'))
        }

        result = PatientsModel.get_all(
            limit=limit,
            page=page,
            search=search,
            filters=filters,
            sort_by=sort_by,
            sort_dir=direction
        )
        return jsonify(result)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/<patient_id>")
def get_patient(patient_id):
    """Get a single patient by ID."""
    try:
        patient = PatientsModel.get_by_id(patient_id)
        if not patient:
            return jsonify({"error": "Patient not found"}), 404
        return jsonify(patient)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_patient():
    """Create a new patient."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        # BUT preserve required fields (first_name, last_name, dob, gender should not be converted to None)
        required_fields = ['first_name', 'last_name', 'dob', 'gender']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        patient_id = PatientsModel.add(data)
        patient = PatientsModel.get_by_id(patient_id)
        return jsonify(patient), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<patient_id>")
def update_patient(patient_id):
    """Update an existing patient. Age is automatically calculated from dob."""
    try:
        data = request.get_json() or {}
        # Remove age if present - it will be auto-calculated from dob
        if 'age' in data:
            del data['age']
        
        # Clean up data - convert empty strings to None
        # BUT preserve required fields for validation
        required_fields = ['first_name', 'last_name', 'dob', 'gender']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        success = PatientsModel.update(patient_id, data)
        if not success:
            return jsonify({"error": "Patient not found or no changes made"}), 404

        patient = PatientsModel.get_by_id(patient_id)
        return jsonify(patient)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<patient_id>")
def delete_patient(patient_id):
    """Delete a patient."""
    try:
        success = PatientsModel.delete(patient_id)
        if not success:
            return jsonify({"error": "Patient not found"}), 404
        return jsonify({"message": "Patient deleted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/insurers")
def get_insurers():
    """Get all insurers for dropdown options."""
    try:
        result = InsurersModel.get_all(limit=1000, page=1)  # Get all insurers
        # Return just the data array, not the pagination wrapper
        insurers = result.get('data', []) if isinstance(result, dict) else []
        return jsonify(insurers)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
