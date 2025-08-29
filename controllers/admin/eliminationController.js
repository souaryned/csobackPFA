import Concert from '../../models/concertModel.js';
import Repetition from '../../models/repetitionModel.js';
import User from '../../models/userModel.js';
import Config from '../../models/configModel.js';
import { sendNotification } from '../../tools/mail/mailNotif.js';
import { 
  createNominationWarningTemplate, 
  createEliminationNoticeTemplate ,
  createComprehensiveWarningTemplate
} from '../../tools/mail/notifTemplate.js';

/**
 * Get absence analysis for a specific concert
 * Returns choristes with their attendance rates vs threshold
 */
export const getConcertAbsenceReport = async (req, res) => {
  try {
    const { concertId } = req.params;

    if (!concertId) {
      return res.status(400).json({ message: 'Concert ID requis.' });
    }

    // Get the concert
    const concert = await Concert.findById(concertId).populate('programme');
    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    // ✅ UPDATED: Get repetitions with pupitre information
    const repetitions = await Repetition.find({ concert: concertId })
      .populate('presentChoristes', 'firstName lastName email pupitre')
      .populate('absentChoristes.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.choriste', 'firstName lastName email pupitre')
      .sort({ date: 1 });

    // Get admin-configured threshold
    const config = await Config.findOne();
    const adminThreshold = config?.participationThreshold ?? 70;

    // ✅ UPDATED: Get all active choristes with pupitre info
    const allChoristes = await User.find({ 
      role: 'choriste', 
      isLocked: { $ne: true },
      status: { $nin: ['Inactif', 'En congé', 'éliminé'] }
    }).select('firstName lastName email pupitre eliminationRecords');

    // ✅ UPDATED: Calculate attendance considering pupitre-specific repetitions
    const analysisResults = allChoristes.map(choriste => {
      // ✅ CRITICAL CHANGE: Only count repetitions that include this choriste's pupitre
      const relevantRepetitions = repetitions.filter(rep => 
        rep.pupitres.includes(choriste.pupitre)
      );
      
      const totalRepetitions = relevantRepetitions.length;
      let attendedRepetitions = 0;

      // Count attended repetitions for this choriste (only relevant ones)
      relevantRepetitions.forEach(repetition => {
        let isPresent = false;

        // Check in presentChoristes array
        if (repetition.presentChoristes.some(
          present => present._id.toString() === choriste._id.toString()
        )) {
          isPresent = true;
        }

        // Check manual presences for 'present' type
        if (repetition.manualPresences.some(
          manual => manual.choriste._id.toString() === choriste._id.toString() && manual.type === 'present'
        )) {
          isPresent = true;
        }

        // Check if marked as absent in manual presences (overrides presence)
        if (repetition.manualPresences.some(
          manual => manual.choriste._id.toString() === choriste._id.toString() && manual.type === 'absent'
        )) {
          isPresent = false;
        }

        if (isPresent) {
          attendedRepetitions++;
        }
      });

      const attendanceRate = totalRepetitions > 0 
        ? (attendedRepetitions / totalRepetitions) * 100 
        : 100; // ✅ If no repetitions for this pupitre, consider 100% eligible

      const isAtRisk = attendanceRate < adminThreshold;

      return {
        choriste: {
          _id: choriste._id,
          firstName: choriste.firstName,
          lastName: choriste.lastName,
          email: choriste.email,
          pupitre: choriste.pupitre,
          eliminationRecords: choriste.eliminationRecords || []
        },
        totalRepetitions, // ✅ Now pupitre-specific
        attendedRepetitions,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        threshold: adminThreshold,
        isAtRisk,
        absencesCount: totalRepetitions - attendedRepetitions,
        // ✅ UPDATED: Only include relevant repetitions in details
        repetitionDetails: relevantRepetitions.map(rep => {
          let attended = false;

          // Check in presentChoristes
          if (rep.presentChoristes.some(
            present => present._id.toString() === choriste._id.toString()
          )) {
            attended = true;
          }

          // Check manual presences
          const manualPresence = rep.manualPresences.find(
            manual => manual.choriste._id.toString() === choriste._id.toString()
          );
          if (manualPresence) {
            attended = manualPresence.type === 'present';
          }

          return {
            repetitionId: rep._id,
            date: rep.date,
            location: rep.location,
            pupitres: rep.pupitres,
            attended
          };
        }),
        // ✅ NEW: Add summary of all repetitions vs relevant ones
        allRepetitionsCount: repetitions.length,
        relevantRepetitionsCount: totalRepetitions
      };
    });

    // Sort by attendance rate (lowest first - most at risk first)
    analysisResults.sort((a, b) => a.attendanceRate - b.attendanceRate);

    const responseData = {
      concert: {
        _id: concert._id,
        title: concert.title,
        dateHeure: concert.dateHeure,
        location: concert.location,
        programme: concert.programme
      },
      // ✅ UPDATED: Include pupitre info in repetitions
      repetitions: repetitions.map(rep => ({
        _id: rep._id,
        dateHeure: rep.date,
        location: rep.location,
        pupitres: rep.pupitres,
        presenceCount: rep.presentChoristes.length + rep.manualPresences.filter(m => m.type === 'present').length
      })),
      threshold: adminThreshold,
      totalChoristes: allChoristes.length,
      atRiskCount: analysisResults.filter(r => r.isAtRisk).length,
      goodAttendanceCount: analysisResults.filter(r => !r.isAtRisk).length,
      // ✅ NEW: Add pupitre breakdown
      pupitreBreakdown: ['soprano', 'alto', 'ténor', 'basse'].map(pupitre => {
        const pupitreAnalysis = analysisResults.filter(r => r.choriste.pupitre === pupitre);
        const pupitreRepetitions = repetitions.filter(rep => rep.pupitres.includes(pupitre));
        
        return {
          pupitre,
          choristesCount: pupitreAnalysis.length,
          repetitionsCount: pupitreRepetitions.length,
          atRiskCount: pupitreAnalysis.filter(r => r.isAtRisk).length,
          avgAttendanceRate: pupitreAnalysis.length > 0 
            ? Math.round(pupitreAnalysis.reduce((sum, r) => sum + r.attendanceRate, 0) / pupitreAnalysis.length * 100) / 100
            : 0
        };
      }),
      analysis: analysisResults
    };

    res.json({
      success: true,
      message: 'Analyse des absences générée avec succès.',
      data: responseData
    });

  } catch (error) {
    console.error('Error generating concert absence report:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la génération du rapport d\'absences.',
      error: error.message 
    });
  }
};

/**
 * Send warning notifications to choristes at risk for a specific concert
 */
export const sendWarningNotifications = async (req, res) => {
  try {
    const { concertId } = req.params;
    const { choristeIds } = req.body;

    if (!concertId) {
      return res.status(400).json({ message: 'Concert ID requis.' });
    }

    if (!choristeIds || !Array.isArray(choristeIds) || choristeIds.length === 0) {
      return res.status(400).json({ message: 'Liste des choristes requis.' });
    }

    // Get concert details
    const concert = await Concert.findById(concertId).populate('programme');
    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    // ✅ UPDATED: Get repetitions with pupitre information
    const repetitions = await Repetition.find({ concert: concertId })
      .populate('presentChoristes', 'firstName lastName email pupitre')
      .populate('absentChoristes.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.choriste', 'firstName lastName email pupitre')
      .sort({ date: 1 });

    // Get admin threshold
    const config = await Config.findOne();
    const adminThreshold = config?.participationThreshold ?? 70;

    // ✅ INSTANT RESPONSE
    res.json({
      success: true,
      message: `Envoi des avertissements en cours pour ${choristeIds.length} choriste(s)...`,
      totalChoristes: choristeIds.length,
      concertTitle: concert.title,
      timestamp: new Date().toISOString()
    });

    // ✅ BACKGROUND EMAIL SENDING
    setImmediate(async () => {
      let successCount = 0;
      let failedCount = 0;

      for (const choristeId of choristeIds) {
        try {
          const choriste = await User.findById(choristeId).select('firstName lastName email pupitre');
          if (!choriste) {
            console.error(`❌ Choriste not found: ${choristeId}`);
            failedCount++;
            continue;
          }

          // ✅ UPDATED: Only consider repetitions for this choriste's pupitre
          const relevantRepetitions = repetitions.filter(rep => 
            rep.pupitres.includes(choriste.pupitre)
          );

          const totalRepetitions = relevantRepetitions.length;
          let attendedRepetitions = 0;

          relevantRepetitions.forEach(repetition => {
            let isPresent = false;

            // Check in presentChoristes
            if (repetition.presentChoristes.some(
              present => present._id.toString() === choristeId.toString()
            )) {
              isPresent = true;
            }

            // Check manual presences
            const manualPresence = repetition.manualPresences.find(
              manual => manual.choriste._id.toString() === choristeId.toString()
            );
            if (manualPresence) {
              isPresent = manualPresence.type === 'present';
            }

            if (isPresent) {
              attendedRepetitions++;
            }
          });

          const attendanceRate = totalRepetitions > 0 
            ? (attendedRepetitions / totalRepetitions) * 100 
            : 100; // If no repetitions for this pupitre, consider eligible

          const absencesCount = totalRepetitions - attendedRepetitions;

          // ✅ UPDATED: Prepare relevant repetition details only
          const repetitionDetails = relevantRepetitions.map(rep => {
            let attended = false;

            if (rep.presentChoristes.some(
              present => present._id.toString() === choristeId.toString()
            )) {
              attended = true;
            }

            const manualPresence = rep.manualPresences.find(
              manual => manual.choriste._id.toString() === choristeId.toString()
            );
            if (manualPresence) {
              attended = manualPresence.type === 'present';
            }

            return {
              date: rep.date,
              location: rep.location,
              pupitres: rep.pupitres,
              attended
            };
          });

          // Create warning email
          const emailTemplate = createNominationWarningTemplate({
            firstName: choriste.firstName,
            lastName: choriste.lastName,
            pupitre: choriste.pupitre,
            concertTitle: concert.title,
            attendanceRate,
            threshold: adminThreshold,
            absencesCount,
            totalRepetitions,
            concertDate: concert.dateHeure,
            repetitionDetails,
            // ✅ NEW: Add context about pupitre-specific calculation
            allRepetitionsCount: repetitions.length,
            pupitreSpecificNote: totalRepetitions < repetitions.length 
              ? `Note: Seules les ${totalRepetitions} répétitions concernant votre pupitre (${choriste.pupitre}) sont prises en compte sur un total de ${repetitions.length} répétitions.`
              : null
          });

          // Send notification
          await sendNotification({
            email: choriste.email,
            subject: emailTemplate.subject,
            htmlContent: emailTemplate.htmlContent,
            attachments: emailTemplate.attachments
          });

          successCount++;

        } catch (error) {
          console.error(`❌ Failed to send warning to choriste ${choristeId}:`, error.message);
          failedCount++;
        }
      }
    });

  } catch (error) {
    console.error('Error sending warning notifications:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'envoi des avertissements.',
      error: error.message 
    });
  }
};

/**
 * Eliminate a choriste from a specific concert (not system-wide)
 */
export const eliminateChoriste = async (req, res) => {
  try {
    const { choristeId } = req.params;
    const { reason, notes, concertId } = req.body;

    // Validate input
    if (!reason || !['disciplinary', 'absence_threshold'].includes(reason)) {
      return res.status(400).json({ 
        message: 'Raison invalide. Options: disciplinary, absence_threshold' 
      });
    }

    if (!concertId) {
      return res.status(400).json({ 
        message: 'Concert ID requis pour toute élimination.' 
      });
    }

    // Get the choriste
    const choriste = await User.findById(choristeId);
    if (!choriste || choriste.role !== 'choriste') {
      return res.status(404).json({ message: 'Choriste introuvable.' });
    }

    // Get concert and attendance data for BOTH types
    let concertTitle = null;
    let attendanceRate = null;
    let threshold = null;

    try {
      const concert = await Concert.findById(concertId);
      const config = await Config.findOne();
      threshold = config?.participationThreshold ?? 70;
      
      if (concert) {
        concertTitle = concert.title;
        
        // ✅ UPDATED: Calculate attendance rate considering pupitre-specific repetitions
        const repetitions = await Repetition.find({ concert: concertId })
          .populate('presentChoristes')
          .populate('manualPresences.choriste');
        
        // ✅ CRITICAL: Only count repetitions for this choriste's pupitre
        const relevantRepetitions = repetitions.filter(rep => 
          rep.pupitres.includes(choriste.pupitre)
        );
        
        const totalRepetitions = relevantRepetitions.length;
        let attendedRepetitions = 0;

        relevantRepetitions.forEach(repetition => {
          let isPresent = false;

          if (repetition.presentChoristes.some(
            present => present._id.toString() === choristeId.toString()
          )) {
            isPresent = true;
          }

          const manualPresence = repetition.manualPresences.find(
            manual => manual.choriste._id.toString() === choristeId.toString()
          );
          if (manualPresence) {
            isPresent = manualPresence.type === 'present';
          }

          if (isPresent) {
            attendedRepetitions++;
          }
        });

        attendanceRate = totalRepetitions > 0 
          ? (attendedRepetitions / totalRepetitions) * 100 
          : 100;

        // ✅ REMOVE CHORISTE FROM CONCERT (for BOTH types)
        await Concert.findByIdAndUpdate(concertId, {
          $pull: { 
            availableChoristes: choristeId,
            finalParticipants: choristeId
          }
        });
      }
    } catch (error) {
      console.error('Error getting concert data for elimination:', error);
    }

    // ✅ UPDATED: Create concert-specific elimination record
    const eliminationData = {
      reason,
      notes: notes || '',
      eliminatedBy: req.auth.userId,
      eliminatedAt: new Date(),
      concertId: concertId,
      eliminationType: 'concert_specific'
    };

    if (!choriste.eliminationRecords) {
      choriste.eliminationRecords = [];
    }
    choriste.eliminationRecords.push(eliminationData);

    // Keep choriste active, just excluded from this specific concert
    await choriste.save();

    // ✅ INSTANT RESPONSE
    res.json({
      success: true,
      message: `Choriste ${choriste.firstName} ${choriste.lastName} éliminé du concert "${concertTitle}" pour ${reason === 'absence_threshold' ? 'absence' : 'raisons disciplinaires'}.`,
      data: {
        choriste: {
          _id: choriste._id,
          firstName: choriste.firstName,
          lastName: choriste.lastName,
          email: choriste.email,
          pupitre: choriste.pupitre
        },
        elimination: eliminationData
      }
    });

    // ✅ BACKGROUND EMAIL SENDING
    setImmediate(async () => {
      try {
        const emailTemplate = createEliminationNoticeTemplate({
          firstName: choriste.firstName,
          lastName: choriste.lastName,
          pupitre: choriste.pupitre,
          reason,
          notes: notes || '',
          concertTitle,
          attendanceRate,
          threshold,
          eliminatedAt: eliminationData.eliminatedAt
        });

        await sendNotification({
          email: choriste.email,
          subject: emailTemplate.subject,
          htmlContent: emailTemplate.htmlContent,
          attachments: emailTemplate.attachments
        });

      } catch (emailError) {
        console.error(`❌ Failed to send elimination notice to ${choriste.email}:`, emailError);
      }
    });

  } catch (error) {
    console.error('Error eliminating choriste:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'élimination du choriste.',
      error: error.message 
    });
  }
};

/**
 * Get concert analysis WITH validation status for ManageEliminations
 */
export const getConcertAbsenceReportWithValidation = async (req, res) => {
  try {
    const { concertId } = req.params;

    if (!concertId) {
      return res.status(400).json({ message: 'Concert ID requis.' });
    }

    // Get the concert with populated data INCLUDING absent choristes
    const concert = await Concert.findById(concertId)
      .populate('programme')
      .populate('availableChoristes', '_id pupitre')
      .populate('finalParticipants', '_id pupitre')
      .populate('absentChoristes.choriste', '_id firstName lastName email pupitre');
      
    if (!concert) {
      return res.status(404).json({ message: 'Concert introuvable.' });
    }

    // ✅ UPDATED: Get repetitions with pupitre information
    const repetitions = await Repetition.find({ concert: concertId })
      .populate('presentChoristes', 'firstName lastName email pupitre')
      .populate('absentChoristes.choriste', 'firstName lastName email pupitre')
      .populate('manualPresences.choriste', 'firstName lastName email pupitre')
      .sort({ date: 1 });

    // Get admin-configured threshold
    const config = await Config.findOne();
    const adminThreshold = config?.participationThreshold ?? 70;

    // ✅ UPDATED: Get all active choristes with pupitre
    const allChoristes = await User.find({ 
      role: 'choriste', 
      isLocked: { $ne: true },
      status: { $nin: ['Inactif', 'En congé', 'éliminé'] }
    }).select('firstName lastName email eliminationRecords pupitre');

    // ✅ UPDATED: Calculate attendance considering pupitre-specific repetitions
    const analysisResults = allChoristes.map(choriste => {
      // ✅ CRITICAL: Only count repetitions for this choriste's pupitre
      const relevantRepetitions = repetitions.filter(rep => 
        rep.pupitres.includes(choriste.pupitre)
      );
      
      const totalRepetitions = relevantRepetitions.length;
      let attendedRepetitions = 0;

      // Count attended repetitions for this choriste (only relevant ones)
      relevantRepetitions.forEach(repetition => {
        let isPresent = false;

        // Check in presentChoristes array
        if (repetition.presentChoristes.some(
          present => present._id.toString() === choriste._id.toString()
        )) {
          isPresent = true;
        }

        // Check manual presences for 'present' type
        if (repetition.manualPresences.some(
          mp => mp.choriste._id.toString() === choriste._id.toString() && mp.type === 'present'
        )) {
          isPresent = true;
        }

        // Override with manual absence if exists
        if (repetition.manualPresences.some(
          mp => mp.choriste._id.toString() === choriste._id.toString() && mp.type === 'absent'
        )) {
          isPresent = false;
        }

        if (isPresent) {
          attendedRepetitions++;
        }
      });

      const attendanceRate = totalRepetitions > 0 ? (attendedRepetitions / totalRepetitions) * 100 : 100;
      const threshold = adminThreshold;
      const isAtRisk = attendanceRate < threshold;

      // Check if choriste is absent from this concert
      const absentRecord = concert.absentChoristes.find(
        absent => absent.choriste._id.toString() === choriste._id.toString()
      );

      // Add validation status
      const hasMarkedDisponibilite = concert.availableChoristes.some(
        ac => ac._id.toString() === choriste._id.toString()
      );
      
      const isValidated = concert.finalParticipants.some(
        fp => fp._id.toString() === choriste._id.toString()
      );
      
      const isEliminated = choriste.eliminationRecords?.some(
        record => record.concertId?.toString() === concertId.toString()
      );

      // Enhanced validation status logic including absence
      let validationStatus = 'not_available';
      if (absentRecord) {
        validationStatus = 'absent';
      } else if (hasMarkedDisponibilite) {
        if (isEliminated) {
          validationStatus = 'eliminated';
        } else if (isValidated) {
          validationStatus = 'validated';
        } else {
          validationStatus = 'pending';
        }
      } else if (isEliminated) {
        validationStatus = 'eliminated';
      }

      return {
        choriste,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        attendedRepetitions,
        totalRepetitions,
        threshold,
        isAtRisk,
        validationStatus,
        hasMarkedDisponibilite,
        // ✅ NEW: Pupitre-specific info
        allRepetitionsCount: repetitions.length,
        relevantRepetitionsCount: totalRepetitions,
        // Absence information
        absentInfo: absentRecord ? {
          reason: absentRecord.reason,
          markedAt: absentRecord.markedAt
        } : null,
        // ✅ UPDATED: Only include relevant repetitions
        repetitionDetails: relevantRepetitions.map(rep => {
          let attended = false;

          if (rep.presentChoristes.some(p => p._id.toString() === choriste._id.toString())) {
            attended = true;
          }

          if (rep.manualPresences.some(
            mp => mp.choriste._id.toString() === choriste._id.toString() && mp.type === 'present'
          )) {
            attended = true;
          }

          if (rep.manualPresences.some(
            mp => mp.choriste._id.toString() === choriste._id.toString() && mp.type === 'absent'
          )) {
            attended = false;
          }

          return {
            date: rep.date,
            location: rep.location,
            pupitres: rep.pupitres,
            attended
          };
        })
      };
    });

    res.status(200).json({
      message: 'Analyse des absences récupérée avec succès.',
      data: {
        concert: {
          _id: concert._id,
          title: concert.title,
          dateHeure: concert.dateHeure,
          location: concert.location
        },
        analysis: analysisResults,
        totalChoristes: allChoristes.length,
        threshold: adminThreshold,
        totalRepetitions: repetitions.length,
        // Enhanced statistics
        availableCount: concert.availableChoristes.length,
        validatedCount: concert.finalParticipants.length,
        absentCount: concert.absentChoristes.length,
        pendingValidationCount: concert.availableChoristes.length - concert.finalParticipants.length,
        // ✅ NEW: Add pupitre breakdown for this concert
        pupitreBreakdown: ['soprano', 'alto', 'ténor', 'basse'].map(pupitre => {
          const pupitreAnalysis = analysisResults.filter(r => r.choriste.pupitre === pupitre);
          const pupitreRepetitions = repetitions.filter(rep => rep.pupitres.includes(pupitre));
          
          return {
            pupitre,
            choristesCount: pupitreAnalysis.length,
            repetitionsCount: pupitreRepetitions.length,
            atRiskCount: pupitreAnalysis.filter(r => r.isAtRisk).length,
            avgAttendanceRate: pupitreAnalysis.length > 0 
              ? Math.round(pupitreAnalysis.reduce((sum, r) => sum + r.attendanceRate, 0) / pupitreAnalysis.length * 100) / 100
              : 0
          };
        })
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'analyse:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

/**
 * ✅ UPDATED: Send comprehensive warning notifications with pupitre-specific repetition data
 */
export const sendComprehensiveWarningNotifications = async (req, res) => {
  try {
    const { choristeIds, filterData } = req.body;

    if (!choristeIds || !Array.isArray(choristeIds) || choristeIds.length === 0) {
      return res.status(400).json({ message: 'Liste des choristes requis.' });
    }

    // Get config for threshold
    const config = await Config.findOne();
    const threshold = config?.participationThreshold ?? 70;

    // ✅ INSTANT RESPONSE
    res.json({
      success: true,
      message: `Envoi des avertissements complets en cours pour ${choristeIds.length} choriste(s)...`,
      totalChoristes: choristeIds.length,
      timestamp: new Date().toISOString()
    });

    // ✅ BACKGROUND EMAIL SENDING
    setImmediate(async () => {
      let successCount = 0;
      let failedCount = 0;

      // Get repetitions and concerts data for email
      const repetitions = await Repetition.find({})
        .populate('concert', 'title dateHeure')
        .populate('presentChoristes', 'firstName lastName email pupitre')
        .populate('absentChoristes.choriste', 'firstName lastName email pupitre')
        .populate('manualPresences.choriste', 'firstName lastName email pupitre')
        .sort({ date: -1 });

      const concerts = await Concert.find({})
        .populate('availableChoristes', '_id')
        .populate('finalParticipants', '_id')
        .populate('absentChoristes.choriste', '_id firstName lastName email pupitre')
        .sort({ dateHeure: -1 });

      for (const choristeId of choristeIds) {
        try {
          const choriste = await User.findById(choristeId).select('firstName lastName email pupitre eliminationRecords');
          if (!choriste) {
            failedCount++;
            continue;
          }

          // ===== ✅ UPDATED: CALCULATE REPETITION DATA (PUPITRE-SPECIFIC) =====
          // ✅ CRITICAL: Only count repetitions for this choriste's pupitre
          const relevantRepetitions = repetitions.filter(rep => 
            rep.pupitres.includes(choriste.pupitre)
          );

          const totalRepetitions = relevantRepetitions.length;
          let attendedRepetitions = 0;
          let repetitionDetails = [];

          relevantRepetitions.forEach(repetition => {
            let isPresent = false;
            let absenceReason = null;

            // Check in presentChoristes
            if (repetition.presentChoristes.some(
              present => present._id.toString() === choristeId.toString()
            )) {
              isPresent = true;
            }

            // Check automatic absences
            const autoAbsent = repetition.absentChoristes.find(
              absent => absent.choriste._id.toString() === choristeId.toString()
            );
            if (autoAbsent) {
              isPresent = false;
              absenceReason = autoAbsent.reason;
            }

            // Check manual presences (overrides automatic)
            const manualPresence = repetition.manualPresences.find(
              manual => manual.choriste._id.toString() === choristeId.toString()
            );
            if (manualPresence) {
              isPresent = manualPresence.type === 'present';
              if (!isPresent) {
                absenceReason = manualPresence.reason;
              }
            }

            if (isPresent) {
              attendedRepetitions++;
            }

            // Add to details for email
            repetitionDetails.push({
              date: repetition.date,
              location: repetition.location,
              concertTitle: repetition.concert?.title || 'Concert non défini',
              pupitres: repetition.pupitres,
              attended: isPresent,
              reason: absenceReason
            });
          });

          const repetitionAttendanceRate = totalRepetitions > 0 
            ? (attendedRepetitions / totalRepetitions) * 100 
            : 100;

          // ===== CALCULATE CONCERT DATA =====
          const totalConcerts = concerts.length;
          let availableConcerts = 0;
          let concertDetails = [];

          concerts.forEach(concert => {
            const hasMarkedAvailability = concert.availableChoristes.some(
              ac => ac._id.toString() === choristeId.toString()
            );

            const absentRecord = concert.absentChoristes.find(
              absent => absent.choriste._id.toString() === choristeId.toString()
            );

            const isEliminated = choriste.eliminationRecords?.some(
              record => record.concertId?.toString() === concert._id.toString()
            );

            const isAvailable = hasMarkedAvailability && !isEliminated;
            if (isAvailable) {
              availableConcerts++;
            }

            let reason = null;
            if (isEliminated) {
              reason = 'Éliminé';
            } else if (absentRecord) {
              reason = getAbsenceReasonMessage(absentRecord.reason);
            } else if (!hasMarkedAvailability) {
              reason = 'N\'a pas marqué sa disponibilité';
            }

            // Add to details for email
            concertDetails.push({
              dateHeure: concert.dateHeure,
              title: concert.title,
              available: isAvailable,
              reason: reason
            });
          });

          const concertAttendanceRate = totalConcerts > 0 
            ? (availableConcerts / totalConcerts) * 100 
            : 0;

          // Create comprehensive warning email
          const emailTemplate = createComprehensiveWarningTemplate({
            firstName: choriste.firstName,
            lastName: choriste.lastName,
            pupitre: choriste.pupitre,
            // Repetition data (now pupitre-specific)
            repetitionAttendanceRate,
            repetitionAbsencesCount: totalRepetitions - attendedRepetitions,
            totalRepetitions,
            repetitionDetails,
            // Concert data
            concertAttendanceRate,
            concertAbsencesCount: totalConcerts - availableConcerts,
            totalConcerts,
            concertDetails,
            // General
            threshold,
            overallMessage: 'Votre participation aux répétitions et/ou concerts nécessite une amélioration immédiate.',
            // ✅ NEW: Add pupitre-specific context
            pupitreSpecificNote: totalRepetitions < repetitions.length 
              ? `Note: Seules les ${totalRepetitions} répétitions concernant votre pupitre (${choriste.pupitre}) sont prises en compte sur un total de ${repetitions.length} répétitions programmées.`
              : null
          });

          // Send notification
          await sendNotification({
            email: choriste.email,
            subject: emailTemplate.subject,
            htmlContent: emailTemplate.htmlContent,
            attachments: emailTemplate.attachments
          });

          successCount++;

        } catch (error) {
          console.error(`Failed to send comprehensive warning to choriste ${choristeId}:`, error.message);
          failedCount++;
        }
      }
    });

  } catch (error) {
    console.error('Error sending comprehensive warning notifications:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'envoi des avertissements complets.',
      error: error.message 
    });
  }
};

// Helper function for absence reason messages
const getAbsenceReasonMessage = (reason) => {
  switch (reason) {
    case 'did_not_mark_disponibilite':
      return 'N\'a pas marqué sa disponibilité';
    case 'removed_by_admin':
      return 'Retiré par admin';
    case 'removed_by_chef':
      return 'Retiré par chef de pupitre';
    case 'manual_absence':
      return 'Absence manuelle';
    default:
      return 'Absent';
  }
};