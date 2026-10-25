import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Link, useNavigate } from "react-router";
import styles from "./Settings.module.css";
import { SoundContext } from "../../contexts";
import {
  API_CLIENT,
  type APIKeyCreateResponse,
  type APIKeyResponse,
  type Scope,
  type SoundImportResponse,
} from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import { downloadBlob } from "../../utils/download";
import Input from "../../components/Input/Input";
import Button from "../../components/Button/Button";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import BackIcon from "../../assets/back.svg?react";
import TrashIcon from "../../assets/trash.svg?react";
import CopyIcon from "../../assets/copy.svg?react";
import CloseIcon from "../../assets/close.svg?react";
import DownloadIcon from "../../assets/download.svg?react";
import PackageIcon from "../../assets/package.svg?react";

const allScopes: Scope[] = ["read", "write", "delete"];

function exportFileName(): string {
  return `yuri-sounds-${new Date().toISOString().slice(0, 10)}.tar.gz`;
}

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
      <SoundArchive />
      <ApiKeys />
      <ChangePassword />
    </div>
  );
}

function SoundArchive() {
  const soundState = useContext(SoundContext);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<
    SoundImportResponse | undefined
  >();
  const [error, setError] = useState<string | undefined>();
  const importInput = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    setError(undefined);
    setIsExporting(true);
    try {
      downloadBlob(await API_CLIENT.exportSounds(), exportFileName());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsExporting(false);
    }
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const archive = e.currentTarget.files?.[0];
    // Reset the input so that the same file can be selected again.
    e.currentTarget.value = "";
    if (!archive) return;
    setError(undefined);
    setImportResult(undefined);
    setIsImporting(true);
    try {
      setImportResult(await API_CLIENT.importSounds(archive));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Sounds</h2>
      <p className={styles.description}>
        Export all sounds as a <code>.tar.gz</code> archive or import sounds
        from a previously exported archive. Sounds with an already existing
        handle are skipped on import.
      </p>

      {!!error && <ErrorTile message={error} />}

      <div className={styles.archiveActions}>
        <input
          ref={importInput}
          className={styles.fileInput}
          type="file"
          accept=".tar.gz,.tgz,application/gzip"
          onChange={onImport}
        />
        <Button
          disabled={isImporting}
          title="Import sounds from a .tar.gz archive"
          onClick={() => importInput.current?.click()}
        >
          <span className={styles.buttonContent}>
            <PackageIcon />
            {isImporting ? "Importing..." : "Import"}
          </span>
        </Button>
        <Button
          disabled={isExporting || soundState.sounds.length == 0}
          title="Export all sounds as a .tar.gz archive"
          onClick={onExport}
        >
          <span className={styles.buttonContent}>
            <DownloadIcon />
            {isExporting ? "Exporting..." : "Export"}
          </span>
        </Button>
      </div>

      {!!importResult && (
        <ImportResult
          result={importResult}
          onClose={() => setImportResult(undefined)}
        />
      )}
    </section>
  );
}

function ImportResult({
  result,
  onClose,
}: {
  result: SoundImportResponse;
  onClose: () => void;
}) {
  return (
    <div className={styles.importResult}>
      <div className={styles.importResultHeader}>
        <span>
          Imported {result.imported.length}{" "}
          {result.imported.length == 1 ? "sound" : "sounds"}
          {result.skipped.length > 0 && `, skipped ${result.skipped.length}`}
        </span>
        <IconButton title="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </div>
      {result.skipped.length > 0 && (
        <ul className={styles.skipped}>
          {result.skipped.map((s) => (
            <li key={s.name}>
              <span className={styles.skippedName}>{s.name}</span>: {s.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const isRepeatMismatch =
    !!newPasswordRepeat && newPassword != newPasswordRepeat;
  const canSave =
    !!currentPassword &&
    !!newPassword &&
    newPassword == newPasswordRepeat &&
    !isSaving;

  const onSave = async () => {
    if (!canSave) return;
    setError(undefined);
    setIsChanged(false);
    setIsSaving(true);
    try {
      await API_CLIENT.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordRepeat("");
      setIsChanged(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  const onKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key == "Enter") onSave();
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Password</h2>
      <p className={styles.description}>
        Change the password used to log in to your account.
      </p>

      {!!error && <ErrorTile message={error} />}

      <div className={styles.passwordForm}>
        <Input
          type="password"
          placeholder="Current password"
          autoComplete="current-password"
          value={currentPassword}
          onInput={(e) => setCurrentPassword(e.currentTarget.value)}
          onKeyUp={onKeyUp}
        />
        <Input
          type="password"
          placeholder="New password"
          autoComplete="new-password"
          value={newPassword}
          onInput={(e) => setNewPassword(e.currentTarget.value)}
          onKeyUp={onKeyUp}
        />
        <Input
          type="password"
          placeholder="Repeat new password"
          autoComplete="new-password"
          isError={isRepeatMismatch}
          value={newPasswordRepeat}
          onInput={(e) => setNewPasswordRepeat(e.currentTarget.value)}
          onKeyUp={onKeyUp}
        />
        <div className={styles.passwordActions}>
          {isChanged && (
            <span className={styles.success}>Password changed.</span>
          )}
          <Button variant="primary" disabled={!canSave} onClick={onSave}>
            {isSaving ? "Saving..." : "Change password"}
          </Button>
        </div>
      </div>
    </section>
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
        <code>Authorization: Bearer &lt;key&gt;</code> header. See the{" "}
        <Link to="/settings/api-docs">API documentation</Link> for all
        available endpoints.
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
