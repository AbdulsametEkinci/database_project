from flask import Blueprint, jsonify, request
from ..db import get_conn
from datetime import datetime, timedelta

bp = Blueprint("dashboard", __name__)

@bp.get("/stats")
def get_dashboard_stats():
    """Get dashboard statistics for selected date."""
    try:
        with get_conn() as conn:
            with conn.cursor(dictionary=True) as cur:
                # Parse date parameter
                date_param = request.args.get('date')
                if date_param:
                    today = date_param
                else:
                    today = datetime.now().strftime('%Y-%m-%d')
                
                # Count active patients with non-completed encounters
                cur.execute("""
                    SELECT COUNT(DISTINCT patient_id) AS count
                    FROM (
                        SELECT DISTINCT e.patient_id
                        FROM encounters e
                        WHERE e.status != 'Completed'
                        GROUP BY e.patient_id
                        HAVING COUNT(e.encounter_id) > 0
                    ) AS active_patients;
                """)
                result = cur.fetchone()
                active_patients = result['count'] if result else 0

                # Count open encounters
                cur.execute("SELECT COUNT(*) AS count FROM encounters WHERE status != 'Completed';")
                result = cur.fetchone()
                open_encounters = result['count'] if result else 0

                # Count procedures for selected date
                cur.execute("""
                    SELECT COUNT(*) AS count 
                    FROM procedures 
                    WHERE DATE(procedure_date) = %s
                    GROUP BY DATE(procedure_date);
                """, (today,))
                result = cur.fetchone()
                procedures_today = result['count'] if result else 0

                # Count medications issued on selected date
                cur.execute("""
                    SELECT COUNT(*) AS count 
                    FROM medications 
                    WHERE DATE(prescribed_date) = %s
                    GROUP BY DATE(prescribed_date);
                """, (today,))
                result = cur.fetchone()
                medications_issued = result['count'] if result else 0

                # Calculate average length of stay
                cur.execute("""
                    SELECT AVG(length_of_stay) AS avg_stay 
                    FROM encounters 
                    WHERE length_of_stay IS NOT NULL AND length_of_stay > 0
                    GROUP BY status
                    HAVING AVG(length_of_stay) IS NOT NULL;
                """)
                avg_results = cur.fetchall()
                if avg_results:
                    avg_stay = round(sum(row['avg_stay'] for row in avg_results) / len(avg_results), 1)
                else:
                    cur.execute("SELECT AVG(length_of_stay) AS avg_stay FROM encounters WHERE length_of_stay IS NOT NULL;")
                    result = cur.fetchone()
                    avg_stay = round(result['avg_stay'], 1) if result and result['avg_stay'] is not None else 0.0

                # Calculate claims approval rate for selected date
                cur.execute("""
                    SELECT 
                        claim_status,
                        COUNT(*) AS count,
                        (SUM(CASE WHEN claim_status = 'Paid' THEN 1 ELSE 0 END) / COUNT(*)) * 100 AS approval_rate 
                    FROM claims_and_billing 
                    WHERE claim_status IS NOT NULL 
                    AND DATE(claim_billing_date) = %s
                    GROUP BY claim_status;
                """, (today,))
                claim_results = cur.fetchall()
                total_claims = sum(row['count'] for row in claim_results) if claim_results else 0
                paid_claims = sum(row['count'] for row in claim_results if row['claim_status'] == 'Paid') if claim_results else 0
                approval_rate = round((paid_claims / total_claims * 100) if total_claims > 0 else 0)

                stats = {
                    "active_patients": active_patients,
                    "open_encounters": open_encounters,
                    "procedures_today": procedures_today,
                    "medications_issued": medications_issued,
                    "avg_stay": avg_stay,
                    "claims_approval_rate": approval_rate
                }
                
                return jsonify(stats)

    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return jsonify({"error": str(e)}), 500


@bp.get("/recent-activities")
def get_recent_activities():
    """Get recent activities from last 7 days."""
    try:
        with get_conn() as conn:
            with conn.cursor(dictionary=True) as cur:
                # Parse date and calculate 7 days ago
                date_param = request.args.get('date')
                if date_param:
                    today = date_param
                    today_date = datetime.strptime(today, '%Y-%m-%d')
                    seven_days_ago_date = today_date - timedelta(days=7)
                    seven_days_ago = seven_days_ago_date.strftime('%Y-%m-%d')
                else:
                    today = datetime.now().strftime('%Y-%m-%d')
                    seven_days_ago_date = datetime.now() - timedelta(days=7)
                    seven_days_ago = seven_days_ago_date.strftime('%Y-%m-%d')
                
                activities = []
                
                # Fetch recent procedures with patient and provider info
                cur.execute("""
                    SELECT 
                        p.procedure_id,
                        p.procedure_date,
                        p.procedure_code,
                        p.procedure_description,
                        p.procedure_cost,
                        e.encounter_id,
                        e.visit_date,
                        e.visit_type,
                        pt.patient_id,
                        pt.first_name AS patient_first_name,
                        pt.last_name AS patient_last_name,
                        pr.provider_id,
                        pr.name AS provider_name,
                        pr.specialty AS provider_specialty,
                        'procedure' AS activity_type
                    FROM procedures p
                    INNER JOIN encounters e ON p.encounter_id = e.encounter_id
                    INNER JOIN patients pt ON e.patient_id = pt.patient_id
                    LEFT OUTER JOIN providers pr ON p.provider_id = pr.provider_id
                    WHERE p.procedure_date >= %s AND p.procedure_date <= %s
                    ORDER BY p.procedure_date DESC, p.procedure_id DESC
                    LIMIT 10;
                """, (seven_days_ago, today))
                
                procedure_activities = cur.fetchall()
                for row in procedure_activities:
                    activities.append({
                        "id": row['procedure_id'],
                        "type": "procedure",
                        "date": row['procedure_date'].strftime('%Y-%m-%d') if row['procedure_date'] else None,
                        "description": row['procedure_description'] or f"Procedure {row['procedure_code']}",
                        "patient_id": row['patient_id'],
                        "patient_name": f"{row['patient_first_name']} {row['patient_last_name']}",
                        "provider_name": row['provider_name'] or "N/A",
                        "cost": float(row['procedure_cost']) if row['procedure_cost'] else 0.0,
                        "encounter_id": row['encounter_id'],
                        "visit_type": row['visit_type']
                    })
                
                # Fetch recent medications with patient and prescriber info
                cur.execute("""
                    SELECT 
                        m.medication_id,
                        m.prescribed_date,
                        m.drug_name,
                        m.dosage,
                        m.route,
                        m.frequency,
                        m.cost,
                        e.encounter_id,
                        e.visit_date,
                        e.visit_type,
                        pt.patient_id,
                        pt.first_name AS patient_first_name,
                        pt.last_name AS patient_last_name,
                        pr.provider_id,
                        pr.name AS prescriber_name,
                        pr.specialty AS prescriber_specialty,
                        'medication' AS activity_type
                    FROM medications m
                    INNER JOIN encounters e ON m.encounter_id = e.encounter_id
                    INNER JOIN patients pt ON e.patient_id = pt.patient_id
                    LEFT OUTER JOIN providers pr ON m.prescriber_id = pr.provider_id
                    WHERE m.prescribed_date >= %s AND m.prescribed_date <= %s
                    ORDER BY m.prescribed_date DESC, m.medication_id DESC
                    LIMIT 10;
                """, (seven_days_ago, today))
                
                medication_activities = cur.fetchall()
                for row in medication_activities:
                    activities.append({
                        "id": row['medication_id'],
                        "type": "medication",
                        "date": row['prescribed_date'].strftime('%Y-%m-%d') if row['prescribed_date'] else None,
                        "description": f"{row['drug_name']} ({row['dosage']})",
                        "patient_id": row['patient_id'],
                        "patient_name": f"{row['patient_first_name']} {row['patient_last_name']}",
                        "provider_name": row['prescriber_name'] or "N/A",
                        "cost": float(row['cost']) if row['cost'] else 0.0,
                        "encounter_id": row['encounter_id'],
                        "visit_type": row['visit_type'],
                        "frequency": row['frequency'],
                        "route": row['route']
                    })
                
                # Fetch recent encounters with patient, provider, and diagnosis info
                cur.execute("""
                    SELECT 
                        e.encounter_id,
                        e.visit_date,
                        e.visit_type,
                        e.status,
                        e.diagnosis_code,
                        pt.patient_id,
                        pt.first_name AS patient_first_name,
                        pt.last_name AS patient_last_name,
                        pr.provider_id,
                        pr.name AS provider_name,
                        pr.specialty AS provider_specialty,
                        d.diagnosis_description,
                        'encounter' AS activity_type
                    FROM encounters e
                    INNER JOIN patients pt ON e.patient_id = pt.patient_id
                    LEFT OUTER JOIN providers pr ON e.provider_id = pr.provider_id
                    LEFT OUTER JOIN (
                        SELECT DISTINCT encounter_id, diagnosis_description 
                        FROM diagnoses 
                        WHERE primary_flag = TRUE
                    ) d ON e.encounter_id = d.encounter_id
                    WHERE e.visit_date >= %s AND e.visit_date <= %s
                    ORDER BY e.visit_date DESC, e.encounter_id DESC
                    LIMIT 10;
                """, (seven_days_ago, today))
                
                encounter_activities = cur.fetchall()
                for row in encounter_activities:
                    activities.append({
                        "id": row['encounter_id'],
                        "type": "encounter",
                        "date": row['visit_date'].strftime('%Y-%m-%d') if row['visit_date'] else None,
                        "description": row['diagnosis_description'] or f"Encounter - {row['visit_type']}",
                        "patient_id": row['patient_id'],
                        "patient_name": f"{row['patient_first_name']} {row['patient_last_name']}",
                        "provider_name": row['provider_name'] or "N/A",
                        "status": row['status'],
                        "visit_type": row['visit_type'],
                        "diagnosis_code": row['diagnosis_code']
                    })
                
                # Sort by date descending
                activities.sort(key=lambda x: x['date'] or '', reverse=True)
                
                # Return top 15 activities
                return jsonify({
                    "activities": activities[:15]
                })

    except Exception as e:
        print(f"Recent activities error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
