// ============================================================
// concertController.js — avec notifications FCM
// ✅ notifyNewConcert() appelé dans createConcert()
// ✅ notifyUpdatedConcert() appelé dans updateConcert()
// ============================================================

import Concert from "../../models/concertModel.js";
import Repetition from "../../models/repetitionModel.js";
import Config from "../../models/configModel.js";
import User from "../../models/userModel.js";
import {
  notifyNewConcert,
  notifyUpdatedConcert,
} from "../../tools/push/fcmService.js"; // ✅ IMPORT FCM

// ── Helper : tokens de tous les choristes actifs ─────────────
const getActiveChoristeTokens = async () => {
  const choristes = await User.find(
    {
      role: "choriste",
      status: { $nin: ["éliminé", "En congé", "Inactif"] },
      fcmToken: { $ne: null },
    },
    { fcmToken: 1 },
  );
  return choristes.map((c) => c.fcmToken).filter(Boolean);
};

// ── Créer un concert ─────────────────────────────────────────
export const createConcert = async (req, res) => {
  try {
    const concertData = req.body;

    if (!concertData.title || concertData.title.trim() === "") {
      return res.status(400).json({ message: "Le titre est requis." });
    }

    const existingConcert = await Concert.findOne({
      dateHeure: concertData.dateHeure,
    });
    if (existingConcert) {
      return res
        .status(409)
        .json({ message: "Un concert à cette date et heure existe déjà." });
    }

    if (req.file) concertData.poster = req.file.filename;
    concertData.programme = JSON.parse(concertData.programme);
    concertData.dateHeure = new Date(concertData.dateHeure);

    const concert = new Concert(concertData);
    await concert.save();

    // ✅ Notification FCM — nouveau concert
    try {
      const tokens = await getActiveChoristeTokens();
      if (tokens.length > 0) {
        await notifyNewConcert(tokens, concert);
        console.log(
          `[FCM] 🎤 Notification nouveau concert envoyée à ${tokens.length} choriste(s).`,
        );
      }
    } catch (fcmErr) {
      console.error("[FCM] Erreur notification concert:", fcmErr);
      // Ne pas bloquer la réponse si FCM échoue
    }

    res.status(201).json({ message: "Concert créé avec succès." });
  } catch (error) {
    if (error.code === "INVALID_POSTER_FORMAT") {
      return res.status(400).json({
        message: "Format d'affiche non supporté",
        type: "FILE_FORMAT_ERROR",
      });
    }
    console.error("Erreur création concert:", error);
    res.status(500).json({ message: "Erreur création concert." });
  }
};

// ── Modifier un concert ──────────────────────────────────────
export const updateConcert = async (req, res) => {
  try {
    const updateData = req.body;

    if (updateData.title && updateData.title.trim() === "") {
      return res
        .status(400)
        .json({ message: "Le titre ne peut pas être vide." });
    }

    if (updateData.dateHeure) {
      const existingConcert = await Concert.findOne({
        dateHeure: updateData.dateHeure,
        _id: { $ne: req.params.id },
      });
      if (existingConcert) {
        return res
          .status(409)
          .json({ message: "Un concert à cette date et heure existe déjà." });
      }
    }

    if (req.file) updateData.poster = req.file.filename;
    if (updateData.programme)
      updateData.programme = JSON.parse(updateData.programme);
    if (updateData.dateHeure)
      updateData.dateHeure = new Date(updateData.dateHeure);

    const updated = await Concert.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("programme");

    // ✅ Notification FCM — concert modifié
    try {
      const tokens = await getActiveChoristeTokens();
      if (tokens.length > 0) {
        await notifyUpdatedConcert(tokens, updated);
        console.log(
          `[FCM] ✏️  Notification concert modifié envoyée à ${tokens.length} choriste(s).`,
        );
      }
    } catch (fcmErr) {
      console.error("[FCM] Erreur notification update concert:", fcmErr);
    }

    res.json({ message: "Concert mis à jour avec succès.", updated });
  } catch (error) {
    if (error.code === "INVALID_POSTER_FORMAT") {
      return res.status(400).json({
        message: "Format d'affiche non supporté",
        type: "FILE_FORMAT_ERROR",
      });
    }
    console.error("Erreur update concert:", error);
    res.status(500).json({ message: "Erreur update concert." });
  }
};

// ── Récupérer tous les concerts ──────────────────────────────
export const getConcerts = async (req, res) => {
  try {
    const concerts = await Concert.find().populate("programme");
    res.json(concerts);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération." });
  }
};

// ── Suppression permanente ───────────────────────────────────
export const deleteConcertPermanent = async (req, res) => {
  try {
    const concert = await Concert.findById(req.params.id);
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });
    await Concert.findByIdAndDelete(req.params.id);
    res.json({ message: "Concert supprimé définitivement." });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression permanente du concert.",
    });
  }
};

// ── Restaurer concert archivé ────────────────────────────────
export const restoreConcert = async (req, res) => {
  try {
    await Concert.findByIdAndUpdate(req.params.id, { isArchived: false });
    res.json({ message: "Concert restauré avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la restauration." });
  }
};

// ── Marquer disponibilité choriste ───────────────────────────
export const markAvailability = async (req, res) => {
  const choristeId = req.auth.userId;
  const concertId = req.params.id;

  try {
    const concert = await Concert.findById(concertId);
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    const choriste = await User.findById(choristeId);
    const isEliminated = choriste.eliminationRecords?.some(
      (record) => record.concertId?.toString() === concertId.toString(),
    );

    if (isEliminated) {
      return res
        .status(403)
        .json({ message: "Vous avez été éliminé de ce concert." });
    }

    if (concert.availableChoristes.includes(choristeId)) {
      return res.status(400).json({ message: "Déjà marqué comme disponible." });
    }

    concert.availableChoristes.push(choristeId);
    await concert.save();

    res.json({ message: "Disponibilité enregistrée." });
  } catch (err) {
    console.error("Erreur de disponibilité:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// ── Vérifier présence concert ────────────────────────────────
export const checkConcertAttendance = async (req, res) => {
  const { concertId, choristeId } = req.params;

  try {
    const choriste = await User.findById(choristeId);
    if (!choriste) {
      return res.json({
        eligible: false,
        percentage: 0,
        reason: "user_not_found",
        message: "Utilisateur introuvable",
      });
    }

    const isEliminatedFromConcert = choriste.eliminationRecords?.some(
      (record) => record.concertId?.toString() === concertId.toString(),
    );

    if (isEliminatedFromConcert) {
      const eliminationRecord = choriste.eliminationRecords.find(
        (record) => record.concertId?.toString() === concertId.toString(),
      );
      return res.json({
        eligible: false,
        percentage: 0,
        reason: "eliminated_from_concert",
        eliminationType: eliminationRecord.reason,
        eliminationDate: eliminationRecord.eliminatedAt,
        message:
          eliminationRecord.reason === "absence_threshold"
            ? "Éliminé pour absence insuffisante"
            : "Éliminé pour raisons disciplinaires",
      });
    }

    const repetitions = await Repetition.find({
      concert: concertId,
      pupitres: { $in: [choriste.pupitre] },
    })
      .populate("presentChoristes")
      .populate("manualPresences.choriste");

    const total = repetitions.length;

    if (total === 0) {
      return res.json({
        eligible: true,
        percentage: 0,
        reason: "no_repetitions_for_pupitre",
        message: `Aucune répétition programmée pour votre pupitre (${choriste.pupitre})`,
      });
    }

    let attended = 0;
    repetitions.forEach((repetition) => {
      let isPresent = repetition.presentChoristes.some(
        (p) => p._id.toString() === choristeId.toString(),
      );

      const manualPresence = repetition.manualPresences.find(
        (m) => m.choriste._id.toString() === choristeId.toString(),
      );
      if (manualPresence) isPresent = manualPresence.type === "present";

      if (isPresent) attended++;
    });

    const percentage = (attended / total) * 100;
    const config = await Config.findOne();
    const threshold = config?.participationThreshold ?? 70;
    const eligible = percentage >= threshold;

    res.json({
      eligible,
      percentage: Math.round(percentage * 100) / 100,
      threshold,
      attended,
      total,
      reason: eligible ? "eligible" : "insufficient_attendance",
      message: eligible ? "Éligible" : "Taux de présence insuffisant",
      pupitre: choriste.pupitre,
      totalRepetitionsForAllPupitres: await Repetition.countDocuments({
        concert: concertId,
      }),
    });
  } catch (err) {
    console.error("Erreur calcul présence concert:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getAvailableChoristesForConcert = async (req, res) => {
  try {
    const concert = await Concert.findById(req.params.id).populate({
      path: "availableChoristes",
      select: "-password -__v",
    });
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });
    res.status(200).json(concert.availableChoristes);
  } catch (error) {
    console.error("Erreur récupération participants:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const validateChoristeForConcert = async (req, res) => {
  try {
    const { concertId, choristeId } = req.params;
    const concert = await Concert.findById(concertId);
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    if (!concert.availableChoristes.includes(choristeId)) {
      return res
        .status(400)
        .json({ message: "Le choriste n'a pas marqué sa disponibilité." });
    }
    if (concert.finalParticipants.includes(choristeId)) {
      return res.status(400).json({ message: "Le choriste est déjà validé." });
    }

    concert.finalParticipants.push(choristeId);
    await concert.save();

    res.status(200).json({ message: "Choriste validé avec succès.", concert });
  } catch (error) {
    console.error("Erreur validation choriste:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getAvailableChoristesForValidation = async (req, res) => {
  try {
    const { concertId } = req.params;
    const concert = await Concert.findById(concertId)
      .populate(
        "availableChoristes",
        "firstName lastName email pupitre eliminationRecords",
      )
      .populate("finalParticipants", "_id");

    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    const choristesWithStatus = concert.availableChoristes.map((choriste) => {
      const isValidated = concert.finalParticipants.some(
        (fp) => fp._id.toString() === choriste._id.toString(),
      );
      const isEliminated = choriste.eliminationRecords?.some(
        (record) => record.concertId?.toString() === concertId.toString(),
      );
      return {
        ...choriste.toObject(),
        validationStatus: isEliminated
          ? "eliminated"
          : isValidated
            ? "validated"
            : "pending",
      };
    });

    res.status(200).json({
      message: "Choristes récupérés avec succès.",
      choristes: choristesWithStatus,
      concert: {
        _id: concert._id,
        title: concert.title,
        dateHeure: concert.dateHeure,
      },
    });
  } catch (error) {
    console.error("Erreur récupération choristes:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getFinalParticipantsForConcert = async (req, res) => {
  try {
    const concert = await Concert.findById(req.params.concertId).populate(
      "finalParticipants",
      "firstName lastName email pupitre height",
    );
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    res.status(200).json({
      message: "Participants finaux récupérés.",
      data: concert.finalParticipants,
      concert: {
        _id: concert._id,
        title: concert.title,
        dateHeure: concert.dateHeure,
        location: concert.location,
      },
    });
  } catch (error) {
    console.error("Erreur participants finaux:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const deleteFromFinalParticipants = async (req, res) => {
  try {
    const { concertId, choristeId } = req.params;
    const { reason = "No-show on concert day" } = req.body;

    const concert = await Concert.findById(concertId);
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    if (!concert.finalParticipants.includes(choristeId)) {
      return res.status(400).json({
        message: "Le choriste n'est pas dans les participants finaux.",
      });
    }

    concert.finalParticipants = concert.finalParticipants.filter(
      (id) => id.toString() !== choristeId.toString(),
    );
    concert.availableChoristes = concert.availableChoristes.filter(
      (id) => id.toString() !== choristeId.toString(),
    );

    if (
      !concert.absentChoristes.some(
        (a) => a.choriste.toString() === choristeId.toString(),
      )
    ) {
      concert.absentChoristes.push({
        choriste: choristeId,
        reason: "removed_by_admin",
        markedAt: new Date(),
      });
    }

    await concert.save();

    const choriste = await User.findById(
      choristeId,
      "firstName lastName email",
    );
    res.status(200).json({
      message: `${choriste.firstName} ${choriste.lastName} supprimé et marqué absent.`,
      concert,
    });
  } catch (error) {
    console.error("Erreur suppression participant:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getFinalParticipantsForChef = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { concertId } = req.params;

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== "choriste" || !chef.isChefDePupitre) {
      return res
        .status(403)
        .json({ message: "Accès refusé. Chefs de pupitre uniquement." });
    }

    const concert = await Concert.findById(concertId).populate({
      path: "finalParticipants",
      match: { pupitre: chef.pupitre, _id: { $ne: chefId } },
      select: "firstName lastName email pupitre height",
    });

    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    res.json({
      concert: {
        _id: concert._id,
        title: concert.title,
        dateHeure: concert.dateHeure,
        location: concert.location,
      },
      chefPupitre: chef.pupitre,
      finalParticipants: concert.finalParticipants || [],
      totalParticipants: concert.finalParticipants?.length ?? 0,
    });
  } catch (error) {
    console.error("Erreur getFinalParticipantsForChef:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const removeFromFinalParticipantsAsChef = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { concertId, choristeId } = req.params;

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== "choriste" || !chef.isChefDePupitre) {
      return res
        .status(403)
        .json({ message: "Accès refusé. Chefs de pupitre uniquement." });
    }

    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.pupitre !== chef.pupitre) {
      return res
        .status(403)
        .json({ message: "Vous ne pouvez gérer que votre pupitre." });
    }

    const concert = await Concert.findById(concertId);
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    if (!concert.finalParticipants.includes(choristeId)) {
      return res.status(400).json({
        message: "Ce choriste ne fait pas partie des participants finaux.",
      });
    }

    concert.finalParticipants = concert.finalParticipants.filter(
      (id) => id.toString() !== choristeId.toString(),
    );
    concert.availableChoristes = concert.availableChoristes.filter(
      (id) => id.toString() !== choristeId.toString(),
    );

    if (
      !concert.absentChoristes.some(
        (a) => a.choriste.toString() === choristeId.toString(),
      )
    ) {
      concert.absentChoristes.push({
        choriste: choristeId,
        reason: "removed_by_chef",
        markedAt: new Date(),
      });
    }

    await concert.save();

    res.json({
      message: `${choriste.firstName} ${choriste.lastName} retiré des participants finaux.`,
      removedChoriste: {
        _id: choriste._id,
        firstName: choriste.firstName,
        lastName: choriste.lastName,
        pupitre: choriste.pupitre,
      },
    });
  } catch (error) {
    console.error("Erreur removeFromFinalParticipantsAsChef:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getConcertsForChefFinalParticipants = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== "choriste" || !chef.isChefDePupitre) {
      return res
        .status(403)
        .json({ message: "Accès refusé. Chefs de pupitre uniquement." });
    }

    const concerts = await Concert.find({})
      .populate({
        path: "finalParticipants",
        match: { pupitre: chef.pupitre, _id: { $ne: chefId } },
        select: "firstName lastName pupitre",
      })
      .select("title dateHeure location")
      .sort({ dateHeure: -1 });

    const filtered = concerts.filter((c) => c.finalParticipants?.length > 0);

    res.json({
      chefInfo: {
        name: `${chef.firstName} ${chef.lastName}`,
        pupitre: chef.pupitre,
      },
      concerts: filtered.map((c) => ({
        _id: c._id,
        title: c.title,
        dateHeure: c.dateHeure,
        location: c.location,
        participantsCount: c.finalParticipants.length,
      })),
    });
  } catch (error) {
    console.error("Erreur getConcertsForChefFinalParticipants:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const markConcertAbsence = async (req, res) => {
  const choristeId = req.auth.userId;
  const concertId = req.params.id;
  const { reason = "manual_absence" } = req.body;

  try {
    const concert = await Concert.findById(concertId);
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    if (
      concert.absentChoristes.some((a) => a.choriste.toString() === choristeId)
    ) {
      return res.status(400).json({ message: "Déjà marqué comme absent." });
    }

    concert.availableChoristes = concert.availableChoristes.filter(
      (id) => id.toString() !== choristeId,
    );
    concert.finalParticipants = concert.finalParticipants.filter(
      (id) => id.toString() !== choristeId,
    );
    concert.absentChoristes.push({
      choriste: choristeId,
      reason,
      markedAt: new Date(),
    });

    await concert.save();
    res.json({ message: "Absence enregistrée pour ce concert." });
  } catch (err) {
    console.error("Erreur marquage absence concert:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const autoMarkAbsentForPastConcert = async (req, res) => {
  try {
    const { concertId } = req.params;
    const concert = await Concert.findById(concertId);
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    if (new Date(concert.dateHeure) > new Date()) {
      return res
        .status(400)
        .json({ message: "Le concert n'est pas encore terminé." });
    }

    const allChoristes = await User.find({
      role: "choriste",
      isLocked: { $ne: true },
      status: { $nin: ["Inactif", "En congé"] },
    }).select("_id eliminationRecords");

    let markedAbsentCount = 0;

    for (const choriste of allChoristes) {
      const id = choriste._id.toString();
      const inAvailable = concert.availableChoristes.some(
        (x) => x.toString() === id,
      );
      const inFinal = concert.finalParticipants.some(
        (x) => x.toString() === id,
      );
      const inAbsent = concert.absentChoristes.some(
        (a) => a.choriste.toString() === id,
      );
      const isEliminated = choriste.eliminationRecords?.some(
        (r) => r.concertId?.toString() === concertId.toString(),
      );

      if (!inAvailable && !inFinal && !inAbsent && !isEliminated) {
        concert.absentChoristes.push({
          choriste: id,
          reason: "did_not_mark_disponibilite",
          markedAt: new Date(),
        });
        markedAbsentCount++;
      }
    }

    if (markedAbsentCount > 0) await concert.save();

    res.json({
      message: `${markedAbsentCount} choriste(s) marqué(s) absent(s) automatiquement.`,
      markedAbsentCount,
    });
  } catch (error) {
    console.error("Erreur autoMarkAbsent:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getConcertStatusForChoriste = async (req, res) => {
  try {
    const { concertId, choristeId } = req.params;
    const concert = await Concert.findById(concertId).populate(
      "absentChoristes.choriste",
      "firstName lastName",
    );
    if (!concert)
      return res.status(404).json({ message: "Concert introuvable." });

    const isAvailable = concert.availableChoristes.includes(choristeId);
    const isFinalParticipant = concert.finalParticipants.includes(choristeId);
    const absentRecord = concert.absentChoristes.find(
      (a) => a.choriste._id.toString() === choristeId,
    );

    const choriste = await User.findById(choristeId);
    const isEliminated = choriste?.eliminationRecords?.some(
      (r) => r.concertId?.toString() === concertId.toString(),
    );

    let status = "not_available";
    let statusMessage = "Non disponible";

    if (isEliminated) {
      status = "eliminated";
      statusMessage = "Éliminé";
    } else if (isFinalParticipant) {
      status = "final_participant";
      statusMessage = "Participant final";
    } else if (isAvailable) {
      status = "available";
      statusMessage = "Disponible";
    } else if (absentRecord) {
      status = "absent";
      statusMessage = _absenceMessage(absentRecord.reason);
    }

    res.json({
      concertId,
      choristeId,
      status,
      statusMessage,
      isAvailable,
      isFinalParticipant,
      isAbsent: !!absentRecord,
      isEliminated,
      absentReason: absentRecord?.reason ?? null,
      absentMarkedAt: absentRecord?.markedAt ?? null,
    });
  } catch (error) {
    console.error("Erreur getConcertStatus:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

const _absenceMessage = (reason) => {
  const map = {
    did_not_mark_disponibilite: "Absent (n'a pas marqué sa disponibilité)",
    removed_by_admin: "Absent (retiré par admin)",
    removed_by_chef: "Absent (retiré par chef de pupitre)",
    manual_absence: "Absent (marqué manuellement)",
  };
  return map[reason] ?? "Absent";
};
