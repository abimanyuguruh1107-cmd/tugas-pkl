import { createHash, randomBytes } from "node:crypto";
import { Invitation, type IInvitation } from "../../models/invitation.model";
import { Role } from "../../models/role.model";
import { ApiError } from "../../lib/errors";
import { enqueueEmail } from "../../queue/email.queue";
import { logger } from "../../lib/logger";

const INVITATION_TTL_DAYS = 7;

/** Generate a cryptographically secure, unguessable invitation token. */
function generateInvitationToken(): string {
  return randomBytes(32).toString("hex");
}

/** Hash the invitation token for storage (never store plaintext). */
function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Calculate the expiration date for a new invitation. */
function invitationExpiryDate(): Date {
  return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export interface CreateInvitationInput {
  organizationId: string;
  email: string;
  roleId: string;
  createdBy: string;
}

export interface InvitationResult {
  invitation: IInvitation;
  rawToken: string; // Only returned to the caller who created the invitation
}

/**
 * Create a new organization invitation.
 * Generates a secure token, hashes it, and stores the invitation with expiry.
 * Sends an invitation email via the BullMQ email queue.
 */
export async function createInvitation(
  input: CreateInvitationInput,
): Promise<InvitationResult> {
  const { organizationId, email, roleId, createdBy } = input;

  // Invitations may only assign roles owned by the same organization.
  const role = await Role.findOne({ _id: roleId, organizationId });
  if (!role) throw ApiError.notFound("Organization role not found");

  // Check for existing pending invitation to this email in this organization
  const existing = await Invitation.findOne({
    organizationId,
    email: email.toLowerCase(),
    status: "pending",
  });
  if (existing) {
    throw ApiError.conflict(
      "A pending invitation already exists for this email in this organization",
    );
  }

  // Generate and hash the invitation token
  const rawToken = generateInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);

  const invitation = await Invitation.create({
    organizationId,
    email: email.toLowerCase(),
    roleId,
    tokenHash,
    expiresAt: invitationExpiryDate(),
    status: "pending",
    createdBy,
  });

  // Fire-and-forget invitation email
  await enqueueEmail({
    kind: "invitation",
    to: email,
    data: {
      name: email,
      organizationId,
      role: role.name,
      token: rawToken,
      createdBy,
      expiresInDays: INVITATION_TTL_DAYS,
    },
  }).catch((err) => logger.error("Failed to enqueue invitation email:", err));

  return {
    invitation: invitation.toObject() as unknown as IInvitation,
    rawToken,
  };
}

/**
 * Find a pending invitation by its raw token.
 * Validates the token hash and expiry before returning.
 * Throws if not found or expired, so return type is non-null.
 */
export async function getInvitationByToken(
  rawToken: string,
): Promise<InstanceType<typeof Invitation>> {
  const tokenHash = hashInvitationToken(rawToken);

  const invitation = await Invitation.findOne({
    tokenHash,
    status: "pending",
  });

  if (!invitation) {
    throw ApiError.notFound("Invitation not found or already used");
  }

  if (invitation.expiresAt < new Date()) {
    await invitation.deleteOne();
    throw ApiError.badRequest("Invitation has expired");
  }

  return invitation;
}

/**
 * Accept an invitation.
 * Marks the invitation as accepted and returns the invitation details
 * so the caller can create the membership/user record.
 */
export async function acceptInvitation(
  rawToken: string,
): Promise<{ invitation: IInvitation }> {
  const invitation = await getInvitationByToken(rawToken);

  invitation.status = "accepted";
  await invitation.save();

  return { invitation: invitation.toObject() as unknown as IInvitation };
}

/**
 * Decline an invitation.
 */
export async function declineInvitation(rawToken: string): Promise<void> {
  const invitation = await getInvitationByToken(rawToken);

  invitation.status = "declined";
  await invitation.save();
}

/**
 * Revoke an invitation (admin action).
 */
export async function revokeInvitation(
  organizationId: string,
  invitationId: string,
): Promise<void> {
  const invitation = await Invitation.findOne({
    _id: invitationId,
    organizationId,
  });
  if (!invitation) throw ApiError.notFound("Invitation not found");

  invitation.status = "revoked";
  await invitation.save();
}

/**
 * List all invitations for an organization, optionally filtered by status.
 */
export async function listInvitations(
  organizationId: string,
  status?: "pending" | "accepted" | "declined" | "revoked",
): Promise<IInvitation[]> {
  const filter: Record<string, unknown> = { organizationId };
  if (status) filter.status = status;

  return Invitation.find(filter)
    .sort({ createdAt: -1 })
    .select("-tokenHash")
    .lean() as Promise<IInvitation[]>;
}

/**
 * Count pending invitations for an organization.
 */
export async function countPendingInvitations(
  organizationId: string,
): Promise<number> {
  return Invitation.countDocuments({
    organizationId,
    status: "pending",
  });
}

/**
 * Clean up expired invitations (manual cleanup, TTL index also handles this).
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  const result = await Invitation.deleteMany({
    status: "pending",
    expiresAt: { $lt: new Date() },
  });
  return result.deletedCount ?? 0;
}
