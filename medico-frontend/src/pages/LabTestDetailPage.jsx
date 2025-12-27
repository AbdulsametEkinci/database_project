import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";
import { api } from "../services/api";

const LabTestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [labTest, setLabTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [testCodeOptions, setTestCodeOptions] = useState([]);
  const [testCodeSearchTerm, setTestCodeSearchTerm] = useState("");
  const [showTestCodeDropdown, setShowTestCodeDropdown] = useState(false);
  const [labIdOptions, setLabIdOptions] = useState([]);
  const [labIdSearchTerm, setLabIdSearchTerm] = useState("");
  const [showLabIdDropdown, setShowLabIdDropdown] = useState(false);
  const [specimenTypeOptions, setSpecimenTypeOptions] = useState([]);
  const [unitsOptions, setUnitsOptions] = useState([]);
  const [normalRangeOptions, setNormalRangeOptions] = useState([]);
  const [testResultOptions, setTestResultOptions] = useState([]);

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

  const fetchLabTest = useCallback(async () => {
    try {
      setLoading(true);
      const labTestData = await api.getLabTestById(id);
      setLabTest(labTestData);
      const normalizedDate = normalizeDate(labTestData.test_date);
      setFormData({
        encounter_id: labTestData.encounter_id || "",
        test_code: labTestData.test_code || "",
        test_name: labTestData.test_name || "",
        lab_id: labTestData.lab_id || "",
        specimen_type: labTestData.specimen_type || "",
        test_result: labTestData.test_result || "",
        units: labTestData.units || "N/A",
        normal_range: labTestData.normal_range || "N/A",
        test_date: normalizedDate || "",
        status: labTestData.status || "Preliminary",
      });
      setTestCodeSearchTerm(labTestData.test_code || "");
      setLabIdSearchTerm(labTestData.lab_id || "");
      setError(null);
    } catch (err) {
      console.error("Error fetching lab test:", err);
      setError(err.message || "Failed to load lab test");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLabTest();
  }, [fetchLabTest]);

  const fetchTestCodes = useCallback(async () => {
    try {
      const codes = await api.getTestCodes();
      setTestCodeOptions(codes);
    } catch (err) {
      console.error("Error fetching test codes:", err);
    }
  }, []);

  const fetchLabIds = useCallback(async () => {
    try {
      const labIds = await api.getLabIds();
      setLabIdOptions(labIds);
    } catch (err) {
      console.error("Error fetching lab IDs:", err);
    }
  }, []);

  const fetchSpecimenTypes = useCallback(async () => {
    try {
      const types = await api.getSpecimenTypes();
      setSpecimenTypeOptions(types);
    } catch (err) {
      console.error("Error fetching specimen types:", err);
    }
  }, []);

  const fetchUnits = useCallback(async () => {
    try {
      const units = await api.getUnits();
      setUnitsOptions(units);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  }, []);

  const fetchNormalRanges = useCallback(async () => {
    try {
      const ranges = await api.getNormalRanges();
      setNormalRangeOptions(ranges);
    } catch (err) {
      console.error("Error fetching normal ranges:", err);
    }
  }, []);

  const fetchTestResults = useCallback(async () => {
    try {
      const results = await api.getTestResults();
      setTestResultOptions(results);
    } catch (err) {
      console.error("Error fetching test results:", err);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      fetchTestCodes();
      fetchLabIds();
      fetchSpecimenTypes();
      fetchUnits();
      fetchNormalRanges();
      fetchTestResults();
    }
  }, [isEditing, fetchTestCodes, fetchLabIds, fetchSpecimenTypes, fetchUnits, fetchNormalRanges, fetchTestResults]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      
      if (!submitData.test_date && labTest) {
        const originalDate = normalizeDate(labTest.test_date);
        if (originalDate) {
          submitData.test_date = originalDate;
        }
      }
      
      await api.updateLabTest(id, submitData);
      await fetchLabTest();
      setIsEditing(false);
      alert("Lab test updated successfully!");
    } catch (err) {
      alert(err.message || "Failed to update lab test");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete lab test ${id}?`)) {
      return;
    }
    try {
      await api.deleteLabTest(id);
      navigate("/lab-tests");
    } catch (err) {
      alert(err.message || "Failed to delete lab test");
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
        title="Lab Test Details"
        subtitle="Loading lab test information..."
        activePage="lab-tests"
      >
        <div style={{ padding: "60px", textAlign: "center", color: "var(--hp-text-soft)" }}>
          Loading lab test...
        </div>
      </SharedLayout>
    );
  }

  if (error || !labTest) {
    return (
      <SharedLayout
        title="Lab Test Details"
        subtitle="Error loading lab test"
        activePage="lab-tests"
      >
        <div className="page-section">
          <div style={{ 
            padding: "20px", 
            backgroundColor: "rgba(220, 53, 69, 0.1)", 
            color: "#dc3545", 
            borderRadius: "8px",
            border: "1px solid rgba(220, 53, 69, 0.3)"
          }}>
            {error || "Lab test not found"}
            <br />
            <Link to="/lab-tests" className="hp-primary-btn" style={{ marginTop: "16px", display: "inline-block" }}>
              Back to Lab Tests
            </Link>
          </div>
        </div>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout
      title={`Lab Test: ${labTest.test_id}`}
      subtitle={`${labTest.first_name || ""} ${labTest.last_name || ""} - ${formatDate(labTest.test_date)}`}
      activePage="lab-tests"
      showSearch={false}
      showAddNew={false}
    >
      <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginBottom: "20px" }}>
        {!isEditing ? (
          <>
            <button className="hp-primary-btn" onClick={() => setIsEditing(true)}>
              Edit Lab Test
            </button>
            <button className="hp-danger-btn" onClick={handleDelete}>
              Delete
            </button>
            <Link to="/lab-tests" className="hp-secondary-btn">
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
          <h3>Edit Lab Test</h3>
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
              Test Code *
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  required
                  value={testCodeSearchTerm}
                  onChange={(e) => {
                    const newCode = e.target.value;
                    setTestCodeSearchTerm(newCode);
                    // Find matching code and update test_name
                    const matchingCode = testCodeOptions.find(
                      code => code.test_code.toLowerCase() === newCode.toLowerCase()
                    );
                    setFormData({ 
                      ...formData, 
                      test_code: newCode,
                      test_name: matchingCode ? matchingCode.test_name || "" : formData.test_name
                    });
                    setShowTestCodeDropdown(true);
                  }}
                  onFocus={() => setShowTestCodeDropdown(true)}
                  placeholder="Select or type test code..."
                />
                {showTestCodeDropdown && testCodeOptions.length > 0 && (
                  <div className="page-dropdown">
                    {testCodeOptions
                      .filter(code => 
                        !testCodeSearchTerm || 
                        code.test_code.toLowerCase().includes(testCodeSearchTerm.toLowerCase()) ||
                        (code.test_name && code.test_name.toLowerCase().includes(testCodeSearchTerm.toLowerCase()))
                      )
                      .map((code) => (
                        <div
                          key={code.test_code}
                          className="page-dropdown-item"
                          onClick={() => {
                            setFormData({ 
                              ...formData, 
                              test_code: code.test_code,
                              test_name: code.test_name || "" // Set test_name from code, make it immutable
                            });
                            setTestCodeSearchTerm(code.test_code);
                            setShowTestCodeDropdown(false);
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>{code.test_code}</div>
                          {code.test_name && (
                            <div style={{ fontSize: "12px", color: "var(--hp-text-soft)" }}>
                              {code.test_name}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              Test Name *
              <textarea
                value={formData.test_name || ""}
                readOnly
                disabled
                placeholder="Test name is set automatically based on test code"
                rows="3"
                style={{ opacity: 0.7, cursor: "not-allowed", backgroundColor: "rgba(148, 163, 184, 0.1)" }}
                title="Test name is automatically set based on the selected test code"
                required
              />
            </label>

            <label>
              Lab ID
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={labIdSearchTerm}
                  onChange={(e) => {
                    setLabIdSearchTerm(e.target.value);
                    setFormData({ ...formData, lab_id: e.target.value });
                    setShowLabIdDropdown(true);
                  }}
                  onFocus={() => {
                    setShowLabIdDropdown(true);
                    if (labIdOptions.length === 0) {
                      fetchLabIds();
                    }
                  }}
                  placeholder="Select or type lab ID..."
                />
                {showLabIdDropdown && labIdOptions.length > 0 && (
                  <div className="page-dropdown">
                    {labIdOptions
                      .filter(lab => 
                        !labIdSearchTerm || 
                        (lab.lab_id && lab.lab_id.toLowerCase().includes(labIdSearchTerm.toLowerCase()))
                      )
                      .map((lab) => (
                        <div
                          key={lab.lab_id}
                          className="page-dropdown-item"
                          onClick={() => {
                            setFormData({ ...formData, lab_id: lab.lab_id });
                            setLabIdSearchTerm(lab.lab_id);
                            setShowLabIdDropdown(false);
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>{lab.lab_id}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </label>

            <label>
              Specimen Type
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={formData.specimen_type || ""}
                  onChange={(e) => {
                    setFormData({ ...formData, specimen_type: e.target.value });
                  }}
                  onFocus={() => {
                    if (specimenTypeOptions.length === 0) {
                      fetchSpecimenTypes();
                    }
                  }}
                  placeholder="Select or type specimen type..."
                  list="specimen-types-list"
                />
                <datalist id="specimen-types-list">
                  {specimenTypeOptions.map((type, idx) => (
                    <option key={idx} value={type.specimen_type || type} />
                  ))}
                </datalist>
              </div>
            </label>

            <label>
              Test Date
              <input
                type="date"
                value={formData.test_date || ""}
                onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
              />
            </label>

            <label>
              Status *
              <select
                value={formData.status || "Preliminary"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <option value="Preliminary">Preliminary</option>
                <option value="Final">Final</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </label>

            <label>
              Test Result
              <select
                value={formData.test_result || ""}
                onChange={(e) => setFormData({ ...formData, test_result: e.target.value })}
              >
                <option value="">Select test result...</option>
                {testResultOptions.map((result, idx) => {
                  const value = result.test_result || result;
                  return (
                    <option key={idx} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              Units
              <select
                value={formData.units || "N/A"}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
              >
                {unitsOptions.map((unit, idx) => {
                  const value = unit.units || unit;
                  return (
                    <option key={idx} value={value}>
                      {value}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              Normal Range
              <select
                value={formData.normal_range || "N/A"}
                onChange={(e) => setFormData({ ...formData, normal_range: e.target.value })}
              >
                {normalRangeOptions.map((range, idx) => {
                  const value = range.normal_range || range;
                  return (
                    <option key={idx} value={value}>
                      {value}
                    </option>
                  );
                })}
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
            <h3>Lab Test Information</h3>
            <table style={{ width: "100%", marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Test ID:</td>
                  <td style={{ padding: "8px 0" }}>{labTest.test_id}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Test Code:</td>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>{labTest.test_code}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Test Name:</td>
                  <td style={{ padding: "8px 0" }}>{labTest.test_name || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Patient:</td>
                  <td style={{ padding: "8px 0" }}>
                    <Link 
                      to={`/patients/${labTest.patient_id}`}
                      style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                    >
                      {labTest.first_name} {labTest.last_name}
                    </Link>
                    <br />
                    <small style={{ color: "var(--hp-text-soft)" }}>{labTest.patient_id}</small>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Encounter:</td>
                  <td style={{ padding: "8px 0" }}>
                    <Link 
                      to={`/encounters/${labTest.encounter_id}`}
                      style={{ color: "var(--hp-primary)", textDecoration: "none", fontWeight: "500" }}
                    >
                      {labTest.encounter_id}
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Test Date:</td>
                  <td style={{ padding: "8px 0" }}>{formatDate(labTest.test_date)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="page-card">
            <h3>Test Details</h3>
            <table style={{ width: "100%", marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px 0", width: "40%", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Lab ID:</td>
                  <td style={{ padding: "8px 0" }}>{labTest.lab_id || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Specimen Type:</td>
                  <td style={{ padding: "8px 0" }}>{labTest.specimen_type || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Status:</td>
                  <td style={{ padding: "8px 0", fontWeight: "600" }}>{labTest.status || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Test Result:</td>
                  <td style={{ padding: "8px 0" }}>{labTest.test_result || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Units:</td>
                  <td style={{ padding: "8px 0" }}>{labTest.units || "N/A"}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px 0", color: "var(--hp-text-soft)", fontWeight: "500", fontSize: "13px" }}>Normal Range:</td>
                  <td style={{ padding: "8px 0" }}>{labTest.normal_range || "N/A"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </SharedLayout>
  );
};

export default LabTestDetailPage;

