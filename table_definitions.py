CREATE_TABLES_SQL = [
    """
    CREATE TABLE insurers (
        insurer_id INT PRIMARY KEY auto_increment,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        payer_type VARCHAR(50) NOT NULL,
        phone VARCHAR(50) DEFAULT NULL
    );
    """,
    """
    CREATE TABLE patients (
        patient_id VARCHAR(50) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        dob DATE NOT NULL,
        age INT DEFAULT NULL,
        gender VARCHAR(50) NOT NULL,
        ethnicity VARCHAR(100) DEFAULT NULL,
        insurance_type VARCHAR(50) DEFAULT NULL,
        marital_status VARCHAR(50) DEFAULT 'unknown',
        address TEXT DEFAULT NULL,
        city VARCHAR(100) DEFAULT NULL,
        state VARCHAR(50) DEFAULT NULL,
        zip VARCHAR(20) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        email VARCHAR(255) UNIQUE DEFAULT NULL,
        registration_date DATE NOT NULL,
        FOREIGN KEY (insurance_type) REFERENCES insurers(code) ON DELETE SET NULL ON UPDATE CASCADE
    );
    """,
    """
    CREATE TABLE providers (
        provider_id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255) NOT NULL,
        specialty VARCHAR(255) NOT NULL,
        npi VARCHAR(50) UNIQUE NOT NULL,
        inhouse BOOLEAN DEFAULT 1,
        location VARCHAR(50) DEFAULT NULL,
        years_experience INT DEFAULT NULL,
        contact_info VARCHAR(50) DEFAULT NULL,
        email VARCHAR(255) UNIQUE DEFAULT NULL,
        head_id INT DEFAULT NULL
    );
    """,
    """
    CREATE TABLE department_heads (
        head_id INT PRIMARY KEY,
        department VARCHAR(255) NOT NULL,
        head_provider_id VARCHAR(50) NOT NULL,
        head_name VARCHAR(255) NOT NULL,
        head_email VARCHAR(255) UNIQUE DEFAULT NULL
    );
    """,
    """
    ALTER TABLE department_heads 
    ADD CONSTRAINT fk_department_heads_provider 
    FOREIGN KEY (head_provider_id) REFERENCES providers(provider_id) ON DELETE RESTRICT ON UPDATE CASCADE;
    """,
    """
    ALTER TABLE providers 
    ADD CONSTRAINT fk_providers_department_head 
    FOREIGN KEY (head_id) REFERENCES department_heads(head_id) ON DELETE SET NULL ON UPDATE CASCADE;
    """,
    """
    CREATE TABLE encounters (
        encounter_id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        provider_id VARCHAR(50) NOT NULL,
        visit_date DATE NOT NULL,
        visit_type VARCHAR(100) DEFAULT NULL,
        department VARCHAR(255) DEFAULT NULL,
        reason_for_visit TEXT DEFAULT NULL,
        diagnosis_code VARCHAR(50) DEFAULT NULL,
        admission_type VARCHAR(100) DEFAULT NULL,
        discharge_date DATE DEFAULT NULL,
        length_of_stay INT DEFAULT 0,
        status VARCHAR(100) NOT NULL DEFAULT 'Not Completed',
        readmitted_flag BOOLEAN DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES providers(provider_id) ON DELETE RESTRICT ON UPDATE CASCADE
    );
    """,
    """
    CREATE TABLE diagnoses (
        diagnosis_id VARCHAR(50) PRIMARY KEY,
        encounter_id VARCHAR(50) NOT NULL,
        diagnosis_code VARCHAR(50) NOT NULL,
        diagnosis_description TEXT DEFAULT NULL,
        primary_flag BOOLEAN DEFAULT 1,
        chronic_flag BOOLEAN DEFAULT NULL,
        FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE CASCADE ON UPDATE CASCADE
    );
    """,
    """
    CREATE TABLE procedures (
        procedure_id VARCHAR(50) PRIMARY KEY,
        encounter_id VARCHAR(50) NOT NULL,
        procedure_code VARCHAR(50) NOT NULL,
        procedure_description TEXT DEFAULT NULL,
        procedure_date DATE NOT NULL,
        provider_id VARCHAR(50) NOT NULL,
        procedure_cost DECIMAL(10, 2) DEFAULT 0.00,
        FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (provider_id) REFERENCES providers(provider_id) ON DELETE RESTRICT ON UPDATE CASCADE
    );
    """,
    """
    CREATE TABLE lab_tests (
        test_id VARCHAR(50) PRIMARY KEY,
        lab_id VARCHAR(50) DEFAULT NULL,
        encounter_id VARCHAR(50) NOT NULL,
        test_name VARCHAR(255) NOT NULL,
        test_code VARCHAR(50) NOT NULL,
        specimen_type VARCHAR(100) DEFAULT NULL,
        test_result VARCHAR(255) DEFAULT NULL,
        units VARCHAR(50) DEFAULT 'N/A',
        normal_range VARCHAR(100) DEFAULT 'N/A',
        test_date DATE NOT NULL,
        status VARCHAR(100) NOT NULL,
        FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE CASCADE ON UPDATE CASCADE
    );
    """,
    """
    CREATE TABLE medications (
        medication_id VARCHAR(50) PRIMARY KEY,
        encounter_id VARCHAR(50) NOT NULL,
        drug_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100) DEFAULT NULL,
        route VARCHAR(100) DEFAULT NULL,
        frequency VARCHAR(100) DEFAULT NULL,
        duration VARCHAR(100) DEFAULT NULL,
        prescribed_date DATE NOT NULL,
        prescriber_id VARCHAR(50) NOT NULL,
        cost DECIMAL(10, 2) DEFAULT 0.00,
        FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY (prescriber_id) REFERENCES providers(provider_id) ON DELETE RESTRICT ON UPDATE CASCADE
    );
    """,
    """
    CREATE TABLE claims_and_billing (
        billing_id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50) NOT NULL,
        encounter_id VARCHAR(50) NOT NULL,
        insurance_provider VARCHAR(255) DEFAULT NULL,
        payment_method VARCHAR(100) DEFAULT NULL,
        claim_id VARCHAR(50) UNIQUE DEFAULT NULL,
        claim_billing_date DATE NOT NULL,
        billed_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        paid_amount DECIMAL(10, 2) DEFAULT 0.00,
        claim_status VARCHAR(100) NOT NULL,
        denial_reason TEXT DEFAULT NULL,
        FOREIGN KEY (insurance_provider) REFERENCES insurers(code) ON DELETE SET NULL ON UPDATE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE RESTRICT ON UPDATE CASCADE
    );
    """,
    """
    CREATE TABLE denials (
        claim_id VARCHAR(50) NOT NULL,
        denial_id VARCHAR(50) PRIMARY KEY,
        denial_reason_code VARCHAR(50) NOT NULL,
        denial_reason_description TEXT DEFAULT NULL,
        denied_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        denial_date DATE NOT NULL,
        appeal_filed VARCHAR(10) DEFAULT NULL,
        appeal_status VARCHAR(100) DEFAULT NULL,
        appeal_resolution_date DATE DEFAULT NULL,
        final_outcome VARCHAR(100) DEFAULT NULL,
        FOREIGN KEY (claim_id) REFERENCES claims_and_billing(claim_id) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT chk_appeal_details CHECK (LOWER(appeal_filed) != 'yes' OR (appeal_status IS NOT NULL AND appeal_resolution_date IS NOT NULL AND final_outcome IS NOT NULL))
    );
    """
]

