import {
  addGuildMemberRole,
  removeGuildMemberRole,
} from "@/lib/integrations/discord";
import {
  addMemberToTeam,
  removeMemberFromTeam,
} from "@/lib/integrations/github";

interface SyncTarget {
  githubTeamSlug: string | null;
  discordRoleId: string | null;
}

interface SyncMember {
  githubUsername: string | null;
  discordId: string | null;
}

/**
 * Team membership in the database is the source of truth; GitHub/Discord
 * sync is a best-effort side effect. A failure here (app not installed,
 * bot missing permissions, rate limit, ...) is logged, not thrown, so it
 * can't leave team_member out of sync with what the board just did.
 */
export async function grantTeamAccess(
  target: SyncTarget,
  member: SyncMember,
): Promise<void> {
  if (target.githubTeamSlug !== null && member.githubUsername !== null) {
    try {
      await addMemberToTeam(target.githubTeamSlug, member.githubUsername);
    } catch (error) {
      console.warn(
        `Failed to add ${member.githubUsername} to GitHub team ${target.githubTeamSlug}:`,
        error,
      );
    }
  }
  if (target.discordRoleId !== null && member.discordId !== null) {
    try {
      await addGuildMemberRole(member.discordId, target.discordRoleId);
    } catch (error) {
      console.warn(
        `Failed to grant Discord role ${target.discordRoleId} to ${member.discordId}:`,
        error,
      );
    }
  }
}

export async function revokeTeamAccess(
  target: SyncTarget,
  member: SyncMember,
): Promise<void> {
  if (target.githubTeamSlug !== null && member.githubUsername !== null) {
    try {
      await removeMemberFromTeam(target.githubTeamSlug, member.githubUsername);
    } catch (error) {
      console.warn(
        `Failed to remove ${member.githubUsername} from GitHub team ${target.githubTeamSlug}:`,
        error,
      );
    }
  }
  if (target.discordRoleId !== null && member.discordId !== null) {
    try {
      await removeGuildMemberRole(member.discordId, target.discordRoleId);
    } catch (error) {
      console.warn(
        `Failed to revoke Discord role ${target.discordRoleId} from ${member.discordId}:`,
        error,
      );
    }
  }
}
