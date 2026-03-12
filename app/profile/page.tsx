import { ProfileSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";

export default function ProfilePage() {
  return (
    <SiteShell eyebrow="Profile and social connections">
      <ProfileSection />
    </SiteShell>
  );
}
