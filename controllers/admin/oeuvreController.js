import Oeuvre from "../../models/oeuvreModel.js";

// 📥 Create a new oeuvre
export const createOeuvre = async (req, res) => {
  try {
    const body = req.body;
    const lyricsFile = req.files?.lyrics?.[0]?.filename || "";
    const partitionFile = req.files?.partition?.[0]?.filename || "";

    const oeuvre = new Oeuvre({
      ...body,
      lyrics: lyricsFile,
      partition: partitionFile,
    });

    await oeuvre.save();
    res.status(201).json({ message: "Œuvre créée avec succès." });
  } catch (error) {
    console.error("Erreur lors de la création:", error);
    res.status(500).json({ message: "Échec de la création de l’œuvre." });
  }
};


// 📤 Get all active oeuvres
export const getOeuvres = async (req, res) => {
  try {
    const oeuvres = await Oeuvre.find();
    res.json(oeuvres);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération." });
  }
};

// 🗃️ Get archived oeuvres
// export const getArchivedOeuvres = async (req, res) => {
//   try {
//     const archived = await Oeuvre.find({ isArchived: true });
//     res.json(archived);
//   } catch (error) {
//     res.status(500).json({ message: "Erreur lors de la récupération des archivées." });
//   }
// };

// ✏️ Update an oeuvre
export const updateOeuvre = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    if (req.files?.lyrics?.[0]) {
      body.lyrics = req.files.lyrics[0].filename;
    }

    if (req.files?.partition?.[0]) {
      body.partition = req.files.partition[0].filename;
    }

    const updated = await Oeuvre.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true
    });

    res.json({ message: "Œuvre mise à jour avec succès.", updated });
  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};


// 🗑️ Archive (soft-delete) an oeuvre
// export const archiveOeuvre = async (req, res) => {
//   try {
//     await Oeuvre.findByIdAndUpdate(req.params.id, { isArchived: true });
//     res.json({ message: "Œuvre archivée avec succès." });
//   } catch (error) {
//     res.status(500).json({ message: "Erreur lors de l’archivage." });
//   }
// };

// 🔁 Restore an archived oeuvre
// export const restoreOeuvre = async (req, res) => {
//   try {
//     await Oeuvre.findByIdAndUpdate(req.params.id, { isArchived: false });
//     res.json({ message: "Œuvre restaurée avec succès." });
//   } catch (error) {
//     res.status(500).json({ message: "Erreur lors de la restauration." });
//   }
// };


// 🗑️ Permanently delete an oeuvre
export const deleteOeuvrePermanent = async (req, res) => {
  try {
    await Oeuvre.findByIdAndDelete(req.params.id);
    res.json({ message: "Œuvre supprimée définitivement." });
  } catch (error) {
    console.error("Erreur suppression définitive:", error);
    res.status(500).json({ message: "Échec de la suppression." });
  }
};
export const getOeuvreById = async (req, res) => {
  try {
    const { id } = req.params;
    const oeuvre = await Oeuvre.findById(id);
    if (!oeuvre) {
      return res.status(404).json({ message: "Œuvre non trouvée" });
    }
    res.status(200).json(oeuvre);
  } catch (error) {
    console.error("Erreur récupération œuvre:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
