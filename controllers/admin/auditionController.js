import AuditionParams from "../../models/auditionParamsModel.js";
import AuditionSlot from "../../models/auditionSlotModel.js";
import User from "../../models/userModel.js";
import { createTestDateEmailTemplate } from "../../tools/mail/notifTemplate.js";
import { sendNotification } from "../../tools/mail/mailNotif.js";

// Helper: minutes → "HH:MM"
function minutesToTime(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export const generateAuditions = async (req, res) => {
  try {
    const { paramsId } = req.body;
    if (!paramsId) {
      return res.status(400).json({ message: "ID des paramètres manquant." });
    }

    // 1) Load the audition parameters
    const params = await AuditionParams.findById(paramsId);
    if (!params) {
      return res.status(404).json({ message: "Paramètres introuvables." });
    }
    const {
      startDate,
      endDate,
      sessionStartTime,
      sessionEndTime,
      slotDurationMinutes,
      breakDurationMinutes,
    } = params;

    // 2) Fetch all pending candidates
    let candidates = await User.find({ role: "candidate", memberstatus: "Pending" });
    if (candidates.length === 0) {
      return res.status(400).json({ message: "Aucun candidat en attente." });
    }

    // 3) Build list of days between startDate and endDate (inclusive)
    const days = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // 4) Compute session window in minutes
    const [hS, mS] = sessionStartTime.split(":").map(Number);
    const [hE, mE] = sessionEndTime.split(":").map(Number);
    const sessionStartMin = hS * 60 + mS;
    const sessionEndMin   = hE * 60 + mE;
    const sessionDur      = sessionEndMin - sessionStartMin;
    const blockSize       = slotDurationMinutes + breakDurationMinutes;
    const slotsPerDay     = Math.floor(sessionDur / blockSize);

    // 5) Check capacity
    const totalCapacity = slotsPerDay * days.length;
    if (candidates.length > totalCapacity) {
      return res.status(400).json({
        message: `Capacité insuffisante: ${totalCapacity} créneaux pour ${candidates.length} candidats.`,
      });
    }

    // 6) Carve slots, assign to candidates in order
    const slotsToInsert = [];
    let candIdx = 0;
    for (const day of days) {
      let elapsed = 0;
      while (
        candIdx < candidates.length &&
        elapsed + slotDurationMinutes <= sessionDur
      ) {
        const startMin = sessionStartMin + elapsed;
        const endMin   = startMin + slotDurationMinutes;

        slotsToInsert.push({
          date: new Date(day),
          startTime: minutesToTime(startMin),
          endTime:   minutesToTime(endMin),
          candidate: candidates[candIdx++]._id,
        });

        elapsed += blockSize;
      }
    }

    // 7) Persist slots
    const createdSlots = await AuditionSlot.insertMany(slotsToInsert);

    // 8) Update each user and send them the email
    for (const slot of createdSlots) {
      const user = await User.findById(slot.candidate);
      if (!user) continue;
      user.memberstatus = "TestScheduled";
      await user.save();

      const emailData = createTestDateEmailTemplate({
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        assignedDate: slot.date,
        assignedTime: slot.startTime,
      });
      await sendNotification({
        email:       user.email,
        subject:     emailData.subject,
        htmlContent: emailData.htmlContent,
        attachments: emailData.attachments,
      });
    }

    return res.status(201).json({
      message: "Planning généré et notifications envoyées.",
      slots:   createdSlots,
    });
  } catch (err) {
    console.error("generateAuditions error:", err);
    return res
      .status(500)
      .json({ message: "Erreur interne serveur lors de la génération." });
  }
};
