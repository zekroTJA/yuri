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
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  const onLogin = async () => {
    await API_CLIENT.login(username, password);
    navigate("/");
  };

  return (
    <div className={styles.outer}>
      <section className={styles.container}>
        <TabBar options={tabs} onSelect={(id) => setSelectedTab(id)} />
        <ErrorTile message="lorem ipsum" />
        <TabContent
          id={selectedTab}
          username={username}
          password={password}
          passwordRepeat={passwordRepeat}
          onUsernameChange={(v) => setUsername(v.currentTarget.value)}
          onPasswordChange={(v) => setPassword(v.currentTarget.value)}
          onPasswordRepeatChange={(v) =>
            setPasswordRepeat(v.currentTarget.value)
          }
          onLogin={onLogin}
        />
      </section>
    </div>
  );
}

type InputChangeEventHandler = (
  event: React.FormEvent<HTMLInputElement>,
) => void;

type TabContentProps = {
  id: string;
  username: string;
  password: string;
  passwordRepeat: string;
  onUsernameChange: InputChangeEventHandler;
  onPasswordChange: InputChangeEventHandler;
  onPasswordRepeatChange: InputChangeEventHandler;
  onLogin: () => void;
};

function TabContent({
  id,
  username,
  password,
  passwordRepeat,
  onUsernameChange,
  onPasswordChange,
  onPasswordRepeatChange,
  onLogin,
}: TabContentProps) {
  switch (id) {
    case "login":
      return (
        <>
          <Input
            placeholder="Username"
            value={username}
            onInput={onUsernameChange}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onInput={onPasswordChange}
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
            onInput={onUsernameChange}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onInput={onPasswordChange}
          />
          <Input
            placeholder="Password Repeat"
            type="password"
            value={passwordRepeat}
            onInput={onPasswordRepeatChange}
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

function ErrorTile({ message }: { message: string }) {
  return (
    <div className={styles.errortile}>
      <img src="/assets/alert.svg" />
      {message}
    </div>
  );
}
