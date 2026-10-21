import { useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import styles from "./Settings.module.css";
import {
  API_CLIENT,
  type APIKeyCreateResponse,
  type APIKeyResponse,
  type Scope,
} from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import BackIcon from "../../assets/back.svg?react";
import TrashIcon from "../../assets/trash.svg?react";
import CopyIcon from "../../assets/copy.svg?react";
import CloseIcon from "../../assets/close.svg?react";

const allScopes: Scope[] = ["read", "write", "delete"];

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <IconButton title="Back" onClick={() => navigate("/")}>
          <BackIcon />
        </IconButton>
        <h1 className={styles.title}>Settings</h1>
      </header>
      <ApiKeys />
    </div>
  );
}

function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<APIKeyResponse[]>([]);
  const [createdKey, setCreatedKey] = useState<
    APIKeyCreateResponse | undefined
  >();
  const [error, setError] = useState<string | undefined>();

  const loadApiKeys = () =>
    API_CLIENT.listApiKeys()
      .then(setApiKeys)
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => {
    loadApiKeys();
  }, []);

  const onCreated = (apiKey: APIKeyCreateResponse) => {
    setCreatedKey(apiKey);
    loadApiKeys();
  };

  const onDelete = async (apiKey: APIKeyResponse) => {
    if (
      !window.confirm(
        `Do you really want to delete the API key "${apiKey.name}"?`,
      )
    ) {
      return;
    }
    setError(undefined);
    try {
      await API_CLIENT.deleteApiKey(apiKey.id);
      setApiKeys(apiKeys.filter((k) => k.id != apiKey.id));
      if (createdKey?.id == apiKey.id) setCreatedKey(undefined);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>API Keys</h2>
      <p className={styles.description}>
        API keys can be used to access the API by passing them in the{" "}
        <code>Authorization: Bearer &lt;key&gt;</code> header.
      </p>

      {!!error && <ErrorTile message={error} />}

      <ApiKeyCreateForm onCreated={onCreated} />

      {!!createdKey && (
        <CreatedKey
          apiKey={createdKey}
          onClose={() => setCreatedKey(undefined)}
        />
      )}

      {apiKeys.length > 0 ? (
        <ul className={styles.keys}>
          {apiKeys.map((k) => (
            <li key={k.id} className={styles.key}>
              <div className={styles.keyInfo}>
                <span className={styles.keyName}>{k.name}</span>
                <span className={styles.keyMeta}>
                  Created {new Date(k.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.scopes}>
                {k.scopes.map((s) => (
                  <span key={s} className={styles.scope}>
                    {s}
                  </span>
                ))}
              </div>
              <IconButton title="Delete API key" onClick={() => onDelete(k)}>
                <TrashIcon />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : (
        <span className={styles.empty}>
          You have not created any API keys yet.
        </span>
      )}
    </section>
  );
}

function ApiKeyCreateForm({
  onCreated,
}: {
  onCreated: (apiKey: APIKeyCreateResponse) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Scope[]>(["read"]);
  const [error, setError] = useState<string | undefined>();

  const toggleScope = (scope: Scope) => {
    setScopes(
      scopes.includes(scope)
        ? scopes.filter((s) => s != scope)
        : allScopes.filter((s) => s == scope || scopes.includes(s)),
    );
  };

  const onCreate = async () => {
    if (!name || scopes.length == 0) return;
    setError(undefined);
    try {
      const apiKey = await API_CLIENT.createApiKey({ name, scopes });
      setName("");
      onCreated(apiKey);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") onCreate();
  };

  return (
    <div className={styles.createForm}>
      {!!error && <ErrorTile message={error} />}
      <div className={styles.createRow}>
        <Input
          className={styles.createName}
          placeholder="Name"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          onKeyUp={onKeyUp}
        />
        <div className={styles.scopeToggles}>
          {allScopes.map((s) => (
            <button
              key={s}
              className={`${styles.scopeToggle} ${scopes.includes(s) ? styles.selected : ""}`}
              onClick={() => toggleScope(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          disabled={!name || scopes.length == 0}
          onClick={onCreate}
        >
          Create
        </Button>
      </div>
    </div>
  );
}

function CreatedKey({
  apiKey,
  onClose,
}: {
  apiKey: APIKeyCreateResponse;
  onClose: () => void;
}) {
  const [isCopied, setIsCopied] = useState(false);

  const onCopy = async () => {
    await navigator.clipboard.writeText(apiKey.key);
    setIsCopied(true);
  };

  return (
    <div className={styles.createdKey}>
      <div className={styles.createdKeyHeader}>
        <span>
          {isCopied
            ? "Copied to clipboard!"
            : `Your new API key "${apiKey.name}". Copy it now, it will not be shown again.`}
        </span>
        <IconButton title="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      <div className={styles.createdKeyRow}>
        <code className={styles.createdKeyValue}>{apiKey.key}</code>
        <IconButton title="Copy API key" onClick={onCopy}>
          <CopyIcon />
        </IconButton>
      </div>
    </div>
  );
}
