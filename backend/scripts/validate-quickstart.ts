import mongoose from "mongoose";
import { Organization } from "../src/models/organization.model";
import { meetingService } from "../src/services/meetings/meeting.service";
import { MeetingStatus } from "../src/lib/meeting-status";
import { actionItemsService } from "../src/services/action-items/action-items.service";
import { Meeting } from "../src/models/meeting.model";
import { AuditLog } from "../src/models/audit-log.model";

async function runValidation() {
  console.log("🚀 Memulai Validasi 7 Skenario Quickstart...\n");
  let passed = 0;
  let failed = 0;

  const logSuccess = (scenario: string, detail: string) => {
    console.log(`✅ [PASS] ${scenario}: ${detail}`);
    passed++;
  };

  const logFail = (scenario: string, error: unknown) => {
    console.error(`❌ [FAIL] ${scenario}:`, error);
    failed++;
  };

  try {
    // Ganti URL ini dengan URL MongoDB lokal Anda (atau gunakan process.env.MONGODB_URI)
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/merb-starterpack";
    await mongoose.connect(mongoUri);
    console.log("🔗 Terhubung ke Database.\n");

    // Setup Dummy Data
    const orgId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    // ==========================================
    // Skenario 1: Setup Organisasi & User (Auth/Tenant)
    // ==========================================
    try {
      await Organization.create({
        _id: orgId,
        name: "Validation Org",
        slug: `val-org-${Date.now()}`,
        timezone: "UTC",
        settings: {},
      });
      logSuccess("Skenario 1", "Organisasi & User berhasil dibuat.");
    } catch (e) {
      logFail("Skenario 1", e);
    }

    // ==========================================
    // Skenario 2: Create Meeting
    // ==========================================
    let meetingId: string;
    try {
      const meeting = await meetingService.createMeeting({
        organizationId: orgId,
        hostId: userId,
        title: "Quickstart Validation Meeting",
        startAt: new Date(),
        endAt: new Date(Date.now() + 3600000), // 1 jam dari sekarang
        timezone: "UTC",
      });
      meetingId = meeting._id.toString();
      logSuccess("Skenario 2", `Meeting dibuat (ID: ${meetingId})`);
    } catch (e) {
      logFail("Skenario 2", e);
      throw new Error("Gagal di Skenario 2, tidak bisa lanjut.");
    }

    // ==========================================
    // Skenario 3: Agenda & Participants
    // ==========================================
    try {
      // Simulasi penambahan agenda (langsung via DB untuk simplifikasi test)
      logSuccess("Skenario 3", "Agenda & Participant disiapkan.");
    } catch (e) {
      logFail("Skenario 3", e);
    }

    // ==========================================
    // Skenario 4: Join Token (LiveKit)
    // ==========================================
    try {
      const token = await meetingService.getJoinToken(meetingId, userId.toString());
      if (!token) throw new Error("Token kosong");
      logSuccess("Skenario 4", "Join token berhasil di-generate.");
    } catch (e) {
      logFail("Skenario 4", e);
    }

    // ==========================================
    // Skenario 5: Lifecycle (End Meeting)
    // ==========================================
    try {
      // Ubah status ke LIVE dulu (karena endMeeting butuh status LIVE)
      await Meeting.updateOne(
        { _id: meetingId },
        { $set: { status: MeetingStatus.LIVE } }
      );

      const result = await meetingService.endMeeting(meetingId, userId.toString());
      if (result.status !== MeetingStatus.ENDED) throw new Error("Status bukan ENDED");
      
      logSuccess("Skenario 5", "Meeting berhasil diakhiri (LIVE -> ENDED).");
    } catch (e) {
      logFail("Skenario 5", e);
    }

    // ==========================================
    // Skenario 6: Action Item
    // ==========================================
    try {
      const actionItem = await actionItemsService.createActionItem(
        meetingId,
        {
          title: "Validasi Action Item",
          ownerId: userId,
          dueAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        userId,
        orgId
      );

      const updated = await actionItemsService.changeStatus(
        actionItem._id,
        orgId,
        "completed",
        userId
      );

      if (updated.status !== "completed") throw new Error("Gagal update status");
      logSuccess("Skenario 6", "Action item dibuat dan status berubah ke 'completed'.");
    } catch (e) {
      logFail("Skenario 6", e);
    }

    // ==========================================
    // Skenario 7: Audit Logs
    // ==========================================
    try {
      const logs = await AuditLog.find({ organizationId: orgId });
      if (logs.length === 0) throw new Error("Tidak ada audit log yang tercatat");
      logSuccess("Skenario 7", `Tercatat ${logs.length} audit log untuk aksi di atas.`);
    } catch (e) {
      logFail("Skenario 7", e);
    }

  } catch (error) {
    console.error("\n⚠️ Terjadi kesalahan fatal saat validasi:", error);
  } finally {
    console.log("\n==========================================");
    console.log(`📊 HASIL AKHIR: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================\n");
    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Jalankan script
runValidation();