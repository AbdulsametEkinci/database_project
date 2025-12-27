import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import SharedLayout from "../components/SharedLayout";
import "../pages/HomePage.css";
import "./Pages.css";

const EncounterDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [relatedData, setRelatedData] = useState({
    medications: [],
    procedures: [],
    diagnoses: [],
    lab_tests: [],
    claims: []
  });

  const statusOptions = ["Scheduled", "Completed", "In Progress", "Cancelled", "Discharged"];
  const visitTypeOptions = ["Emergency", "Outpatient", "Inpatient", "Surgery", "Follow-up", "Telehealth"];

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
    fetchEncounter();
    fetchOptions();
    fetchRelatedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEncounter = async () => {
    try {
      setLoading(true);
      const encounterData = await api.getEncounterById(id);
      setEncounter(encounterData);
      const normalizedVisitDate = normalizeDate(encounterData.visit_date);
      setFormData({
        patient_id: encounterData.patient_id || "",
        provider_id: encounterData.provider_id || "",
        visit_date: normalizedVisitDate || "",
        visit_type: encounterData.visit_type || "",
        department: encounterData.department || "",
        reason_for_visit: encounterData.reason_for_visit || "",
        diagnosis_code: encounterData.diagnosis_code || "",
        admission_type: encounterData.admission_type || "",
        discharge_date: normalizeDate(encounterData.discharge_date),
        length_of_stay: encounterData.length_of_stay || 0,
        status: encounterData.status || "Scheduled",
        readmitted_flag: encounterData.readmitted_flag || false,
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching encounter:", err);
      setError(err.message || "Failed to load encounter");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [patientsData, providersData] = await Promise.all([
        api.getPatientsOptions("", 100),
        api.getProvidersOptions("", 100),
      ]);
      setPatients(patientsData || []);
      setProviders(providersData || []);
    } catch (err) {
      console.error("Error fetching options:", err);
    }
  };

  const fetchRelatedData = async () => {
    try {
      const data = await api.getEncounterRelated(id);
      setRelatedData(data || {
        medications: [],
        procedures: [],
        diagnoses: [],
        lab_tests: [],
        claims: []
      });
    } catch (err) {
      console.error("Error fetching related data:", err);
    }
  };

  const handleProviderChange = (providerId) => {
    const provider = providers.find(p => p.provider_id === providerId);
    setFormData({
      ...formData,
      provider_id: providerId,
      department: provider?.department || formData.department,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (!submitData.discharge_date) submitData.discharge_date = null;
      
      // Remove diagnosis_code from submit data - it can only be changed in Diagnoses page
      delete submitData.diagnosis_code;
      
      if (!submitData.visit_date && encounter) {
        const originalVisitDate = normalizeDate(encounter.visit_date);
        if (originalVisitDate) {
          submitData.visit_date = originalVisitDate;
        }
      }
      
      await api.updateEncounter(id, submitData);
      await fetchEncounter();
      setIsEditing(false);
      alert("Encounter updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update encounter");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete encounter ${id}? This will fail if the encounter has linked billing records.`)) {
      return;
    }
    try {
      await api.deleteEncounter(id);
      navigate("/encounters");
    } catch (err) {
      alert(err.message || "Failed to delete encounter");
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
        subtitle="Fetching encounter details"
        activePage="encounters"
        showSearch={false}
        showAddNew={false}
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading encounter...
        </div>
      </SharedLayout>
    );
  }

  if (error || !encounter) {
    return (
      <SharedLayout
        title="Error"
        subtitle="Encounter not found"
        activePage="encounters"
        showSearch={false}
        showAddNew={false}
      >
        <div className="page-section" style={{ backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545", borderColor: "rgba(220, 53, 69, 0.3)" }}>
          {error || "Encounter not found"}
          <br />
          <Link to="/encounters" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
            Back to Encounters
          </Link>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={`Encounter: ${encounter.encounter_id}`}
      subtitle={`${encounter.patient_first_name} ${encounter.patient_last_name} - ${formatDate(encounter.visit_date)}`}
      activePage="encounters"
      showSearch={false}
      showAddNew={false}
    >
      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", justifyContent: "flex-end" }}>
        {!isEditing ? (
          <>
            <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
              Edit Encounter
            </button>
            <button
              onClick={handleDelete}
              className="hp-danger-btn"
            >
              Delete
            </button>
            <Link to="/encounters" className="hp-secondary-btn">
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
          <h2 style={{ marginTop: 0, marginBottom: "24px" }}>Edit Encounter</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "24px" }}>
              <h5 style={{ color: "var(--hp-primary)", marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
                1. Patient & Provider
              </h5>
              <div className="form-grid">
                <div>
                  <label>
                    Patient
                  </label>
                  <input
                    type="text"
                    value={encounter.patient_first_name + " " + encounter.patient_last_name + " (" + encounter.patient_id + ")"}
                    readOnly
                    className="hp-search"
                    style={{ width: "100%", opacity: 0.7, cursor: "not-allowed" }}
                  />
                </div>
                <div>
                  <label>
                    Select Provider *
                  </label>
                  <select
                    required
                    value={formData.provider_id || ""}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="hp-search"
                    style={{ width: "100%", padding: "10px" }}
                  >
                    <option value="">Select a provider...</option>
                    {providers.map((provider) => (
                      <option key={provider.provider_id} value={provider.provider_id}>
                        {provider.name} ({provider.specialty})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h5 style={{ color: "var(--hp-primary)", marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
                2. Visit Details
              </h5>
              <div className="form-grid">
                <label>
                  Visit Date
                  <input
                    type="date"
                    value={formData.visit_date || ""}
                    onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                  />
                </label>
                <label>
                  Visit Type
                  <select
                    value={formData.visit_type || ""}
                    onChange={(e) => setFormData({ ...formData, visit_type: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {visitTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Department (Auto)
                  <input
                    type="text"
                    value={formData.department || ""}
                    readOnly
                    placeholder="Auto-filled"
                    style={{ opacity: 0.7, cursor: "not-allowed" }}
                  />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  Reason for Visit
                  <textarea
                    value={formData.reason_for_visit || ""}
                    onChange={(e) => setFormData({ ...formData, reason_for_visit: e.target.value })}
                    rows={3}
                    placeholder="e.g. Chest pain, Follow-up..."
                  />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h5 style={{ color: "var(--hp-primary)", marginBottom: "16px", fontSize: "16px", fontWeight: "600" }}>
                3. Clinical & Status
              </h5>
              <div className="form-grid">
                <label>
                  Diagnosis Code (ICD)
                  <input
                    type="text"
                    value={formData.diagnosis_code || ""}
                    readOnly
                    disabled
                    placeholder="Edit in Diagnoses page"
                    style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                    title="Diagnosis code can only be changed in the Diagnoses page"
                  />
                </label>
                <label>
                  Status *
                  <select
                    required
                    value={formData.status || "Scheduled"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Admission Type
                  <select
                    value={formData.admission_type || ""}
                    onChange={(e) => setFormData({ ...formData, admission_type: e.target.value })}
                  >
                    <option value="">None</option>
                    <option value="Elective">Elective</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </label>
                <label>
                  Discharge Date
                  <input
                    type="date"
                    value={formData.discharge_date || ""}
                    onChange={(e) => setFormData({ ...formData, discharge_date: e.target.value })}
                  />
                </label>
                <label>
                  Length of Stay (Days)
                  <input
                    type="number"
                    min="0"
                    value={formData.length_of_stay || 0}
                    onChange={(e) => setFormData({ ...formData, length_of_stay: parseInt(e.target.value) || 0 })}
                  />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.readmitted_flag || false}
                    onChange={(e) => setFormData({ ...formData, readmitted_flag: e.target.checked })}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  Patient Readmitted?
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="hp-secondary-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="hp-primary-btn"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Encounter Information and Visit Details Cards */}
          <div className="page-grid" style={{ marginBottom: "24px" }}>
            <div className="page-card">
              <h3>📋 Encounter Information</h3>
              <table style={{ width: "100%", marginTop: "12px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Encounter ID:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600" }}>{encounter.encounter_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Patient:</td>
                    <td style={{ padding: "8px 0" }}>
                      <Link 
                        to={`/patients/${encounter.patient_id}`}
                        style={{ color: "var(--hp-accent)", textDecoration: "none", fontWeight: "500" }}
                      >
                        {encounter.patient_first_name} {encounter.patient_last_name}
                      </Link>
                      <br />
                      <small style={{ color: "var(--hp-text-soft)" }}>{encounter.patient_id}</small>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Provider:</td>
                    <td style={{ padding: "8px 0" }}>{encounter.provider_name || encounter.provider_id || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Visit Date:</td>
                    <td style={{ padding: "8px 0" }}>{formatDate(encounter.visit_date)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Visit Type:</td>
                    <td style={{ padding: "8px 0" }}>{encounter.visit_type || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Department:</td>
                    <td style={{ padding: "8px 0" }}>{encounter.department || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Status:</td>
                    <td style={{ padding: "8px 0" }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: encounter.status === "Completed" ? "rgba(34, 197, 94, 0.2)" : "rgba(251, 191, 36, 0.2)",
                        color: encounter.status === "Completed" ? "#22c55e" : "#fbbf24",
                      }}>
                        {encounter.status || "N/A"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="page-card">
              <h3>🏥 Visit Details</h3>
              <table style={{ width: "100%", marginTop: "12px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Reason for Visit:</td>
                    <td style={{ padding: "8px 0" }}>{encounter.reason_for_visit || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Diagnosis Code:</td>
                    <td style={{ padding: "8px 0" }}>{encounter.diagnosis_code || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Admission Type:</td>
                    <td style={{ padding: "8px 0" }}>{encounter.admission_type || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Discharge Date:</td>
                    <td style={{ padding: "8px 0" }}>{formatDate(encounter.discharge_date)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Length of Stay:</td>
                    <td style={{ padding: "8px 0" }}>{encounter.length_of_stay || 0} days</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Readmitted:</td>
                    <td style={{ padding: "8px 0" }}>
                      <span style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: encounter.readmitted_flag ? "rgba(251, 191, 36, 0.2)" : "rgba(34, 197, 94, 0.2)",
                        color: encounter.readmitted_flag ? "#fbbf24" : "#22c55e",
                      }}>
                        {encounter.readmitted_flag ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Related Data Sections */}
          {/* Medications */}
          <div className="page-section" style={{ marginTop: "24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>💊 Medications</h3>
            {relatedData.medications.length === 0 ? (
              <p style={{ color: "var(--hp-text-soft)" }}>No medications found for this encounter.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="page-table">
                  <thead>
                    <tr>
                      <th>Drug Name</th>
                      <th>Dosage</th>
                      <th>Route</th>
                      <th>Frequency</th>
                      <th>Prescriber</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.medications.map((med) => (
                      <tr key={med.medication_id}>
                        <td>{med.drug_name}</td>
                        <td>{med.dosage || "N/A"}</td>
                        <td>{med.route || "N/A"}</td>
                        <td>{med.frequency || "N/A"}</td>
                        <td>{med.prescriber_name || "N/A"}</td>
                        <td>{formatDate(med.prescribed_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Procedures */}
          <div className="page-section" style={{ marginTop: "24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>🔬 Procedures</h3>
            {relatedData.procedures.length === 0 ? (
              <p style={{ color: "var(--hp-text-soft)" }}>No procedures found for this encounter.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="page-table">
                  <thead>
                    <tr>
                      <th>Procedure Code</th>
                      <th>Description</th>
                      <th>Provider</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.procedures.map((proc) => (
                      <tr key={proc.procedure_id}>
                        <td>{proc.procedure_code}</td>
                        <td>{proc.procedure_description || "N/A"}</td>
                        <td>{proc.provider_name || "N/A"}</td>
                        <td>{formatDate(proc.procedure_date)}</td>
                        <td style={{ textAlign: "right" }}>${(parseFloat(proc.procedure_cost) || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Diagnoses */}
          <div className="page-section" style={{ marginTop: "24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>🩺 Diagnoses</h3>
            {relatedData.diagnoses.length === 0 ? (
              <p style={{ color: "var(--hp-text-soft)" }}>No diagnoses found for this encounter.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="page-table">
                  <thead>
                    <tr>
                      <th>Diagnosis Code</th>
                      <th>Description</th>
                      <th>Primary</th>
                      <th>Chronic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.diagnoses.map((diag) => (
                      <tr key={diag.diagnosis_id}>
                        <td>{diag.diagnosis_code}</td>
                        <td>{diag.diagnosis_description || "N/A"}</td>
                        <td>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
                            backgroundColor: diag.primary_flag ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)",
                            color: diag.primary_flag ? "#22c55e" : "var(--hp-text-soft)",
                          }}>
                            {diag.primary_flag ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
                            backgroundColor: diag.chronic_flag ? "rgba(251, 191, 36, 0.2)" : "rgba(148, 163, 184, 0.2)",
                            color: diag.chronic_flag ? "#fbbf24" : "var(--hp-text-soft)",
                          }}>
                            {diag.chronic_flag ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Lab Tests */}
          <div className="page-section" style={{ marginTop: "24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>🧪 Lab Tests</h3>
            {relatedData.lab_tests.length === 0 ? (
              <p style={{ color: "var(--hp-text-soft)" }}>No lab tests found for this encounter.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="page-table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Code</th>
                      <th>Result</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.lab_tests.map((test) => (
                      <tr key={test.test_id}>
                        <td>{test.test_name}</td>
                        <td>{test.test_code}</td>
                        <td>{test.test_result || "N/A"}</td>
                        <td>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
                            backgroundColor: test.status === "Completed" ? "rgba(34, 197, 94, 0.2)" : "rgba(148, 163, 184, 0.2)",
                            color: test.status === "Completed" ? "#22c55e" : "var(--hp-text-soft)",
                          }}>
                            {test.status}
                          </span>
                        </td>
                        <td>{formatDate(test.test_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Claims */}
          <div className="page-section" style={{ marginTop: "24px" }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>💰 Claims & Billing</h3>
            {relatedData.claims.length === 0 ? (
              <p style={{ color: "var(--hp-text-soft)" }}>No claims found for this encounter.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="page-table">
                  <thead>
                    <tr>
                      <th>Billing ID</th>
                      <th>Claim Date</th>
                      <th style={{ textAlign: "right" }}>Billed</th>
                      <th style={{ textAlign: "right" }}>Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedData.claims.map((claim) => (
                      <tr key={claim.billing_id}>
                        <td>
                          <Link 
                            to={`/billing/${claim.billing_id}`}
                            style={{ 
                              color: "var(--hp-accent)", 
                              textDecoration: "none",
                              fontWeight: "500"
                            }}
                          >
                            {claim.billing_id}
                          </Link>
                        </td>
                        <td>{claim.claim_billing_date ? new Date(claim.claim_billing_date).toLocaleDateString() : "N/A"}</td>
                        <td style={{ textAlign: "right" }}>${(parseFloat(claim.billed_amount) || 0).toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>${(parseFloat(claim.paid_amount) || 0).toFixed(2)}</td>
                        <td>
                          <span style={{
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </SharedLayout>
  );
};

export default EncounterDetailPage;

