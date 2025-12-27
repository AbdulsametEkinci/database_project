import React from "react";
import SharedLayout from "../components/SharedLayout";
import "./Pages.css";

const ReportsPage = () => {
  return (
    <SharedLayout
      title="Reports"
      subtitle="Generate and view analytical reports and insights."
      activePage="reports"
      showSearch={false}   // 🔥 sağ üst search kapalı
      showAddNew={false}   // 🔥 sağ üst +New kapalı
    >
      {/* 🔥 Başlık altına search ve +New butonu */}
      <div
        className="hp-search-new-container"
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <input
          className="hp-search hp-search--big"
          placeholder="Search reports..."
          disabled
          style={{
            flex: "1",
            maxWidth: "500px",
            background: "#f0f0f0",
            cursor: "not-allowed",
          }}
        />
        <button
          className="hp-primary-btn"
          onClick={() => alert("Create new report coming soon!")}
        >
          + New Report
        </button>
      </div>

      <div className="page-grid">
        <div className="page-card">
          <h3>📊 Patient Reports</h3>
          <p>Generate patient demographics and visit reports.</p>
          <button
            className="hp-primary-btn"
            onClick={() => alert("Patient Reports feature coming soon!")}
          >
            Generate Report
          </button>
        </div>

        <div className="page-card">
          <h3>💰 Financial Reports</h3>
          <p>View billing, claims, and revenue reports.</p>
          <button
            className="hp-primary-btn"
            onClick={() => alert("Financial Reports feature coming soon!")}
          >
            Generate Report
          </button>
        </div>

        <div className="page-card">
          <h3>📈 Analytics Dashboard</h3>
          <p>View comprehensive analytics and insights.</p>
          <button
            className="hp-secondary-btn"
            onClick={() => alert("Analytics Dashboard feature coming soon!")}
          >
            View Dashboard
          </button>
        </div>
      </div>

      <div className="page-section">
        <h3>Available Reports</h3>
        <div style={{ padding: "20px" }}>
          <p>Reports feature is under development. Coming soon:</p>
          <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
            <li>Patient Demographics Report</li>
            <li>Encounter Summary Report</li>
            <li>Procedure Cost Analysis</li>
            <li>Medication Prescription Report</li>
            <li>Claims Approval Rate Report</li>
            <li>Revenue and Billing Report</li>
          </ul>
        </div>
      </div>
    </SharedLayout>
  );
};

export default ReportsPage;
