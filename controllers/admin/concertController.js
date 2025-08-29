import Concert from "../../models/concertModel.js";
import Repetition from "../../models/repetitionModel.js";
import Config from "../../models/configModel.js";
import User from "../../models/userModel.js";

// ➕ Create a concert
export const createConcert = async (req, res) => {
  try {
    const concertData = req.body;

    if (!concertData.title || concertData.title.trim() === "") {
      return res.status(400).json({ message: "Le titre est requis." });
    }

    const existingConcert = await Concert.findOne({ dateHeure: concertData.dateHeure });
    if (existingConcert) {
      return res.status(409).json({ message: "Un concert à cette date et heure existe déjà." });
    }

    if (req.file) {
      concertData.poster = req.file.filename;
    }

    concertData.programme = JSON.parse(concertData.programme);
    concertData.dateHeure = new Date(concertData.dateHeure);

    const concert = new Concert(concertData);
    await concert.save();

    res.status(201).json({ message: "Concert créé avec succès." });
  } catch (error) {
    if (error.code === 'INVALID_POSTER_FORMAT') {
      return res.status(400).json({ 
        message: "Format d'affiche non supporté", 
        type: "FILE_FORMAT_ERROR" 
      });
    }
    console.error("Erreur création concert:", error);
    res.status(500).json({ message: "Erreur création concert." });
  }
};

// 📤 Update a concert
export const updateConcert = async (req, res) => {
  try {
    const updateData = req.body;

    if (updateData.title && updateData.title.trim() === "") {
      return res.status(400).json({ message: "Le titre ne peut pas être vide." });
    }

    if (updateData.dateHeure) {
      const existingConcert = await Concert.findOne({
        dateHeure: updateData.dateHeure,
        _id: { $ne: req.params.id }
      });
      if (existingConcert) {
        return res.status(409).json({ message: "Un concert à cette date et heure existe déjà." });
      }
    }

    if (req.file) {
      updateData.poster = req.file.filename;
    }
    if (updateData.programme) {
      updateData.programme = JSON.parse(updateData.programme);
    }
    if (updateData.dateHeure) {
      updateData.dateHeure = new Date(updateData.dateHeure);
    }

    const updated = await Concert.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("programme");

    res.json({ message: "Concert mis à jour avec succès.", updated });
  } catch (error) {
    if (error.code === 'INVALID_POSTER_FORMAT') {
      return res.status(400).json({ 
        message: "Format d'affiche non supporté", 
        type: "FILE_FORMAT_ERROR" 
      });
    }
    console.error("Erreur update concert:", error);
    res.status(500).json({ message: "Erreur update concert." });
  }
};

// 📥 Get all concerts
export const getConcerts = async (req, res) => {
  try {
    const concerts = await Concert.find().populate("programme");
    res.json(concerts);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération." });
  }
};

// 🔥 Suppression PERMANENTE explicite
export const deleteConcertPermanent = async (req, res) => {
  try {
    const concert = await Concert.findById(req.params.id);
    if (!concert) {
      return res.status(404).json({ message: "Concert introuvable." });
    }
    await Concert.findByIdAndDelete(req.params.id);
    res.json({ message: "Concert supprimé définitivement." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression permanente du concert." });
  }
};

// 🔄 Restaurer concert archivé
export const restoreConcert = async (req, res) => {
  try {
    await Concert.findByIdAndUpdate(req.params.id, { isArchived: false });
    res.json({ message: "Concert restauré avec succès." });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la restauration." });
  }
};

export const markAvailability = async (req, res) => {
  const choristeId = req.auth.userId;
  const concertId = req.params.id;

  try {
    const concert = await Concert.findById(concertId);
    if (!concert) {
      return res.status(404).json({ message: "Concert introuvable." });
    }

    // Check if eliminated from this concert
    const choriste = await User.findById(choristeId);
    const isEliminated = choriste.eliminationRecords?.some(
      record => record.concertId?.toString() === concertId.toString()
    );

    if (isEliminated) {
      return res.status(403).json({ 
        message: "Vous avez été éliminé de ce concert." 
      });
    }

    // Already marked?
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

export const checkConcertAttendance = async (req, res) => {
  const { concertId, choristeId } = req.params;

  try {
    const choriste = await User.findById(choristeId);
    if (!choriste) {
      return res.json({ 
        eligible: false, 
        percentage: 0, 
        reason: 'user_not_found',
        message: 'Utilisateur introuvable' 
      });
    }

    const isEliminatedFromConcert = choriste.eliminationRecords?.some(
      record => record.concertId?.toString() === concertId.toString()
    );

    if (isEliminatedFromConcert) {
      const eliminationRecord = choriste.eliminationRecords.find(
        record => record.concertId?.toString() === concertId.toString()
      );
      
      return res.json({ 
        eligible: false, 
        percentage: 0,
        reason: 'eliminated_from_concert',
        eliminationType: eliminationRecord.reason,
        eliminationDate: eliminationRecord.eliminatedAt,
        message: eliminationRecord.reason === 'absence_threshold' 
          ? 'Éliminé pour absence insuffisante'
          : 'Éliminé pour raisons disciplinaires'
      });
    }

    // ✅ UPDATED: Only get repetitions where choriste's pupitre was included
    const repetitions = await Repetition.find({ 
      concert: concertId,
      pupitres: { $in: [choriste.pupitre] }
    })
      .populate('presentChoristes')
      .populate('manualPresences.choriste');
    
    const total = repetitions.length;

    if (total === 0) {
      return res.json({ 
        eligible: true,
        percentage: 0,
        reason: 'no_repetitions_for_pupitre',
        message: `Aucune répétition programmée pour votre pupitre (${choriste.pupitre})`
      });
    }

    let attended = 0;
    repetitions.forEach(repetition => {
      let isPresent = false;

      if (repetition.presentChoristes.some(
        present => present._id.toString() === choristeId.toString()
      )) {
        isPresent = true;
      }

      const manualPresence = repetition.manualPresences.find(
        manual => manual.choriste._id.toString() === choristeId.toString()
      );
      if (manualPresence) {
        isPresent = manualPresence.type === 'present';
      }

      if (isPresent) {
        attended++;
      }
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
      reason: eligible ? 'eligible' : 'insufficient_attendance',
      message: eligible ? 'Éligible' : 'Taux de présence insuffisant',
      pupitre: choriste.pupitre,
      totalRepetitionsForAllPupitres: await Repetition.countDocuments({ concert: concertId })
    });

  } catch (err) {
    console.error("Erreur calcul présence concert:", err);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const getAvailableChoristesForConcert = async (req, res) => {
  const concertId = req.params.id;

  try {
    const concert = await Concert.findById(concertId).populate({
      path: 'availableChoristes',
      select: '-password -__v',
    });

    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    res.status(200).json(concert.availableChoristes);
  } catch (error) {
    console.error('Erreur lors de la récupération des participants:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const validateChoristeForConcert = async (req, res) => {
  try {
    const { concertId, choristeId } = req.params;

    const concert = await Concert.findById(concertId);
    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    if (!concert.availableChoristes.includes(choristeId)) {
      return res.status(400).json({ 
        message: 'Le choriste n\'a pas marqué sa disponibilité pour ce concert.' 
      });
    }

    if (concert.finalParticipants.includes(choristeId)) {
      return res.status(400).json({ 
        message: 'Le choriste est déjà validé pour ce concert.' 
      });
    }

    concert.finalParticipants.push(choristeId);
    await concert.save();

    res.status(200).json({ 
      message: 'Choriste validé avec succès pour le concert.',
      concert: concert
    });

  } catch (error) {
    console.error('Erreur lors de la validation du choriste:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getAvailableChoristesForValidation = async (req, res) => {
  try {
    const { concertId } = req.params;

    const concert = await Concert.findById(concertId)
      .populate('availableChoristes', 'firstName lastName email pupitre eliminationRecords')
      .populate('finalParticipants', '_id');

    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    const choristesWithStatus = concert.availableChoristes.map(choriste => {
      const isValidated = concert.finalParticipants.some(fp => 
        fp._id.toString() === choriste._id.toString()
      );
      
      const isEliminated = choriste.eliminationRecords?.some(record => 
        record.concertId?.toString() === concertId.toString()
      );

      return {
        ...choriste.toObject(),
        validationStatus: isEliminated ? 'eliminated' : isValidated ? 'validated' : 'pending'
      };
    });

    res.status(200).json({
      message: 'Choristes récupérés avec succès.',
      choristes: choristesWithStatus,
      concert: {
        _id: concert._id,
        title: concert.title,
        dateHeure: concert.dateHeure
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des choristes:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getFinalParticipantsForConcert = async (req, res) => {
  try {
    const { concertId } = req.params;

    const concert = await Concert.findById(concertId)
      .populate('finalParticipants', 'firstName lastName email pupitre height');

    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    res.status(200).json({
      message: 'Participants finaux récupérés avec succès.',
      data: concert.finalParticipants,
      concert: {
        _id: concert._id,
        title: concert.title,
        dateHeure: concert.dateHeure,
        location: concert.location
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des participants finaux:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const deleteFromFinalParticipants = async (req, res) => {
  try {
    const { concertId, choristeId } = req.params;
    const { reason = 'No-show on concert day' } = req.body;

    const concert = await Concert.findById(concertId);
    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    if (!concert.finalParticipants.includes(choristeId)) {
      return res.status(400).json({ 
        message: 'Le choriste n\'est pas dans la liste des participants finaux.' 
      });
    }

    concert.finalParticipants = concert.finalParticipants.filter(
      id => id.toString() !== choristeId.toString()
    );

    concert.availableChoristes = concert.availableChoristes.filter(
      id => id.toString() !== choristeId.toString()
    );

    if (!concert.absentChoristes.some(absent => absent.choriste.toString() === choristeId.toString())) {
      concert.absentChoristes.push({
        choriste: choristeId,
        reason: 'removed_by_admin',
        markedAt: new Date()
      });
    }

    await concert.save();

    const choriste = await User.findById(choristeId, 'firstName lastName email');

    res.status(200).json({ 
      message: `${choriste.firstName} ${choriste.lastName} a été supprimé de la liste des participants et marqué absent.`,
      concert: concert
    });

  } catch (error) {
    console.error('Erreur lors de la suppression du participant:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getFinalParticipantsForChef = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { concertId } = req.params;

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent accéder à cette fonctionnalité.' 
      });
    }

    const concert = await Concert.findById(concertId)
      .populate({
        path: 'finalParticipants',
        match: { 
          pupitre: chef.pupitre,
          _id: { $ne: chefId }
        },
        select: 'firstName lastName email pupitre height'
      });

    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    const concertDetails = {
      _id: concert._id,
      title: concert.title,
      dateHeure: concert.dateHeure,
      location: concert.location
    };

    res.json({
      concert: concertDetails,
      chefPupitre: chef.pupitre,
      finalParticipants: concert.finalParticipants || [],
      totalParticipants: concert.finalParticipants ? concert.finalParticipants.length : 0
    });

  } catch (error) {
    console.error('Error getting final participants for chef:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const removeFromFinalParticipantsAsChef = async (req, res) => {
  try {
    const chefId = req.auth.userId;
    const { concertId, choristeId } = req.params;

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent effectuer cette action.' 
      });
    }

    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.role !== 'choriste' || choriste.pupitre !== chef.pupitre) {
      return res.status(403).json({ 
        message: 'Vous ne pouvez gérer que les choristes de votre pupitre.' 
      });
    }

    const concert = await Concert.findById(concertId);
    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    if (!concert.finalParticipants.includes(choristeId)) {
      return res.status(400).json({ 
        message: 'Ce choriste ne fait pas partie des participants finaux.' 
      });
    }

    concert.finalParticipants = concert.finalParticipants.filter(
      id => id.toString() !== choristeId.toString()
    );

    concert.availableChoristes = concert.availableChoristes.filter(
      id => id.toString() !== choristeId.toString()
    );

    if (!concert.absentChoristes.some(absent => absent.choriste.toString() === choristeId.toString())) {
      concert.absentChoristes.push({
        choriste: choristeId,
        reason: 'removed_by_chef',
        markedAt: new Date()
      });
    }

    await concert.save();

    res.json({ 
      message: `${choriste.firstName} ${choriste.lastName} a été retiré de la liste des participants finaux.`,
      removedChoriste: {
        _id: choriste._id,
        firstName: choriste.firstName,
        lastName: choriste.lastName,
        pupitre: choriste.pupitre
      }
    });

  } catch (error) {
    console.error('Error removing from final participants:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getConcertsForChefFinalParticipants = async (req, res) => {
  try {
    const chefId = req.auth.userId;

    const chef = await User.findById(chefId);
    if (!chef || chef.role !== 'choriste' || !chef.isChefDePupitre) {
      return res.status(403).json({ 
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent accéder à cette fonctionnalité.' 
      });
    }

    const concerts = await Concert.find({})
      .populate({
        path: 'finalParticipants',
        match: { 
          pupitre: chef.pupitre,
          _id: { $ne: chefId }
        },
        select: 'firstName lastName pupitre'
      })
      .select('title dateHeure location')
      .sort({ dateHeure: -1 });

    const concertsWithParticipants = concerts.filter(concert => 
      concert.finalParticipants && concert.finalParticipants.length > 0
    );

    res.json({
      chefInfo: {
        name: `${chef.firstName} ${chef.lastName}`,
        pupitre: chef.pupitre
      },
      concerts: concertsWithParticipants.map(concert => ({
        _id: concert._id,
        title: concert.title,
        dateHeure: concert.dateHeure,
        location: concert.location,
        participantsCount: concert.finalParticipants.length
      }))
    });

  } catch (error) {
    console.error('Error getting concerts for chef:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const markConcertAbsence = async (req, res) => {
  const choristeId = req.auth.userId;
  const concertId = req.params.id;
  const { reason = 'manual_absence' } = req.body;

  try {
    const concert = await Concert.findById(concertId);
    if (!concert) {
      return res.status(404).json({ message: "Concert introuvable." });
    }

    const alreadyAbsent = concert.absentChoristes.some(
      absent => absent.choriste.toString() === choristeId
    );

    if (alreadyAbsent) {
      return res.status(400).json({ message: "Déjà marqué comme absent." });
    }

    concert.availableChoristes = concert.availableChoristes.filter(
      id => id.toString() !== choristeId
    );
    concert.finalParticipants = concert.finalParticipants.filter(
      id => id.toString() !== choristeId
    );

    concert.absentChoristes.push({
      choriste: choristeId,
      reason: reason,
      markedAt: new Date()
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
    if (!concert) {
      return res.status(404).json({ message: "Concert introuvable." });
    }

    if (new Date(concert.dateHeure) > new Date()) {
      return res.status(400).json({ message: "Le concert n'est pas encore terminé." });
    }

    const allChoristes = await User.find({ 
      role: 'choriste', 
      isLocked: { $ne: true },
      status: { $nin: ['Inactif', 'En congé'] }
    }).select('_id');

    let markedAbsentCount = 0;

    for (const choriste of allChoristes) {
      const choristeId = choriste._id.toString();
      
      const isInAvailable = concert.availableChoristes.some(id => id.toString() === choristeId);
      const isInFinal = concert.finalParticipants.some(id => id.toString() === choristeId);
      const isInAbsent = concert.absentChoristes.some(absent => absent.choriste.toString() === choristeId);
      
      const user = await User.findById(choristeId);
      const isEliminated = user.eliminationRecords?.some(
        record => record.concertId?.toString() === concertId.toString()
      );

      if (!isInAvailable && !isInFinal && !isInAbsent && !isEliminated) {
        concert.absentChoristes.push({
          choriste: choristeId,
          reason: 'did_not_mark_disponibilite',
          markedAt: new Date()
        });
        markedAbsentCount++;
      }
    }

    if (markedAbsentCount > 0) {
      await concert.save();
    }

    res.json({ 
      message: `${markedAbsentCount} choriste(s) marqué(s) comme absent(s) automatiquement.`,
      markedAbsentCount
    });

  } catch (error) {
    console.error('Error auto-marking absent:', error);
       res.status(500).json({ message: 'Erreur serveur.' });
  }
};

export const getConcertStatusForChoriste = async (req, res) => {
  try {
    const { concertId, choristeId } = req.params;

    const concert = await Concert.findById(concertId)
      .populate('absentChoristes.choriste', 'firstName lastName');

    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    // Check various statuses
    const isAvailable = concert.availableChoristes.includes(choristeId);
    const isFinalParticipant = concert.finalParticipants.includes(choristeId);
    const absentRecord = concert.absentChoristes.find(
      absent => absent.choriste._id.toString() === choristeId
    );

    // Check if eliminated
    const choriste = await User.findById(choristeId);
    const isEliminated = choriste?.eliminationRecords?.some(
      record => record.concertId?.toString() === concertId.toString()
    );

    let status = 'not_available';
    let statusMessage = 'Non disponible';

    if (isEliminated) {
      status = 'eliminated';
      statusMessage = 'Éliminé';
    } else if (isFinalParticipant) {
      status = 'final_participant';
      statusMessage = 'Participant final';
    } else if (isAvailable) {
      status = 'available';
      statusMessage = 'Disponible';
    } else if (absentRecord) {
      status = 'absent';
      statusMessage = getAbsenceReasonMessage(absentRecord.reason);
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
      absentReason: absentRecord?.reason || null,
      absentMarkedAt: absentRecord?.markedAt || null
    });

  } catch (error) {
    console.error('Error getting concert status:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Helper function for absence reason messages
const getAbsenceReasonMessage = (reason) => {
  switch (reason) {
    case 'did_not_mark_disponibilite':
      return 'Absent (n\'a pas marqué sa disponibilité)';
    case 'removed_by_admin':
      return 'Absent (retiré par admin)';
    case 'removed_by_chef':
      return 'Absent (retiré par chef de pupitre)';
    case 'manual_absence':
      return 'Absent (marqué manuellement)';
    default:
      return 'Absent';
  }
};