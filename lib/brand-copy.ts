import { getActiveBrandTheme } from "./brand-themes/index.ts";

type BrandCopyProfile = {
  referralPrefix: string;
  walletProduct: string;
  nativeLoop: string;
  progressionLabel: string;
  communitySurface: string;
  appSync: string;
};

const brandCopyProfiles: Record<string, BrandCopyProfile> = {
  emorya: {
    referralPrefix: "EMORYA",
    walletProduct: "your wallet",
    nativeLoop: "an Emorya-native habit loop",
    progressionLabel: "real Emorya progression",
    communitySurface: "an Emorya community account",
    appSync: "the Emorya API",
  },
  multiversx: {
    referralPrefix: "MVX",
    walletProduct: "your MultiversX wallet",
    nativeLoop: "a chain-native retention loop",
    progressionLabel: "real chain-native progression",
    communitySurface: "a community account",
    appSync: "a wallet or app sync",
  },
  xportal: {
    referralPrefix: "XPORTAL",
    walletProduct: "xPortal",
    nativeLoop: "a super app-native habit loop",
    progressionLabel: "real super app progression",
    communitySurface: "a community account",
    appSync: "an app sync",
  },
};

export function getActiveBrandCopyProfile() {
  const themeId = getActiveBrandTheme().id;
  return brandCopyProfiles[themeId] ?? brandCopyProfiles.emorya;
}

export function getBrandCopyProfile(themeId: string | null | undefined) {
  return brandCopyProfiles[themeId ?? ""] ?? brandCopyProfiles.emorya;
}

export function getBrandDisplayReferralCode(referralCode: string) {
  const profile = getActiveBrandCopyProfile();
  const suffix = referralCode.replace(/^[A-Z]+-/, "");
  return `${profile.referralPrefix}-${suffix}`;
}

export function getBrandSafeQuestTitle(title: string) {
  const themeId = getActiveBrandTheme().id;

  if (title === "Open the xPortal setup guide" && themeId !== "xportal") {
    return "Open the wallet setup guide";
  }

  return title;
}

export function getBrandSafeQuestDescription(description: string) {
  const profile = getActiveBrandCopyProfile();

  return description
    .replace("Link one Emorya social surface", `Link ${profile.communitySurface}`)
    .replace("connect the Emorya API", `connect ${profile.appSync}`)
    .replace("native Emorya activity", "native product activity")
    .replace("native Emorya habit and wallet loop", "native wallet and retention loop")
    .replace("recurring Emorya progress", "recurring product progress");
}

export function getBrandSafeWalletLinkPrompt() {
  const profile = getActiveBrandCopyProfile();
  return `Connect ${profile.walletProduct} to move this campaign path into the full reward and payout flow.`;
}

export function getBrandSafeStarterPathPrompt() {
  const profile = getActiveBrandCopyProfile();
  return `Finish the activation ladder so this campaign interest turns into ${profile.nativeLoop}.`;
}

export function getBrandSafeOnboardingHint() {
  const profile = getActiveBrandCopyProfile();
  return `Start here: finish the activation ladder, connect ${profile.walletProduct}, and complete your first meaningful product actions. That is the shortest path from campaign arrival to ${profile.progressionLabel}.`;
}

export function getBrandSafeRewardFocus(attributionSource: string, experienceLane: string, payoutAsset: string) {
  return `${attributionSource} is still credited as the source, while this journey is currently focused on product progress and ${payoutAsset} rewards through ${experienceLane}.`;
}
