import { ApiEventStream } from "./events";
import type {
  APIKeyCreateRequest,
  APIKeyCreateResponse,
  APIKeyResponse,
  APIKeyUpdateRequest,
  AuthRequest,
  ChannelConnectionResponse,
  ChannelInviteCreateRequest,
  ChannelInviteResponse,
  ChannelRequest,
  ChannelResponse,
  RegisterResponse,
  SoundCopyRequest,
  SoundImportResponse,
  SoundResponse,
  SoundTrimRequest,
  SoundUpdateRequest,
  UploadSoundRequest,
} from "./models";

const apiPrefix = "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;

export class ApiClient {
  private readonly baseUrl: string;

  private unauthorizedHandler: UnauthorizedHandler | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Registers a callback invoked whenever any request fails with 401
  // Unauthorized, e.g. to redirect the user to the login page.
  onUnauthorized(handler: UnauthorizedHandler): void {
    this.unauthorizedHandler = handler;
  }

  // -- Auth ------------------------------------------------------------

  async register(handle: string, password: string): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ handle, password } satisfies AuthRequest),
    });
  }

  async login(handle: string, password: string): Promise<void> {
    await this.request<void>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ handle, password } satisfies AuthRequest),
    });
  }

  // -- API keys ----------------------------------------------------------

  async listApiKeys(): Promise<APIKeyResponse[]> {
    return this.request<APIKeyResponse[]>("/apikeys");
  }

  async createApiKey(req: APIKeyCreateRequest): Promise<APIKeyCreateResponse> {
    return this.request<APIKeyCreateResponse>("/apikeys", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async updateApiKey(
    id: number,
    req: APIKeyUpdateRequest,
  ): Promise<APIKeyResponse> {
    return this.request<APIKeyResponse>(`/apikeys/${id}`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async deleteApiKey(id: number): Promise<void> {
    await this.request<void>(`/apikeys/${id}`, { method: "DELETE" });
  }

  // -- Sounds --------------------------------------------------------------

  async listSounds(): Promise<SoundResponse[]> {
    return this.request<SoundResponse[]>("/sounds");
  }

  async uploadSound(req: UploadSoundRequest): Promise<SoundResponse> {
    const form = new FormData();
    form.append("handle", req.handle);
    if (req.file) {
      form.append("file", req.file);
    }
    if (req.url) {
      form.append("url", req.url);
    }
    for (const tag of req.tags ?? []) {
      form.append("tags", tag);
    }
    for (const filter of req.filters ?? []) {
      form.append("filters", filter);
    }

    return this.request<SoundResponse>("/sounds", {
      method: "POST",
      body: form,
    });
  }

  // Downloads all sounds as a .tar.gz archive containing a meta.json and
  // the sound files in the sounds/ directory.
  async exportSounds(): Promise<Blob> {
    const response = await fetch(this.url("/sounds/export"), {
      credentials: "include",
    });
    if (!response.ok) {
      throw await this.toError(response);
    }
    return response.blob();
  }

  // Imports all sounds from an archive created by exportSounds. Sounds with
  // names which already exist are skipped.
  async importSounds(archive: File | Blob): Promise<SoundImportResponse> {
    const form = new FormData();
    form.append("file", archive);

    return this.request<SoundImportResponse>("/sounds/import", {
      method: "POST",
      body: form,
    });
  }

  async getSound(idOrHandle: number | string): Promise<Blob> {
    const response = await fetch(this.url(`/sounds/${idOrHandle}`), {
      credentials: "include",
    });
    if (!response.ok) {
      throw await this.toError(response);
    }
    return response.blob();
  }

  // Absolute URL to the raw sound file, suitable for use as an <audio> src.
  getSoundUrl(idOrHandle: number | string): string {
    return this.url(`/sounds/${idOrHandle}`);
  }

  async updateSound(
    idOrHandle: number | string,
    req: SoundUpdateRequest,
  ): Promise<SoundResponse> {
    return this.request<SoundResponse>(`/sounds/${idOrHandle}`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  // Creates a new sound with the given handle and tags using a copy of the
  // file of the given sound.
  async copySound(
    idOrHandle: number | string,
    req: SoundCopyRequest,
  ): Promise<SoundResponse> {
    return this.request<SoundResponse>(`/sounds/${idOrHandle}/copy`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  // Cuts the sound to the given range. The trimmed sound replaces the
  // original one.
  async trimSound(
    idOrHandle: number | string,
    req: SoundTrimRequest,
  ): Promise<SoundResponse> {
    return this.request<SoundResponse>(`/sounds/${idOrHandle}/trim`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async deleteSound(idOrHandle: number | string): Promise<void> {
    await this.request<void>(`/sounds/${idOrHandle}`, { method: "DELETE" });
  }

  async playSound(idOrHandle: number | string): Promise<void> {
    await this.request<void>(`/sounds/${idOrHandle}/play`, { method: "POST" });
  }

  // -- Channels --------------------------------------------------------------

  async listChannels(): Promise<ChannelResponse[]> {
    return this.request<ChannelResponse[]>("/channels");
  }

  async getChannel(id: number): Promise<ChannelResponse> {
    return this.request<ChannelResponse>(`/channels/${id}`);
  }

  async createChannel(req: ChannelRequest): Promise<ChannelResponse> {
    return this.request<ChannelResponse>("/channels", {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async updateChannel(
    id: number,
    req: ChannelRequest,
  ): Promise<ChannelResponse> {
    return this.request<ChannelResponse>(`/channels/${id}`, {
      method: "POST",
      body: JSON.stringify(req),
    });
  }

  async deleteChannel(id: number): Promise<void> {
    await this.request<void>(`/channels/${id}`, { method: "DELETE" });
  }

  async connectChannel(id: number): Promise<ChannelConnectionResponse> {
    return this.request<ChannelConnectionResponse>(`/channels/${id}/connect`, {
      method: "POST",
    });
  }

  async disconnectChannel(): Promise<void> {
    await this.request<void>("/channels/disconnect", { method: "POST" });
  }

  // -- Channel invites -------------------------------------------------------

  async listChannelInvites(
    channelId: number,
  ): Promise<ChannelInviteResponse[]> {
    return this.request<ChannelInviteResponse[]>(
      `/channels/${channelId}/invites`,
    );
  }

  async createChannelInvite(
    channelId: number,
    req: ChannelInviteCreateRequest,
  ): Promise<ChannelInviteResponse> {
    return this.request<ChannelInviteResponse>(
      `/channels/${channelId}/invites`,
      {
        method: "POST",
        body: JSON.stringify(req),
      },
    );
  }

  async deleteChannelInvite(
    channelId: number,
    inviteId: number,
  ): Promise<void> {
    await this.request<void>(`/channels/${channelId}/invites/${inviteId}`, {
      method: "DELETE",
    });
  }

  async redeemInvite(code: string): Promise<ChannelResponse> {
    return this.request<ChannelResponse>(`/invites/${code}`, {
      method: "POST",
    });
  }

  // -- Events (SSE) ------------------------------------------------------

  // Opens the /events SSE stream. Register handlers per event type on the
  // returned stream and call close() (e.g. in a useEffect cleanup) when done.
  connectEvents(): ApiEventStream {
    return new ApiEventStream(this.url("/events"));
  }

  // -- Internals -------------------------------------------------------

  private url(path: string): string {
    const base = this.baseUrl.endsWith("/")
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;
    return `${base}${apiPrefix}${path}`;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const isFormBody = init?.body instanceof FormData;

    const response = await fetch(this.url(path), {
      ...init,
      credentials: "include",
      headers: {
        ...(isFormBody ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw await this.toError(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async toError(response: Response): Promise<ApiError> {
    let message = response.statusText;
    let code = "internal";
    try {
      const body = (await response.json()) as { code: string; message: string };
      message = body.message;
      code = body.code;
    } catch {
      // Response body was not JSON, fall back to the status text.
    }

    if (response.status === 401) {
      this.unauthorizedHandler?.();
    }

    return new ApiError(response.status, code, message);
  }
}
