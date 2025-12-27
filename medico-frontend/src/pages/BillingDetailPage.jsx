import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const BillingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [denial, setDenial] = useState(null);

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

  useEffect(() => {
    fetchClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchClaim = async () => {
    try {
      setLoading(true);
      const claimData = await api.getClaimById(id);
      setClaim(claimData);
      const normalizedDate = normalizeDate(claimData.claim_billing_date);
      setFormData({
        claim_status: claimData.claim_status || "Pending",
        payment_method: claimData.payment_method || "insurance",
      });

      // Fetch denial if claim_id exists
      if (claimData.claim_id) {
        try {
          const denialData = await api.getDenialByClaimId(claimData.claim_id);
          setDenial(denialData);
        } catch {
          setDenial(null);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching claim:", err);
      setError(err.message || "Failed to load claim");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Only allow editing claim_status and payment_method
      const submitData = {
        claim_status: formData.claim_status,
        payment_method: formData.payment_method,
      };
      
      await api.updateClaim(id, submitData);
      await fetchClaim();
      setIsEditing(false);
      alert("Claim updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update claim");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete claim ${id}? This will fail if the claim has linked denial records.`)) {
      return;
    }
    try {
      await api.deleteClaim(id);
      navigate("/billing");
    } catch (err) {
      alert(err.message || "Failed to delete claim");
    }
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

  if (loading) {
    return (
      <SharedLayout
        title="Loading..."
        subtitle="Loading claim details..."
        activePage="billing"
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading claim...
        </div>
      </SharedLayout>
    );
  }

  if (error || !claim) {
    return (
      <SharedLayout
        title="Error"
        subtitle={error || "Claim not found"}
        activePage="billing"
      >
        <div style={{ 
          padding: "20px", 
          backgroundColor: "rgba(220, 53, 69, 0.1)", 
          color: "#dc3545", 
          borderRadius: "8px",
          border: "1px solid rgba(220, 53, 69, 0.3)"
        }}>
          {error || "Claim not found"}
          <br />
          <Link to="/billing" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
            Back to Claims
          </Link>
        </div>
      </SharedLayout>
    );
  }

  const outstanding = (parseFloat(claim.billed_amount) || 0) - (parseFloat(claim.paid_amount) || 0);

  return (
    <SharedLayout
      title={`Claim: ${claim.billing_id}`}
      subtitle={`${claim.first_name} ${claim.last_name} - ${formatDate(claim.claim_billing_date)}`}
      activePage="billing"
      showSearch={false}
      showAddNew={false}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px" }}>
        {!isEditing ? (
          <>
            <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
              Edit Claim
            </button>
            <button
              onClick={handleDelete}
              className="hp-danger-btn"
            >
              Delete
            </button>
            <Link to="/billing" className="hp-secondary-btn">
              Back to List
            </Link>
          </>
        ) : (
          <>
            <button className="hp-secondary-btn" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
            <button className="hp-primary-btn" onClick={handleSubmit}>
              Save Changes
            </button>
          </>
        )}
      </div>

      {isEditing ? (
        <div className="page-section page-form">
          <h3>Edit Claim Information</h3>
          <p style={{ color: "var(--hp-text-soft)", fontSize: "14px", marginBottom: "20px" }}>
            Only claim status and payment method can be modified. Billing records are automatically created when encounters have procedures with costs.
          </p>
          <form onSubmit={handleSubmit} className="form-grid">
            <div>
              <label>
                Claim Status <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <select
                required
                value={formData.claim_status || ""}
                onChange={(e) => setFormData({ ...formData, claim_status: e.target.value })}
                className="hp-search"
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
                required
                value={formData.payment_method || ""}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="hp-search"
                style={{ padding: "10px" }}
              >
                {paymentMethodOptions.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>
            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="hp-secondary-btn" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="hp-primary-btn">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
            <div className="page-section">
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "var(--hp-primary)", fontSize: "18px" }}>
                Claim Information
              </h3>
              <table style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Billing ID:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600" }}>{claim.billing_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Claim ID:</td>
                    <td style={{ padding: "8px 0" }}>{claim.claim_id || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Patient:</td>
                    <td style={{ padding: "8px 0" }}>
                      <Link 
                        to={`/patients/${claim.patient_id}`}
                        style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                      >
                        {claim.first_name} {claim.last_name}
                      </Link>
                      <br />
                      <small style={{ color: "var(--hp-text-soft)" }}>{claim.patient_id}</small>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Encounter:</td>
                    <td style={{ padding: "8px 0" }}>
                      <Link 
                        to={`/encounters/${claim.encounter_id}`}
                        style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                      >
                        {claim.encounter_id}
                      </Link>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Billing Date:</td>
                    <td style={{ padding: "8px 0" }}>{formatDate(claim.claim_billing_date)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Status:</td>
                    <td style={{ padding: "8px 0" }}>
                      <span className="page-badge page-badge--primary" style={{
                        backgroundColor: claim.claim_status === "Approved" || claim.claim_status === "Paid" ? "rgba(34, 197, 94, 0.2)" : 
                                        claim.claim_status === "Denied" || claim.claim_status === "Rejected" ? "rgba(239, 68, 68, 0.2)" :
                                        "rgba(148, 163, 184, 0.2)",
                        color: claim.claim_status === "Approved" || claim.claim_status === "Paid" ? "#22c55e" :
                                claim.claim_status === "Denied" || claim.claim_status === "Rejected" ? "#ef4444" :
                                "var(--hp-text-soft)",
                      }}>
                        {claim.claim_status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="page-section">
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "var(--hp-primary)", fontSize: "18px" }}>
                Billing Details
              </h3>
              <table style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Insurance Provider:</td>
                    <td style={{ padding: "8px 0" }}>{claim.insurance_provider || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Payment Method:</td>
                    <td style={{ padding: "8px 0" }}>{claim.payment_method || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Billed Amount:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600", fontSize: "16px" }}>${(parseFloat(claim.billed_amount) || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Paid Amount:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600", fontSize: "16px" }}>${(parseFloat(claim.paid_amount) || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Outstanding:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600", fontSize: "16px", color: outstanding > 0 ? "var(--hp-primary)" : "var(--hp-text-soft)" }}>
                      ${outstanding.toFixed(2)}
                    </td>
                  </tr>
                  {claim.denial_reason && (
                    <tr>
                      <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Denial Reason:</td>
                      <td style={{ padding: "8px 0" }}>{claim.denial_reason}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Denial Section */}
          {denial && (
            <div className="page-section">
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "var(--hp-primary)", fontSize: "18px" }}>
                Related Denial
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <table style={{ width: "100%" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Denial ID:</td>
                        <td style={{ padding: "8px 0" }}>
                          <Link 
                            to={`/denials/${denial.denial_id}`}
                            style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                          >
                            {denial.denial_id}
                          </Link>
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Claim ID:</td>
                        <td style={{ padding: "8px 0" }}>{denial.claim_id}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Denial Date:</td>
                        <td style={{ padding: "8px 0" }}>{formatDate(denial.denial_date)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Denied Amount:</td>
                        <td style={{ padding: "8px 0", fontWeight: "600", fontSize: "16px", color: "#ef4444" }}>
                          ${(parseFloat(denial.denied_amount) || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <table style={{ width: "100%" }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Reason Code:</td>
                        <td style={{ padding: "8px 0" }}>{denial.denial_reason_code}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Appeal Filed:</td>
                        <td style={{ padding: "8px 0" }}>{denial.appeal_filed || "N/A"}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Appeal Status:</td>
                        <td style={{ padding: "8px 0" }}>
                          {denial.appeal_status ? (
                            <span className="page-badge page-badge--primary" style={{
                              backgroundColor: denial.appeal_status === "Approved" ? "rgba(34, 197, 94, 0.2)" : 
                                              denial.appeal_status === "Rejected" ? "rgba(239, 68, 68, 0.2)" :
                                              "rgba(148, 163, 184, 0.2)",
                              color: denial.appeal_status === "Approved" ? "#22c55e" :
                                      denial.appeal_status === "Rejected" ? "#ef4444" :
                                      "var(--hp-text-soft)",
                            }}>
                              {denial.appeal_status}
                            </span>
                          ) : "N/A"}
                        </td>
                      </tr>
                      {denial.denial_reason_description && (
                        <tr>
                          <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Description:</td>
                          <td style={{ padding: "8px 0" }}>{denial.denial_reason_description}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </SharedLayout>
  );
};

export default BillingDetailPage;

