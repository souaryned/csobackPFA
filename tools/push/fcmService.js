import admin from "firebase-admin";
import { createRequire } from "module";
import User from "../../models/userModel.js";

const require = createRequire(import.meta.url);

// ── Initialisation Firebase Admin ────────────────────────────
if (!admin.apps.length) {
  const serviceAccount = require("../serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("[FCM] ✅ Firebase Admin initialisé.");
}

// ── Types de notifications ───────────────────────────────────
export const NOTIF_TYPES = {
  NEW_REPETITION: "new_repetition",
  REPETITION_UPDATED: "repetition_updated",
  REPETITION_CANCELLED: "repetition_cancelled",
  REMINDER_DAY_BEFORE: "reminder_day_before",
  REMINDER_2H: "reminder_2h",
  REMINDER_10MIN: "reminder_10min",
  NEW_CONCERT: "new_concert",
  CONCERT_UPDATED: "concert_updated",
  CONCERT_CANCELLED: "concert_cancelled",
  NEW_SURVEY: "new_survey",
};

// ── Codes tokens invalides ───────────────────────────────────
const INVALID_TOKEN_CODES = [
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/mismatched-credential",
  "NotRegistered",
  "InvalidRegistration",
];

// ── Fonction principale ──────────────────────────────────────
export const sendPushNotification = async ({
  tokens,
  title,
  body,
  data = {},
}) => {
  if (!tokens || tokens.length === 0) return;

  const validTokens = tokens.filter(Boolean);

  if (validTokens.length === 0) return;

  if (!data.type) {
    console.warn(
      "[FCM] ⚠️ data.type manquant — navigation Flutter peut échouer !",
    );
  }

  // Convertir data en strings (obligatoire FCM)
  const stringData = {
    click_action: "FLUTTER_NOTIFICATION_CLICK",
    ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  };

  console.log(`[FCM] 📤 Envoi "${title}" → ${validTokens.length} token(s)`);

  const CHUNK = 500;

  let totalSuccess = 0;
  let totalFailure = 0;

  const invalidTokens = [];

  try {
    for (let i = 0; i < validTokens.length; i += CHUNK) {
      const chunk = validTokens.slice(i, i + CHUNK);

      const message = {
        notification: {
          title,
          body,
        },

        data: stringData,

        android: {
          priority: "high",
          notification: {
            sound: "default",
            channel_id: "cso_high_importance",
          },
        },

        apns: {
          payload: {
            aps: {
              sound: "default",
            },
          },
        },

        tokens: chunk,
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code ?? resp.error?.message ?? "";

          console.error(`[FCM] ❌ Échec [${idx}] : ${errCode}`);
          if (errCode.includes("invalid-credential")) {
            console.error(
              "[FCM] 🔑 Clé service Firebase invalide — régénérez serviceAccountKey.json dans la console Firebase (projet cso-mobile-23643).",
            );
          }

          const isInvalid = INVALID_TOKEN_CODES.some((c) =>
            errCode.includes(c),
          );

          if (isInvalid) {
            invalidTokens.push(chunk[idx]);
          }
        }
      });
    }

    // ── Nettoyage DB ─────────────────────────────────────────
    if (invalidTokens.length > 0) {
      await User.updateMany(
        { fcmToken: { $in: invalidTokens } },
        { $set: { fcmToken: null } },
      );

      console.log(`[FCM] 🗑️ ${invalidTokens.length} token(s) supprimé(s)`);
    }

    console.log(
      `[FCM] ✅ ${totalSuccess} envoyée(s) | ❌ ${totalFailure} échec(s)`,
    );

    return {
      successCount: totalSuccess,
      failureCount: totalFailure,
    };
  } catch (err) {
    console.error("[FCM] 🔥 Erreur critique :", err);
    throw err;
  }
};

// ── Helpers ──────────────────────────────────────────────────

export const notifyNewRepetition = (tokens, rep) =>
  sendPushNotification({
    tokens,
    title: "🎵 Nouvelle répétition ajoutée",
    body: `Le ${_formatDate(rep.date)} à ${rep.startTime} — ${rep.location}`,
    data: {
      type: NOTIF_TYPES.NEW_REPETITION,
      repetitionId: String(rep._id),
    },
  });

export const notifyRepetitionUpdated = (tokens, rep) =>
  sendPushNotification({
    tokens,
    title: "✏️ Répétition modifiée",
    body: `Nouvelle date : ${_formatDate(rep.date)} à ${rep.startTime}`,
    data: {
      type: NOTIF_TYPES.REPETITION_UPDATED,
      repetitionId: String(rep._id),
    },
  });

export const notifyRepetitionCancelled = (tokens, rep) =>
  sendPushNotification({
    tokens,
    title: "❌ Répétition annulée",
    body: `La répétition du ${_formatDate(rep.date)} est annulée.`,
    data: {
      type: NOTIF_TYPES.REPETITION_CANCELLED,
      repetitionId: String(rep._id),
    },
  });

export const notifyNewConcert = (tokens, concert) =>
  sendPushNotification({
    tokens,
    title: "🎤 Nouveau concert",
    body: `${concert.title} — ${_formatDate(concert.dateHeure)}`,
    data: {
      type: NOTIF_TYPES.NEW_CONCERT,
      concertId: String(concert._id),
    },
  });

export const notifyUpdatedConcert = (tokens, concert) =>
  sendPushNotification({
    tokens,
    title: "✏️ Concert modifié",
    body: `${concert.title} a été mis à jour.`,
    data: {
      type: NOTIF_TYPES.CONCERT_UPDATED,
      concertId: String(concert._id),
    },
  });

export const notifyNewSurvey = (tokens, survey) =>
  sendPushNotification({
    tokens,
    title: "📋 Nouveau sondage",
    body: survey.titre
      ? `« ${survey.titre} » — votre réponse est attendue`
      : "Un sondage vous est destiné",
    data: {
      type: NOTIF_TYPES.NEW_SURVEY,
      surveyId: String(survey._id),
      surveyTitle: String(survey.titre || ""),
    },
  });

// ── Utilitaire ───────────────────────────────────────────────
const _formatDate = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
