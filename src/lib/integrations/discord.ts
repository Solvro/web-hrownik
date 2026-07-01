import { env } from "@/env";

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordConfig {
  botToken: string;
  guildId: string;
  inviteChannelId: string | undefined;
}

function getDiscordConfig(): DiscordConfig | null {
  if (
    env.DISCORD_BOT_TOKEN === undefined ||
    env.DISCORD_GUILD_ID === undefined
  ) {
    return null;
  }
  return {
    botToken: env.DISCORD_BOT_TOKEN,
    guildId: env.DISCORD_GUILD_ID,
    inviteChannelId: env.DISCORD_INVITE_CHANNEL_ID,
  };
}

export function isDiscordConfigured(): boolean {
  return getDiscordConfig() !== null;
}

async function discordRequest(
  botToken: string,
  path: string,
  init?: RequestInit,
) {
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    method: init?.method,
    body: init?.body,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Discord API request to ${path} failed: ${response.status} ${await response.text()}`,
    );
  }

  return response;
}

/** Creates a single-use onboarding invite link to hand to a new member. */
export async function createOnboardingInvite(): Promise<string | null> {
  const config = getDiscordConfig();
  if (config?.inviteChannelId === undefined) {
    console.warn(
      "Discord integration not configured, skipping onboarding invite creation",
    );
    return null;
  }

  const response = await discordRequest(
    config.botToken,
    `/channels/${config.inviteChannelId}/invites`,
    {
      method: "POST",
      body: JSON.stringify({ max_uses: 1, unique: true }),
    },
  );
  const invite = (await response.json()) as { code: string };
  return `https://discord.gg/${invite.code}`;
}

export async function addGuildMemberRole(
  discordUserId: string,
  roleId: string,
): Promise<void> {
  const config = getDiscordConfig();
  if (config === null) {
    console.warn(
      `Discord integration not configured, skipping role grant for ${discordUserId}`,
    );
    return;
  }

  await discordRequest(
    config.botToken,
    `/guilds/${config.guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "PUT" },
  );
}

export async function removeGuildMemberRole(
  discordUserId: string,
  roleId: string,
): Promise<void> {
  const config = getDiscordConfig();
  if (config === null) {
    console.warn(
      `Discord integration not configured, skipping role revoke for ${discordUserId}`,
    );
    return;
  }

  await discordRequest(
    config.botToken,
    `/guilds/${config.guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "DELETE" },
  );
}
