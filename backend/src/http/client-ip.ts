// Trusted-client-IP boundary.
//
// Default: use the transport peer address supplied by the runtime. Forwarding
// headers are ignored, so an arbitrary client cannot choose its rate-limit or
// audit identity with X-Forwarded-For/X-Real-IP.
//
// A deployment behind a trusted proxy must explicitly opt in with one header.
// For X-Forwarded-For, `trustedProxyHops` is the number of proxies that append
// to the chain; the resolver takes the Nth value from the right, never the
// attacker-controlled leftmost value.
import type { Context } from 'hono';

export type TrustedProxyHeader = 'cf-connecting-ip' | 'x-forwarded-for';

export interface ClientIpPolicy {
  trustedProxyHeader?: TrustedProxyHeader;
  trustedProxyHops?: number;
}

export interface ClientIpInput {
  directIp?: string | null;
  cfConnectingIp?: string | null;
  forwardedFor?: string | null;
}

export type ClientIpResolver = (c: Context) => string;

const IP_LIKE = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-fA-F:.]{2,45})$/;

function normalizeIp(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate || !IP_LIKE.test(candidate)) return null;
  return candidate;
}

export function resolveClientIp(input: ClientIpInput, policy: ClientIpPolicy = {}): string {
  const direct = normalizeIp(input.directIp) ?? 'unknown';
  if (!policy.trustedProxyHeader) return direct;

  if (policy.trustedProxyHeader === 'cf-connecting-ip') {
    return normalizeIp(input.cfConnectingIp) ?? direct;
  }

  const hops = Math.max(1, policy.trustedProxyHops ?? 1);
  const chain = (input.forwardedFor ?? '')
    .split(',')
    .map((part) => normalizeIp(part))
    .filter((part): part is string => part !== null);
  if (chain.length < hops) return direct;
  return chain[chain.length - hops] ?? direct;
}

export function createClientIpResolver(policy: ClientIpPolicy = {}): ClientIpResolver {
  return (c: Context) => {
    const env = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
    return resolveClientIp({
      directIp: env?.incoming?.socket?.remoteAddress,
      cfConnectingIp: c.req.header('cf-connecting-ip'),
      forwardedFor: c.req.header('x-forwarded-for'),
    }, policy);
  };
}
