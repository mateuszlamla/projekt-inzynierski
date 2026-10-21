import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import PipelinePage from "./pages/PipelinePage";
import ChartCreatorPage from "./pages/ChartCreatorPage";
import DashboardsPage from "./pages/DashboardsPage";
import ScriptEditorPage from "./pages/ScriptEditorPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
        <Navbar />
        <main className="flex-1 overflow-hidden relative">
          <Routes>
            <Route path="/" element={<PipelinePage />} />
            <Route path="/charts/new" element={<ChartCreatorPage />} />
            <Route path="/dashboards" element={<DashboardsPage />} />
            <Route path="/script-editor" element={<ScriptEditorPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
