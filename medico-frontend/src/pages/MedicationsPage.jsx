import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const MedicationsPage = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    medication_id: "",
    encounter_id: "",
    drug_name: "",
    prescriber_id: "",
    prescribed_date_from: "",
    prescribed_date_to: "",
    cost_min: "",
    cost_max: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("prescribed_date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Encounter and prescriber options for searchable selects
  const [encounterOptions, setEncounterOptions] = useState([]);
  const [encounterSearchTerm, setEncounterSearchTerm] = useState("");
  const [showEncounterDropdown, setShowEncounterDropdown] = useState(false);
  const [prescriberOptions, setPrescriberOptions] = useState([]);
  const [prescriberSearchTerm, setPrescriberSearchTerm] = useState("");
  const [showPrescriberDropdown, setShowPrescriberDropdown] = useState(false);

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

  const fetchMedications = useCallback(async () => {
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
      
      const response = await api.getMedicationsList(params);
      
      setMedications(response.data || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching medications:", err);
      setError(err.message || "Failed to load medications");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters.medication_id, filters.encounter_id, filters.drug_name, filters.prescriber_id, filters.prescribed_date_from, filters.prescribed_date_to, filters.cost_min, filters.cost_max]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortDirection, filters.medication_id, filters.encounter_id, filters.drug_name, filters.prescriber_id, filters.prescribed_date_from, filters.prescribed_date_to, filters.cost_min, filters.cost_max]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  // Fetch encounter options
  const fetchEncounterOptions = useCallback(async (search = "") => {
    try {
      const options = await api.getMedicationsEncounterOptions(search, 50);
      setEncounterOptions(options);
    } catch (err) {
      console.error("Error fetching encounters:", err);
    }
  }, []);

  // Fetch prescriber options
  const fetchPrescriberOptions = useCallback(async (search = "") => {
    try {
      const options = await api.getPrescribersOptions(search, 50);
      setPrescriberOptions(options);
    } catch (err) {
      console.error("Error fetching prescribers:", err);
    }
  }, []);

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

  // Debounce prescriber search
  useEffect(() => {
    if (showModal && showPrescriberDropdown) {
      const timer = setTimeout(() => {
        if (prescriberSearchTerm === "") {
          if (prescriberOptions.length > 0) {
            return;
          }
        }
        fetchPrescriberOptions(prescriberSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showModal, showPrescriberDropdown, prescriberSearchTerm, fetchPrescriberOptions, prescriberOptions.length]);

  const handleAdd = () => {
    setEditingMedication(null);
    setFormData({
      encounter_id: "",
      drug_name: "",
      dosage: "",
      route: "",
      frequency: "",
      duration: "",
      prescribed_date: new Date().toISOString().slice(0, 10),
      prescriber_id: "",
      cost: 0,
    });
    setEncounterSearchTerm("");
    setPrescriberSearchTerm("");
    setShowEncounterDropdown(false);
    setShowPrescriberDropdown(false);
    setShowModal(true);
  };

  const handleEdit = (medication) => {
    setEditingMedication(medication);
    const normalizedDate = normalizeDate(medication.prescribed_date);
    setFormData({
      encounter_id: medication.encounter_id || "",
      drug_name: medication.drug_name || "",
      dosage: medication.dosage || "",
      route: medication.route || "",
      frequency: medication.frequency || "",
      duration: medication.duration || "",
      prescribed_date: normalizedDate || "",
      prescriber_id: medication.prescriber_id || "",
      cost: medication.cost || 0,
    });
    const currentEncounter = encounterOptions.find(e => e.encounter_id === medication.encounter_id);
    setEncounterSearchTerm(currentEncounter ? `${currentEncounter.encounter_id} - ${currentEncounter.patient_first_name || ""} ${currentEncounter.patient_last_name || ""}` : "");
    const currentPrescriber = prescriberOptions.find(p => p.provider_id === medication.prescriber_id);
    setPrescriberSearchTerm(currentPrescriber ? `${currentPrescriber.provider_id} - ${currentPrescriber.name}` : "");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      submitData.cost = parseFloat(submitData.cost) || 0;

      // When editing, if prescribed_date is not provided, keep the original value
      if (editingMedication && !submitData.prescribed_date) {
        const originalDate = normalizeDate(editingMedication.prescribed_date);
        if (originalDate) {
          submitData.prescribed_date = originalDate;
        }
      }

      if (editingMedication) {
        await api.updateMedication(editingMedication.medication_id, submitData);
      } else {
        await api.createMedication(submitData);
      }
      setShowModal(false);
      fetchMedications();
    } catch (err) {
      alert(err.message || "Failed to save medication");
    }
  };

  const handleDelete = async (medication_id) => {
    if (!window.confirm("Are you sure you want to delete this medication?")) {
      return;
    }
    try {
      await api.deleteMedication(medication_id);
      fetchMedications();
    } catch (err) {
      alert(err.message || "Failed to delete medication");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      medication_id: "",
      encounter_id: "",
      drug_name: "",
      prescriber_id: "",
      prescribed_date_from: "",
      prescribed_date_to: "",
      cost_min: "",
      cost_max: "",
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
      title="Medications"
      subtitle="Review medication history, prescribed dosages and prescriber information."
      activePage="medications"
      showSearch={false}
      showAddNew={false}
    >
      {/* Search Bar and Add Button */}
      <div className="hp-search-new-container" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
        <input
          className="hp-search hp-search--big"
          placeholder="Search medications by ID, drug name, encounter ID, or patient name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1", maxWidth: "500px" }}
        />
        <button className="hp-primary-btn" onClick={handleAdd}>
          + New Medication
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
              Medication ID
              <input
                type="text"
                placeholder="e.g. MED000001"
                value={filters.medication_id}
                onChange={(e) => handleFilterChange("medication_id", e.target.value)}
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
              Drug Name
              <input
                type="text"
                placeholder="e.g. Aspirin"
                value={filters.drug_name}
                onChange={(e) => handleFilterChange("drug_name", e.target.value)}
              />
            </label>

            <label>
              Prescriber ID
              <input
                type="text"
                placeholder="e.g. PROV000001"
                value={filters.prescriber_id}
                onChange={(e) => handleFilterChange("prescriber_id", e.target.value)}
              />
            </label>

            <label>
              Min Cost
              <input
                type="number"
                placeholder="0.00"
                value={filters.cost_min}
                onChange={(e) => handleFilterChange("cost_min", e.target.value)}
                step="0.01"
              />
            </label>

            <label>
              Max Cost
              <input
                type="number"
                placeholder="0.00"
                value={filters.cost_max}
                onChange={(e) => handleFilterChange("cost_max", e.target.value)}
                step="0.01"
              />
            </label>

            <label>
              Prescribed Date From
              <input
                type="date"
                value={filters.prescribed_date_from}
                onChange={(e) => handleFilterChange("prescribed_date_from", e.target.value)}
              />
            </label>

            <label>
              Prescribed Date To
              <input
                type="date"
                value={filters.prescribed_date_to}
                onChange={(e) => handleFilterChange("prescribed_date_to", e.target.value)}
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
          <h3>💊 Medication List</h3>
          <p>Explore all prescribed medications across patient records.</p>
        </div>

        <div className="page-card">
          <h3>➕ Add Medication</h3>
          <p>Create a new medication entry for a patient & encounter.</p>
        </div>

        <div className="page-card">
          <h3>📈 Medication Stats</h3>
          <p>Check top prescribed drugs, dosage patterns and more.</p>
        </div>
      </div>

      {/* Table */}
      <div className="page-section">
        <h3>Recent Medications ({totalCount.toLocaleString()} total)</h3>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--hp-text-soft)' }}>Loading medications...</div>
        ) : error ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>{error}</div>
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("medication_id")} style={{ cursor: "pointer" }}>
                  Medication ID {sortBy === "medication_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("encounter_id")} style={{ cursor: "pointer" }}>
                  Encounter {sortBy === "encounter_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Patient</th>
                <th onClick={() => handleSort("drug_name")} style={{ cursor: "pointer" }}>
                  Drug Name {sortBy === "drug_name" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Prescriber</th>
                <th onClick={() => handleSort("prescribed_date")} style={{ cursor: "pointer" }}>
                  Prescribed Date {sortBy === "prescribed_date" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("cost")} style={{ cursor: "pointer" }}>
                  Cost {sortBy === "cost" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medications.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                    No medications found
                  </td>
                </tr>
              ) : (
                medications.map((medication) => (
                  <tr key={medication.medication_id}>
                    <td>
                      <Link to={`/medications/${medication.medication_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                        {medication.medication_id}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/encounters/${medication.encounter_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                        {medication.encounter_id}
                      </Link>
                    </td>
                    <td>
                      {medication.patient_id ? (
                        <Link to={`/patients/${medication.patient_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                          {medication.first_name} {medication.last_name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{medication.drug_name}</td>
                    <td>
                      {medication.prescriber_id ? (
                        <Link to={`/providers/${medication.prescriber_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                          {medication.prescriber_name || "-"}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{medication.prescribed_date ? new Date(medication.prescribed_date).toLocaleDateString() : "-"}</td>
                    <td style={{ textAlign: "right", fontWeight: "500" }}>
                      ${(parseFloat(medication.cost) || 0).toFixed(2)}
                    </td>
                    <td>
                      <button className="hp-secondary-btn" onClick={() => handleEdit(medication)} style={{ marginRight: "8px" }}>
                        Edit
                      </button>
                      <button className="hp-danger-btn" onClick={() => handleDelete(medication.medication_id)}>
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
            <h2>{editingMedication ? "Edit Medication" : "Add New Medication"}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Encounter ID {!editingMedication && <span style={{ color: "#dc3545" }}>*</span>}
                {editingMedication ? (
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
                                newFormData.prescriber_id = encounter.provider_id;
                                setPrescriberSearchTerm(`${encounter.provider_id} - ${encounter.provider_name || ""}`);
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
                Drug Name {!editingMedication && <span style={{ color: "#dc3545" }}>*</span>}
                <input
                  type="text"
                  value={formData.drug_name || ""}
                  onChange={(e) => setFormData({ ...formData, drug_name: e.target.value })}
                  required
                  placeholder="e.g. Aspirin"
                />
              </label>

              <label>
                Dosage
                <input
                  type="text"
                  value={formData.dosage || ""}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="e.g. 500mg"
                />
              </label>

              <label>
                Route
                <input
                  type="text"
                  value={formData.route || ""}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  placeholder="e.g. Oral, IV"
                />
              </label>

              <label>
                Frequency
                <input
                  type="text"
                  value={formData.frequency || ""}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="e.g. Twice daily"
                />
              </label>

              <label>
                Duration
                <input
                  type="text"
                  value={formData.duration || ""}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g. 7 days"
                />
              </label>

              <label>
                Prescriber
                <input
                  type="text"
                  placeholder="Prescriber will be selected automatically..."
                  value={prescriberSearchTerm}
                  readOnly
                  style={{ backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                />
              </label>

              <label>
                Prescribed Date {!editingMedication && <span style={{ color: "#dc3545" }}>*</span>}
                <input
                  type="date"
                  value={formData.prescribed_date || ""}
                  onChange={(e) => setFormData({ ...formData, prescribed_date: e.target.value })}
                />
              </label>

              <label>
                Cost
                <input
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  step="0.01"
                  min="0"
                />
              </label>

              <div className="form-actions">
                <button type="button" className="hp-secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="hp-primary-btn">
                  {editingMedication ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default MedicationsPage;
