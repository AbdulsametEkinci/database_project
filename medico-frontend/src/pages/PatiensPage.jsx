import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({});
  const [insurers, setInsurers] = useState([]);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    patient_id: "",
    first_name: "",
    last_name: "",
    gender: "",
    insurance_type: "",
    age_exact: "",
    city: "",
    registration_from: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("registration_date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        sort: sortBy,
        direction: sortDirection,
      };
      
      // Add filters to params
      const filterParams = {};
      if (filters.patient_id) filterParams.patient_id = filters.patient_id;
      if (filters.first_name) filterParams.first_name = filters.first_name;
      if (filters.last_name) filterParams.last_name = filters.last_name;
      if (filters.gender) filterParams.gender = filters.gender;
      if (filters.insurance_type) filterParams.insurance_type = filters.insurance_type;
      if (filters.age_exact) filterParams.age = filters.age_exact;
      if (filters.city) filterParams.city = filters.city;
      if (filters.registration_from) filterParams.registration_from = filters.registration_from;
      
      if (Object.keys(filterParams).length > 0) {
        params.filters = filterParams;
      }
      
      const response = await api.getPatients(params);
      
      // Handle both old format (array) and new format (object with data, total, etc.)
      if (Array.isArray(response)) {
        setPatients(response);
        setTotalCount(response.length);
        setTotalPages(Math.ceil(response.length / itemsPerPage));
      } else {
        setPatients(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(response.total_pages || 1);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching patients:", err);
      setError(err.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters, itemsPerPage]);

  useEffect(() => {
    fetchInsurers();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters/search/sort changes
  }, [searchTerm, filters, sortBy, sortDirection]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const fetchInsurers = async () => {
    try {
      const data = await api.getInsurers();
      setInsurers(data);
    } catch (err) {
      console.error("Error fetching insurers:", err);
    }
  };

  // Helper function to normalize date to YYYY-MM-DD format
  const normalizeDate = (dateValue) => {
    if (!dateValue) return "";
    try {
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
        return dateValue.split('T')[0].split(' ')[0];
      }
      
      if (typeof dateValue === 'string' && /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(dateValue)) {
        const separator = dateValue.includes('/') ? '/' : '-';
        const parts = dateValue.split(separator);
        
        let day, month, year;
        if (parseInt(parts[0]) > 12 && parseInt(parts[0]) <= 31) {
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
          year = parts[2];
        } else if (parseInt(parts[1]) > 12 && parseInt(parts[1]) <= 31) {
          month = parts[0].padStart(2, '0');
          day = parts[1].padStart(2, '0');
          year = parts[2];
        } else {
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
          year = parts[2];
        }
        return `${year}-${month}-${day}`;
      }
      
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error("Error normalizing date:", e);
    }
    return "";
  };

  const handleAdd = () => {
    setEditingPatient(null);
    setFormData({
      registration_date: new Date().toISOString().split('T')[0],
      dob: "",
      age: "",
    });
    setShowModal(true);
  };

  const handleEdit = (patient) => {
    setEditingPatient(patient);
    const dob = normalizeDate(patient.dob);
    setFormData({
      first_name: patient.first_name || "",
      last_name: patient.last_name || "",
      dob: dob,
      age: patient.age || "",
      gender: patient.gender || "",
      ethnicity: patient.ethnicity || "",
      insurance_type: patient.insurance_type || "",
      marital_status: patient.marital_status || "",
      address: patient.address || "",
      city: patient.city || "",
      state: patient.state || "",
      zip: patient.zip || "",
      phone: patient.phone || "",
      email: patient.email || "",
      registration_date: normalizeDate(patient.registration_date) || new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleDelete = async (patientId) => {
    if (!window.confirm("Are you sure you want to delete this patient? This will fail if the patient has encounters.")) {
      return;
    }
    try {
      await api.deletePatient(patientId);
      await fetchPatients();
    } catch (err) {
      alert(err.message || "Failed to delete patient");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      delete submitData.age;
      
      if (!submitData.first_name || !submitData.last_name || !submitData.gender) {
        alert("Please fill in all required fields: First Name, Last Name, and Gender");
        return;
      }
      if (!editingPatient && !submitData.dob) {
        alert("Please fill in Date of Birth");
        return;
      }
      if (editingPatient && !submitData.dob) {
        const originalDob = normalizeDate(editingPatient.dob);
        if (originalDob) {
          submitData.dob = originalDob;
        }
      }
      
      if (editingPatient) {
        await api.updatePatient(editingPatient.patient_id, submitData);
      } else {
        await api.createPatient(submitData);
      }
      setShowModal(false);
      await fetchPatients();
    } catch (err) {
      alert(err.message || "Failed to save patient");
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      patient_id: "",
      first_name: "",
      last_name: "",
      gender: "",
      insurance_type: "",
      age_exact: "",
      city: "",
      registration_from: "",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <SharedLayout
      title="Patients"
      subtitle="Search and manage patient profiles, demographics and contact information."
      activePage="patients"
      showSearch={false}
      showAddNew={false}
    >
      {error && (
        <div className="page-section" style={{ backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545", borderColor: "rgba(220, 53, 69, 0.3)", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* Search + Add New + Filters */}
      <div className="hp-search-new-container">
        <input
          type="text"
          placeholder="Search patients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="hp-search hp-search--inline"
        />
        <button className="hp-primary-btn" onClick={handleAdd}>
          + New Patient
        </button>
        <button
          className="hp-secondary-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          🔍 {showFilters ? "Hide Filters" : "Filters"}
        </button>
      </div>

      {/* Advanced Filters Panel - Logic from src_logic */}
      {showFilters && (
        <div
          className="page-section"
          style={{
            marginBottom: "20px",
            padding: "16px",
            background: "var(--hp-bg-soft, #334155)",
            borderRadius: "12px"
          }}
        >
          <h4 style={{ marginBottom: "12px", color: "var(--hp-text-main)" }}>🔍 Advanced Filters</h4>
          <div className="form-grid" style={{ marginBottom: "16px" }}>
            <label>
              Patient ID
              <input
                type="text"
                placeholder="e.g. PAT-001"
                value={filters.patient_id}
                onChange={(e) => handleFilterChange("patient_id", e.target.value)}
              />
            </label>
            
            <label>
              First Name
              <input
                type="text"
                placeholder="e.g. Elizabeth"
                value={filters.first_name}
                onChange={(e) => handleFilterChange("first_name", e.target.value)}
              />
            </label>

            <label>
              Last Name
              <input
                type="text"
                value={filters.last_name}
                onChange={(e) => handleFilterChange("last_name", e.target.value)}
              />
            </label>

            <label>
              Gender
              <select
                value={filters.gender}
                onChange={(e) => handleFilterChange("gender", e.target.value)}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Age
              <input
                type="number"
                placeholder="Exact age"
                value={filters.age_exact}
                onChange={(e) => handleFilterChange("age_exact", e.target.value)}
              />
            </label>

            <label>
              Insurance Provider
              <select
                value={filters.insurance_type}
                onChange={(e) => handleFilterChange("insurance_type", e.target.value)}
              >
                <option value="">All Providers</option>
                {insurers.map((insurer) => (
                  <option key={insurer.code} value={insurer.code}>
                    {insurer.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              City
              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleFilterChange("city", e.target.value)}
              />
            </label>

            <label>
              Registration From
              <input
                type="date"
                value={filters.registration_from}
                onChange={(e) => handleFilterChange("registration_from", e.target.value)}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              className="hp-secondary-btn"
              onClick={resetFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="page-grid">
        <div className="page-card">
          <h3>👤 Patient List</h3>
          <p>Browse all registered patients in the system.</p>
        </div>

        <div className="page-card">
          <h3>📊 Demographics</h3>
          <p>View distribution by age, gender, location and insurance coverage.</p>
        </div>
      </div>

      {/* Patient Table - Columns from src_logic with sorting */}
      <div className="page-section">
        <h3>Patient List ({totalCount.toLocaleString()} total)</h3>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center" }}>Loading patients...</div>
        ) : error ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#ff4444" }}>{error}</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="page-table">
                <thead>
                  <tr>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("patient_id")}>
                      ID {sortBy === "patient_id" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("first_name")}>
                      Name {sortBy === "first_name" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("age")}>
                      Age {sortBy === "age" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("gender")}>
                      Gender {sortBy === "gender" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Insurance</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("registration_date")}>
                      Registration {sortBy === "registration_date" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                        No patients found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    patients.map((patient) => (
                      <tr key={patient.patient_id}>
                        <td>
                          <span style={{
                            padding: "4px 10px",
                            backgroundColor: "rgba(148, 163, 184, 0.15)",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500"
                          }}>
                            {patient.patient_id}
                          </span>
                        </td>
                        <td style={{ fontWeight: "500" }}>
                          <Link 
                            to={`/patients/${patient.patient_id}`}
                            style={{ 
                              color: "var(--hp-accent)", 
                              textDecoration: "none",
                              fontWeight: "500"
                            }}
                          >
                            {patient.first_name} {patient.last_name}
                          </Link>
                        </td>
                        <td>{patient.age || "-"}</td>
                        <td>
                          {patient.gender === 'Male' && '♂️ '}
                          {patient.gender === 'Female' && '♀️ '}
                          {patient.gender || "-"}
                        </td>
                        <td>{patient.insurance_name || "-"}</td>
                        <td>{formatDate(patient.registration_date)}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleEdit(patient)}
                              className="hp-secondary-btn"
                              style={{ marginRight: 8 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(patient.patient_id)}
                              className="hp-danger-btn"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="page-pagination">
                <span>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()} patients
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="hp-secondary-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Prev
                  </button>
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={currentPage === pageNum ? "hp-primary-btn" : "hp-secondary-btn"}
                        style={{ minWidth: "40px" }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    className="hp-secondary-btn"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal - Logic from src_logic */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="page-section"
            style={{
              maxWidth: "700px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: "24px" }}>
              {editingPatient ? "Edit Patient" : "Add New Patient"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid" style={{ marginBottom: "24px" }}>
                <label>
                  First Name *
                  <input
                    type="text"
                    required
                    value={formData.first_name || ""}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </label>
                <label>
                  Last Name *
                  <input
                    type="text"
                    required
                    value={formData.last_name || ""}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </label>
                <label>
                  Date of Birth {!editingPatient && "*"}
                  <input
                    type="date"
                    value={formData.dob || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, dob: e.target.value });
                    }}
                  />
                </label>
                <label>
                  Age (Auto-calculated from DOB)
                  <input
                    type="text"
                    value={formData.age ? `${formData.age} years` : "Will be calculated from Date of Birth"}
                    readOnly
                    disabled
                    style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                    title="Age is automatically calculated from Date of Birth using SQL TIMESTAMPDIFF"
                  />
                </label>
                <label>
                  Gender *
                  <select
                    value={formData.gender || ""}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  Ethnicity
                  <input
                    type="text"
                    value={formData.ethnicity || ""}
                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                  />
                </label>
                <label>
                  Marital Status
                  <select
                    value={formData.marital_status || ""}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed/Divorced/Separated">Widowed/Divorced/Separated</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </label>
                <label>
                  Insurance
                  <select
                    value={formData.insurance_type || ""}
                    onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {insurers.map((insurer) => (
                      <option key={insurer.code} value={insurer.code}>
                        {insurer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  Address
                  <input
                    type="text"
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </label>
                <label>
                  City
                  <input
                    type="text"
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </label>
                <label>
                  State
                  <input
                    type="text"
                    value={formData.state || ""}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </label>
                <label>
                  ZIP Code
                  <input
                    type="text"
                    value={formData.zip || ""}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </label>
                <label>
                  Registration Date *
                  <input
                    type="date"
                    required
                    value={formData.registration_date || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="hp-secondary-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hp-primary-btn"
                >
                  {editingPatient ? "Update Patient" : "Add Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default PatientsPage;
