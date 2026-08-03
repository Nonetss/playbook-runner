import * as grpc from "@grpc/grpc-js"

import { authMetadata } from "#auth"

type ClientConstructor<TClient extends grpc.Client> = new (
  address: string,
  credentials: grpc.ChannelCredentials,
  options?: Partial<grpc.ClientOptions>
) => TClient

const clients = new Map<string, grpc.Client>()

/**
 * Returns a cached client for `target`. gRPC multiplexes every service over one
 * connection, so the cache is keyed by constructor + target and reused for the
 * whole process life — same idea as the single channel the Python services open
 * in their FastAPI lifespan.
 */
export function getClient<TClient extends grpc.Client>(
  Ctor: ClientConstructor<TClient>,
  target: string
): TClient {
  const key = `${Ctor.name}@${target}`
  const cached = clients.get(key)
  if (cached) return cached as TClient

  const client = new Ctor(target, grpc.credentials.createInsecure())
  clients.set(key, client)
  return client
}

/** Closes every cached client. Call on shutdown. */
export function closeClients() {
  for (const client of clients.values()) client.close()
  clients.clear()
}

export type UnaryCall<TRequest, TResponse> = (
  request: TRequest,
  metadata: grpc.Metadata,
  options: grpc.CallOptions,
  callback: (error: grpc.ServiceError | null, response: TResponse) => void
) => unknown

export type UnaryOptions = {
  token: string
  /** Defaults to 5s: a hung peer must not hang an HTTP request. */
  timeoutMs?: number
}

/**
 * Promisifies a ts-proto/grpc-js unary method and attaches the auth metadata.
 *
 * ```ts
 * const reply = await unary(client.ping.bind(client), { message }, { token })
 * ```
 *
 * The `.bind(client)` is required — the generated methods are prototype
 * methods that read `this`.
 */
export function unary<TRequest, TResponse>(
  call: UnaryCall<TRequest, TResponse>,
  request: TRequest,
  { token, timeoutMs = 5000 }: UnaryOptions
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    call(
      request,
      authMetadata(token),
      { deadline: Date.now() + timeoutMs },
      (error, response) => (error ? reject(error) : resolve(response))
    )
  })
}

export type ServerStreamCall<TRequest, TResponse> = (
  request: TRequest,
  metadata: grpc.Metadata,
  options: grpc.CallOptions
) => grpc.ClientReadableStream<TResponse>

export type ServerStreamOptions = {
  token: string
  /** Defaults to 60s: streaming scrapes run far longer than a unary call. */
  timeoutMs?: number
}

/**
 * Promisifies a ts-proto/grpc-js server-streaming method and attaches the
 * auth metadata, mirroring `unary()`.
 *
 * ```ts
 * for await (const item of serverStream(client.scrape.bind(client), { query }, { token })) {
 *   await persist(item)
 * }
 * ```
 *
 * `ClientReadableStream` is a Node `Readable` under the hood, which is
 * natively async-iterable (`for await` correctly propagates the stream's
 * `error` event as a rejection and stops the loop on `end`) — `@types/node`
 * just doesn't type that iterator generically, hence the cast.
 */
export function serverStream<TRequest, TResponse>(
  call: ServerStreamCall<TRequest, TResponse>,
  request: TRequest,
  { token, timeoutMs = 60_000 }: ServerStreamOptions
): AsyncIterable<TResponse> {
  const stream = call(request, authMetadata(token), {
    deadline: Date.now() + timeoutMs,
  })
  return stream as unknown as AsyncIterable<TResponse>
}

/** Narrows an unknown catch value to a gRPC `ServiceError`. */
export function isGrpcError(error: unknown): error is grpc.ServiceError {
  return (
    error instanceof Error &&
    typeof (error as grpc.ServiceError).code === "number"
  )
}

/** `UNAVAILABLE`, `UNAUTHENTICATED`, … for logs and error messages. */
export function grpcStatusName(error: grpc.ServiceError): string {
  return grpc.status[error.code] ?? String(error.code)
}
