import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const ProceduresPage = () => {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    procedure_id: "",
    encounter_id: "",
    procedure_code: "",
    provider_id: "",
    procedure_date_from: "",
    procedure_date_to: "",
    procedure_cost_min: "",
    procedure_cost_max: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("procedure_date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Encounter and provider options for searchable selects
  const [encounterOptions, setEncounterOptions] = useState([]);
  const [encounterSearchTerm, setEncounterSearchTerm] = useState("");
  const [showEncounterDropdown, setShowEncounterDropdown] = useState(false);
  const [providerOptions, setProviderOptions] = useState([]);
  const [providerSearchTerm, setProviderSearchTerm] = useState("");
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [procedureCodeOptions, setProcedureCodeOptions] = useState([]);
  const [showProcedureCodeDropdown, setShowProcedureCodeDropdown] = useState(false);
  const [procedureCodeSearchTerm, setProcedureCodeSearchTerm] = useState("");

  // Helper function to normalize date to YYYY-MM-DD format
  const normalizeDate = (dateValue) => {
    if (!dateValue) return "";
    try {
      // If it's already in YYYY-MM-DD format (ISO) - this is what MySQL/API returns
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
        return dateValue.split('T')[0].split(' ')[0];
      }
      
      // Handle dd/mm/yyyy format (database CSV format) - priority over mm/dd/yyyy
      if (typeof dateValue === 'string' && /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(dateValue)) {
        const separator = dateValue.includes('/') ? '/' : '-';
        const parts = dateValue.split(separator);
        
        // Determine if it's dd/mm/yyyy or mm/dd/yyyy by checking if first part > 12
        // If first part > 12, it's likely dd/mm/yyyy (day first)
        let day, month, year;
        if (parseInt(parts[0]) > 12 && parseInt(parts[0]) <= 31) {
          // dd/mm/yyyy format (database format)
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
          year = parts[2];
        } else if (parseInt(parts[1]) > 12 && parseInt(parts[1]) <= 31) {
          // mm/dd/yyyy format
          month = parts[0].padStart(2, '0');
          day = parts[1].padStart(2, '0');
          year = parts[2];
        } else {
          // Ambiguous - assume dd/mm/yyyy (database format) if both parts <= 12
          day = parts[0].padStart(2, '0');
          month = parts[1].padStart(2, '0');
          year = parts[2];
        }
        return `${year}-${month}-${day}`;
      }
      
      // Try parsing as Date object (handles most formats)
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

  const fetchProcedures = useCallback(async () => {
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
      
      const response = await api.getProceduresList(params);
      
      setProcedures(response.data || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching procedures:", err);
      setError(err.message || "Failed to load procedures");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters.procedure_id, filters.encounter_id, filters.procedure_code, filters.provider_id, filters.procedure_date_from, filters.procedure_date_to, filters.procedure_cost_min, filters.procedure_cost_max]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortDirection, filters.procedure_id, filters.encounter_id, filters.procedure_code, filters.provider_id, filters.procedure_date_from, filters.procedure_date_to, filters.procedure_cost_min, filters.procedure_cost_max]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  // Fetch encounter options
  const fetchEncounterOptions = useCallback(async (search = "") => {
    try {
      const options = await api.getProceduresEncounterOptions(search, 50);
      setEncounterOptions(options);
    } catch (err) {
      console.error("Error fetching encounters:", err);
    }
  }, []);

  // Fetch provider options
  const fetchProviderOptions = useCallback(async (search = "") => {
    try {
      const options = await api.getProceduresProviderOptions(search, 50);
      setProviderOptions(options);
    } catch (err) {
      console.error("Error fetching providers:", err);
    }
  }, []);

  // Fetch procedure codes
  const fetchProcedureCodes = useCallback(async () => {
    try {
      const codes = await api.getProcedureCodes();
      setProcedureCodeOptions(codes);
    } catch (err) {
      console.error("Error fetching procedure codes:", err);
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchProcedureCodes();
    }
  }, [showModal, fetchProcedureCodes]);

  // Debounce encounter search
  useEffect(() => {
    if (showModal && showEncounterDropdown) {
      const timer = setTimeout(() => {
        if (encounterSearchTerm === "") {
          // If search term is empty, show all options if already loaded
          if (encounterOptions.length > 0) {
            return;
          }
        }
        fetchEncounterOptions(encounterSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showModal, showEncounterDropdown, encounterSearchTerm, fetchEncounterOptions, encounterOptions.length]);

  // Debounce provider search
  useEffect(() => {
    if (showModal && showProviderDropdown) {
      const timer = setTimeout(() => {
        if (providerSearchTerm === "") {
          // If search term is empty, show all options if already loaded
          if (providerOptions.length > 0) {
            return;
          }
        }
        fetchProviderOptions(providerSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showModal, showProviderDropdown, providerSearchTerm, fetchProviderOptions, providerOptions.length]);

  const handleAdd = () => {
    setEditingProcedure(null);
    setFormData({
      encounter_id: "",
      procedure_code: "",
      procedure_description: "",
      procedure_date: new Date().toISOString().slice(0, 10),
      provider_id: "",
      procedure_cost: 0,
    });
    setEncounterSearchTerm("");
    setProviderSearchTerm("");
    setProcedureCodeSearchTerm("");
    setShowEncounterDropdown(false);
    setShowProviderDropdown(false);
    setShowProcedureCodeDropdown(false);
    setShowModal(true);
  };

  const handleEdit = (procedure) => {
    setEditingProcedure(procedure);
    const normalizedDate = normalizeDate(procedure.procedure_date);
    setFormData({
      encounter_id: procedure.encounter_id || "",
      procedure_code: procedure.procedure_code || "",
      procedure_description: procedure.procedure_description || "",
      procedure_date: normalizedDate || "",
      provider_id: procedure.provider_id || "",
      procedure_cost: procedure.procedure_cost || 0,
    });
    const currentEncounter = encounterOptions.find(e => e.encounter_id === procedure.encounter_id);
    setEncounterSearchTerm(currentEncounter ? `${currentEncounter.encounter_id} - ${currentEncounter.patient_first_name || ""} ${currentEncounter.patient_last_name || ""}` : "");
    const currentProvider = providerOptions.find(p => p.provider_id === procedure.provider_id);
    setProviderSearchTerm(currentProvider ? `${currentProvider.provider_id} - ${currentProvider.name}` : "");
    setProcedureCodeSearchTerm(procedure.procedure_code || "");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      submitData.procedure_cost = parseFloat(submitData.procedure_cost) || 0;

      // When editing, if procedure_date is not provided, keep the original value
      if (editingProcedure && !submitData.procedure_date) {
        const originalDate = normalizeDate(editingProcedure.procedure_date);
        if (originalDate) {
          submitData.procedure_date = originalDate;
        }
      }

      if (editingProcedure) {
        await api.updateProcedure(editingProcedure.procedure_id, submitData);
      } else {
        await api.createProcedure(submitData);
      }
      setShowModal(false);
      fetchProcedures();
    } catch (err) {
      alert(err.message || "Failed to save procedure");
    }
  };

  const handleDelete = async (procedure_id) => {
    if (!window.confirm("Are you sure you want to delete this procedure?")) {
      return;
    }
    try {
      await api.deleteProcedure(procedure_id);
      fetchProcedures();
    } catch (err) {
      alert(err.message || "Failed to delete procedure");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      procedure_id: "",
      encounter_id: "",
      procedure_code: "",
      provider_id: "",
      procedure_date_from: "",
      procedure_date_to: "",
      procedure_cost_min: "",
      procedure_cost_max: "",
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
      title="Procedures"
      subtitle="View procedures linked to encounters and providers, including costs and codes."
      activePage="procedures"
      showSearch={false}
      showAddNew={false}
    >
      {/* Search Bar and Add Button */}
      <div className="hp-search-new-container" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
        <input
          className="hp-search hp-search--big"
          placeholder="Search procedures by ID, procedure code, encounter ID, or patient name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1", maxWidth: "500px" }}
        />
        <button className="hp-primary-btn" onClick={handleAdd}>
          + New Procedure
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
              Procedure ID
              <input
                type="text"
                placeholder="e.g. PROC000001"
                value={filters.procedure_id}
                onChange={(e) => handleFilterChange("procedure_id", e.target.value)}
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
              Procedure Code
              <input
                type="text"
                placeholder="e.g. CPT12345"
                value={filters.procedure_code}
                onChange={(e) => handleFilterChange("procedure_code", e.target.value)}
              />
            </label>

            <label>
              Provider ID
              <input
                type="text"
                placeholder="e.g. PROV000001"
                value={filters.provider_id}
                onChange={(e) => handleFilterChange("provider_id", e.target.value)}
              />
            </label>

            <label>
              Min Cost
              <input
                type="number"
                placeholder="0.00"
                value={filters.procedure_cost_min}
                onChange={(e) => handleFilterChange("procedure_cost_min", e.target.value)}
                step="0.01"
              />
            </label>

            <label>
              Max Cost
              <input
                type="number"
                placeholder="0.00"
                value={filters.procedure_cost_max}
                onChange={(e) => handleFilterChange("procedure_cost_max", e.target.value)}
                step="0.01"
              />
            </label>

            <label>
              Procedure Date From
              <input
                type="date"
                value={filters.procedure_date_from}
                onChange={(e) => handleFilterChange("procedure_date_from", e.target.value)}
              />
            </label>

            <label>
              Procedure Date To
              <input
                type="date"
                value={filters.procedure_date_to}
                onChange={(e) => handleFilterChange("procedure_date_to", e.target.value)}
              />
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
          <h3>🧪 Procedure List</h3>
          <p>Browse all recorded medical procedures in the system.</p>
        </div>

        <div className="page-card">
          <h3>➕ Add Procedure</h3>
          <p>Add a new medical procedure associated with encounter & provider.</p>
        </div>

        <div className="page-card">
          <h3>📊 Procedure Analytics</h3>
          <p>Analyze cost distribution, frequency and provider mapping.</p>
        </div>
      </div>

      {/* Table */}
      <div className="page-section">
        <h3>Recent Procedures ({totalCount.toLocaleString()} total)</h3>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--hp-text-soft)' }}>Loading procedures...</div>
        ) : error ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>{error}</div>
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("procedure_id")} style={{ cursor: "pointer" }}>
                  Procedure ID {sortBy === "procedure_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("encounter_id")} style={{ cursor: "pointer" }}>
                  Encounter {sortBy === "encounter_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Patient</th>
                <th onClick={() => handleSort("procedure_code")} style={{ cursor: "pointer" }}>
                  Procedure Code {sortBy === "procedure_code" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Provider</th>
                <th onClick={() => handleSort("procedure_date")} style={{ cursor: "pointer" }}>
                  Procedure Date {sortBy === "procedure_date" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("procedure_cost")} style={{ cursor: "pointer" }}>
                  Cost {sortBy === "procedure_cost" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {procedures.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                    No procedures found
                  </td>
                </tr>
              ) : (
                procedures.map((procedure) => (
                  <tr key={procedure.procedure_id}>
                    <td>
                      <Link to={`/procedures/${procedure.procedure_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                        {procedure.procedure_id}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/encounters/${procedure.encounter_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                        {procedure.encounter_id}
                      </Link>
                    </td>
                    <td>
                      {procedure.patient_id ? (
                        <Link to={`/patients/${procedure.patient_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                          {procedure.first_name} {procedure.last_name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{procedure.procedure_code}</td>
                    <td>
                      {procedure.provider_id ? (
                        <Link to={`/providers/${procedure.provider_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                          {procedure.provider_name || "-"}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{procedure.procedure_date ? new Date(procedure.procedure_date).toLocaleDateString() : "-"}</td>
                    <td style={{ textAlign: "right", fontWeight: "500" }}>
                      ${(parseFloat(procedure.procedure_cost) || 0).toFixed(2)}
                    </td>
                    <td>
                      <button className="hp-secondary-btn" onClick={() => handleEdit(procedure)} style={{ marginRight: "8px" }}>
                        Edit
                      </button>
                      <button className="hp-danger-btn" onClick={() => handleDelete(procedure.procedure_id)}>
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
            <h2>{editingProcedure ? "Edit Procedure" : "Add New Procedure"}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Encounter ID {!editingProcedure && <span style={{ color: "#dc3545" }}>*</span>}
                {editingProcedure ? (
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
                      placeholder="Search and select encounter..."
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
                              const newFormData = { ...formData, encounter_id: encounter.encounter_id };
                              if (encounter.provider_id) {
                                newFormData.provider_id = encounter.provider_id;
                                setProviderSearchTerm(`${encounter.provider_id} - ${encounter.provider_name || ""}`);
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
                Procedure Code {!editingProcedure && <span style={{ color: "#dc3545" }}>*</span>}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={procedureCodeSearchTerm}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setProcedureCodeSearchTerm(newCode);
                      // Find matching code and update description
                      const matchingCode = procedureCodeOptions.find(
                        code => code.procedure_code.toLowerCase() === newCode.toLowerCase()
                      );
                      setFormData({ 
                        ...formData, 
                        procedure_code: newCode,
                        procedure_description: matchingCode ? matchingCode.procedure_description || "" : formData.procedure_description
                      });
                      setShowProcedureCodeDropdown(true);
                    }}
                    onFocus={() => setShowProcedureCodeDropdown(true)}
                    required
                    placeholder="Select or type procedure code..."
                  />
                  {showProcedureCodeDropdown && procedureCodeOptions.length > 0 && (
                    <div className="page-dropdown">
                      {procedureCodeOptions
                        .filter(code => 
                          !procedureCodeSearchTerm || 
                          code.procedure_code.toLowerCase().includes(procedureCodeSearchTerm.toLowerCase()) ||
                          (code.procedure_description && code.procedure_description.toLowerCase().includes(procedureCodeSearchTerm.toLowerCase()))
                        )
                        .map((code) => (
                          <div
                            key={code.procedure_code}
                            className="page-dropdown-item"
                            onClick={() => {
                              setFormData({ 
                                ...formData, 
                                procedure_code: code.procedure_code,
                                procedure_description: code.procedure_description || "" // Set description from code, make it immutable
                              });
                              setProcedureCodeSearchTerm(code.procedure_code);
                              setShowProcedureCodeDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>{code.procedure_code}</div>
                            {code.procedure_description && (
                              <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                                {code.procedure_description}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Procedure Description
                <textarea
                  value={formData.procedure_description || ""}
                  readOnly
                  disabled
                  placeholder="Description is set automatically based on procedure code"
                  rows="3"
                  style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                  title="Description is automatically set based on the selected procedure code"
                />
              </label>

              <label>
                Provider
                <input
                  type="text"
                  placeholder="Provider will be selected automatically..."
                  value={providerSearchTerm}
                  readOnly
                  style={{ backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                />
              </label>

              <label>
                Procedure Date {!editingProcedure && <span style={{ color: "#dc3545" }}>*</span>}
                <input
                  type="date"
                  value={formData.procedure_date || ""}
                  onChange={(e) => setFormData({ ...formData, procedure_date: e.target.value })}
                />
              </label>

              <label>
                Procedure Cost
                <input
                  type="number"
                  value={formData.procedure_cost}
                  onChange={(e) => setFormData({ ...formData, procedure_cost: e.target.value })}
                  step="0.01"
                  min="0"
                />
              </label>

              <div className="form-actions">
                <button type="button" className="hp-secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="hp-primary-btn">
                  {editingProcedure ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default ProceduresPage;
