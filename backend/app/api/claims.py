from flask import Blueprint, request, jsonify
from ..models import ClaimsAndBillingModel, EncountersModel
from mysql.connector import Error

bp = Blueprint("claims", __name__, url_prefix="/api/claims")


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


def _safe_float(value):
    try:
        return float(value)
    except:
        return None


@bp.get("/")
def list_claims():
    """Get all claims with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "claim_billing_date")
        direction = request.args.get("direction", "desc").lower()

        filters = {
            'billing_id': _value_or_none(request.args.get('billing_id')),
            'encounter_id': _value_or_none(request.args.get('encounter_id')),
            'claim_status': _value_or_none(request.args.get('claim_status')),
            'billed_amount_min': _safe_float(request.args.get('billed_amount_min')),
            'billed_amount_max': _safe_float(request.args.get('billed_amount_max')),
            'claim_date_from': _value_or_none(request.args.get('claim_date_from')),
            'claim_date_to': _value_or_none(request.args.get('claim_date_to')),
            'payment_method': _value_or_none(request.args.get('payment_method'))
        }

        result = ClaimsAndBillingModel.get_all(
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
        print(f"Claims API MySQL Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        import traceback
        print(f"Claims API Exception: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@bp.get("/<billing_id>")
def get_claim(billing_id):
    """Get a single claim by billing_id."""
    try:
        claim = ClaimsAndBillingModel.get_by_id(billing_id)
        if not claim:
            return jsonify({"error": "Claim not found"}), 404
        return jsonify(claim)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/by-claim-id/<claim_id>")
def get_claim_by_claim_id(claim_id):
    """Get a single claim by claim_id (not billing_id)."""
    try:
        from ..db import get_db_connection
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT cb.*, p.first_name, p.last_name
            FROM claims_and_billing cb
            LEFT JOIN patients p ON cb.patient_id = p.patient_id
            WHERE cb.claim_id = %s
            LIMIT 1
        """, (claim_id,))
        
        claim = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not claim:
            return jsonify({"error": "Claim not found"}), 404
        return jsonify(claim)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_claim():
    """Create a new claim."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'claim_billing_date', 'billed_amount', 'claim_status']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert billed_amount to float
        if 'billed_amount' in data:
            try:
                data['billed_amount'] = float(data['billed_amount']) if data['billed_amount'] else 0.0
            except:
                data['billed_amount'] = 0.0

        billing_id = ClaimsAndBillingModel.add(data)
        claim = ClaimsAndBillingModel.get_by_id(billing_id)
        return jsonify(claim), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<billing_id>")
def update_claim(billing_id):
    """Update an existing claim."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['encounter_id', 'claim_billing_date', 'billed_amount', 'claim_status']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert billed_amount to float if present
        if 'billed_amount' in data and data['billed_amount']:
            try:
                data['billed_amount'] = float(data['billed_amount'])
            except:
                pass

        success = ClaimsAndBillingModel.update(billing_id, data)
        if not success:
            return jsonify({"error": "Claim not found or no changes made"}), 404

        claim = ClaimsAndBillingModel.get_by_id(billing_id)
        return jsonify(claim)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<billing_id>")
def delete_claim(billing_id):
    """Delete a claim."""
    try:
        success = ClaimsAndBillingModel.delete(billing_id)
        if not success:
            return jsonify({"error": "Claim not found"}), 404
        return jsonify({"message": "Claim deleted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/sync/<encounter_id>")
def sync_claim_amount(encounter_id):
    """Sync claim amount from procedures and medications for an encounter."""
    try:
        success = ClaimsAndBillingModel.sync_claim_amount(encounter_id)
        if success:
            return jsonify({"message": "Claim amount synced successfully"}), 200
        else:
            return jsonify({"error": "Failed to sync claim amount"}), 500
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/statistics")
def get_statistics():
    """Get claim statistics grouped by status."""
    try:
        stats = ClaimsAndBillingModel.get_claim_statistics()
        return jsonify(stats)
    except Error as e:
        return jsonify({"error": str(e)}), 500
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
