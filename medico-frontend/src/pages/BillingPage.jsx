import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const BillingPage = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    billing_id: "",
    encounter_id: "",
    claim_status: "",
    billed_amount_min: "",
    billed_amount_max: "",
    claim_date_from: "",
    claim_date_to: "",
    payment_method: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("claim_billing_date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;


  const claimStatusOptions = ["Pending", "Approved", "Denied", "Under Review", "Paid", "Rejected"];
  const paymentMethodOptions = ["selfpay", "insurance"];

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

  const fetchClaims = useCallback(async () => {
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
      
      const response = await api.getClaimsList(params);
      
      setClaims(response.data || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching claims:", err);
      setError(err.message || "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters.billing_id, filters.encounter_id, filters.claim_status, filters.billed_amount_min, filters.billed_amount_max, filters.claim_date_from, filters.claim_date_to, filters.payment_method]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortDirection, filters.billing_id, filters.encounter_id, filters.claim_status, filters.billed_amount_min, filters.billed_amount_max, filters.claim_date_from, filters.claim_date_to, filters.payment_method]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);


  const handleEdit = (claim) => {
    setEditingClaim(claim);
    setFormData({
      claim_status: claim.claim_status || "Pending",
      payment_method: claim.payment_method || "insurance",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Only allow editing claim_status and payment_method
      const submitData = {
        claim_status: formData.claim_status,
        payment_method: formData.payment_method,
      };

      await api.updateClaim(editingClaim.billing_id, submitData);
      setShowModal(false);
      fetchClaims();
    } catch (err) {
      setError(err.message || "Failed to update claim");
    }
  };

  const handleDelete = async (billing_id) => {
    try {
      await api.deleteClaim(billing_id);
      setDeleteConfirm(null);
      fetchClaims();
    } catch (err) {
      setError(err.message || "Failed to delete claim");
      setDeleteConfirm(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      billing_id: "",
      encounter_id: "",
      claim_status: "",
      billed_amount_min: "",
      billed_amount_max: "",
      claim_date_from: "",
      claim_date_to: "",
      payment_method: "",
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
      title="Billing & Claims"
      subtitle="Manage billing, claims, and payment information."
      activePage="billing"
      showSearch={false}
      showAddNew={false}
    >
      {error && (
        <div className="page-section" style={{ marginBottom: "16px", padding: "12px", backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545", borderRadius: "8px", border: "1px solid rgba(220, 53, 69, 0.3)" }}>
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="hp-search-new-container" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
        <input
          className="hp-search hp-search--big"
          placeholder="Search claims by ID, encounter ID, patient name, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1", maxWidth: "500px" }}
        />
        <button className="hp-secondary-btn" onClick={() => setShowFilters(!showFilters)}>
          🔍 {showFilters ? "Hide Filters" : "Filters"}
        </button>
      </div>

      {/* Advanced Filters Card */}
      {showFilters && (
        <div className="page-section" style={{ marginBottom: "20px", padding: "16px", background: "var(--hp-bg-soft, #334155)", borderRadius: "12px" }}>
          <h4 style={{ marginBottom: "12px", color: "var(--hp-text-main)" }}>🔍 Advanced Search & Filter {hasFilters && <span style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>(Active)</span>}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Billing ID</label>
              <input
                type="text"
                className="hp-search"
                placeholder="e.g. BILL000001"
                value={filters.billing_id}
                onChange={(e) => handleFilterChange("billing_id", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Encounter ID</label>
              <input
                type="text"
                className="hp-search"
                placeholder="e.g. ENC000001"
                value={filters.encounter_id}
                onChange={(e) => handleFilterChange("encounter_id", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Claim Status</label>
              <select
                className="hp-search"
                value={filters.claim_status}
                onChange={(e) => handleFilterChange("claim_status", e.target.value)}
                style={{ width: "100%", padding: "10px" }}
              >
                <option value="">All Statuses</option>
                {claimStatusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Min Billed Amount</label>
              <input
                type="number"
                className="hp-search"
                placeholder="0.00"
                value={filters.billed_amount_min}
                onChange={(e) => handleFilterChange("billed_amount_min", e.target.value)}
                style={{ width: "100%" }}
                step="0.01"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Max Billed Amount</label>
              <input
                type="number"
                className="hp-search"
                placeholder="0.00"
                value={filters.billed_amount_max}
                onChange={(e) => handleFilterChange("billed_amount_max", e.target.value)}
                style={{ width: "100%" }}
                step="0.01"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Payment Method</label>
              <input
                type="text"
                className="hp-search"
                placeholder="e.g. Insurance, Cash"
                value={filters.payment_method}
                onChange={(e) => handleFilterChange("payment_method", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Date From</label>
              <input
                type="date"
                className="hp-search"
                value={filters.claim_date_from}
                onChange={(e) => handleFilterChange("claim_date_from", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Date To</label>
              <input
                type="date"
                className="hp-search"
                value={filters.claim_date_to}
                onChange={(e) => handleFilterChange("claim_date_to", e.target.value)}
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

      {/* Table */}
      <div className="page-section">
        <h3>Claims & Billing ({totalCount.toLocaleString()} total)</h3>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
            Loading claims...
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="page-table">
                <thead>
                  <tr>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("billing_id")}>
                      Billing ID {sortBy === "billing_id" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("encounter_id")}>
                      Encounter {sortBy === "encounter_id" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Patient</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("claim_billing_date")}>
                      Claim Date {sortBy === "claim_billing_date" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ cursor: "pointer", textAlign: "right" }} onClick={() => handleSort("billed_amount")}>
                      Billed Amount {sortBy === "billed_amount" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ textAlign: "right" }}>Paid Amount</th>
                    <th style={{ textAlign: "right" }}>Outstanding</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("claim_status")}>
                      Status {sortBy === "claim_status" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px", color: "var(--hp-text-soft)" }}>
                        No claims found
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => {
                      const outstanding = (parseFloat(claim.billed_amount) || 0) - (parseFloat(claim.paid_amount) || 0);
                      return (
                        <tr key={claim.billing_id}>
                          <td>
                            <Link to={`/billing/${claim.billing_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                              {claim.billing_id}
                            </Link>
                          </td>
                          <td>
                            <Link to={`/encounters/${claim.encounter_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                              {claim.encounter_id}
                            </Link>
                          </td>
                          <td>{claim.first_name} {claim.last_name}</td>
                          <td>{claim.claim_billing_date ? new Date(claim.claim_billing_date).toLocaleDateString() : "-"}</td>
                          <td style={{ textAlign: "right", fontWeight: "500" }}>
                            ${(parseFloat(claim.billed_amount) || 0).toFixed(2)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            ${(parseFloat(claim.paid_amount) || 0).toFixed(2)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "600", color: outstanding > 0 ? "var(--hp-primary)" : "var(--hp-text-soft)" }}>
                            ${outstanding.toFixed(2)}
                          </td>
                          <td>
                            <span className="page-badge page-badge--primary" style={{
                              backgroundColor: claim.claim_status === "Approved" || claim.claim_status === "Paid" ? "rgba(34, 197, 94, 0.1)" : 
                                              claim.claim_status === "Denied" || claim.claim_status === "Rejected" ? "rgba(239, 68, 68, 0.1)" :
                                              "rgba(148, 163, 184, 0.1)",
                              color: claim.claim_status === "Approved" || claim.claim_status === "Paid" ? "rgb(34, 197, 94)" :
                                      claim.claim_status === "Denied" || claim.claim_status === "Rejected" ? "rgb(239, 68, 68)" :
                                      "var(--hp-text-soft)"
                            }}>
                              {claim.claim_status}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="hp-secondary-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(claim);
                              }}
                              style={{ padding: "6px 12px", marginRight: "8px", fontSize: "12px" }}
                            >
                              Edit
                            </button>
                            <button
                              className="hp-danger-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm(claim.billing_id);
                              }}
                              style={{ padding: "6px 12px", fontSize: "12px" }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="page-pagination">
                <button
                  className="hp-secondary-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
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
                  Next
                </button>
                <span style={{ marginLeft: "16px", color: "var(--hp-text-soft)", fontSize: "14px" }}>
                  Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal - Only claim_status and payment_method can be edited */}
      {showModal && editingClaim && (
        <div className="page-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="page-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Claim</h2>
            <p style={{ color: "var(--hp-text-soft)", fontSize: "14px", marginBottom: "20px" }}>
              Only claim status and payment method can be modified. Billing records are automatically created when encounters have procedures with costs.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div>
                  <label>
                    Claim Status <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <select
                    className="hp-search"
                    value={formData.claim_status}
                    onChange={(e) => setFormData({ ...formData, claim_status: e.target.value })}
                    required
                    style={{ padding: "10px" }}
                  >
                    {claimStatusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>
                    Payment Method <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <select
                    className="hp-search"
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    required
                    style={{ padding: "10px" }}
                  >
                    {paymentMethodOptions.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="hp-secondary-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="hp-primary-btn"
                >
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
          <div className="page-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p style={{ color: "var(--hp-text-soft)" }}>
              Are you sure you want to delete this claim? This action cannot be undone.
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

export default BillingPage;
