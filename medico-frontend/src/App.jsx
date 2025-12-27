import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import ProceduresPage from "./pages/ProceduresPage.jsx";
import ProcedureDetailPage from "./pages/ProcedureDetailPage.jsx";
import MedicationsPage from "./pages/MedicationsPage.jsx";
import MedicationDetailPage from "./pages/MedicationDetailPage.jsx";
import DiagnosesPage from "./pages/DiagnosesPage.jsx";
import DiagnosisDetailPage from "./pages/DiagnosisDetailPage.jsx";
import LabTestsPage from "./pages/LabTestsPage.jsx";
import LabTestDetailPage from "./pages/LabTestDetailPage.jsx";
import PatientsPage from "./pages/PatiensPage.jsx";
import PatientDetailPage from "./pages/PatientDetailPage.jsx";
import EncountersPage from "./pages/EncountersPage.jsx";
import EncounterDetailPage from "./pages/EncounterDetailPage.jsx";
import BillingPage from "./pages/BillingPage.jsx";
import BillingDetailPage from "./pages/BillingDetailPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import DenialsPage from "./pages/DenialsPage.jsx";
import ProvidersPage from "./pages/ProvidersPage.jsx";
import ProviderDetailPage from "./pages/ProviderDetailPage.jsx";
import InsurersPage from "./pages/InsurersPage.jsx";
import InsurerDetailPage from "./pages/InsurerDetailPage.jsx";
import DepartmentHeadsPage from "./pages/DepartmentHeadsPage.jsx";
import DepartmentHeadDetailPage from "./pages/DepartmentHeadDetailPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/patients" element={<PatientsPage />} />
      <Route path="/patients/:id" element={<PatientDetailPage />} />
      <Route path="/encounters" element={<EncountersPage />} />
      <Route path="/encounters/:id" element={<EncounterDetailPage />} />
      <Route path="/procedures" element={<ProceduresPage />} />
      <Route path="/procedures/:id" element={<ProcedureDetailPage />} />
      <Route path="/medications" element={<MedicationsPage />} />
      <Route path="/medications/:id" element={<MedicationDetailPage />} />
      <Route path="/diagnoses" element={<DiagnosesPage />} />
      <Route path="/diagnoses/:id" element={<DiagnosisDetailPage />} />
      <Route path="/lab-tests" element={<LabTestsPage />} />
      <Route path="/lab-tests/:id" element={<LabTestDetailPage />} />
      <Route path="/providers" element={<ProvidersPage />} />
      <Route path="/providers/:id" element={<ProviderDetailPage />} />
      <Route path="/insurers" element={<InsurersPage />} />
      <Route path="/insurers/:id" element={<InsurerDetailPage />} />
      <Route path="/department-heads" element={<DepartmentHeadsPage />} />
      <Route path="/department-heads/:id" element={<DepartmentHeadDetailPage />} />
      <Route path="/billing" element={<BillingPage />} />
      <Route path="/billing/:id" element={<BillingDetailPage />} />
      <Route path="/denials" element={<DenialsPage />} />
      <Route path="/reports" element={<ReportsPage />} />
    </Routes>
  );
}

export default App;