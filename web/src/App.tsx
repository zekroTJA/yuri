import "./App.css";
import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import Main from "./routes/Main/Main";
import Login from "./routes/Login/Login";
import SoundBoard from "./routes/SoundBoard/SoundBoard";
import Settings from "./routes/Settings/Settings";
import SoundEdit from "./routes/SoundEdit/SoundEdit";
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
      <Route element={<Main />}>
        <Route index element={<SoundBoard />} />
        <Route path="settings" element={<Settings />} />
        <Route path="sounds/:id/edit" element={<SoundEdit />} />
      </Route>
    </Routes>
  );
}

export default App;
