import Button from "../../components/Button/Button";
import TabBar from "../../components/TabBar/TabBar";

export default function Login() {
  return (
    <>
      <section>
        <TabBar
          options={[
            { id: "login", element: "Login" },
            { id: "register", element: "Register" },
          ]}
        />
        <Button>Login</Button>
      </section>
    </>
  );
}
