import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const LabTestsPage = () => {
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLabTest, setEditingLabTest] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    test_id: "",
    encounter_id: "",
    test_code: "",
    lab_id: "",
    test_date_from: "",
    test_date_to: "",
    status: "",
    specimen_type: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("test_date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Encounter, test code, and lab ID options for searchable selects
  const [encounterOptions, setEncounterOptions] = useState([]);
  const [encounterSearchTerm, setEncounterSearchTerm] = useState("");
  const [showEncounterDropdown, setShowEncounterDropdown] = useState(false);
  const [testCodeOptions, setTestCodeOptions] = useState([]);
  const [showTestCodeDropdown, setShowTestCodeDropdown] = useState(false);
  const [testCodeSearchTerm, setTestCodeSearchTerm] = useState("");
  const [labIdOptions, setLabIdOptions] = useState([]);
  const [showLabIdDropdown, setShowLabIdDropdown] = useState(false);
  const [labIdSearchTerm, setLabIdSearchTerm] = useState("");
  const [specimenTypeOptions, setSpecimenTypeOptions] = useState([]);
  const [unitsOptions, setUnitsOptions] = useState([]);
  const [normalRangeOptions, setNormalRangeOptions] = useState([]);
  const [testResultOptions, setTestResultOptions] = useState([]);

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

  const fetchLabTests = useCallback(async () => {
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
      
      const response = await api.getLabTestsList(params);
      
      setLabTests(response.data || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching lab tests:", err);
      setError(err.message || "Failed to load lab tests");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters.test_id, filters.encounter_id, filters.test_code, filters.lab_id, filters.test_date_from, filters.test_date_to, filters.status, filters.specimen_type]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortDirection, filters.test_id, filters.encounter_id, filters.test_code, filters.lab_id, filters.test_date_from, filters.test_date_to, filters.status, filters.specimen_type]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchLabTests();
  }, [fetchLabTests]);

  // Fetch encounter options
  const fetchEncounterOptions = useCallback(async (search = "") => {
    try {
      const options = await api.getLabTestsEncounterOptions(search, 50);
      setEncounterOptions(options);
    } catch (err) {
      console.error("Error fetching encounters:", err);
    }
  }, []);

  // Fetch test codes
  const fetchTestCodes = useCallback(async () => {
    try {
      const codes = await api.getTestCodes();
      setTestCodeOptions(codes);
    } catch (err) {
      console.error("Error fetching test codes:", err);
    }
  }, []);

  // Fetch lab IDs
  const fetchLabIds = useCallback(async () => {
    try {
      const labIds = await api.getLabIds();
      setLabIdOptions(labIds);
    } catch (err) {
      console.error("Error fetching lab IDs:", err);
    }
  }, []);

  // Fetch specimen types
  const fetchSpecimenTypes = useCallback(async () => {
    try {
      const types = await api.getSpecimenTypes();
      setSpecimenTypeOptions(types);
    } catch (err) {
      console.error("Error fetching specimen types:", err);
    }
  }, []);

  // Fetch units
  const fetchUnits = useCallback(async () => {
    try {
      const units = await api.getUnits();
      setUnitsOptions(units);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  }, []);

  // Fetch normal ranges
  const fetchNormalRanges = useCallback(async () => {
    try {
      const ranges = await api.getNormalRanges();
      setNormalRangeOptions(ranges);
    } catch (err) {
      console.error("Error fetching normal ranges:", err);
    }
  }, []);

  // Fetch test results
  const fetchTestResults = useCallback(async () => {
    try {
      const results = await api.getTestResults();
      setTestResultOptions(results);
    } catch (err) {
      console.error("Error fetching test results:", err);
    }
  }, []);

  useEffect(() => {
    if (showModal) {
      fetchTestCodes();
      fetchLabIds();
      fetchSpecimenTypes();
      fetchUnits();
      fetchNormalRanges();
      fetchTestResults();
    }
  }, [showModal, fetchTestCodes, fetchLabIds, fetchSpecimenTypes, fetchUnits, fetchNormalRanges, fetchTestResults]);

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
    setEditingLabTest(null);
    setFormData({
      encounter_id: "",
      test_code: "",
      test_name: "",
      lab_id: "",
      specimen_type: "",
      test_result: "",
      units: "N/A",
      normal_range: "N/A",
      test_date: new Date().toISOString().slice(0, 10),
      status: "Preliminary",
    });
    setEncounterSearchTerm("");
    setTestCodeSearchTerm("");
    setLabIdSearchTerm("");
    setShowEncounterDropdown(false);
    setShowTestCodeDropdown(false);
    setShowLabIdDropdown(false);
    setShowModal(true);
  };

  const handleEdit = (labTest) => {
    setEditingLabTest(labTest);
    const normalizedDate = normalizeDate(labTest.test_date);
    setFormData({
      encounter_id: labTest.encounter_id || "",
      test_code: labTest.test_code || "",
      test_name: labTest.test_name || "",
      lab_id: labTest.lab_id || "",
      specimen_type: labTest.specimen_type || "",
      test_result: labTest.test_result || "",
      units: labTest.units || "N/A",
      normal_range: labTest.normal_range || "N/A",
      test_date: normalizedDate || "",
      status: labTest.status || "Preliminary",
    });
    const currentEncounter = encounterOptions.find(e => e.encounter_id === labTest.encounter_id);
    setEncounterSearchTerm(currentEncounter ? `${currentEncounter.encounter_id} - ${currentEncounter.patient_first_name || ""} ${currentEncounter.patient_last_name || ""}` : "");
    setTestCodeSearchTerm(labTest.test_code || "");
    setLabIdSearchTerm(labTest.lab_id || "");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };

      // When editing, if test_date is not provided, keep the original value
      if (editingLabTest && !submitData.test_date) {
        const originalDate = normalizeDate(editingLabTest.test_date);
        if (originalDate) {
          submitData.test_date = originalDate;
        }
      }

      if (editingLabTest) {
        await api.updateLabTest(editingLabTest.test_id, submitData);
      } else {
        await api.createLabTest(submitData);
      }
      setShowModal(false);
      fetchLabTests();
    } catch (err) {
      alert(err.message || "Failed to save lab test");
    }
  };

  const handleDelete = async (test_id) => {
    if (!window.confirm("Are you sure you want to delete this lab test?")) {
      return;
    }
    try {
      await api.deleteLabTest(test_id);
      fetchLabTests();
    } catch (err) {
      alert(err.message || "Failed to delete lab test");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      test_id: "",
      encounter_id: "",
      test_code: "",
      lab_id: "",
      test_date_from: "",
      test_date_to: "",
      status: "",
      specimen_type: "",
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
      title="Lab Tests"
      subtitle="View and manage laboratory test results and reports."
      activePage="lab-tests"
      showSearch={false}
      showAddNew={false}
    >
      {/* Search Bar and Add Button */}
      <div className="hp-search-new-container" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
        <input
          className="hp-search hp-search--big"
          placeholder="Search lab tests by ID, test code, encounter ID, lab ID, or patient name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1", maxWidth: "500px" }}
        />
        <button className="hp-primary-btn" onClick={handleAdd}>
          + New Lab Test
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
              Test ID
              <input
                type="text"
                placeholder="e.g. T00022"
                value={filters.test_id}
                onChange={(e) => handleFilterChange("test_id", e.target.value)}
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
              Test Code
              <input
                type="text"
                placeholder="e.g. TEST012"
                value={filters.test_code}
                onChange={(e) => handleFilterChange("test_code", e.target.value)}
              />
            </label>

            <label>
              Lab ID
              <input
                type="text"
                placeholder="e.g. LAB013"
                value={filters.lab_id}
                onChange={(e) => handleFilterChange("lab_id", e.target.value)}
              />
            </label>

            <label>
              Status
              <input
                type="text"
                placeholder="e.g. Preliminary, Final"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              />
            </label>

            <label>
              Specimen Type
              <input
                type="text"
                placeholder="e.g. Imaging, Blood"
                value={filters.specimen_type}
                onChange={(e) => handleFilterChange("specimen_type", e.target.value)}
              />
            </label>

            <label>
              Test Date From
              <input
                type="date"
                value={filters.test_date_from}
                onChange={(e) => handleFilterChange("test_date_from", e.target.value)}
              />
            </label>

            <label>
              Test Date To
              <input
                type="date"
                value={filters.test_date_to}
                onChange={(e) => handleFilterChange("test_date_to", e.target.value)}
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
          <h3>🧪 Lab Test List</h3>
          <p>Browse all laboratory test results and reports.</p>
        </div>

        <div className="page-card">
          <h3>➕ Add Lab Test</h3>
          <p>Create a new lab test entry for an encounter.</p>
        </div>

        <div className="page-card">
          <h3>📊 Lab Test Analytics</h3>
          <p>Analyze test patterns and results.</p>
        </div>
      </div>

      {/* Table */}
      <div className="page-section">
        <h3>Recent Lab Tests ({totalCount.toLocaleString()} total)</h3>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--hp-text-soft)' }}>Loading lab tests...</div>
        ) : error ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#dc3545' }}>{error}</div>
        ) : (
          <table className="page-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("test_id")} style={{ cursor: "pointer" }}>
                  Test ID {sortBy === "test_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("encounter_id")} style={{ cursor: "pointer" }}>
                  Encounter {sortBy === "encounter_id" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Patient</th>
                <th onClick={() => handleSort("test_code")} style={{ cursor: "pointer" }}>
                  Test Code {sortBy === "test_code" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Lab ID</th>
                <th onClick={() => handleSort("test_date")} style={{ cursor: "pointer" }}>
                  Test Date {sortBy === "test_date" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                  Status {sortBy === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {labTests.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                    No lab tests found
                  </td>
                </tr>
              ) : (
                labTests.map((labTest) => (
                  <tr key={labTest.test_id}>
                    <td>
                      <Link to={`/lab-tests/${labTest.test_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                        {labTest.test_id}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/encounters/${labTest.encounter_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                        {labTest.encounter_id}
                      </Link>
                    </td>
                    <td>
                      {labTest.patient_id ? (
                        <Link to={`/patients/${labTest.patient_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                          {labTest.first_name} {labTest.last_name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{labTest.test_code}</td>
                    <td>{labTest.lab_id || "-"}</td>
                    <td>{labTest.test_date ? new Date(labTest.test_date).toLocaleDateString() : "-"}</td>
                    <td style={{ fontWeight: "500" }}>{labTest.status || "-"}</td>
                    <td>
                      <button className="hp-secondary-btn" onClick={() => handleEdit(labTest)} style={{ marginRight: "8px" }}>
                        Edit
                      </button>
                      <button className="hp-danger-btn" onClick={() => handleDelete(labTest.test_id)}>
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
            <h2>{editingLabTest ? "Edit Lab Test" : "Add New Lab Test"}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Encounter ID {!editingLabTest && <span style={{ color: "#dc3545" }}>*</span>}
                {editingLabTest ? (
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
                              setFormData({ ...formData, encounter_id: encounter.encounter_id });
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
                Test Code {!editingLabTest && <span style={{ color: "#dc3545" }}>*</span>}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={testCodeSearchTerm}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setTestCodeSearchTerm(newCode);
                      // Find matching code and update test_name
                      const matchingCode = testCodeOptions.find(
                        code => code.test_code.toLowerCase() === newCode.toLowerCase()
                      );
                      setFormData({ 
                        ...formData, 
                        test_code: newCode,
                        test_name: matchingCode ? matchingCode.test_name || "" : formData.test_name
                      });
                      setShowTestCodeDropdown(true);
                    }}
                    onFocus={() => setShowTestCodeDropdown(true)}
                    required
                    placeholder="Select or type test code..."
                  />
                  {showTestCodeDropdown && testCodeOptions.length > 0 && (
                    <div className="page-dropdown">
                      {testCodeOptions
                        .filter(code => 
                          !testCodeSearchTerm || 
                          code.test_code.toLowerCase().includes(testCodeSearchTerm.toLowerCase()) ||
                          (code.test_name && code.test_name.toLowerCase().includes(testCodeSearchTerm.toLowerCase()))
                        )
                        .map((code) => (
                          <div
                            key={code.test_code}
                            className="page-dropdown-item"
                            onClick={() => {
                              setFormData({ 
                                ...formData, 
                                test_code: code.test_code,
                                test_name: code.test_name || "" // Set test_name from code, make it immutable
                              });
                              setTestCodeSearchTerm(code.test_code);
                              setShowTestCodeDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>{code.test_code}</div>
                            {code.test_name && (
                              <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                                {code.test_name}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Test Name {!editingLabTest && <span style={{ color: "#dc3545" }}>*</span>}
                <textarea
                  value={formData.test_name || ""}
                  readOnly
                  disabled
                  placeholder="Test name is set automatically based on test code"
                  rows="3"
                  style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                  title="Test name is automatically set based on the selected test code"
                  required
                />
              </label>

              <label>
                Lab ID
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={labIdSearchTerm}
                    onChange={(e) => {
                      setLabIdSearchTerm(e.target.value);
                      setFormData({ ...formData, lab_id: e.target.value });
                      setShowLabIdDropdown(true);
                    }}
                    onFocus={() => {
                      setShowLabIdDropdown(true);
                      if (labIdOptions.length === 0) {
                        fetchLabIds();
                      }
                    }}
                    placeholder="Select or type lab ID..."
                  />
                  {showLabIdDropdown && labIdOptions.length > 0 && (
                    <div className="page-dropdown">
                      {labIdOptions
                        .filter(lab => 
                          !labIdSearchTerm || 
                          (lab.lab_id && lab.lab_id.toLowerCase().includes(labIdSearchTerm.toLowerCase()))
                        )
                        .map((lab) => (
                          <div
                            key={lab.lab_id}
                            className="page-dropdown-item"
                            onClick={() => {
                              setFormData({ ...formData, lab_id: lab.lab_id });
                              setLabIdSearchTerm(lab.lab_id);
                              setShowLabIdDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>{lab.lab_id}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </label>

              <label>
                Specimen Type
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={formData.specimen_type || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, specimen_type: e.target.value });
                    }}
                    onFocus={() => {
                      if (specimenTypeOptions.length === 0) {
                        fetchSpecimenTypes();
                      }
                    }}
                    placeholder="Select or type specimen type..."
                    list="specimen-types-list"
                  />
                  <datalist id="specimen-types-list">
                    {specimenTypeOptions.map((type, idx) => (
                      <option key={idx} value={type.specimen_type || type} />
                    ))}
                  </datalist>
                </div>
              </label>

              <label>
                Test Date {!editingLabTest && <span style={{ color: "#dc3545" }}>*</span>}
                <input
                  type="date"
                  value={formData.test_date || ""}
                  onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                  required={!editingLabTest}
                />
              </label>

              <label>
                Status {!editingLabTest && <span style={{ color: "#dc3545" }}>*</span>}
                <select
                  value={formData.status || "Preliminary"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="Preliminary">Preliminary</option>
                  <option value="Final">Final</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>

              <label>
                Test Result
                <select
                  value={formData.test_result || ""}
                  onChange={(e) => setFormData({ ...formData, test_result: e.target.value })}
                >
                  <option value="">Select test result...</option>
                  {testResultOptions.map((result, idx) => {
                    const value = result.test_result || result;
                    return (
                      <option key={idx} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label>
                Units
                <select
                  value={formData.units || "N/A"}
                  onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                >
                  {unitsOptions.map((unit, idx) => {
                    const value = unit.units || unit;
                    return (
                      <option key={idx} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label>
                Normal Range
                <select
                  value={formData.normal_range || "N/A"}
                  onChange={(e) => setFormData({ ...formData, normal_range: e.target.value })}
                >
                  {normalRangeOptions.map((range, idx) => {
                    const value = range.normal_range || range;
                    return (
                      <option key={idx} value={value}>
                        {value}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="form-actions">
                <button type="button" className="hp-secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="hp-primary-btn">
                  {editingLabTest ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default LabTestsPage;
