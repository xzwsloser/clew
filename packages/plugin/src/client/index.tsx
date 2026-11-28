import { useCallback, useEffect, useState } from 'react';
import {
  AgentPingResponseSchema,
  HealthCheckResponseSchema,
  type AgentPingResponse,
  type HealthCheckResponse,
} from '@clew/shared/contracts';
import en from '../../locale/en.json' with { type: 'json' };
import zh from '../../locale/zh.json' with { type: 'json' };
import type { DshClientContext, DshRpcResult } from '../types/dsh.js';
import { CLEW_SCOPED_CSS } from './styles.js';

const NS = 'clew';
const PANEL_ID = 'clew';

function flattenDict(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[fullKey] = value;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenDict(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

async function callClewRpc<T>(endpoint: string, payload: unknown): Promise<DshRpcResult<T>> {
  try {
    const res = await fetch('/api/clew/rpc', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, payload }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: {
          code: `HTTP_${res.status}`,
          message: `Request failed with HTTP ${res.status}`,
          details: {},
        },
      };
    }
    return (await res.json()) as DshRpcResult<T>;
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'CLEW_TRANSPORT_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
        details: {},
      },
    };
  }
}

function ClewBrandIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="16"
        y="16"
        width="224"
        height="224"
        rx="48"
        fill="#14171C"
        stroke="#2A303B"
        strokeWidth="6"
      />
      <circle cx="128" cy="108" r="56" stroke="#E07A2F" strokeWidth="10" />
      <ellipse
        cx="128"
        cy="108"
        rx="52"
        ry="28"
        transform="rotate(-32 128 108)"
        stroke="#F59E0B"
        strokeWidth="8"
      />
      <path
        d="M128 164C128 178 106 178 90 178C74 178 74 202 92 202H144L170 178L194 202"
        stroke="#E07A2F"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="144" cy="202" r="11" fill="#2DD4BF" />
      <circle cx="170" cy="178" r="11" fill="#2DD4BF" />
      <circle cx="194" cy="202" r="11" fill="#F4F1EA" />
    </svg>
  );
}

interface ClewPanelProps {
  ctx: DshClientContext;
  t: (key: string) => string;
}

function ClewWorkbenchBootstrap({ ctx, t }: ClewPanelProps) {
  const [localeRev, setLocaleRev] = useState(() => ctx.locale.getSnapshot().revision);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [agentPing, setAgentPing] = useState<AgentPingResponse | null>(null);
  const [sseStatus, setSseStatus] = useState<string>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    return ctx.locale.subscribe(() => {
      setLocaleRev(ctx.locale.getSnapshot().revision);
    });
  }, [ctx]);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await callClewRpc<HealthCheckResponse>('health', { echo: 'workbench' });
    if (!result.ok) {
      setError(`${result.error.code}: ${result.error.message}`);
      setLoading(false);
      return;
    }
    const parsed = HealthCheckResponseSchema.safeParse(result.value);
    if (!parsed.success) {
      setError('Invalid health payload from host');
      setLoading(false);
      return;
    }
    setHealth(parsed.data);
    setLoading(false);
  }, []);

  const probeAgent = useCallback(async () => {
    const result = await callClewRpc<AgentPingResponse>('agent-ping', {});
    if (!result.ok) {
      setError(`${result.error.code}: ${result.error.message}`);
      return;
    }
    const parsed = AgentPingResponseSchema.safeParse(result.value);
    if (parsed.success) {
      setAgentPing(parsed.data);
    }
  }, []);

  useEffect(() => {
    void loadHealth();

    const source = new EventSource('/api/clew/events');
    source.addEventListener('heartbeat', (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent<string>).data) as { seq?: number };
        setSseStatus(`connected (seq ${data.seq ?? 0})`);
      } catch {
        setSseStatus('connected');
      }
    });
    source.onerror = () => {
      setSseStatus('reconnecting');
    };
    return () => {
      source.close();
    };
  }, [loadHealth]);

  return (
    <div className="clew-root" data-clew-locale-rev={localeRev}>
      <header className="clew-header">
        <div className="clew-brand">
          <ClewBrandIcon size={28} />
          <div>
            <h1 className="clew-title">
              {t('panel.label')} <span className="clew-badge">{t('panel.badge')}</span>
            </h1>
            <p className="clew-tagline">{t('panel.tagline')}</p>
          </div>
        </div>
        <div className="clew-actions">
          <button
            type="button"
            className="clew-btn"
            onClick={() => void probeAgent()}
            data-testid="clew-probe-agent"
          >
            {t('panel.pingAgent')}
          </button>
          <button
            type="button"
            className="clew-btn clew-btn-primary"
            onClick={() => void loadHealth()}
            data-testid="clew-refresh-health"
          >
            {t('panel.refresh')}
          </button>
        </div>
      </header>

      {error && (
        <div className="clew-error-box" role="alert" data-testid="clew-error-banner">
          {t('panel.error')}: {error}
        </div>
      )}

      {loading && !health ? (
        <p data-testid="clew-loading">{t('panel.loading')}</p>
      ) : (
        health && (
          <div className="clew-grid">
            <section className="clew-card" data-testid="clew-status-card">
              <h2 className="clew-card-title">{t('panel.statusTitle')}</h2>
              <div className="clew-kv">
                <span>{t('panel.storageLabel')}</span>
                <span className="clew-status-ok">{health.storageReady ? t('panel.ready') : 'N/A'}</span>
              </div>
              <div className="clew-kv">
                <span>{t('panel.agentLabel')}</span>
                <span className="clew-mono">
                  {health.agentServiceAvailable ? 'ctx.agents OK' : 'unavailable'}
                </span>
              </div>
              <div className="clew-kv">
                <span>{t('panel.persistedPingsLabel')}</span>
                <span className="clew-mono" data-testid="clew-persisted-pings">
                  {health.persistedPings}
                </span>
              </div>
              <div className="clew-kv">
                <span>{t('panel.sseTitle')}</span>
                <span className="clew-mono" data-testid="clew-sse-status">
                  {sseStatus}
                </span>
              </div>
            </section>

            <section className="clew-card">
              <h2 className="clew-card-title">{t('panel.toolsTitle')}</h2>
              <div>
                {health.registeredTools.map((tool) => (
                  <span key={tool} className="clew-pill">
                    {tool}
                  </span>
                ))}
              </div>
              <h2 className="clew-card-title" style={{ marginTop: 12 }}>
                {t('panel.skillsTitle')}
              </h2>
              <div>
                {health.registeredSkills.map((skill) => (
                  <span key={skill} className="clew-pill">
                    {skill}
                  </span>
                ))}
              </div>
            </section>

            <section className="clew-card">
              <h2 className="clew-card-title">{t('panel.languagesLabel')}</h2>
              <div>
                {health.supportedLanguages.map((lang) => (
                  <span key={lang} className="clew-pill">
                    {lang}
                  </span>
                ))}
              </div>
              {agentPing && (
                <p className="clew-mono" style={{ marginTop: 10 }} data-testid="clew-agent-ping-result">
                  [{agentPing.mode}] {agentPing.message}
                </p>
              )}
            </section>
          </div>
        )
      )}
    </div>
  );
}

export const inject = ['locale', 'slots', 'connection'];

export function apply(ctx: DshClientContext): void {
  ctx.effect(
    () => ctx.locale.register(NS, { en: flattenDict(en), zh: flattenDict(zh) }),
    'clew:locale',
  );
  const t = ctx.locale.bind(NS);

  ctx.effect(() => {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-clew-styles', 'true');
    styleEl.textContent = CLEW_SCOPED_CSS;
    document.head.appendChild(styleEl);
    return () => {
      styleEl.remove();
    };
  }, 'clew:styles');

  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register(
      {
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 20,
        label: () => t('panel.label'),
        locale: NS,
      },
      ({ size }: { size?: number }) => <ClewBrandIcon size={size ?? 18} />,
    ),
  );

  ctx.slots.inject('main', () =>
    ctx.slots.register(
      {
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      },
      () => <ClewWorkbenchBootstrap ctx={ctx} t={t} />,
    ),
  );
}
