// Types mirroring the subset of the Swagger 2.0 specification produced by
// swag and served at /docs/swagger.json.

export interface SwaggerSchema {
  type?: string;
  format?: string;
  $ref?: string;
  description?: string;
  items?: SwaggerSchema;
  properties?: Record<string, SwaggerSchema>;
  required?: string[];
  enum?: (string | number)[];
}

export type SwaggerParameterLocation =
  | "path"
  | "query"
  | "header"
  | "body"
  | "formData";

export interface SwaggerParameter {
  name: string;
  in: SwaggerParameterLocation;
  description?: string;
  required?: boolean;
  type?: string;
  format?: string;
  items?: SwaggerSchema;
  enum?: (string | number)[];
  collectionFormat?: string;
  schema?: SwaggerSchema;
}

export interface SwaggerResponse {
  description: string;
  schema?: SwaggerSchema;
}

export interface SwaggerOperation {
  summary?: string;
  description?: string;
  tags?: string[];
  consumes?: string[];
  produces?: string[];
  parameters?: SwaggerParameter[];
  responses: Record<string, SwaggerResponse>;
  security?: Record<string, string[]>[];
}

export interface SwaggerSecurityScheme {
  type: string;
  name?: string;
  in?: string;
  description?: string;
}

export interface SwaggerSpec {
  swagger: string;
  info: {
    title: string;
    description?: string;
    version: string;
  };
  basePath?: string;
  paths: Record<string, Record<string, SwaggerOperation>>;
  definitions?: Record<string, SwaggerSchema>;
  securityDefinitions?: Record<string, SwaggerSecurityScheme>;
}
