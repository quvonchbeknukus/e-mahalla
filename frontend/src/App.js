import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Map from "./pages/Main/Map";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Navigate to="/home" replace />} />

        <Route path="/home" element={<Map />} />

        <Route path="*" element={<Navigate to="/home" replace />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
