import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const DiagnosisDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [diagnosisCodeOptions, setDiagnosisCodeOptions] = useState([]);
  const [diagnosisCodeSearchTerm, setDiagnosisCodeSearchTerm] = useState("");
  const [showDiagnosisCodeDropdown, setShowDiagnosisCodeDropdown] = useState(false);

  const fetchDiagnosis = useCallback(async () => {
    try {
      setLoading(true);
      const diagnosisData = await api.getDiagnosisById(id);
      setDiagnosis(diagnosisData);
      setFormData({
        encounter_id: diagnosisData.encounter_id || "",
        diagnosis_code: diagnosisData.diagnosis_code || "",
        diagnosis_description: diagnosisData.diagnosis_description || "",
        primary_flag: diagnosisData.primary_flag ? "1" : "0",
        chronic_flag: diagnosisData.chronic_flag !== null ? (diagnosisData.chronic_flag ? "1" : "0") : "",
      });
      setDiagnosisCodeSearchTerm(diagnosisData.diagnosis_code || "");
      setError(null);
    } catch (err) {
      console.error("Error fetching diagnosis:", err);
      setError(err.message || "Failed to load diagnosis");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDiagnosis();
  }, [fetchDiagnosis]);

  const fetchDiagnosisCodes = useCallback(async () => {
    try {
      const codes = await api.getDiagnosisCodes();
      setDiagnosisCodeOptions(codes);
    } catch (err) {
      console.error("Error fetching diagnosis codes:", err);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      fetchDiagnosisCodes();
    }
  }, [isEditing, fetchDiagnosisCodes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      submitData.primary_flag = submitData.primary_flag === "1";
      submitData.chronic_flag = submitData.chronic_flag === "" ? null : (submitData.chronic_flag === "1");
      
      await api.updateDiagnosis(id, submitData);
      await fetchDiagnosis();
      setIsEditing(false);
      alert("Diagnosis updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update diagnosis");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete diagnosis ${id}?`)) {
      return;
    }
    try {
      await api.deleteDiagnosis(id);
      navigate("/diagnoses");
    } catch (err) {
      alert(err.message || "Failed to delete diagnosis");
    }
  };

  if (loading) {
    return (
      <SharedLayout
        title="Diagnosis Details"
        subtitle="Loading diagnosis information..."
        activePage="diagnoses"
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
            Loading diagnosis...
        </div>
      </SharedLayout>
    );
  }

  if (error || !diagnosis) {
    return (
      <SharedLayout
        title="Diagnosis Details"
        subtitle="Error loading diagnosis"
        activePage="diagnoses"
      >
        <div className="page-section">
            <div style={{ 
              padding: "20px", 
              backgroundColor: "rgba(220, 53, 69, 0.1)", 
              color: "#dc3545", 
              borderRadius: "8px",
              border: "1px solid rgba(220, 53, 69, 0.3)"
            }}>
              {error || "Diagnosis not found"}
              <br />
              <Link to="/diagnoses" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
                Back to Diagnoses
              </Link>
            </div>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={`Diagnosis: ${diagnosis.diagnosis_id}`}
      subtitle={`${diagnosis.first_name || ""} ${diagnosis.last_name || ""} - ${diagnosis.diagnosis_code}`}
      activePage="diagnoses"
      showSearch={false}
      showAddNew={false}
    >
      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginBottom: "20px" }}>
            {!isEditing ? (
              <>
            <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
                  Edit Diagnosis
                </button>
            <button className="hp-danger-btn" onClick={handleDelete}>
                  Delete
                </button>
            <Link to="/diagnoses" className="hp-secondary-btn">
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
          <h3>Edit Diagnosis</h3>
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
                      Diagnosis Code *
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        required
                        value={diagnosisCodeSearchTerm}
                        onChange={(e) => {
                    const newCode = e.target.value;
                    setDiagnosisCodeSearchTerm(newCode);
                    // Find matching code and update description
                    const matchingCode = diagnosisCodeOptions.find(
                      code => code.diagnosis_code.toLowerCase() === newCode.toLowerCase()
                    );
                    setFormData({ 
                      ...formData, 
                      diagnosis_code: newCode,
                      diagnosis_description: matchingCode ? matchingCode.diagnosis_description || "" : formData.diagnosis_description
                    });
                          setShowDiagnosisCodeDropdown(true);
                        }}
                        onFocus={() => setShowDiagnosisCodeDropdown(true)}
                        placeholder="Select or type diagnosis code..."
                      />
                      {showDiagnosisCodeDropdown && diagnosisCodeOptions.length > 0 && (
                  <div className="page-dropdown">
                          {diagnosisCodeOptions
                            .filter(code => 
                              !diagnosisCodeSearchTerm || 
                              code.diagnosis_code.toLowerCase().includes(diagnosisCodeSearchTerm.toLowerCase()) ||
                              (code.diagnosis_description && code.diagnosis_description.toLowerCase().includes(diagnosisCodeSearchTerm.toLowerCase()))
                            )
                            .map((code) => (
                              <div
                                key={code.diagnosis_code}
                          className="page-dropdown-item"
                                onClick={() => {
                                  setFormData({ 
                                    ...formData, 
                                    diagnosis_code: code.diagnosis_code,
                              diagnosis_description: code.diagnosis_description || "" // Set description from code, make it immutable
                                  });
                                  setDiagnosisCodeSearchTerm(code.diagnosis_code);
                                  setShowDiagnosisCodeDropdown(false);
                                }}
                              >
                                <div style={{ fontWeight: "500" }}>{code.diagnosis_code}</div>
                                {code.diagnosis_description && (
                                  <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                                    {code.diagnosis_description}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
                      Diagnosis Description
                    <textarea
                      value={formData.diagnosis_description || ""}
                readOnly
                disabled
                placeholder="Description is set automatically based on diagnosis code"
                      rows="3"
                style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                title="Description is automatically set based on the selected diagnosis code"
              />
            </label>

            <label>
                        Primary Flag
                      <select
                        value={formData.primary_flag}
                        onChange={(e) => setFormData({ ...formData, primary_flag: e.target.value })}
                      >
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                      </select>
            </label>

            <label>
                        Chronic Flag
                      <select
                        value={formData.chronic_flag}
                        onChange={(e) => setFormData({ ...formData, chronic_flag: e.target.value })}
                      >
                        <option value="">Not Specified</option>
                        <option value="1">Yes</option>
                        <option value="0">No</option>
                      </select>
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
            <h3>Diagnosis Information</h3>
            <table style={{ width: "100%", marginTop: "12px" }}>
                  <tbody>
                    <tr>
                  <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Diagnosis ID:</td>
                  <td style={{ padding: "8px 0" }}>{diagnosis.diagnosis_id}</td>
                    </tr>
                    <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Diagnosis Code:</td>
                      <td style={{ padding: "8px 0", fontWeight: "600" }}>{diagnosis.diagnosis_code}</td>
                    </tr>
                    <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Patient:</td>
                      <td style={{ padding: "8px 0" }}>
                        <Link 
                          to={`/patients/${diagnosis.patient_id}`}
                          style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                        >
                          {diagnosis.first_name} {diagnosis.last_name}
                        </Link>
                        <br />
                        <small style={{ color: "var(--hp-text-soft)" }}>{diagnosis.patient_id}</small>
                      </td>
                    </tr>
                    <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Encounter:</td>
                      <td style={{ padding: "8px 0" }}>
                        <Link 
                          to={`/encounters/${diagnosis.encounter_id}`}
                          style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                        >
                          {diagnosis.encounter_id}
                        </Link>
                      </td>
                    </tr>
                    <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Primary Flag:</td>
                      <td style={{ padding: "8px 0" }}>{diagnosis.primary_flag ? "Yes" : "No"}</td>
                    </tr>
                    <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Chronic Flag:</td>
                      <td style={{ padding: "8px 0" }}>{diagnosis.chronic_flag === null ? "Not Specified" : (diagnosis.chronic_flag ? "Yes" : "No")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

          <div className="page-card">
            <h3>Description</h3>
            <p style={{ color: "var(--hp-text-main)", lineHeight: "1.6", marginTop: "12px" }}>
                  {diagnosis.diagnosis_description || "No description provided"}
                </p>
              </div>
            </div>
          )}
    </SharedLayout>
  );
};

export default DiagnosisDetailPage;

