import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import styles from "./Info.module.css";
import { API_CLIENT, type InfoResponse } from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import BackIcon from "../../assets/back.svg?react";

export default function Info() {
  const navigate = useNavigate();
  const [info, setInfo] = useState<InfoResponse | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    API_CLIENT.getInfo()
      .then(setInfo)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <IconButton title="Back" onClick={() => navigate("/")}>
          <BackIcon />
        </IconButton>
        <h1 className={styles.title}>About Yuri</h1>
      </header>

      {!!error && <ErrorTile message={error} />}
      {!info && !error && <span className={styles.muted}>Loading...</span>}

      {!!info && (
        <dl className={styles.info}>
          <dt>Version</dt>
          <dd>
            <code>{info.version}</code>
          </dd>
          <dt>Build date</dt>
          <dd>{info.build_date}</dd>
          <dt>Go version</dt>
          <dd>
            <code>{info.go_version}</code>
          </dd>
        </dl>
      )}
    </div>
  );
}
