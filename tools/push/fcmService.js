// ============================================================
// fcmService.js  (anciennement notificationsService.js)
// ⚠️  Renommer ce fichier en fcmService.js pour correspondre
//     aux imports du cron : import { sendPushNotification } from "../push/fcmService.js"
// ============================================================

import admin from "firebase-admin";
import { createRequire } from "module";
import User from "../../models/userModel.js";

const require = createRequire(import.meta.url);

// ── Initialisation Firebase Admin (une seule fois) ──────────
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
};

/**
 * Envoie une notification push FCM.
 *
 * @param {Object}   params
 * @param {string[]} params.tokens  - Tokens FCM
 * @param {string}   params.title   - Titre
 * @param {string}   params.body    - Corps
 * @param {Object}   [params.data]  - Données libres — DOIT contenir { type }
 *
 * ⚠️  Le champ "type" dans data est OBLIGATOIRE pour que Flutter
 *     navigue vers le bon écran. Sans lui, le tap ne fait rien.
 */
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
      "[FCM] ⚠️  data.type manquant — la navigation Flutter ne fonctionnera pas !",
    );
  }

  // ── Convertir data en strings (obligatoire FCM) ─────────
  const stringData = {
    click_action: "FLUTTER_NOTIFICATION_CLICK", // ✅ obligatoire Flutter
    ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
  };

  console.log(
    `[FCM] 📤 Envoi "${title}" → ${validTokens.length} token(s) | type: ${stringData.type ?? "?"}`,
  );

  const CHUNK = 500;
  let totalSuccess = 0;
  let totalFailure = 0;
  const invalidTokens = [];

  try {
    for (let i = 0; i < validTokens.length; i += CHUNK) {
      const chunk = validTokens.slice(i, i + CHUNK);

      const response = await admin.messaging().sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: stringData,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channel_id: "cso_high_importance", // ✅ canal Flutter
          },
        },
        apns: {
          payload: { aps: { sound: "default" } },
        },
      });

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code ?? "";
          console.error(`[FCM] ❌ Token[${idx}]: ${resp.error?.message}`);

          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(chunk[idx]);
          }
        }
      });
    }

    // ── Nettoyer les tokens invalides en DB ───────────────
    if (invalidTokens.length > 0) {
      await User.updateMany(
        { fcmToken: { $in: invalidTokens } },
        { $set: { fcmToken: null } },
      );
      console.log(
        `[FCM] 🗑️  ${invalidTokens.length} token(s) invalide(s) supprimé(s).`,
      );
    }

    console.log(
      `[FCM] ✅ ${totalSuccess} envoyée(s) | ❌ ${totalFailure} échec(s)`,
    );
    return { successCount: totalSuccess, failureCount: totalFailure };
  } catch (err) {
    console.error("[FCM] 🔥 Erreur critique:", err);
    throw err;
  }
};

// ── Helpers prêts à l'emploi ────────────────────────────────

/** Nouvelle répétition créée */
export const notifyNewRepetition = (tokens, rep) =>
  sendPushNotification({
    tokens,
    title: "🎵 Nouvelle répétition ajoutée",
    body: `Le ${_formatDate(rep.date)} à ${rep.startTime} — ${rep.location}`,
    data: { type: NOTIF_TYPES.NEW_REPETITION, repetitionId: String(rep._id) },
  });

/** Répétition modifiée */
export const notifyRepetitionUpdated = (tokens, rep) =>
  sendPushNotification({
    tokens,
    title: "✏️ Répétition modifiée",
    body: `Nouvelle date : ${_formatDate(rep.date)} à ${rep.startTime} — ${rep.location}`,
    data: {
      type: NOTIF_TYPES.REPETITION_UPDATED,
      repetitionId: String(rep._id),
    },
  });

/** Répétition annulée */
export const notifyRepetitionCancelled = (tokens, rep) =>
  sendPushNotification({
    tokens,
    title: "❌ Répétition annulée",
    body: `La répétition du ${_formatDate(rep.date)} à ${rep.startTime} est annulée.`,
    data: {
      type: NOTIF_TYPES.REPETITION_CANCELLED,
      repetitionId: String(rep._id),
    },
  });

/** Nouveau concert */
export const notifyNewConcert = (tokens, concert) =>
  sendPushNotification({
    tokens,
    title: "🎤 Nouveau concert",
    body: `${concert.title} — Le ${_formatDate(concert.dateHeure)}`,
    data: { type: NOTIF_TYPES.NEW_CONCERT, concertId: String(concert._id) },
  });

/** Concert modifié */
export const notifyUpdatedConcert = (tokens, concert) =>
  sendPushNotification({
    tokens,
    title: "✏️ Concert modifié",
    body: `${concert.title} a été mis à jour.`,
    data: { type: NOTIF_TYPES.CONCERT_UPDATED, concertId: String(concert._id) },
  });

// ── Utilitaire interne ───────────────────────────────────────
const _formatDate = (date) =>
  new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
