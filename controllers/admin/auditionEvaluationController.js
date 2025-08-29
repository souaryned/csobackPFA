import AuditionEvaluation from '../../models/auditionEvaluation.js';
import User from '../../models/userModel.js';
import AuditionSlot from '../../models/auditionSlotModel.js';


export const createEvaluation = async (req, res) => {
  try {
    const { 
      candidateId, 
      auditionSlotId, 
      tessiture, 
      oeuvreChante, 
      remarque, 
      note, 
      decision 
    } = req.body;

    // Validate candidate exists
    const candidate = await User.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidat introuvable" });
    }

    // Validate audition slot exists
    const auditionSlot = await AuditionSlot.findById(auditionSlotId);
    if (!auditionSlot) {
      return res.status(404).json({ message: "Créneau d'audition introuvable" });
    }

    // Validate tessiture matches candidate's gender
    const validTessitures = candidate.gender === "Homme" 
      ? ["Ténor", "Basse"] 
      : ["Soprano", "Alto"];
    
    if (!validTessitures.includes(tessiture)) {
      return res.status(400).json({ 
        message: `Tessiture invalide pour le genre ${candidate.gender}. Options valides: ${validTessitures.join(', ')}` 
      });
    }

    // Check if evaluation already exists
    const existingEvaluation = await AuditionEvaluation.findOne({
      candidate: candidateId,
      auditionSlot: auditionSlotId
    });

    if (existingEvaluation) {
      return res.status(400).json({ message: "Une évaluation existe déjà pour ce candidat" });
    }

    // ✅ FIXED: Auto-calculate next ordre de passage PER AUDITION PLANNING
    // Get all audition slots for this specific planning
    const allSlotsForPlanning = await AuditionSlot.find({ 
      paramId: auditionSlot.paramId 
    }).select('_id');

    const slotIds = allSlotsForPlanning.map(slot => slot._id);

    // Count existing evaluations for THIS specific audition planning only
    const existingEvaluationsCount = await AuditionEvaluation.countDocuments({
      auditionSlot: { $in: slotIds }
    });

    // Next order number for THIS audition planning
    const nextOrderNumber = existingEvaluationsCount + 1;

    // Create evaluation
    const evaluation = new AuditionEvaluation({
      candidate: candidateId,
      auditionSlot: auditionSlotId,
      tessiture,
      oeuvreChante,
      remarque: remarque || "",
      note,
      ordrePassage: nextOrderNumber, // ✅ Auto-assigned per audition planning
      decision,
      evaluatedBy: req.auth.userId,
      lastModifiedBy: req.auth.userId
    });

    await evaluation.save();

    // Mark candidate as auditioned
    await User.findByIdAndUpdate(
      candidateId,
      { 
        isAuditioned: true,
        auditionnedAt: new Date()
      },
      { new: true }
    );

    // Populate candidate info for response
    await evaluation.populate('candidate', 'firstName lastName email gender');
    await evaluation.populate('evaluatedBy', 'firstName lastName');

    res.status(201).json({
      message: "Évaluation créée avec succès",
      evaluation
    });

  } catch (error) {
    console.error('Error creating evaluation:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'évaluation' });
  }
};

export const updateEvaluation = async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const { 
      tessiture, 
      oeuvreChante, 
      remarque, 
      note, 
      decision 
    } = req.body;

    const evaluation = await AuditionEvaluation.findById(evaluationId)
      .populate('candidate', 'firstName lastName gender charterSigned');

    if (!evaluation) {
      return res.status(404).json({ message: "Évaluation introuvable" });
    }

    if (evaluation.candidate.charterSigned === true) {
      return res.status(403).json({ message: "Ce candidat est devenu choriste - modification interdite" });
    }

    // Validate tessiture matches candidate's gender
    const validTessitures = evaluation.candidate.gender === "Homme" 
      ? ["Ténor", "Basse"] 
      : ["Soprano", "Alto"];
    
    if (!validTessitures.includes(tessiture)) {
      return res.status(400).json({ 
        message: `Tessiture invalide pour le genre ${evaluation.candidate.gender}. Options valides: ${validTessitures.join(', ')}` 
      });
    }

    // ✅ NOTE: We DON'T update ordrePassage on edit - it stays the same
    evaluation.tessiture = tessiture;
    evaluation.oeuvreChante = oeuvreChante;
    evaluation.remarque = remarque || "";
    evaluation.note = note;
    evaluation.decision = decision;
    evaluation.lastModifiedAt = new Date();
    evaluation.lastModifiedBy = req.auth.userId;

    await evaluation.save();

    // Populate for response
    await evaluation.populate('candidate', 'firstName lastName email gender');
    await evaluation.populate('evaluatedBy', 'firstName lastName');
    await evaluation.populate('lastModifiedBy', 'firstName lastName');

    res.status(200).json({
      message: "Évaluation mise à jour avec succès",
      evaluation
    });

  } catch (error) {
    console.error('Error updating evaluation:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'évaluation' });
  }
};

// Get evaluation by candidate and audition slot
export const getEvaluation = async (req, res) => {
  try {
    const { candidateId, auditionSlotId } = req.params;

    const evaluation = await AuditionEvaluation.findOne({
      candidate: candidateId,
      auditionSlot: auditionSlotId
    })
    .populate('candidate', 'firstName lastName email gender')
    .populate('evaluatedBy', 'firstName lastName')
    .populate('lastModifiedBy', 'firstName lastName');

    res.status(200).json({ evaluation });

  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'évaluation' });
  }
};

// Get tessiture options based on gender
export const getTessitureOptions = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await User.findById(candidateId, 'gender');
    if (!candidate) {
      return res.status(404).json({ message: "Candidat introuvable" });
    }

    const options = candidate.gender === "Homme" 
      ? [
          { value: "Ténor", label: "Ténor" },
          { value: "Basse", label: "Basse" }
        ]
      : [
          { value: "Soprano", label: "Soprano" },
          { value: "Alto", label: "Alto" }
        ];

    res.status(200).json({ 
      gender: candidate.gender,
      options 
    });

  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des options' });
  }
};

// ✅ UPDATED: Get all evaluations for a planning with ordre de passage
export const getPlanningEvaluations = async (req, res) => {
  try {
    const { planningId } = req.params;

    const evaluations = await AuditionEvaluation.find()
      .populate({
        path: 'auditionSlot',
        match: { paramId: planningId },
        populate: {
          path: 'candidate',
          select: 'firstName lastName email gender'
        }
      })
      .populate('evaluatedBy', 'firstName lastName')
      .sort({ ordrePassage: 1 }); // ✅ Sort by ordre de passage

    // Filter out null auditionSlots (those that don't match the planning)
    const filteredEvaluations = evaluations.filter(evaluation => evaluation.auditionSlot !== null);

    res.status(200).json({ 
      evaluations: filteredEvaluations,
      total: filteredEvaluations.length
    });

  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des évaluations' });
  }
};

// Get candidate charter status
export const getCandidateCharterStatus = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const candidate = await User.findById(candidateId, 'charterSigned charterSignedAt firstName lastName');
    if (!candidate) {
      return res.status(404).json({ message: "Candidat introuvable" });
    }

    res.status(200).json({
      charterSigned: candidate.charterSigned || false,
      charterSignedAt: candidate.charterSignedAt || null,
      candidateName: `${candidate.firstName} ${candidate.lastName}`
    });

  } catch (error) {
    console.error('Error fetching candidate charter status:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification du statut de la charte' });
  }
};