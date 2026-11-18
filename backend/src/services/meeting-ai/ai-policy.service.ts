import { Organization } from "../../models/organization.model";
import { ApiError } from "../../lib/errors";
import type { Types } from "mongoose";

class AIPolicyService {
  /**
   * Memeriksa apakah organisasi mengizinkan data mereka digunakan untuk AI training.
   * Secara default, jika tidak diatur, kembalikan false (Opt-out).
   */
  async isTrainingAllowed(organizationId: string | Types.ObjectId): Promise<boolean> {
    const organization = await Organization.findById(organizationId)
      .select("settings")
      .lean();

    if (!organization) {
      throw ApiError.notFound("Organization not found");
    }

    // Cast settings ke tipe yang sesuai agar TypeScript tidak error
    const settings = organization.settings as Record<string, unknown> | undefined;
    
    // Anggap false jika field belum pernah di-set
    return settings?.aiTrainingOptIn === true;
  }

  /**
   * Mengubah pengaturan opt-in/opt-out AI training untuk organisasi.
   */
  async setTrainingPolicy(
    organizationId: string | Types.ObjectId,
    allow: boolean,
  ): Promise<void> {
    const result = await Organization.updateOne(
      { _id: organizationId },
      { $set: { "settings.aiTrainingOptIn": allow } }
    );

    if (result.matchedCount === 0) {
      throw ApiError.notFound("Organization not found");
    }
  }
}

export const aiPolicyService = new AIPolicyService();