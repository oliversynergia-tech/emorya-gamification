import { ImageResponse } from "next/og";

import { hasDatabaseConfig } from "@/lib/config";
import { runQuery } from "@/server/db/client";

export const runtime = "nodejs";

const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 630;
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const DEFAULT_ACCENT = "#7B61FF";
const DEFAULT_BANNER_TEXT = "Join me on Emorya →";

type OgUserRow = {
  id: string;
  display_name: string | null;
  level: number | string;
  total_xp: number | string;
  current_streak: number | string;
  referral_code: string;
};

type OgAchievementRow = {
  name: string;
  category: string;
};

type OgProfile = {
  displayName: string;
  level: number;
  totalXp: number;
  currentStreak: number;
  referralCode: string;
  achievements: OgAchievementRow[];
};

function normalizeReferralCode(code: string) {
  return code.trim().toUpperCase();
}

function sanitizeDisplayName(value: string | null | undefined) {
  return value?.trim() || "Community member";
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "E";
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function getMilestoneBanner(milestone: string | null) {
  switch (milestone) {
    case "marathon_complete":
      return {
        label: "Emorya Marathon Complete!",
        color: "#FF7A45",
        background: "rgba(255, 122, 69, 0.18)",
      };
    case "weekly_warrior_complete":
      return {
        label: "7-Day Streak Complete!",
        color: "#F6C344",
        background: "rgba(246, 195, 68, 0.18)",
      };
    case "first_calorie_conversion":
      return {
        label: "First Calorie Conversion!",
        color: "#3DDC97",
        background: "rgba(61, 220, 151, 0.18)",
      };
    case "premium_unlock":
      return {
        label: "Premium Unlocked!",
        color: "#FFD166",
        background: "rgba(255, 209, 102, 0.18)",
      };
    case "referral_signup":
      return {
        label: "Referral Win!",
        color: DEFAULT_ACCENT,
        background: "rgba(123, 97, 255, 0.2)",
      };
    default:
      return {
        label: DEFAULT_BANNER_TEXT,
        color: DEFAULT_ACCENT,
        background: "rgba(123, 97, 255, 0.14)",
      };
  }
}

async function getOgProfile(referralCode: string): Promise<OgProfile | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  const normalizedCode = normalizeReferralCode(referralCode);

  if (!normalizedCode) {
    return null;
  }

  const userResult = await runQuery<OgUserRow>(
    `SELECT id, display_name, level, total_xp, current_streak, referral_code
     FROM users
     WHERE upper(referral_code) = upper($1)
     LIMIT 1`,
    [normalizedCode],
  );

  const user = userResult.rows[0];

  if (!user) {
    return null;
  }

  const achievementsResult = await runQuery<OgAchievementRow>(
    `SELECT a.name, a.category
     FROM user_achievements ua
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.user_id = $1
       AND ua.earned_at IS NOT NULL
     ORDER BY ua.earned_at DESC
     LIMIT 3`,
    [user.id],
  );

  return {
    displayName: sanitizeDisplayName(user.display_name),
    level: Number(user.level),
    totalXp: Number(user.total_xp),
    currentStreak: Number(user.current_streak),
    referralCode: user.referral_code,
    achievements: achievementsResult.rows,
  };
}

function renderShell(content: React.ReactNode) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#0a0a0f",
        color: "#ffffff",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {content}
    </div>
  );
}

function renderFallbackCard(milestone: string | null) {
  const banner = getMilestoneBanner(milestone);

  return renderShell(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        padding: "0 72px 64px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          height: 18,
          width: "100%",
          background: "#2A1748",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 48,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 1.5 }}>EMORYA</div>
        <div style={{ display: "flex", color: DEFAULT_ACCENT, fontSize: 24, fontWeight: 700 }}>Healthy habits</div>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 136,
            height: 136,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #7B61FF 0%, #2A1748 100%)",
            fontSize: 58,
            fontWeight: 800,
          }}
        >
          E
        </div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800 }}>Turn healthy habits into real rewards</div>
        <div style={{ display: "flex", fontSize: 24, color: "#B9BDD2" }}>
          Track movement, earn XP, climb the leaderboard, and build streaks that matter.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          background: banner.background,
          color: banner.color,
          padding: "16px 24px",
          borderRadius: 9999,
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {banner.label}
      </div>
    </div>,
  );
}

function renderProfileCard(profile: OgProfile, milestone: string | null) {
  const banner = getMilestoneBanner(milestone);

  return renderShell(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        padding: "0 72px 56px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          height: 18,
          width: "100%",
          background: "#2A1748",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 48,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 1.5 }}>EMORYA</div>
        <div style={{ display: "flex", color: DEFAULT_ACCENT, fontSize: 30, fontWeight: 700 }}>
          Level {profile.level}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 144,
            height: 144,
            minWidth: 144,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #7B61FF 0%, #2A1748 100%)",
            color: "#FFFFFF",
            fontSize: 60,
            fontWeight: 800,
            boxShadow: "0 16px 40px rgba(42, 23, 72, 0.45)",
          }}
        >
          {getInitial(profile.displayName)}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 780,
            gap: 16,
          }}
        >
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05 }}>{profile.displayName}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#B9BDD2" }}>
            {formatNumber(profile.totalXp)} XP · {formatNumber(profile.currentStreak)}-day streak
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 8,
            }}
          >
            {profile.achievements.length > 0 ? (
              profile.achievements.map((achievement) => (
                <div
                  key={`${achievement.category}-${achievement.name}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderRadius: 9999,
                    background: "rgba(255, 255, 255, 0.08)",
                    color: "#D9DCEC",
                    fontSize: 20,
                    fontWeight: 600,
                  }}
                >
                  {achievement.name}
                </div>
              ))
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 16px",
                  borderRadius: 9999,
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#D9DCEC",
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                Building momentum on Emorya
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          background: banner.background,
          color: banner.color,
          padding: "16px 24px",
          borderRadius: 9999,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        {banner.label}
      </div>
    </div>,
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const { searchParams } = new URL(request.url);
  const milestone = searchParams.get("milestone");

  try {
    const profile = await getOgProfile(code);

    return new ImageResponse(profile ? renderProfileCard(profile, milestone) : renderFallbackCard(milestone), {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    return new ImageResponse(renderFallbackCard(milestone), {
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
      headers: {
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }
}
