import Survey from '../../models/Survey.js';       
import SurveyResponse from '../../models/SurveyResponse.js'; 
import User from '../../models/userModel.js';        
import surveyTemplates from '../../surveyTemplates.js';
import { notifyNewSurvey } from '../../tools/push/fcmService.js';

/** IDs choristes ciblés (champ dédié ou metadata legacy). */
const getCibleChoristeIds = (survey) => {
  if (survey.cibleChoristes?.length > 0) {
    return survey.cibleChoristes.map((id) => id.toString());
  }
  const meta = survey.metadata?.cibleChoristes;
  if (Array.isArray(meta) && meta.length > 0) {
    return meta.map((id) => id.toString());
  }
  return [];
};

const estConcerne = (survey, user) => {
  const choristeIds = getCibleChoristeIds(survey);
  if (choristeIds.length > 0) {
    return choristeIds.includes(user._id.toString());
  }
  if (!survey.ciblePupitres || survey.ciblePupitres.length === 0) return true;
  return survey.ciblePupitres.includes(user.pupitre);
};

const getFcmTokensForSurvey = async (survey) => {
  const baseQuery = {
    role: 'choriste',
    isLocked: { $ne: true },
    fcmToken: { $exists: true, $nin: [null, ''] },
  };

  const choristeIds = getCibleChoristeIds(survey);
  if (choristeIds.length > 0) {
    const users = await User.find({
      ...baseQuery,
      _id: { $in: choristeIds },
    }).select('fcmToken');
    return users.map((u) => u.fcmToken).filter(Boolean);
  }

  if (survey.ciblePupitres?.length > 0) {
    const users = await User.find({
      ...baseQuery,
      pupitre: { $in: survey.ciblePupitres },
    }).select('fcmToken');
    return users.map((u) => u.fcmToken).filter(Boolean);
  }

  const users = await User.find(baseQuery).select('fcmToken');
  return users.map((u) => u.fcmToken).filter(Boolean);
};

const sendSurveyActivatedPush = (survey) => {
  setImmediate(async () => {
    try {
      const tokens = await getFcmTokensForSurvey(survey);
      if (tokens.length === 0) {
        console.log('[FCM] Aucun token pour le sondage', survey._id);
        return;
      }
      await notifyNewSurvey(tokens, survey);
      console.log(`[FCM] Sondage "${survey.titre}" → ${tokens.length} notif(s)`);
    } catch (err) {
      console.error('[FCM] Erreur notif sondage:', err.message);
    }
  });
};

export const getTemplates = (_req, res) => {
  try {
    res.json(surveyTemplates);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des templates.', error: err.message });
  }
};

export const createSurvey = async (req, res) => {
  try {
    const {
      titre,
      description,
      type,
      dateDebut,
      dateFin,
      questions,
      ciblePupitres,
      cibleChoristes,
      metadata,
      statut,
    } = req.body;

    const template = surveyTemplates[type];

    let finalQuestions = questions;
    if (!questions || questions.length === 0) {
      finalQuestions = template ? JSON.parse(JSON.stringify(template.questions)) : [];
    }

    const finalTitre = titre || (template ? template.titre : 'Nouveau Sondage');
    const finalDescription = description || (template ? template.description : '');

    const survey = await Survey.create({
      titre: finalTitre,
      description: finalDescription,
      type,
      statut: statut || 'brouillon',
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      questions: finalQuestions,
      ciblePupitres: ciblePupitres || [],
      cibleChoristes: cibleChoristes || [],
      createdBy: req.auth.userId,
      metadata,
    });

    if (survey.statut === 'actif') {
      sendSurveyActivatedPush(survey);
    }

    res.status(201).json({ message: 'Sondage créé avec succès.', survey });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création du sondage.', error: err.message });
  }
};

export const updateStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    const allowed = ['brouillon', 'actif', 'clos'];

    if (!allowed.includes(statut)) {
      return res.status(400).json({ message: `Statut invalide. Valeurs acceptées : ${allowed.join(', ')}.` });
    }

    const previous = await Survey.findById(req.params.id);
    if (!previous) return res.status(404).json({ message: 'Sondage introuvable.' });

    const survey = await Survey.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true, runValidators: true }
    );

    if (statut === 'actif' && previous.statut !== 'actif') {
      sendSurveyActivatedPush(survey);
    }

    res.json({ message: `Statut mis à jour : ${statut}.`, survey });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut.', error: err.message });
  }
};

export const getSurveys = async (req, res) => {
  try {
    const { role, userId } = req.auth;

    let surveys;

    if (role === 'admin' || role === 'manager' || role === 'chef de choeur') {
      surveys = await Survey.find()
        .populate('createdBy', 'firstName lastName role')
        .sort({ createdAt: -1 });
    } else {
      const user = await User.findById(userId).select('_id pupitre');
      if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

      const allActifs = await Survey.find({ statut: 'actif' })
        .populate('createdBy', 'firstName lastName role')
        .sort({ createdAt: -1 });

      surveys = allActifs.filter(s => estConcerne(s, user));
    }

    res.json(surveys);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des sondages.', error: err.message });
  }
};

export const getSurveyById = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id)
      .populate('createdBy', 'firstName lastName role');

    if (!survey) return res.status(404).json({ message: 'Sondage introuvable.' });

    if (req.auth.role === 'choriste') {
      if (survey.statut !== 'actif') {
        return res.status(403).json({ message: 'Ce sondage n\'est pas disponible.' });
      }
      const user = await User.findById(req.auth.userId).select('_id pupitre');
      if (!estConcerne(survey, user)) {
        return res.status(403).json({ message: 'Ce sondage ne vous concerne pas.' });
      }
    }

    res.json(survey);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération du sondage.', error: err.message });
  }
};

export const soumettreReponses = async (req, res) => {
  try {
    const surveyId = req.params.id;
    const choristeId = req.auth.userId;

    const survey = await Survey.findById(surveyId);
    if (!survey) return res.status(404).json({ message: 'Sondage introuvable.' });
    if (survey.statut !== 'actif') return res.status(400).json({ message: 'Ce sondage n\'est plus actif.' });

    const user = await User.findById(choristeId).select('_id pupitre');
    if (!estConcerne(survey, user)) {
      return res.status(403).json({ message: 'Ce sondage ne vous concerne pas.' });
    }

    const dejaRepondu = await SurveyResponse.findOne({ survey: surveyId, choriste: choristeId });
    if (dejaRepondu) {
      return res.status(409).json({ message: 'Vous avez déjà répondu à ce sondage.' });
    }

    const { reponses } = req.body; // [{ questionId, valeur }]
    if (!Array.isArray(reponses)) {
      return res.status(400).json({ message: 'Le champ "reponses" doit être un tableau.' });
    }

    const reponsesMap = new Map(reponses.map(r => [r.questionId, r.valeur]));
    for (const q of survey.questions) {
      if (q.obligatoire && !reponsesMap.has(q.id)) {
        return res.status(400).json({
          message: `La question obligatoire "${q.texte}" n'a pas été répondue.`,
        });
      }
    }

    const response = await SurveyResponse.create({
      survey: surveyId,
      choriste: choristeId,
      reponses,
      soumisLe: new Date(),
    });

    res.status(201).json({ message: 'Réponses soumises avec succès.', response });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Vous avez déjà répondu à ce sondage.' });
    }
    res.status(500).json({ message: 'Erreur lors de la soumission des réponses.', error: err.message });
  }
};

export const getResultats = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Sondage introuvable.' });

    const responses = await SurveyResponse.find({ survey: req.params.id })
      .populate('choriste', 'firstName lastName pupitre');
    const nbRepondants = responses.length;

    let queryBase = { role: 'choriste' };
    let nbChoristes;

    const choristeIds = getCibleChoristeIds(survey);
    if (choristeIds.length > 0) {
      nbChoristes = await User.countDocuments({
        ...queryBase,
        _id: { $in: choristeIds },
      });
    } else if (survey.ciblePupitres && survey.ciblePupitres.length > 0) {
      nbChoristes = await User.countDocuments({
        ...queryBase,
        pupitre: { $in: survey.ciblePupitres },
      });
    } else {
      nbChoristes = await User.countDocuments(queryBase);
    }

    const resultats = survey.questions.map(q => {
      const rawValues = responses
        .map(r => r.reponses.find(rep => rep.questionId === q.id)?.valeur)
        .filter(v => v !== null && v !== undefined && v !== '');

      const nbReponses = rawValues.length;

      const flattenedValues = rawValues.flat();

      const counts = flattenedValues.reduce((acc, v) => {
        const key = String(v);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      let reponsesDetaillees;

      if (['radio', 'checkbox', 'select'].includes(q.type)) {
        reponsesDetaillees = q.options.map(opt => {
          const count = counts[opt.valeur] || 0;
          return {
            valeur: opt.valeur,
            label: opt.label,
            count: count,
            pourcentage: nbRepondants > 0 ? Math.round((count / nbRepondants) * 100) : 0,
          };
        });
      } else {
        // Pour texte et date : on liste les réponses agrégées par valeur unique
        reponsesDetaillees = Object.entries(counts).map(([valeur, count]) => ({
          valeur,
          label: valeur,
          count,
          pourcentage: nbRepondants > 0 ? Math.round((count / nbRepondants) * 100) : 0,
        }));
      }

      return {
        questionId: q.id,
        question: q.texte,
        type: q.type,
        reponses: reponsesDetaillees,
        nbReponses: nbReponses,
      };
    });

    const tauxParticipation = nbChoristes > 0
      ? Math.round((nbRepondants / nbChoristes) * 100)
      : 0;

    res.json({
      survey: {
        _id: survey._id,
        titre: survey.titre,
        type: survey.type,
        statut: survey.statut,
      },
      nbRepondants,
      nbChoristes,
      tauxParticipation,
      resultats,
      reponsesDetaillees: responses.map(r => ({
        _id: r._id,
        choriste: r.choriste ? {
          _id: r.choriste._id,
          firstName: r.choriste.firstName,
          lastName: r.choriste.lastName,
          pupitre: r.choriste.pupitre,
        } : null,
        reponses: r.reponses,
        soumisLe: r.soumisLe,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des résultats.', error: err.message });
  }
};

// ─── DELETE /api/surveys/:id ─────────────────────────────────────────────────
export const deleteSurvey = async (req, res) => {
  try {
    const survey = await Survey.findByIdAndDelete(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Sondage introuvable.' });

    // Supprimer également toutes les réponses associées
    await SurveyResponse.deleteMany({ survey: req.params.id });

    res.json({ message: 'Sondage et réponses supprimés avec succès.' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression du sondage.', error: err.message });
  }
};

// ─── PATCH /api/surveys/:id ──────────────────────────────────────────────────
// Mise à jour partielle (titre, description, questions…) — autorisé en brouillon uniquement
export const updateSurvey = async (req, res) => {
  try {
    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Sondage introuvable.' });

    if (survey.statut !== 'brouillon') {
      return res.status(400).json({
        message: 'Un sondage ne peut être modifié qu\'en statut "brouillon".',
      });
    }

    const fieldsToUpdate = [
      'titre',
      'description',
      'type',
      'dateDebut',
      'dateFin',
      'questions',
      'ciblePupitres',
      'cibleChoristes',
      'metadata',
    ];
    fieldsToUpdate.forEach(f => {
      if (req.body[f] !== undefined) survey[f] = req.body[f];
    });

    await survey.save();
    res.json({ message: 'Sondage mis à jour.', survey });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du sondage.', error: err.message });
  }
};

// ─── GET /api/surveys/:id/ma-reponse ─────────────────────────────────────────
// Permet à un choriste de vérifier s'il a déjà répondu (et consulter sa réponse)
/** POST /surveys/:id/notify — renvoyer les push (admin / manager / chef de chœur). */
export const notifySurveyTargets = async (req, res) => {
  try {
    const role = req.auth.role;
    if (!['admin', 'manager', 'chef de choeur'].includes(role)) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }

    const survey = await Survey.findById(req.params.id);
    if (!survey) return res.status(404).json({ message: 'Sondage introuvable.' });
    if (survey.statut !== 'actif') {
      return res.status(400).json({ message: 'Le sondage doit être actif pour envoyer des notifications.' });
    }

    const tokens = await getFcmTokensForSurvey(survey);
    if (tokens.length === 0) {
      return res.status(200).json({
        message: 'Aucun choriste ciblé n\'a de token FCM enregistré (app non ouverte récemment).',
        sentTo: 0,
      });
    }

    const result = await notifyNewSurvey(tokens, survey);
    res.json({
      message: `Notifications envoyées à ${tokens.length} appareil(s).`,
      sentTo: tokens.length,
      successCount: result?.successCount ?? 0,
      failureCount: result?.failureCount ?? 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur envoi notifications.', error: err.message });
  }
};

export const getMaReponse = async (req, res) => {
  try {
    const reponse = await SurveyResponse.findOne({
      survey: req.params.id,
      choriste: req.auth.userId,
    });

    if (!reponse) return res.status(404).json({ message: 'Vous n\'avez pas encore répondu à ce sondage.' });

    res.json(reponse);
  } catch (err) {
    res.status(500).json({ message: 'Erreur.', error: err.message });
  }
};
