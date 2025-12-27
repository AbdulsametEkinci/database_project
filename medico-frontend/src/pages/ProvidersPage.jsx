import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const ProvidersPage = () => {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Search and filters
    const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    provider_id: "",
    name: "",
    department: "",
    specialty: "",
    npi: "",
    inhouse: "",
    head_id: "",
  });
    const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Department heads options for searchable select
  const [departmentHeadOptions, setDepartmentHeadOptions] = useState([]);
  const [departmentHeadSearchTerm, setDepartmentHeadSearchTerm] = useState("");
  const [showDepartmentHeadDropdown, setShowDepartmentHeadDropdown] = useState(false);
  
  // Department and specialty options for searchable selects
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState("");
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [specialtyOptions, setSpecialtyOptions] = useState([]);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState("");
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false);

  const fetchProviders = useCallback(async () => {
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
      
      const response = await api.getProvidersList(params);
      
      setProviders(response.data || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
                setError(null);
            } catch (err) {
      console.error("Error fetching providers:", err);
      setError(err.message || "Failed to load providers");
            } finally {
                setLoading(false);
            }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters.provider_id, filters.name, filters.department, filters.specialty, filters.npi, filters.inhouse, filters.head_id]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortDirection, filters.provider_id, filters.name, filters.department, filters.specialty, filters.npi, filters.inhouse, filters.head_id]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Fetch department heads options
  const fetchDepartmentHeadOptions = useCallback(async (search = "", department = "") => {
    try {
      const options = await api.getProvidersDepartmentHeadsOptions(search, 50, department);
      setDepartmentHeadOptions(options);
      return options;
    } catch (err) {
      console.error("Error fetching department heads:", err);
      return [];
    }
  }, []);

  // Fetch departments and specialties
  const fetchDepartments = useCallback(async () => {
    try {
      const depts = await api.getProvidersDepartments();
      setDepartmentOptions(depts);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  }, []);

  const fetchSpecialties = useCallback(async (department = "") => {
    try {
      const specs = await api.getProvidersSpecialties(department);
      setSpecialtyOptions(specs);
    } catch (err) {
      console.error("Error fetching specialties:", err);
      setSpecialtyOptions([]);
    }
  }, []);

  // Load departments when modal opens
  useEffect(() => {
    if (showModal && !editingProvider) {
      fetchDepartments();
    }
  }, [showModal, editingProvider, fetchDepartments]);

  // Fetch specialties when department changes (only in add mode)
  useEffect(() => {
    if (showModal && !editingProvider) {
      if (formData.department) {
        fetchSpecialties(formData.department);
      } else {
        setSpecialtyOptions([]);
        setSpecialtySearchTerm("");
        setFormData(prev => ({ ...prev, specialty: "" }));
      }
    }
  }, [formData.department, showModal, editingProvider, fetchSpecialties]);

  // Debounce department head search
  useEffect(() => {
    if (showModal && showDepartmentHeadDropdown) {
      const timer = setTimeout(() => {
        if (departmentHeadSearchTerm === "") {
          if (departmentHeadOptions.length > 0) {
            return;
          }
        }
        fetchDepartmentHeadOptions(departmentHeadSearchTerm, formData.department || "");
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showModal, showDepartmentHeadDropdown, departmentHeadSearchTerm, fetchDepartmentHeadOptions, departmentHeadOptions.length, formData.department]);

  // Auto-select department head when department changes (only in add mode)
  useEffect(() => {
    if (showModal && !editingProvider && formData.department) {
      const autoSelectHead = async () => {
        try {
          // Fetch department heads filtered by selected department
          const options = await api.getProvidersDepartmentHeadsOptions("", 100, formData.department);
          setDepartmentHeadOptions(options);
          
          // Auto-select the first matching department head
          if (options && options.length > 0) {
            const matchingHead = options.find(dh => dh.department === formData.department);
            if (matchingHead) {
              setFormData(prev => ({ ...prev, head_id: matchingHead.head_id }));
              setDepartmentHeadSearchTerm(`${matchingHead.head_id} - ${matchingHead.head_name || ""} (${matchingHead.department || ""})`);
            } else if (options.length > 0) {
              // If no exact match, use the first one
              const firstHead = options[0];
              setFormData(prev => ({ ...prev, head_id: firstHead.head_id }));
              setDepartmentHeadSearchTerm(`${firstHead.head_id} - ${firstHead.head_name || ""} (${firstHead.department || ""})`);
            }
          } else {
            // No department head found for this department
            setFormData(prev => ({ ...prev, head_id: "" }));
            setDepartmentHeadSearchTerm("");
          }
        } catch (err) {
          console.error("Error auto-selecting department head:", err);
          setFormData(prev => ({ ...prev, head_id: "" }));
          setDepartmentHeadSearchTerm("");
        }
      };
      autoSelectHead();
    } else if (showModal && !editingProvider && !formData.department) {
      // Clear department head when department is cleared
      setFormData(prev => ({ ...prev, head_id: "" }));
      setDepartmentHeadSearchTerm("");
      setDepartmentHeadOptions([]);
    }
  }, [formData.department, showModal, editingProvider]);

  const handleAdd = () => {
    setEditingProvider(null);
    setFormData({
      name: "",
      department: "",
      specialty: "",
      npi: "",
      inhouse: "1",
      location: "",
      years_experience: "",
      contact_info: "",
      email: "",
      head_id: "",
    });
    setDepartmentHeadSearchTerm("");
    setDepartmentSearchTerm("");
    setSpecialtySearchTerm("");
    setDepartmentHeadOptions([]);
    setSpecialtyOptions([]);
    setShowDepartmentHeadDropdown(false);
    setShowDepartmentDropdown(false);
    setShowSpecialtyDropdown(false);
    setShowModal(true);
  };

  const handleEdit = async (provider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name || "",
      department: provider.department || "",
      specialty: provider.specialty || "",
      npi: provider.npi || "",
      inhouse: provider.inhouse ? "1" : "0",
      location: provider.location || "",
      years_experience: provider.years_experience || "",
      contact_info: provider.contact_info || "",
      email: provider.email || "",
      head_id: provider.head_id || "",
    });
    setDepartmentSearchTerm(provider.department || "");
    setSpecialtySearchTerm(provider.specialty || "");
    // Fetch department heads to get the current head info
    try {
      const options = await api.getProvidersDepartmentHeadsOptions("", 1000);
      setDepartmentHeadOptions(options);
      const currentHead = options.find(h => h.head_id === provider.head_id);
      if (currentHead) {
        setDepartmentHeadSearchTerm(`${currentHead.head_id} - ${currentHead.head_name || ""} (${currentHead.department || ""})`);
      } else {
        setDepartmentHeadSearchTerm("");
      }
    } catch (err) {
      console.error("Error fetching department heads:", err);
      setDepartmentHeadSearchTerm("");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      submitData.inhouse = submitData.inhouse === "1";
      if (submitData.years_experience) {
        submitData.years_experience = parseInt(submitData.years_experience);
      }
      if (submitData.head_id) {
        submitData.head_id = parseInt(submitData.head_id);
      }

      if (editingProvider) {
        await api.updateProvider(editingProvider.provider_id, submitData);
      } else {
        await api.createProvider(submitData);
      }
      setShowModal(false);
        fetchProviders();
    } catch (err) {
      setError(err.message || "Failed to save provider");
    }
  };

  const handleDelete = async (provider_id) => {
    try {
      await api.deleteProvider(provider_id);
      setDeleteConfirm(null);
      fetchProviders();
    } catch (err) {
      setError(err.message || "Failed to delete provider");
      setDeleteConfirm(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      provider_id: "",
      name: "",
      department: "",
      specialty: "",
      npi: "",
      inhouse: "",
      head_id: "",
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
            title="Providers"
            subtitle="View and manage healthcare providers."
            activePage="providers"
            showSearch={false}
            showAddNew={false}
        >
      <div className="page-content">
        {error && (
          <div className="page-section" style={{ marginBottom: "20px", padding: "12px", backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545", borderRadius: "8px", border: "1px solid rgba(220, 53, 69, 0.3)" }}>
            {error}
          </div>
        )}

        {/* Search Bar and Add Button */}
        <div className="hp-search-new-container">
                <input
            type="text"
                    className="hp-search hp-search--big"
            placeholder="Search providers by ID, name, department, specialty, NPI, or department head..."
                    value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, maxWidth: "600px" }}
                />
                <button className="hp-secondary-btn" onClick={() => setShowFilters(!showFilters)} style={{ marginLeft: "8px" }}>
                    🔍 {showFilters ? "Hide Filters" : "Filters"}
                </button>
          <button className="hp-primary-btn" onClick={handleAdd} style={{ marginLeft: "8px" }}>
            + New Provider
                </button>
            </div>

        {/* Advanced Filters Card */}
            {showFilters && (
          <div className="page-section" style={{ marginBottom: "20px", padding: "20px", background: "var(--hp-bg-soft, #334155)", borderRadius: "12px" }}>
            <h4 style={{ marginBottom: "16px", color: "var(--hp-text-main)" }}>🔍 Advanced Search & Filter {hasFilters && <span style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>(Active)</span>}</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  Provider ID
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. PROV000001"
                  value={filters.provider_id}
                  onChange={(e) => handleFilterChange("provider_id", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  Name
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. Dr. Smith"
                  value={filters.name}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  Department
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. Cardiology"
                  value={filters.department}
                  onChange={(e) => handleFilterChange("department", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  Specialty
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. Cardiologist"
                  value={filters.specialty}
                  onChange={(e) => handleFilterChange("specialty", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

                        <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  NPI
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. 1234567890"
                  value={filters.npi}
                  onChange={(e) => handleFilterChange("npi", e.target.value)}
                  style={{ width: "100%" }}
                />
                        </div>

                        <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  In-House
                </label>
                <select
                  className="hp-search"
                  value={filters.inhouse}
                  onChange={(e) => handleFilterChange("inhouse", e.target.value)}
                  style={{ width: "100%" }}
                >
                                <option value="">All</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                className="hp-secondary-btn"
                onClick={resetFilters}
                style={{ padding: "8px 16px", fontSize: "14px" }}
              >
                Reset Filters
                        </button>
                    </div>
                </div>
            )}

        {/* Providers List Card */}
            <div className="page-section">
          <h3>Providers ({totalCount.toLocaleString()} total)</h3>
                {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
              Loading providers...
            </div>
          ) : (
            <>
              {providers.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--hp-text-soft)" }}>
                  No providers found
                </div>
                ) : (
                    <table className="page-table">
                        <thead>
                            <tr>
                      <th onClick={() => handleSort("provider_id")} style={{ cursor: "pointer" }}>
                        Provider ID {sortBy === "provider_id" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                        Name {sortBy === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("department")} style={{ cursor: "pointer" }}>
                        Department {sortBy === "department" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("specialty")} style={{ cursor: "pointer" }}>
                        Specialty {sortBy === "specialty" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("npi")} style={{ cursor: "pointer" }}>
                        NPI {sortBy === "npi" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th style={{ textAlign: "center" }}>In-House</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                    {providers.map((provider) => (
                      <tr key={provider.provider_id}>
                        <td>
                          <Link to={`/providers/${provider.provider_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                            {provider.provider_id}
                          </Link>
                        </td>
                        <td>{provider.name}</td>
                        <td>{provider.department}</td>
                        <td>{provider.specialty}</td>
                        <td>{provider.npi}</td>
                        <td style={{ textAlign: "center" }}>{provider.inhouse ? "Yes" : "No"}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="hp-secondary-btn"
                            onClick={() => handleEdit(provider)}
                            style={{ padding: "6px 12px", marginRight: "8px", fontSize: "12px" }}
                          >
                            Edit
                          </button>
                          <button
                            className="hp-danger-btn"
                            onClick={() => setDeleteConfirm(provider.provider_id)}
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                          >
                            Delete
                          </button>
                                        </td>
                                    </tr>
                    ))}
                        </tbody>
                    </table>
                )}
            </>
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
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="page-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowModal(false);
            setShowDepartmentDropdown(false);
            setShowSpecialtyDropdown(false);
            setShowDepartmentHeadDropdown(false);
          }
        }}>
          <div className="page-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProvider ? "Edit Provider" : "Add New Provider"}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Name {!editingProvider && <span style={{ color: "#dc3545" }}>*</span>}
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </label>

              <label>
                Department {!editingProvider && <span style={{ color: "#dc3545" }}>*</span>}
                {editingProvider ? (
                  <input
                    type="text"
                    value={formData.department || ""}
                    disabled
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search and select department..."
                      value={departmentSearchTerm}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDepartmentSearchTerm(value);
                        setShowDepartmentDropdown(true);
                      }}
                      onFocus={() => {
                        setShowDepartmentDropdown(true);
                        if (departmentOptions.length === 0) {
                          fetchDepartments();
                        }
                      }}
                      onBlur={(e) => {
                        setTimeout(() => {
                          setShowDepartmentDropdown(false);
                          // Restore selected value if search term doesn't match
                          if (formData.department && departmentSearchTerm !== formData.department) {
                            setDepartmentSearchTerm(formData.department);
                          }
                        }, 200);
                      }}
                      required
                    />
                    {showDepartmentDropdown && departmentOptions.length > 0 && (
                      <div 
                        className="page-dropdown" 
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ zIndex: 1000 }}
                      >
                        {departmentOptions
                          .filter(dept => {
                            const deptValue = typeof dept === 'string' ? dept : (dept.department || dept);
                            return !departmentSearchTerm || deptValue.toLowerCase().includes(departmentSearchTerm.toLowerCase());
                          })
                          .map((dept, idx) => {
                            const deptValue = typeof dept === 'string' ? dept : (dept.department || dept);
                            return (
                              <div
                                key={idx}
                                className="page-dropdown-item"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setFormData(prev => ({ ...prev, department: deptValue, specialty: "" }));
                                  setDepartmentSearchTerm(deptValue);
                                  setSpecialtySearchTerm("");
                                  setShowDepartmentDropdown(false);
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>{deptValue}</div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
                {editingProvider && (
                  <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Department cannot be changed.
                  </small>
                )}
              </label>

              <label>
                Specialty {!editingProvider && <span style={{ color: "#dc3545" }}>*</span>}
                {editingProvider ? (
                  <input
                    type="text"
                    value={formData.specialty || ""}
                    disabled
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder={formData.department ? "Search and select specialty..." : "Select department first..."}
                      value={specialtySearchTerm}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSpecialtySearchTerm(value);
                        setShowSpecialtyDropdown(true);
                      }}
                      onFocus={() => {
                        if (!formData.department) {
                          alert("Please select a department first");
                          return;
                        }
                        setShowSpecialtyDropdown(true);
                        if (specialtyOptions.length === 0 && formData.department) {
                          fetchSpecialties(formData.department);
                        }
                      }}
                      onBlur={(e) => {
                        setTimeout(() => {
                          setShowSpecialtyDropdown(false);
                          // Restore selected value if search term doesn't match
                          if (formData.specialty && specialtySearchTerm !== formData.specialty) {
                            setSpecialtySearchTerm(formData.specialty);
                          }
                        }, 200);
                      }}
                      disabled={!formData.department}
                      required
                      style={!formData.department ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                    />
                    {formData.department && showSpecialtyDropdown && specialtyOptions.length > 0 && (
                      <div 
                        className="page-dropdown" 
                        onMouseDown={(e) => e.preventDefault()}
                        style={{ zIndex: 1000 }}
                      >
                        {specialtyOptions
                          .filter(spec => {
                            const specValue = typeof spec === 'string' ? spec : (spec.specialty || spec);
                            return !specialtySearchTerm || specValue.toLowerCase().includes(specialtySearchTerm.toLowerCase());
                          })
                          .map((spec, idx) => {
                            const specValue = typeof spec === 'string' ? spec : (spec.specialty || spec);
                            return (
                              <div
                                key={idx}
                                className="page-dropdown-item"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setFormData(prev => ({ ...prev, specialty: specValue }));
                                  setSpecialtySearchTerm(specValue);
                                  setShowSpecialtyDropdown(false);
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>{specValue}</div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                    {!formData.department && (
                      <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                        Please select a department first to choose a specialty.
                      </small>
                    )}
                  </div>
                )}
                {editingProvider && (
                  <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Specialty cannot be changed.
                  </small>
                )}
              </label>

              <label>
                NPI {!editingProvider && <span style={{ color: "#dc3545" }}>*</span>}
                <input
                  type="text"
                  value={formData.npi || ""}
                  onChange={(e) => setFormData({ ...formData, npi: e.target.value })}
                  required={!editingProvider}
                  disabled={editingProvider !== null}
                  style={{ opacity: editingProvider ? 0.6 : 1, cursor: editingProvider ? "not-allowed" : "text" }}
                />
                {editingProvider && (
                  <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    NPI cannot be changed.
                  </small>
                )}
              </label>

              <label>
                In-House
                <select
                  value={formData.inhouse || "1"}
                  onChange={(e) => setFormData({ ...formData, inhouse: e.target.value })}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>

              <label>
                Location
                <input
                  type="text"
                  value={formData.location || ""}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </label>

              <label>
                Years of Experience
                <input
                  type="number"
                  min="0"
                  value={formData.years_experience || ""}
                  onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                />
              </label>

              <label>
                Contact Info
                <input
                  type="text"
                  value={formData.contact_info || ""}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Email
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                Department Head
                {!editingProvider ? (
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder={formData.department ? "Auto-selected based on department..." : "Select department first..."}
                      value={departmentHeadSearchTerm}
                      readOnly
                      disabled={!formData.department}
                      style={!formData.department ? { opacity: 0.6, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" } : { opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                    />
                    {!formData.department && (
                      <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                        Department head will be automatically selected when you choose a department.
                      </small>
                    )}
                    {formData.department && departmentHeadSearchTerm && (
                      <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                        Department head is automatically selected based on the department (cannot be changed).
                      </small>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={departmentHeadSearchTerm}
                    disabled
                    style={{ opacity: 0.6, cursor: "not-allowed" }}
                  />
                )}
              </label>

              <div className="form-actions">
                <button type="button" className="hp-secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="hp-primary-btn">
                  {editingProvider ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="page-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="page-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <h3>Confirm Delete</h3>
            <p style={{ color: "var(--hp-text-soft)" }}>
              Are you sure you want to delete this provider? This action cannot be undone.
            </p>
            <div className="form-actions">
              <button
                className="hp-secondary-btn"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="hp-danger-btn"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
                </div>
            </div>
      )}
        </SharedLayout>
    );
};

export default ProvidersPage;
