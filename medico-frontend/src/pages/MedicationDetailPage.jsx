import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const MedicationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [medication, setMedication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

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

  const fetchMedication = useCallback(async () => {
    try {
      setLoading(true);
      const medicationData = await api.getMedicationById(id);
      setMedication(medicationData);
      const normalizedDate = normalizeDate(medicationData.prescribed_date);
      setFormData({
        encounter_id: medicationData.encounter_id || "",
        drug_name: medicationData.drug_name || "",
        dosage: medicationData.dosage || "",
        route: medicationData.route || "",
        frequency: medicationData.frequency || "",
        duration: medicationData.duration || "",
        prescribed_date: normalizedDate || "",
        prescriber_id: medicationData.prescriber_id || "",
        cost: medicationData.cost || 0,
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching medication:", err);
      setError(err.message || "Failed to load medication");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMedication();
  }, [fetchMedication]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      submitData.cost = parseFloat(submitData.cost) || 0;
      
      if (!submitData.prescribed_date && medication) {
        const originalDate = normalizeDate(medication.prescribed_date);
        if (originalDate) {
          submitData.prescribed_date = originalDate;
        }
      }
      
      await api.updateMedication(id, submitData);
      await fetchMedication();
      setIsEditing(false);
      alert("Medication updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update medication");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete medication ${id}?`)) {
      return;
    }
    try {
      await api.deleteMedication(id);
      navigate("/medications");
    } catch (err) {
      alert(err.message || "Failed to delete medication");
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
        title="Medication Details"
        subtitle="Loading medication information..."
        activePage="medications"
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading medication...
        </div>
      </SharedLayout>
    );
  }

  if (error || !medication) {
    return (
      <SharedLayout
        title="Medication Details"
        subtitle="Error loading medication"
        activePage="medications"
      >
        <div className="page-section">
          <div style={{ 
            padding: "20px", 
            backgroundColor: "rgba(220, 53, 69, 0.1)", 
            color: "#dc3545", 
            borderRadius: "8px",
            border: "1px solid rgba(220, 53, 69, 0.3)"
          }}>
            {error || "Medication not found"}
            <br />
            <Link to="/medications" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
              Back to Medications
            </Link>
          </div>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={`Medication: ${medication.medication_id}`}
      subtitle={`${medication.first_name || ""} ${medication.last_name || ""} - ${formatDate(medication.prescribed_date)}`}
      activePage="medications"
      showSearch={false}
      showAddNew={false}
    >
      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginBottom: "20px" }}>
        {!isEditing ? (
          <>
            <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
              Edit Medication
            </button>
            <button className="hp-danger-btn" onClick={handleDelete}>
              Delete
            </button>
            <Link to="/medications" className="hp-secondary-btn">
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
          <h3>Edit Medication</h3>
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
              Drug Name *
              <input
                type="text"
                required
                value={formData.drug_name || ""}
                onChange={(e) => setFormData({ ...formData, drug_name: e.target.value })}
              />
            </label>

            <label>
              Dosage
              <input
                type="text"
                value={formData.dosage || ""}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g. 500mg"
              />
            </label>

            <label>
              Route
              <input
                type="text"
                value={formData.route || ""}
                onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                placeholder="e.g. Oral, IV"
              />
            </label>

            <label>
              Frequency
              <input
                type="text"
                value={formData.frequency || ""}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="e.g. Twice daily"
              />
            </label>

            <label>
              Duration
              <input
                type="text"
                value={formData.duration || ""}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="e.g. 7 days"
              />
            </label>

            <label>
              Prescriber
              <input
                type="text"
                value={medication.prescriber_name || medication.prescriber_id || ""}
                readOnly
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </label>

            <label>
              Prescribed Date
              <input
                type="date"
                value={formData.prescribed_date || ""}
                onChange={(e) => setFormData({ ...formData, prescribed_date: e.target.value })}
              />
            </label>

            <label>
              Cost
              <input
                type="number"
                step="0.01"
                value={formData.cost || 0}
                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
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
            <h3>Medication Information</h3>
            <table style={{ width: "100%", marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Medication ID:</td>
                  <td style={{ padding: "8px 0" }}>{medication.medication_id}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Drug Name:</td>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>{medication.drug_name}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Patient:</td>
                  <td style={{ padding: "8px 0" }}>
                    <Link 
                      to={`/patients/${medication.patient_id}`}
                      style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                    >
                      {medication.first_name} {medication.last_name}
                    </Link>
                    <br />
                    <small style={{ color: "var(--hp-text-soft)" }}>{medication.patient_id}</small>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Encounter:</td>
                  <td style={{ padding: "8px 0" }}>
                    <Link 
                      to={`/encounters/${medication.encounter_id}`}
                      style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                    >
                      {medication.encounter_id}
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Prescriber:</td>
                  <td style={{ padding: "8px 0" }}>
                    {medication.prescriber_name || medication.prescriber_id || "N/A"}
                    {medication.prescriber_specialty && (
                      <>
                        <br />
                        <small style={{ color: "var(--hp-text-soft)" }}>{medication.prescriber_specialty}</small>
                      </>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Prescribed Date:</td>
                  <td style={{ padding: "8px 0" }}>{formatDate(medication.prescribed_date)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="page-card">
            <h3>Prescription Details</h3>
            <table style={{ width: "100%", marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Dosage:</td>
                  <td style={{ padding: "8px 0" }}>{medication.dosage || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Route:</td>
                  <td style={{ padding: "8px 0" }}>{medication.route || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Frequency:</td>
                  <td style={{ padding: "8px 0" }}>{medication.frequency || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Duration:</td>
                  <td style={{ padding: "8px 0" }}>{medication.duration || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Cost:</td>
                  <td style={{ padding: "8px 0", fontWeight: "600", fontSize: "16px" }}>
                    ${(parseFloat(medication.cost) || 0).toFixed(2)}
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

export default MedicationDetailPage;

