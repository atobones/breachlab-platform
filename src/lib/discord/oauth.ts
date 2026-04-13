const DISCORD_API = "https://discord.com/api/v10";

export function isConfigured(): boolean {
  return Boolean(
    process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET,
  );
}

function redirectUri(): string {
  const site = process.env.SITE_URL ?? "http://localhost:3000";
  return `${site}/api/auth/discord/callback`;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    response_type: "code",
    scope: "identify",
    state,
    redirect_uri: redirectUri(),
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  tokenType: string;
}> {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID ?? "",
    client_secret: process.env.DISCORD_CLIENT_SECRET ?? "",
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
  });
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`discord token exchange failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    token_type: string;
  };
  return { accessToken: json.access_token, tokenType: json.token_type };
}

export async function fetchUser(accessToken: string): Promise<{
  id: string;
  username: string;
}> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`discord user fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as { id: string; username: string };
  return { id: json.id, username: json.username };
}
