import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const ProcedureDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [procedureCodeOptions, setProcedureCodeOptions] = useState([]);
  const [procedureCodeSearchTerm, setProcedureCodeSearchTerm] = useState("");
  const [showProcedureCodeDropdown, setShowProcedureCodeDropdown] = useState(false);

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

  const fetchProcedure = useCallback(async () => {
    try {
      setLoading(true);
      const procedureData = await api.getProcedureById(id);
      setProcedure(procedureData);
      const normalizedDate = normalizeDate(procedureData.procedure_date);
      setFormData({
        encounter_id: procedureData.encounter_id || "",
        procedure_code: procedureData.procedure_code || "",
        procedure_description: procedureData.procedure_description || "",
        procedure_date: normalizedDate || "",
        provider_id: procedureData.provider_id || "",
        procedure_cost: procedureData.procedure_cost || 0,
      });
      setProcedureCodeSearchTerm(procedureData.procedure_code || "");
      setError(null);
    } catch (err) {
      console.error("Error fetching procedure:", err);
      setError(err.message || "Failed to load procedure");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProcedure();
  }, [fetchProcedure]);

  const fetchProcedureCodes = useCallback(async () => {
    try {
      const codes = await api.getProcedureCodes();
      setProcedureCodeOptions(codes);
    } catch (err) {
      console.error("Error fetching procedure codes:", err);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      fetchProcedureCodes();
    }
  }, [isEditing, fetchProcedureCodes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      submitData.procedure_cost = parseFloat(submitData.procedure_cost) || 0;
      
      if (!submitData.procedure_date && procedure) {
        const originalDate = normalizeDate(procedure.procedure_date);
        if (originalDate) {
          submitData.procedure_date = originalDate;
        }
      }
      
      await api.updateProcedure(id, submitData);
      await fetchProcedure();
      setIsEditing(false);
      alert("Procedure updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update procedure");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete procedure ${id}?`)) {
      return;
    }
    try {
      await api.deleteProcedure(id);
      navigate("/procedures");
    } catch (err) {
      alert(err.message || "Failed to delete procedure");
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
        title="Procedure Details"
        subtitle="Loading procedure information..."
        activePage="procedures"
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading procedure...
        </div>
      </SharedLayout>
    );
  }

  if (error || !procedure) {
    return (
      <SharedLayout
        title="Procedure Details"
        subtitle="Error loading procedure"
        activePage="procedures"
      >
        <div className="page-section">
          <div style={{ 
            padding: "20px", 
            backgroundColor: "rgba(220, 53, 69, 0.1)", 
            color: "#dc3545", 
            borderRadius: "8px",
            border: "1px solid rgba(220, 53, 69, 0.3)"
          }}>
            {error || "Procedure not found"}
            <br />
            <Link to="/procedures" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
              Back to Procedures
            </Link>
          </div>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={`Procedure: ${procedure.procedure_id}`}
      subtitle={`${procedure.first_name || ""} ${procedure.last_name || ""} - ${formatDate(procedure.procedure_date)}`}
      activePage="procedures"
      showSearch={false}
      showAddNew={false}
    >
      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginBottom: "20px" }}>
        {!isEditing ? (
          <>
            <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
              Edit Procedure
            </button>
            <button className="hp-danger-btn" onClick={handleDelete}>
              Delete
            </button>
            <Link to="/procedures" className="hp-secondary-btn">
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
          <h3>Edit Procedure</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Encounter ID
              <input
                type="text"
                value={formData.encounter_id || ""}
                readOnly
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </label>

            <label>
              Procedure Code *
              <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    required
                    value={procedureCodeSearchTerm}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setProcedureCodeSearchTerm(newCode);
                      // Find matching code and update description
                      const matchingCode = procedureCodeOptions.find(
                        code => code.procedure_code.toLowerCase() === newCode.toLowerCase()
                      );
                      setFormData({ 
                        ...formData, 
                        procedure_code: newCode,
                        procedure_description: matchingCode ? matchingCode.procedure_description || "" : formData.procedure_description
                      });
                      setShowProcedureCodeDropdown(true);
                    }}
                    onFocus={() => setShowProcedureCodeDropdown(true)}
                    placeholder="Select or type procedure code..."
                  />
                {showProcedureCodeDropdown && procedureCodeOptions.length > 0 && (
                  <div className="page-dropdown">
                    {procedureCodeOptions
                      .filter(code => 
                        !procedureCodeSearchTerm || 
                        code.procedure_code.toLowerCase().includes(procedureCodeSearchTerm.toLowerCase()) ||
                        (code.procedure_description && code.procedure_description.toLowerCase().includes(procedureCodeSearchTerm.toLowerCase()))
                      )
                      .map((code) => (
                        <div
                          key={code.procedure_code}
                          className="page-dropdown-item"
                          onClick={() => {
                            setFormData({ 
                              ...formData, 
                              procedure_code: code.procedure_code,
                              procedure_description: code.procedure_description || "" // Set description from code, make it immutable
                            });
                            setProcedureCodeSearchTerm(code.procedure_code);
                            setShowProcedureCodeDropdown(false);
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>{code.procedure_code}</div>
                          {code.procedure_description && (
                            <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                              {code.procedure_description}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Procedure Description
              <textarea
                value={formData.procedure_description || ""}
                readOnly
                disabled
                placeholder="Description is set automatically based on procedure code"
                rows="3"
                style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                title="Description is automatically set based on the selected procedure code"
              />
            </label>

            <label>
              Provider
              <input
                type="text"
                value={procedure.provider_name || procedure.provider_id || ""}
                readOnly
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </label>

            <label>
              Procedure Date
              <input
                type="date"
                value={formData.procedure_date || ""}
                onChange={(e) => setFormData({ ...formData, procedure_date: e.target.value })}
              />
            </label>

            <label>
              Procedure Cost
              <input
                type="number"
                step="0.01"
                value={formData.procedure_cost || 0}
                onChange={(e) => setFormData({ ...formData, procedure_cost: parseFloat(e.target.value) || 0 })}
              />
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
        <div className="page-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="page-card">
            <h3>Procedure Information</h3>
            <table style={{ width: "100%", marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Procedure ID:</td>
                  <td style={{ padding: "8px 0" }}>{procedure.procedure_id}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Procedure Code:</td>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>{procedure.procedure_code}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Patient:</td>
                  <td style={{ padding: "8px 0" }}>
                    <Link 
                      to={`/patients/${procedure.patient_id}`}
                      style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                    >
                      {procedure.first_name} {procedure.last_name}
                    </Link>
                    <br />
                    <small style={{ color: "var(--hp-text-soft)" }}>{procedure.patient_id}</small>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Encounter:</td>
                  <td style={{ padding: "8px 0" }}>
                    <Link 
                      to={`/encounters/${procedure.encounter_id}`}
                      style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                    >
                      {procedure.encounter_id}
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Provider:</td>
                  <td style={{ padding: "8px 0" }}>
                    {procedure.provider_name || procedure.provider_id || "N/A"}
                    {procedure.provider_specialty && (
                      <>
                        <br />
                        <small style={{ color: "var(--hp-text-soft)" }}>{procedure.provider_specialty}</small>
                      </>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Procedure Date:</td>
                  <td style={{ padding: "8px 0" }}>{formatDate(procedure.procedure_date)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="page-card">
            <h3>Procedure Details</h3>
            <table style={{ width: "100%", marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Description:</td>
                  <td style={{ padding: "8px 0" }}>{procedure.procedure_description || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Cost:</td>
                  <td style={{ padding: "8px 0", fontWeight: "600", fontSize: "16px" }}>
                    ${(parseFloat(procedure.procedure_cost) || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default ProcedureDetailPage;

