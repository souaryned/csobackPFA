import Leave from '../../models/recordModel.js';  // adjust the path
import User from '../../models/userModel.js';
import Concert from '../../models/concertModel.js';  
import { sendNotification } from "../../tools/mail/mailNotif.js";
import { createLeaveAcceptedEmailTemplate, createLeaveDeclaredEmailTemplate } from "../../tools/mail/notifTemplate.js";


export const getAllLeaves = async (req, res) => {
  try {
    const today = new Date();
    // Set time to 00:00:00 to only compare dates (optional)
    today.setHours(0, 0, 0, 0);

    const leaves = await Leave.find({ endDate: { $gte: today } })  // <-- filter here
      .populate({
        path: 'user',
        select: 'firstName lastName email status role',
      })
      .sort({ createdAt: -1 });

    res.status(200).json(leaves);
  } catch (error) {
    console.error('Erreur lors de la récupération des congés:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};




export const declareLeave = async (req, res) => {
  const userId = req.params.id;
  const { startDate, endDate, reason } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Veuillez fournir une date de début et de fin pour le congé.' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end) || start >= end) {
    return res.status(400).json({ message: 'Dates invalides ou la date de fin doit être après la date de début.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    if (user.role !== 'choriste') {
      return res.status(400).json({ message: 'Cette opération est réservée aux choristes.' });
    }

    // Check if user is already in leave
    if (user.status === 'En congé') {
      return res.status(400).json({ message: 'Vous êtes déjà en congé et ne pouvez pas en déclarer un nouveau.' });
    }

    

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      user: userId,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ],
      status: { $in: ['pending', 'approved'] }
    });

    if (overlappingLeave) {
      return res.status(400).json({ message: 'Un congé existe déjà qui chevauche cette période.' });
    }

    const rangeStart = new Date(start);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(end);
    rangeEnd.setHours(23, 59, 59, 999);

    const concertDuringLeave = await Concert.findOne({
      dateHeure: { $gte: rangeStart, $lte: rangeEnd },
    }).select('title dateHeure');

    if (concertDuringLeave) {
      const concertDate = new Date(concertDuringLeave.dateHeure).toLocaleDateString(
        'fr-FR',
        { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      );
      return res.status(400).json({
        message: `Impossible de déclarer un congé : le concert « ${concertDuringLeave.title} » est prévu le ${concertDate}.`,
      });
    }

    // Create leave
    const leave = new Leave({
      user: userId,
      startDate: start,
      endDate: end,
      reason,
      status: 'pending'
    });

    await leave.save();

    // ✅ Notify all managers
    const managers = await User.find({ role: 'manager' });
    const emailData = createLeaveDeclaredEmailTemplate(user, leave);

    for (const manager of managers) {
      await sendNotification({
        email: manager.email,
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        attachments: emailData.attachments || [],
      });
    }

    res.status(201).json({ message: 'Congé déclaré avec succès.', leave });
  } catch (error) {
    console.error('Erreur déclaration congé:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};



export const acceptLeave = async (req, res) => {
  const leaveId = req.params.leaveId;

  try {
    // 1. Récupérer la demande de congé
    const leave = await Leave.findById(leaveId).populate('user');
    if (!leave) {
      return res.status(404).json({ message: 'Demande de congé introuvable.' });
    }
    if (leave.status === 'approved') {
      return res.status(400).json({ message: 'Cette demande de congé est déjà approuvée.' });
    }
    if (leave.status === 'rejected') {
      return res.status(400).json({ message: 'Cette demande de congé a été refusée.' });
    }

    // 2. Passer la demande en `approved`
    leave.status = 'approved';
    await leave.save();

    // 3. Mettre à jour l’utilisateur :
    const user = await User.findById(leave.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur associé introuvable.' });
    }

    // -> avant de passer en "En congé", enregistrer l’ancien status
    user.previousStatus = user.status;  
    user.status = 'En congé';
    await user.save();

    // 4. Envoyer l’email de confirmation
    const emailData = createLeaveAcceptedEmailTemplate(leave);
    await sendNotification({
      email: leave.user.email,
      subject: emailData.subject,
      htmlContent: emailData.htmlContent,
      attachments: emailData.attachments,
    });

    return res
      .status(200)
      .json({ message: 'Congé accepté avec succès et email envoyé.', leave });
  } catch (error) {
    console.error('Erreur lors de l’acceptation du congé:', error);
    return res.status(500).json({ message: 'Erreur serveur.' });
  }
};

