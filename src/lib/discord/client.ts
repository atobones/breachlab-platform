const DISCORD_API = "https://discord.com/api/v10";

export function hasBotToken(): boolean {
  return Boolean(process.env.DISCORD_BOT_TOKEN);
}

export async function discordBotFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!hasBotToken()) {
    throw new Error("discord bot token not configured");
  }
  return fetch(`${DISCORD_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}
