import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { Dashboard } from "./pages/Dashboard";
import { Cases } from "./pages/cases";
import { CaseDetails } from "./pages/CaseDetails";
import { Revenue } from "./pages/Revenue";
import { BatchRecovery } from "./pages/BatchRecovery";
import { Policy } from "./pages/Policy";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/cases"
          element={<Cases />}
        />

        <Route
          path="/cases/:id"
          element={<CaseDetails />}
        />

        <Route
          path="/revenue"
          element={<Revenue />}
        />

        <Route
          path="/batch"
          element={<BatchRecovery />}
        />

        <Route
          path="/policy"
          element={<Policy />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;