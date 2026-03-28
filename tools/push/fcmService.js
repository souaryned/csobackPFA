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

    // Nettoyer les tokens invalides
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`[FCM] Token invalide [${idx}]:`, resp.error?.message);
      }
    });

    return response;
  } catch (e) {
    console.error('[FCM] Erreur:', e);
  }
};