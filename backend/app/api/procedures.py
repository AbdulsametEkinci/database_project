from flask import Blueprint, request, jsonify
from ..models import ProceduresModel, EncountersModel, ProvidersModel
from mysql.connector import Error

bp = Blueprint("procedures", __name__, url_prefix="/api/procedures")


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


def _safe_float(value):
    try:
        return float(value)
    except:
        return None


@bp.get("/")
def list_procedures():
    """Get all procedures with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "procedure_date")
        direction = request.args.get("direction", "desc").lower()

        filters = {
            'procedure_id': _value_or_none(request.args.get('procedure_id')),
            'encounter_id': _value_or_none(request.args.get('encounter_id')),
            'procedure_code': _value_or_none(request.args.get('procedure_code')),
            'provider_id': _value_or_none(request.args.get('provider_id')),
            'procedure_date_from': _value_or_none(request.args.get('procedure_date_from')),
            'procedure_date_to': _value_or_none(request.args.get('procedure_date_to')),
            'procedure_cost_min': _safe_float(request.args.get('procedure_cost_min')),
            'procedure_cost_max': _safe_float(request.args.get('procedure_cost_max')),
        }

        result = ProceduresModel.get_all(
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
        print(f"Procedures API MySQL Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        import traceback
        print(f"Procedures API Exception: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@bp.get("/<procedure_id>")
def get_procedure(procedure_id):
    """Get a single procedure by ID."""
    try:
        procedure = ProceduresModel.get_by_id(procedure_id)
        if not procedure:
            return jsonify({"error": "Procedure not found"}), 404
        return jsonify(procedure)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_procedure():
    """Create a new procedure."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'procedure_code', 'procedure_date']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert procedure_cost to float
        if 'procedure_cost' in data:
            try:
                data['procedure_cost'] = float(data['procedure_cost']) if data['procedure_cost'] else 0.0
            except:
                data['procedure_cost'] = 0.0

        procedure_id = ProceduresModel.add(data)
        procedure = ProceduresModel.get_by_id(procedure_id)
        return jsonify(procedure), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<procedure_id>")
def update_procedure(procedure_id):
    """Update an existing procedure."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'procedure_code', 'procedure_date']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert procedure_cost to float if present
        if 'procedure_cost' in data and data['procedure_cost']:
            try:
                data['procedure_cost'] = float(data['procedure_cost'])
            except:
                pass

        success = ProceduresModel.update(procedure_id, data)
        if not success:
            return jsonify({"error": "Procedure not found or no changes made"}), 404

        procedure = ProceduresModel.get_by_id(procedure_id)
        return jsonify(procedure)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<procedure_id>")
def delete_procedure(procedure_id):
    """Delete a procedure."""
    try:
        success = ProceduresModel.delete(procedure_id)
        if not success:
            return jsonify({"error": "Procedure not found"}), 404
        return jsonify({"message": "Procedure deleted successfully"}), 200
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


@bp.get("/options/procedure-codes")
def get_procedure_codes():
    """Get all distinct procedure codes."""
    try:
        codes = ProceduresModel.get_distinct_codes()
        return jsonify(codes)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

