import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const DiagnosesPage = () => {
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDiagnosis, setEditingDiagnosis] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    diagnosis_id: "",
    encounter_id: "",
    diagnosis_code: "",
    primary_flag: "",
    chronic_flag: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("diagnosis_id");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Encounter and diagnosis code options for searchable selects
  const [encounterOptions, setEncounterOptions] = useState([]);
  const [encounterSearchTerm, setEncounterSearchTerm] = useState("");
  const [showEncounterDropdown, setShowEncounterDropdown] = useState(false);
  const [diagnosisCodeOptions, setDiagnosisCodeOptions] = useState([]);
  const [showDiagnosisCodeDropdown, setShowDiagnosisCodeDropdown] = useState(false);
  const [diagnosisCodeSearchTerm, setDiagnosisCodeSearchTerm] = useState("");

  const fetchDiagnoses = useCallback(async () => {
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
      const activeFilters = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          activeFilters[key] = value;
        }
      });
      if (Object.keys(activeFilters).length > 0) {
        params.filters = activeFilters;
      }
      
      const response = await api.getDiagnosesList(params);
      
      setDiagnoses(response.data || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching diagnoses:", err);
      setError(err.message || "Failed to load diagnoses");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters.diagnosis_id, filters.encounter_id, filters.diagnosis_code, filters.primary_flag, filters.chronic_flag]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortDirection, filters.diagnosis_id, filters.encounter_id, filters.diagnosis_code, filters.primary_flag, filters.chronic_flag]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchDiagnoses();
  }, [fetchDiagnoses]);

  // Fetch encounter options (only available encounters when adding new diagnosis)
  const fetchEncounterOptions = useCallback(async (search = "") => {
    try {
      const isAdding = editingDiagnosis === null;
      // When adding, only show encounters without diagnosis (availableOnly=true)
      // When editing, show all encounters (but encounter_id will be readonly anyway)
      const options = await api.getDiagnosesEncounterOptions(search, 50, isAdding);
      setEncounterOptions(options);
    } catch (err) {
      console.error("Error fetching encounters:", err);
    }
  }, [editingDiagnosis]);

  // Fetch diagnosis codes
  const fetchDiagnosisCodes = useCallback(async () => {
    try {
      const codes = await api.getDiagnosisCodes();
      setDiagnosisCodeOptions(codes);
    } catch (err) {
      console.error("Error fetching diagnosis codes:", err);
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchDiagnosisCodes();
    }
  }, [showModal, fetchDiagnosisCodes]);

  // Debounce encounter search
  useEffect(() => {
    if (showModal && showEncounterDropdown) {
      const timer = setTimeout(() => {
        if (encounterSearchTerm === "") {
          if (encounterOptions.length > 0) {
            return;
          }
        }
        fetchEncounterOptions(encounterSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showModal, showEncounterDropdown, encounterSearchTerm, fetchEncounterOptions, encounterOptions.length]);

  const handleAdd = () => {
    setEditingDiagnosis(null);
    setFormData({
      diagnosis_id: "", // Will be auto-generated from encounter_id
      encounter_id: "",
      diagnosis_code: "",
      diagnosis_description: "",
      primary_flag: "1",
      chronic_flag: "",
    });
    setEncounterSearchTerm("");
    setDiagnosisCodeSearchTerm("");
    setShowEncounterDropdown(false);
    setShowDiagnosisCodeDropdown(false);
    setShowModal(true);
    // Fetch available encounters (without diagnosis)
    fetchEncounterOptions("");
  };

  const handleEdit = (diagnosis) => {
    setEditingDiagnosis(diagnosis);
    setFormData({
      encounter_id: diagnosis.encounter_id || "",
      diagnosis_code: diagnosis.diagnosis_code || "",
      diagnosis_description: diagnosis.diagnosis_description || "",
      primary_flag: diagnosis.primary_flag ? "1" : "0",
      chronic_flag: diagnosis.chronic_flag !== null ? (diagnosis.chronic_flag ? "1" : "0") : "",
    });
    setEncounterSearchTerm(diagnosis.encounter_id || "");
    setDiagnosisCodeSearchTerm(diagnosis.diagnosis_code || "");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      submitData.primary_flag = submitData.primary_flag === "1";
      submitData.chronic_flag = submitData.chronic_flag === "" ? null : (submitData.chronic_flag === "1");

      // For new diagnosis, ensure diagnosis_id is set based on encounter_id
      if (!editingDiagnosis && submitData.encounter_id && !submitData.diagnosis_id) {
        // Generate diagnosis_id from encounter_id (ENC000001 -> DIA000001)
        const encounterId = submitData.encounter_id;
        if (encounterId && encounterId.startsWith("ENC")) {
          const numericPart = encounterId.substring(3); // "000001"
          submitData.diagnosis_id = `DIA${numericPart}`; // "DIA000001"
        }
      }

      if (editingDiagnosis) {
        await api.updateDiagnosis(editingDiagnosis.diagnosis_id, submitData);
      } else {
        await api.createDiagnosis(submitData);
      }
      setShowModal(false);
      fetchDiagnoses();
    } catch (err) {
      alert(err.message || "Failed to save diagnosis");
    }
  };

  const handleDelete = async (diagnosis_id) => {
    if (!window.confirm("Are you sure you want to delete this diagnosis?")) {
      return;
    }
    try {
      await api.deleteDiagnosis(diagnosis_id);
      fetchDiagnoses();
    } catch (err) {
      alert(err.message || "Failed to delete diagnosis");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      diagnosis_id: "",
      encounter_id: "",
      diagnosis_code: "",
      primary_flag: "",
      chronic_flag: "",
    });
    setSearchTerm("");
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const hasFilters = Object.values(filters).some(v => v !== "" && v !== null) || searchTerm;

  return (
    <SharedLayout
      title="Diagnoses"
      subtitle="View and manage patient diagnoses linked to encounters."
      activePage="diagnoses"
      showSearch={false}
      showAddNew={false}
    >
      {/* Search Bar and Add Button */}
      <div className="hp-search-new-container" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
        <input
          className="hp-search hp-search--big"
          placeholder="Search diagnoses by ID, diagnosis code, encounter ID, or patient name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1", maxWidth: "500px" }}
        />
        <button className="hp-primary-btn" onClick={handleAdd}>
          + New Diagnosis
        </button>
        <button className="hp-secondary-btn" onClick={() => setShowFilters(!showFilters)}>
          🔍 {showFilters ? "Hide Filters" : "Filters"}
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="page-section" style={{ marginBottom: "20px" }}>
          <h4 style={{ marginBottom: "16px", color: "var(--hp-primary)", fontWeight: "600" }}>
            🔍 Advanced Search & Filter {hasFilters && <span style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>(Active)</span>}
          </h4>
          <div className="form-grid">
            <label>
              Diagnosis ID
              <input
                type="text"
                placeholder="e.g. DIAG000001"
                value={filters.diagnosis_id}
                onChange={(e) => handleFilterChange("diagnosis_id", e.target.value)}
              />
            </label>

            <label>
              Encounter ID
              <input
                type="text"
                placeholder="e.g. ENC000001"
                value={filters.encounter_id}
                onChange={(e) => handleFilterChange("encounter_id", e.target.value)}
              />
            </label>

            <label>
              Diagnosis Code
              <input
                type="text"
                placeholder="e.g. I10"
                value={filters.diagnosis_code}
                onChange={(e) => handleFilterChange("diagnosis_code", e.target.value)}
              />
            </label>

            <label>
              Primary Flag
              <select
                value={filters.primary_flag}
                onChange={(e) => handleFilterChange("primary_flag", e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>

            <label>
              Chronic Flag
              <select
                value={filters.chronic_flag}
                onChange={(e) => handleFilterChange("chronic_flag", e.target.value)}
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
            <button className="hp-secondary-btn" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="page-grid">
        <div className="page-card">
          <h3>🏥 Diagnosis List</h3>
          <p>Browse all patient diagnoses linked to encounters.</p>
        </div>

        <div className="page-card">
          <h3>➕ Add Diagnosis</h3>
          <p>Create a new diagnosis entry for an encounter.</p>
        </div>

        <div className="page-card">
          <h3>📊 Diagnosis Analytics</h3>
          <p>Analyze diagnosis patterns and frequency.</p>
        </div>
      </div>

      {/* Table */}
      <div className="page-section">
        <h3>Recent Diagnoses ({totalCount.toLocaleString()} total)</h3>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--hp-text-soft)' }}>Loading diagnoses...</div>
        ) : error ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>{error}</div>
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("diagnosis_id")} style={{ cursor: "pointer" }}>
                  Diagnosis ID {sortBy === "diagnosis_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("encounter_id")} style={{ cursor: "pointer" }}>
                  Encounter {sortBy === "encounter_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Patient</th>
                <th onClick={() => handleSort("diagnosis_code")} style={{ cursor: "pointer" }}>
                  Diagnosis Code {sortBy === "diagnosis_code" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("primary_flag")} style={{ cursor: "pointer" }}>
                  Primary {sortBy === "primary_flag" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {diagnoses.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                    No diagnoses found
                  </td>
                </tr>
              ) : (
                diagnoses.map((diagnosis) => (
                  <tr key={diagnosis.diagnosis_id}>
                    <td>
                      <Link to={`/diagnoses/${diagnosis.diagnosis_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                        {diagnosis.diagnosis_id}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/encounters/${diagnosis.encounter_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                        {diagnosis.encounter_id}
                      </Link>
                    </td>
                    <td>
                      {diagnosis.patient_id ? (
                        <Link to={`/patients/${diagnosis.patient_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                          {diagnosis.first_name} {diagnosis.last_name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{diagnosis.diagnosis_code}</td>
                    <td style={{ textAlign: "center" }}>{diagnosis.primary_flag ? "Yes" : "No"}</td>
                    <td>
                      <button className="hp-secondary-btn" onClick={() => handleEdit(diagnosis)} style={{ marginRight: "8px" }}>
                        Edit
                      </button>
                      <button className="hp-danger-btn" onClick={() => handleDelete(diagnosis.diagnosis_id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="page-pagination">
            <button
              className="hp-secondary-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 10) {
                pageNum = i + 1;
              } else if (currentPage <= 5) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 4) {
                pageNum = totalPages - 9 + i;
              } else {
                pageNum = currentPage - 5 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={currentPage === pageNum ? "hp-primary-btn" : "hp-secondary-btn"}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{ minWidth: "40px" }}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="hp-secondary-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
            <span style={{ marginLeft: "16px", color: "var(--hp-text-soft)", fontSize: "14px" }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
            </span>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="page-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="page-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingDiagnosis ? "Edit Diagnosis" : "Add New Diagnosis"}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Encounter ID {!editingDiagnosis && <span style={{ color: "#dc3545" }}>*</span>}
                {editingDiagnosis ? (
                  <input
                    type="text"
                    value={formData.encounter_id || ""}
                    readOnly
                    style={{ opacity: 0.7, cursor: "not-allowed" }}
                  />
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search and select encounter (only encounters without diagnosis)..."
                      value={encounterSearchTerm}
                      onChange={(e) => {
                        setEncounterSearchTerm(e.target.value);
                        setShowEncounterDropdown(true);
                      }}
                      onFocus={() => {
                        setShowEncounterDropdown(true);
                        if (encounterSearchTerm === "" && encounterOptions.length === 0) {
                          fetchEncounterOptions("");
                        }
                      }}
                      required
                    />
                    {showEncounterDropdown && encounterOptions.length > 0 && (
                      <div className="page-dropdown">
                        {encounterOptions.map((encounter) => (
                          <div
                            key={encounter.encounter_id}
                            className="page-dropdown-item"
                            onClick={() => {
                              // Generate diagnosis_id from encounter_id (ENC000001 -> DIA000001)
                              const encounterId = encounter.encounter_id;
                              let diagnosisId = "";
                              if (encounterId && encounterId.startsWith("ENC")) {
                                // Extract numeric part from ENC000001
                                const numericPart = encounterId.substring(3); // "000001"
                                diagnosisId = `DIA${numericPart}`; // "DIA000001"
                              }
                              
                              const newFormData = { 
                                ...formData, 
                                encounter_id: encounter.encounter_id,
                                diagnosis_id: diagnosisId // Set diagnosis_id based on encounter_id
                              };
                              
                              // If encounter has a diagnosis code, pre-fill it
                              if (encounter.diagnosis_code) {
                                newFormData.diagnosis_code = encounter.diagnosis_code;
                                setDiagnosisCodeSearchTerm(encounter.diagnosis_code);
                                // Try to find description
                                const codeOption = diagnosisCodeOptions.find(c => c.diagnosis_code === encounter.diagnosis_code);
                                if (codeOption && codeOption.diagnosis_description) {
                                  newFormData.diagnosis_description = codeOption.diagnosis_description;
                                }
                              }
                              setFormData(newFormData);
                              setEncounterSearchTerm(`${encounter.encounter_id} - ${encounter.patient_first_name || ""} ${encounter.patient_last_name || ""}`);
                              setShowEncounterDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>{encounter.encounter_id}</div>
                            <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                              {encounter.patient_first_name} {encounter.patient_last_name} - {encounter.visit_date ? new Date(encounter.visit_date).toLocaleDateString() : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </label>

              <label>
                Diagnosis Code {!editingDiagnosis && <span style={{ color: "#dc3545" }}>*</span>}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={diagnosisCodeSearchTerm}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setDiagnosisCodeSearchTerm(newCode);
                      // Find matching code and update description
                      const matchingCode = diagnosisCodeOptions.find(
                        code => code.diagnosis_code.toLowerCase() === newCode.toLowerCase()
                      );
                      setFormData({ 
                        ...formData, 
                        diagnosis_code: newCode,
                        diagnosis_description: matchingCode ? matchingCode.diagnosis_description || "" : formData.diagnosis_description
                      });
                      setShowDiagnosisCodeDropdown(true);
                    }}
                    onFocus={() => setShowDiagnosisCodeDropdown(true)}
                    required
                    placeholder="Select or type diagnosis code..."
                  />
                  {showDiagnosisCodeDropdown && diagnosisCodeOptions.length > 0 && (
                    <div className="page-dropdown">
                      {diagnosisCodeOptions
                        .filter(code => 
                          !diagnosisCodeSearchTerm || 
                          code.diagnosis_code.toLowerCase().includes(diagnosisCodeSearchTerm.toLowerCase()) ||
                          (code.diagnosis_description && code.diagnosis_description.toLowerCase().includes(diagnosisCodeSearchTerm.toLowerCase()))
                        )
                        .map((code) => (
                          <div
                            key={code.diagnosis_code}
                            className="page-dropdown-item"
                            onClick={() => {
                              setFormData({ 
                                ...formData, 
                                diagnosis_code: code.diagnosis_code,
                                diagnosis_description: code.diagnosis_description || "" // Set description from code, make it immutable
                              });
                              setDiagnosisCodeSearchTerm(code.diagnosis_code);
                              setShowDiagnosisCodeDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>{code.diagnosis_code}</div>
                            {code.diagnosis_description && (
                              <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                                {code.diagnosis_description}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Diagnosis Description
                <textarea
                  value={formData.diagnosis_description || ""}
                  readOnly
                  disabled
                  placeholder="Description is set automatically based on diagnosis code"
                  rows="3"
                  style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                  title="Description is automatically set based on the selected diagnosis code"
                />
              </label>

              <label>
                Primary Flag
                <select
                  value={formData.primary_flag}
                  onChange={(e) => setFormData({ ...formData, primary_flag: e.target.value })}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>

              <label>
                Chronic Flag
                <select
                  value={formData.chronic_flag}
                  onChange={(e) => setFormData({ ...formData, chronic_flag: e.target.value })}
                >
                  <option value="">Not Specified</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>

              <div className="form-actions">
                <button type="button" className="hp-secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="hp-primary-btn">
                  {editingDiagnosis ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default DiagnosesPage;
