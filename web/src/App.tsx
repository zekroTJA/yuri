import "./App.css";
import { Route, Routes } from "react-router";
import Main from "./routes/Main/Main";
import Login from "./routes/Login/Login";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Main />} />
    </Routes>
  );
}

export default App;
