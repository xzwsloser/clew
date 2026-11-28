import type { z } from 'zod';

export interface DshRpcFailure {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
}

export type DshRpcResult<T = unknown> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DshRpcFailure };

export interface DshFetchRoute {
  readonly path: string;
  readonly methods: readonly ('GET' | 'HEAD' | 'POST')[];
  readonly requestBody: 'buffered' | 'streaming';
  readonly fetch: (request: Request) => Promise<Response>;
}

export interface DshHostConnection {
  rpc: {
    handle(
      channel: string,
      handler: (
        endpoint: string,
        payload: unknown,
        signal: AbortSignal,
        peer: unknown,
      ) => Promise<DshRpcResult>,
    ): () => Promise<void>;
  };
  fetch: {
    register(route: DshFetchRoute): () => Promise<void>;
  };
}

export interface DshStorageGlobal<G> {
  get(): G;
  set(value: G): Promise<void>;
}

export interface DshKvTable<V> {
  get(key: string): V | undefined;
  put(key: string, value: V): Promise<void>;
  delete(key: string): Promise<boolean>;
  entries(): IterableIterator<[string, V]>;
}

export interface DshDomain<G, T extends Record<string, unknown>> {
  readonly name: string;
  readonly global: DshStorageGlobal<G>;
  table<K extends keyof T & string>(name: K): DshKvTable<T[K]>;
  close(): Promise<void>;
}

export interface DshDomainSpec<G, T extends Record<string, z.ZodTypeAny>> {
  readonly name: string;
  readonly version: number;
  readonly invalidRecords?: 'backup-and-skip';
  readonly global: {
    readonly schema: z.ZodType<G>;
    readonly initial: G;
  };
  readonly tables: {
    [K in keyof T]: { readonly valueSchema: T[K] };
  };
}

export interface DshStorageDomainFacility {
  open<G, T extends Record<string, z.ZodTypeAny>>(
    spec: DshDomainSpec<G, T>,
  ): Promise<DshDomain<G, { [K in keyof T]: z.infer<T[K]> }>>;
}

export interface DshToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  readonly output: {
    readonly schema: Record<string, unknown>;
    readonly render: (args: unknown, value: unknown) => Array<{ type: 'text'; text: string }>;
  };
  execute(args: unknown, exec: { signal: AbortSignal }): Promise<unknown>;
  isConcurrencySafe?(args: unknown): boolean;
}

export interface DshToolRuntime {
  register(definition: DshToolDefinition): () => void;
}

export interface DshSkillRegistration {
  readonly name: string;
  readonly description: string;
  readonly content: string;
  readonly invocation?: {
    readonly modelInvocable?: boolean;
    readonly userInvocable?: boolean;
  };
}

export interface DshSkillRegistry {
  register(skill: DshSkillRegistration): () => void;
}

export interface DshAgentsService {
  list?(): unknown[];
}

export interface DshHostContext {
  connection: DshHostConnection;
  storageDomain: DshStorageDomainFacility;
  tools: DshToolRuntime;
  skills: DshSkillRegistry;
  agents?: DshAgentsService;
  get<T = unknown>(key: string): T | undefined;
  effect(fn: () => void | (() => void | Promise<void>), label?: string): () => void;
  inject(deps: string[], callback: (ctx: DshHostContext) => void): () => void;
}

export interface DshClientLocale {
  register(ns: string, dicts: Record<string, Record<string, unknown>>): () => void;
  bind(ns: string): (key: string, params?: Record<string, string | number>) => string;
  getSnapshot(): { active: string; revision: number };
  subscribe(listener: () => void): () => void;
}

export interface DshClientSlots {
  inject(name: string, fn: () => () => void): () => void;
  register(options: Record<string, unknown>, component: unknown): () => void;
}

export interface DshClientConnection {
  rpc: {
    call<T = unknown>(
      channel: string,
      endpoint: string,
      payload: unknown,
      signal?: AbortSignal,
    ): Promise<DshRpcResult<T>>;
  };
}

export interface DshClientContext {
  locale: DshClientLocale;
  slots: DshClientSlots;
  connection: DshClientConnection;
  effect(fn: () => void | (() => void), label?: string): () => void;
}
