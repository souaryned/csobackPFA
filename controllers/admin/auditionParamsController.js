import AuditionParams from '../../models/auditionParamsModel.js';
import AuditionSlot from '../../models/auditionSlotModel.js';

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
    
    // Also delete associated slots
    await AuditionSlot.deleteMany({ paramId: id });
    
    const deleted = await AuditionParams.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Paramètres introuvables." });
    return res.status(200).json({ message: "Paramètres supprimés." });
  } catch (err) {
    console.error("Error deleting audition params:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Check if planning exists for parameters
export const checkPlanningExists = async (req, res) => {
  try {
    const { id } = req.params;
    
    const slotCount = await AuditionSlot.countDocuments({ 
      // You might need to add a paramId field to AuditionSlot model
      // or find by date range matching the parameters
    });
    
    // Alternative: Check by date range if no paramId field
    const params = await AuditionParams.findById(id);
    if (!params) {
      return res.status(404).json({ message: "Paramètres introuvables." });
    }
    
    const slots = await AuditionSlot.find({
      date: {
        $gte: new Date(params.startDate),
        $lte: new Date(params.endDate)
      }
    });
    
    return res.status(200).json({ 
      exists: slots.length > 0,
      count: slots.length 
    });
  } catch (err) {
    console.error("Error checking planning exists:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Get planning details with candidates
export const getPlanningDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const params = await AuditionParams.findById(id);
    if (!params) {
      return res.status(404).json({ message: "Paramètres introuvables." });
    }
    
    const slots = await AuditionSlot.find({
      date: {
        $gte: new Date(params.startDate),
        $lte: new Date(params.endDate)
      }
    })
    .populate('candidate', 'firstName lastName email')
    .sort({ date: 1, startTime: 1 });
    
    // Calculate statistics
    const totalCandidates = slots.length;
    const uniqueDates = [...new Set(slots.map(slot => slot.date.toDateString()))];
    const totalDays = uniqueDates.length;
    const totalSlots = slots.length;
    const averagePerDay = Math.round(totalCandidates / totalDays);
    
    return res.status(200).json({
      params,
      slots,
      totalCandidates,
      totalDays,
      totalSlots,
      averagePerDay,
      uniqueDates
    });
  } catch (err) {
    console.error("Error fetching planning details:", err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};
