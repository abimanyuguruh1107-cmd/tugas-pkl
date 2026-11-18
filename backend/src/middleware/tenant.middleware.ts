import mongoose, { type Types } from "mongoose";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/errors";
import { Membership, type IMembership } from "../models/membership.model";
import { Organization, type IOrganization } from "../models/organization.model";
import type { PopulatedUser } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      organization?: IOrganization;
      organizationId?: Types.ObjectId;
      membership?: IMembership;
      user?: PopulatedUser;
    }
  }
}

const ORGANIZATION_ID_PATTERN = /^[a-f\d]{24}$/i;
const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Resolve the current tenant and require an active membership for the
 * authenticated user. Select the tenant with `:organizationId`/`:orgId`
 * or the `X-Organization-Id` header; values may be an ObjectId or slug.
 * Request-body tenant selectors are intentionally ignored.
 */
export async function resolveTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication is required");
    }

    const rawRouteSelector = req.params.organizationId ?? req.params.orgId;
    const routeId = Array.isArray(rawRouteSelector)
      ? rawRouteSelector[0]
      : rawRouteSelector;
    const headerId = req.get("X-Organization-Id")?.trim();

    if (routeId && headerId && routeId !== headerId) {
      throw ApiError.badRequest("Conflicting organization selectors");
    }

    const selector = routeId ?? headerId;
    if (!selector) {
      throw ApiError.badRequest("Organization ID or slug is required");
    }

    let organization: IOrganization | null = null;
    if (
      ORGANIZATION_ID_PATTERN.test(selector) &&
      mongoose.isValidObjectId(selector)
    ) {
      organization =
        await Organization.findById(selector).lean<IOrganization>();
    } else if (ORGANIZATION_SLUG_PATTERN.test(selector)) {
      organization = await Organization.findOne({
        slug: selector.toLowerCase(),
      }).lean<IOrganization>();
    } else {
      throw ApiError.badRequest(
        "Organization selector must be an ID or valid slug",
      );
    }

    if (!organization) {
      throw ApiError.notFound("Organization not found");
    }

    const membership = await Membership.findOne({
      organizationId: organization._id,
      userId: req.user._id,
      status: "active",
    }).lean<IMembership>();

    if (!membership) {
      throw ApiError.forbidden("Active organization membership is required");
    }

    req.organization = organization;
    req.organizationId = organization._id;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}

/** Alias describing the middleware's tenant-resolution behavior. */
export const tenantMiddleware = resolveTenant;
