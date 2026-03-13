import { assertAdminUser } from "@/server/auth/admin";
import { getAuthenticatedUser } from "@/server/services/auth-service";
import {
  grantUserRole,
  listUsersWithRoles,
  revokeUserRole,
} from "@/server/repositories/admin-repository";

export async function getRoleDirectory() {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  return listUsersWithRoles();
}

export async function updateReviewerRole({
  userId,
  enabled,
}: {
  userId: string;
  enabled: boolean;
}) {
  const currentUser = await getAuthenticatedUser();
  await assertAdminUser(currentUser);

  if (!currentUser) {
    throw new Error("You must be signed in to access admin controls.");
  }

  if (currentUser.id === userId && !enabled) {
    throw new Error("You cannot remove your own reviewer capability from this screen.");
  }

  if (enabled) {
    await grantUserRole({
      userId,
      role: "reviewer",
      grantedBy: currentUser.id,
    });
  } else {
    await revokeUserRole({
      userId,
      role: "reviewer",
    });
  }

  return listUsersWithRoles();
}
