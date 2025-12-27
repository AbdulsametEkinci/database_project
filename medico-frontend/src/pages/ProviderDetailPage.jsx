import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const ProviderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [departmentHeadSearchTerm, setDepartmentHeadSearchTerm] = useState("");
  const [departmentHeadOptions, setDepartmentHeadOptions] = useState([]);

  const fetchProvider = useCallback(async () => {
    try {
      setLoading(true);
      const providerData = await api.getProviderById(id);
      setProvider(providerData);
      setFormData({
        name: providerData.name || "",
        department: providerData.department || "",
        specialty: providerData.specialty || "",
        npi: providerData.npi || "",
        inhouse: providerData.inhouse ? "1" : "0",
        location: providerData.location || "",
        years_experience: providerData.years_experience || "",
        contact_info: providerData.contact_info || "",
        email: providerData.email || "",
        head_id: providerData.head_id || "",
      });
      
      // Fetch department heads to get the current head info
      try {
        const options = await api.getProvidersDepartmentHeadsOptions("", 1000);
        setDepartmentHeadOptions(options);
        const currentHead = options.find(h => h.head_id === providerData.head_id);
        if (currentHead) {
          setDepartmentHeadSearchTerm(`${currentHead.head_id} - ${currentHead.head_name || ""} (${currentHead.department || ""})`);
        } else {
          setDepartmentHeadSearchTerm("");
        }
      } catch (err) {
        console.error("Error fetching department heads:", err);
        setDepartmentHeadSearchTerm("");
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching provider:", err);
      setError(err.message || "Failed to load provider");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      // Don't send department, specialty, npi, and head_id - they cannot be changed
      delete submitData.department;
      delete submitData.specialty;
      delete submitData.npi;
      delete submitData.head_id;
      
      submitData.inhouse = submitData.inhouse === "1";
      if (submitData.years_experience) {
        submitData.years_experience = parseInt(submitData.years_experience);
      }
      await api.updateProvider(id, submitData);
      await fetchProvider();
      setIsEditing(false);
      alert("Provider updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update provider");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete provider ${id}?`)) {
      return;
    }
    try {
      await api.deleteProvider(id);
      navigate("/providers");
    } catch (err) {
      alert(err.message || "Failed to delete provider");
    }
  };

  if (loading) {
    return (
      <SharedLayout
        title="Provider Details"
        subtitle="Loading provider information..."
        activePage="providers"
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading provider...
        </div>
      </SharedLayout>
    );
  }

  if (error || !provider) {
    return (
      <SharedLayout
        title="Provider Details"
        subtitle="Error loading provider"
        activePage="providers"
      >
        <div className="page-section">
          <div style={{ 
            padding: "20px", 
            backgroundColor: "rgba(220, 53, 69, 0.1)", 
            color: "#dc3545", 
            borderRadius: "8px",
            border: "1px solid rgba(220, 53, 69, 0.3)"
          }}>
            {error || "Provider not found"}
            <br />
            <Link to="/providers" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
              Back to Providers
            </Link>
          </div>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={`Provider: ${provider.provider_id}`}
      subtitle={`${provider.name} - ${provider.specialty}`}
      activePage="providers"
      showSearch={false}
      showAddNew={false}
    >
      <div className="page-content">
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {!isEditing ? (
            <>
              <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
                Edit Provider
              </button>
              <button className="hp-danger-btn" onClick={handleDelete}>
                Delete
              </button>
              <Link to="/providers" className="hp-secondary-btn">
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
          <div className="page-section">
            <h3>Edit Provider Information</h3>
            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Name <span style={{ color: "#dc3545" }}>*</span>
                <input
                  type="text"
                  required
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </label>

              <label>
                Department <span style={{ color: "#dc3545" }}>*</span>
                <input
                  type="text"
                  required
                  value={formData.department || ""}
                  disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Department cannot be changed.
                </small>
              </label>

              <label>
                Specialty <span style={{ color: "#dc3545" }}>*</span>
                <input
                  type="text"
                  required
                  value={formData.specialty || ""}
                  disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Specialty cannot be changed.
                </small>
              </label>

              <label>
                NPI <span style={{ color: "#dc3545" }}>*</span>
                <input
                  type="text"
                  required
                  value={formData.npi || ""}
                  disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  NPI cannot be changed.
                </small>
              </label>

              <label>
                In-House
                <select
                  value={formData.inhouse}
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
                <input
                  type="text"
                  value={departmentHeadSearchTerm}
                  disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--hp-text-soft)", fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Department head cannot be changed.
                </small>
              </label>

              <div className="form-actions">
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="page-section">
              <h3>Provider Information</h3>
              <table className="page-table" style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Provider ID:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600" }}>{provider.provider_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Name:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600" }}>{provider.name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Department:</td>
                    <td style={{ padding: "8px 0" }}>{provider.department}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Specialty:</td>
                    <td style={{ padding: "8px 0" }}>{provider.specialty}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>NPI:</td>
                    <td style={{ padding: "8px 0" }}>{provider.npi}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>In-House:</td>
                    <td style={{ padding: "8px 0" }}>{provider.inhouse ? "Yes" : "No"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="page-section">
              <h3>Contact & Additional Info</h3>
              <table className="page-table" style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Location:</td>
                    <td style={{ padding: "8px 0" }}>{provider.location || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Years of Experience:</td>
                    <td style={{ padding: "8px 0" }}>{provider.years_experience || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Contact Info:</td>
                    <td style={{ padding: "8px 0" }}>{provider.contact_info || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Email:</td>
                    <td style={{ padding: "8px 0" }}>{provider.email || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Department Head:</td>
                    <td style={{ padding: "8px 0" }}>
                      {provider.head_id ? (
                        <Link 
                          to={`/department-heads/${provider.head_id}`}
                          style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                        >
                          {provider.head_name || provider.head_id} {provider.head_specialty ? `- ${provider.head_specialty}` : ""}
                        </Link>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SharedLayout>
  );
};

export default ProviderDetailPage;

