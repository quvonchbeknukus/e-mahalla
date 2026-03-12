import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login/Login";
import Map from "./pages/Main/Map";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Navigate to="/login" />} />

        <Route path="/login" element={<Login />} />

        <Route path="/home" element={<Map />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;