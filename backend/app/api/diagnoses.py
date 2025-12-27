from flask import Blueprint, request, jsonify
from ..models import DiagnosesModel, EncountersModel
from mysql.connector import Error

bp = Blueprint("diagnoses", __name__, url_prefix="/api/diagnoses")


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


@bp.get("/")
def list_diagnoses():
    """Get all diagnoses with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "diagnosis_id")
        direction = request.args.get("direction", "desc").lower()

        filters = {
            'diagnosis_id': _value_or_none(request.args.get('diagnosis_id')),
            'encounter_id': _value_or_none(request.args.get('encounter_id')),
            'diagnosis_code': _value_or_none(request.args.get('diagnosis_code')),
            'primary_flag': _value_or_none(request.args.get('primary_flag')),
            'chronic_flag': _value_or_none(request.args.get('chronic_flag')),
        }

        result = DiagnosesModel.get_all(
            limit=limit,
            page=page,
            search=search,
            filters=filters,
            sort_by=sort_by,
            sort_dir=direction
        )
        return jsonify(result)
    except Error as e:
        import traceback
        print(f"Diagnoses API MySQL Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        import traceback
        print(f"Diagnoses API Exception: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@bp.get("/<diagnosis_id>")
def get_diagnosis(diagnosis_id):
    """Get a single diagnosis by ID."""
    try:
        diagnosis = DiagnosesModel.get_by_id(diagnosis_id)
        if not diagnosis:
            return jsonify({"error": "Diagnosis not found"}), 404
        return jsonify(diagnosis)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_diagnosis():
    """Create a new diagnosis."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'diagnosis_code']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        diagnosis_id = DiagnosesModel.add(data)
        diagnosis = DiagnosesModel.get_by_id(diagnosis_id)
        return jsonify(diagnosis), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<diagnosis_id>")
def update_diagnosis(diagnosis_id):
    """Update an existing diagnosis."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'diagnosis_code']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        success = DiagnosesModel.update(diagnosis_id, data)
        if not success:
            return jsonify({"error": "Diagnosis not found or no changes made"}), 404

        diagnosis = DiagnosesModel.get_by_id(diagnosis_id)
        return jsonify(diagnosis)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<diagnosis_id>")
def delete_diagnosis(diagnosis_id):
    """Delete a diagnosis."""
    try:
        success = DiagnosesModel.delete(diagnosis_id)
        if not success:
            return jsonify({"error": "Diagnosis not found"}), 404
        return jsonify({"message": "Diagnosis deleted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/encounters")
def get_encounters_options():
    """Get encounters for dropdown options with optional search using SQL LIKE."""
    try:
        search = request.args.get("search", "").strip() or None
        limit = int(request.args.get("limit", 50))
        available_only = request.args.get("available_only", "false").lower() == "true"
        
        if available_only:
            encounters = DiagnosesModel.get_available_encounters(search=search, limit=limit)
        else:
            result = EncountersModel.get_all(limit=limit, page=1, search=search)
            encounters = result.get('data', []) if isinstance(result, dict) else []
            
        return jsonify(encounters)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.get("/options/diagnosis-codes")
def get_diagnosis_codes():
    """Get all distinct diagnosis codes."""
    try:
        codes = DiagnosesModel.get_distinct_codes()
        return jsonify(codes)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

