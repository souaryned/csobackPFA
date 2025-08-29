import User from '../../models/userModel.js';
import { sendNotification } from '../../tools/mail/mailNotif.js';
import { createManagerBroadcastTemplate, createChefPupitreMessageTemplate } from '../../tools/mail/notifTemplate.js';

// ✅ Send manager broadcast message to all choristes
export const sendManagerBroadcast = async (req, res) => {
  try {
    const { messageContent } = req.body; // ✅ Only messageContent needed
    const managerId = req.auth.userId;

    // Validate input
    if (!messageContent) {
      return res.status(400).json({
        success: false,
        message: 'Contenu du message requis.'
      });
    }

    if (messageContent.length < 10 || messageContent.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Le message doit contenir entre 10 et 1000 caractères.'
      });
    }

    // Get manager info
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les managers peuvent envoyer des messages généraux.'
      });
    }

    // Get all active choristes with valid emails
    const choristes = await User.find({
      role: 'choriste',
      status: { $in: ['Junior', 'Sénior', 'Vétéran'] },
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('firstName lastName email pupitre');

    if (choristes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucun choriste actif avec email trouvé.'
      });
    }

    // ✅ IMMEDIATE RESPONSE
    res.status(200).json({
      success: true,
      message: `Message important en cours d'envoi à ${choristes.length} choriste(s).`,
      data: {
        totalChoristes: choristes.length,
        emailStatus: 'processing_background',
        estimatedEmailTime: `${Math.ceil(choristes.length / 10)} minutes`,
        timestamp: new Date().toISOString()
      }
    });

    // ✅ BACKGROUND EMAIL PROCESSING
    setImmediate(async () => {
      const BATCH_SIZE = 10;
      let successful = 0;
      let failed = 0;
      const startTime = new Date();

      try {
        for (let i = 0; i < choristes.length; i += BATCH_SIZE) {
          const batch = choristes.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(choristes.length / BATCH_SIZE);
          
          // console.log(`⚡ Processing manager broadcast batch ${batchNumber}/${totalBatches} (${batch.length} choristes)`);
          
          const batchPromises = batch.map(async (choriste) => {
            try {
              const emailTemplate = createManagerBroadcastTemplate({
                choristeFirstName: choriste.firstName,
                choristeLastName: choriste.lastName,
                choristerPupitre: choriste.pupitre,
                managerName: `${manager.firstName} ${manager.lastName}`,
                messageContent // ✅ No title needed
              });

              await sendNotification({
                email: choriste.email,
                subject: emailTemplate.subject,
                htmlContent: emailTemplate.htmlContent,
                attachments: emailTemplate.attachments
              });

              // console.log(`✅ Manager message sent: ${choriste.firstName} ${choriste.lastName} (${choriste.email})`);
              return { success: true, choriste: choriste._id };

            } catch (error) {
              console.error(`❌ Failed manager message: ${choriste.firstName} ${choriste.lastName}`, error.message);
              return { success: false, error: error.message, choriste: choriste._id };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          
          batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value.success) {
              successful++;
            } else {
              failed++;
            }
          });

          const progress = Math.round(((i + batch.length) / choristes.length) * 100);
          // console.log(`📊 Manager broadcast progress: ${progress}% (${successful} successful, ${failed} failed)`);
          
          if (i + BATCH_SIZE < choristes.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        // console.log(`🎯 Manager broadcast completed in ${duration}s`);
        // console.log(`📈 Final results: ${successful} successful, ${failed} failed`);

      } catch (backgroundError) {
        console.error('💥 Manager broadcast background processing failed:', backgroundError);
      }
    });

  } catch (error) {
    console.error('❌ Error in manager broadcast process:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message.',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ✅ Send chef de pupitre message to pupitre members
export const sendChefPupitreMessage = async (req, res) => {
  try {
    const { messageContent } = req.body; // ✅ Only messageContent needed
    const chefId = req.auth.userId;

    // Validate input
    if (!messageContent) {
      return res.status(400).json({
        success: false,
        message: 'Contenu du message requis.'
      });
    }

    if (messageContent.length < 10 || messageContent.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Le message doit contenir entre 10 et 1000 caractères.'
      });
    }

    // Get chef de pupitre info
    const chef = await User.findById(chefId);
    if (!chef || !chef.isChefDePupitre || !chef.pupitre) {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les chefs de pupitre peuvent envoyer des messages à leur pupitre.'
      });
    }

    // Get all choristes of the same pupitre with valid emails
    const choristes = await User.find({
      role: 'choriste',
      pupitre: chef.pupitre,
      status: { $in: ['Junior', 'Sénior', 'Vétéran'] },
      _id: { $ne: chefId },
      email: { $exists: true, $ne: null, $ne: '' }
    }).select('firstName lastName email pupitre');

    if (choristes.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Aucun choriste actif avec email trouvé dans le pupitre ${chef.pupitre}.`
      });
    }

    // ✅ IMMEDIATE RESPONSE
    res.status(200).json({
      success: true,
      message: `Message important en cours d'envoi à ${choristes.length} membre(s) du pupitre ${chef.pupitre}.`,
      data: {
        totalMembers: choristes.length,
        pupitre: chef.pupitre,
        emailStatus: 'processing_background',
        estimatedEmailTime: `${Math.ceil(choristes.length / 10)} minutes`,
        timestamp: new Date().toISOString()
      }
    });

    // ✅ BACKGROUND EMAIL PROCESSING
    setImmediate(async () => {
      const BATCH_SIZE = 10;
      let successful = 0;
      let failed = 0;
      const startTime = new Date();

      try {
        for (let i = 0; i < choristes.length; i += BATCH_SIZE) {
          const batch = choristes.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(choristes.length / BATCH_SIZE);
          
          // console.log(`⚡ Processing chef pupitre message batch ${batchNumber}/${totalBatches} (${batch.length} choristes)`);
          
          const batchPromises = batch.map(async (choriste) => {
            try {
              const emailTemplate = createChefPupitreMessageTemplate({
                choristeFirstName: choriste.firstName,
                choristeLastName: choriste.lastName,
                choristerPupitre: choriste.pupitre,
                chefName: `${chef.firstName} ${chef.lastName}`,
                messageContent // ✅ No title needed
              });

              await sendNotification({
                email: choriste.email,
                subject: emailTemplate.subject,
                htmlContent: emailTemplate.htmlContent,
                attachments: emailTemplate.attachments
              });

              // console.log(`✅ Chef pupitre message sent: ${choriste.firstName} ${choriste.lastName} (${choriste.email})`);
              return { success: true, choriste: choriste._id };

            } catch (error) {
              console.error(`❌ Failed chef pupitre message: ${choriste.firstName} ${choriste.lastName}`, error.message);
              return { success: false, error: error.message, choriste: choriste._id };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          
          batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value.success) {
              successful++;
            } else {
              failed++;
            }
          });

          const progress = Math.round(((i + batch.length) / choristes.length) * 100);
          // console.log(`📊 Chef pupitre message progress: ${progress}% (${successful} successful, ${failed} failed)`);
          
          if (i + BATCH_SIZE < choristes.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        // console.log(`🎯 Chef pupitre message completed in ${duration}s`);
        // console.log(`📈 Final results: ${successful} successful, ${failed} failed to ${chef.pupitre} pupitre`);

      } catch (backgroundError) {
        console.error('💥 Chef pupitre message background processing failed:', backgroundError);
      }
    });

  } catch (error) {
    console.error('❌ Error in chef pupitre message process:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message.',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}