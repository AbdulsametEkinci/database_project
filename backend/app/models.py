# Hospital Management System data models
from .db import get_db_connection, get_db_cursor
from .utils import generate_new_id
from mysql.connector import Error


class PatientsModel:
    SORTABLE_COLUMNS = {
        "registration_date": "p.registration_date", "patient_id": "p.patient_id",
        "first_name": "p.first_name", "last_name": "p.last_name",
        "age": "p.age", "gender": "p.gender"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by="registration_date", sort_dir="desc"):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            base_query = "SELECT p.*, i.name AS insurance_name FROM patients p LEFT JOIN insurers i ON p.insurance_type = i.code WHERE 1 = 1"
            params = []
            
            if search:
                like_term = f"%{search}%"
                base_query += " AND (p.patient_id LIKE %s OR p.first_name LIKE %s OR p.last_name LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s OR p.phone LIKE %s OR p.email LIKE %s)"
                params.extend([like_term] * 6)
            
            filters = filters or {}
            if filters.get('patient_id'): base_query += " AND p.patient_id LIKE %s"; params.append(f"%{filters['patient_id']}%")
            if filters.get('first_name'): base_query += " AND p.first_name LIKE %s"; params.append(f"%{filters['first_name']}%")
            if filters.get('last_name'): base_query += " AND p.last_name LIKE %s"; params.append(f"%{filters['last_name']}%")
            if filters.get('gender'): base_query += " AND LOWER(p.gender) = LOWER(%s)"; params.append(filters['gender'])
            if filters.get('insurance_type'): base_query += " AND p.insurance_type = %s"; params.append(filters['insurance_type'])
            if filters.get('age_exact') is not None: base_query += " AND p.age = %s"; params.append(filters['age_exact'])
            if filters.get('age_min') is not None: base_query += " AND p.age >= %s"; params.append(filters['age_min'])
            if filters.get('age_max') is not None: base_query += " AND p.age <= %s"; params.append(filters['age_max'])
            if filters.get('city'): base_query += " AND p.city LIKE %s"; params.append(f"%{filters['city']}%")
            if filters.get('state'): base_query += " AND p.state LIKE %s"; params.append(f"%{filters['state']}%")
            if filters.get('registration_from'): base_query += " AND p.registration_date >= %s"; params.append(filters['registration_from'])
            if filters.get('registration_to'): base_query += " AND p.registration_date <= %s"; params.append(filters['registration_to'])
            
            count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as filtered"
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()['total']
            
            sort_column = PatientsModel.SORTABLE_COLUMNS.get(sort_by, "p.registration_date")
            sort_direction = "ASC" if str(sort_dir).lower() == "asc" else "DESC"
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_column} {sort_direction} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            patients = cursor.fetchall()
            
            return {
                'data': patients,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching patients: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def get_by_id(patient_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT p.*, 
                       i.name as insurance_name, 
                       i.insurer_id as insurance_id_fk 
                FROM patients p
                LEFT JOIN insurers i ON p.insurance_type = i.code
                WHERE p.patient_id = %s
            """
            cursor.execute(query, (patient_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching patient: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def add(patient_data):
        conn = None
        try:
            if not patient_data.get('first_name'):
                raise ValueError("first_name is required (NOT NULL)")
            if not patient_data.get('last_name'):
                raise ValueError("last_name is required (NOT NULL)")
            if not patient_data.get('dob'):
                raise ValueError("dob (date of birth) is required (NOT NULL)")
            if not patient_data.get('gender'):
                raise ValueError("gender is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            patient_id = generate_new_id(cursor, 'patients', 'patient_id', 'PAT', 6)
            
            registration_date = patient_data.get('registration_date')
            if not registration_date:
                from datetime import date
                registration_date = date.today().isoformat()
            
            marital_status = patient_data.get('marital_status')
            if not marital_status:
                marital_status = 'unknown'
            
            dob = patient_data.get('dob')
            
            query = """INSERT INTO patients 
                (patient_id, first_name, last_name, dob, age, gender, ethnicity, insurance_type, 
                 marital_status, address, city, state, zip, phone, email, registration_date) 
                VALUES (%s, %s, %s, %s, TIMESTAMPDIFF(YEAR, %s, CURDATE()), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            
            values = (
                patient_id,
                patient_data.get('first_name'),
                patient_data.get('last_name'),
                dob,
                dob,  # dob is used twice: once for dob column, once for TIMESTAMPDIFF calculation
                patient_data.get('gender'),
                patient_data.get('ethnicity'),
                patient_data.get('insurance_type'),
                marital_status,
                patient_data.get('address'),
                patient_data.get('city'),
                patient_data.get('state'),
                patient_data.get('zip'),
                patient_data.get('phone'),
                patient_data.get('email'),
                registration_date
            )
            cursor.execute(query, values)
            conn.commit()
            return patient_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding patient: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def update(patient_id, patient_data):
        """
        Update patient information. Automatically recalculates age if dob is updated.
        Validates required NOT NULL fields if they are being updated.
        """
        conn = None
        try:
            # Validate required fields if they're being updated
            if 'first_name' in patient_data and not patient_data.get('first_name'):
                raise ValueError("first_name cannot be empty (NOT NULL)")
            if 'last_name' in patient_data and not patient_data.get('last_name'):
                raise ValueError("last_name cannot be empty (NOT NULL)")
            if 'dob' in patient_data and not patient_data.get('dob'):
                raise ValueError("dob cannot be empty (NOT NULL)")
            if 'gender' in patient_data and not patient_data.get('gender'):
                raise ValueError("gender cannot be empty (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            if 'age' in patient_data:
                del patient_data['age']
            
            fields, values = [], []
            for key, value in patient_data.items():
                if key != 'patient_id':
                    if key == 'dob':
                        fields.append("dob = %s")
                        fields.append("age = TIMESTAMPDIFF(YEAR, %s, CURDATE())")
                        values.append(value)
                        values.append(value)
                    else:
                        fields.append(f"{key} = %s")
                        values.append(value)
            
            if 'dob' not in patient_data:
                fields.append("age = TIMESTAMPDIFF(YEAR, dob, CURDATE())")
            
            if not fields: 
                return False
            
            values.append(patient_id)
            cursor.execute(f"UPDATE patients SET {', '.join(fields)} WHERE patient_id = %s", values)
            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating patient: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def delete(patient_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT COUNT(*) AS cnt FROM encounters WHERE patient_id = %s", (patient_id,))
            if cursor.fetchone()['cnt'] > 0: raise Error(f"Cannot delete patient {patient_id}: Delete related encounters first.")
            cursor.execute("DELETE FROM patients WHERE patient_id = %s", (patient_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting patient: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class EncountersModel:
    SORTABLE_COLUMNS = {
        "visit_date": "e.visit_date", "encounter_id": "e.encounter_id",
        "patient_id": "e.patient_id", "provider_id": "e.provider_id",
        "department": "e.department", "visit_type": "e.visit_type",
        "status": "e.status", "length_of_stay": "e.length_of_stay"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by="visit_date", sort_dir="desc"):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query
            base_query = """
                SELECT e.*, p.first_name AS patient_first_name, p.last_name AS patient_last_name,
                       pr.name AS provider_name, pr.department AS provider_department
                FROM encounters e
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                LEFT JOIN providers pr ON e.provider_id = pr.provider_id
                WHERE 1 = 1
            """
            params = []
            if search:
                like_term = f"%{search}%"
                base_query += " AND (e.encounter_id LIKE %s OR e.patient_id LIKE %s OR e.provider_id LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s OR pr.name LIKE %s OR e.department LIKE %s OR e.visit_type LIKE %s)"
                params.extend([like_term] * 7)
            
            filters = filters or {}
            if filters.get('encounter_id'): base_query += " AND e.encounter_id LIKE %s"; params.append(f"%{filters['encounter_id']}%")
            if filters.get('patient_id'): base_query += " AND e.patient_id LIKE %s"; params.append(f"%{filters['patient_id']}%")
            if filters.get('provider_id'): base_query += " AND e.provider_id LIKE %s"; params.append(f"%{filters['provider_id']}%")
            if filters.get('patient_name'): base_query += " AND CONCAT(p.first_name, ' ', p.last_name) LIKE %s"; params.append(f"%{filters['patient_name']}%")
            if filters.get('provider_name'): base_query += " AND pr.name LIKE %s"; params.append(f"%{filters['provider_name']}%")
            if filters.get('department'): base_query += " AND e.department LIKE %s"; params.append(f"%{filters['department']}%")
            if filters.get('visit_type'): base_query += " AND e.visit_type LIKE %s"; params.append(f"%{filters['visit_type']}%")
            if filters.get('status'): base_query += " AND e.status = %s"; params.append(filters['status'])
            if filters.get('readmitted_flag') is not None: base_query += " AND e.readmitted_flag = %s"; params.append(filters['readmitted_flag'])
            if filters.get('visit_from'): base_query += " AND e.visit_date >= %s"; params.append(filters['visit_from'])
            if filters.get('visit_to'): base_query += " AND e.visit_date <= %s"; params.append(filters['visit_to'])
            
            count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as filtered"
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()['total']
            
            sort_col = EncountersModel.SORTABLE_COLUMNS.get(sort_by, "e.visit_date")
            sort_d = "ASC" if str(sort_dir).lower() == "asc" else "DESC"
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            encounters = cursor.fetchall()
            
            return {
                'data': encounters,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching encounters: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(encounter_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """SELECT e.*, 
                       p.first_name as patient_first_name, 
                       p.last_name as patient_last_name, 
                       pr.name as provider_name,
                       pr.department as provider_department
                       FROM encounters e 
                       LEFT JOIN patients p ON e.patient_id = p.patient_id 
                       LEFT JOIN providers pr ON e.provider_id = pr.provider_id 
                       WHERE e.encounter_id = %s"""
            cursor.execute(query, (encounter_id,))
            result = cursor.fetchone()
            
            # If department is not set in encounter but provider has department, use provider's department
            if result and not result.get('department') and result.get('provider_department'):
                result['department'] = result['provider_department']
            
            return result
        except Error as e: raise Error(f"Error fetching encounter: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def add(encounter_data):
        """
        Add a new encounter. Validates required NOT NULL fields according to table definition.
        Required fields: patient_id, provider_id, visit_date, status (defaults to 'Not Completed')
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not encounter_data.get('patient_id'):
                raise ValueError("patient_id is required (NOT NULL)")
            if not encounter_data.get('provider_id'):
                raise ValueError("provider_id is required (NOT NULL)")
            if not encounter_data.get('visit_date'):
                raise ValueError("visit_date is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Get department from provider if not provided (REQUIRED for encounters)
            provider_id = encounter_data.get('provider_id')
            real_dept = encounter_data.get('department')
            if provider_id:
                if not real_dept:
                    # Try to get department from provider
                    cursor.execute("SELECT department FROM providers WHERE provider_id = %s", (provider_id,))
                    result = cursor.fetchone()
                    if result and result.get('department'):
                        real_dept = result['department']
                    else:
                        raise ValueError(f"Provider {provider_id} does not have a department assigned. Please assign a department to the provider first.")
                # Validate that provider exists
                cursor.execute("SELECT provider_id FROM providers WHERE provider_id = %s", (provider_id,))
                if not cursor.fetchone():
                    raise ValueError(f"Provider {provider_id} not found")

            eid = generate_new_id(cursor, 'encounters', 'encounter_id', 'ENC', 6)
            
            # Set default for status if not provided (per table definition: DEFAULT 'Not Completed')
            status = encounter_data.get('status')
            if not status:
                status = 'Not Completed'
            
            # Set defaults
            length_of_stay = encounter_data.get('length_of_stay', 0)
            readmitted_flag = encounter_data.get('readmitted_flag', False)
            
            query = """INSERT INTO encounters 
                (encounter_id, patient_id, provider_id, visit_date, visit_type, department, 
                 reason_for_visit, diagnosis_code, admission_type, discharge_date, 
                 length_of_stay, status, readmitted_flag) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
            
            values = (
                eid,
                encounter_data.get('patient_id'),
                encounter_data.get('provider_id'),
                encounter_data.get('visit_date'),
                encounter_data.get('visit_type'),
                real_dept,
                encounter_data.get('reason_for_visit'),
                encounter_data.get('diagnosis_code'),
                encounter_data.get('admission_type'),
                encounter_data.get('discharge_date'),
                length_of_stay,
                status,
                readmitted_flag
            )
            cursor.execute(query, values)
            conn.commit()
            return eid
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding encounter: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def update(encounter_id, data):
        """
        Update encounter information. Handles department auto-fill from provider.
        Validates required NOT NULL fields if they are being updated.
        """
        conn = None
        try:
            # Validate required fields if they're being updated
            if 'patient_id' in data and not data.get('patient_id'):
                raise ValueError("patient_id cannot be empty (NOT NULL)")
            if 'provider_id' in data and not data.get('provider_id'):
                raise ValueError("provider_id cannot be empty (NOT NULL)")
            if 'visit_date' in data and not data.get('visit_date'):
                raise ValueError("visit_date cannot be empty (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # If provider_id is being updated, try to get department from provider
            if 'provider_id' in data:
                provider_id = data.get('provider_id')
                # Validate provider exists
                cursor.execute("SELECT provider_id, department FROM providers WHERE provider_id = %s", (provider_id,))
                provider_result = cursor.fetchone()
                if not provider_result:
                    raise ValueError(f"Provider {provider_id} not found")
                
                # If department is not being updated or is empty, use provider's department
                if 'department' not in data or not data.get('department'):
                    if provider_result.get('department'):
                        data['department'] = provider_result['department']
                    else:
                        raise ValueError(f"Provider {provider_id} does not have a department assigned. Please assign a department to the provider first.")
            
            fields, values = [], []
            for key, value in data.items():
                if key != 'encounter_id': 
                    fields.append(f"{key} = %s")
                    values.append(value)
            
            if not fields: 
                return False
            
            values.append(encounter_id)
            cursor.execute(f"UPDATE encounters SET {', '.join(fields)} WHERE encounter_id = %s", values)
            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating encounter: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def delete(encounter_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT COUNT(*) as cnt FROM claims_and_billing WHERE encounter_id = %s", (encounter_id,))
            if cursor.fetchone()['cnt'] > 0: raise Error("Cannot delete encounter: It has linked billing records.")
            cursor.execute("DELETE FROM encounters WHERE encounter_id = %s", (encounter_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting encounter: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


# Helper models for dropdowns
class ProvidersModel:
    @staticmethod
    def get_all(limit=1000, search=None):
        """
        Get all providers with optional search using SQL LIKE.
        Search matches against name, specialty, provider_id.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = "SELECT provider_id, name, specialty, department FROM providers WHERE 1 = 1"
            params = []
            
            if search:
                like_term = f"%{search}%"
                query += " AND (provider_id LIKE %s OR name LIKE %s OR specialty LIKE %s OR department LIKE %s)"
                params.extend([like_term] * 4)
            
            query += " ORDER BY name LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            return cursor.fetchall()
        except Error as e:
            raise Error(f"Error fetching providers: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def get_departments():
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = "SELECT DISTINCT department FROM providers WHERE department IS NOT NULL AND department != '' ORDER BY department"
            cursor.execute(query)
            return [row['department'] for row in cursor.fetchall()]
        except Error as e:
            return []
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class InsurersModel:
    SORTABLE_COLUMNS = {
        "insurer_id": "insurer_id",
        "code": "code",
        "name": "name",
        "payer_type": "payer_type"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by="name", sort_dir="asc"):
        """
        Get all insurers with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query for filtering
            base_query = "SELECT * FROM insurers WHERE 1 = 1"
            params = []
            
            if search:
                like_term = f"%{search}%"
                # For INT insurer_id, use CAST to VARCHAR for LIKE search, or check if search is numeric for exact match
                base_query += " AND (CAST(insurer_id AS CHAR) LIKE %s OR code LIKE %s OR name LIKE %s OR payer_type LIKE %s OR phone LIKE %s)"
                params.extend([like_term] * 5)
            
            filters = filters or {}
            if filters.get('code'): base_query += " AND code LIKE %s"; params.append(f"%{filters['code']}%")
            if filters.get('name'): base_query += " AND name LIKE %s"; params.append(f"%{filters['name']}%")
            if filters.get('payer_type'): base_query += " AND payer_type = %s"; params.append(filters['payer_type'])
            
            # Get total count
            count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as filtered"
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()['total']
            
            # Apply sorting and pagination
            sort_column = InsurersModel.SORTABLE_COLUMNS.get(sort_by, "name")
            sort_direction = "ASC" if str(sort_dir).lower() == "asc" else "DESC"
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_column} {sort_direction} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            insurers = cursor.fetchall()
            
            return {
                'data': insurers,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching insurers: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(insurer_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = "SELECT * FROM insurers WHERE insurer_id = %s"
            cursor.execute(query, (insurer_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching insurer: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(insurer_data):
        """
        Add a new insurer. Validates required NOT NULL fields.
        Required fields: code (UNIQUE), name, payer_type
        Note: insurer_id is auto_increment, so it should not be included in the data.
        """
        conn = None
        try:
            # Remove insurer_id if present (should be auto-generated)
            data = {k: v for k, v in insurer_data.items() if k != 'insurer_id'}
            
            # Validate required NOT NULL fields
            if not data.get('code'):
                raise ValueError("code is required (NOT NULL)")
            if not data.get('name'):
                raise ValueError("name is required (NOT NULL)")
            if not data.get('payer_type'):
                raise ValueError("payer_type is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Check if code already exists (UNIQUE constraint)
            cursor.execute("SELECT insurer_id FROM insurers WHERE code = %s", (data.get('code'),))
            if cursor.fetchone():
                raise ValueError(f"Code '{data.get('code')}' already exists (must be UNIQUE)")
            
            query = """INSERT INTO insurers 
                (code, name, payer_type, phone) 
                VALUES (%s, %s, %s, %s)"""
            
            values = (
                data.get('code'),
                data.get('name'),
                data.get('payer_type'),
                data.get('phone')
            )
            cursor.execute(query, values)
            conn.commit()
            return cursor.lastrowid  # Return the auto-generated insurer_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding insurer: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(insurer_id, insurer_data):
        """
        Update insurer information. Validates required NOT NULL fields if they are being updated.
        """
        conn = None
        try:
            # Validate required fields if they're being updated
            if 'code' in insurer_data and not insurer_data.get('code'):
                raise ValueError("code cannot be empty (NOT NULL)")
            if 'name' in insurer_data and not insurer_data.get('name'):
                raise ValueError("name cannot be empty (NOT NULL)")
            if 'payer_type' in insurer_data and not insurer_data.get('payer_type'):
                raise ValueError("payer_type cannot be empty (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Check if code already exists (if code is being updated)
            if 'code' in insurer_data:
                cursor.execute("SELECT insurer_id FROM insurers WHERE code = %s AND insurer_id != %s", 
                             (insurer_data.get('code'), insurer_id))
                if cursor.fetchone():
                    raise ValueError(f"Code '{insurer_data.get('code')}' already exists (must be UNIQUE)")
            
            fields, values = [], []
            for key, value in insurer_data.items():
                if key != 'insurer_id': 
                    fields.append(f"{key} = %s")
                    values.append(value)
            
            if not fields: 
                return False
            
            values.append(insurer_id)
            cursor.execute(f"UPDATE insurers SET {', '.join(fields)} WHERE insurer_id = %s", values)
            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating insurer: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(insurer_id):
        """
        Delete an insurer. Checks for foreign key constraints.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Check if insurer is referenced by patients
            cursor.execute("SELECT COUNT(*) AS cnt FROM patients WHERE insurance_type = (SELECT code FROM insurers WHERE insurer_id = %s)", (insurer_id,))
            result = cursor.fetchone()
            if result and result.get('cnt', 0) > 0:
                raise Error(f"Cannot delete insurer {insurer_id}: It is referenced by patients. Update or remove patient references first.")
            
            cursor.execute("DELETE FROM insurers WHERE insurer_id = %s", (insurer_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting insurer: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class ClaimsAndBillingModel:
    """Data Access Object for the claims_and_billing table."""
    
    SORTABLE_COLUMNS = {
        "billing_id": "cb.billing_id",
        "claim_date": "cb.claim_billing_date",
        "claim_billing_date": "cb.claim_billing_date",
        "encounter_id": "cb.encounter_id",
        "billed_amount": "cb.billed_amount",
        "claim_status": "cb.claim_status"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by='claim_billing_date', sort_dir='desc'):
        """
        Get all claims with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query with JOINs
            base_query = """
                SELECT cb.*, 
                       p.first_name, p.last_name, 
                       e.visit_date, i.name as insurer_name
                FROM claims_and_billing cb
                LEFT JOIN patients p ON cb.patient_id = p.patient_id
                LEFT JOIN encounters e ON cb.encounter_id = e.encounter_id
                LEFT JOIN insurers i ON p.insurance_type = i.code
                WHERE 1=1
            """
            params = []
            
            # General search
            if search:
                like_term = f"%{search}%"
                base_query += """
                    AND (cb.billing_id LIKE %s OR cb.claim_id LIKE %s OR cb.encounter_id LIKE %s 
                    OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s OR cb.claim_status LIKE %s)
                """
                params.extend([like_term] * 5)
            
            # Detailed filters
            filters = filters or {}
            if filters.get('billing_id'): base_query += " AND cb.billing_id LIKE %s"; params.append(f"%{filters['billing_id']}%")
            if filters.get('claim_id'): base_query += " AND cb.claim_id LIKE %s"; params.append(f"%{filters['claim_id']}%")
            if filters.get('encounter_id'): base_query += " AND cb.encounter_id LIKE %s"; params.append(f"%{filters['encounter_id']}%")
            if filters.get('patient_id'): base_query += " AND cb.patient_id LIKE %s"; params.append(f"%{filters['patient_id']}%")
            if filters.get('claim_status'): base_query += " AND cb.claim_status = %s"; params.append(filters['claim_status'])
            if filters.get('billed_amount_min') is not None: base_query += " AND cb.billed_amount >= %s"; params.append(filters['billed_amount_min'])
            if filters.get('billed_amount_max') is not None: base_query += " AND cb.billed_amount <= %s"; params.append(filters['billed_amount_max'])
            if filters.get('claim_date_from'): base_query += " AND cb.claim_billing_date >= %s"; params.append(filters['claim_date_from'])
            if filters.get('claim_date_to'): base_query += " AND cb.claim_billing_date <= %s"; params.append(filters['claim_date_to'])
            if filters.get('payment_method'): base_query += " AND cb.payment_method = %s"; params.append(filters['payment_method'])
            
            # Get total count - build separate count query without SELECT columns
            count_base = """
                SELECT COUNT(*) as total
                FROM claims_and_billing cb
                LEFT JOIN patients p ON cb.patient_id = p.patient_id
                LEFT JOIN encounters e ON cb.encounter_id = e.encounter_id
                LEFT JOIN insurers i ON p.insurance_type = i.code
                WHERE 1=1
            """
            count_params = []
            
            # Apply same filters to count query
            if search:
                like_term = f"%{search}%"
                count_base += """
                    AND (cb.billing_id LIKE %s OR cb.claim_id LIKE %s OR cb.encounter_id LIKE %s 
                    OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s OR cb.claim_status LIKE %s)
                """
                count_params.extend([like_term] * 5)
            
            if filters.get('billing_id'): count_base += " AND cb.billing_id LIKE %s"; count_params.append(f"%{filters['billing_id']}%")
            if filters.get('claim_id'): count_base += " AND cb.claim_id LIKE %s"; count_params.append(f"%{filters['claim_id']}%")
            if filters.get('encounter_id'): count_base += " AND cb.encounter_id LIKE %s"; count_params.append(f"%{filters['encounter_id']}%")
            if filters.get('patient_id'): count_base += " AND cb.patient_id LIKE %s"; count_params.append(f"%{filters['patient_id']}%")
            if filters.get('claim_status'): count_base += " AND cb.claim_status = %s"; count_params.append(filters['claim_status'])
            if filters.get('billed_amount_min') is not None: count_base += " AND cb.billed_amount >= %s"; count_params.append(filters['billed_amount_min'])
            if filters.get('billed_amount_max') is not None: count_base += " AND cb.billed_amount <= %s"; count_params.append(filters['billed_amount_max'])
            if filters.get('claim_date_from'): count_base += " AND cb.claim_billing_date >= %s"; count_params.append(filters['claim_date_from'])
            if filters.get('claim_date_to'): count_base += " AND cb.claim_billing_date <= %s"; count_params.append(filters['claim_date_to'])
            if filters.get('payment_method'): count_base += " AND cb.payment_method = %s"; count_params.append(filters['payment_method'])
            
            cursor.execute(count_base, count_params)
            count_result = cursor.fetchone()
            total_count = count_result['total'] if count_result else 0
            
            # Apply sorting and pagination
            sort_col = ClaimsAndBillingModel.SORTABLE_COLUMNS.get(sort_by, 'cb.claim_billing_date')
            sort_d = 'ASC' if str(sort_dir).lower() == 'asc' else 'DESC'
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            claims = cursor.fetchall()
            
            return {
                'data': claims,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching claims: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(billing_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT cb.*, 
                       p.first_name, p.last_name, 
                       e.visit_date, i.name as insurer_name
                FROM claims_and_billing cb
                LEFT JOIN patients p ON cb.patient_id = p.patient_id
                LEFT JOIN encounters e ON cb.encounter_id = e.encounter_id
                LEFT JOIN insurers i ON p.insurance_type = i.code
                WHERE cb.billing_id = %s
            """
            cursor.execute(query, (billing_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching claim: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(claim_data):
        """
        Add a new claim. Validates required NOT NULL fields.
        Required fields: encounter_id (to get patient_id), claim_billing_date, billed_amount
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not claim_data.get('encounter_id'):
                raise ValueError("encounter_id is required (NOT NULL)")
            if not claim_data.get('claim_billing_date'):
                raise ValueError("claim_billing_date is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Auto-generate IDs
            bill_id = generate_new_id(cursor, 'claims_and_billing', 'billing_id', 'BILL', 6)
            claim_id = generate_new_id(cursor, 'claims_and_billing', 'claim_id', 'CLM', 6)
            
            # Get patient_id from encounter_id (for data consistency)
            encounter_id = claim_data.get('encounter_id')
            cursor.execute("SELECT patient_id FROM encounters WHERE encounter_id = %s", (encounter_id,))
            result = cursor.fetchone()
            if not result:
                raise ValueError("Invalid Encounter ID provided")
            patient_id = result['patient_id']
            
            # Set defaults
            billed_amount = claim_data.get('billed_amount', 0)
            paid_amount = claim_data.get('paid_amount', 0)
            claim_status = claim_data.get('claim_status', 'Pending')
            payment_method = claim_data.get('payment_method')
            insurance_provider = claim_data.get('insurance_provider')
            
            query = """
                INSERT INTO claims_and_billing 
                (billing_id, claim_id, patient_id, encounter_id, insurance_provider, payment_method, 
                 claim_billing_date, billed_amount, paid_amount, claim_status, denial_reason) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                bill_id,
                claim_id,
                patient_id,
                encounter_id,
                insurance_provider,
                payment_method,
                claim_data.get('claim_billing_date'),
                billed_amount,
                paid_amount,
                claim_status,
                claim_data.get('denial_reason')
            )
            
            cursor.execute(query, values)
            conn.commit()
            return bill_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding claim: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(billing_id, data):
        """
        Update claim information. Handles patient_id sync when encounter_id changes.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            fields, values = [], []
            
            # Updatable columns
            updatable_cols = ['encounter_id', 'insurance_provider', 'payment_method', 
                              'claim_billing_date', 'billed_amount', 'paid_amount', 
                              'claim_status', 'denial_reason']
            
            for key, value in data.items():
                if key in updatable_cols:
                    fields.append(f"{key} = %s")
                    values.append(value)
            
            # If encounter_id changes, update patient_id too
            if 'encounter_id' in data:
                cursor.execute("SELECT patient_id FROM encounters WHERE encounter_id = %s", (data['encounter_id'],))
                res = cursor.fetchone()
                if res:
                    fields.append("patient_id = %s")
                    values.append(res['patient_id'])
                else:
                    raise ValueError("Invalid Encounter ID provided")
            
            if not fields: 
                return False
            
            values.append(billing_id)
            cursor.execute(f"UPDATE claims_and_billing SET {', '.join(fields)} WHERE billing_id = %s", values)
            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating claim: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(billing_id):
        """
        Delete a claim. Checks for denial records if status is 'Denied'.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Check if claim has denial records (if status is Denied)
            cursor.execute("SELECT claim_id, claim_status FROM claims_and_billing WHERE billing_id = %s", (billing_id,))
            claim = cursor.fetchone()
            
            if claim:
                if claim['claim_status'] == 'Denied':
                    cursor.execute("SELECT COUNT(*) as cnt FROM denials WHERE claim_id = %s", (claim['claim_id'],))
                    result = cursor.fetchone()
                    if result and result.get('cnt', 0) > 0:
                        raise Error(f"Cannot delete claim {billing_id}: It has {result['cnt']} denial record(s). Delete denial records first.")
            
            cursor.execute("DELETE FROM claims_and_billing WHERE billing_id = %s", (billing_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting claim: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def sync_claim_amount(encounter_id):
        """
        Calculate total cost from procedures and medications for an encounter.
        Updates existing claim or creates new one if doesn't exist.
        Logic: bill_id = encounter_id. claim_id increments if not Selfpay.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Calculate total amount (procedures + medications)
            calc_query = """
                SELECT 
                    (SELECT COALESCE(SUM(procedure_cost), 0) FROM procedures WHERE encounter_id = %s) +
                    (SELECT COALESCE(SUM(cost), 0) FROM medications WHERE encounter_id = %s) 
                AS total_amount
            """
            cursor.execute(calc_query, (encounter_id, encounter_id))
            result = cursor.fetchone()
            total_amount = float(result['total_amount']) if result else 0.0
            
            # Check if claim exists for this encounter
            cursor.execute("SELECT billing_id FROM claims_and_billing WHERE encounter_id = %s", (encounter_id,))
            existing_claim = cursor.fetchone()
            
            if existing_claim:
                # Update existing claim amount
                cursor.execute("UPDATE claims_and_billing SET billed_amount = %s WHERE billing_id = %s", 
                             (total_amount, existing_claim['billing_id']))
            else:
                # Create new claim/bill
                # Logic: bill_id derived from encounter_id (ENC -> BILL)
                if encounter_id.startswith('ENC'):
                    billing_id = 'BILL' + encounter_id[3:]
                else:
                    # Fallback if encounter_id format is unexpected
                    billing_id = 'BILL' + encounter_id
                
                # Fetch patient and insurance info
                cursor.execute("""
                    SELECT p.patient_id, p.insurance_type 
                    FROM encounters e 
                    JOIN patients p ON e.patient_id = p.patient_id 
                    WHERE e.encounter_id = %s
                """, (encounter_id,))
                p_data = cursor.fetchone()
                
                if not p_data:
                    return False
                
                patient_id = p_data['patient_id']
                insurance_type = p_data.get('insurance_type')
                
                # Determine if Selfpay
                is_selfpay = False
                if insurance_type and ('self' in insurance_type.lower()):
                    is_selfpay = True
                
                if is_selfpay:
                    claim_id = None
                    payment_method = 'Selfpay'
                    insurance_provider = None
                else:
                    claim_id = generate_new_id(cursor, 'claims_and_billing', 'claim_id', 'CLM', 6)
                    payment_method = 'Insurance'
                    insurance_provider = insurance_type
                
                insert_query = """
                    INSERT INTO claims_and_billing 
                    (billing_id, claim_id, patient_id, encounter_id, claim_billing_date, 
                     billed_amount, paid_amount, claim_status, payment_method, insurance_provider)
                    VALUES (%s, %s, %s, %s, NOW(), %s, 0, 'Pending', %s, %s)
                """
                cursor.execute(insert_query, (billing_id, claim_id, patient_id, encounter_id, total_amount, payment_method, insurance_provider))
            
            conn.commit()
            return True
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error syncing claim amount: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_claim_statistics():
        """
        Get claim statistics grouped by status using GROUP BY.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            query = """
                SELECT 
                    claim_status, 
                    COUNT(*) as count, 
                    SUM(billed_amount) as total_amount
                FROM claims_and_billing
                GROUP BY claim_status
                ORDER BY total_amount DESC
            """
            cursor.execute(query)
            return cursor.fetchall()
        except Error as e:
            raise Error(f"Error fetching statistics: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class DenialsModel:
    """Data Access Object for the denials table."""
    
    SORTABLE_COLUMNS = {
        "denial_id": "d.denial_id",
        "denial_date": "d.denial_date",
        "claim_id": "d.claim_id",
        "denial_reason_code": "d.denial_reason_code"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by='denial_date', sort_dir='desc'):
        """
        Get all denials with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query with JOINs
            base_query = """
                SELECT d.*, 
                       cb.billing_id, cb.claim_billing_date, cb.billed_amount,
                       cb.encounter_id, cb.claim_status,
                       p.first_name, p.last_name
                FROM denials d
                LEFT JOIN claims_and_billing cb ON d.claim_id = cb.claim_id
                LEFT JOIN patients p ON cb.patient_id = p.patient_id
                WHERE 1=1
            """
            params = []
            
            # General search (denials table only has claim_id, not billing_id)
            if search:
                like_term = f"%{search}%"
                base_query += """
                    AND (d.denial_id LIKE %s OR d.claim_id LIKE %s OR d.denial_reason_code LIKE %s
                    OR d.denial_reason_description LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s)
                """
                params.extend([like_term] * 5)
            
            # Detailed filters
            filters = filters or {}
            if filters.get('denial_id'): base_query += " AND d.denial_id LIKE %s"; params.append(f"%{filters['denial_id']}%")
            if filters.get('claim_id'): base_query += " AND d.claim_id LIKE %s"; params.append(f"%{filters['claim_id']}%")
            if filters.get('denial_reason_code'): base_query += " AND d.denial_reason_code LIKE %s"; params.append(f"%{filters['denial_reason_code']}%")
            if filters.get('denial_date_from'): base_query += " AND d.denial_date >= %s"; params.append(filters['denial_date_from'])
            if filters.get('denial_date_to'): base_query += " AND d.denial_date <= %s"; params.append(filters['denial_date_to'])
            if filters.get('appeal_status'): base_query += " AND d.appeal_status = %s"; params.append(filters['appeal_status'])
            
            # Get total count - build separate count query
            count_base = """
                SELECT COUNT(*) as total
                FROM denials d
                LEFT JOIN claims_and_billing cb ON d.claim_id = cb.claim_id
                LEFT JOIN patients p ON cb.patient_id = p.patient_id
                WHERE 1=1
            """
            count_params = []
            
            # Apply same filters to count query
            if search:
                like_term = f"%{search}%"
                count_base += """
                    AND (d.denial_id LIKE %s OR d.claim_id LIKE %s OR d.denial_reason_code LIKE %s
                    OR d.denial_reason_description LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s)
                """
                count_params.extend([like_term] * 5)
            
            if filters.get('denial_id'): count_base += " AND d.denial_id LIKE %s"; count_params.append(f"%{filters['denial_id']}%")
            if filters.get('claim_id'): count_base += " AND d.claim_id LIKE %s"; count_params.append(f"%{filters['claim_id']}%")
            if filters.get('denial_reason_code'): count_base += " AND d.denial_reason_code LIKE %s"; count_params.append(f"%{filters['denial_reason_code']}%")
            if filters.get('denial_date_from'): count_base += " AND d.denial_date >= %s"; count_params.append(filters['denial_date_from'])
            if filters.get('denial_date_to'): count_base += " AND d.denial_date <= %s"; count_params.append(filters['denial_date_to'])
            if filters.get('appeal_status'): count_base += " AND d.appeal_status = %s"; count_params.append(filters['appeal_status'])
            
            cursor.execute(count_base, count_params)
            count_result = cursor.fetchone()
            total_count = count_result['total'] if count_result else 0
            
            # Apply sorting and pagination
            sort_col = DenialsModel.SORTABLE_COLUMNS.get(sort_by, 'd.denial_date')
            sort_d = 'ASC' if str(sort_dir).lower() == 'asc' else 'DESC'
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            denials = cursor.fetchall()
            
            return {
                'data': denials,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching denials: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(denial_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT d.*, 
                       cb.billing_id, cb.encounter_id, cb.billed_amount, cb.claim_status,
                       cb.claim_billing_date,
                       p.first_name, p.last_name
                FROM denials d
                LEFT JOIN claims_and_billing cb ON d.claim_id = cb.claim_id
                LEFT JOIN patients p ON cb.patient_id = p.patient_id
                WHERE d.denial_id = %s
            """
            cursor.execute(query, (denial_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching denial: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_claim_id(claim_id):
        """Get denial record by claim_id."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT d.*, 
                       cb.billing_id, cb.encounter_id, cb.billed_amount
                FROM denials d
                LEFT JOIN claims_and_billing cb ON d.claim_id = cb.claim_id
                WHERE d.claim_id = %s
            """
            cursor.execute(query, (claim_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(denial_data):
        """
        Add a new denial. Validates required NOT NULL fields.
        Required fields: claim_id, denial_date, denial_reason_code, denied_amount
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not denial_data.get('claim_id'):
                raise ValueError("claim_id is required (NOT NULL)")
            if not denial_data.get('denial_date'):
                raise ValueError("denial_date is required (NOT NULL)")
            if not denial_data.get('denial_reason_code'):
                raise ValueError("denial_reason_code is required (NOT NULL)")
            if denial_data.get('denied_amount') is None:
                raise ValueError("denied_amount is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Validate claim_id exists
            cursor.execute("SELECT claim_id FROM claims_and_billing WHERE claim_id = %s", (denial_data.get('claim_id'),))
            if not cursor.fetchone():
                raise ValueError("Invalid claim_id: Claim not found")
            
            # Generate denial_id
            denial_id = generate_new_id(cursor, 'denials', 'denial_id', 'DEN', 6)
            
            # Set defaults
            denied_amount = denial_data.get('denied_amount', 0)
            
            query = """
                INSERT INTO denials 
                (denial_id, claim_id, denial_reason_code, denial_reason_description, denied_amount, 
                 denial_date, appeal_filed, appeal_status, appeal_resolution_date, final_outcome) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            values = (
                denial_id,
                denial_data.get('claim_id'),
                denial_data.get('denial_reason_code'),
                denial_data.get('denial_reason_description'),
                denied_amount,
                denial_data.get('denial_date'),
                denial_data.get('appeal_filed'),
                denial_data.get('appeal_status'),
                denial_data.get('appeal_resolution_date'),
                denial_data.get('final_outcome')
            )
            
            cursor.execute(query, values)
            conn.commit()
            return denial_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding denial: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(denial_id, data):
        """
        Update denial information. Validates required NOT NULL fields if they are being updated.
        """
        conn = None
        try:
            # Validate required fields if they're being updated
            if 'claim_id' in data and not data.get('claim_id'):
                raise ValueError("claim_id cannot be empty (NOT NULL)")
            if 'denial_date' in data and not data.get('denial_date'):
                raise ValueError("denial_date cannot be empty (NOT NULL)")
            if 'denial_reason_code' in data and not data.get('denial_reason_code'):
                raise ValueError("denial_reason_code cannot be empty (NOT NULL)")
            if 'denied_amount' in data and data.get('denied_amount') is None:
                raise ValueError("denied_amount cannot be empty (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Validate claim_id if being updated
            if 'claim_id' in data:
                cursor.execute("SELECT claim_id FROM claims_and_billing WHERE claim_id = %s", (data.get('claim_id'),))
                if not cursor.fetchone():
                    raise ValueError("Invalid claim_id: Claim not found")
            
            fields, values = [], []
            for key, value in data.items():
                if key != 'denial_id': 
                    fields.append(f"{key} = %s")
                    values.append(value)
            
            if not fields: 
                return False
            
            values.append(denial_id)
            cursor.execute(f"UPDATE denials SET {', '.join(fields)} WHERE denial_id = %s", values)
            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating denial: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(denial_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            cursor.execute("DELETE FROM denials WHERE denial_id = %s", (denial_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting denial: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_distinct_codes():
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT DISTINCT denial_reason_code, denial_reason_description FROM denials ORDER BY denial_reason_code")
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct denial reason codes: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class MedicationsModel:
    """Data Access Object for the medications table."""
    
    SORTABLE_COLUMNS = {
        "medication_id": "m.medication_id",
        "encounter_id": "m.encounter_id",
        "prescribed_date": "m.prescribed_date",
        "drug_name": "m.drug_name",
        "cost": "m.cost"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by='prescribed_date', sort_dir='desc'):
        """
        Get all medications with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query with JOINs
            base_query = """
                SELECT m.*, 
                       e.encounter_id, e.visit_date,
                       p.patient_id, p.first_name, p.last_name,
                       pr.name as prescriber_name, pr.specialty as prescriber_specialty
                FROM medications m
                LEFT JOIN encounters e ON m.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                LEFT JOIN providers pr ON m.prescriber_id = pr.provider_id
                WHERE 1=1
            """
            params = []
            
            # General search
            if search:
                like_term = f"%{search}%"
                base_query += """
                    AND (m.medication_id LIKE %s OR m.drug_name LIKE %s OR m.encounter_id LIKE %s
                    OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s OR pr.name LIKE %s)
                """
                params.extend([like_term] * 5)
            
            # Detailed filters
            filters = filters or {}
            if filters.get('medication_id'): base_query += " AND m.medication_id LIKE %s"; params.append(f"%{filters['medication_id']}%")
            if filters.get('encounter_id'): base_query += " AND m.encounter_id LIKE %s"; params.append(f"%{filters['encounter_id']}%")
            if filters.get('drug_name'): base_query += " AND m.drug_name LIKE %s"; params.append(f"%{filters['drug_name']}%")
            if filters.get('prescriber_id'): base_query += " AND m.prescriber_id LIKE %s"; params.append(f"%{filters['prescriber_id']}%")
            if filters.get('prescribed_date_from'): base_query += " AND m.prescribed_date >= %s"; params.append(filters['prescribed_date_from'])
            if filters.get('prescribed_date_to'): base_query += " AND m.prescribed_date <= %s"; params.append(filters['prescribed_date_to'])
            if filters.get('cost_min') is not None: base_query += " AND m.cost >= %s"; params.append(float(filters['cost_min']))
            if filters.get('cost_max') is not None: base_query += " AND m.cost <= %s"; params.append(float(filters['cost_max']))
            
            # Get total count - build separate count query
            count_base = """
                SELECT COUNT(*) as total
                FROM medications m
                LEFT JOIN encounters e ON m.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                LEFT JOIN providers pr ON m.prescriber_id = pr.provider_id
                WHERE 1=1
            """
            count_params = []
            
            # Apply same filters to count query
            if search:
                like_term = f"%{search}%"
                count_base += """
                    AND (m.medication_id LIKE %s OR m.drug_name LIKE %s OR m.encounter_id LIKE %s
                    OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s OR pr.name LIKE %s)
                """
                count_params.extend([like_term] * 5)
            
            if filters.get('medication_id'): count_base += " AND m.medication_id LIKE %s"; count_params.append(f"%{filters['medication_id']}%")
            if filters.get('encounter_id'): count_base += " AND m.encounter_id LIKE %s"; count_params.append(f"%{filters['encounter_id']}%")
            if filters.get('drug_name'): count_base += " AND m.drug_name LIKE %s"; count_params.append(f"%{filters['drug_name']}%")
            if filters.get('prescriber_id'): count_base += " AND m.prescriber_id LIKE %s"; count_params.append(f"%{filters['prescriber_id']}%")
            if filters.get('prescribed_date_from'): count_base += " AND m.prescribed_date >= %s"; count_params.append(filters['prescribed_date_from'])
            if filters.get('prescribed_date_to'): count_base += " AND m.prescribed_date <= %s"; count_params.append(filters['prescribed_date_to'])
            if filters.get('cost_min') is not None: count_base += " AND m.cost >= %s"; count_params.append(float(filters['cost_min']))
            if filters.get('cost_max') is not None: count_base += " AND m.cost <= %s"; count_params.append(float(filters['cost_max']))
            
            cursor.execute(count_base, count_params)
            count_result = cursor.fetchone()
            total_count = count_result['total'] if count_result else 0
            
            # Apply sorting and pagination
            sort_col = MedicationsModel.SORTABLE_COLUMNS.get(sort_by, 'm.prescribed_date')
            sort_d = 'ASC' if str(sort_dir).lower() == 'asc' else 'DESC'
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            medications = cursor.fetchall()
            
            return {
                'data': medications,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching medications: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(medication_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT m.*, 
                       e.encounter_id, e.visit_date,
                       p.patient_id, p.first_name, p.last_name,
                       pr.name as prescriber_name, pr.specialty as prescriber_specialty
                FROM medications m
                LEFT JOIN encounters e ON m.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                LEFT JOIN providers pr ON m.prescriber_id = pr.provider_id
                WHERE m.medication_id = %s
            """
            cursor.execute(query, (medication_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching medication: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(medication_data):
        """
        Add a new medication. Validates required NOT NULL fields.
        Required fields: encounter_id, drug_name, prescribed_date, prescriber_id
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not medication_data.get('encounter_id'):
                raise ValueError("encounter_id is required (NOT NULL)")
            if not medication_data.get('drug_name'):
                raise ValueError("drug_name is required (NOT NULL)")
            if not medication_data.get('prescribed_date'):
                raise ValueError("prescribed_date is required (NOT NULL)")
            if not medication_data.get('prescriber_id'):
                raise ValueError("prescriber_id is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            medication_id = medication_data.get('medication_id') or generate_new_id(cursor, 'medications', 'medication_id', 'MED', 6)
            
            query = """
                INSERT INTO medications 
                (medication_id, encounter_id, drug_name, dosage, route, frequency, duration, prescribed_date, prescriber_id, cost)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                medication_id,
                medication_data.get('encounter_id'),
                medication_data.get('drug_name'),
                medication_data.get('dosage'),
                medication_data.get('route'),
                medication_data.get('frequency'),
                medication_data.get('duration'),
                medication_data.get('prescribed_date'),
                medication_data.get('prescriber_id'),
                float(medication_data.get('cost', 0)) if medication_data.get('cost') else 0.0
            )
            cursor.execute(query, values)
            conn.commit()
            
            # Sync claim amount
            ClaimsAndBillingModel.sync_claim_amount(medication_data.get('encounter_id'))
            
            return medication_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding medication: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(medication_id, medication_data):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            fields = []
            values = []
            for key, value in medication_data.items():
                if key == 'medication_id': continue
                if value is not None:
                    if key == 'cost':
                        fields.append(f"{key} = %s")
                        values.append(float(value) if value else 0.0)
                    else:
                        fields.append(f"{key} = %s")
                        values.append(value)
            
            if not fields: return False
            
            values.append(medication_id)
            cursor.execute(f"UPDATE medications SET {', '.join(fields)} WHERE medication_id = %s", values)
            conn.commit()
            
            # Fetch encounter_id if not in data, to sync claim amount
            if 'encounter_id' in medication_data:
                encounter_id = medication_data['encounter_id']
            else:
                cursor.execute("SELECT encounter_id FROM medications WHERE medication_id = %s", (medication_id,))
                res = cursor.fetchone()
                encounter_id = res['encounter_id'] if res else None
                
            if encounter_id:
                ClaimsAndBillingModel.sync_claim_amount(encounter_id)
                
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating medication: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(medication_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            # Fetch encounter_id before delete to sync claim amount
            cursor.execute("SELECT encounter_id FROM medications WHERE medication_id = %s", (medication_id,))
            res = cursor.fetchone()
            encounter_id = res['encounter_id'] if res else None
            
            cursor.execute("DELETE FROM medications WHERE medication_id = %s", (medication_id,))
            conn.commit()
            
            if encounter_id:
                ClaimsAndBillingModel.sync_claim_amount(encounter_id)
                
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting medication: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class ProceduresModel:
    """Data Access Object for the procedures table."""
    
    SORTABLE_COLUMNS = {
        "procedure_id": "pr.procedure_id",
        "encounter_id": "pr.encounter_id",
        "procedure_date": "pr.procedure_date",
        "procedure_code": "pr.procedure_code",
        "procedure_cost": "pr.procedure_cost"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by='procedure_date', sort_dir='desc'):
        """
        Get all procedures with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query with JOINs
            base_query = """
                SELECT pr.*, 
                       e.encounter_id, e.visit_date,
                       p.patient_id, p.first_name, p.last_name,
                       prov.name as provider_name, prov.specialty as provider_specialty
                FROM procedures pr
                LEFT JOIN encounters e ON pr.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                LEFT JOIN providers prov ON pr.provider_id = prov.provider_id
                WHERE 1=1
            """
            params = []
            
            # General search
            if search:
                like_term = f"%{search}%"
                base_query += """
                    AND (pr.procedure_id LIKE %s OR pr.procedure_code LIKE %s OR pr.encounter_id LIKE %s
                    OR pr.procedure_description LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s 
                    OR prov.name LIKE %s)
                """
                params.extend([like_term] * 6)
            
            # Detailed filters
            filters = filters or {}
            if filters.get('procedure_id'): base_query += " AND pr.procedure_id LIKE %s"; params.append(f"%{filters['procedure_id']}%")
            if filters.get('encounter_id'): base_query += " AND pr.encounter_id LIKE %s"; params.append(f"%{filters['encounter_id']}%")
            if filters.get('procedure_code'): base_query += " AND pr.procedure_code LIKE %s"; params.append(f"%{filters['procedure_code']}%")
            if filters.get('provider_id'): base_query += " AND pr.provider_id LIKE %s"; params.append(f"%{filters['provider_id']}%")
            if filters.get('procedure_date_from'): base_query += " AND pr.procedure_date >= %s"; params.append(filters['procedure_date_from'])
            if filters.get('procedure_date_to'): base_query += " AND pr.procedure_date <= %s"; params.append(filters['procedure_date_to'])
            if filters.get('procedure_cost_min') is not None: base_query += " AND pr.procedure_cost >= %s"; params.append(float(filters['procedure_cost_min']))
            if filters.get('procedure_cost_max') is not None: base_query += " AND pr.procedure_cost <= %s"; params.append(float(filters['procedure_cost_max']))
            
            # Get total count - build separate count query
            count_base = """
                SELECT COUNT(*) as total
                FROM procedures pr
                LEFT JOIN encounters e ON pr.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                LEFT JOIN providers prov ON pr.provider_id = prov.provider_id
                WHERE 1=1
            """
            count_params = []
            
            # Apply same filters to count query
            if search:
                like_term = f"%{search}%"
                count_base += """
                    AND (pr.procedure_id LIKE %s OR pr.procedure_code LIKE %s OR pr.encounter_id LIKE %s
                    OR pr.procedure_description LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s 
                    OR prov.name LIKE %s)
                """
                count_params.extend([like_term] * 6)
            
            if filters.get('procedure_id'): count_base += " AND pr.procedure_id LIKE %s"; count_params.append(f"%{filters['procedure_id']}%")
            if filters.get('encounter_id'): count_base += " AND pr.encounter_id LIKE %s"; count_params.append(f"%{filters['encounter_id']}%")
            if filters.get('procedure_code'): count_base += " AND pr.procedure_code LIKE %s"; count_params.append(f"%{filters['procedure_code']}%")
            if filters.get('provider_id'): count_base += " AND pr.provider_id LIKE %s"; count_params.append(f"%{filters['provider_id']}%")
            if filters.get('procedure_date_from'): count_base += " AND pr.procedure_date >= %s"; count_params.append(filters['procedure_date_from'])
            if filters.get('procedure_date_to'): count_base += " AND pr.procedure_date <= %s"; count_params.append(filters['procedure_date_to'])
            if filters.get('procedure_cost_min') is not None: count_base += " AND pr.procedure_cost >= %s"; count_params.append(float(filters['procedure_cost_min']))
            if filters.get('procedure_cost_max') is not None: count_base += " AND pr.procedure_cost <= %s"; count_params.append(float(filters['procedure_cost_max']))
            
            cursor.execute(count_base, count_params)
            count_result = cursor.fetchone()
            total_count = count_result['total'] if count_result else 0
            
            # Apply sorting and pagination
            sort_col = ProceduresModel.SORTABLE_COLUMNS.get(sort_by, 'pr.procedure_date')
            sort_d = 'ASC' if str(sort_dir).lower() == 'asc' else 'DESC'
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            procedures = cursor.fetchall()
            
            return {
                'data': procedures,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching procedures: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(procedure_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT pr.*, 
                       e.encounter_id, e.visit_date,
                       p.patient_id, p.first_name, p.last_name,
                       prov.name as provider_name, prov.specialty as provider_specialty
                FROM procedures pr
                LEFT JOIN encounters e ON pr.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                LEFT JOIN providers prov ON pr.provider_id = prov.provider_id
                WHERE pr.procedure_id = %s
            """
            cursor.execute(query, (procedure_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching procedure: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(procedure_data):
        """
        Add a new procedure. Validates required NOT NULL fields.
        Required fields: encounter_id, procedure_code, procedure_date
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not procedure_data.get('encounter_id'):
                raise ValueError("encounter_id is required (NOT NULL)")
            if not procedure_data.get('procedure_code'):
                raise ValueError("procedure_code is required (NOT NULL)")
            if not procedure_data.get('procedure_date'):
                raise ValueError("procedure_date is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Fix: Correct order of arguments for generate_new_id (cursor, table, column, prefix)
            procedure_id = procedure_data.get('procedure_id') or generate_new_id(cursor, 'procedures', 'procedure_id', 'PROC', 6)
            
            query = """
                INSERT INTO procedures 
                (procedure_id, encounter_id, procedure_code, procedure_description, procedure_date, provider_id, procedure_cost)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                procedure_id,
                procedure_data.get('encounter_id'),
                procedure_data.get('procedure_code'),
                procedure_data.get('procedure_description'),
                procedure_data.get('procedure_date'),
                procedure_data.get('provider_id'),
                float(procedure_data.get('procedure_cost', 0)) if procedure_data.get('procedure_cost') else 0.0
            )
            cursor.execute(query, values)
            conn.commit()
            
            # Sync claim amount
            ClaimsAndBillingModel.sync_claim_amount(procedure_data.get('encounter_id'))
            
            return procedure_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding procedure: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(procedure_id, procedure_data):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            fields = []
            values = []
            for key, value in procedure_data.items():
                if key == 'procedure_id': continue
                if value is not None:
                    if key == 'procedure_cost':
                        fields.append(f"{key} = %s")
                        values.append(float(value) if value else 0.0)
                    else:
                        fields.append(f"{key} = %s")
                        values.append(value)
            
            if not fields: return False
            
            values.append(procedure_id)
            cursor.execute(f"UPDATE procedures SET {', '.join(fields)} WHERE procedure_id = %s", values)
            conn.commit()
            
            # Fetch encounter_id if not in data, to sync claim amount
            if 'encounter_id' in procedure_data:
                encounter_id = procedure_data['encounter_id']
            else:
                cursor.execute("SELECT encounter_id FROM procedures WHERE procedure_id = %s", (procedure_id,))
                res = cursor.fetchone()
                encounter_id = res['encounter_id'] if res else None
            
            if encounter_id:
                ClaimsAndBillingModel.sync_claim_amount(encounter_id)
            
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating procedure: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(procedure_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            # Fetch encounter_id before delete to sync claim amount
            cursor.execute("SELECT encounter_id FROM procedures WHERE procedure_id = %s", (procedure_id,))
            res = cursor.fetchone()
            encounter_id = res['encounter_id'] if res else None
            
            cursor.execute("DELETE FROM procedures WHERE procedure_id = %s", (procedure_id,))
            conn.commit()
            
            if encounter_id:
                ClaimsAndBillingModel.sync_claim_amount(encounter_id)
                
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting procedure: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
            
    @staticmethod
    def get_distinct_codes():
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT DISTINCT procedure_code, procedure_description FROM procedures ORDER BY procedure_code")
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct procedure codes: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class LabTestsModel:
    """Data Access Object for the lab_tests table."""
    
    SORTABLE_COLUMNS = {
        "test_id": "lt.test_id",
        "encounter_id": "lt.encounter_id",
        "test_date": "lt.test_date",
        "test_code": "lt.test_code",
        "status": "lt.status"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by='test_date', sort_dir='desc'):
        """
        Get all lab tests with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query with JOINs
            base_query = """
                SELECT lt.*, 
                       e.encounter_id, e.visit_date,
                       p.patient_id, p.first_name, p.last_name
                FROM lab_tests lt
                LEFT JOIN encounters e ON lt.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                WHERE 1=1
            """
            params = []
            
            # General search
            if search:
                like_term = f"%{search}%"
                base_query += """
                    AND (lt.test_id LIKE %s OR lt.test_code LIKE %s OR lt.encounter_id LIKE %s
                    OR lt.test_name LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s 
                    OR lt.lab_id LIKE %s OR lt.status LIKE %s)
                """
                params.extend([like_term] * 7)
            
            # Detailed filters
            filters = filters or {}
            if filters.get('test_id'): base_query += " AND lt.test_id LIKE %s"; params.append(f"%{filters['test_id']}%")
            if filters.get('encounter_id'): base_query += " AND lt.encounter_id LIKE %s"; params.append(f"%{filters['encounter_id']}%")
            if filters.get('test_code'): base_query += " AND lt.test_code LIKE %s"; params.append(f"%{filters['test_code']}%")
            if filters.get('lab_id'): base_query += " AND lt.lab_id LIKE %s"; params.append(f"%{filters['lab_id']}%")
            if filters.get('test_date_from'): base_query += " AND lt.test_date >= %s"; params.append(filters['test_date_from'])
            if filters.get('test_date_to'): base_query += " AND lt.test_date <= %s"; params.append(filters['test_date_to'])
            if filters.get('status'): base_query += " AND lt.status LIKE %s"; params.append(f"%{filters['status']}%")
            if filters.get('specimen_type'): base_query += " AND lt.specimen_type LIKE %s"; params.append(f"%{filters['specimen_type']}%")
            
            # Get total count - build separate count query
            count_base = """
                SELECT COUNT(*) as total
                FROM lab_tests lt
                LEFT JOIN encounters e ON lt.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                WHERE 1=1
            """
            count_params = []
            
            # Apply same filters to count query
            if search:
                like_term = f"%{search}%"
                count_base += """
                    AND (lt.test_id LIKE %s OR lt.test_code LIKE %s OR lt.encounter_id LIKE %s
                    OR lt.test_name LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s 
                    OR lt.lab_id LIKE %s OR lt.status LIKE %s)
                """
                count_params.extend([like_term] * 7)
            
            if filters.get('test_id'): count_base += " AND lt.test_id LIKE %s"; count_params.append(f"%{filters['test_id']}%")
            if filters.get('encounter_id'): count_base += " AND lt.encounter_id LIKE %s"; count_params.append(f"%{filters['encounter_id']}%")
            if filters.get('test_code'): count_base += " AND lt.test_code LIKE %s"; count_params.append(f"%{filters['test_code']}%")
            if filters.get('lab_id'): count_base += " AND lt.lab_id LIKE %s"; count_params.append(f"%{filters['lab_id']}%")
            if filters.get('test_date_from'): count_base += " AND lt.test_date >= %s"; count_params.append(filters['test_date_from'])
            if filters.get('test_date_to'): count_base += " AND lt.test_date <= %s"; count_params.append(filters['test_date_to'])
            if filters.get('status'): count_base += " AND lt.status LIKE %s"; count_params.append(f"%{filters['status']}%")
            if filters.get('specimen_type'): count_base += " AND lt.specimen_type LIKE %s"; count_params.append(f"%{filters['specimen_type']}%")
            
            cursor.execute(count_base, count_params)
            count_result = cursor.fetchone()
            total_count = count_result['total'] if count_result else 0
            
            # Apply sorting and pagination
            sort_col = LabTestsModel.SORTABLE_COLUMNS.get(sort_by, 'lt.test_date')
            sort_d = 'ASC' if str(sort_dir).lower() == 'asc' else 'DESC'
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            lab_tests = cursor.fetchall()
            
            return {
                'data': lab_tests,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching lab tests: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(test_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT lt.*, 
                       e.encounter_id, e.visit_date,
                       p.patient_id, p.first_name, p.last_name
                FROM lab_tests lt
                LEFT JOIN encounters e ON lt.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                WHERE lt.test_id = %s
            """
            cursor.execute(query, (test_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching lab test: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(lab_test_data):
        """
        Add a new lab test. Validates required NOT NULL fields.
        Required fields: encounter_id, test_code, test_name, test_date, status
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not lab_test_data.get('encounter_id'):
                raise ValueError("encounter_id is required (NOT NULL)")
            if not lab_test_data.get('test_code'):
                raise ValueError("test_code is required (NOT NULL)")
            if not lab_test_data.get('test_name'):
                raise ValueError("test_name is required (NOT NULL)")
            if not lab_test_data.get('test_date'):
                raise ValueError("test_date is required (NOT NULL)")
            if not lab_test_data.get('status'):
                raise ValueError("status is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Generate test_id with T prefix and 5 digit padding (T00000 format)
            test_id = lab_test_data.get('test_id') or generate_new_id(cursor, 'lab_tests', 'test_id', 'T', 5)
            
            query = """
                INSERT INTO lab_tests 
                (test_id, lab_id, encounter_id, test_name, test_code, specimen_type, test_result, units, normal_range, test_date, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                test_id,
                lab_test_data.get('lab_id'),
                lab_test_data.get('encounter_id'),
                lab_test_data.get('test_name'),
                lab_test_data.get('test_code'),
                lab_test_data.get('specimen_type'),
                lab_test_data.get('test_result'),
                lab_test_data.get('units') or 'N/A',
                lab_test_data.get('normal_range') or 'N/A',
                lab_test_data.get('test_date'),
                lab_test_data.get('status')
            )
            cursor.execute(query, values)
            conn.commit()
            return test_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding lab test: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(test_id, lab_test_data):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            fields = []
            values = []
            for key, value in lab_test_data.items():
                if key == 'test_id': continue
                if value is not None:
                    fields.append(f"{key} = %s")
                    values.append(value)
            
            if not fields: return False
            
            values.append(test_id)
            cursor.execute(f"UPDATE lab_tests SET {', '.join(fields)} WHERE test_id = %s", values)
            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating lab test: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(test_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("DELETE FROM lab_tests WHERE test_id = %s", (test_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting lab test: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_distinct_codes():
        """Get all distinct test codes with test names."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT DISTINCT test_code, test_name FROM lab_tests ORDER BY test_code")
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct test codes: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_distinct_lab_ids():
        """Get all distinct lab IDs."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT DISTINCT lab_id FROM lab_tests WHERE lab_id IS NOT NULL AND lab_id != '' ORDER BY lab_id")
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct lab IDs: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_distinct_specimen_types():
        """Get all distinct specimen types."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT DISTINCT specimen_type FROM lab_tests WHERE specimen_type IS NOT NULL AND specimen_type != '' ORDER BY specimen_type")
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct specimen types: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_distinct_units():
        """Get all distinct units."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT DISTINCT units FROM lab_tests WHERE units IS NOT NULL AND units != '' ORDER BY units")
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct units: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_distinct_normal_ranges():
        """Get all distinct normal ranges."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT DISTINCT normal_range FROM lab_tests WHERE normal_range IS NOT NULL AND normal_range != '' ORDER BY normal_range")
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct normal ranges: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_distinct_test_results():
        """Get all distinct test results."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("SELECT DISTINCT test_result FROM lab_tests WHERE test_result IS NOT NULL AND test_result != '' ORDER BY test_result")
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct test results: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class DiagnosesModel:
    """Data Access Object for the diagnoses table."""
    
    SORTABLE_COLUMNS = {
        "diagnosis_id": "d.diagnosis_id",
        "encounter_id": "d.encounter_id",
        "diagnosis_code": "d.diagnosis_code",
        "primary_flag": "d.primary_flag"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by='diagnosis_id', sort_dir='desc'):
        """
        Get all diagnoses with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query with JOINs
            base_query = """
                SELECT d.*, 
                       e.encounter_id, e.visit_date,
                       p.patient_id, p.first_name, p.last_name
                FROM diagnoses d
                LEFT JOIN encounters e ON d.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                WHERE 1=1
            """
            params = []
            
            # General search
            if search:
                like_term = f"%{search}%"
                base_query += """
                    AND (d.diagnosis_id LIKE %s OR d.diagnosis_code LIKE %s OR d.encounter_id LIKE %s
                    OR d.diagnosis_description LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s)
                """
                params.extend([like_term] * 5)
            
            # Detailed filters
            filters = filters or {}
            if filters.get('diagnosis_id'): base_query += " AND d.diagnosis_id LIKE %s"; params.append(f"%{filters['diagnosis_id']}%")
            if filters.get('encounter_id'): base_query += " AND d.encounter_id LIKE %s"; params.append(f"%{filters['encounter_id']}%")
            if filters.get('diagnosis_code'): base_query += " AND d.diagnosis_code LIKE %s"; params.append(f"%{filters['diagnosis_code']}%")
            if filters.get('primary_flag') is not None:
                if str(filters['primary_flag']).lower() in ['true', '1', 'yes']:
                    base_query += " AND d.primary_flag = 1"
                elif str(filters['primary_flag']).lower() in ['false', '0', 'no']:
                    base_query += " AND d.primary_flag = 0"
            if filters.get('chronic_flag') is not None:
                if str(filters['chronic_flag']).lower() in ['true', '1', 'yes']:
                    base_query += " AND d.chronic_flag = 1"
                elif str(filters['chronic_flag']).lower() in ['false', '0', 'no']:
                    base_query += " AND d.chronic_flag = 0"
            
            # Get total count - build separate count query
            count_base = """
                SELECT COUNT(*) as total
                FROM diagnoses d
                LEFT JOIN encounters e ON d.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                WHERE 1=1
            """
            count_params = []
            
            # Apply same filters to count query
            if search:
                like_term = f"%{search}%"
                count_base += """
                    AND (d.diagnosis_id LIKE %s OR d.diagnosis_code LIKE %s OR d.encounter_id LIKE %s
                    OR d.diagnosis_description LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s)
                """
                count_params.extend([like_term] * 5)
            
            if filters.get('diagnosis_id'): count_base += " AND d.diagnosis_id LIKE %s"; count_params.append(f"%{filters['diagnosis_id']}%")
            if filters.get('encounter_id'): count_base += " AND d.encounter_id LIKE %s"; count_params.append(f"%{filters['encounter_id']}%")
            if filters.get('diagnosis_code'): count_base += " AND d.diagnosis_code LIKE %s"; count_params.append(f"%{filters['diagnosis_code']}%")
            if filters.get('primary_flag') is not None:
                if str(filters['primary_flag']).lower() in ['true', '1', 'yes']:
                    count_base += " AND d.primary_flag = 1"
                elif str(filters['primary_flag']).lower() in ['false', '0', 'no']:
                    count_base += " AND d.primary_flag = 0"
            if filters.get('chronic_flag') is not None:
                if str(filters['chronic_flag']).lower() in ['true', '1', 'yes']:
                    count_base += " AND d.chronic_flag = 1"
                elif str(filters['chronic_flag']).lower() in ['false', '0', 'no']:
                    count_base += " AND d.chronic_flag = 0"
            
            cursor.execute(count_base, count_params)
            count_result = cursor.fetchone()
            total_count = count_result['total'] if count_result else 0
            
            # Apply sorting and pagination
            sort_col = DiagnosesModel.SORTABLE_COLUMNS.get(sort_by, 'd.diagnosis_id')
            sort_d = 'ASC' if str(sort_dir).lower() == 'asc' else 'DESC'
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            diagnoses = cursor.fetchall()
            
            return {
                'data': diagnoses,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching diagnoses: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(diagnosis_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT d.*, 
                       e.encounter_id, e.visit_date,
                       p.patient_id, p.first_name, p.last_name
                FROM diagnoses d
                LEFT JOIN encounters e ON d.encounter_id = e.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                WHERE d.diagnosis_id = %s
            """
            cursor.execute(query, (diagnosis_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching diagnosis: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(diagnosis_data):
        """
        Add a new diagnosis. Validates required NOT NULL fields.
        Required fields: encounter_id, diagnosis_code
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not diagnosis_data.get('encounter_id'):
                raise ValueError("encounter_id is required (NOT NULL)")
            if not diagnosis_data.get('diagnosis_code'):
                raise ValueError("diagnosis_code is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            diagnosis_id = diagnosis_data.get('diagnosis_id') or generate_new_id(cursor, 'diagnoses', 'diagnosis_id', 'DIA', 6)
            
            query = """
                INSERT INTO diagnoses 
                (diagnosis_id, encounter_id, diagnosis_code, diagnosis_description, primary_flag, chronic_flag)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            values = (
                diagnosis_id,
                diagnosis_data.get('encounter_id'),
                diagnosis_data.get('diagnosis_code'),
                diagnosis_data.get('diagnosis_description'),
                1 if str(diagnosis_data.get('primary_flag', '1')).lower() in ['true', '1', 'yes'] else 0,
                1 if str(diagnosis_data.get('chronic_flag', '0')).lower() in ['true', '1', 'yes'] else 0 if diagnosis_data.get('chronic_flag') is not None else None
            )
            cursor.execute(query, values)
            
            # Update the encounter with the diagnosis code
            if diagnosis_data.get('diagnosis_code'):
                cursor.execute(
                    "UPDATE encounters SET diagnosis_code = %s WHERE encounter_id = %s",
                    (diagnosis_data.get('diagnosis_code'), diagnosis_data.get('encounter_id'))
                )
            
            conn.commit()
            return diagnosis_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding diagnosis: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(diagnosis_id, diagnosis_data):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            fields = []
            values = []
            for key, value in diagnosis_data.items():
                if key == 'diagnosis_id': continue
                if value is not None:
                    if key in ['primary_flag', 'chronic_flag']:
                        if isinstance(value, bool):
                            fields.append(f"{key} = %s")
                            values.append(1 if value else 0)
                        elif isinstance(value, str):
                            fields.append(f"{key} = %s")
                            values.append(1 if value.lower() in ['true', '1', 'yes'] else 0 if value.lower() in ['false', '0', 'no'] else None)
                        else:
                            fields.append(f"{key} = %s")
                            values.append(value)
                    else:
                        fields.append(f"{key} = %s")
                        values.append(value)
            
            if not fields: return False
            
            values.append(diagnosis_id)
            cursor.execute(f"UPDATE diagnoses SET {', '.join(fields)} WHERE diagnosis_id = %s", values)
            
            # If diagnosis_code is updated, update the encounter as well
            if 'diagnosis_code' in diagnosis_data and diagnosis_data['diagnosis_code']:
                 # Need to fetch encounter_id for this diagnosis first or if it's in data
                enc_id = diagnosis_data.get('encounter_id')
                if not enc_id:
                     # Fetch it if not provided (though typically not needed if we assume it doesn't change, 
                     # but here we need it for the WHERE clause on encounters)
                     cursor.execute("SELECT encounter_id FROM diagnoses WHERE diagnosis_id = %s", (diagnosis_id,))
                     res = cursor.fetchone()
                     if res:
                         enc_id = res['encounter_id']
                
                if enc_id:
                    cursor.execute(
                        "UPDATE encounters SET diagnosis_code = %s WHERE encounter_id = %s",
                        (diagnosis_data['diagnosis_code'], enc_id)
                    )

            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating diagnosis: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(diagnosis_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            cursor.execute("DELETE FROM diagnoses WHERE diagnosis_id = %s", (diagnosis_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting diagnosis: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
            
    @staticmethod
    def get_available_encounters(search=None, limit=50):
        """Get encounters that do NOT have a diagnosis yet."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            query = """
                SELECT e.encounter_id, e.visit_date, 
                       p.first_name as patient_first_name, p.last_name as patient_last_name,
                       e.diagnosis_code
                FROM encounters e
                LEFT JOIN diagnoses d ON e.encounter_id = d.encounter_id
                LEFT JOIN patients p ON e.patient_id = p.patient_id
                WHERE d.encounter_id IS NULL
            """
            params = []
            
            if search:
                query += " AND (e.encounter_id LIKE %s OR CONCAT(p.first_name, ' ', p.last_name) LIKE %s)"
                params.extend([f"%{search}%", f"%{search}%"])
                
            query += " ORDER BY e.visit_date DESC LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching available encounters: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

    @staticmethod
    def get_distinct_codes():
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            # Fetch distinct codes. Use GROUP BY to ensure unique codes, picking one description.
            cursor.execute("""
                SELECT diagnosis_code, MAX(diagnosis_description) as diagnosis_description
                FROM diagnoses
                WHERE diagnosis_code IS NOT NULL AND diagnosis_code != ''
                GROUP BY diagnosis_code
                ORDER BY diagnosis_code
            """)
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching distinct diagnosis codes: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class ProvidersModel:
    """Data Access Object for the providers table."""
    
    SORTABLE_COLUMNS = {
        "provider_id": "pr.provider_id",
        "name": "pr.name",
        "department": "pr.department",
        "specialty": "pr.specialty",
        "npi": "pr.npi",
        "years_experience": "pr.years_experience"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by='name', sort_dir='asc'):
        """
        Get all providers with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query with JOINs
            base_query = """
                SELECT pr.*, 
                       dh.head_id, dh.department as head_department, dh.head_name
                FROM providers pr
                LEFT JOIN department_heads dh ON pr.head_id = dh.head_id
                WHERE 1=1
            """
            params = []
            
            # General search
            if search:
                like_term = f"%{search}%"
                base_query += """
                    AND (pr.provider_id LIKE %s OR pr.name LIKE %s OR pr.department LIKE %s
                    OR pr.specialty LIKE %s OR pr.npi LIKE %s OR dh.head_name LIKE %s)
                """
                params.extend([like_term] * 6)
            
            # Detailed filters
            filters = filters or {}
            if filters.get('provider_id'): base_query += " AND pr.provider_id LIKE %s"; params.append(f"%{filters['provider_id']}%")
            if filters.get('name'): base_query += " AND pr.name LIKE %s"; params.append(f"%{filters['name']}%")
            if filters.get('department'): base_query += " AND pr.department LIKE %s"; params.append(f"%{filters['department']}%")
            if filters.get('specialty'): base_query += " AND pr.specialty LIKE %s"; params.append(f"%{filters['specialty']}%")
            if filters.get('npi'): base_query += " AND pr.npi LIKE %s"; params.append(f"%{filters['npi']}%")
            if filters.get('inhouse') is not None:
                if str(filters['inhouse']).lower() in ['true', '1', 'yes']:
                    base_query += " AND pr.inhouse = 1"
                elif str(filters['inhouse']).lower() in ['false', '0', 'no']:
                    base_query += " AND pr.inhouse = 0"
            if filters.get('head_id'): base_query += " AND pr.head_id = %s"; params.append(int(filters['head_id']))
            
            # Get total count - build separate count query
            count_base = """
                SELECT COUNT(*) as total
                FROM providers pr
                LEFT JOIN department_heads dh ON pr.head_id = dh.head_id
                WHERE 1=1
            """
            count_params = []
            
            # Apply same filters to count query
            if search:
                like_term = f"%{search}%"
                count_base += """
                    AND (pr.provider_id LIKE %s OR pr.name LIKE %s OR pr.department LIKE %s
                    OR pr.specialty LIKE %s OR pr.npi LIKE %s OR dh.head_name LIKE %s)
                """
                count_params.extend([like_term] * 6)
            
            if filters.get('provider_id'): count_base += " AND pr.provider_id LIKE %s"; count_params.append(f"%{filters['provider_id']}%")
            if filters.get('name'): count_base += " AND pr.name LIKE %s"; count_params.append(f"%{filters['name']}%")
            if filters.get('department'): count_base += " AND pr.department LIKE %s"; count_params.append(f"%{filters['department']}%")
            if filters.get('specialty'): count_base += " AND pr.specialty LIKE %s"; count_params.append(f"%{filters['specialty']}%")
            if filters.get('npi'): count_base += " AND pr.npi LIKE %s"; count_params.append(f"%{filters['npi']}%")
            if filters.get('inhouse') is not None:
                if str(filters['inhouse']).lower() in ['true', '1', 'yes']:
                    count_base += " AND pr.inhouse = 1"
                elif str(filters['inhouse']).lower() in ['false', '0', 'no']:
                    count_base += " AND pr.inhouse = 0"
            if filters.get('head_id'): count_base += " AND pr.head_id = %s"; count_params.append(int(filters['head_id']))
            
            cursor.execute(count_base, count_params)
            count_result = cursor.fetchone()
            total_count = count_result['total'] if count_result else 0
            
            # Apply sorting and pagination
            sort_col = ProvidersModel.SORTABLE_COLUMNS.get(sort_by, 'pr.name')
            sort_d = 'ASC' if str(sort_dir).lower() == 'asc' else 'DESC'
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            providers = cursor.fetchall()
            
            return {
                'data': providers,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching providers: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_all_simple(limit=1000, search=None):
        """Get all providers for dropdown options - simpler version without pagination."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            query = "SELECT provider_id, name, specialty, department FROM providers WHERE 1=1"
            params = []
            
            if search:
                like_term = f"%{search}%"
                query += " AND (provider_id LIKE %s OR name LIKE %s OR specialty LIKE %s)"
                params.extend([like_term] * 3)
            
            query += " ORDER BY name LIMIT %s"
            params.append(limit)
            
            cursor.execute(query, params)
            return cursor.fetchall()
        except Error as e: raise Error(f"Error fetching providers: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_departments():
        """Get all distinct departments."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = "SELECT DISTINCT department FROM providers WHERE department IS NOT NULL AND department != '' ORDER BY department"
            cursor.execute(query)
            return [row['department'] for row in cursor.fetchall()]
        except Error as e: raise Error(f"Error fetching departments: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_specialties(department=None):
        """Get all distinct specialties, optionally filtered by department."""
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            if department:
                query = "SELECT DISTINCT specialty FROM providers WHERE department = %s AND specialty IS NOT NULL AND specialty != '' ORDER BY specialty"
                cursor.execute(query, (department,))
            else:
                query = "SELECT DISTINCT specialty FROM providers WHERE specialty IS NOT NULL AND specialty != '' ORDER BY specialty"
                cursor.execute(query)
            return [row['specialty'] for row in cursor.fetchall()]
        except Error as e: raise Error(f"Error fetching specialties: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(provider_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            query = """
                SELECT pr.*, 
                       dh.head_id, dh.department as head_department, dh.head_name
                FROM providers pr
                LEFT JOIN department_heads dh ON pr.head_id = dh.head_id
                WHERE pr.provider_id = %s
            """
            cursor.execute(query, (provider_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching provider: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(provider_data):
        """
        Add a new provider. Validates required NOT NULL fields.
        Required fields: provider_id, name, department, specialty, npi
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not provider_data.get('name'):
                raise ValueError("name is required (NOT NULL)")
            if not provider_data.get('department'):
                raise ValueError("department is required (NOT NULL)")
            if not provider_data.get('specialty'):
                raise ValueError("specialty is required (NOT NULL)")
            if not provider_data.get('npi'):
                raise ValueError("npi is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            provider_id = provider_data.get('provider_id') or generate_new_id(cursor, 'providers', 'provider_id', 'PRO', 6)
            
            query = """
                INSERT INTO providers 
                (provider_id, name, department, specialty, npi, inhouse, location, years_experience, contact_info, email, head_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                provider_id,
                provider_data.get('name'),
                provider_data.get('department'),
                provider_data.get('specialty'),
                provider_data.get('npi'),
                1 if str(provider_data.get('inhouse', '1')).lower() in ['true', '1', 'yes'] else 0,
                provider_data.get('location'),
                int(provider_data.get('years_experience')) if provider_data.get('years_experience') else None,
                provider_data.get('contact_info'),
                provider_data.get('email'),
                int(provider_data.get('head_id')) if provider_data.get('head_id') else None
            )
            cursor.execute(query, values)
            conn.commit()
            return provider_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding provider: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(provider_id, provider_data):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            fields = []
            values = []
            # Fields that cannot be updated: department, specialty, npi, head_id
            restricted_fields = {'department', 'specialty', 'npi', 'head_id'}
            
            for key, value in provider_data.items():
                if key == 'provider_id': continue
                if key in restricted_fields:
                    # Don't allow these fields to be updated
                    continue
                if value is not None:
                    if key == 'inhouse':
                        if isinstance(value, bool):
                            fields.append(f"{key} = %s")
                            values.append(1 if value else 0)
                        elif isinstance(value, str):
                            fields.append(f"{key} = %s")
                            values.append(1 if value.lower() in ['true', '1', 'yes'] else 0)
                        else:
                            fields.append(f"{key} = %s")
                            values.append(value)
                    elif key == 'years_experience':
                        fields.append(f"{key} = %s")
                        values.append(int(value) if value else None)
                    else:
                        fields.append(f"{key} = %s")
                        values.append(value)
            
            if not fields: return False
            
            values.append(provider_id)
            cursor.execute(f"UPDATE providers SET {', '.join(fields)} WHERE provider_id = %s", values)
            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating provider: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(provider_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            # Check for foreign key constraints
            cursor.execute("SELECT COUNT(*) as cnt FROM encounters WHERE provider_id = %s", (provider_id,))
            if cursor.fetchone()['cnt'] > 0:
                raise Error("Cannot delete provider: It has linked encounter records.")
            cursor.execute("DELETE FROM providers WHERE provider_id = %s", (provider_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting provider: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()


class DepartmentHeadsModel:
    """Data Access Object for the department_heads table."""
    
    SORTABLE_COLUMNS = {
        "head_id": "dh.head_id",
        "department": "dh.department",
        "head_provider_id": "dh.head_provider_id",
        "head_name": "dh.head_name"
    }
    
    @staticmethod
    def get_all(limit=1000, page=1, search=None, filters=None, sort_by='department', sort_dir='asc'):
        """
        Get all department heads with optional search, filters, sorting, and pagination.
        Uses SQL LIKE for search and filtering.
        """
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Build base query with JOIN to providers to get name and email dynamically
            base_query = """
                SELECT dh.head_id, dh.department, dh.head_provider_id,
                       p.name as head_name,
                       p.email as head_email
                FROM department_heads dh
                INNER JOIN providers p ON dh.head_provider_id = p.provider_id
                WHERE 1=1
            """
            params = []
            
            # General search (search in both department_heads and providers)
            if search:
                like_term = f"%{search}%"
                base_query += """
                    AND (dh.head_id LIKE %s OR dh.department LIKE %s OR dh.head_provider_id LIKE %s
                    OR p.name LIKE %s OR p.email LIKE %s)
                """
                params.extend([like_term] * 5)
            
            # Detailed filters
            filters = filters or {}
            if filters.get('head_id'): base_query += " AND dh.head_id = %s"; params.append(int(filters['head_id']))
            if filters.get('department'): base_query += " AND dh.department LIKE %s"; params.append(f"%{filters['department']}%")
            if filters.get('head_provider_id'): base_query += " AND dh.head_provider_id LIKE %s"; params.append(f"%{filters['head_provider_id']}%")
            if filters.get('head_name'): base_query += " AND p.name LIKE %s"; params.append(f"%{filters['head_name']}%")
            if filters.get('head_email'): base_query += " AND p.email LIKE %s"; params.append(f"%{filters['head_email']}%")
            
            # Get total count - build separate count query with JOIN
            count_base = """
                SELECT COUNT(*) as total
                FROM department_heads dh
                INNER JOIN providers p ON dh.head_provider_id = p.provider_id
                WHERE 1=1
            """
            count_params = []
            
            # Apply same filters to count query
            if search:
                like_term = f"%{search}%"
                count_base += """
                    AND (dh.head_id LIKE %s OR dh.department LIKE %s OR dh.head_provider_id LIKE %s
                    OR p.name LIKE %s OR p.email LIKE %s)
                """
                count_params.extend([like_term] * 5)
            
            if filters.get('head_id'): count_base += " AND dh.head_id = %s"; count_params.append(int(filters['head_id']))
            if filters.get('department'): count_base += " AND dh.department LIKE %s"; count_params.append(f"%{filters['department']}%")
            if filters.get('head_provider_id'): count_base += " AND dh.head_provider_id LIKE %s"; count_params.append(f"%{filters['head_provider_id']}%")
            if filters.get('head_name'): count_base += " AND p.name LIKE %s"; count_params.append(f"%{filters['head_name']}%")
            if filters.get('head_email'): count_base += " AND p.email LIKE %s"; count_params.append(f"%{filters['head_email']}%")
            
            cursor.execute(count_base, count_params)
            count_result = cursor.fetchone()
            total_count = count_result['total'] if count_result else 0
            
            # Apply sorting and pagination
            sort_col = DepartmentHeadsModel.SORTABLE_COLUMNS.get(sort_by, 'dh.department')
            sort_d = 'ASC' if str(sort_dir).lower() == 'asc' else 'DESC'
            offset = (page - 1) * limit
            query = f"{base_query} ORDER BY {sort_col} {sort_d} LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            department_heads = cursor.fetchall()
            
            return {
                'data': department_heads,
                'total': total_count,
                'page': page,
                'per_page': limit,
                'total_pages': (total_count + limit - 1) // limit
            }
        except Error as e: raise Error(f"Error fetching department heads: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def get_by_id(head_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            # JOIN with providers to get name and email dynamically
            query = """
                SELECT dh.head_id, dh.department, dh.head_provider_id,
                       p.name as head_name,
                       p.email as head_email
                FROM department_heads dh
                INNER JOIN providers p ON dh.head_provider_id = p.provider_id
                WHERE dh.head_id = %s
            """
            cursor.execute(query, (head_id,))
            return cursor.fetchone()
        except Error as e: raise Error(f"Error fetching department head: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def add(head_data):
        """
        Add a new department head. Validates required NOT NULL fields.
        Required fields: department, head_provider_id
        """
        conn = None
        try:
            # Validate required NOT NULL fields
            if not head_data.get('department'):
                raise ValueError("department is required (NOT NULL)")
            if not head_data.get('head_provider_id'):
                raise ValueError("head_provider_id is required (NOT NULL)")
            
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            # Validate that provider exists and get their name/email
            provider_id = head_data.get('head_provider_id')
            department = head_data.get('department')
            cursor.execute("SELECT name, email, department FROM providers WHERE provider_id = %s", (provider_id,))
            provider = cursor.fetchone()
            if not provider:
                raise ValueError(f"Provider with ID {provider_id} not found")
            
            # Validate that provider's department matches the department head's department
            provider_department = provider['department'] if provider['department'] else ''
            if provider_department.lower() != department.lower():
                raise ValueError(f"Provider's department ({provider_department}) must match the department head's department ({department})")
            
            # Generate head_id if not provided
            head_id = head_data.get('head_id')
            if not head_id:
                cursor.execute("SELECT COALESCE(MAX(head_id), 0) + 1 as next_id FROM department_heads")
                result = cursor.fetchone()
                head_id = result['next_id'] if result else 1
            
            # Get name and email from provider (for backward compatibility, we still store them)
            provider_name = provider['name']
            provider_email = provider.get('email')  # Can be None
            
            query = """
                INSERT INTO department_heads 
                (head_id, department, head_provider_id, head_name, head_email)
                VALUES (%s, %s, %s, %s, %s)
            """
            values = (
                head_id,
                department,
                provider_id,
                provider_name,  # Auto-get from provider
                provider_email  # Auto-get from provider
            )
            cursor.execute(query, values)
            conn.commit()
            return head_id
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error adding department head: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def update(head_id, head_data):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            
            fields = []
            values = []
            provider_id_changed = False
            new_provider_id = None
            
            for key, value in head_data.items():
                if key == 'head_id': continue
                if key == 'head_provider_id' and value is not None:
                    provider_id_changed = True
                    new_provider_id = value
                    fields.append(f"{key} = %s")
                    values.append(value)
                elif key == 'department':
                    # Don't allow department to be updated
                    continue
                elif key == 'head_name' or key == 'head_email':
                    # Don't allow direct updates to name/email - they're auto-filled from provider
                    continue
                elif value is not None:
                    fields.append(f"{key} = %s")
                    values.append(value)
            
            # If provider_id changed, validate department match and auto-update name and email from providers table
            # (for backward compatibility, we still update these columns even though we read from JOIN)
            if provider_id_changed and new_provider_id:
                # First get the current department of this department head
                cursor.execute("SELECT department FROM department_heads WHERE head_id = %s", (head_id,))
                head_record = cursor.fetchone()
                if not head_record:
                    raise ValueError(f"Department head with ID {head_id} not found")
                
                current_department = head_record['department']
                
                # Get provider's data
                cursor.execute(
                    "SELECT name, email, department FROM providers WHERE provider_id = %s",
                    (new_provider_id,)
                )
                provider_data = cursor.fetchone()
                if not provider_data:
                    raise ValueError(f"Provider with ID {new_provider_id} not found")
                
                provider_department = provider_data['department'] if provider_data['department'] else ''
                # Validate that provider's department matches the department head's department
                if provider_department.lower() != current_department.lower():
                    raise ValueError(f"Provider's department ({provider_department}) must match the department head's department ({current_department})")
                
                # Update head_name and head_email for backward compatibility (though we read from JOIN)
                fields.append("head_name = %s")
                values.append(provider_data['name'])
                fields.append("head_email = %s")
                values.append(provider_data['email'])  # Can be None, which is fine for SQL
            
            if not fields: return False
            
            values.append(head_id)
            cursor.execute(f"UPDATE department_heads SET {', '.join(fields)} WHERE head_id = %s", values)
            conn.commit()
            return cursor.rowcount > 0
        except ValueError as ve:
            if conn: conn.rollback()
            raise ve
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error updating department head: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()
    
    @staticmethod
    def delete(head_id):
        conn = None
        try:
            conn = get_db_connection()
            cursor = get_db_cursor(conn)
            # Check for foreign key constraints
            cursor.execute("SELECT COUNT(*) as cnt FROM providers WHERE head_id = %s", (head_id,))
            if cursor.fetchone()['cnt'] > 0:
                raise Error("Cannot delete department head: It has linked provider records.")
            cursor.execute("DELETE FROM department_heads WHERE head_id = %s", (head_id,))
            conn.commit()
            return cursor.rowcount > 0
        except Error as e:
            if conn: conn.rollback()
            raise Error(f"Error deleting department head: {e}")
        finally:
            if conn and conn.is_connected(): cursor.close(); conn.close()

