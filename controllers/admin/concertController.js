// controllers/admin/concertController.js
import Concert from "../../models/concertModel.js";
import Repetition from "../../models/repetitionModel.js";
import Config from "../../models/configModel.js";

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
    // ✅ HANDLE CUSTOM ERROR CODES
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
    // ✅ HANDLE CUSTOM ERROR CODES
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

// 📥 Get archived concerts
// export const getArchivedConcerts = async (req, res) => {
//   try {
//     const concerts = await Concert.find({ isArchived: true }).populate("programme");
//     res.json(concerts);
//   } catch (error) {
//     res.status(500).json({ message: "Erreur lors de la récupération des archivés." });
//   }
// };




// 🗑️ Archive or permanent delete (biz logic)
// export const deleteConcert = async (req, res) => {
//   try {
//     const concert = await Concert.findById(req.params.id);
//     if (!concert) {
//       return res.status(404).json({ message: "Concert introuvable." });
//     }
//     if (concert.programme.length > 0) {
//       concert.isArchived = true;
//       await concert.save();
//       return res.json({ message: "Concert archivé (lié à des œuvres)." });
//     }
//     await Concert.findByIdAndDelete(req.params.id);
//     res.json({ message: "Concert supprimé définitivement." });
//   } catch (error) {
//     res.status(500).json({ message: "Erreur lors de la suppression du concert." });
//   }
// };

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
    const repetitions = await Repetition.find({ concert: concertId });
    const total = repetitions.length;

    if (total === 0) {
      return res.json({ eligible: false, percentage: 0 });
    }

    const attended = repetitions.filter(rep =>
      rep.presentChoristes.includes(choristeId)
    ).length;

    const percentage = (attended / total) * 100;

    // 🔥 Chargement du seuil dynamique
    const config = await Config.findOne();
    const threshold = config?.participationThreshold ?? 70;

    const eligible = percentage >= threshold;

    res.json({
      eligible,
      percentage: Math.round(percentage * 100) / 100,
      threshold,
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
      select: '-password -__v',  // Exclude sensitive or unnecessary fields
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