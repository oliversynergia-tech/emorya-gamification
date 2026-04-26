import { redirect } from "next/navigation";

import { ReferralWelcomeScreen } from "@/components/referral-welcome-screen";
import { SiteShell } from "@/components/site-shell";
import { resolveCurrentSession } from "@/server/auth/current-user";
import { getReferralWelcomeContextForUser } from "@/server/services/referral-welcome-service";

export const dynamic = "force-dynamic";

const REFERRAL_WELCOME_WINDOW_MS = 5 * 60 * 1000;

export default async function WelcomePage() {
  const session = await resolveCurrentSession();

  if (!session) {
    redirect("/auth");
  }

  try {
    const context = await getReferralWelcomeContextForUser(session.user.id);

    if (!context?.referredBy || !context.referrer) {
      redirect("/dashboard#campaign-mission");
    }

    const createdAtMs = new Date(context.createdAt).getTime();

    if (!Number.isFinite(createdAtMs) || Date.now() - createdAtMs > REFERRAL_WELCOME_WINDOW_MS) {
      redirect("/dashboard#campaign-mission");
    }

    return (
      <SiteShell eyebrow="Welcome" currentUser={session.user}>
        <ReferralWelcomeScreen
          sessionUserId={context.userId}
          referrer={{
            displayName: context.referrer.displayName,
            level: context.referrer.level,
            totalXp: context.referrer.totalXp,
            currentStreak: context.referrer.currentStreak,
            avatarUrl: context.referrer.avatarUrl,
            referralCode: context.referrer.referralCode,
            rank: context.referrer.rank,
            referralCount: context.referrer.referralCount,
            questsCompleted: context.referrer.questsCompleted,
            attributionSource: context.referrer.attributionSource,
          }}
        />
      </SiteShell>
    );
  } catch {
    redirect("/dashboard#campaign-mission");
  }
}
