import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../pages/HomePage.css";
import ThemeToggle from "./ThemeToggle";

const SharedLayout = ({
  title,
  subtitle,
  children,
  activePage,
  searchValue = "",
  onSearchChange,
  onAddNew,
  showSearch = true,
  showAddNew = true
}) => {
  const location = useLocation();

  return (
    <div className="hp-root">

      {/* Sidebar */}
      <aside className="hp-sidebar">
        <div className="hp-logo">
          <span className="hp-logo-icon">🩺</span>
          <span className="hp-logo-text">Medico</span>
        </div>

        <nav className="hp-nav">
          <p className="hp-nav-title">Main</p>

          <Link to="/">
            <button
              className={`hp-nav-item ${location.pathname === "/" ? "hp-nav-item--active" : ""
                }`}
            >
              Dashboard
            </button>
          </Link>

          <Link to="/patients">
            <button
              className={`hp-nav-item ${activePage === "patients" || location.pathname === "/patients"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Patients
            </button>
          </Link>

          <Link to="/encounters">
            <button
              className={`hp-nav-item ${activePage === "encounters" || location.pathname === "/encounters"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Encounters
            </button>
          </Link>

          <Link to="/procedures">
            <button
              className={`hp-nav-item ${activePage === "procedures" || location.pathname === "/procedures"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Procedures
            </button>
          </Link>

          <Link to="/medications">
            <button
              className={`hp-nav-item ${activePage === "medications" || location.pathname === "/medications"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Medications
            </button>
          </Link>

          <Link to="/diagnoses">
            <button
              className={`hp-nav-item ${activePage === "diagnoses" || location.pathname === "/diagnoses"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Diagnoses
            </button>
          </Link>

          <Link to="/lab-tests">
            <button
              className={`hp-nav-item ${activePage === "labtests" || location.pathname === "/lab-tests"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Lab Tests
            </button>
          </Link>

          <p className="hp-nav-title hp-nav-title--secondary">Staff & Insurance</p>

          <Link to="/providers">
            <button
              className={`hp-nav-item ${activePage === "providers" || location.pathname === "/providers"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Providers
            </button>
          </Link>

          <Link to="/insurers">
            <button
              className={`hp-nav-item ${activePage === "insurers" || location.pathname === "/insurers"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Insurers
            </button>
          </Link>

          <Link to="/department-heads">
            <button
              className={`hp-nav-item ${activePage === "departmentheads" || location.pathname === "/department-heads"
                  ? "hp-nav-item--active"
                  : ""
                }`}
            >
              Dept. Heads
            </button>
          </Link>

          <p className="hp-nav-title hp-nav-title--secondary">Analytics</p>

          <Link to="/billing">
            <button
              className={`hp-nav-item ${location.pathname === "/billing" ? "hp-nav-item--active" : ""
                }`}
            >
              Billing & Claims
            </button>
          </Link>

          <Link to="/denials">
            <button
              className={`hp-nav-item ${location.pathname === "/denials" ? "hp-nav-item--active" : ""
                }`}
            >
              Denials
            </button>
          </Link>
        </nav>


      </aside>

      {/* Main Section */}
      <main className="hp-main">
        <header className="hp-topbar">
          <div className="hp-topbar-left">
            <h1 className="hp-page-title">{title}</h1>
            <p className="hp-page-subtitle">{subtitle}</p>
          </div>

          <div className="hp-topbar-right">

            {/* 🌗 Light/Dark Toggle */}
            <ThemeToggle />

            {/* 🔍 Search */}
            {showSearch && (
              <input
                className="hp-search"
                placeholder="Search..."
                value={searchValue}
                onChange={onSearchChange || (() => { })}
              />
            )}

            {/* ➕ Add New */}
            {showAddNew && (
              <button
                className="hp-primary-btn"
                onClick={onAddNew || (() => alert("Add New feature coming soon!"))}
              >
                + Add New
              </button>
            )}
          </div>
        </header>

        <section className="page-content">{children}</section>
      </main>
    </div>
  );
};

export default SharedLayout;

