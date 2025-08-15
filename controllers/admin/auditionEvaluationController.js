import AuditionEvaluation from '../../models/auditionEvaluation.js';
import User from '../../models/userModel.js';
import AuditionSlot from '../../models/auditionSlotModel.js';


// Create new audition evaluation
export const createEvaluation = async (req, res) => {
  try {
    const { 
      candidateId, 
      auditionSlotId, 
      tessiture, 
      oeuvreChante, 
      remarque, 
      note, 
      ordrePassage, 
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

    // Create evaluation
    const evaluation = new AuditionEvaluation({
      candidate: candidateId,
      auditionSlot: auditionSlotId,
      tessiture,
      oeuvreChante,
      remarque: remarque || "",
      note,
      ordrePassage: ordrePassage || null,
      decision,
      evaluatedBy: req.auth.userId,
      lastModifiedBy: req.auth.userId
    });

    await evaluation.save();

    // ✅ NEW: Mark candidate as auditioned
    await User.findByIdAndUpdate(
      candidateId,
      { 
        isAuditioned: true,
        auditionnedAt: new Date()  // Bonus: track when they were auditioned
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
    // console.error('Error creating evaluation:', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'évaluation' });
  }
};

// Update existing evaluation
export const updateEvaluation = async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const { 
      tessiture, 
      oeuvreChante, 
      remarque, 
      note, 
      ordrePassage, 
      decision 
    } = req.body;

    const evaluation = await AuditionEvaluation.findById(evaluationId)
      .populate('candidate', 'firstName lastName gender');

    if (!evaluation) {
      return res.status(404).json({ message: "Évaluation introuvable" });
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

    // Update fields
    evaluation.tessiture = tessiture;
    evaluation.oeuvreChante = oeuvreChante;
    evaluation.remarque = remarque || "";
    evaluation.note = note;
    evaluation.ordrePassage = ordrePassage || null;
    evaluation.decision = decision;
    evaluation.lastModifiedAt = new Date();
    evaluation.lastModifiedBy = req.auth.userId; // ✅ Fixed: use req.auth.userId

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
    // console.error('Error updating evaluation:', error);
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

    // if (!evaluation) {
    //   return res.status(404).json({ message: "Aucune évaluation trouvée" });
    // }

    res.status(200).json({ evaluation });

  } catch (error) {
    // console.error('Error fetching evaluation:', error);
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
    // console.error('Error fetching tessiture options:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des options' });
  }
};

// Get all evaluations for a planning (optional - for statistics)
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
      .populate('evaluatedBy', 'firstName lastName');

    // Filter out null auditionSlots (those that don't match the planning)
    const filteredEvaluations = evaluations.filter(evaluation => evaluation.auditionSlot !== null);

    res.status(200).json({ 
      evaluations: filteredEvaluations,
      total: filteredEvaluations.length
    });

  } catch (error) {
    // console.error('Error fetching planning evaluations:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des évaluations' });
  }
};


