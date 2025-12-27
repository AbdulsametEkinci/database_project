from flask import Blueprint, request, jsonify
from ..models import ProvidersModel, DepartmentHeadsModel
from mysql.connector import Error

bp = Blueprint("providers", __name__, url_prefix="/api/providers")


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


def _safe_int(value):
    try:
        return int(value)
    except:
        return None


@bp.get("/")
def list_providers():
    """Get all providers with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "name")
        direction = request.args.get("direction", "asc").lower()

        filters = {
            'provider_id': _value_or_none(request.args.get('provider_id')),
            'name': _value_or_none(request.args.get('name')),
            'department': _value_or_none(request.args.get('department')),
            'specialty': _value_or_none(request.args.get('specialty')),
            'npi': _value_or_none(request.args.get('npi')),
            'inhouse': _value_or_none(request.args.get('inhouse')),
            'head_id': _safe_int(request.args.get('head_id')),
        }

        result = ProvidersModel.get_all(
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
        print(f"Providers API MySQL Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        import traceback
        print(f"Providers API Exception: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@bp.get("/<provider_id>")
def get_provider(provider_id):
    """Get a single provider by ID."""
    try:
        provider = ProvidersModel.get_by_id(provider_id)
        if not provider:
            return jsonify({"error": "Provider not found"}), 404
        return jsonify(provider)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_provider():
    """Create a new provider."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['name', 'department', 'specialty', 'npi']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert inhouse to boolean
        if 'inhouse' in data:
            if isinstance(data['inhouse'], str):
                data['inhouse'] = data['inhouse'].lower() in ['true', '1', 'yes']
        
        # Convert years_experience and head_id to int if present
        if 'years_experience' in data and data['years_experience']:
            try:
                data['years_experience'] = int(data['years_experience'])
            except:
                data['years_experience'] = None
        if 'head_id' in data and data['head_id']:
            try:
                data['head_id'] = int(data['head_id'])
            except:
                data['head_id'] = None

        provider_id = ProvidersModel.add(data)
        provider = ProvidersModel.get_by_id(provider_id)
        return jsonify(provider), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<provider_id>")
def update_provider(provider_id):
    """Update an existing provider."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['name', 'department', 'specialty', 'npi']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert inhouse to boolean if present
        if 'inhouse' in data and isinstance(data['inhouse'], str):
            data['inhouse'] = data['inhouse'].lower() in ['true', '1', 'yes']
        
        # Convert years_experience and head_id to int if present
        if 'years_experience' in data and data['years_experience']:
            try:
                data['years_experience'] = int(data['years_experience'])
            except:
                data['years_experience'] = None
        if 'head_id' in data and data['head_id']:
            try:
                data['head_id'] = int(data['head_id'])
            except:
                data['head_id'] = None

        success = ProvidersModel.update(provider_id, data)
        if not success:
            return jsonify({"error": "Provider not found or no changes made"}), 404

        provider = ProvidersModel.get_by_id(provider_id)
        return jsonify(provider)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<provider_id>")
def delete_provider(provider_id):
    """Delete a provider."""
    try:
        success = ProvidersModel.delete(provider_id)
        if not success:
            return jsonify({"error": "Provider not found"}), 404
        return jsonify({"message": "Provider deleted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/department-heads")
def get_department_heads_options():
    """Get department heads for dropdown options with optional search using SQL LIKE."""
    try:
        search = request.args.get("search", "").strip() or None
        department = request.args.get("department", "").strip() or None
        limit = int(request.args.get("limit", 50))
        
        result = DepartmentHeadsModel.get_all(limit=limit, page=1, search=search)
        department_heads = result.get('data', []) if isinstance(result, dict) else []
        
        # Filter by department if provided
        if department:
            department_heads = [dh for dh in department_heads if dh.get('department') == department]
        
        return jsonify(department_heads)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/departments")
def get_departments():
    """Get all distinct departments."""
    try:
        departments = ProvidersModel.get_departments()
        return jsonify(departments)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/specialties")
def get_specialties():
    """Get all distinct specialties, optionally filtered by department."""
    try:
        department = request.args.get("department", "").strip() or None
        specialties = ProvidersModel.get_specialties(department=department)
        return jsonify(specialties)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

