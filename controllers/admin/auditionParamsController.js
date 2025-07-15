
import AuditionParams from '../../models/auditionParamsModel.js';

// Create
export const saveAuditionParams = async (req, res) => {
  try {
    const params = new AuditionParams(req.body);
    await params.save();
    return res.status(201).json({ message: "Paramètres enregistrés.", params });
  } catch (err) {
    console.error("Error saving audition params:", err);
    return res.status(400).json({ message: err.message });
  }
};

// Read all
export const listAuditionParams = async (req, res) => {
  try {
    const sets = await AuditionParams.find().sort({ createdAt: -1 });
    return res.status(200).json(sets);
  } catch (err) {
    console.error("Error listing audition params:", err);
    return res.status(500).json({ message: "Impossible de récupérer les paramètres." });
  }
};

// Read one
export const getAuditionParamsById = async (req, res) => {
  try {
    const { id } = req.params;
    const params = await AuditionParams.findById(id);
    if (!params) return res.status(404).json({ message: "Paramètres introuvables." });
    return res.status(200).json(params);
  } catch (err) {
    console.error("Error fetching audition params:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Update
export const updateAuditionParams = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await AuditionParams.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ message: "Paramètres introuvables." });
    return res.status(200).json({ message: "Paramètres mis à jour.", params: updated });
  } catch (err) {
    console.error("Error updating audition params:", err);
    return res.status(400).json({ message: err.message });
  }
};

// Delete
export const deleteAuditionParams = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AuditionParams.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Paramètres introuvables." });
    return res.status(200).json({ message: "Paramètres supprimés." });
  } catch (err) {
    console.error("Error deleting audition params:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};