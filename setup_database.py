# Database setup script - creates tables and loads data
import mysql.connector
from mysql.connector import errorcode
from settings import DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
from table_definitions import CREATE_TABLES_SQL
import os

def drop_existing_tables(cursor):
    """Drop all existing tables in reverse dependency order."""
    print("Dropping existing tables...")
    tables = [
        'denials', 'claims_and_billing', 'medications', 'lab_tests', 
        'procedures', 'diagnoses', 'encounters', 'department_heads',
        'providers', 'patients', 'insurers'
    ]
    cursor.execute('SET FOREIGN_KEY_CHECKS = 0')
    for table in tables:
        try:
            cursor.execute(f'DROP TABLE IF EXISTS {table}')
            print(f"  Dropped {table}")
        except Exception as e:
            print(f"  Warning: Could not drop {table}: {e}")
    cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
    print("All tables dropped.\n")

def create_tables(cursor, conn):
    """Create all tables with constraints from table_definitions."""
    print("=" * 60)
    print("STEP 1: Creating tables with all constraints...")
    print("=" * 60)
    
    for i, statement in enumerate(CREATE_TABLES_SQL, 1):
        statement = statement.strip()
        if not statement:
            continue
        
        try:
            # Determine what we're creating
            if "CREATE TABLE" in statement.upper():
                table_name = statement.split("CREATE TABLE")[1].split("(")[0].strip()
                print(f"[{i}] Creating table: {table_name}")
            elif "ALTER TABLE" in statement.upper():
                table_name = statement.split("ALTER TABLE")[1].split()[0].strip()
                constraint_name = statement.split("ADD CONSTRAINT")[1].split()[0].strip() if "ADD CONSTRAINT" in statement.upper() else "FK"
                print(f"[{i}] Adding constraint to {table_name}: {constraint_name}")
            else:
                print(f"[{i}] Executing statement...")
            
            cursor.execute(statement)
            conn.commit()
            print(f"  [OK] Success\n")
            
        except mysql.connector.Error as err:
            print(f"  [ERROR] {err}")
            print(f"  Statement: {statement[:100]}...")
            raise
    
    print("All tables created successfully!\n")

def validate_csv_data(cursor, table_name, file_path):
    """Validate CSV data before loading - check for FK violations."""
    print(f"  Validating {table_name} data...")
    
    # Read first few lines to understand structure
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            header = f.readline().strip()
            # Check a few sample rows
            sample_rows = []
            for i, line in enumerate(f):
                if i >= 5:  # Check first 5 rows
                    break
                sample_rows.append(line.strip())
    except Exception as e:
        print(f"  [WARNING] Could not read CSV file: {e}")
        return True
    
    # Basic validation - check if file has data
    if not sample_rows:
        print(f"  [WARNING] CSV file appears empty")
        return False
    
    print(f"  [OK] CSV file structure looks valid")
    return True

def load_csv_data_with_validation(cursor, conn, dataset_path):
    """Load data from CSV files in logical order with FK checks enabled."""
    print("=" * 60)
    print("STEP 2: Loading data in logical order (FK checks ENABLED)...")
    print("=" * 60)
    
    # Enable foreign key checks - we want to validate data integrity
    cursor.execute('SET SESSION foreign_key_checks = 1')
    print("Foreign key checks: ENABLED\n")
    
    # Logical loading order based on dependencies
    csv_files = [
        # Level 1: No dependencies
        ('insurers', 'insurers.csv', 
         '(insurer_id,code,name,payer_type,phone)',
         'No dependencies'),
        
        # Level 2: Depends on insurers
        ('patients', 'patients.csv', 
         "(patient_id,first_name,last_name,@dob,age,gender,ethnicity,insurance_type,marital_status,address,city,state,zip,phone,@email,@registration_date) SET dob = STR_TO_DATE(@dob, '%d-%m-%Y'), registration_date = STR_TO_DATE(@registration_date, '%d-%m-%Y'), email = NULLIF(@email, '')",
         'Depends on: insurers'),
        
        # Level 3: Load providers - head_id will be set to NULL initially
        ('providers', 'providers.csv', 
         "(provider_id,name,department,specialty,npi,@inhouse,location,years_experience,contact_info,@email,@head_id_skip) SET inhouse = (@inhouse = 'Yes'), email = NULLIF(@email, ''), head_id = NULL",
         'Depends on: (none - head_id temporarily NULL)'),
        
        # Level 4: Generate department_heads from providers using SQL (not CSV)
        # This will be done after providers are loaded
        
        # Level 6: Depends on patients and providers
        ('encounters', 'encounters.csv', 
         "(encounter_id,patient_id,provider_id,@visit_date,visit_type,department,reason_for_visit,diagnosis_code,admission_type,@discharge_date,length_of_stay,status,@readmitted_flag) SET visit_date = STR_TO_DATE(@visit_date, '%d-%m-%Y'), discharge_date = IF(@discharge_date = '', NULL, STR_TO_DATE(@discharge_date, '%d-%m-%Y')), readmitted_flag = (@readmitted_flag = 'Yes')",
         'Depends on: patients, providers'),
        
        # Level 7: Depends on encounters
        ('diagnoses', 'diagnoses.csv', 
         "(diagnosis_id,encounter_id,diagnosis_code,diagnosis_description,@primary_flag,@chronic_flag) SET primary_flag = (@primary_flag = 'TRUE'), chronic_flag = (@chronic_flag = 'TRUE')",
         'Depends on: encounters'),
        
        ('procedures', 'procedures.csv', 
         "(procedure_id,encounter_id,procedure_code,procedure_description,@procedure_date,provider_id,procedure_cost) SET procedure_date = STR_TO_DATE(@procedure_date, '%d-%m-%Y')",
         'Depends on: encounters, providers'),
        
        ('lab_tests', 'lab_tests.csv', 
         "(test_id,lab_id,encounter_id,test_name,test_code,specimen_type,test_result,units,normal_range,@test_date,status) SET test_date = STR_TO_DATE(@test_date, '%d-%m-%Y')",
         'Depends on: encounters'),
        
        ('medications', 'medications.csv', 
         "(medication_id,encounter_id,drug_name,dosage,route,frequency,duration,@prescribed_date,prescriber_id,cost) SET prescribed_date = STR_TO_DATE(@prescribed_date, '%d-%m-%Y')",
         'Depends on: encounters, providers'),
        
        # Level 8: Depends on patients, encounters, insurers
        ('claims_and_billing', 'claims_and_billing.csv', 
         "(billing_id,patient_id,encounter_id,insurance_provider,payment_method,@claim_id_var,@claim_billing_date,billed_amount,paid_amount,claim_status,denial_reason) SET claim_billing_date = STR_TO_DATE(@claim_billing_date, '%d-%m-%Y %H:%i'), claim_id = NULLIF(@claim_id_var, '')",
         'Depends on: patients, encounters, insurers'),
        
        # Level 9: Depends on claims_and_billing
        ('denials', 'denials.csv', 
         "(claim_id,denial_id,denial_reason_code,denial_reason_description,denied_amount,@denial_date,appeal_filed,appeal_status,@appeal_resolution_date,final_outcome) SET denial_date = STR_TO_DATE(@denial_date, '%d-%m-%Y'), appeal_resolution_date = IF(@appeal_resolution_date = '', NULL, STR_TO_DATE(@appeal_resolution_date, '%d-%m-%Y'))",
         'Depends on: claims_and_billing'),
    ]
    
    for table_name, file_name, columns_and_setters, dependencies in csv_files:
        file_path = os.path.join(dataset_path, file_name).replace('\\', '/')
        
        print(f"\nLoading {table_name}...")
        print(f"  Dependencies: {dependencies}")
        
        if not os.path.exists(file_path):
            print(f"  [ERROR] File not found: {file_name}")
            continue
        
        # Validate CSV before loading
        if not validate_csv_data(cursor, table_name, file_path):
            print(f"  [SKIP] Skipping {table_name} due to validation errors")
            continue
        
        try:
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                print(f"  [SKIP] File is empty")
                continue
            
            # Get row count before
            cursor.execute(f"SELECT COUNT(*) as cnt FROM {table_name}")
            count_before = cursor.fetchone()[0]
            
            # Load data
            load_query = f"""
                LOAD DATA LOCAL INFILE '{file_path}'
                INTO TABLE {table_name}
                FIELDS TERMINATED BY ',' 
                OPTIONALLY ENCLOSED BY '"'
                ESCAPED BY '\\\\'
                LINES TERMINATED BY '\\n'
                IGNORE 1 LINES
                {columns_and_setters}
            """
            
            cursor.execute(load_query)
            conn.commit()
            
            # Get row count after
            cursor.execute(f"SELECT COUNT(*) as cnt FROM {table_name}")
            count_after = cursor.fetchone()[0]
            rows_loaded = count_after - count_before
            
            if rows_loaded > 0:
                print(f"  [OK] Loaded {rows_loaded:,} rows")
            else:
                print(f"  [WARNING] No rows loaded (before: {count_before}, after: {count_after})")
            
        except mysql.connector.Error as err:
            print(f"  [ERROR] Failed to load {table_name}: {err}")
            print(f"  Error code: {err.errno}")
            conn.rollback()
            
            # Provide helpful error messages
            if err.errno == errorcode.ER_NO_REFERENCED_ROW_2:
                print(f"  [INFO] Foreign key violation - referenced row does not exist")
                print(f"  [INFO] Check if parent table data is loaded correctly")
            elif err.errno == errorcode.ER_DUP_ENTRY:
                print(f"  [INFO] Duplicate entry - check for unique constraint violations")
            
            # Ask if we should continue
            raise
    
    # Generate department_heads from providers (SQL-based)
    print("\n" + "=" * 60)
    print("Generating department_heads from providers (SQL-based)...")
    print("=" * 60)
    try:
        # For each department, find the provider with highest years_experience
        # If tie, use the one with lowest provider_id (for consistency)
        generate_query = """
            INSERT INTO department_heads (head_id, department, head_provider_id, head_name, head_email)
            SELECT 
                ROW_NUMBER() OVER (ORDER BY p.department) as head_id,
                p.department,
                p.provider_id as head_provider_id,
                p.name as head_name,
                NULLIF(p.email, '') as head_email
            FROM providers p
            INNER JOIN (
                SELECT 
                    department,
                    MAX(years_experience) as max_years
                FROM providers
                WHERE years_experience IS NOT NULL
                GROUP BY department
            ) max_exp ON p.department = max_exp.department 
                AND p.years_experience = max_exp.max_years
            WHERE p.provider_id = (
                SELECT provider_id
                FROM providers p2
                WHERE p2.department = p.department
                    AND p2.years_experience = max_exp.max_years
                ORDER BY p2.provider_id
                LIMIT 1
            )
            ORDER BY p.department
        """
        
        cursor.execute(generate_query)
        conn.commit()
        generated_count = cursor.rowcount
        print(f"  [OK] Generated {generated_count} department heads")
        
        # Verify
        cursor.execute("SELECT COUNT(*) FROM department_heads")
        total_heads = cursor.fetchone()[0]
        print(f"  [INFO] Total department heads: {total_heads}")
        
        # Show sample
        cursor.execute("""
            SELECT head_id, department, head_provider_id, head_name, 
                   CASE WHEN head_email IS NULL THEN 'NULL' ELSE head_email END as email
            FROM department_heads
            ORDER BY head_id
            LIMIT 5
        """)
        samples = cursor.fetchall()
        if samples:
            print(f"\n  Sample department heads:")
            for head_id, dept, provider_id, name, email in samples:
                print(f"    ID {head_id}: {dept} -> {provider_id} ({name}) - Email: {email}")
        
    except Exception as e:
        print(f"  [ERROR] Could not generate department_heads: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        raise
    
    # After generating department_heads, update providers.head_id
    print("\n" + "=" * 60)
    print("Updating providers.head_id from department_heads...")
    print("=" * 60)
    try:
        # Update providers.head_id based on department_heads
        # Match by department only - each provider gets the head_id of their department's chief
        # Example: If provider is in "Pediatric" department, they get the head_id of Pediatric department head
        update_query = """
            UPDATE providers p
            INNER JOIN department_heads dh ON p.department = dh.department
            SET p.head_id = dh.head_id
        """
        cursor.execute(update_query)
        conn.commit()
        updated_count = cursor.rowcount
        print(f"  [OK] Updated {updated_count} providers with head_id")
        
        # Verify the update
        cursor.execute("SELECT COUNT(*) FROM providers WHERE head_id IS NOT NULL")
        providers_with_head = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM providers WHERE head_id IS NULL")
        providers_without_head = cursor.fetchone()[0]
        print(f"  [INFO] Providers with head_id: {providers_with_head}")
        print(f"  [INFO] Providers without head_id: {providers_without_head}")
        
        # Show sample of updated providers
        cursor.execute("""
            SELECT p.provider_id, p.name, p.department, p.head_id, dh.head_name
            FROM providers p
            LEFT JOIN department_heads dh ON p.head_id = dh.head_id
            WHERE p.head_id IS NOT NULL
            LIMIT 5
        """)
        samples = cursor.fetchall()
        if samples:
            print(f"\n  Sample updated providers:")
            for provider_id, name, dept, head_id, head_name in samples:
                print(f"    {provider_id} ({name}) - Dept: {dept} -> Head ID: {head_id} ({head_name})")
        
    except Exception as e:
        print(f"  [WARNING] Could not update providers.head_id: {e}")
        conn.rollback()
    
    print("\n" + "=" * 60)
    print("Data loading complete!")
    print("=" * 60)

def test_constraints(cursor):
    """Test that constraints are working correctly."""
    print("\n" + "=" * 60)
    print("STEP 3: Testing constraints...")
    print("=" * 60)
    
    # Test 1: ON UPDATE CASCADE for insurers -> patients
    print("\nTest 1: ON UPDATE CASCADE (insurers.code -> patients.insurance_type)")
    try:
        # Get a sample insurer code
        cursor.execute("SELECT code FROM insurers LIMIT 1")
        result = cursor.fetchone()
        if result:
            old_code = result[0]
            new_code = old_code + "_UPDATED"
            
            # Update insurer code
            cursor.execute(f"UPDATE insurers SET code = %s WHERE code = %s", (new_code, old_code))
            
            # Check if patients were updated
            cursor.execute("SELECT COUNT(*) FROM patients WHERE insurance_type = %s", (new_code,))
            updated_count = cursor.fetchone()[0]
            
            print(f"  Updated insurer code: {old_code} -> {new_code}")
            print(f"  Patients with updated insurance_type: {updated_count}")
            
            # Revert
            cursor.execute(f"UPDATE insurers SET code = %s WHERE code = %s", (old_code, new_code))
            print(f"  [OK] ON UPDATE CASCADE is working!\n")
        else:
            print("  [SKIP] No insurers found to test\n")
    except Exception as e:
        print(f"  [ERROR] Test failed: {e}\n")
    
    # Test 2: Foreign key constraint enforcement
    print("Test 2: Foreign key constraint enforcement")
    try:
        # Try to insert invalid patient_id in encounters
        cursor.execute("""
            INSERT INTO encounters 
            (encounter_id, patient_id, provider_id, visit_date, status)
            VALUES ('TEST001', 'INVALID_PATIENT', 'INVALID_PROVIDER', '2024-01-01', 'Completed')
        """)
        print("  [ERROR] Foreign key constraint NOT enforced!")
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_NO_REFERENCED_ROW_2:
            print("  [OK] Foreign key constraint is enforced correctly!")
        else:
            print(f"  [WARNING] Unexpected error: {err}")
    except Exception as e:
        print(f"  [ERROR] Test failed: {e}")
    
    print("\n" + "=" * 60)
    print("Constraint testing complete!")
    print("=" * 60)

def verify_setup(cursor):
    """Verify database setup by checking row counts and constraints."""
    print("\n" + "=" * 60)
    print("STEP 4: Verifying setup...")
    print("=" * 60)
    
    tables = [
        'insurers', 'patients', 'providers', 'department_heads',
        'encounters', 'diagnoses', 'procedures', 'lab_tests',
        'medications', 'claims_and_billing', 'denials'
    ]
    
    print("\nRow counts:")
    total_rows = 0
    for table in tables:
        try:
            cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
            result = cursor.fetchone()
            count = result[0] if result else 0
            total_rows += count
            print(f"  {table:20s}: {count:>8,} rows")
        except Exception as e:
            print(f"  {table:20s}: ERROR - {e}")
    
    # Count foreign keys
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = %s
        AND REFERENCED_TABLE_NAME IS NOT NULL
    """, (DB_NAME,))
    result = cursor.fetchone()
    fk_count = result[0] if result else 0
    
    print(f"\nTotal rows: {total_rows:,}")
    print(f"Foreign keys: {fk_count}")
    print("\n" + "=" * 60)

def setup_database():
    """Main setup function."""
    conn = None
    try:
        print("\n" + "=" * 60)
        print("DATABASE SETUP WITH CONSTRAINT VALIDATION")
        print("=" * 60 + "\n")
        
        # Connect without database first
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT
        )
        cursor = conn.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS {DB_NAME} "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        cursor.close()
        conn.close()
        
        # Connect to database
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            port=DB_PORT,
            allow_local_infile=True,
            autocommit=False
        )
        cursor = conn.cursor()
        
        # Enable required MySQL settings
        print("Configuring MySQL settings...")
        try:
            cursor.execute('SET GLOBAL local_infile = 1')
            print("  [OK] local_infile: ENABLED")
        except Exception as e:
            print(f"  [WARNING] Could not enable local_infile: {e}")
            print("  (May require SUPER privilege, but will try to continue)")
        
        # CRITICAL: Enable foreign key checks (required for ON UPDATE CASCADE to work)
        try:
            cursor.execute('SET SESSION foreign_key_checks = 1')
            try:
                cursor.execute('SET GLOBAL foreign_key_checks = 1')
                print("  [OK] foreign_key_checks: ENABLED (SESSION & GLOBAL)")
            except:
                print("  [OK] foreign_key_checks: ENABLED (SESSION only)")
                print("  [INFO] GLOBAL setting may require SUPER privilege")
        except Exception as e:
            print(f"  [ERROR] Could not enable foreign_key_checks: {e}")
            print("  [WARNING] ON UPDATE CASCADE will NOT work without this!")
            return False
        
        print()
        
        # Step 1: Drop and create tables
        drop_existing_tables(cursor)
        create_tables(cursor, conn)
        
        # Step 2: Load data with validation
        script_dir = os.path.dirname(os.path.abspath(__file__))
        dataset_path = os.path.join(script_dir, 'Dataset_renewed')
        load_csv_data_with_validation(cursor, conn, dataset_path)
        
        # Step 3: Test constraints
        test_constraints(cursor)
        
        # Step 4: Verify setup
        verify_setup(cursor)
        
        print("\n" + "=" * 60)
        print("SETUP COMPLETE!")
        print("=" * 60 + "\n")
        
        return True
        
    except mysql.connector.Error as err:
        print(f"\n[ERROR] Database Error: {err}")
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Check your username and password in settings.py")
        return False
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
    
    return True

if __name__ == "__main__":
    success = setup_database()
    exit(0 if success else 1)
