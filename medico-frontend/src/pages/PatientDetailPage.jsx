import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../services/api";
import SharedLayout from "../components/SharedLayout";
import "../pages/HomePage.css";
import "./Pages.css";

const PatientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [insurers, setInsurers] = useState([]);

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
    fetchPatient();
    fetchInsurers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const patientData = await api.getPatientById(id);
      setPatient(patientData);
      const dob = normalizeDate(patientData.dob);
      
      setFormData({
        first_name: patientData.first_name || "",
        last_name: patientData.last_name || "",
        dob: dob,
        age: patientData.age || "",
        gender: patientData.gender || "",
        ethnicity: patientData.ethnicity || "",
        insurance_type: patientData.insurance_type || "",
        marital_status: patientData.marital_status || "",
        address: patientData.address || "",
        city: patientData.city || "",
        state: patientData.state || "",
        zip: patientData.zip || "",
        phone: patientData.phone || "",
        email: patientData.email || "",
        registration_date: normalizeDate(patientData.registration_date),
      });
      
      // Fetch encounters for this patient
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('limit', '10000');
        queryParams.append('page', '1');
        queryParams.append('patient_id', id);
        const response = await fetch(`/api/encounters/?${queryParams}`);
        if (response.ok) {
          const encountersData = await response.json();
          if (Array.isArray(encountersData)) {
            setEncounters(encountersData);
          } else if (encountersData && encountersData.data) {
            setEncounters(encountersData.data);
          } else {
            setEncounters([]);
          }
        }
      } catch (err) {
        console.error("Error fetching encounters:", err);
        setEncounters([]);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching patient:", err);
      setError(err.message || "Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  const fetchInsurers = async () => {
    try {
      const data = await api.getInsurers();
      setInsurers(data || []);
    } catch (err) {
      console.error("Error fetching insurers:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      delete submitData.age;
      
      if (!submitData.first_name || !submitData.last_name || !submitData.gender) {
        alert("Please fill in all required fields: First Name, Last Name, and Gender");
        return;
      }
      
      if (!submitData.dob && patient) {
        const originalDob = normalizeDate(patient.dob);
        if (originalDob) {
          submitData.dob = originalDob;
        }
      }
      
      await api.updatePatient(id, submitData);
      await fetchPatient();
      setIsEditing(false);
      alert("Patient updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update patient");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete patient ${id}? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deletePatient(id);
      navigate("/patients");
    } catch (err) {
      alert(err.message || "Failed to delete patient");
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
        subtitle="Fetching patient details"
        activePage="patients"
        showSearch={false}
        showAddNew={false}
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading patient...
        </div>
      </SharedLayout>
    );
  }

  if (error || !patient) {
    return (
      <SharedLayout
        title="Error"
        subtitle="Patient not found"
        activePage="patients"
        showSearch={false}
        showAddNew={false}
      >
        <div className="page-section" style={{ backgroundColor: "rgba(220, 53, 69, 0.1)", color: "#dc3545", borderColor: "rgba(220, 53, 69, 0.3)" }}>
          {error || "Patient not found"}
          <br />
          <Link to="/patients" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
            Back to Patients
          </Link>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={`${patient.first_name} ${patient.last_name}`}
      subtitle={`Patient ID: ${patient.patient_id}`}
      activePage="patients"
      showSearch={false}
      showAddNew={false}
    >
      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", justifyContent: "flex-end" }}>
        {!isEditing ? (
          <>
            <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
              Edit Patient
            </button>
            <button
              onClick={handleDelete}
              className="hp-danger-btn"
            >
              Delete
            </button>
            <Link to="/patients" className="hp-secondary-btn">
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
          <h2 style={{ marginTop: 0, marginBottom: "24px" }}>Edit Patient</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ marginBottom: "24px" }}>
              <label>
                First Name *
                <input
                  type="text"
                  required
                  value={formData.first_name || ""}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </label>
              <label>
                Last Name *
                <input
                  type="text"
                  required
                  value={formData.last_name || ""}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </label>
              <label>
                Date of Birth
                <input
                  type="date"
                  value={formData.dob || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, dob: e.target.value });
                  }}
                />
              </label>
              <label>
                Age (Auto-calculated from DOB)
                <input
                  type="text"
                  value={formData.age ? `${formData.age} years` : "Will be calculated from Date of Birth"}
                  readOnly
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                  title="Age is automatically calculated from Date of Birth using SQL TIMESTAMPDIFF"
                />
              </label>
              <label>
                Gender *
                <select
                  value={formData.gender || ""}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </label>
              <label>
                Ethnicity
                <input
                  type="text"
                  value={formData.ethnicity || ""}
                  onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                />
              </label>
              <label>
                Insurance Provider
                <select
                  value={formData.insurance_type || ""}
                  onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value })}
                >
                  <option value="">No Insurance</option>
                  {insurers.map((insurer) => (
                    <option key={insurer.code} value={insurer.code}>
                      {insurer.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Marital Status
                <select
                  value={formData.marital_status || ""}
                  onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed/Divorced/Separated">Widowed/Divorced/Separated</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                Address
                <input
                  type="text"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </label>
              <label>
                City
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </label>
              <label>
                State
                <input
                  type="text"
                  value={formData.state || ""}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </label>
              <label>
                ZIP Code
                <input
                  type="text"
                  value={formData.zip || ""}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                />
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </label>
              <label>
                Registration Date
                <input
                  type="date"
                  value={formData.registration_date || ""}
                  onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                />
              </label>
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
          {/* Personal Information and Contact Cards */}
          <div className="page-grid" style={{ marginBottom: "24px" }}>
            <div className="page-card">
              <h3>👤 Personal Information</h3>
              <table style={{ width: "100%", marginTop: "12px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Patient ID:</td>
                    <td style={{ padding: "8px 0", fontWeight: "600" }}>{patient.patient_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Name:</td>
                    <td style={{ padding: "8px 0" }}>{patient.first_name} {patient.last_name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Date of Birth:</td>
                    <td style={{ padding: "8px 0" }}>{formatDate(patient.dob)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Age:</td>
                    <td style={{ padding: "8px 0" }}>{patient.age || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Gender:</td>
                    <td style={{ padding: "8px 0" }}>
                      {patient.gender === 'Male' && '♂️ '}
                      {patient.gender === 'Female' && '♀️ '}
                      {patient.gender || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Ethnicity:</td>
                    <td style={{ padding: "8px 0" }}>{patient.ethnicity || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Marital Status:</td>
                    <td style={{ padding: "8px 0" }}>{patient.marital_status || "N/A"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="page-card">
              <h3>📞 Contact & Insurance</h3>
              <table style={{ width: "100%", marginTop: "12px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Address:</td>
                    <td style={{ padding: "8px 0" }}>{patient.address || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>City:</td>
                    <td style={{ padding: "8px 0" }}>{patient.city || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>State:</td>
                    <td style={{ padding: "8px 0" }}>{patient.state || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>ZIP:</td>
                    <td style={{ padding: "8px 0" }}>{patient.zip || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Phone:</td>
                    <td style={{ padding: "8px 0" }}>{patient.phone || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Email:</td>
                    <td style={{ padding: "8px 0" }}>{patient.email || "N/A"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Insurance:</td>
                    <td style={{ padding: "8px 0" }}>{patient.insurance_name || patient.insurance_type || "No Insurance"}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Registration Date:</td>
                    <td style={{ padding: "8px 0" }}>{formatDate(patient.registration_date)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Encounters Table */}
          <div className="page-section">
            <h3 style={{ marginTop: 0, marginBottom: "20px" }}>📋 Encounters</h3>
            {encounters.length === 0 ? (
              <p style={{ color: "var(--hp-text-soft)" }}>No encounters found for this patient.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="page-table">
                  <thead>
                    <tr>
                      <th>Encounter ID</th>
                      <th>Visit Date</th>
                      <th>Type</th>
                      <th>Department</th>
                      <th>Provider</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encounters.map((encounter) => (
                      <tr key={encounter.encounter_id}>
                        <td>
                          <Link 
                            to={`/encounters/${encounter.encounter_id}`}
                            style={{ 
                              color: "var(--hp-accent)", 
                              textDecoration: "none",
                              fontWeight: "500"
                            }}
                          >
                            {encounter.encounter_id}
                          </Link>
                        </td>
                        <td>{formatDate(encounter.visit_date)}</td>
                        <td>{encounter.visit_type || "N/A"}</td>
                        <td>{encounter.department || "N/A"}</td>
                        <td>{encounter.provider_name || "N/A"}</td>
                        <td>
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

export default PatientDetailPage;

