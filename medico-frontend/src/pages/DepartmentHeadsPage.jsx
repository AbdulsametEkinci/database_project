import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const DepartmentHeadsPage = () => {
  const [departmentHeads, setDepartmentHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHead, setEditingHead] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    head_id: "",
    department: "",
    head_provider_id: "",
    head_name: "",
    head_email: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Provider options for searchable select
  const [providerOptions, setProviderOptions] = useState([]);
  const [providerSearchTerm, setProviderSearchTerm] = useState("");
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("department");
  const [sortDirection, setSortDirection] = useState("asc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  const fetchDepartmentHeads = useCallback(async () => {
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
      
      const response = await api.getDepartmentHeadsList(params);
      
      setDepartmentHeads(response.data || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching department heads:", err);
      setError(err.message || "Failed to load department heads");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters.head_id, filters.department, filters.head_provider_id, filters.head_name, filters.head_email]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortDirection, filters.head_id, filters.department, filters.head_provider_id, filters.head_name, filters.head_email]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchDepartmentHeads();
  }, [fetchDepartmentHeads]);

  // Fetch provider options - filter by department if provided
  const fetchProviderOptions = useCallback(async (search = "", department = null) => {
    try {
      // Fetch more providers to ensure we get all matches (increase limit to 1000)
      const options = await api.getProvidersOptions(search, 1000);
      // Filter providers by department if department is selected
      let filteredOptions = options;
      if (department) {
        filteredOptions = options.filter(provider => 
          provider.department && provider.department.toLowerCase() === department.toLowerCase()
        );
      }
      setProviderOptions(filteredOptions);
    } catch (err) {
      console.error("Error fetching providers:", err);
    }
  }, []);

  // Debounce provider search
  useEffect(() => {
    if (showModal && showProviderDropdown) {
      const timer = setTimeout(() => {
        if (providerSearchTerm === "") {
          if (providerOptions.length > 0) {
            return;
          }
        }
        fetchProviderOptions(providerSearchTerm, formData.department);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showModal, showProviderDropdown, providerSearchTerm, fetchProviderOptions, providerOptions.length, formData.department]);



  const handleEdit = async (head) => {
    setEditingHead(head);
    setFormData({
      department: head.department || "",
      head_provider_id: head.head_provider_id || "",
      head_name: head.head_name || "",
      head_email: head.head_email || "",
    });
    // Fetch providers filtered by the department for this head
    if (head.department) {
      // Fetch more providers to ensure we get all matches (increase limit to 1000)
      const options = await api.getProvidersOptions("", 1000);
      const filteredOptions = options.filter(provider => 
        provider.department && provider.department.toLowerCase() === head.department.toLowerCase()
      );
      setProviderOptions(filteredOptions);
      const currentProvider = filteredOptions.find(p => p.provider_id === head.head_provider_id);
      setProviderSearchTerm(currentProvider ? `${currentProvider.provider_id} - ${currentProvider.name}` : head.head_provider_id || "");
    } else {
      setProviderSearchTerm(head.head_provider_id || "");
    }
    setShowProviderDropdown(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // When editing, only send head_provider_id (backend will auto-fill name and email)
      // Don't send department, head_name, or head_email
      const submitData = {
        head_provider_id: formData.head_provider_id
      };
      await api.updateDepartmentHead(editingHead.head_id, submitData);
      setShowModal(false);
      fetchDepartmentHeads();
    } catch (err) {
      setError(err.message || "Failed to update department head");
    }
  };

  const handleDelete = async (head_id) => {
    try {
      await api.deleteDepartmentHead(head_id);
      setDeleteConfirm(null);
      fetchDepartmentHeads();
    } catch (err) {
      setError(err.message || "Failed to delete department head");
      setDeleteConfirm(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      head_id: "",
      department: "",
      head_provider_id: "",
      head_name: "",
      head_email: "",
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
      title="Department Heads"
      subtitle="View and manage department heads."
      activePage="departmentheads"
      showSearch={false}
      showAddNew={false}
    >
      <div className="page-content">
        {error && (
          <div className="page-section" style={{ marginBottom: "20px", padding: "12px", backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545", borderRadius: "8px", border: "1px solid rgba(220, 53, 69, 0.3)" }}>
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="hp-search-new-container">
          <input
            type="text"
            className="hp-search hp-search--big"
            placeholder="Search department heads by ID, department, provider ID, name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, maxWidth: "600px" }}
          />
          <button className="hp-secondary-btn" onClick={() => setShowFilters(!showFilters)} style={{ marginLeft: "8px" }}>
            🔍 {showFilters ? "Hide Filters" : "Filters"}
          </button>
        </div>

        {/* Advanced Filters Card */}
        {showFilters && (
          <div className="page-section" style={{ marginBottom: "20px", padding: "20px", background: "var(--hp-bg-soft, #334155)", borderRadius: "12px" }}>
            <h4 style={{ marginBottom: "16px", color: "var(--hp-text-main)" }}>🔍 Advanced Search & Filter {hasFilters && <span style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>(Active)</span>}</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  Head ID
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. 1"
                  value={filters.head_id}
                  onChange={(e) => handleFilterChange("head_id", e.target.value)}
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
                  Provider ID
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. PROV000001"
                  value={filters.head_provider_id}
                  onChange={(e) => handleFilterChange("head_provider_id", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  Head Name
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. Dr. Smith"
                  value={filters.head_name}
                  onChange={(e) => handleFilterChange("head_name", e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", color: "var(--hp-text-soft)", fontWeight: "500" }}>
                  Email
                </label>
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. head@hospital.com"
                  value={filters.head_email}
                  onChange={(e) => handleFilterChange("head_email", e.target.value)}
                  style={{ width: "100%" }}
                />
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

        {/* Department Heads List Card */}
        <div className="page-section">
          <h3>Department Heads ({totalCount.toLocaleString()} total)</h3>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
              Loading department heads...
            </div>
          ) : (
            <>
              {departmentHeads.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--hp-text-soft)" }}>
                  No department heads found
                </div>
              ) : (
                <table className="page-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("head_id")} style={{ cursor: "pointer" }}>
                        Head ID {sortBy === "head_id" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("department")} style={{ cursor: "pointer" }}>
                        Department {sortBy === "department" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("head_provider_id")} style={{ cursor: "pointer" }}>
                        Provider ID {sortBy === "head_provider_id" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("head_name")} style={{ cursor: "pointer" }}>
                        Head Name {sortBy === "head_name" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th style={{ textAlign: "left" }}>Email</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentHeads.map((head) => (
                      <tr key={head.head_id}>
                        <td>
                          <Link to={`/department-heads/${head.head_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                            {head.head_id}
                          </Link>
                        </td>
                        <td>{head.department}</td>
                        <td>{head.head_provider_id}</td>
                        <td>{head.head_name}</td>
                        <td>{head.head_email || "-"}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="hp-secondary-btn"
                            onClick={() => handleEdit(head)}
                            style={{ padding: "6px 12px", marginRight: "8px", fontSize: "12px" }}
                          >
                            Edit
                          </button>
                          <button
                            className="hp-danger-btn"
                            onClick={() => setDeleteConfirm(head.head_id)}
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

      {/* Edit Modal */}
      {showModal && (
        <div className="page-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowModal(false);
            setShowProviderDropdown(false);
          }
        }}>
          <div className="page-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Department Head</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Department
                <input
                  type="text"
                  value={formData.department || ""}
                  disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Department cannot be changed. Each department must have a chief.
                </small>
              </label>

              <label>
                Provider ID <span style={{ color: "#dc3545" }}>*</span>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Search and select provider..."
                    value={providerSearchTerm}
                    onChange={(e) => {
                      setProviderSearchTerm(e.target.value);
                      setShowProviderDropdown(true);
                    }}
                    onFocus={() => {
                      setShowProviderDropdown(true);
                      if (providerSearchTerm === "" && providerOptions.length === 0) {
                        fetchProviderOptions("", formData.department);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowProviderDropdown(false);
                        // Restore selected value if search term doesn't match
                        if (formData.head_provider_id && providerSearchTerm !== `${formData.head_provider_id} - ${formData.head_name || ""}`) {
                          const selectedProvider = providerOptions.find(p => p.provider_id === formData.head_provider_id);
                          if (selectedProvider) {
                            setProviderSearchTerm(`${selectedProvider.provider_id} - ${selectedProvider.name}`);
                          }
                        }
                      }, 200);
                    }}
                    required
                  />
                  {showProviderDropdown && providerOptions.length > 0 && (
                    <div className="page-dropdown">
                      {providerOptions
                        .filter(provider => 
                          !providerSearchTerm || 
                          (provider.provider_id && provider.provider_id.toLowerCase().includes(providerSearchTerm.toLowerCase())) ||
                          (provider.name && provider.name.toLowerCase().includes(providerSearchTerm.toLowerCase()))
                        )
                        .map((provider) => (
                          <div
                            key={provider.provider_id}
                            className="page-dropdown-item"
                            onClick={() => {
                              setFormData({ ...formData, head_provider_id: provider.provider_id });
                              setProviderSearchTerm(`${provider.provider_id} - ${provider.name || ""}`);
                              setShowProviderDropdown(false);
                            }}
                          >
                            <div style={{ fontWeight: "500" }}>{provider.provider_id} - {provider.name}</div>
                            <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                              {provider.department} - {provider.specialty}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Changing provider ID will automatically update name and email. Only providers with department "{formData.department}" can be selected.
                  </small>
                </div>
              </label>

              <label>
                Head Name
                <input
                  type="text"
                  value={formData.head_name || ""}
                  disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Name is automatically filled from provider.
                </small>
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={formData.head_email || ""}
                  disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Email is automatically filled from provider.
                </small>
              </label>

              <div className="form-actions">
                <button type="button" className="hp-secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="hp-primary-btn">
                  Update
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
              Are you sure you want to delete this department head? This action cannot be undone.
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

export default DepartmentHeadsPage;
