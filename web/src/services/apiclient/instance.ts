import { ApiClient } from "./client";

// The backend root URL can be injected at build time via the VITE_API_URL
// environment variable. When unset, it defaults to "/", i.e. the API is
// called on the same origin the web app is served from.
export const API_CLIENT = new ApiClient(import.meta.env.VITE_API_URL ?? "/");
