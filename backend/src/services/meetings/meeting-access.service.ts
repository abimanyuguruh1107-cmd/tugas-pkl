import { ApiError } from "../../lib/errors";
import { hasPermission, type Permission } from "../../lib/permissions";
import { Membership } from "../../models/membership.model";
import { Role } from "../../models/role.model";

export async function assertOrganizationPermission(
  organizationId: string,
  userId: string,
  permission: Permission,
): Promise<void> {
  const membership = await Membership.findOne({
    organizationId,
    userId,
    status: "active",
  }).lean();
  if (!membership)
    throw ApiError.forbidden("Active organization membership required");
  const role = await Role.findOne({ _id: membership.roleId, organizationId })
    .select("permissions")
    .lean();
  if (!role || !hasPermission(role.permissions, permission))
    throw ApiError.forbidden(`Missing permission: ${permission}`);
}
