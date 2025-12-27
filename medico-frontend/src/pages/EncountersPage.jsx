import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const EncountersPage = () => {
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEncounter, setEditingEncounter] = useState(null);
  const [formData, setFormData] = useState({});
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Searchable select states - these are used for SQL search on backend
  const [patientSearchTerm, setPatientSearchTerm] = useState("");
  const [providerSearchTerm, setProviderSearchTerm] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    encounter_id: "",
    patient_id: "",
    provider_id: "",
    patient_name: "",
    provider_name: "",
    department: "",
    status: "",
    visit_from: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("visit_date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  const statusOptions = ["Scheduled", "Completed", "In Progress", "Cancelled", "Discharged"];
  const visitTypeOptions = ["Emergency", "Outpatient", "Inpatient", "Surgery", "Follow-up", "Telehealth"];

  const fetchEncounters = useCallback(async () => {
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
      if (filters.encounter_id) params.filters = { ...params.filters, encounter_id: filters.encounter_id };
      if (filters.patient_id) params.filters = { ...params.filters, patient_id: filters.patient_id };
      if (filters.provider_id) params.filters = { ...params.filters, provider_id: filters.provider_id };
      if (filters.patient_name) params.filters = { ...params.filters, patient_name: filters.patient_name };
      if (filters.provider_name) params.filters = { ...params.filters, provider_name: filters.provider_name };
      if (filters.department) params.filters = { ...params.filters, department: filters.department };
      if (filters.status) params.filters = { ...params.filters, status: filters.status };
      if (filters.visit_from) params.filters = { ...params.filters, visit_from: filters.visit_from };
      
      const response = await api.getEncounters(params);
      
      // Handle both old format (array) and new format (object with data, total, etc.)
      if (Array.isArray(response)) {
        setEncounters(response);
        setTotalCount(response.length);
        setTotalPages(Math.ceil(response.length / itemsPerPage));
      } else {
        setEncounters(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(response.total_pages || 1);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching encounters:", err);
      setError(err.message || "Failed to load encounters");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters, itemsPerPage]);

  const fetchOptions = async () => {
    try {
      const [patientsData, providersData, departmentsData] = await Promise.all([
        api.getPatientsOptions("", 100), // Initial load - get first 100
        api.getProvidersOptions("", 100),
        api.getDepartmentsOptions(),
      ]);
      setPatients(patientsData || []);
      setProviders(providersData || []);
      // Backend returns array of strings, ensure it's an array
      const deptArray = Array.isArray(departmentsData) ? departmentsData : [];
      setDepartments(deptArray);
      setFilteredPatients(patientsData || []);
      setFilteredProviders(providersData || []);
    } catch (err) {
      console.error("Error fetching options:", err);
      // Set empty arrays on error
      setDepartments([]);
    }
  };

  // Search patients using SQL on backend
  const searchPatients = useCallback(async (searchTerm) => {
    try {
      const results = await api.getPatientsOptions(searchTerm, 50);
      setFilteredPatients(results || []);
    } catch (err) {
      console.error("Error searching patients:", err);
      setFilteredPatients([]);
    }
  }, []);

  // Search providers using SQL on backend
  const searchProviders = useCallback(async (searchTerm) => {
    try {
      const results = await api.getProvidersOptions(searchTerm, 50);
      setFilteredProviders(results || []);
    } catch (err) {
      console.error("Error searching providers:", err);
      setFilteredProviders([]);
    }
  }, []);

  // Debounce search with useEffect - exactly like src_logic
  useEffect(() => {
    if (!showPatientDropdown) return;
    
    const timeoutId = setTimeout(() => {
      if (patientSearchTerm.trim() === "") {
        // If search is empty, show all patients from initial load
        setFilteredPatients(patients);
      } else {
        // Otherwise, search on backend
        searchPatients(patientSearchTerm);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [patientSearchTerm, showPatientDropdown, searchPatients, patients]);

  useEffect(() => {
    if (!showProviderDropdown) return;
    
    const timeoutId = setTimeout(() => {
      if (providerSearchTerm.trim() === "") {
        // If search is empty, show all providers from initial load
        setFilteredProviders(providers);
      } else {
        // Otherwise, search on backend
        searchProviders(providerSearchTerm);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [providerSearchTerm, showProviderDropdown, searchProviders, providers]);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters/search/sort changes
  }, [searchTerm, filters, sortBy, sortDirection]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

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
    setEditingEncounter(null);
    setFormData({
      visit_date: new Date().toISOString().split('T')[0],
      status: "Scheduled",
      visit_type: "",
      readmitted_flag: false,
    });
    setPatientSearchTerm("");
    setProviderSearchTerm("");
    setShowPatientDropdown(false);
    setShowProviderDropdown(false);
    // Reset filtered lists to show all options when modal opens
    setFilteredPatients(patients);
    setFilteredProviders(providers);
    setShowModal(true);
  };

  const handleEdit = (encounter) => {
    setEditingEncounter(encounter);
    const normalizedVisitDate = normalizeDate(encounter.visit_date);
    setFormData({
      patient_id: encounter.patient_id || "",
      provider_id: encounter.provider_id || "",
      visit_date: normalizedVisitDate || new Date().toISOString().split('T')[0],
      visit_type: encounter.visit_type || "",
      department: encounter.department || "",
      reason_for_visit: encounter.reason_for_visit || "",
      diagnosis_code: encounter.diagnosis_code || "",
      admission_type: encounter.admission_type || "",
      discharge_date: normalizeDate(encounter.discharge_date),
      length_of_stay: encounter.length_of_stay || 0,
      status: encounter.status || "Scheduled",
      readmitted_flag: encounter.readmitted_flag || false,
    });
    // Set search terms based on selected patient/provider
    const selectedPatient = patients.find(p => p.patient_id === encounter.patient_id);
    const selectedProvider = providers.find(p => p.provider_id === encounter.provider_id);
    setPatientSearchTerm(selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : "");
    setProviderSearchTerm(selectedProvider ? selectedProvider.name : "");
    setShowPatientDropdown(false);
    setShowProviderDropdown(false);
    setShowModal(true);
  };

  const handleDelete = async (encounterId) => {
    if (!window.confirm("Are you sure you want to delete this encounter? This will fail if the encounter has linked billing records.")) {
      return;
    }
    try {
      await api.deleteEncounter(encounterId);
      await fetchEncounters();
    } catch (err) {
      alert(err.message || "Failed to delete encounter");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (!submitData.discharge_date) submitData.discharge_date = null;
      
      // Remove diagnosis_code from submit data - it can only be changed in Diagnoses page
      delete submitData.diagnosis_code;
      
      // When editing, if visit_date is not provided, keep the original value
      if (editingEncounter && !submitData.visit_date) {
        const originalVisitDate = normalizeDate(editingEncounter.visit_date);
        if (originalVisitDate) {
          submitData.visit_date = originalVisitDate;
        }
      }
      
      if (editingEncounter) {
        await api.updateEncounter(editingEncounter.encounter_id, submitData);
      } else {
        await api.createEncounter(submitData);
      }
      setShowModal(false);
      await fetchEncounters();
    } catch (err) {
      alert(err.message || "Failed to save encounter");
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

  const handleProviderChange = (providerId) => {
    const provider = providers.find(p => p.provider_id === providerId);
    setFormData({
      ...formData,
      provider_id: providerId,
      department: provider?.department || formData.department,
    });
  };

  const resetFilters = () => {
    setFilters({
      encounter_id: "",
      patient_id: "",
      provider_id: "",
      patient_name: "",
      provider_name: "",
      department: "",
      status: "",
      visit_from: "",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <SharedLayout
      title="Encounters"
      subtitle="Track visits, admission details, diagnoses and overall patient journey."
      activePage="encounters"
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
          placeholder="Search encounters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="hp-search hp-search--inline"
        />
        <button className="hp-primary-btn" onClick={handleAdd}>
          + New Encounter
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
              Encounter ID
              <input
                type="text"
                placeholder="e.g. ENC-001"
                value={filters.encounter_id}
                onChange={(e) => handleFilterChange("encounter_id", e.target.value)}
              />
            </label>
            
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
              Provider ID
              <input
                type="text"
                placeholder="e.g. PROV-001"
                value={filters.provider_id}
                onChange={(e) => handleFilterChange("provider_id", e.target.value)}
              />
            </label>

            <label>
              Patient Name
              <input
                type="text"
                placeholder="Name or Surname"
                value={filters.patient_name}
                onChange={(e) => handleFilterChange("patient_name", e.target.value)}
              />
            </label>

            <label>
              Provider Name
              <input
                type="text"
                placeholder="Dr. Name"
                value={filters.provider_name}
                onChange={(e) => handleFilterChange("provider_name", e.target.value)}
              />
            </label>

            <label>
              Department
              <input
                type="text"
                placeholder="Department name"
                value={filters.department}
                onChange={(e) => handleFilterChange("department", e.target.value)}
              />
            </label>

            <label>
              Status
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option value="">All Statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Visit Date From
              <input
                type="date"
                value={filters.visit_from}
                onChange={(e) => handleFilterChange("visit_from", e.target.value)}
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
          <h3>📋 Active Encounters</h3>
          <p>View all ongoing patient visits and admissions.</p>
        </div>

        <div className="page-card">
          <h3>🕒 Encounter History</h3>
          <p>Search past visits, diagnoses and outcomes by date or provider.</p>
        </div>
      </div>

      {/* Encounter Table */}
      <div className="page-section">
        <h3>Encounter List ({totalCount.toLocaleString()} total)</h3>
        {loading ? (
          <div style={{ padding: "20px", textAlign: "center" }}>Loading encounters...</div>
        ) : error ? (
          <div style={{ padding: "20px", textAlign: "center", color: "#ff4444" }}>{error}</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="page-table">
              <thead>
                <tr>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("encounter_id")}>
                    ID {sortBy === "encounter_id" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("visit_date")}>
                    Date {sortBy === "visit_date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("patient_id")}>
                    Patient {sortBy === "patient_id" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("provider_id")}>
                    Provider {sortBy === "provider_id" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Department</th>
                  <th>Type</th>
                  <th style={{ cursor: "pointer" }} onClick={() => handleSort("status")}>
                    Status {sortBy === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {encounters.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
                      No encounters found matching your filters.
                    </td>
                  </tr>
                ) : (
                  encounters.map((encounter) => (
                    <tr key={encounter.encounter_id}>
                      <td>
                        <Link 
                          to={`/encounters/${encounter.encounter_id}`}
                          style={{ 
                            color: "var(--hp-accent)", 
                            textDecoration: "none",
                            fontWeight: "500"
                          }}
                        >
                          {encounter.encounter_id}
                        </Link>
                      </td>
                      <td>{formatDate(encounter.visit_date)}</td>
                      <td>
                        <div style={{ fontWeight: "500", color: "var(--hp-text-main)" }}>
                          {encounter.patient_first_name || ''} {encounter.patient_last_name || ''}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--hp-text-soft)", marginTop: "2px" }}>
                          {encounter.patient_id || '-'}
                        </div>
                      </td>
                      <td>{encounter.provider_name || encounter.provider_id || "-"}</td>
                      <td>{encounter.department || "-"}</td>
                      <td>{encounter.visit_type || "-"}</td>
                      <td>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "500",
                          backgroundColor:
                            encounter.status === "Completed"
                              ? "rgba(34, 197, 94, 0.2)"
                              : encounter.status === "Cancelled"
                              ? "rgba(220, 53, 69, 0.2)"
                              : encounter.status === "In Progress"
                              ? "rgba(59, 130, 246, 0.2)"
                              : "rgba(251, 191, 36, 0.2)",
                          color:
                            encounter.status === "Completed"
                              ? "#22c55e"
                              : encounter.status === "Cancelled"
                              ? "#dc3545"
                              : encounter.status === "In Progress"
                              ? "#3b82f6"
                              : "#fbbf24",
                        }}>
                          {encounter.status || "-"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => handleEdit(encounter)}
                            className="hp-primary-btn"
                            style={{ padding: "6px 12px", fontSize: "13px" }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(encounter.encounter_id)}
                            className="hp-danger-btn"
                            style={{ padding: "6px 12px", fontSize: "13px" }}
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
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  ← Previous
                </button>
                <span>
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount.toLocaleString()}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
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
              maxWidth: "900px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: "24px" }}>
              {editingEncounter ? "Edit Encounter" : "Add New Encounter"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <h5 style={{ color: "var(--hp-primary)", marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
                  1. Patient & Provider
                </h5>
                <div className="form-grid">
                  {/* Searchable Patient Select */}
                  <div style={{ position: "relative", gridColumn: "1 / -1" }}>
                    <label>
                      Select Patient *
                    </label>
                    <div style={{ position: "relative" }}>
                      {editingEncounter ? (
                        <input
                          type="text"
                          value={formData.patient_id || ""}
                          readOnly
                          className="hp-search"
                          style={{ width: "100%", opacity: 0.7, cursor: "not-allowed", padding: "10px" }}
                        />
                      ) : (
                        <>
                          <input
                            type="text"
                            required
                            value={
                              formData.patient_id
                                ? (filteredPatients.find(p => p.patient_id === formData.patient_id) || patients.find(p => p.patient_id === formData.patient_id))
                                  ? `${(filteredPatients.find(p => p.patient_id === formData.patient_id) || patients.find(p => p.patient_id === formData.patient_id)).first_name} ${(filteredPatients.find(p => p.patient_id === formData.patient_id) || patients.find(p => p.patient_id === formData.patient_id)).last_name} (ID: ${formData.patient_id})`
                                  : patientSearchTerm
                                : patientSearchTerm
                            }
                            onChange={(e) => {
                              setPatientSearchTerm(e.target.value);
                              setShowPatientDropdown(true);
                              if (!e.target.value) {
                                setFormData({ ...formData, patient_id: "" });
                                setFilteredPatients(patients); // Reset to all patients when search is cleared
                              }
                            }}
                            onFocus={() => {
                              setShowPatientDropdown(true);
                              // Load initial patients if not already loaded
                              if (filteredPatients.length === 0 && !patientSearchTerm) {
                                setFilteredPatients(patients);
                              }
                            }}
                            onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                            placeholder="Search patient by name or ID..."
                            className="hp-search"
                            style={{ width: "100%", padding: "10px" }}
                          />
                          {showPatientDropdown && (
                            <div
                              style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                zIndex: 1000,
                                backgroundColor: "var(--hp-bg-card)",
                                border: "1px solid var(--hp-border)",
                                borderRadius: "8px",
                                marginTop: "4px",
                                maxHeight: "250px",
                                overflowY: "auto",
                                boxShadow: "var(--hp-shadow-soft)"
                              }}
                            >
                              {filteredPatients.map((patient) => (
                                <div
                                  key={patient.patient_id}
                                  onClick={() => {
                                    setFormData({ ...formData, patient_id: patient.patient_id });
                                    setPatientSearchTerm(`${patient.first_name} ${patient.last_name} (ID: ${patient.patient_id})`);
                                    setShowPatientDropdown(false);
                                  }}
                                  style={{
                                    padding: "10px 14px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid var(--hp-border)",
                                    backgroundColor: formData.patient_id === patient.patient_id ? "rgba(34, 197, 94, 0.1)" : "transparent",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (formData.patient_id !== patient.patient_id) {
                                      e.currentTarget.style.backgroundColor = "rgba(148, 163, 184, 0.1)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (formData.patient_id !== patient.patient_id) {
                                      e.currentTarget.style.backgroundColor = "transparent";
                                    }
                                  }}
                                >
                                  <div style={{ fontWeight: "500", color: "var(--hp-text-main)", fontSize: "14px" }}>
                                    {patient.first_name} {patient.last_name}
                                  </div>
                                  <div style={{ fontSize: "12px", color: "var(--hp-text-soft)", marginTop: "2px" }}>
                                    ID: {patient.patient_id} • Age: {patient.age}yo
                                  </div>
                                </div>
                              ))}
                              {filteredPatients.length === 0 && patientSearchTerm && (
                                <div style={{ padding: "14px", textAlign: "center", color: "var(--hp-text-soft)", fontSize: "13px" }}>
                                  No patients found
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Searchable Provider Select */}
                  <div style={{ position: "relative", gridColumn: "1 / -1" }}>
                    <label>
                      Select Provider *
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        required
                        value={
                          formData.provider_id
                            ? (filteredProviders.find(p => p.provider_id === formData.provider_id) || providers.find(p => p.provider_id === formData.provider_id))
                              ? `${(filteredProviders.find(p => p.provider_id === formData.provider_id) || providers.find(p => p.provider_id === formData.provider_id)).name}${(filteredProviders.find(p => p.provider_id === formData.provider_id) || providers.find(p => p.provider_id === formData.provider_id)).specialty ? ` (${(filteredProviders.find(p => p.provider_id === formData.provider_id) || providers.find(p => p.provider_id === formData.provider_id)).specialty})` : ''}`
                              : providerSearchTerm
                            : providerSearchTerm
                        }
                        onChange={(e) => {
                          setProviderSearchTerm(e.target.value);
                          setShowProviderDropdown(true);
                          if (!e.target.value) {
                            setFormData({ ...formData, provider_id: "" });
                            setFilteredProviders(providers); // Reset to all providers when search is cleared
                          }
                        }}
                        onFocus={() => {
                          setShowProviderDropdown(true);
                          // Load initial providers if not already loaded
                          if (filteredProviders.length === 0 && !providerSearchTerm) {
                            setFilteredProviders(providers);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowProviderDropdown(false), 200)}
                        placeholder="Search provider by name or specialty..."
                        className="hp-search"
                        style={{ width: "100%", padding: "10px" }}
                      />
                      {showProviderDropdown && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            backgroundColor: "var(--hp-bg-card)",
                            border: "1px solid var(--hp-border)",
                            borderRadius: "8px",
                            marginTop: "4px",
                            maxHeight: "250px",
                            overflowY: "auto",
                            boxShadow: "var(--hp-shadow-soft)"
                          }}
                        >
                          {filteredProviders.map((provider) => (
                            <div
                              key={provider.provider_id}
                              onClick={() => {
                                handleProviderChange(provider.provider_id);
                                setProviderSearchTerm(`${provider.name}${provider.specialty ? ` (${provider.specialty})` : ''}`);
                                setShowProviderDropdown(false);
                              }}
                              style={{
                                padding: "10px 14px",
                                cursor: "pointer",
                                borderBottom: "1px solid var(--hp-border)",
                                backgroundColor: formData.provider_id === provider.provider_id ? "rgba(34, 197, 94, 0.1)" : "transparent",
                              }}
                              onMouseEnter={(e) => {
                                if (formData.provider_id !== provider.provider_id) {
                                  e.currentTarget.style.backgroundColor = "rgba(148, 163, 184, 0.1)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (formData.provider_id !== provider.provider_id) {
                                  e.currentTarget.style.backgroundColor = "transparent";
                                }
                              }}
                            >
                              <div style={{ fontWeight: "500", color: "var(--hp-text-main)", fontSize: "14px" }}>
                                {provider.name}
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--hp-text-soft)", marginTop: "2px" }}>
                                {provider.specialty || "No specialty"} • ID: {provider.provider_id}
                              </div>
                            </div>
                          ))}
                          {filteredProviders.length === 0 && providerSearchTerm && (
                            <div style={{ padding: "14px", textAlign: "center", color: "var(--hp-text-soft)", fontSize: "13px" }}>
                              No providers found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h5 style={{ color: "var(--hp-primary)", marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
                  2. Visit Details
                </h5>
                <div className="form-grid">
                  <label>
                    Visit Date {!editingEncounter && "*"}
                    <input
                      type="date"
                      value={formData.visit_date || ""}
                      onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                    />
                  </label>
                  <label>
                    Visit Type
                    <select
                      value={formData.visit_type || ""}
                      onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {visitTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Department (Auto)
                    <input
                      type="text"
                      value={formData.department || ""}
                      readOnly
                      placeholder="Auto-filled"
                      style={{ opacity: 0.7, cursor: "not-allowed" }}
                    />
                  </label>
                  <label style={{ gridColumn: "1 / -1" }}>
                    Reason for Visit
                    <textarea
                      value={formData.reason_for_visit || ""}
                      onChange={(e) => setFormData({ ...formData, reason_for_visit: e.target.value })}
                      rows={3}
                      placeholder="e.g. Chest pain, Follow-up..."
                    />
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <h5 style={{ color: "var(--hp-primary)", marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
                  3. Clinical & Status
                </h5>
                <div className="form-grid">
                  <label>
                    Diagnosis Code (ICD)
                    <input
                      type="text"
                      value={formData.diagnosis_code || ""}
                      readOnly
                      disabled
                      placeholder="Edit in Diagnoses page"
                      style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                      title="Diagnosis code can only be changed in the Diagnoses page"
                    />
                  </label>
                  <label>
                    Status *
                    <select
                      required
                      value={formData.status || "Scheduled"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Admission Type
                    <select
                      value={formData.admission_type || ""}
                      onChange={(e) => setFormData({ ...formData, admission_type: e.target.value })}
                    >
                      <option value="">None</option>
                      <option value="Elective">Elective</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </label>
                  <label>
                    Discharge Date
                    <input
                      type="date"
                      value={formData.discharge_date || ""}
                      onChange={(e) => setFormData({ ...formData, discharge_date: e.target.value })}
                    />
                  </label>
                  <label>
                    Length of Stay (Days)
                    <input
                      type="number"
                      min="0"
                      value={formData.length_of_stay || 0}
                      onChange={(e) => setFormData({ ...formData, length_of_stay: parseInt(e.target.value) || 0 })}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.readmitted_flag || false}
                      onChange={(e) => setFormData({ ...formData, readmitted_flag: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    Patient Readmitted?
                  </label>
                </div>
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
                  {editingEncounter ? "Update Encounter" : "Save Encounter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default EncountersPage;
