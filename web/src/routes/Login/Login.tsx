import styles from "./Login.module.css";
import Button from "../../components/Button/Button";
import TabBar from "../../components/TabBar/TabBar";
import { useEffect, useState, type KeyboardEvent } from "react";
import Input from "../../components/Input/Input";
import { API_CLIENT } from "../../services/apiclient";
import { useNavigate } from "react-router";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import { errorMessage } from "../../utils/errors";

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
  const [error, setError] = useState<string | undefined>();
  const [isRegistrationEnabled, setIsRegistrationEnabled] = useState(false);

  useEffect(() => {
    API_CLIENT.getAuthConfig()
      .then((config) => setIsRegistrationEnabled(config.registration_enabled))
      .catch((e) => console.error("failed getting auth config", e));
  }, []);

  const onLogin = async () => {
    if (!username || !password) return;
    try {
      await API_CLIENT.login(username, password);
      navigate("/");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onRegister = async () => {
    if (!username || !password || password != passwordRepeat) return;
    try {
      await API_CLIENT.register(username, password);
      await API_CLIENT.login(username, password);
      navigate("/");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className={styles.outer}>
      <section className={styles.container}>
        {isRegistrationEnabled && (
          <TabBar options={tabs} onSelect={(id) => setSelectedTab(id)} />
        )}
        {!!error && <ErrorTile message={error} />}
        <TabContent
          id={isRegistrationEnabled ? selectedTab : "login"}
          username={username}
          password={password}
          passwordRepeat={passwordRepeat}
          onUsernameChange={(v) => setUsername(v.currentTarget.value)}
          onPasswordChange={(v) => setPassword(v.currentTarget.value)}
          onPasswordRepeatChange={(v) =>
            setPasswordRepeat(v.currentTarget.value)
          }
          onLogin={onLogin}
          onRegister={onRegister}
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
  onRegister: () => void;
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
  onRegister,
}: TabContentProps) {
  const onSubmit = (fn: () => void) => {
    return (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key == "Enter") fn();
    };
  };

  switch (id) {
    case "login":
      return (
        <>
          <Input
            placeholder="Username"
            value={username}
            onInput={onUsernameChange}
            onKeyUp={onSubmit(onLogin)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onInput={onPasswordChange}
            onKeyUp={onSubmit(onLogin)}
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
            onKeyUp={onSubmit(onRegister)}
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onInput={onPasswordChange}
            onKeyUp={onSubmit(onRegister)}
          />
          <Input
            placeholder="Password Repeat"
            type="password"
            value={passwordRepeat}
            onInput={onPasswordRepeatChange}
            isError={!!passwordRepeat && password != passwordRepeat}
            onKeyUp={onSubmit(onRegister)}
          />
          <Button
            disabled={!username || !password || password != passwordRepeat}
            variant="primary"
            onClick={onRegister}
          >
            Register
          </Button>
        </>
      );
  }
}
