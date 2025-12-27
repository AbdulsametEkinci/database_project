from flask import Blueprint, request, jsonify
from ..models import DenialsModel, ClaimsAndBillingModel
from ..db import get_conn
from mysql.connector import Error

bp = Blueprint("denials", __name__, url_prefix="/api/denials")


def _value_or_none(value):
    return value.strip() if value and value.strip() else None


def _safe_float(value):
    try:
        return float(value)
    except:
        return None


@bp.get("/")
def list_denials():
    """Get all denials with optional search, filters, sorting, and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        page = int(request.args.get("page", 1))
        search = request.args.get("q", "").strip() or None
        sort_by = request.args.get("sort", "denial_date")
        direction = request.args.get("direction", "desc").lower()

        filters = {
            'denial_id': _value_or_none(request.args.get('denial_id')),
            'claim_id': _value_or_none(request.args.get('claim_id')),
            'appeal_status': _value_or_none(request.args.get('appeal_status')),
            'appeal_filed': _value_or_none(request.args.get('appeal_filed')),
            'denial_date_from': _value_or_none(request.args.get('denial_date_from')),
            'denial_date_to': _value_or_none(request.args.get('denial_date_to'))
        }

        result = DenialsModel.get_all(
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
        print(f"Denials API MySQL Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        import traceback
        print(f"Denials API Exception: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@bp.get("/<denial_id>")
def get_denial(denial_id):
    """Get a single denial by ID."""
    try:
        denial = DenialsModel.get_by_id(denial_id)
        if not denial:
            return jsonify({"error": "Denial not found"}), 404
        return jsonify(denial)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/claim/<claim_id>")
def get_denial_by_claim(claim_id):
    """Get denial by claim_id."""
    try:
        denial = DenialsModel.get_by_claim_id(claim_id)
        if not denial:
            return jsonify({"error": "Denial not found for this claim"}), 404
        return jsonify(denial)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.post("/")
def create_denial():
    """Create a new denial."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['claim_id', 'denial_reason_code', 'denied_amount', 'denial_date']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert denied_amount to float
        if 'denied_amount' in data:
            try:
                data['denied_amount'] = float(data['denied_amount']) if data['denied_amount'] else 0.0
            except:
                data['denied_amount'] = 0.0

        denial_id = DenialsModel.add(data)
        denial = DenialsModel.get_by_id(denial_id)
        return jsonify(denial), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.put("/<denial_id>")
def update_denial(denial_id):
    """Update an existing denial."""
    try:
        data = request.get_json() or {}
        # Clean up data - convert empty strings to None
        required_fields = ['denial_reason_code', 'denied_amount', 'denial_date']
        for key, value in data.items():
            if value == "" and key not in required_fields:
                data[key] = None

        # Convert denied_amount to float if present
        if 'denied_amount' in data and data['denied_amount']:
            try:
                data['denied_amount'] = float(data['denied_amount'])
            except:
                pass

        success = DenialsModel.update(denial_id, data)
        if not success:
            return jsonify({"error": "Denial not found or no changes made"}), 404

        denial = DenialsModel.get_by_id(denial_id)
        return jsonify(denial)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.delete("/<denial_id>")
def delete_denial(denial_id):
    """Delete a denial."""
    try:
        success = DenialsModel.delete(denial_id)
        if not success:
            return jsonify({"error": "Denial not found"}), 404
        return jsonify({"message": "Denial deleted successfully"}), 200
    except Error as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/claims")
def get_claims_options():
    """Get claims for dropdown options with optional search using SQL LIKE."""
    try:
        search = request.args.get("search", "").strip() or None
        limit = int(request.args.get("limit", 50))
        
        result = ClaimsAndBillingModel.get_all(limit=limit, page=1, search=search)
        claims = result.get('data', []) if isinstance(result, dict) else []
        # Return only claim_id and billing_id for dropdown
        options = [{"claim_id": c.get("claim_id"), "billing_id": c.get("billing_id")} for c in claims if c.get("claim_id")]
        return jsonify(options)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/denial-reason-codes")
def get_denial_reason_codes():
    """Get all distinct denial reason codes."""
    try:
        codes = DenialsModel.get_distinct_codes()
        return jsonify(codes)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.get("/options/billing-for-denial")
def get_billing_for_denial():
    """
    Get billing IDs for denial creation dropdown.
    Only returns billing records where:
    - claim_status = 'Denied'
    - claim_id IS NOT NULL (insurance claims only)
    - claim_id NOT EXISTS in denials table (not already denied)
    """
    try:
        search = request.args.get("search", "").strip() or None
        limit = int(request.args.get("limit", 50))
        
        conn = get_conn()
        cursor = conn.cursor(dictionary=True)
        
        # Query: billing with status='Denied' AND claim_id not in denials
        query = """
            SELECT DISTINCT 
                cb.billing_id,
                cb.claim_id,
                cb.encounter_id,
                cb.billed_amount,
                cb.claim_billing_date,
                p.first_name,
                p.last_name
            FROM claims_and_billing cb
            LEFT JOIN patients p ON cb.patient_id = p.patient_id
            WHERE cb.claim_status = 'Denied'
                AND cb.claim_id IS NOT NULL
                AND cb.claim_id NOT IN (
                    SELECT claim_id FROM denials WHERE claim_id IS NOT NULL
                )
        """
        params = []
        
        if search:
            query += " AND (cb.billing_id LIKE %s OR cb.claim_id LIKE %s OR cb.encounter_id LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s)"
            search_term = f"%{search}%"
            params = [search_term, search_term, search_term, search_term]
        
        query += " ORDER BY cb.claim_billing_date DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        billings = cursor.fetchall()
        
        options = []
        for b in billings:
            options.append({
                "billing_id": b.get("billing_id"),
                "claim_id": b.get("claim_id"),
                "encounter_id": b.get("encounter_id"),
                "billed_amount": float(b.get("billed_amount", 0)) if b.get("billed_amount") else 0.0,
                "claim_billing_date": b.get("claim_billing_date"),
                "patient_name": f"{b.get('first_name', '')} {b.get('last_name', '')}".strip()
            })
        
        cursor.close()
        conn.close()
        return jsonify(options)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
