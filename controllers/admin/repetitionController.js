import Repetition from "../../models/repetitionModel.js";
import User from "../../models/userModel.js";
import Config from "../../models/configModel.js";
import {
  createChefPupitreModificationTemplate
} from "../../tools/mail/notifTemplate.js";
import { sendNotification } from "../../tools/mail/mailNotif.js";


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



// ✅ UPDATE your existing getRepetitions function
export const getRepetitions = async (req, res) => {
  try {
    const data = await Repetition.find()
      .populate("concert")
      .populate("absentChoristes.choriste", "firstName lastName email pupitre")
      .populate("manualPresences.choriste", "firstName lastName email pupitre")
      .populate("manualPresences.addedBy", "firstName lastName")
      .populate("pupitreModifications.chefDePupitre", "firstName lastName pupitre") // ✅ ADD THIS
      .sort({ date: -1 });
    
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



// ✅ Get choristes from chef's pupitre with their status for a specific repetition
export const getMyChoristesStatus = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId } = req.params;

    // 1. Validate chef de pupitre
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent accéder à cette fonctionnalité.' 
      });
    }

    // 2. Get repetition with populated data
    const repetition = await Repetition.findById(repetitionId)
      .populate('presentChoristes', 'firstName lastName')
      .populate('absentChoristes.choriste', 'firstName lastName')
      .populate('manualPresences.choriste', 'firstName lastName')
      .populate('manualPresences.addedBy', 'firstName lastName');

    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    // 3. Get all choristes from chef's pupitre
    const myPupitreChoristesList = await User.find({
      role: 'choriste',
      pupitre: chef.pupitre,
      isLocked: { $ne: true }
    }).select('firstName lastName email');

    // 4. Build status for each choriste
    const choristesStatus = myPupitreChoristesList.map(choriste => {
      // Check manual presence first (overrides automatic)
      const manualEntry = repetition.manualPresences.find(m => 
        m.choriste._id.equals(choriste._id)
      );

      if (manualEntry) {
        return {
          _id: choriste._id,
          firstName: choriste.firstName,
          lastName: choriste.lastName,
          email: choriste.email,
          status: manualEntry.type,
          isManual: true,
          manualReason: manualEntry.reason,
          addedBy: `${manualEntry.addedBy.firstName} ${manualEntry.addedBy.lastName}`,
          addedAt: manualEntry.addedAt
        };
      }

      // Check automatic presence/absence
      const isPresent = repetition.presentChoristes.some(p => 
        p._id.equals(choriste._id)
      );
      const absentEntry = repetition.absentChoristes.find(a => 
        a.choriste._id.equals(choriste._id)
      );

      return {
        _id: choriste._id,
        firstName: choriste.firstName,
        lastName: choriste.lastName,
        email: choriste.email,
        status: isPresent ? 'present' : absentEntry ? 'absent' : 'no-response',
        isManual: false,
        automaticReason: absentEntry?.reason || null,
        addedAt: null
      };
    });

    res.json({
      repetition: {
        _id: repetition._id,
        date: repetition.date,
        startTime: repetition.startTime,
        endTime: repetition.endTime,
        location: repetition.location
      },
      chefPupitre: chef.pupitre,
      choristes: choristesStatus
    });

  } catch (error) {
    console.error('Error getting choristes status:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ✅ Add/Update manual presence
export const addManualPresence = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId } = req.params;
    const { choristeId, type, reason } = req.body;

    // Validation
    if (!choristeId || !type || !reason || reason.trim() === '') {
      return res.status(400).json({ 
        message: 'Choriste, type de présence et motif sont requis.' 
      });
    }

    if (!['present', 'absent'].includes(type)) {
      return res.status(400).json({ 
        message: 'Type de présence invalide. Doit être "present" ou "absent".' 
      });
    }

    // 1. Validate chef de pupitre
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent modifier les présences.' 
      });
    }

    // 2. Validate choriste belongs to chef's pupitre
    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.role !== 'choriste' || choriste.pupitre !== chef.pupitre) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez gérer que les choristes de votre pupitre.' 
      });
    }

    // 3. Get repetition
    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    // 4. Remove from existing automatic arrays
    repetition.presentChoristes = repetition.presentChoristes.filter(id => 
      !id.equals(choristeId)
    );
    repetition.absentChoristes = repetition.absentChoristes.filter(a => 
      !a.choriste.equals(choristeId)
    );

    // 5. Remove existing manual entry for this choriste
    repetition.manualPresences = repetition.manualPresences.filter(m => 
      !m.choriste.equals(choristeId)
    );

    // 6. Add new manual entry
    repetition.manualPresences.push({
      choriste: choristeId,
      addedBy: chefId,
      reason: reason.trim(),
      type
    });

    await repetition.save();

    res.json({ 
      message: `Présence manuelle "${type}" ajoutée pour ${choriste.firstName} ${choriste.lastName}.`,
      action: type,
      choriste: {
        firstName: choriste.firstName,
        lastName: choriste.lastName
      }
    });

  } catch (error) {
    console.error('Error adding manual presence:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ✅ Remove manual presence (revert to automatic)
export const removeManualPresence = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId, choristeId } = req.params;

    // 1. Validate chef de pupitre
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé.' 
      });
    }

    // 2. Validate choriste belongs to chef's pupitre
    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.pupitre !== chef.pupitre) {
      return res.status(403).json({ 
        message: 'Choriste introuvable dans votre pupitre.' 
      });
    }

    // 3. Remove manual entry
    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    repetition.manualPresences = repetition.manualPresences.filter(m => 
      !m.choriste.equals(choristeId)
    );

    await repetition.save();

    res.json({ 
      message: `Présence manuelle supprimée pour ${choriste.firstName} ${choriste.lastName}. Retour au statut automatique.`
    });

  } catch (error) {
    console.error('Error removing manual presence:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getManagerAbsenceReport = async (req, res) => {
  try {
    const {
      filterType,
      pupitre,
      choristeId,
      date,
      dateFrom,
      dateTo,
      concertId
    } = req.query;

    // Validate filterType
    const validFilterTypes = [
      'general', 'pupitre', 'choriste', 'date', 
      'dateFrom', 'season', 'dateRange', 'programme'
    ];

    if (!filterType || !validFilterTypes.includes(filterType)) {
      return res.status(400).json({ 
        message: 'Type de filtre invalide. Options: ' + validFilterTypes.join(', ')
      });
    }

    // Base query for repetitions
    let repetitionQuery = {};
    let dateFilter = {};

    // Apply date filtering based on filterType
    switch (filterType) {
      case 'date':
        if (!date) {
          return res.status(400).json({ message: 'Date requise pour ce filtre.' });
        }
        dateFilter = {
          date: {
            $gte: new Date(date),
            $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000)
          }
        };
        break;

      case 'dateFrom':
        if (!dateFrom) {
          return res.status(400).json({ message: 'Date de début requise pour ce filtre.' });
        }
        dateFilter = {
          date: { $gte: new Date(dateFrom) }
        };
        break;

      case 'season':
        // Assume season starts September 1st of current academic year
        const now = new Date();
        const currentYear = now.getFullYear();
        const seasonStart = now.getMonth() >= 8 ? // September = month 8
          new Date(currentYear, 8, 1) : // This year's September
          new Date(currentYear - 1, 8, 1); // Last year's September
        
        dateFilter = {
          date: { $gte: seasonStart }
        };
        break;

      case 'dateRange':
        if (!dateFrom || !dateTo) {
          return res.status(400).json({ message: 'Dates de début et fin requises pour ce filtre.' });
        }
        dateFilter = {
          date: {
            $gte: new Date(dateFrom),
            $lte: new Date(dateTo)
          }
        };
        break;

      case 'programme':
        if (!concertId) {
          return res.status(400).json({ message: 'ID du concert/programme requis pour ce filtre.' });
        }
        repetitionQuery.concert = concertId;
        break;

      // 'general', 'pupitre', 'choriste' don't need date filtering
    }

    // Combine queries
    const finalQuery = { ...repetitionQuery, ...dateFilter };

    // Get repetitions based on query
    const repetitions = await Repetition.find(finalQuery)
      .populate('concert', 'title')
      .populate('absentChoristes.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.addedBy', 'firstName lastName')
      .sort({ date: -1 });

    if (!repetitions.length) {
      return res.json({
        filterType,
        filterValue: getFilterValue(req.query),
        period: getPeriodInfo(filterType, req.query),
        statistics: {
          totalRepetitions: 0,
          totalAbsences: 0,
          absenceRate: 0
        },
        absenceRecords: []
      });
    }

    // Build absence records from repetitions
    let allAbsenceRecords = [];

    repetitions.forEach(repetition => {
      // Get automatic absences
      repetition.absentChoristes.forEach(absent => {
        if (absent.choriste) {
          allAbsenceRecords.push({
            _id: `${repetition._id}_${absent.choriste._id}_auto`,
            choriste: {
              _id: absent.choriste._id,
              firstName: absent.choriste.firstName,
              lastName: absent.choriste.lastName,
              email: absent.choriste.email,
              pupitre: absent.choriste.pupitre
            },
            repetition: {
              _id: repetition._id,
              date: repetition.date,
              startTime: repetition.startTime,
              endTime: repetition.endTime,
              location: repetition.location,
              concert: repetition.concert
            },
            reason: absent.reason,
            isManual: false,
            addedAt: repetition.createdAt
          });
        }
      });

      // Get manual absences
      repetition.manualPresences
        .filter(manual => manual.type === 'absent')
        .forEach(manual => {
          if (manual.choriste) {
            allAbsenceRecords.push({
              _id: `${repetition._id}_${manual.choriste._id}_manual`,
              choriste: {
                _id: manual.choriste._id,
                firstName: manual.choriste.firstName,
                lastName: manual.choriste.lastName,
                email: manual.choriste.email,
                pupitre: manual.choriste.pupitre
              },
              repetition: {
                _id: repetition._id,
                date: repetition.date,
                startTime: repetition.startTime,
                endTime: repetition.endTime,
                location: repetition.location,
                concert: repetition.concert
              },
              reason: manual.reason,
              isManual: true,
              addedBy: `${manual.addedBy.firstName} ${manual.addedBy.lastName}`,
              addedAt: manual.addedAt
            });
          }
        });
    });

    // Apply choriste/pupitre filtering to records
    let filteredRecords = allAbsenceRecords;

    if (filterType === 'pupitre' && pupitre) {
      filteredRecords = allAbsenceRecords.filter(record => 
        record.choriste.pupitre === pupitre
      );
    }

    if (filterType === 'choriste' && choristeId) {
      filteredRecords = allAbsenceRecords.filter(record => 
        record.choriste._id.toString() === choristeId
      );
    }

    // Calculate statistics
    const totalRepetitions = repetitions.length;
    const totalAbsences = filteredRecords.length;
    
    // Get unique choristes for calculating absence rate
    const uniqueChoristesSet = new Set();
    if (filterType === 'choriste' && choristeId) {
      uniqueChoristesSet.add(choristeId);
    } else if (filterType === 'pupitre' && pupitre) {
      const choristesInPupitre = await User.find({ 
        role: 'choriste', 
        pupitre, 
        isLocked: { $ne: true } 
      });
      choristesInPupitre.forEach(c => uniqueChoristesSet.add(c._id.toString()));
    } else {
      const allChoristes = await User.find({ 
        role: 'choriste', 
        isLocked: { $ne: true } 
      });
      allChoristes.forEach(c => uniqueChoristesSet.add(c._id.toString()));
    }

    const totalPossibleAttendances = totalRepetitions * uniqueChoristesSet.size;
    const absenceRate = totalPossibleAttendances > 0 ? 
      ((totalAbsences / totalPossibleAttendances) * 100).toFixed(1) : 0;

    // Find most absent choriste
    const absenceCountByChpriste = {};
    filteredRecords.forEach(record => {
      const key = record.choriste._id.toString();
      absenceCountByChpriste[key] = (absenceCountByChpriste[key] || 0) + 1;
    });

    let mostAbsentChoriste = null;
    if (Object.keys(absenceCountByChpriste).length > 0) {
      const maxAbsences = Math.max(...Object.values(absenceCountByChpriste));
      const mostAbsentId = Object.keys(absenceCountByChpriste).find(
        key => absenceCountByChpriste[key] === maxAbsences
      );
      const mostAbsentRecord = filteredRecords.find(
        r => r.choriste._id.toString() === mostAbsentId
      );
      if (mostAbsentRecord) {
        mostAbsentChoriste = {
          name: `${mostAbsentRecord.choriste.firstName} ${mostAbsentRecord.choriste.lastName}`,
          absences: maxAbsences,
          pupitre: mostAbsentRecord.choriste.pupitre
        };
      }
    }

    // Sort records by date (most recent first)
    filteredRecords.sort((a, b) => new Date(b.repetition.date) - new Date(a.repetition.date));

    res.json({
      filterType,
      filterValue: getFilterValue(req.query),
      period: getPeriodInfo(filterType, req.query),
      statistics: {
        totalRepetitions,
        totalAbsences,
        absenceRate: parseFloat(absenceRate),
        mostAbsentChoriste
      },
      absenceRecords: filteredRecords
    });

  } catch (error) {
    console.error('Error generating absence report:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Helper function to get filter value description
const getFilterValue = (query) => {
  const { filterType, pupitre, choristeId, date, dateFrom, dateTo, concertId } = query;
  
  switch (filterType) {
    case 'general': return 'Tous les choristes';
    case 'pupitre': return pupitre || 'Pupitre non spécifié';
    case 'choriste': return choristeId || 'Choriste non spécifié';
    case 'date': return date || 'Date non spécifiée';
    case 'dateFrom': return `Depuis ${dateFrom || 'date non spécifiée'}`;
    case 'season': return 'Depuis début de saison';
    case 'dateRange': return `Du ${dateFrom || '?'} au ${dateTo || '?'}`;
    case 'programme': return concertId || 'Programme non spécifié';
    default: return 'Filtre inconnu';
  }
};

// Helper function to get period information
const getPeriodInfo = (filterType, query) => {
  const { date, dateFrom, dateTo } = query;
  
  switch (filterType) {
    case 'date':
      return { start: date, end: date, type: 'single-date' };
    case 'dateFrom':
      return { start: dateFrom, end: new Date().toISOString().split('T')[0], type: 'from-date' };
    case 'season':
      const now = new Date();
      const currentYear = now.getFullYear();
      const seasonStart = now.getMonth() >= 8 ? 
        `${currentYear}-09-01` : 
        `${currentYear - 1}-09-01`;
      return { start: seasonStart, end: new Date().toISOString().split('T')[0], type: 'season' };
    case 'dateRange':
      return { start: dateFrom, end: dateTo, type: 'range' };
    default:
      return { start: null, end: null, type: 'all-time' };
  }
};


export const modifyRepetitionForMyPupitre = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { id: repetitionId } = req.params;
    const { newStartTime, newEndTime, newLocation, urgentMessage, reason } = req.body;

    // 1. Validate chef de pupitre
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent modifier les répétitions.' 
      });
    }

    // 2. Get repetition
    const repetition = await Repetition.findById(repetitionId).populate('concert');
    if (!repetition) {
      return res.status(404).json({ message: 'Répétition introuvable.' });
    }

    // ✅ 3. ENHANCED BUSINESS HOURS VALIDATION
    const now = new Date();
    const currentHour = now.getHours();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const repetitionDate = new Date(repetition.date);
    repetitionDate.setHours(0, 0, 0, 0);

    // Past dates: never modifiable
    if (repetitionDate < today) {
      return res.status(400).json({ 
        message: 'Impossible de modifier une répétition passée. Cette répétition a déjà eu lieu.' 
      });
    }

    // Today: only modifiable before 18:00
    if (repetitionDate.getTime() === today.getTime() && currentHour >= 18) {
      return res.status(400).json({ 
        message: 'Impossible de modifier une répétition d\'aujourd\'hui après 18h00. La période de modification est fermée.' 
      });
    }

    // 4. Validate at least one modification
    if (!newStartTime && !newEndTime && !newLocation && !urgentMessage) {
      return res.status(400).json({ 
        message: 'Au moins une modification est requise.' 
      });
    }

    // ✅ 5. REMOVE EXISTING MODIFICATION FROM THIS CHEF (if any)
    repetition.pupitreModifications = repetition.pupitreModifications.filter(mod => 
      mod.chefDePupitre.toString() !== chefId.toString()
    );

    // ✅ 6. ADD NEW MODIFICATION
    const modificationData = {
      chefDePupitre: chefId,
      pupitre: chef.pupitre,
      modifications: {
        newStartTime: newStartTime || null,
        newEndTime: newEndTime || null,
        newLocation: newLocation || null,
        urgentMessage: urgentMessage || null,
        reason: reason || null
      },
      originalValues: {
        startTime: repetition.startTime,
        endTime: repetition.endTime,
        location: repetition.location
      },
      notificationsSent: false
    };

    // Add to repetition
    repetition.pupitreModifications.push(modificationData);
    await repetition.save();

    // Get the just-added modification (last one)
    const savedModification = repetition.pupitreModifications[repetition.pupitreModifications.length - 1];

    // 7. ✅ SUCCESS RESPONSE FIRST
    res.json({ 
      message: 'Modification enregistrée.',
      modificationId: savedModification._id,
      pupitre: chef.pupitre
    });

    // 8. ✅ SEND EMAILS IN BACKGROUND (async)
    setImmediate(async () => {
      try {
        // Get choristes from chef's pupitre
        const myPupitreChoristesList = await User.find({
          role: 'choriste',
          pupitre: chef.pupitre,
          isLocked: { $ne: true },
          _id: { $ne: chefId } // Don't send to chef himself
        }).select('firstName lastName email');

        console.log(`Sending notifications to ${myPupitreChoristesList.length} choristes from pupitre ${chef.pupitre}`);

        // Send emails to each choriste
        for (const choriste of myPupitreChoristesList) {
          const emailData = createChefPupitreModificationTemplate({
            choristeFirstName: choriste.firstName,
            choristeLastName: choriste.lastName,
            chefName: `${chef.firstName} ${chef.lastName}`,
            pupitre: chef.pupitre,
            repetition,
            modifications: modificationData.modifications,
            originalValues: modificationData.originalValues
          });

          await sendNotification({
            email: choriste.email,
            subject: emailData.subject,
            htmlContent: emailData.htmlContent,
            attachments: emailData.attachments,
          });

          console.log(`Email sent to ${choriste.firstName} ${choriste.lastName} (${choriste.email})`);
        }

        // Mark notifications as sent
        const updatedRepetition = await Repetition.findById(repetitionId);
        const modificationToUpdate = updatedRepetition.pupitreModifications.id(savedModification._id);
        if (modificationToUpdate) {
          modificationToUpdate.notificationsSent = true;
          await updatedRepetition.save();
        }

        console.log(`Notifications successfully sent for pupitre ${chef.pupitre}`);

      } catch (emailError) {
        console.error('Error sending modification emails:', emailError);
      }
    });

  } catch (error) {
    console.error('Error saving pupitre modification:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ✅ KEEP UNCHANGED - Get repetitions for chef interface
export const getRepetitionsForChef = async (req, res) => {
  try {
    const chefId = req.auth.userId;

    // 1. Validate chef de pupitre
    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent accéder à cette fonctionnalité.' 
      });
    }

    // 2. Get all repetitions with populated data
    const repetitions = await Repetition.find()
      .populate('concert', 'title')
      .populate({
        path: 'pupitreModifications.chefDePupitre',
        select: 'firstName lastName pupitre'
      })
      .sort({ date: 1 }); // Sort by date ascending (upcoming first)

    // 3. Add modification status for this chef's pupitre
    const repetitionsWithModificationStatus = repetitions.map(rep => {
      const repObj = rep.toObject();
      
      // ✅ FIXED: Find if this chef has already modified this repetition
      const chefModification = rep.pupitreModifications.find(mod => {
        // Convert ObjectId to string for comparison
        const modChefId = mod.chefDePupitre._id ? mod.chefDePupitre._id.toString() : mod.chefDePupitre.toString();
        return modChefId === chefId.toString();
      });

      repObj.hasMyModification = !!chefModification;
      repObj.myModification = chefModification || null;

      return repObj;
    });

    res.json({
      repetitions: repetitionsWithModificationStatus,
      chefInfo: {
        pupitre: chef.pupitre,
        name: `${chef.firstName} ${chef.lastName}`
      }
    });

  } catch (error) {
    console.error('Error getting repetitions for chef:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};