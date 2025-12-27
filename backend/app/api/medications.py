from flask import Blueprint, request, jsonify
from ..models import MedicationsModel, EncountersModel, ProvidersModel
from mysql.connector import Error

bp = Blueprint("medications", __name__, url_prefix="/api/medications")


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


def _safe_float(value):
    try:
        return float(value)
    except:
        return None


@bp.get("/")
def list_medications():
    """Get all medications with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "prescribed_date")
        direction = request.args.get("direction", "desc").lower()

        filters = {
            'medication_id': _value_or_none(request.args.get('medication_id')),
            'encounter_id': _value_or_none(request.args.get('encounter_id')),
            'drug_name': _value_or_none(request.args.get('drug_name')),
            'prescriber_id': _value_or_none(request.args.get('prescriber_id')),
            'prescribed_date_from': _value_or_none(request.args.get('prescribed_date_from')),
            'prescribed_date_to': _value_or_none(request.args.get('prescribed_date_to')),
            'cost_min': _safe_float(request.args.get('cost_min')),
            'cost_max': _safe_float(request.args.get('cost_max')),
        }

        result = MedicationsModel.get_all(
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
        print(f"Medications API MySQL Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        import traceback
        print(f"Medications API Exception: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@bp.get("/<medication_id>")
def get_medication(medication_id):
    """Get a single medication by ID."""
    try:
        medication = MedicationsModel.get_by_id(medication_id)
        if not medication:
            return jsonify({"error": "Medication not found"}), 404
        return jsonify(medication)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_medication():
    """Create a new medication."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'drug_name', 'prescribed_date', 'prescriber_id']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert cost to float
        if 'cost' in data:
            try:
                data['cost'] = float(data['cost']) if data['cost'] else 0.0
            except:
                data['cost'] = 0.0

        medication_id = MedicationsModel.add(data)
        medication = MedicationsModel.get_by_id(medication_id)
        return jsonify(medication), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<medication_id>")
def update_medication(medication_id):
    """Update an existing medication."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'drug_name', 'prescribed_date', 'prescriber_id']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert cost to float if present
        if 'cost' in data and data['cost']:
            try:
                data['cost'] = float(data['cost'])
            except:
                pass

        success = MedicationsModel.update(medication_id, data)
        if not success:
            return jsonify({"error": "Medication not found or no changes made"}), 404

        medication = MedicationsModel.get_by_id(medication_id)
        return jsonify(medication)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<medication_id>")
def delete_medication(medication_id):
    """Delete a medication."""
    try:
        success = MedicationsModel.delete(medication_id)
        if not success:
            return jsonify({"error": "Medication not found"}), 404
        return jsonify({"message": "Medication deleted successfully"}), 200
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
        
        result = EncountersModel.get_all(limit=limit, page=1, search=search)
        encounters = result.get('data', []) if isinstance(result, dict) else []
        return jsonify(encounters)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/prescribers")
def get_prescribers_options():
    """Get providers (prescribers) for dropdown options with optional search using SQL LIKE."""
    try:
        search = request.args.get("search", "").strip() or None
        limit = int(request.args.get("limit", 50))
        
        providers = ProvidersModel.get_all_simple(limit=limit, search=search)
        return jsonify(providers)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

