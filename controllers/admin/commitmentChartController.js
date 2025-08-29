// controllers/commitmentChartController.js
import CommitmentChart from '../../models/commitmentChartModel.js';

// Get all commitment charts
export const getCommitmentCharts = async (req, res) => {
  try {
    const charts = await CommitmentChart.find()
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: charts
    });
  } catch (error) {
    console.error('Error fetching commitment charts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des chartes.'
    });
  }
};

// Get active commitment chart for current year
export const getActiveCommitmentChart = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const chart = await CommitmentChart.findOne({ 
      year: currentYear, 
      isActive: true 
    }).populate('createdBy', 'firstName lastName');

    if (!chart) {
      return res.status(404).json({
        success: false,
        message: 'Aucune charte active trouvée pour cette année.'
      });
    }

    res.status(200).json({
      success: true,
      data: chart
    });
  } catch (error) {
    console.error('Error fetching active commitment chart:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la charte active.'
    });
  }
};

// Get single commitment chart by ID
export const getCommitmentChartById = async (req, res) => {
  try {
    const { id } = req.params;
    const chart = await CommitmentChart.findById(id)
      .populate('createdBy', 'firstName lastName');

    if (!chart) {
      return res.status(404).json({
        success: false,
        message: 'Charte non trouvée.'
      });
    }

    res.status(200).json({
      success: true,
      data: chart
    });
  } catch (error) {
    console.error('Error fetching commitment chart:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la charte.'
    });
  }
};

// Create new commitment chart
export const createCommitmentChart = async (req, res) => {
  try {
    const { title, content, isActive } = req.body;
    const userId = req.auth.userId;
    const year = new Date().getFullYear(); // Always use current year

    // Check for duplicate title and year combination
    const existingChart = await CommitmentChart.findOne({ title, year });
    if (existingChart) {
      return res.status(400).json({
        success: false,
        message: 'Une charte avec ce titre existe déjà pour cette année.'
      });
    }

    // Check for existing chart in the same year
    const existingYearChart = await CommitmentChart.findOne({ year });
    if (existingYearChart) {
      return res.status(400).json({
        success: false,
        message: `Une charte existe déjà pour l'année ${year}. Vous ne pouvez créer qu'une seule charte par année.`
      });
    }

    // If setting as active, deactivate other charts for the same year
    if (isActive) {
      await CommitmentChart.updateMany(
        { year: year, isActive: true },
        { isActive: false }
      );
    }

    const chart = new CommitmentChart({
      title,
      year,
      content,
      isActive: isActive || false,
      createdBy: userId
    });

    await chart.save();
    await chart.populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Charte créée avec succès.',
      data: chart
    });
  } catch (error) {
    console.error('Error creating commitment chart:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Une charte avec ce titre existe déjà pour cette année.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la charte.'
    });
  }
};

// Update commitment chart
export const updateCommitmentChart = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, isActive } = req.body;
    const year = new Date().getFullYear(); // Always use current year

    const chart = await CommitmentChart.findById(id);
    if (!chart) {
      return res.status(404).json({
        success: false,
        message: 'Charte non trouvée.'
      });
    }

    // Check for duplicate title and year combination (excluding current chart)
    const existingChart = await CommitmentChart.findOne({ 
      title, 
      year, 
      _id: { $ne: id } 
    });
    if (existingChart) {
      return res.status(400).json({
        success: false,
        message: 'Une charte avec ce titre existe déjà pour cette année.'
      });
    }

    // Check for existing chart in the same year (excluding current chart)
    const existingYearChart = await CommitmentChart.findOne({ 
      year, 
      _id: { $ne: id } 
    });
    if (existingYearChart) {
      return res.status(400).json({
        success: false,
        message: `Une charte existe déjà pour l'année ${year}. Vous ne pouvez avoir qu'une seule charte par année.`
      });
    }

    // If setting as active, deactivate other charts for the same year
    if (isActive && !chart.isActive) {
      await CommitmentChart.updateMany(
        { year: year, isActive: true, _id: { $ne: id } },
        { isActive: false }
      );
    }

    chart.title = title;
    chart.year = year;
    chart.content = content;
    chart.isActive = isActive;

    await chart.save();
    await chart.populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Charte mise à jour avec succès.',
      data: chart
    });
  } catch (error) {
    console.error('Error updating commitment chart:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Une charte avec ce titre existe déjà pour cette année.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la charte.'
    });
  }
};

// Toggle commitment chart active status
export const toggleCommitmentChartStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const chart = await CommitmentChart.findById(id);
    if (!chart) {
      return res.status(404).json({
        success: false,
        message: 'Charte non trouvée.'
      });
    }

    if (!chart.isActive) {
      // Deactivate other charts for the same year
      await CommitmentChart.updateMany(
        { year: chart.year, isActive: true, _id: { $ne: id } },
        { isActive: false }
      );
    }

    chart.isActive = !chart.isActive;
    await chart.save();
    await chart.populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: `Charte ${chart.isActive ? 'activée' : 'désactivée'} avec succès.`,
      data: chart
    });
  } catch (error) {
    console.error('Error toggling commitment chart status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut de la charte.'
    });
  }
};

// Delete commitment chart
export const deleteCommitmentChart = async (req, res) => {
  try {
    const { id } = req.params;

    const chart = await CommitmentChart.findById(id);
    if (!chart) {
      return res.status(404).json({
        success: false,
        message: 'Charte non trouvée.'
      });
    }

    if (chart.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une charte active.'
      });
    }

    await CommitmentChart.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Charte supprimée avec succès.'
    });
  } catch (error) {
    console.error('Error deleting commitment chart:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la charte.'
    });
  }
};