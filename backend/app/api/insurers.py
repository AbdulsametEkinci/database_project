from flask import Blueprint, request, jsonify
from ..models import InsurersModel
from mysql.connector import Error

bp = Blueprint("insurers", __name__)


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


@bp.get("/")
def list_insurers():
    """Get all insurers with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "name")
        direction = request.args.get("direction", "asc").lower()

        filters = {
            'code': _value_or_none(request.args.get('code')),
            'name': _value_or_none(request.args.get('name')),
            'payer_type': _value_or_none(request.args.get('payer_type'))
        }

        result = InsurersModel.get_all(
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


@bp.get("/<int:insurer_id>")
def get_insurer(insurer_id):
    """Get a single insurer by ID."""
    try:
        insurer = InsurersModel.get_by_id(insurer_id)
        if not insurer:
            return jsonify({"error": "Insurer not found"}), 404
        return jsonify(insurer)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_insurer():
    """Create a new insurer."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['code', 'name', 'payer_type']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        insurer_id = InsurersModel.add(data)
        insurer = InsurersModel.get_by_id(insurer_id)
        return jsonify(insurer), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<int:insurer_id>")
def update_insurer(insurer_id):
    """Update an existing insurer."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['code', 'name', 'payer_type']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        success = InsurersModel.update(insurer_id, data)
        if not success:
            return jsonify({"error": "Insurer not found or no changes made"}), 404

        insurer = InsurersModel.get_by_id(insurer_id)
        return jsonify(insurer)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<int:insurer_id>")
def delete_insurer(insurer_id):
    """Delete an insurer."""
    try:
        success = InsurersModel.delete(insurer_id)
        if not success:
            return jsonify({"error": "Insurer not found"}), 404
        return jsonify({"message": "Insurer deleted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

