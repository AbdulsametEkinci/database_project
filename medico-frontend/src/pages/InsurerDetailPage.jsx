import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const InsurerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [insurer, setInsurer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const payerTypeOptions = ["Private", "Public", "Medicare", "Medicaid"];

  const fetchInsurer = useCallback(async () => {
    try {
      setLoading(true);
      const insurerData = await api.getInsurerById(id);
      setInsurer(insurerData);
      setFormData({
        code: insurerData.code || "",
        name: insurerData.name || "",
        payer_type: insurerData.payer_type || "Private",
        phone: insurerData.phone || "",
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching insurer:", err);
      setError(err.message || "Failed to load insurer");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInsurer();
  }, [fetchInsurer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      
      // Validate required fields
      if (!submitData.code || !submitData.name || !submitData.payer_type) {
        alert("Please fill in all required fields: Code, Name, and Payer Type");
        return;
      }
      
      await api.updateInsurer(id, submitData);
      await fetchInsurer();
      setIsEditing(false);
      alert("Insurer updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update insurer");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete insurer ${id}? This action cannot be undone and will fail if the insurer is referenced by patients.`)) {
      return;
    }
    try {
      await api.deleteInsurer(id);
      navigate("/insurers");
    } catch (err) {
      alert(err.message || "Failed to delete insurer");
    }
  };

  if (loading) {
    return (
      <SharedLayout
        title="Insurer Details"
        subtitle="Loading insurer information..."
        activePage="insurers"
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading insurer details...
        </div>
      </SharedLayout>
    );
  }

  if (error || !insurer) {
    return (
      <SharedLayout
        title="Insurer Details"
        subtitle="Error loading insurer"
        activePage="insurers"
      >
        <div className="page-section">
          <div style={{ 
            padding: "20px", 
            backgroundColor: "rgba(220, 53, 69, 0.1)", 
            color: "#dc3545", 
            borderRadius: "8px",
            border: "1px solid rgba(220, 53, 69, 0.3)"
          }}>
            {error || "Insurer not found"}
            <br />
            <Link to="/insurers" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
              Back to Insurers
            </Link>
          </div>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={insurer.name}
      subtitle="Insurance company details and information"
      activePage="insurers"
      showSearch={false}
      showAddNew={false}
    >
      <div className="page-content">
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {!isEditing ? (
            <>
              <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
                Edit Insurer
              </button>
              <button className="hp-danger-btn" onClick={handleDelete}>
                Delete
              </button>
              <Link to="/insurers" className="hp-secondary-btn">
                Back to List
              </Link>
            </>
          ) : (
            <>
              <button className="hp-secondary-btn" onClick={() => {
                setIsEditing(false);
                fetchInsurer(); // Reset form data
              }}>
                Cancel
              </button>
              <button className="hp-primary-btn" onClick={handleSubmit}>
                Save Changes
              </button>
            </>
          )}
        </div>

        {isEditing ? (
          <div className="page-section">
            <h3>Edit Insurer</h3>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Company Code <span style={{ color: "#dc3545" }}>*</span> (Unique)
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. MEDI-001"
                />
              </label>
              
              <label>
                Company Name <span style={{ color: "#dc3545" }}>*</span>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>
              
              <label>
                Payer Type <span style={{ color: "#dc3545" }}>*</span>
                <select
                  required
                  value={formData.payer_type}
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
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +1-555-0199"
                />
              </label>

              <div className="form-actions">
                <button type="button" className="hp-secondary-btn" onClick={() => {
                  setIsEditing(false);
                  fetchInsurer();
                }}>
                  Cancel
                </button>
                <button type="submit" className="hp-primary-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="page-section">
              <h3>Insurer Information</h3>
              <table className="page-table" style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Insurer ID:</td>
                    <td style={{ padding: "8px 0" }}>{insurer.insurer_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Code:</td>
                    <td style={{ padding: "8px 0" }}>
                      <span className="page-badge page-badge--primary">
                        {insurer.code}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Name:</td>
                    <td style={{ padding: "8px 0", fontWeight: "500", color: "var(--hp-text-main)" }}>{insurer.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Payer Type:</td>
                    <td style={{ padding: "8px 0" }}>{insurer.payer_type}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Phone:</td>
                    <td style={{ padding: "8px 0" }}>{insurer.phone || "N/A"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="page-section" style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              backgroundColor: "rgba(148, 163, 184, 0.05)",
              minHeight: "200px"
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "64px", marginBottom: "16px" }}>🏢</div>
                <p style={{ color: "var(--hp-text-soft)", margin: 0 }}>Insurance Provider Details</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SharedLayout>
  );
};

export default InsurerDetailPage;

