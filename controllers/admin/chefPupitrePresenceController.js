// controllers/chefPupitre/chefPupitrePresenceController.js
import Repetition from '../../models/repetitionModel.js';
import User from '../../models/userModel.js';
import Message from '../../models/messageModel.js';
import { sendPushNotification } from '../../tools/push/fcmService.js';

// ─────────────────────────────────────────────
// Helper : répétition du jour (même terminée)
// ─────────────────────────────────────────────
const getActiveRepetition = async () => {
  const now = new Date();
  const todayStart = new Date(now.toDateString());
  const todayEnd = new Date(todayStart.getTime() + 24 * 3600 * 1000);

  return Repetition.findOne({
    date: { $gte: todayStart, $lt: todayEnd },
    status: { $ne: 'cancelled' }
  }).sort({ startTime: -1 });
};

// ─────────────────────────────────────────────
// Helper : construit la presenceMap depuis les
// bons champs (presentChoristes / absentChoristes
// / manualPresences) — priorité manualPresences
// ─────────────────────────────────────────────
const buildPresenceMap = (repetition) => {
  const map = {};

  // 1. manualPresences — priorité maximale
  (repetition.manualPresences || []).forEach(m => {
    const uid = (m.choriste?._id ?? m.choriste)?.toString();
    if (uid) map[uid] = { status: m.type === 'present' ? 'present' : 'absent', reason: m.reason };
  });

  // 2. presentChoristes
  (repetition.presentChoristes || []).forEach(c => {
    const uid = (c._id ?? c)?.toString();
    if (uid && !map[uid]) map[uid] = { status: 'present' };
  });

  // 3. absentChoristes
  (repetition.absentChoristes || []).forEach(a => {
    const uid = (a.choriste?._id ?? a.choriste ?? a)?.toString();
    if (uid && !map[uid]) map[uid] = { status: 'absent', reason: a.reason };
  });

  return map;
};

// ─────────────────────────────────────────────
// GET /chef-pupitre/repetition-active/presences
// ─────────────────────────────────────────────
export const getPresencesForChef = async (req, res) => {
  try {
    const chef = req.user;

    if (!chef.isChefDePupitre || !chef.pupitre) {
      return res.status(403).json({ message: 'Accès réservé aux chefs de pupitre' });
    }

    const repetition = await getActiveRepetition();
    if (!repetition) {
      return res.status(404).json({ message: 'Aucune répétition en cours pour le moment.' });
    }

    // Tous les choristes du pupitre sauf le chef lui-même (comparaison string)
    const allChoristes = await User.find({
      role: 'choriste',
      pupitre: chef.pupitre,
      isLocked: false,
    }).select('_id firstName lastName email avatar fcmToken').sort('firstName');

    const choristes = allChoristes.filter(
      c => c._id.toString() !== chef._id.toString()
    );

    const presenceMap = buildPresenceMap(repetition);

    const list = choristes.map(c => ({
      _id: c._id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      avatar: c.avatar,
      fcmToken: c.fcmToken,
      presenceStatus: presenceMap[c._id.toString()]?.status || 'unknown',
      markedAt: presenceMap[c._id.toString()]?.markedAt || null,
      absenceReason: presenceMap[c._id.toString()]?.reason || null,
    }));

    res.status(200).json({
      repetition: {
        _id: repetition._id,
        title: repetition.title,
        date: repetition.date,
        startTime: repetition.startTime,
        endTime: repetition.endTime,
        location: repetition.location,
        status: repetition.status,
      },
      pupitre: chef.pupitre,
      choristes: list,
      summary: {
        total: list.length,
        present: list.filter(c => c.presenceStatus === 'present').length,
        absent:  list.filter(c => c.presenceStatus === 'absent').length,
        unknown: list.filter(c => c.presenceStatus === 'unknown').length,
      }
    });
  } catch (error) {
    console.error('Error getPresencesForChef:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────
// PATCH /chef-pupitre/repetition/:repetitionId/choriste/:userId/presence
// ─────────────────────────────────────────────
export const updateChoristPresence = async (req, res) => {
  try {
    const chef = req.user;
    const { repetitionId, userId } = req.params;
    const { status, reason } = req.body;

    if (!chef.isChefDePupitre) {
      return res.status(403).json({ message: 'Accès réservé aux chefs de pupitre' });
    }

    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide (present | absent)' });
    }

    const choriste = await User.findById(userId).select('pupitre firstName lastName fcmToken');
    if (!choriste || choriste.pupitre !== chef.pupitre) {
      return res.status(403).json({ message: "Ce choriste n'appartient pas à votre pupitre" });
    }

    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) return res.status(404).json({ message: 'Répétition introuvable' });

    // Retirer de tous les tableaux
    repetition.presentChoristes = (repetition.presentChoristes || []).filter(
      c => (c._id ?? c)?.toString() !== userId
    );
    repetition.absentChoristes = (repetition.absentChoristes || []).filter(
      a => (a.choriste?._id ?? a.choriste ?? a)?.toString() !== userId
    );
    repetition.manualPresences = (repetition.manualPresences || []).filter(
      m => (m.choriste?._id ?? m.choriste)?.toString() !== userId
    );

    // Écrire dans manualPresences (visible côté choriste aussi)
    repetition.manualPresences.push({
      choriste: userId,
      type: status,
      reason: status === 'absent' ? (reason || 'Modifié par le chef de pupitre') : undefined,
      markedAt: new Date(),
      markedBy: chef._id,
    });

    await repetition.save();

    // Push notification au choriste — try/catch pour ne pas bloquer la réponse
    if (choriste.fcmToken) {
      try {
        const result = await sendPushNotification({
          tokens: [choriste.fcmToken],
          title: 'Présence mise à jour',
          body: status === 'present'
            ? 'Votre présence a été confirmée par votre chef de pupitre.'
            : 'Votre absence a été enregistrée par votre chef de pupitre.',
          data: { type: 'presence_updated', repetitionId: repetitionId.toString() }
        });
        // Nettoyer token invalide si nécessaire
        const firstResp = result?.responses?.[0];
        if (firstResp && !firstResp.success && (
          firstResp.error?.code === 'messaging/registration-token-not-registered' ||
          (firstResp.error?.message || '').includes('Requested entity was not found')
        )) {
          await User.findByIdAndUpdate(userId, { $unset: { fcmToken: '' } });
          console.log(`[FCM] Token invalide nettoyé pour choriste ${userId}`);
        }
      } catch (fcmErr) {
        console.error('[FCM] Erreur notification presence_updated:', fcmErr.message);
      }
    }

    res.status(200).json({
      message: `Statut de ${choriste.firstName} ${choriste.lastName} mis à jour : ${status}`,
      status
    });
  } catch (error) {
    console.error('Error updateChoristPresence:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────
// POST /chef-pupitre/message
// ─────────────────────────────────────────────
export const sendMessageToChorist = async (req, res) => {
  try {
    const chef = req.user;
    const { recipientIds, content, repetitionId } = req.body;

    if (!chef.isChefDePupitre) {
      return res.status(403).json({ message: 'Accès réservé aux chefs de pupitre' });
    }

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Le message ne peut pas être vide' });
    }

    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ message: 'Au moins un destinataire requis' });
    }

    // Vérifier destinataires dans le même pupitre
    const recipients = await User.find({
      _id: { $in: recipientIds },
      pupitre: chef.pupitre,
      role: 'choriste',
      isLocked: false,
    }).select('_id firstName lastName fcmToken');

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'Aucun destinataire valide trouvé' });
    }

    // Sauvegarder un Message par destinataire
    const savedMessages = await Promise.all(
      recipients.map(recipient =>
        Message.create({
          senderId: chef._id,
          senderRole: 'chef_pupitre',
          recipientId: recipient._id,
          content: content.trim(),
          pupitre: chef.pupitre,
          repetitionId: repetitionId || null,
          readAt: null,
        })
      )
    );

    // ── Push notifications ── dans try/catch séparé pour ne jamais bloquer la réponse HTTP
    const tokensWithUser = recipients
      .filter(r => r.fcmToken)
      .map(r => ({ userId: r._id, token: r.fcmToken }));

    let notificationsSent = 0;
    if (tokensWithUser.length > 0) {
      try {
        const result = await sendPushNotification({
          tokens: tokensWithUser.map(t => t.token),
          title: `Message de votre chef de pupitre`,
          body: content.length > 80 ? content.substring(0, 77) + '...' : content,
          data: {
            type: 'chef_message',
            senderId: chef._id.toString(),
            senderName: `${chef.firstName} ${chef.lastName}`,
            pupitre: chef.pupitre,
            messageId: savedMessages[0]._id.toString(),
            ...(repetitionId && { repetitionId: repetitionId.toString() }),
          }
        });

        notificationsSent = result?.successCount ?? 0;

        // Supprimer les tokens FCM invalides/expirés de la base
        if (result?.responses) {
          const invalidUserIds = result.responses
            .map((r, i) => ({ ...r, userId: tokensWithUser[i]?.userId }))
            .filter(r => !r.success && (
              r.error?.code === 'messaging/registration-token-not-registered' ||
              r.error?.code === 'messaging/invalid-registration-token' ||
              (r.error?.message || '').includes('Requested entity was not found')
            ))
            .map(r => r.userId)
            .filter(Boolean);

          if (invalidUserIds.length > 0) {
            await User.updateMany(
              { _id: { $in: invalidUserIds } },
              { $unset: { fcmToken: '' } }
            );
            console.log(`[FCM] ${invalidUserIds.length} token(s) invalide(s) nettoyé(s)`);
          }
        }
      } catch (fcmErr) {
        // L'erreur FCM ne doit JAMAIS faire planter la réponse HTTP
        console.error('[FCM] Erreur envoi notification chef_message:', fcmErr.message);
      }
    }

    res.status(201).json({
      message: `Message envoyé à ${recipients.length} choriste(s)`,
      sentTo: recipients.map(r => ({ _id: r._id, firstName: r.firstName, lastName: r.lastName })),
      notificationsSent,
    });
  } catch (error) {
    console.error('Error sendMessageToChorist:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────
// POST /chef-pupitre/repetition/:repetitionId/validate-presences
// ─────────────────────────────────────────────
export const validateAndSendPresenceList = async (req, res) => {
  try {
    const chef = req.user;
    const { repetitionId } = req.params;

    if (!chef.isChefDePupitre) {
      return res.status(403).json({ message: 'Accès réservé aux chefs de pupitre' });
    }

    const repetition = await Repetition.findById(repetitionId);
    if (!repetition) return res.status(404).json({ message: 'Répétition introuvable' });

    // Marquer validée pour ce pupitre
    if (!repetition.validatedByChefs) repetition.validatedByChefs = new Map();
    repetition.validatedByChefs.set(chef.pupitre, {
      validatedBy: chef._id,
      validatedAt: new Date(),
      chefName: `${chef.firstName} ${chef.lastName}`,
    });
    await repetition.save();

    // Compter les présences avec les bons champs
    const allChoristes = await User.find({ role: 'choriste', pupitre: chef.pupitre, isLocked: false });
    const presenceMap = buildPresenceMap(repetition);

    const presentCount = allChoristes.filter(
      c => presenceMap[c._id.toString()]?.status === 'present'
    ).length;
    const absentCount = allChoristes.filter(
      c => presenceMap[c._id.toString()]?.status === 'absent'
    ).length;

    // Notifier chefs de chœur / admin / manager
    const chefsDeChoeur = await User.find({
      role: { $in: ['chef_de_choeur', 'admin', 'manager'] },
      isLocked: false,
    }).select('fcmToken');

    const tokens = chefsDeChoeur.map(c => c.fcmToken).filter(Boolean);
    if (tokens.length > 0) {
      try {
        await sendPushNotification({
          tokens,
          title: `✅ Liste ${chef.pupitre} validée`,
          body: `${chef.firstName} ${chef.lastName} — ${chef.pupitre} : ${presentCount} présent(s), ${absentCount} absent(s)`,
          data: {
            type: 'presence_list_validated',
            pupitre: chef.pupitre,
            repetitionId: repetitionId.toString(),
            presentCount: String(presentCount),
            absentCount: String(absentCount),
          }
        });
      } catch (fcmErr) {
        console.error('[FCM] Erreur notification presence_list_validated:', fcmErr.message);
      }
    }

    res.status(200).json({
      message: `Liste des présences ${chef.pupitre} validée et envoyée`,
      presentCount,
      absentCount,
      validatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error validateAndSendPresenceList:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────
// GET /chef-pupitre/messages
// ─────────────────────────────────────────────
export const getChefMessages = async (req, res) => {
  try {
    const chef = req.user;
    if (!chef.isChefDePupitre) {
      return res.status(403).json({ message: 'Accès réservé aux chefs de pupitre' });
    }

    const messages = await Message.find({
      $or: [{ senderId: chef._id }, { recipientId: chef._id }],
      pupitre: chef.pupitre,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('senderId', 'firstName lastName avatar role isChefDePupitre pupitre')
      .populate('recipientId', 'firstName lastName avatar');

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error getChefMessages:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────
// GET /choriste/messages
// ─────────────────────────────────────────────
export const getChoristMessages = async (req, res) => {
  try {
    const user = req.user;

    const messages = await Message.find({ recipientId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('senderId', 'firstName lastName avatar isChefDePupitre pupitre');

    // Marquer comme lus (en arrière-plan)
    Message.updateMany(
      { recipientId: user._id, readAt: null },
      { $set: { readAt: new Date() } }
    ).catch(err => console.error('Error marking messages as read:', err));

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error getChoristMessages:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ─────────────────────────────────────────────
// GET /chef-pupitre/choristes
// Liste simple des choristes du pupitre du chef
// (sans avoir besoin d'une répétition en cours)
// ─────────────────────────────────────────────
export const getChoristesForPupitre = async (req, res) => {
  try {
    const chef = req.user;
    if (!chef.isChefDePupitre || !chef.pupitre) {
      return res.status(403).json({ message: 'Accès réservé aux chefs de pupitre' });
    }

    const allChoristes = await User.find({
      role: 'choriste',
      pupitre: chef.pupitre,
      isLocked: false,
    }).select('_id firstName lastName email avatar').sort('firstName');

    // Exclure le chef lui-même
    const choristes = allChoristes
      .filter(c => c._id.toString() !== chef._id.toString())
      .map(c => ({
        _id: c._id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        avatar: c.avatar,
        presenceStatus: 'unknown', // pas de répétition = statut inconnu
      }));

    res.status(200).json({ choristes, total: choristes.length });
  } catch (error) {
    console.error('Error getChoristesForPupitre:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};