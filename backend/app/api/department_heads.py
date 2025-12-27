from flask import Blueprint, request, jsonify
from ..models import DepartmentHeadsModel
from mysql.connector import Error

bp = Blueprint("department_heads", __name__, url_prefix="/api/department-heads")


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


def _safe_int(value):
    try:
        return int(value)
    except:
        return None


@bp.get("/")
def list_department_heads():
    """Get all department heads with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "department")
        direction = request.args.get("direction", "asc").lower()

        filters = {
            'head_id': _safe_int(request.args.get('head_id')),
            'department': _value_or_none(request.args.get('department')),
            'head_provider_id': _value_or_none(request.args.get('head_provider_id')),
            'head_name': _value_or_none(request.args.get('head_name')),
            'head_email': _value_or_none(request.args.get('head_email')),
        }

        result = DepartmentHeadsModel.get_all(
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
        print(f"Department Heads API MySQL Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        import traceback
        print(f"Department Heads API Exception: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@bp.get("/<int:head_id>")
def get_department_head(head_id):
    """Get a single department head by ID."""
    try:
        head = DepartmentHeadsModel.get_by_id(head_id)
        if not head:
            return jsonify({"error": "Department head not found"}), 404
        return jsonify(head)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_department_head():
    """Create a new department head."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        # Note: head_name and head_email are auto-filled from provider, so they're optional
        required_fields = ['department', 'head_provider_id']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert head_id to int if present
        if 'head_id' in data and data['head_id']:
            try:
                data['head_id'] = int(data['head_id'])
            except:
                data['head_id'] = None

        head_id = DepartmentHeadsModel.add(data)
        head = DepartmentHeadsModel.get_by_id(head_id)
        return jsonify(head), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<int:head_id>")
def update_department_head(head_id):
    """Update an existing department head."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        # Note: head_name and head_email are auto-filled from provider during update
        required_fields = ['department', 'head_provider_id']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        success = DepartmentHeadsModel.update(head_id, data)
        if not success:
            return jsonify({"error": "Department head not found or no changes made"}), 404

        head = DepartmentHeadsModel.get_by_id(head_id)
        return jsonify(head)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<int:head_id>")
def delete_department_head(head_id):
    """Delete a department head."""
    try:
        success = DepartmentHeadsModel.delete(head_id)
        if not success:
            return jsonify({"error": "Department head not found"}), 404
        return jsonify({"message": "Department head deleted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

