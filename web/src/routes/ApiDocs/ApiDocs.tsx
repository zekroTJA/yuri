import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import styles from "./ApiDocs.module.css";
import {
  API_CLIENT,
  type SwaggerOperation,
  type SwaggerParameter,
  type SwaggerSchema,
  type SwaggerSpec,
} from "../../services/apiclient";
import { errorMessage } from "../../utils/errors";
import IconButton from "../../components/IconButton/IconButton";
import ErrorTile from "../../components/ErrorTile/ErrorTile";
import BackIcon from "../../assets/back.svg?react";
import DownloadIcon from "../../assets/download.svg?react";

const methodOrder = ["get", "post", "put", "patch", "delete"];

type Endpoint = {
  method: string;
  path: string;
  operation: SwaggerOperation;
};

type EndpointGroup = {
  tag: string;
  endpoints: Endpoint[];
};

// Groups all operations of the spec by their first tag, keeping the order in
// which the tags first appear.
function groupEndpointsByTag(spec: SwaggerSpec): EndpointGroup[] {
  const groups = new Map<string, Endpoint[]>();
  for (const [path, operations] of Object.entries(spec.paths)) {
    const methods = Object.keys(operations).sort(
      (a, b) => methodOrder.indexOf(a) - methodOrder.indexOf(b),
    );
    for (const method of methods) {
      const operation = operations[method];
      const tag = operation.tags?.[0] ?? "Other";
      const endpoints = groups.get(tag) ?? [];
      endpoints.push({ method, path, operation });
      groups.set(tag, endpoints);
    }
  }
  return [...groups].map(([tag, endpoints]) => ({ tag, endpoints }));
}

// Returns the definition name referenced by the given $ref, e.g.
// "models.SoundResponse" for "#/definitions/models.SoundResponse".
function definitionName(ref: string): string {
  return ref.replace(/^#\/definitions\//, "");
}

// Strips the Go package prefix from a definition name for display.
function displayName(name: string): string {
  return name.slice(name.lastIndexOf(".") + 1);
}

function modelAnchorId(name: string): string {
  return `model-${name}`;
}

function scrollToModel(name: string) {
  document
    .getElementById(modelAnchorId(name))
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Converts a parameter which is not passed in the body into a schema so that
// it can be displayed the same way as body schemas.
function parameterSchema(param: SwaggerParameter): SwaggerSchema {
  return (
    param.schema ?? {
      type: param.type,
      format: param.format,
      items: param.items,
      enum: param.enum,
    }
  );
}

export default function ApiDocs() {
  const navigate = useNavigate();
  const [spec, setSpec] = useState<SwaggerSpec | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    API_CLIENT.getApiDocs()
      .then(setSpec)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <IconButton title="Back" onClick={() => navigate("/settings")}>
          <BackIcon />
        </IconButton>
        <h1 className={styles.title}>API Documentation</h1>
        <a
          className={styles.rawLink}
          href={API_CLIENT.getApiDocsUrl()}
          target="_blank"
          rel="noreferrer"
          title="Open the raw Swagger specification"
        >
          <DownloadIcon />
          swagger.json
        </a>
      </header>

      {!!error && <ErrorTile message={error} />}
      {!spec && !error && <span className={styles.muted}>Loading...</span>}
      {!!spec && <SpecView spec={spec} />}
    </div>
  );
}

function SpecView({ spec }: { spec: SwaggerSpec }) {
  const groups = groupEndpointsByTag(spec);
  const definitions = Object.entries(spec.definitions ?? {}).sort(([a], [b]) =>
    displayName(a).localeCompare(displayName(b)),
  );

  return (
    <>
      <section className={styles.section}>
        <p className={styles.description}>{spec.info.description}</p>
        <dl className={styles.info}>
          <dt>Version</dt>
          <dd>{spec.info.version}</dd>
          <dt>Base path</dt>
          <dd>
            <code>{spec.basePath ?? "/"}</code>
          </dd>
          {Object.entries(spec.securityDefinitions ?? {}).map(
            ([name, scheme]) => (
              <SecurityScheme
                key={name}
                name={name}
                location={scheme.in}
                headerName={scheme.name}
                description={scheme.description}
              />
            ),
          )}
        </dl>
      </section>

      {groups.map((g) => (
        <section key={g.tag} className={styles.section}>
          <h2 className={styles.sectionTitle}>{g.tag}</h2>
          <ul className={styles.endpoints}>
            {g.endpoints.map((e) => (
              <li key={`${e.method} ${e.path}`}>
                <EndpointView endpoint={e} basePath={spec.basePath ?? ""} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {definitions.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Models</h2>
          <ul className={styles.models}>
            {definitions.map(([name, schema]) => (
              <li key={name} id={modelAnchorId(name)} className={styles.model}>
                <span className={styles.modelName}>{displayName(name)}</span>
                <ModelView schema={schema} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SecurityScheme({
  name,
  location,
  headerName,
  description,
}: {
  name: string;
  location?: string;
  headerName?: string;
  description?: string;
}) {
  return (
    <>
      <dt>Auth</dt>
      <dd>
        <span className={styles.securityName}>{name}</span>
        {!!headerName && (
          <>
            {" "}
            via {location} <code>{headerName}</code>
          </>
        )}
        {!!description && (
          <span className={styles.securityDescription}>{description}</span>
        )}
      </dd>
    </>
  );
}

function EndpointView({
  endpoint,
  basePath,
}: {
  endpoint: Endpoint;
  basePath: string;
}) {
  const { method, path, operation } = endpoint;
  const parameters = operation.parameters ?? [];
  const bodyParameter = parameters.find((p) => p.in == "body");
  const otherParameters = parameters.filter((p) => p.in != "body");

  return (
    <details className={styles.endpoint}>
      <summary className={styles.endpointSummary}>
        <span className={`${styles.method} ${styles[method] ?? ""}`}>
          {method}
        </span>
        <PathView path={path} />
        <span className={styles.endpointTitle}>{operation.summary}</span>
      </summary>

      <div className={styles.endpointBody}>
        {!!operation.description && (
          <p className={styles.description}>{operation.description}</p>
        )}

        <div className={styles.facts}>
          <code>
            {method.toUpperCase()} {basePath}
            {path}
          </code>
          {!!operation.security?.length && (
            <span className={styles.pill}>Requires authentication</span>
          )}
          {operation.consumes?.map((c) => (
            <span key={`consumes-${c}`} className={styles.pill}>
              Accepts {c}
            </span>
          ))}
          {operation.produces?.map((p) => (
            <span key={`produces-${p}`} className={styles.pill}>
              Returns {p}
            </span>
          ))}
        </div>

        {otherParameters.length > 0 && (
          <>
            <h3 className={styles.subTitle}>Parameters</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>In</th>
                  <th>Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {otherParameters.map((p) => (
                  <tr key={`${p.in}-${p.name}`}>
                    <td>
                      <code>{p.name}</code>
                      {!!p.required && (
                        <span className={styles.required}>required</span>
                      )}
                    </td>
                    <td>{p.in}</td>
                    <td>
                      <SchemaType schema={parameterSchema(p)} />
                    </td>
                    <td>{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {!!bodyParameter?.schema && (
          <>
            <h3 className={styles.subTitle}>Request body</h3>
            <div className={styles.bodyType}>
              <SchemaType schema={bodyParameter.schema} />
              {!!bodyParameter.description && (
                <span className={styles.muted}>
                  {bodyParameter.description}
                </span>
              )}
            </div>
          </>
        )}

        <h3 className={styles.subTitle}>Responses</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Description</th>
              <th>Body</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(operation.responses).map(([status, response]) => (
              <tr key={status}>
                <td>
                  <span
                    className={`${styles.status} ${status.startsWith("2") ? styles.success : styles.failure}`}
                  >
                    {status}
                  </span>
                </td>
                <td>{response.description}</td>
                <td>
                  {response.schema ? (
                    <SchemaType schema={response.schema} />
                  ) : (
                    <span className={styles.muted}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// Renders the path with highlighted path parameters.
function PathView({ path }: { path: string }) {
  return (
    <code className={styles.path}>
      {path.split(/(\{[^}]+\})/).map((segment, i) =>
        segment.startsWith("{") ? (
          <span key={i} className={styles.pathParam}>
            {segment}
          </span>
        ) : (
          segment
        ),
      )}
    </code>
  );
}

function SchemaType({ schema }: { schema: SwaggerSchema }) {
  if (schema.$ref) {
    const name = definitionName(schema.$ref);
    return (
      <button
        className={styles.modelLink}
        title="Show model"
        onClick={() => scrollToModel(name)}
      >
        {displayName(name)}
      </button>
    );
  }

  if (schema.type == "array" && schema.items) {
    // Enum values of the items are listed after the brackets so that they
    // are not mistaken for part of the item type.
    return (
      <span className={styles.type}>
        <SchemaType schema={{ ...schema.items, enum: undefined }} />
        []
        <EnumValues values={schema.items.enum} />
      </span>
    );
  }

  return (
    <span className={styles.type}>
      {schema.type ?? "any"}
      {!!schema.format && (
        <span className={styles.muted}> ({schema.format})</span>
      )}
      <EnumValues values={schema.enum} />
    </span>
  );
}

function EnumValues({ values }: { values?: (string | number)[] }) {
  if (!values) return null;
  return (
    <span className={styles.enum}>
      {values.map((v) => (
        <code key={v}>{v}</code>
      ))}
    </span>
  );
}

function ModelView({ schema }: { schema: SwaggerSchema }) {
  const properties = Object.entries(schema.properties ?? {});
  if (properties.length == 0) {
    return <SchemaType schema={schema} />;
  }

  const hasDescriptions = properties.some(([, p]) => !!p.description);

  return (
    <table className={`${styles.table} ${styles.modelTable}`}>
      <tbody>
        {properties.map(([name, property]) => (
          <tr key={name}>
            <td>
              <code>{name}</code>
              {!!schema.required?.includes(name) && (
                <span className={styles.required}>required</span>
              )}
            </td>
            <td>
              <SchemaType schema={property} />
            </td>
            {hasDescriptions && <td>{property.description}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
