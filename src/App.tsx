import { Routes, Route, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SociPage } from "./pages/SociPage";
import { SocioNewPage } from "./pages/SocioNewPage";
import { SocioEditPage } from "./pages/SocioEditPage";
import { SocioDetailPage } from "./pages/SocioDetailPage";
import { EventiPage } from "./pages/EventiPage";
import { EventoNewPage } from "./pages/EventoNewPage";
import { EventoDetailPage } from "./pages/EventoDetailPage";
import { EventoEditPage } from "./pages/EventoEditPage";
import { UtentiPage } from "./pages/UtentiPage";
import { RuoliPage } from "./pages/RuoliPage";
import { StatusAssociativiPage } from "./pages/StatusAssociativiPage";
import { BorseSpesaPage } from "./pages/BorseSpesaPage";
import { FamiglieBeneficiariePage } from "./pages/FamiglieBeneficiariePage";
import { FamigliaDetailPage } from "./pages/FamigliaDetailPage";
import { BorseSpesaSettingsPage } from "./pages/BorseSpesaSettingsPage";
import { RegistroConsegnePage } from "./pages/RegistroConsegnePage";
import { MagazzinoPage } from "./pages/MagazzinoPage";
import { UbicazioniPage } from "./pages/UbicazioniPage";
import { StatiAttrezzaturaPage } from "./pages/StatiAttrezzaturaPage";
import { ScadenziarioPage } from "./pages/ScadenziarioPage";
import { StatiPagamentoPage } from "./pages/StatiPagamentoPage";
import MovimentiPage from "./pages/MovimentiPage";
import { MainLayout } from "./components/layout";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-center">
        <img src="/logo.png" alt="Maestrale" className="h-20 w-auto mx-auto mb-4 animate-pulse" />
        <p className="text-gray-600">Caricamento...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>

      <Unauthenticated>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Unauthenticated>

      <Authenticated>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/soci" element={<SociPage />} />
            <Route path="/soci/new" element={<SocioNewPage />} />
            <Route path="/soci/:id" element={<SocioDetailPage />} />
            <Route path="/soci/:id/edit" element={<SocioEditPage />} />
            <Route path="/eventi" element={<EventiPage />} />
            <Route path="/eventi/new" element={<EventoNewPage />} />
            <Route path="/eventi/:id" element={<EventoDetailPage />} />
            <Route path="/eventi/:id/edit" element={<EventoEditPage />} />
            <Route path="/utenti" element={<UtentiPage />} />
            <Route path="/ruoli" element={<RuoliPage />} />
            <Route path="/status-associativi" element={<StatusAssociativiPage />} />
            <Route path="/borse-spesa" element={<BorseSpesaPage />} />
            <Route path="/borse-spesa/registro" element={<RegistroConsegnePage />} />
            <Route path="/borse-spesa/famiglie" element={<FamiglieBeneficiariePage />} />
            <Route path="/borse-spesa/famiglie/:id" element={<FamigliaDetailPage />} />
            <Route path="/borse-spesa/impostazioni" element={<BorseSpesaSettingsPage />} />
            <Route path="/magazzino" element={<MagazzinoPage />} />
            <Route path="/magazzino/ubicazioni" element={<UbicazioniPage />} />
            <Route path="/magazzino/stati" element={<StatiAttrezzaturaPage />} />
            <Route path="/scadenziario" element={<ScadenziarioPage />} />
            <Route path="/scadenziario/stati" element={<StatiPagamentoPage />} />
            <Route path="/movimenti" element={<MovimentiPage />} />
            <Route
              path="/tessere"
              element={<div className="p-6">Pagina Tessere - Coming Soon</div>}
            />
            <Route path="/audit" element={<div className="p-6">Audit Log - Coming Soon</div>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Authenticated>
    </>
  );
}

export default App;
