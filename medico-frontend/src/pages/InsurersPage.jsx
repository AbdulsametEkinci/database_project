import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const InsurersPage = () => {
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingInsurer, setEditingInsurer] = useState(null);
  const [formData, setFormData] = useState({});
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    code: "",
    name: "",
    payer_type: "",
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

  const payerTypeOptions = ["Private", "Public", "Medicare", "Medicaid"];

  const fetchInsurers = useCallback(async () => {
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
      if (filters.code) filterParams.code = filters.code;
      if (filters.name) filterParams.name = filters.name;
      if (filters.payer_type) filterParams.payer_type = filters.payer_type;
      
      if (Object.keys(filterParams).length > 0) {
        params.filters = filterParams;
      }
      
      const response = await api.getInsurersList(params);
      
      // Handle response format
      if (Array.isArray(response)) {
        setInsurers(response);
        setTotalCount(response.length);
        setTotalPages(Math.ceil(response.length / itemsPerPage));
      } else {
        setInsurers(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(response.total_pages || 1);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching insurers:", err);
      setError(err.message || "Failed to load insurers");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters/search/sort changes
  }, [searchTerm, filters, sortBy, sortDirection]);

  useEffect(() => {
    fetchInsurers();
  }, [fetchInsurers]);

  const handleAdd = () => {
    setEditingInsurer(null);
    setFormData({
      code: "",
      name: "",
      payer_type: "Private",
      phone: "",
    });
    setShowModal(true);
  };

  const handleEdit = (insurer) => {
    setEditingInsurer(insurer);
    setFormData({
      code: insurer.code || "",
      name: insurer.name || "",
      payer_type: insurer.payer_type || "Private",
      phone: insurer.phone || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (insurerId) => {
    if (!window.confirm("Are you sure you want to delete this insurer? This will fail if the insurer is referenced by patients.")) {
      return;
    }
    try {
      await api.deleteInsurer(insurerId);
      await fetchInsurers();
    } catch (err) {
      alert(err.message || "Failed to delete insurer");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      
      // Validate required fields
      if (!submitData.code || !submitData.name || !submitData.payer_type) {
        alert("Please fill in all required fields: Code, Name, and Payer Type");
        return;
      }
      
      if (editingInsurer) {
        await api.updateInsurer(editingInsurer.insurer_id, submitData);
      } else {
        await api.createInsurer(submitData);
      }
      setShowModal(false);
      await fetchInsurers();
    } catch (err) {
      alert(err.message || "Failed to save insurer");
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      code: "",
      name: "",
      payer_type: "",
    });
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasFilters = Object.values(filters).some(v => v) || searchTerm;

  return (
    <SharedLayout
      title="Insurers"
      subtitle="View and manage insurance providers."
      activePage="insurers"
      showSearch={false}
      showAddNew={false}
    >
      <div className="page-content">
        {error && (
          <div className="page-error">
            {error}
          </div>
        )}

        {/* Search Bar and Add Button */}
        <div className="hp-search-new-container">
          <input
            type="text"
            className="hp-search hp-search--big"
            placeholder="Search insurers by code, name, or payer type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, maxWidth: "600px" }}
          />
          <button className="hp-secondary-btn" onClick={() => setShowFilters(!showFilters)} style={{ marginLeft: "8px" }}>
            🔍 {showFilters ? "Hide Filters" : "Filters"}
          </button>
          <button className="hp-primary-btn" onClick={handleAdd} style={{ marginLeft: "8px" }}>
            + New Insurer
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="page-section" style={{ marginBottom: "20px" }}>
            <h4 style={{ marginBottom: "16px", color: "var(--hp-text-main)" }}>
              🔍 Advanced Search & Filter {hasFilters && <span style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>(Active)</span>}
            </h4>
            <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
              <label>
                Code
                <input
                  type="text"
                  className="hp-search"
                  placeholder="e.g. BCBS"
                  value={filters.code}
                  onChange={(e) => handleFilterChange("code", e.target.value)}
                />
              </label>
              
              <label>
                Name
                <input
                  type="text"
                  className="hp-search"
                  placeholder="Company name"
                  value={filters.name}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                />
              </label>

              <label>
                Payer Type
                <select
                  className="hp-search"
                  value={filters.payer_type}
                  onChange={(e) => handleFilterChange("payer_type", e.target.value)}
                  style={{ padding: "10px" }}
                >
                  <option value="">All Types</option>
                  {payerTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
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

        {/* Insurers List */}
        <div className="page-section">
          <h3>Insurers ({totalCount.toLocaleString()} total)</h3>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
              Loading insurers...
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="page-table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("insurer_id")} style={{ cursor: "pointer" }}>
                        ID {sortBy === "insurer_id" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("code")} style={{ cursor: "pointer" }}>
                        Code {sortBy === "code" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                        Name {sortBy === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th onClick={() => handleSort("payer_type")} style={{ cursor: "pointer" }}>
                        Payer Type {sortBy === "payer_type" && (sortDirection === "asc" ? "↑" : "↓")}
                      </th>
                      <th>Phone</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insurers.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "60px", color: "var(--hp-text-soft)" }}>
                          No insurers found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      insurers.map((insurer) => (
                        <tr key={insurer.insurer_id}>
                          <td>
                            <span className="page-badge">
                              {insurer.insurer_id}
                            </span>
                          </td>
                          <td>
                            <span className="page-badge page-badge--primary">
                              {insurer.code}
                            </span>
                          </td>
                          <td>
                            <Link 
                              to={`/insurers/${insurer.insurer_id}`}
                              style={{ 
                                color: "var(--hp-primary)", 
                                textDecoration: "none",
                                fontWeight: "500"
                              }}
                            >
                              {insurer.name}
                            </Link>
                          </td>
                          <td>{insurer.payer_type}</td>
                          <td>{insurer.phone || "-"}</td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => handleEdit(insurer)}
                                className="hp-primary-btn"
                                style={{ padding: "6px 12px", fontSize: "13px" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(insurer.insurer_id)}
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
                    className="hp-secondary-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    ← Prev
                  </button>
                  <span>
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} insurers
                  </span>
                  <button
                    className="hp-secondary-btn"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="page-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowModal(false);
          }
        }}>
          <div className="page-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingInsurer ? "Edit Insurer" : "Add New Insurer"}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Company Code <span style={{ color: "#dc3545" }}>*</span> (Unique)
                <input
                  type="text"
                  required
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. MEDI-001"
                />
              </label>
              
              <label>
                Company Name <span style={{ color: "#dc3545" }}>*</span>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>
              
              <label>
                Payer Type <span style={{ color: "#dc3545" }}>*</span>
                <select
                  required
                  value={formData.payer_type || "Private"}
                  onChange={(e) => setFormData({ ...formData, payer_type: e.target.value })}
                  style={{ padding: "10px" }}
                >
                  {payerTypeOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              
              <label>
                Phone Number
                <input
                  type="text"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +1-555-0199"
                />
              </label>

              <div className="form-actions">
                <button type="button" className="hp-secondary-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="hp-primary-btn">
                  {editingInsurer ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default InsurersPage;
