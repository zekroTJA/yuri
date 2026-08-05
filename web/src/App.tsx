import "./App.css";
import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import Main from "./routes/Main/Main";
import Login from "./routes/Login/Login";
import { API_CLIENT } from "./services/apiclient";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    API_CLIENT.onUnauthorized(() => {
      if (location.pathname !== "/login") {
        navigate("/login");
      }
    });
  }, [navigate, location.pathname]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Main />} />
    </Routes>
  );
}

export default App;
