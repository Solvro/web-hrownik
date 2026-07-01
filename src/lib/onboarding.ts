import { createOnboardingInvite } from "@/lib/integrations/discord";
import { inviteMemberToOrg } from "@/lib/integrations/github";

export interface OnboardingAutomationResult {
  githubInviteSent: boolean;
  discordInviteUrl: string | null;
}

export interface OnboardingAutomationOptions {
  member: { githubUsername: string | null };
  sendGithubInvite: boolean;
  sendDiscordInvite: boolean;
}

/**
 * Side effects triggered right after a new member record is created.
 * Each integration no-ops (unconfigured, or explicitly skipped via the
 * send*Invite flags for members who already have an account) or fails soft
 * (API error) with a console warning, so the member record itself is never
 * rolled back or left dangling behind a thrown error just because a
 * best-effort side effect failed.
 */
export async function runOnboardingAutomations({
  member,
  sendGithubInvite,
  sendDiscordInvite,
}: OnboardingAutomationOptions): Promise<OnboardingAutomationResult> {
  let githubInviteSent = false;
  if (sendGithubInvite && member.githubUsername !== null) {
    try {
      await inviteMemberToOrg(member.githubUsername);
      githubInviteSent = true;
    } catch (error) {
      console.warn(
        `Failed to invite ${member.githubUsername} to the GitHub org:`,
        error,
      );
    }
  }

  let discordInviteUrl: string | null = null;
  if (sendDiscordInvite) {
    try {
      discordInviteUrl = await createOnboardingInvite();
    } catch (error) {
      console.warn("Failed to create Discord onboarding invite:", error);
    }
  }

  await addToMailingGroup();

  return { githubInviteSent, discordInviteUrl };
}

/**
 * TODO: target system for the onboarding "grupka" (mailing list / Google
 * Group) is not decided yet — see PLAN.md. Intentional no-op until then.
 */
async function addToMailingGroup(): Promise<void> {
  // no-op
}
