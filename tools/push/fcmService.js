import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Initialiser Firebase Admin une seule fois
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Codes FCM qui signifient que le token est définitivement invalide
const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
  'NotRegistered',
  'InvalidRegistration',
];

export const sendPushNotification = async ({ tokens, title, body, data = {} }) => {
  if (!tokens || tokens.length === 0) return;

  const validTokens = tokens.filter(Boolean);
  if (validTokens.length === 0) return;

  try {
    // Convertir toutes les valeurs de data en string (requis par FCM)
    const stringData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );

    const message = {
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: { sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default' } },
      },
      tokens: validTokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`[FCM] ✅ ${response.successCount} envoyée(s), ❌ ${response.failureCount} échec(s)`);

    // ── Nettoyer automatiquement les tokens invalides en BDD ──────────
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code ?? resp.error?.message ?? '';
        const isInvalid = INVALID_TOKEN_CODES.some(c => errCode.includes(c));
        console.error(`[FCM] Token invalide [${idx}]: ${errCode}`);
        if (isInvalid) {
          invalidTokens.push(validTokens[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      console.log(`[FCM] 🧹 Suppression de ${invalidTokens.length} token(s) invalide(s) en BDD`);
      // Import dynamique pour éviter la dépendance circulaire
      const { default: User } = await import('../../models/userModel.js');
      await User.updateMany(
        { fcmToken: { $in: invalidTokens } },
        { $unset: { fcmToken: '' } }
      );
    }

    return response;
  } catch (e) {
    console.error('[FCM] Erreur:', e);
  }
};