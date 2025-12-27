from flask import Blueprint, request, jsonify
from ..models import EncountersModel, PatientsModel, ProvidersModel
from ..db import get_db_connection
from mysql.connector import Error

bp = Blueprint("encounters", __name__)


def _safe_int(value):
    try:
        return int(value)
    except:
        return None


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


def _bool_from_request(value):
    if value is None or value == "":
        return None
    return value.lower() in ("1", "true", "yes", "y")


@bp.get("/")
def list_encounters():
    """Get all encounters with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "visit_date")
        direction = request.args.get("direction", "desc").lower()

        filters = {
            'encounter_id': _value_or_none(request.args.get('encounter_id')),
            'patient_id': _value_or_none(request.args.get('patient_id')),
            'provider_id': _value_or_none(request.args.get('provider_id')),
            'patient_name': _value_or_none(request.args.get('patient_name')),
            'provider_name': _value_or_none(request.args.get('provider_name')),
            'department': _value_or_none(request.args.get('department')),
            'status': _value_or_none(request.args.get('status')),
            'visit_from': _value_or_none(request.args.get('visit_from')),
            'readmitted_flag': _bool_from_request(request.args.get('readmitted_flag'))
        }

        result = EncountersModel.get_all(
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


@bp.get("/<encounter_id>")
def get_encounter(encounter_id):
    """Get a single encounter by ID."""
    try:
        encounter = EncountersModel.get_by_id(encounter_id)
        if not encounter:
            return jsonify({"error": "Encounter not found"}), 404
        return jsonify(encounter)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_encounter():
    """Create a new encounter."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        # BUT preserve required fields (patient_id, provider_id, visit_date should not be converted to None)
        required_fields = ['patient_id', 'provider_id', 'visit_date']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Handle boolean field
        if 'readmitted_flag' in data:
            data['readmitted_flag'] = bool(data['readmitted_flag'])

        encounter_id = EncountersModel.add(data)
        encounter = EncountersModel.get_by_id(encounter_id)
        return jsonify(encounter), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<encounter_id>")
def update_encounter(encounter_id):
    """Update an existing encounter. Department is auto-filled from provider if not provided."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        # BUT preserve required fields for validation
        required_fields = ['patient_id', 'provider_id', 'visit_date']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Handle boolean field
        if 'readmitted_flag' in data:
            data['readmitted_flag'] = bool(data['readmitted_flag'])

        success = EncountersModel.update(encounter_id, data)
        if not success:
            return jsonify({"error": "Encounter not found or no changes made"}), 404

        encounter = EncountersModel.get_by_id(encounter_id)
        return jsonify(encounter)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<encounter_id>")
def delete_encounter(encounter_id):
    """Delete an encounter."""
    try:
        success = EncountersModel.delete(encounter_id)
        if not success:
            return jsonify({"error": "Encounter not found"}), 404
        return jsonify({"message": "Encounter deleted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/patients")
def get_patients_options():
    """Get patients for dropdown options with optional search using SQL LIKE."""
    try:
        search = request.args.get("search", "").strip() or None
        limit = int(request.args.get("limit", 50))
        
        result = PatientsModel.get_all(limit=limit, page=1, search=search)
        # Handle both old format (array) and new format (object)
        patients = result if isinstance(result, list) else (result.get('data', []) if isinstance(result, dict) else [])
        return jsonify(patients)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/providers")
def get_providers_options():
    """Get providers for dropdown options with optional search using SQL LIKE."""
    try:
        search = request.args.get("search", "").strip() or None
        limit = int(request.args.get("limit", 50))
        
        providers = ProvidersModel.get_all_simple(limit=limit, search=search)
        return jsonify(providers)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/departments")
def get_departments_options():
    """Get all departments for dropdown options."""
    try:
        departments = ProvidersModel.get_departments()
        return jsonify(departments)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/<encounter_id>/related")
def get_encounter_related(encounter_id):
    """Get all related data for an encounter: medications, procedures, diagnoses, lab_tests, claims."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        related_data = {
            "medications": [],
            "procedures": [],
            "diagnoses": [],
            "lab_tests": [],
            "claims": []
        }
        
        # Get medications
        cursor.execute("""
            SELECT m.*, p.name as prescriber_name
            FROM medications m
            LEFT JOIN providers p ON m.prescriber_id = p.provider_id
            WHERE m.encounter_id = %s
            ORDER BY m.prescribed_date DESC
        """, (encounter_id,))
        related_data["medications"] = cursor.fetchall()
        
        # Get procedures
        cursor.execute("""
            SELECT pr.*, p.name as provider_name
            FROM procedures pr
            LEFT JOIN providers p ON pr.provider_id = p.provider_id
            WHERE pr.encounter_id = %s
            ORDER BY pr.procedure_date DESC
        """, (encounter_id,))
        related_data["procedures"] = cursor.fetchall()
        
        # Get diagnoses
        cursor.execute("""
            SELECT *
            FROM diagnoses
            WHERE encounter_id = %s
            ORDER BY primary_flag DESC, diagnosis_id
        """, (encounter_id,))
        related_data["diagnoses"] = cursor.fetchall()
        
        # Get lab_tests
        cursor.execute("""
            SELECT *
            FROM lab_tests
            WHERE encounter_id = %s
            ORDER BY test_date DESC
        """, (encounter_id,))
        related_data["lab_tests"] = cursor.fetchall()
        
        # Get claims
        cursor.execute("""
            SELECT cb.*, p.first_name, p.last_name
            FROM claims_and_billing cb
            LEFT JOIN patients p ON cb.patient_id = p.patient_id
            WHERE cb.encounter_id = %s
            ORDER BY cb.claim_billing_date DESC
        """, (encounter_id,))
        related_data["claims"] = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(related_data)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

