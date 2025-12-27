import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const DepartmentHeadDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [head, setHead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [providerOptions, setProviderOptions] = useState([]);
  const [providerSearchTerm, setProviderSearchTerm] = useState("");
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);

  const fetchDepartmentHead = useCallback(async () => {
    try {
      setLoading(true);
      const headData = await api.getDepartmentHeadById(id);
      setHead(headData);
      setFormData({
        department: headData.department || "",
        head_provider_id: headData.head_provider_id || "",
        head_name: headData.head_name || "",
        head_email: headData.head_email || "",
      });
      
      // Fetch providers filtered by the department for this head
      if (headData.department) {
        const options = await api.getProvidersOptions("", 1000);
        const filteredOptions = options.filter(provider => 
          provider.department && provider.department.toLowerCase() === headData.department.toLowerCase()
        );
        setProviderOptions(filteredOptions);
        const currentProvider = filteredOptions.find(p => p.provider_id === headData.head_provider_id);
        setProviderSearchTerm(currentProvider ? `${currentProvider.provider_id} - ${currentProvider.name}` : headData.head_provider_id || "");
      } else {
        setProviderSearchTerm(headData.head_provider_id || "");
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching department head:", err);
      setError(err.message || "Failed to load department head");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDepartmentHead();
  }, [fetchDepartmentHead]);

  // Fetch provider options
  const fetchProviderOptions = useCallback(async (search = "") => {
    try {
      const options = await api.getProvidersOptions(search, 1000);
      // Filter providers by department
      const filteredOptions = options.filter(provider => 
        provider.department && provider.department.toLowerCase() === formData.department.toLowerCase()
      );
      setProviderOptions(filteredOptions);
    } catch (err) {
      console.error("Error fetching providers:", err);
    }
  }, [formData.department]);

  // Debounce provider search
  useEffect(() => {
    if (isEditing && showProviderDropdown) {
      const timer = setTimeout(() => {
        if (providerSearchTerm === "") {
          if (providerOptions.length > 0) {
            return;
          }
        }
        fetchProviderOptions(providerSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEditing, showProviderDropdown, providerSearchTerm, fetchProviderOptions, providerOptions.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // When editing, only send head_provider_id (backend will auto-fill name and email)
      const submitData = {
        head_provider_id: formData.head_provider_id
      };
      await api.updateDepartmentHead(id, submitData);
      await fetchDepartmentHead();
      setIsEditing(false);
      alert("Department head updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update department head");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete department head ${id}?`)) {
      return;
    }
    try {
      await api.deleteDepartmentHead(id);
      navigate("/department-heads");
    } catch (err) {
      alert(err.message || "Failed to delete department head");
    }
  };

  if (loading) {
    return (
      <SharedLayout
        title="Department Head Details"
        subtitle="Loading department head information..."
        activePage="departmentheads"
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading department head...
        </div>
      </SharedLayout>
    );
  }

  if (error || !head) {
    return (
      <SharedLayout
        title="Department Head Details"
        subtitle="Error loading department head"
        activePage="departmentheads"
      >
        <div className="page-section">
          <div style={{ 
            padding: "20px", 
            backgroundColor: "rgba(220, 53, 69, 0.1)", 
            color: "#dc3545", 
            borderRadius: "8px",
            border: "1px solid rgba(220, 53, 69, 0.3)"
          }}>
            {error || "Department head not found"}
            <br />
            <Link to="/department-heads" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
              Back to Department Heads
            </Link>
          </div>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={`Department Head: ${head.head_id}`}
      subtitle={`${head.department} - ${head.head_name || ""}`}
      activePage="departmentheads"
      showSearch={false}
      showAddNew={false}
    >
      <div className="page-content">
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {!isEditing ? (
            <>
              <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
                Edit Department Head
              </button>
              <button className="hp-danger-btn" onClick={handleDelete}>
                Delete
              </button>
              <Link to="/department-heads" className="hp-secondary-btn">
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
            <h3>Edit Department Head Information</h3>
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
                        fetchProviderOptions("");
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
              <h3>Department Head Information</h3>
              <table className="page-table" style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Head ID:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600" }}>{head.head_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Department:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600" }}>{head.department}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Provider ID:</td>
                    <td style={{ padding: "8px 0" }}>
                      {head.head_provider_id ? (
                        <Link 
                          to={`/providers/${head.head_provider_id}`}
                          style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                        >
                          {head.head_provider_id}
                        </Link>
                      ) : (
                        "N/A"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500" }}>Head Name:</td>
                    <td style={{ padding: "8px 0" }}>{head.head_name || "N/A"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="page-section">
              <h3>Contact Information</h3>
              <table className="page-table" style={{ width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500" }}>Email:</td>
                    <td style={{ padding: "8px 0" }}>{head.head_email || "N/A"}</td>
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

export default DepartmentHeadDetailPage;

