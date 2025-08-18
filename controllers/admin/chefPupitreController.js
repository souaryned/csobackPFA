import User from '../../models/userModel.js';
import {
  createChefAppointedNotificationTemplate,
  createCoChefNotificationTemplate,
  createChefRemovedNotificationTemplate,
  createCoChefLeftNotificationTemplate,

} from "../../tools/mail/notifTemplate.js";
import { sendNotification } from "../../tools/mail/mailNotif.js";




// Get all chef de pupitre organized by pupitre
export const getChefsPupitre = async (req, res) => {
  try {
    // Get all chef de pupitre
    const chefsData = await User.find({
      role: 'choriste',
      isChefDePupitre: true,
      pupitre: { $in: ['soprano', 'alto', 'ténor', 'basse'] }
    }).select('firstName lastName email pupitre chefDePupitreAssignedAt').sort('pupitre firstName');

    // Organize by pupitre
    const pupitres = {
      soprano: { chefs: [], maxChefs: 2 },
      alto: { chefs: [], maxChefs: 2 },
      ténor: { chefs: [], maxChefs: 2 },
      basse: { chefs: [], maxChefs: 2 }
    };

    // Group chefs by pupitre
    chefsData.forEach(chef => {
      if (pupitres[chef.pupitre]) {
        pupitres[chef.pupitre].chefs.push({
          _id: chef._id,
          firstName: chef.firstName,
          lastName: chef.lastName,
          email: chef.email,
          assignedAt: chef.chefDePupitreAssignedAt
        });
      }
    });

    // Add availability info
    Object.keys(pupitres).forEach(pupitre => {
      pupitres[pupitre].available = pupitres[pupitre].maxChefs - pupitres[pupitre].chefs.length;
      pupitres[pupitre].isFull = pupitres[pupitre].chefs.length >= pupitres[pupitre].maxChefs;
    });

    res.status(200).json({
      message: "Chefs de pupitre récupérés avec succès",
      pupitres
    });

  } catch (error) {
    console.error('Error getting chefs pupitre:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des chefs de pupitre' });
  }
};


// Get available choristes for a specific pupitre (not already chef)
export const getAvailableChoristesForPupitre = async (req, res) => {
  try {
    const { pupitre } = req.params;

    // Validate pupitre
    const validPupitres = ['soprano', 'alto', 'ténor', 'basse'];
    if (!validPupitres.includes(pupitre)) {
      return res.status(400).json({ message: 'Pupitre invalide' });
    }

    // Get choristes from this pupitre who are not chef de pupitre
    const availableChoristes = await User.find({
      role: 'choriste',
      pupitre: pupitre,
      isChefDePupitre: false,
      isLocked: false
    }).select('firstName lastName email').sort('firstName lastName');

    res.status(200).json({
      message: `Choristes disponibles pour ${pupitre}`,
      choristes: availableChoristes,
      total: availableChoristes.length
    });

  } catch (error) {
    console.error('Error getting available choristes:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des choristes disponibles' });
  }
};

// Assign chef de pupitre - INSTANT RESPONSE
export const assignChefDePupitre = async (req, res) => {
  try {
    const { userId } = req.params;
    const { pupitre } = req.body;

    // Validate pupitre
    const validPupitres = ['soprano', 'alto', 'ténor', 'basse'];
    if (!validPupitres.includes(pupitre)) {
      return res.status(400).json({ message: 'Pupitre invalide' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Choriste introuvable' });
    }

    // Validate user is choriste
    if (user.role !== 'choriste') {
      return res.status(400).json({ message: 'Seuls les choristes peuvent devenir chef de pupitre' });
    }

    // Validate user belongs to the specified pupitre
    if (user.pupitre !== pupitre) {
      return res.status(400).json({ 
        message: `Ce choriste appartient au pupitre ${user.pupitre}, pas ${pupitre}` 
      });
    }

    // Check if already chef de pupitre
    if (user.isChefDePupitre) {
      return res.status(400).json({ message: 'Ce choriste est déjà chef de pupitre' });
    }

    // Check if pupitre already has 2 chefs
    const currentChefsCount = await User.countDocuments({
      role: 'choriste',
      pupitre: pupitre,
      isChefDePupitre: true
    });

    if (currentChefsCount >= 2) {
      return res.status(400).json({ 
        message: `Le pupitre ${pupitre} a déjà 2 chefs de pupitre (maximum atteint)` 
      });
    }

    // Find existing co-chef before assignment (for background email)
    const existingCoChef = await User.findOne({
      role: 'choriste',
      pupitre: pupitre,
      isChefDePupitre: true,
      isLocked: false
    }).select('firstName lastName email');

    // Assign chef de pupitre
    user.isChefDePupitre = true;
    user.chefDePupitreAssignedAt = new Date('2025-08-16T20:49:44Z');
    await user.save();

    // ✅ INSTANT RESPONSE - Don't wait for emails
    res.status(200).json({
      message: `${user.firstName} ${user.lastName} a été nommé chef de pupitre ${pupitre}`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        pupitre: user.pupitre,
        assignedAt: user.chefDePupitreAssignedAt
      }
    });

    // ✅ BACKGROUND EMAIL SENDING (fire & forget)
    setImmediate(async () => {
      try {
        // 1. Send email to newly appointed chef
        const newChefEmailData = createChefAppointedNotificationTemplate({
          chefFirstName: user.firstName,
          chefLastName: user.lastName,
          pupitre: pupitre,
        });
        
        await sendNotification({
          email: user.email,
          subject: newChefEmailData.subject,
          htmlContent: newChefEmailData.htmlContent,
          attachments: newChefEmailData.attachments || [],
        });
        
        // console.log(`✅ Chef appointment email sent to: ${user.firstName} ${user.lastName} (${user.email})`);
        
        // 2. Send email to existing co-chef (if any)
        if (existingCoChef) {
          const coChefEmailData = createCoChefNotificationTemplate({
            chefFirstName: existingCoChef.firstName,
            chefLastName: existingCoChef.lastName,
            newCoChefName: `${user.firstName} ${user.lastName}`,
            pupitre: pupitre
          });
          
          await sendNotification({
            email: existingCoChef.email,
            subject: coChefEmailData.subject,
            htmlContent: coChefEmailData.htmlContent,
            attachments: coChefEmailData.attachments || [],
          });
          
          // console.log(`✅ Co-chef notification sent to: ${existingCoChef.firstName} ${existingCoChef.lastName} (${existingCoChef.email})`);
        }
        
      } catch (emailError) {
        console.error(`❌ Background email error for chef assignment:`, emailError);
        // Could save to email queue table here for retry later
      }
    });

  } catch (error) {
    console.error('Error assigning chef de pupitre:', error);
    res.status(500).json({ message: 'Erreur lors de la nomination du chef de pupitre' });
  }
};

// Remove chef de pupitre - INSTANT RESPONSE
export const removeChefDePupitre = async (req, res) => {
  try {
    const { userId } = req.params;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Choriste introuvable' });
    }

    // Validate user is chef de pupitre
    if (!user.isChefDePupitre) {
      return res.status(400).json({ message: 'Ce choriste n\'est pas chef de pupitre' });
    }

    // Get info before removal (for background emails)
    const pupitreInfo = user.pupitre;
    const removedChefName = `${user.firstName} ${user.lastName}`;
    const removedChefEmail = user.email;
    const removedChefFirstName = user.firstName;
    const removedChefLastName = user.lastName;
    
    // Find remaining co-chef before removal (for background email)
    const remainingCoChef = await User.findOne({
      role: 'choriste',
      pupitre: pupitreInfo,
      isChefDePupitre: true,
      isLocked: false,
      _id: { $ne: userId } // Exclude the chef being removed
    }).select('firstName lastName email');

    // Remove chef de pupitre status
    user.isChefDePupitre = false;
    user.chefDePupitreAssignedAt = null;
    await user.save();

    // ✅ INSTANT RESPONSE - Don't wait for emails
    res.status(200).json({
      message: `${removedChefName} n'est plus chef de pupitre ${pupitreInfo}`,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        pupitre: user.pupitre
      }
    });

    // ✅ BACKGROUND EMAIL SENDING (fire & forget)
    setImmediate(async () => {
      try {
        // 1. Send email to removed chef
        const removedChefEmailData = createChefRemovedNotificationTemplate({
          chefFirstName: removedChefFirstName,
          chefLastName: removedChefLastName,
          pupitre: pupitreInfo,
        });
        
        await sendNotification({
          email: removedChefEmail,
          subject: removedChefEmailData.subject,
          htmlContent: removedChefEmailData.htmlContent,
          attachments: removedChefEmailData.attachments || [],
        });
        
        // console.log(`✅ Chef removal email sent to: ${removedChefName} (${removedChefEmail})`);
        
        // 2. Send email to remaining co-chef (if any)
        if (remainingCoChef) {
          const coChefLeftEmailData = createCoChefLeftNotificationTemplate({
            chefFirstName: remainingCoChef.firstName,
            chefLastName: remainingCoChef.lastName,
            leftCoChefName: removedChefName,
            pupitre: pupitreInfo
          });
          
          await sendNotification({
            email: remainingCoChef.email,
            subject: coChefLeftEmailData.subject,
            htmlContent: coChefLeftEmailData.htmlContent,
            attachments: coChefLeftEmailData.attachments || [],
          });
          
          // console.log(`✅ Co-chef departure notification sent to: ${remainingCoChef.firstName} ${remainingCoChef.lastName} (${remainingCoChef.email})`);
        }
        
      } catch (emailError) {
        console.error(`❌ Background email error for chef removal:`, emailError);
        // Could save to email queue table here for retry later
      }
    });

  } catch (error) {
    console.error('Error removing chef de pupitre:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du chef de pupitre' });
  }
};