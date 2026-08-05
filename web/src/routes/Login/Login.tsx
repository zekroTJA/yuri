import styles from "./Login.module.css";
import Button from "../../components/Button/Button";
import TabBar from "../../components/TabBar/TabBar";
import { useState } from "react";
import Input from "../../components/Input/Input";
import { API_CLIENT } from "../../services/apiclient";
import { useNavigate } from "react-router";

const tabs = [
  { id: "login", element: "Login" },
  { id: "register", element: "Register" },
];

export default function Login() {
  const [selectedTab, setSelectedTab] = useState("login");

  return (
    <div className={styles.outer}>
      <section className={styles.container}>
        <TabBar options={tabs} onSelect={(id) => setSelectedTab(id)} />
        <TabContent id={selectedTab} />
      </section>
    </div>
  );
}

function TabContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const onLogin = async () => {
    await API_CLIENT.login(username, password);
    navigate("/");
  };

  switch (id) {
    case "login":
      return (
        <>
          <Input
            placeholder="Username"
            value={username}
            onInput={(v) => setUsername(v.currentTarget.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onInput={(v) => setPassword(v.currentTarget.value)}
          />
          <Button
            disabled={!username || !password}
            variant="primary"
            onClick={onLogin}
          >
            Login
          </Button>
        </>
      );
    case "register":
      return (
        <>
          <Input
            placeholder="Username"
            value={username}
            onInput={(v) => setUsername(v.currentTarget.value)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onInput={(v) => setPassword(v.currentTarget.value)}
          />
          <Input
            placeholder="Password Repeat"
            type="password"
            value={passwordRepeat}
            onInput={(v) => setPasswordRepeat(v.currentTarget.value)}
          />
          <Button
            disabled={!username || !password || password != passwordRepeat}
            variant="primary"
          >
            Register
          </Button>
        </>
      );
  }
}
