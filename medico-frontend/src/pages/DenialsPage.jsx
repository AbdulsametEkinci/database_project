import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const DenialsPage = () => {
  const [denials, setDenials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingDenial, setEditingDenial] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    denial_id: "",
    claim_id: "",
    denial_reason_code: "",
    denial_date_from: "",
    denial_date_to: "",
    appeal_status: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState("denial_date");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  // Billing options for searchable select (only denied claims not in denials)
  const [billingOptions, setBillingOptions] = useState([]);
  const [billingSearchTerm, setBillingSearchTerm] = useState("");
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  
  // Claim options for searchable select (only insurance claims have claim_id)
  const [claimOptions, setClaimOptions] = useState([]);
  const [claimSearchTerm, setClaimSearchTerm] = useState("");
  const [showClaimDropdown, setShowClaimDropdown] = useState(false);
  
  // Denial reason code options for searchable select
  const [denialReasonCodeOptions, setDenialReasonCodeOptions] = useState([]);
  const [denialReasonCodeSearchTerm, setDenialReasonCodeSearchTerm] = useState("");
  const [showDenialReasonCodeDropdown, setShowDenialReasonCodeDropdown] = useState(false);

  const appealStatusOptions = ["Pending", "Approved", "Rejected", "Under Review", "Denied", "Paid"];

  const fetchDenials = useCallback(async () => {
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
      
      const response = await api.getDenialsList(params);
      
      setDenials(response.data || []);
      setTotalCount(response.total || 0);
      setTotalPages(response.total_pages || 1);
      
      setError(null);
    } catch (err) {
      console.error("Error fetching denials:", err);
      setError(err.message || "Failed to load denials");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortDirection, filters.denial_id, filters.claim_id, filters.denial_reason_code, filters.denial_date_from, filters.denial_date_to, filters.appeal_status]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortDirection, filters.denial_id, filters.claim_id, filters.denial_reason_code, filters.denial_date_from, filters.denial_date_to, filters.appeal_status]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchDenials();
  }, [fetchDenials]);

  // Fetch billing options for denial (only denied claims not in denials)
  const fetchBillingOptions = useCallback(async (search = "") => {
    try {
      const options = await api.getBillingForDenial(search, 50);
      setBillingOptions(options);
    } catch (err) {
      console.error("Error fetching billing options:", err);
    }
  }, []);

  // Fetch claim options (only insurance claims have claim_id)
  const fetchClaimOptions = useCallback(async (search = "") => {
    try {
      const options = await api.getClaimsOptions(search, 50);
      setClaimOptions(options);
    } catch (err) {
      console.error("Error fetching claims:", err);
    }
  }, []);

  // Fetch denial reason codes
  const fetchDenialReasonCodes = useCallback(async () => {
    try {
      const codes = await api.getDenialReasonCodes();
      setDenialReasonCodeOptions(codes);
    } catch (err) {
      console.error("Error fetching denial reason codes:", err);
    }
  }, []);

  useEffect(() => {
    if (showModal && showBillingDropdown) {
      fetchBillingOptions(billingSearchTerm);
    }
  }, [showModal, showBillingDropdown, billingSearchTerm, fetchBillingOptions]);

  useEffect(() => {
    if (showModal && showClaimDropdown) {
      fetchClaimOptions(claimSearchTerm);
    }
  }, [showModal, showClaimDropdown, claimSearchTerm, fetchClaimOptions]);

  useEffect(() => {
    if (showModal) {
      fetchDenialReasonCodes();
    }
  }, [showModal, fetchDenialReasonCodes]);

  const handleAdd = () => {
    setEditingDenial(null);
    setFormData({
      billing_id: "",
      claim_id: "",
      denial_date: new Date().toISOString().slice(0, 10),
      denial_reason_code: "",
      denial_reason_description: "",
      denied_amount: 0,
      appeal_filed: "",
      appeal_status: "",
      appeal_resolution_date: "",
      final_outcome: "",
    });
    setBillingSearchTerm("");
    setShowBillingDropdown(false);
    setClaimSearchTerm("");
    setShowClaimDropdown(false);
    setDenialReasonCodeSearchTerm("");
    setShowDenialReasonCodeDropdown(false);
    setShowModal(true);
  };

  const handleEdit = (denial) => {
    setEditingDenial(denial);
    setFormData({
      appeal_status: denial.appeal_status || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDenial) {
        // Only allow editing appeal_status (denied/paid)
        const submitData = {
          appeal_status: formData.appeal_status,
        };
        await api.updateDenial(editingDenial.denial_id, submitData);
      } else {
        // Generate denial_id from billing_id (BILL000001 = DEN000001)
        const billingId = formData.billing_id;
        if (!billingId || !billingId.startsWith('BILL')) {
          setError("Invalid billing ID. Must start with 'BILL'");
          return;
        }
        const denialId = billingId.replace('BILL', 'DEN');
        
        const submitData = {
          denial_id: denialId,
          billing_id: billingId,
          claim_id: formData.claim_id || null,
          denial_date: formData.denial_date,
          denial_reason_code: formData.denial_reason_code,
          denial_reason_description: formData.denial_reason_description || "",
          denied_amount: parseFloat(formData.denied_amount) || 0,
          appeal_filed: formData.appeal_filed || "",
          appeal_status: formData.appeal_status || "",
          appeal_resolution_date: formData.appeal_resolution_date || null,
          final_outcome: formData.final_outcome || "",
        };
        await api.createDenial(submitData);
      }
      setShowModal(false);
      fetchDenials();
    } catch (err) {
      setError(err.message || "Failed to save denial");
    }
  };

  const handleDelete = async (denial_id) => {
    try {
      await api.deleteDenial(denial_id);
      setDeleteConfirm(null);
      fetchDenials();
    } catch (err) {
      setError(err.message || "Failed to delete denial");
      setDeleteConfirm(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      denial_id: "",
      claim_id: "",
      denial_reason_code: "",
      denial_date_from: "",
      denial_date_to: "",
      appeal_status: "",
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

  // Handle billing selection - auto-populate denial_id, claim_id, denied_amount, denial_date
  const handleBillingSelect = (billing) => {
    const billingId = billing.billing_id;
    const denialId = billingId.replace('BILL', 'DEN');
    
    setFormData({ 
      ...formData, 
      billing_id: billingId,
      claim_id: billing.claim_id || "",
      denied_amount: billing.billed_amount || 0,
      denial_date: billing.claim_billing_date ? new Date(billing.claim_billing_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    });
    setBillingSearchTerm(`${billingId}${billing.patient_name ? ` - ${billing.patient_name}` : ''}`);
    setShowBillingDropdown(false);
  };

  // Handle denial_reason_code selection - auto-populate description
  const handleDenialReasonCodeSelect = (code) => {
    const selectedCode = denialReasonCodeOptions.find(c => c.denial_reason_code === code.denial_reason_code);
    setFormData({ 
      ...formData, 
      denial_reason_code: code.denial_reason_code,
      denial_reason_description: selectedCode?.denial_reason_description || formData.denial_reason_description 
    });
    setDenialReasonCodeSearchTerm(code.denial_reason_code);
    setShowDenialReasonCodeDropdown(false);
  };

  return (
    <SharedLayout
      title="Denials"
      subtitle="Track claim denials, reasons, appeals, and final outcomes."
      activePage="denials"
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
          placeholder="Search denials by ID, claim ID, billing ID, reason, or patient name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: "1", maxWidth: "500px" }}
        />
        <button className="hp-primary-btn" onClick={handleAdd}>
          + New Denial
        </button>
        <button className="hp-secondary-btn" onClick={() => setShowFilters(!showFilters)} style={{ marginLeft: "8px" }}>
          🔍 {showFilters ? "Hide Filters" : "Filters"}
        </button>
      </div>

      {/* Advanced Filters Card */}
      {showFilters && (
        <div className="page-section" style={{ marginBottom: "20px", padding: "16px", background: "var(--hp-bg-soft, #334155)", borderRadius: "12px" }}>
          <h4 style={{ marginBottom: "12px", color: "var(--hp-text-main)" }}>🔍 Advanced Search & Filter {hasFilters && <span style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>(Active)</span>}</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Denial ID</label>
              <input
                type="text"
                className="hp-search"
                placeholder="e.g. DEN000001"
                value={filters.denial_id}
                onChange={(e) => handleFilterChange("denial_id", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Claim ID</label>
              <input
                type="text"
                className="hp-search"
                placeholder="e.g. CLM000001"
                value={filters.claim_id}
                onChange={(e) => handleFilterChange("claim_id", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Denial Reason Code</label>
              <input
                type="text"
                className="hp-search"
                placeholder="e.g. CO-27"
                value={filters.denial_reason_code}
                onChange={(e) => handleFilterChange("denial_reason_code", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Appeal Status</label>
              <select
                className="hp-search"
                value={filters.appeal_status}
                onChange={(e) => handleFilterChange("appeal_status", e.target.value)}
                style={{ width: "100%", padding: "10px" }}
              >
                <option value="">All Statuses</option>
                {appealStatusOptions.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Denial Date From</label>
              <input
                type="date"
                className="hp-search"
                value={filters.denial_date_from}
                onChange={(e) => handleFilterChange("denial_date_from", e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", color: "var(--hp-text-soft)" }}>Denial Date To</label>
              <input
                type="date"
                className="hp-search"
                value={filters.denial_date_to}
                onChange={(e) => handleFilterChange("denial_date_to", e.target.value)}
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
        <h3>Denials ({totalCount.toLocaleString()} total)</h3>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
            Loading denials...
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="page-table">
                <thead>
                  <tr>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("denial_id")}>
                      Denial ID {sortBy === "denial_id" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("claim_id")}>
                      Claim ID {sortBy === "claim_id" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Patient</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("denial_reason_code")}>
                      Reason Code {sortBy === "denial_reason_code" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th style={{ textAlign: "right" }}>Denied Amount</th>
                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("denial_date")}>
                      Denial Date {sortBy === "denial_date" && (sortDirection === "asc" ? "↑" : "↓")}
                    </th>
                    <th>Appeal Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {denials.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--hp-text-soft)" }}>
                        No denials found
                      </td>
                    </tr>
                  ) : (
                    denials.map((denial) => (
                      <tr key={denial.denial_id}>
                        <td>
                          <Link to={`/denials/${denial.denial_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                            {denial.denial_id}
                          </Link>
                        </td>
                        <td>
                          {denial.claim_id ? (
                            <Link to={`/billing/${denial.billing_id || denial.claim_id}`} style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}>
                              {denial.claim_id}
                            </Link>
                          ) : "-"}
                        </td>
                        <td>{denial.first_name} {denial.last_name}</td>
                        <td>{denial.denial_reason_code}</td>
                        <td style={{ textAlign: "right", fontWeight: "500" }}>
                          ${(parseFloat(denial.denied_amount) || 0).toFixed(2)}
                        </td>
                        <td>{denial.denial_date ? new Date(denial.denial_date).toLocaleDateString() : "-"}</td>
                        <td>
                          {denial.appeal_status ? (
                            <span className="page-badge page-badge--primary" style={{
                              backgroundColor: denial.appeal_status === "Approved" || denial.appeal_status === "Paid" ? "rgba(34, 197, 94, 0.1)" : 
                                              denial.appeal_status === "Rejected" || denial.appeal_status === "Denied" ? "rgba(239, 68, 68, 0.1)" :
                                              "rgba(148, 163, 184, 0.1)",
                              color: denial.appeal_status === "Approved" || denial.appeal_status === "Paid" ? "rgb(34, 197, 94)" :
                                      denial.appeal_status === "Rejected" || denial.appeal_status === "Denied" ? "rgb(239, 68, 68)" :
                                      "var(--hp-text-soft)"
                            }}>
                              {denial.appeal_status}
                            </span>
                          ) : "-"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            className="hp-secondary-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(denial);
                            }}
                            style={{ padding: "6px 12px", marginRight: "8px", fontSize: "12px" }}
                          >
                            Edit
                          </button>
                          <button
                            className="hp-danger-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(denial.denial_id);
                            }}
                            style={{ padding: "6px 12px", fontSize: "12px" }}
                          >
                            Delete
                          </button>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="page-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="page-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingDenial ? "Edit Denial" : "Add New Denial"}</h2>
            {editingDenial && (
              <p style={{ color: "var(--hp-text-soft)", fontSize: "14px", marginBottom: "20px" }}>
                Only appeal status can be modified (Denied or Paid).
              </p>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                {editingDenial ? (
                  // Edit mode - only appeal_status
                  <div>
                    <label>
                      Appeal Status <span style={{ color: "#dc3545" }}>*</span>
                    </label>
                    <select
                      className="hp-search"
                      value={formData.appeal_status}
                      onChange={(e) => setFormData({ ...formData, appeal_status: e.target.value })}
                      required
                      style={{ padding: "10px" }}
                    >
                      <option value="">Select...</option>
                      <option value="Denied">Denied</option>
                      <option value="Paid">Paid</option>
                      {appealStatusOptions.filter(s => s !== "Denied" && s !== "Paid").map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  // Add mode - full form
                  <>
                    <div>
                      <label>
                        Billing ID <span style={{ color: "#dc3545" }}>*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          className="hp-search"
                          placeholder="Search billing ID (only denied claims not in denials)..."
                          value={billingSearchTerm}
                          onChange={(e) => {
                            setBillingSearchTerm(e.target.value);
                            setShowBillingDropdown(true);
                            fetchBillingOptions(e.target.value);
                          }}
                          onFocus={() => {
                            setShowBillingDropdown(true);
                            if (!billingOptions.length) fetchBillingOptions("");
                          }}
                          required
                        />
                        {showBillingDropdown && billingOptions.length > 0 && (
                          <div className="page-dropdown" style={{ maxHeight: "200px", overflowY: "auto" }}>
                            {billingOptions.map((billing) => (
                              <div
                                key={billing.billing_id}
                                className="page-dropdown-item"
                                onClick={() => handleBillingSelect(billing)}
                                style={{ cursor: "pointer", padding: "8px 12px" }}
                              >
                                <div style={{ fontWeight: "500" }}>{billing.billing_id}</div>
                                {billing.claim_id && (
                                  <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                                    Claim: {billing.claim_id}
                                  </div>
                                )}
                                {billing.patient_name && (
                                  <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                                    Patient: {billing.patient_name}
                                  </div>
                                )}
                                <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                                  Amount: ${(billing.billed_amount || 0).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {formData.billing_id && formData.billing_id.startsWith('BILL') && (
                        <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", display: "block", marginTop: "4px" }}>
                          Denial ID will be: {formData.billing_id.replace('BILL', 'DEN')}
                        </small>
                      )}
                    </div>

                    <div>
                      <label>Claim ID (Auto-filled from billing)</label>
                      <input
                        type="text"
                        className="hp-search"
                        placeholder="Auto-filled from billing selection"
                        value={formData.claim_id || ""}
                        readOnly
                        style={{ backgroundColor: "var(--hp-bg-soft)", cursor: "not-allowed" }}
                      />
                      {!formData.claim_id && (
                        <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", display: "block", marginTop: "4px" }}>
                          Claim ID will be auto-filled when billing is selected (if insurance claim)
                        </small>
                      )}
                    </div>

                    <div>
                      <label>
                        Denial Date <span style={{ color: "#dc3545" }}>*</span>
                      </label>
                      <input
                        type="date"
                        className="hp-search"
                        value={formData.denial_date}
                        onChange={(e) => setFormData({ ...formData, denial_date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label>
                        Denial Reason Code <span style={{ color: "#dc3545" }}>*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          className="hp-search"
                          value={denialReasonCodeSearchTerm}
                          onChange={(e) => {
                            setDenialReasonCodeSearchTerm(e.target.value);
                            setFormData({ ...formData, denial_reason_code: e.target.value });
                            setShowDenialReasonCodeDropdown(true);
                          }}
                          onFocus={() => {
                            setShowDenialReasonCodeDropdown(true);
                            if (!denialReasonCodeOptions.length) fetchDenialReasonCodes();
                          }}
                          required
                          placeholder="Select or type denial reason code..."
                        />
                        {showDenialReasonCodeDropdown && denialReasonCodeOptions.length > 0 && (
                          <div className="page-dropdown">
                            {denialReasonCodeOptions
                              .filter(code => 
                                !denialReasonCodeSearchTerm || 
                                code.denial_reason_code?.toLowerCase().includes(denialReasonCodeSearchTerm.toLowerCase()) ||
                                code.denial_reason_description?.toLowerCase().includes(denialReasonCodeSearchTerm.toLowerCase())
                              )
                              .map((code) => (
                                <div
                                  key={code.denial_reason_code}
                                  className="page-dropdown-item"
                                  onClick={() => handleDenialReasonCodeSelect(code)}
                                >
                                  <div style={{ fontWeight: "500" }}>{code.denial_reason_code}</div>
                                  {code.denial_reason_description && (
                                    <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                                      {code.denial_reason_description}
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <label>Denial Reason Description</label>
                      <textarea
                        className="hp-search"
                        value={formData.denial_reason_description || ""}
                        onChange={(e) => setFormData({ ...formData, denial_reason_description: e.target.value })}
                        placeholder="Detailed description (auto-filled from reason code)"
                        rows="3"
                        style={{ resize: "vertical" }}
                        readOnly
                      />
                    </div>

                    <div>
                      <label>
                        Denied Amount <span style={{ color: "#dc3545" }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="hp-search"
                        value={formData.denied_amount}
                        onChange={(e) => setFormData({ ...formData, denied_amount: e.target.value })}
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <label>Appeal Filed</label>
                      <select
                        className="hp-search"
                        value={formData.appeal_filed}
                        onChange={(e) => setFormData({ ...formData, appeal_filed: e.target.value })}
                        style={{ padding: "10px" }}
                      >
                        <option value="">Select...</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    {formData.appeal_filed === "yes" && (
                      <>
                        <div>
                          <label>Appeal Status</label>
                          <select
                            className="hp-search"
                            value={formData.appeal_status}
                            onChange={(e) => setFormData({ ...formData, appeal_status: e.target.value })}
                            style={{ padding: "10px" }}
                          >
                            <option value="">Select...</option>
                            {appealStatusOptions.map((status) => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label>Appeal Resolution Date</label>
                          <input
                            type="date"
                            className="hp-search"
                            value={formData.appeal_resolution_date}
                            onChange={(e) => setFormData({ ...formData, appeal_resolution_date: e.target.value })}
                          />
                        </div>

                        <div>
                          <label>Final Outcome</label>
                          <input
                            type="text"
                            className="hp-search"
                            value={formData.final_outcome}
                            onChange={(e) => setFormData({ ...formData, final_outcome: e.target.value })}
                            placeholder="Final outcome of appeal"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
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
                  {editingDenial ? "Update" : "Create"}
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
              Are you sure you want to delete this denial? This action cannot be undone.
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

export default DenialsPage;
