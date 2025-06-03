// controllers/configController.js
import Config from '../../models/configModel.js';

export const getConfig = async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      // If not found, create a default config
      config = new Config();
      await config.save();
    }
    res.json(config);
  } catch (error) {
    console.error('Failed to fetch config:', error);
    res.status(500).json({ message: 'Server error while fetching config.' });
  }
};

export const updateSignupActive = async (req, res) => {
  try {
    const { signupActive } = req.body;

    if (typeof signupActive !== 'boolean') {
      return res.status(400).json({ message: 'signupActive must be boolean.' });
    }

    let config = await Config.findOne();
    if (!config) {
      config = new Config({ signupActive });
    } else {
      config.signupActive = signupActive;
    }

    await config.save();
    res.json({ message: 'Config updated successfully.', config });
  } catch (error) {
    console.error('Failed to update config:', error);
    res.status(500).json({ message: 'Server error while updating config.' });
  }
};





export const getParticipationThreshold = async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({});
    }
    res.json({ participationThreshold: config.participationThreshold });
  } catch (err) {
    res.status(500).json({ message: "Erreur chargement configuration." });
  }
};

export const updateParticipationThreshold = async (req, res) => {
  try {
    const { participationThreshold } = req.body;

    if (participationThreshold < 0 || participationThreshold > 100) {
      return res.status(400).json({ message: "Valeur invalide." });
    }

    const config = await Config.findOneAndUpdate(
      {},
      { participationThreshold },
      { upsert: true, new: true }
    );

    res.json({ message: "Seuil mis à jour", config });
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour." });
  }
};
