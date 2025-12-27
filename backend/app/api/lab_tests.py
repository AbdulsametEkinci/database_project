from flask import Blueprint, request, jsonify
from ..models import LabTestsModel, EncountersModel
from mysql.connector import Error

bp = Blueprint("lab_tests", __name__, url_prefix="/api/lab-tests")


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


@bp.get("/")
def list_lab_tests():
    """Get all lab tests with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "test_date")
        direction = request.args.get("direction", "desc").lower()

        filters = {
            'test_id': _value_or_none(request.args.get('test_id')),
            'encounter_id': _value_or_none(request.args.get('encounter_id')),
            'test_code': _value_or_none(request.args.get('test_code')),
            'lab_id': _value_or_none(request.args.get('lab_id')),
            'test_date_from': _value_or_none(request.args.get('test_date_from')),
            'test_date_to': _value_or_none(request.args.get('test_date_to')),
            'status': _value_or_none(request.args.get('status')),
            'specimen_type': _value_or_none(request.args.get('specimen_type')),
        }

        result = LabTestsModel.get_all(
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
        print(f"Lab Tests API MySQL Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        import traceback
        print(f"Lab Tests API Exception: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@bp.get("/<test_id>")
def get_lab_test(test_id):
    """Get a single lab test by ID."""
    try:
        lab_test = LabTestsModel.get_by_id(test_id)
        if not lab_test:
            return jsonify({"error": "Lab test not found"}), 404
        return jsonify(lab_test)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_lab_test():
    """Create a new lab test."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'test_code', 'test_name', 'test_date', 'status']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Set default values for units and normal_range if not provided
        if 'units' not in data or not data['units']:
            data['units'] = 'N/A'
        if 'normal_range' not in data or not data['normal_range']:
            data['normal_range'] = 'N/A'

        test_id = LabTestsModel.add(data)
        lab_test = LabTestsModel.get_by_id(test_id)
        return jsonify(lab_test), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<test_id>")
def update_lab_test(test_id):
    """Update an existing lab test."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'test_code', 'test_name', 'test_date', 'status']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Set default values for units and normal_range if empty
        if 'units' in data and data['units'] == "":
            data['units'] = 'N/A'
        if 'normal_range' in data and data['normal_range'] == "":
            data['normal_range'] = 'N/A'

        success = LabTestsModel.update(test_id, data)
        if not success:
            return jsonify({"error": "Lab test not found or no changes made"}), 404

        lab_test = LabTestsModel.get_by_id(test_id)
        return jsonify(lab_test)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<test_id>")
def delete_lab_test(test_id):
    """Delete a lab test."""
    try:
        success = LabTestsModel.delete(test_id)
        if not success:
            return jsonify({"error": "Lab test not found"}), 404
        return jsonify({"message": "Lab test deleted successfully"}), 200
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


@bp.get("/options/test-codes")
def get_test_codes():
    """Get all distinct test codes with test names."""
    try:
        codes = LabTestsModel.get_distinct_codes()
        return jsonify(codes)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/lab-ids")
def get_lab_ids():
    """Get all distinct lab IDs."""
    try:
        lab_ids = LabTestsModel.get_distinct_lab_ids()
        return jsonify(lab_ids)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/specimen-types")
def get_specimen_types():
    """Get all distinct specimen types."""
    try:
        specimen_types = LabTestsModel.get_distinct_specimen_types()
        return jsonify(specimen_types)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/units")
def get_units():
    """Get all distinct units."""
    try:
        units = LabTestsModel.get_distinct_units()
        return jsonify(units)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/normal-ranges")
def get_normal_ranges():
    """Get all distinct normal ranges."""
    try:
        normal_ranges = LabTestsModel.get_distinct_normal_ranges()
        return jsonify(normal_ranges)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/test-results")
def get_test_results():
    """Get all distinct test results."""
    try:
        test_results = LabTestsModel.get_distinct_test_results()
        return jsonify(test_results)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

