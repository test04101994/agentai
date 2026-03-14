import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import CostCodes from './pages/CostCodes';
import Allocations from './pages/Allocations';
import ImportExport from './pages/ImportExport';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/cost-codes" element={<CostCodes />} />
            <Route path="/allocations" element={<Allocations />} />
            <Route path="/import-export" element={<ImportExport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
