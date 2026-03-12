import { AdminSection } from "@/components/sections";
import { SiteShell } from "@/components/site-shell";

export default function AdminPage() {
  return (
    <SiteShell eyebrow="Admin controls">
      <AdminSection />
    </SiteShell>
  );
}
