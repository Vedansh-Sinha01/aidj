import { ConfidentialClientApplication, type ICachePlugin } from "@azure/msal-node";
import { prisma } from "@/lib/prisma";

const GRAPH_SCOPES = ["Mail.Read", "Mail.Send", "Calendars.Read", "User.Read", "offline_access"];

export function isMicrosoftIntegrationConfigured() {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

/** Persists the MSAL token cache (which internally holds the refresh token) per user. */
function cachePluginFor(userId: string): ICachePlugin {
  return {
    beforeCacheAccess: async (context) => {
      const account = await prisma.microsoftAccount.findUnique({ where: { userId } });
      if (account?.tokenCache) context.tokenCache.deserialize(account.tokenCache);
    },
    afterCacheAccess: async (context) => {
      if (!context.cacheHasChanged) return;
      const serialized = context.tokenCache.serialize();
      await prisma.microsoftAccount
        .update({ where: { userId }, data: { tokenCache: serialized } })
        .catch(() => {
          // No row yet on first sign-in — the callback route creates it right after.
        });
    },
  };
}

function msalClient(cachePlugin?: ICachePlugin) {
  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}`,
    },
    cache: cachePlugin ? { cachePlugin } : undefined,
  });
}

export function getRedirectUri() {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/api/integrations/microsoft/callback`;
}

/** §8 — per-user OAuth connect. Each user authorizes their own mailbox/calendar. */
export async function getMicrosoftAuthUrl(state: string) {
  const client = msalClient();
  return client.getAuthCodeUrl({
    scopes: GRAPH_SCOPES,
    redirectUri: getRedirectUri(),
    state,
  });
}

export async function exchangeCodeForTokens(userId: string, code: string) {
  const client = msalClient(cachePluginFor(userId));
  const result = await client.acquireTokenByCode({
    code,
    scopes: GRAPH_SCOPES,
    redirectUri: getRedirectUri(),
  });
  if (!result) throw new Error("Microsoft token exchange failed");
  return { result, serializedCache: client.getTokenCache().serialize() };
}

/** Returns a valid access token, silently refreshing via the persisted MSAL cache if needed. */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.microsoftAccount.findUnique({ where: { userId } });
  if (!account) return null;

  const client = msalClient(cachePluginFor(userId));
  const cache = client.getTokenCache();
  await cache.deserialize(account.tokenCache);
  const accounts = await cache.getAllAccounts();
  const msalAccount = accounts.find((a) => a.homeAccountId) ?? accounts[0];
  if (!msalAccount) return null;

  const result = await client.acquireTokenSilent({ account: msalAccount, scopes: GRAPH_SCOPES });
  return result?.accessToken ?? null;
}

async function graphFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

/** Manual compose/send (§8) — always a direct human click-to-send, never automated. */
export async function sendMailViaGraph(accessToken: string, to: string, subject: string, body: string) {
  return graphFetch(accessToken, "/me/sendMail", {
    method: "POST",
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    }),
  });
}

export async function fetchRecentMessages(accessToken: string, sinceISO: string) {
  const data = await graphFetch(
    accessToken,
    `/me/messages?$filter=receivedDateTime ge ${sinceISO}&$top=50&$select=id,subject,from,receivedDateTime,sentDateTime,conversationId`
  );
  return (data?.value ?? []) as Array<{
    id: string;
    subject?: string;
    from?: { emailAddress?: { address?: string } };
    receivedDateTime?: string;
    sentDateTime?: string;
  }>;
}

export async function fetchRecentEvents(accessToken: string, sinceISO: string) {
  const data = await graphFetch(
    accessToken,
    `/me/events?$filter=start/dateTime ge '${sinceISO}'&$top=50&$select=id,subject,start,attendees`
  );
  return (data?.value ?? []) as Array<{
    id: string;
    subject?: string;
    start?: { dateTime?: string };
    attendees?: Array<{ emailAddress?: { address?: string } }>;
  }>;
}
