import Repetition from "../../models/repetitionModel.js";
import User from "../../models/userModel.js";
import Config from "../../models/configModel.js";
export const createRepetition = async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;

    // 1) Time validation
    if (startTime && endTime && date) {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = endTime.split(":").map(Number);

      const start = new Date(date);
      start.setHours(startHour, startMin, 0, 0);

      let end = new Date(date);
      end.setHours(endHour, endMin, 0, 0);

      // If end is not strictly after start, roll into next day
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      // Still not after start → error
      if (end <= start) {
        return res.status(400).json({
          message: "End time must be after start time.",
        });
      }
    }

    // 2) Prevent full-choir duplicate on the same date
    //    Find all existing repetitions on this date
    const existingReps = await Repetition.find({ date });
    const fullChoir = ["soprano", "alto", "ténor", "basse"];

    // Check if any existing repetition already covers all 4 parts
    const hasFullOnDate = existingReps.some((rep) =>
      Array.isArray(rep.pupitres) &&
      rep.pupitres.length === fullChoir.length &&
      fullChoir.every((p) => rep.pupitres.includes(p))
    );

    if (hasFullOnDate) {
      return res.status(409).json({
        message:
          "A rehearsal covering all voice parts already exists on this date.",
      });
    }

    // 3) Force all four voice parts to be present
    //    (If you later want partial checkboxes, remove this hard-coded array
    //     and use req.body.pupitres instead.)
    const pupitres = ["soprano", "alto", "ténor", "basse"];

    // 4) Create and save
    const repetition = new Repetition({
      ...req.body,
      pupitres,
    });

    await repetition.save();
    res.status(201).json({ message: "Rehearsal created successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating rehearsal." });
  }
};


export const getRepetitions = async (req, res) => {
  try {
    const data = await Repetition.find().populate("concert");
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du chargement." });
  }
};

// export const getArchivedRepetitions = async (req, res) => {
//   try {
//     const data = await Repetition.find({ isArchived: true }).populate('concert');
//     res.json(data);
//   } catch (error) {
//     res.status(500).json({ message: 'Erreur chargement archivées.' });
//   }
// };

export const updateRepetition = async (req, res) => {
  try {
    const { date, startTime, endTime } = req.body;

    // 1) Validation horaire
    if (startTime && endTime && date) {
      const [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);

      const start = new Date(date);
      start.setHours(startH, startM, 0, 0);

      let end = new Date(date);
      end.setHours(endH, endM, 0, 0);

      if (end <= start) {
        end.setDate(end.getDate() + 1); // passage au lendemain
      }

      if (end <= start) {
        return res
          .status(400)
          .json({ message: "L'heure de fin doit être après l'heure de début." });
      }
    }

    // 2) Vérifier duplication autre ID
    const existing = await Repetition.findOne({
      date,
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Une répétition à cette date existe déjà." });
    }

    // 3) Forcer les pupitres cochés
    const pupitres = ["soprano", "alto", "ténor", "basse"];

    // 4) Mise à jour
    const updated = await Repetition.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        pupitres,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({ message: "Répétition mise à jour.", updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur mise à jour." });
  }
};



// export const archiveRepetition = async (req, res) => {
//   try {
//     await Repetition.findByIdAndUpdate(req.params.id, { isArchived: true });
//     res.json({ message: 'Répétition archivée.' });
//   } catch (error) {
//     res.status(500).json({ message: 'Erreur archivage.' });
//   }
// };

// export const restoreRepetition = async (req, res) => {
//   try {
//     await Repetition.findByIdAndUpdate(req.params.id, { isArchived: false });
//     res.json({ message: 'Répétition restaurée.' });
//   } catch (error) {
//     res.status(500).json({ message: 'Erreur restauration.' });
//   }
// };

export const deleteRepetitionPermanent = async (req, res) => {
  try {
    await Repetition.findByIdAndDelete(req.params.id);
    res.json({ message: "Répétition supprimée définitivement." });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression." });
  }
};

// 📥 New: Calculate attendance rate for choristes by concert
// export const getAttendanceForConcert = async (req, res) => {
//   try {
//     const { concertId } = req.params;

//     // Get all repetitions for the concert
//     const repetitions = await Repetition.find({ concert: concertId });
//     if (!repetitions.length) {
//       return res
//         .status(404)
//         .json({ message: "Aucune répétition trouvée pour ce concert." });
//     }

//     // Get all active choristes
//     const choristes = await User.find({
//       role: "choriste",
//       isChoristeLocked: { $ne: true },
//     });

//     const participation = choristes.map((choriste) => {
//       let totalReps = 0;
//       let attendedReps = 0;

//       repetitions.forEach((rep) => {
//         const pupitreEntry = rep.pupitres.find(
//           (p) => p.name === choriste.pupitre
//         );
//         if (pupitreEntry) {
//           totalReps++;
//           if (pupitreEntry.participationRate >= 70) {
//             // Treat >=70% as attended
//             attendedReps++;
//           }
//         }
//       });

//       const attendanceRate =
//         totalReps > 0 ? Math.round((attendedReps / totalReps) * 100) : 0;

//       return {
//         choristeId: choriste._id,
//         firstName: choriste.firstName,
//         lastName: choriste.lastName,
//         email: choriste.email,
//         attendanceRate,
//       };
//     });

//     res.json(participation);
//   } catch (error) {
//     console.error("Erreur calcul taux de participation:", error);
//     res.status(500).json({ message: "Erreur serveur." });
//   }
// };


export const getAttendanceForConcert = async (req, res) => {
  try {
    const { concertId } = req.params;

    // 1) Charger le seuil de participation depuis la config
    const config = await Config.findOne();
    const threshold = config ? config.participationThreshold : 70;

    // 2) Récupérer toutes les répétitions liées au concert
    const repetitions = await Repetition.find({ concert: concertId });
    if (!repetitions.length) {
      return res.status(404).json({ message: "Aucune répétition trouvée pour ce concert." });
    }

    // 3) Obtenir les choristes actifs
    const choristes = await User.find({
      role: "choriste",
      isChoristeLocked: { $ne: true },
    });

    // 4) Calculer le taux de participation de chaque choriste
    const participation = choristes.map((choriste) => {
      let totalReps = 0;
      let attendedReps = 0;

      repetitions.forEach((rep) => {
        const pupitreEntry = rep.pupitres.find(
          (p) => p.name === choriste.pupitre
        );
        if (pupitreEntry) {
          totalReps++;
          if (pupitreEntry.participationRate >= threshold) {
            attendedReps++;
          }
        }
      });

      const attendanceRate =
        totalReps > 0 ? Math.round((attendedReps / totalReps) * 100) : 0;

      return {
        choristeId: choriste._id,
        firstName: choriste.firstName,
        lastName: choriste.lastName,
        email: choriste.email,
        attendanceRate,
      };
    });

    // 5) Répondre avec les données et le seuil utilisé
    res.json({
      threshold,
      participation,
    });
  } catch (error) {
    console.error("Erreur calcul taux de participation:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getRepetitionsByConcert = async (req, res) => {
  try {
    const { concertId } = req.params;
    const repetitions = await Repetition.find({ concert: concertId }); // ✅ FIX HERE
    res.status(200).json(repetitions);
  } catch (error) {
    console.error("Erreur récupération répétitions:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const markRepetitionPresence = async (req, res) => {
  const choristeId = req.auth.userId;
  const repetitionId = req.params.id;

  try {
    const repetition = await Repetition.findById(repetitionId);

    if (!choristeId) {
      return res.status(400).json({ message: "ID choriste manquant." });
    }

    if (!repetition) {
      return res.status(404).json({ message: "Répétition introuvable." });
    }

    if (repetition.presentChoristes.includes(choristeId)) {
      return res.status(400).json({ message: "Présence déjà enregistrée." });
    }

    repetition.presentChoristes.push(choristeId);
    await repetition.save();

    res.json({ message: "Présence enregistrée avec succès." });
  } catch (err) {
    console.error("markRepetitionPresence error:", err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement." });
  }
};

export const markRepetitionAbsence = async (req, res) => {
  const choristeId = req.auth.userId;
  const repetitionId = req.params.id;
  const { reason } = req.body;

  if (!reason || reason.trim() === "") {
    return res.status(400).json({ message: "Le motif est requis." });
  }

  try {
    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) {
      return res.status(404).json({ message: "Répétition introuvable." });
    }

    // Already marked absent
    if (
      repetition.absentChoristes.some(
        (a) => a.choriste.toString() === choristeId
      )
    ) {
      return res.status(400).json({ message: "Absence déjà enregistrée." });
    }

    // If already marked present → block
    if (repetition.presentChoristes.includes(choristeId)) {
      return res
        .status(400)
        .json({
          message: "Présence déjà enregistrée, impossible de marquer absent.",
        });
    }

    repetition.absentChoristes.push({
      choriste: choristeId,
      reason: reason.trim(),
    });
    await repetition.save();

    res.json({ message: "Absence enregistrée avec succès." });
  } catch (err) {
    console.error("Erreur lors de l'enregistrement de l'absence :", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
