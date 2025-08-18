import { FRONTEND_URL } from '../../config.js';
import crypto from 'crypto';

export const COMMON_ATTACHMENTS = [
  {
    filename: "music.png",
    path: "./tools/assets/images/music.png",
    cid: "logo",
  },
];

export const generateEmailTemplate = (title, headerContent, bodyContent) => `
  <div style="font-family: 'Georgia', serif; max-width: 700px; margin: auto; border-radius: 12px; background: #fdfaf5; border: 1px solid #c4b5aa; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, rgba(193, 154, 107, 1), rgba(75, 46, 46, 1)); padding: 25px; color: #f8f8f8; text-align: center; border-bottom: 4px solid #d2b48c;">
      <h1 style="margin: 0; font-size: 24px; font-family: 'Trebuchet MS', sans-serif; letter-spacing: 1px;">
        ${title}
      </h1>
    </div>

    <!-- Logo & Welcome -->
    <div style="padding: 25px; text-align: center; background-color: #fffaf3;">
      <img src="cid:logo" alt="CSO Logo" style="width: 120px; margin-bottom: 20px;" />
      ${headerContent}
    </div>

    <!-- Body -->
    <div style="padding: 25px 35px; background: #fffdf8; color: #333; font-size: 16px; line-height: 1.7;">
      ${bodyContent}
    </div>

    <!-- Footer -->
    <div style="background: #f8f5f0; padding: 20px; text-align: center; font-style: italic; font-size: 14px; color: #5e5043;">
      🎻 Harmoniously yours, <br />
      <strong>L'équipe administrative du CSO</strong>
    </div>
  </div>
`;

// ✅ NEW: Charter signing invitation email template
export const charterSigningInvitationTemplate = ({ firstName, lastName, email, charterSigningLink }) => {
  const subject = '🎼 Félicitations ! Signez votre charte - Orchestre Symphonique de Carthage';

  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Nous avons le plaisir de vous annoncer que votre candidature a été <strong>acceptée</strong> ! 
      Bienvenue parmi les artistes de l'Orchestre Symphonique de Carthage (CSO) !
    </p>
  `;

  const bodyContent = `
    <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #28a745;">
      <h4 style="color:#155724;margin-top:0;">🎉 Étape finale : Signature de la charte</h4>
      <p style="color:#155724;margin-bottom:0;">
        Pour compléter votre inscription et rejoindre officiellement notre orchestre, 
        veuillez signer notre charte d'engagement.
      </p>
    </div>

    <p>La signature de cette charte représente votre engagement envers l'Orchestre Symphonique de Carthage et ses valeurs.</p>

    <div style="text-align:center;margin:35px 0;">
      <a href="${charterSigningLink}" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:16px 50px;font-size:18px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 8px 25px rgba(75,46,46,0.4);
        display:inline-block;
        transition:all 0.3s ease;
      ">
        📝 Signer la charte maintenant
      </a>
    </div>

    <div style="background:#fff3cd;padding:15px;border-radius:6px;margin:25px 0;border:1px solid #ffeaa7;">
      <p style="margin:0;color:#856404;font-size:14px;">
        <strong>📌 Important :</strong> Une fois la charte signée, vous recevrez immédiatement vos identifiants 
        de connexion et pourrez accéder à votre espace membre.
      </p>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Nous sommes impatients de vous compter officiellement parmi nos membres !
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

// ✅ UPDATED: Account creation template (used after charter signing)
export const createAccountEmailTemplate = ({ firstName, lastName, email, password }) => {
  const subject = 'Orchestre Symphonique de Carthage';

  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Félicitations, vous êtes officiellement choriste ! Votre charte a été signée avec succès. 
    </p>
  `;

  const bodyContent = `
    <div style="background:#d4edda;padding:18px;border-radius:8px;margin:25px 0;border:1px solid #c3e6cb;">
      <h4 style="color:#155724;margin-top:0;">Inscription complétée avec succès !</h4>
      <p style="color:#155724;margin-bottom:0;">
        Bienvenue officiellement dans la famille de l'Orchestre Symphonique de Carthage !
      </p>
    </div>

    <p>Voici vos identifiants de connexion :</p>

    <div style="background:#f4f0ea;padding:18px;border-radius:6px;margin:25px 0;font-family:'Courier New',monospace;color:#3c2f2f;">
      <p><strong>Email : </strong><a href="mailto:${email}" style="color:#7b3e19;">${email}</a></p>
      <p><strong>Mot de passe : </strong>${password}</p>
    </div>

    <p>Connectez-vous dès maintenant pour découvrir votre espace :</p>
    <div style="text-align:center;margin:35px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:14px 40px;font-size:16px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 5px 15px rgba(75,46,46,0.4);
        display:inline-block;
      ">
        🎵 Se connecter
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Nous sommes ravis de vous compter parmi nous et avons hâte de collaborer ensemble !
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

export const reminderRepetitionTemplateGrouped = (user, repetitions) => {
  const { firstName, lastName } = user;

  const subject = "📅 Vos prochaines répétitions - Orchestre CSO";

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Cher(e) <strong>${firstName} ${lastName}</strong>,</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      Voici vos prochaines répétitions prévues avec le CSO :
    </p>
  `;

  // --- Card-based body ---
  const bodyContent = `
    ${repetitions.map(rep => {
      const date = new Date(rep.date).toLocaleDateString("fr-FR", {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      return `
        <div style="
          background: #ffffff;
          border: 1px solid #e0d8c5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        ">
          <h3 style="
            margin: 0 0 8px;
            font-size: 18px;
            color: #4b2e2e;
          ">${date}</h3>
          <p style="margin: 4px 0;">
            <strong>Heure :</strong> ${rep.startTime} → ${rep.endTime}
          </p>
          <p style="margin: 4px 0;">
            <strong>Lieu :</strong> ${rep.location}
          </p>
        </div>
      `;
    }).join("")}
    <p style="font-size: 16px; color: #333;">
      Merci de confirmer votre présence ou d'indiquer votre absence sur votre espace personnel.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

export const createRejectionEmailTemplate = ({ firstName, lastName, reason }) => {
  const subject = "Votre audition au CSO – Retour";

  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Merci d'avoir participé à l'audition pour rejoindre l'Orchestre Symphonique de Carthage.
    </p>
  `;

  const bodyContent = `
    <p>Après délibération, nous sommes au regret de vous informer que vous n'avez pas été retenu(e) pour cette session.</p>

    <div style="
      background:#f9eae3;
      padding:15px 20px;
      margin:20px 0;
      border-left:6px solid #c0392b;
      border-radius:4px;
      color:#6d4c41;
    ">
      <p><strong>Motif :</strong> ${reason}</p>
    </div>

    <p style="font-size:16px;color:#6d5b4c;">
      Nous vous remercions sincèrement pour votre engagement et votre passion.
      Nous espérons vous revoir lors de futures auditions.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

export const createLeaveAcceptedEmailTemplate = (leave) => {
  const { user, startDate, endDate } = leave;
  const fullName = `${user.firstName} ${user.lastName}`;

  const subject = 'Votre demande de congé a été acceptée – Orchestre CSO';

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Cher(e) <strong>${fullName}</strong>,</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      Nous avons le plaisir de vous informer que votre demande de congé a été <strong>acceptée</strong>.
    </p>
  `;

  const bodyContent = `
    <p>Voici les détails de votre congé :</p>
    <ul style="font-size: 16px; color: #3c2f2f;">
      <li><strong>Début :</strong> ${new Date(startDate).toLocaleDateString('fr-FR')}</li>
      <li><strong>Fin :</strong> ${new Date(endDate).toLocaleDateString('fr-FR')}</li>
    </ul>

    <p>Nous vous souhaitons un excellent repos !</p>

    <div style="text-align: center; margin: 35px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193, 154, 107, 1), rgba(75, 46, 46, 1));
        color: white;
        padding: 14px 40px;
        font-size: 16px;
        font-weight: bold;
        text-decoration: none;
        border-radius: 50px;
        box-shadow: 0 5px 15px rgba(75, 46, 46, 0.4);
        display: inline-block;
      ">
        🎵 Accéder à votre espace
      </a>
    </div>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

export const createLeaveDeclaredEmailTemplate = (user, leave) => {
  const subject = `Nouvelle demande de congé - Orchestre CSO`;

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Nouvelle demande de congé reçue</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      <strong>${user.firstName} ${user.lastName}</strong> a soumis une nouvelle demande de congé.
    </p>
  `;

  const bodyContent = `
    <p>Voici les détails de la demande :</p>
    <ul style="font-size: 16px; color: #3c2f2f;">
      <li><strong>Début :</strong> ${new Date(leave.startDate).toLocaleDateString('fr-FR')}</li>
      <li><strong>Fin :</strong> ${new Date(leave.endDate).toLocaleDateString('fr-FR')}</li>
      <li><strong>Raison :</strong> ${leave.reason || '(Non précisée)'}</li>
    </ul>

    <p>Merci de traiter cette demande dans l'interface de gestion.</p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

export const createTestDateEmailTemplate = ({
  firstName,
  lastName,
  candidateId,
  assignedDate,
  assignedTime,
  debutPause,
  finPause
}) => {
  const subject = "Convocation au test d'admission – Orchestre CSO";

  // Format date & time
  const formattedDate = new Date(assignedDate).toLocaleDateString("fr-FR", {
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric"
  });

  // 🎯 Create response URL
  const responseUrl = `${FRONTEND_URL}/convocation/response/${candidateId}`;

  // Header greeting
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;margin-bottom:10px;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;margin-bottom:25px;">
      Félicitations ! Votre candidature a été retenue pour l'étape suivante. 
      Votre test d'admission au CSO est maintenant programmé.
    </p>
  `;

  // 🔧 UPDATED: Main audition details with friendly response invitation
  const bodyContent = `
    <div style="
      background:#f8f6f3;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #d4a574;
    ">
      <h3 style="color:#4b2e2e;margin-top:0;font-size:18px;">Détails de votre convocation</h3>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Date :</strong> ${formattedDate}</p>
        <p style="margin:8px 0;"><strong>Heure d'arrivée :</strong> ${assignedTime} (soyez présent 15 minutes avant)</p>
        ${debutPause && finPause ? `
        <p style="margin:8px 0;color:#d9534f;"><strong>Pause prévue :</strong> ${debutPause} - ${finPause}</p>
        ` : ''}
      </div>
    </div>

    <!-- 🔧 UPDATED: Friendly response invitation (no deadline pressure) -->
    <div style="text-align:center;margin:40px 0;padding:30px;background:#e8f5e8;border-radius:8px;">
      <h3 style="color:#2d5a2d;margin-bottom:15px;font-size:20px;">💚 MERCI DE CONFIRMER VOTRE PRÉSENCE</h3>
      <p style="color:#2d5a2d;margin-bottom:25px;font-size:16px;">
        Nous aimerions connaître votre disponibilité pour mieux organiser la session
      </p>
      
      <a href="${responseUrl}" style="
        display:inline-block;
        background:#28a745;
        color:white;
        padding:15px 30px;
        text-decoration:none;
        border-radius:8px;
        font-weight:bold;
        font-size:16px;
        margin:10px;
        transition:background 0.3s ease;
      ">Répondre à la convocation</a>
      
      <p style="color:#2d5a2d;margin-top:15px;font-size:14px;font-weight:500;">
        📧 Nous vous enverrons un rappel si nécessaire
      </p>
    </div>

    <!-- ✅ KEEP AS IS: Original "Ce que vous devez faire" section -->
    <div style="background:#e7f3ff;padding:20px;border-radius:6px;margin:20px 0;">
      <h4 style="color:#0c5460;margin-top:0;">📋 Ce que vous devez faire :</h4>
      <ol style="color:#333;line-height:1.6;">
        <li><strong>Cliquez sur le bouton de confirmation</strong> ci-dessus</li>
        <li><strong>Choisissez votre réponse :</strong>
          <ul>
            <li>✅ Confirmer votre présence</li>
            <li>🔄 Demander un autre créneau</li>
            <li>❌ Décliner (suppression définitive)</li>
          </ul>
        </li>
      </ol>
    </div>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS
  };
};

// Add this to your email templates file
export const createTimeUpdateEmailTemplate = ({
  firstName,
  lastName,
  candidateId,
  newDate,
  newStartTime,
  newEndTime,
  debutPause,
  finPause
}) => {
  const subject = "Nouveau créneau confirmé – Orchestre CSO";

  // Format date & time
  const formattedDate = new Date(newDate).toLocaleDateString("fr-FR", {
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric"
  });

  // Header greeting
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;margin-bottom:10px;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;margin-bottom:25px;">
      Bonne nouvelle ! Votre demande de changement de créneau a été approuvée.
    </p>
  `;

  // Main content with new time details
  const bodyContent = `
    <div style="
      background:#d4edda;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #28a745;
    ">
      <h3 style="color:#155724;margin-top:0;font-size:18px;">✅ Nouveau créneau confirmé</h3>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Date :</strong> ${formattedDate}</p>
        <p style="margin:8px 0;"><strong>Nouveau créneau :</strong> ${newStartTime} - ${newEndTime} (soyez présent 15 minutes avant)</p>
        <p style="margin:8px 0;color:#28a745;font-weight:600;">
          <strong>Statut :</strong> Confirmé ✅
        </p>
        ${debutPause && finPause ? `
        <p style="margin:8px 0;color:#d9534f;"><strong>Pause prévue :</strong> ${debutPause} - ${finPause}</p>
        ` : ''}
      </div>
    </div>

    <div style="text-align:center;margin:30px 0;padding:20px;background:#f8f9fa;border-radius:8px;">
      <p style="color:#6c757d;margin:0;font-size:14px;">
        Votre présence est maintenant confirmée pour ce nouveau créneau.<br/>
        Nous avons hâte de vous entendre !
      </p>
    </div>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS
  };
};

// Add this to your email templates file
export const createRescheduleRejectionEmailTemplate = ({
  firstName,
  lastName,
  reason
}) => {
  const subject = "Mise à jour de votre demande – Orchestre CSO";

  // Header greeting
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;margin-bottom:10px;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;margin-bottom:25px;">
      Nous vous remercions pour votre demande de changement de créneau.
    </p>
  `;

  // Main content with rejection info
  const bodyContent = `
    <div style="
      background:#fff3cd;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #ffc107;
    ">
      <h3 style="color:#856404;margin-top:0;font-size:18px;">⏳ Demande en attente</h3>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;">
          <strong>Statut :</strong> 
          <span style="color:#ffc107;font-weight:600;">En liste d'attente</span>
        </p>
        ${reason ? `
        <p style="margin:8px 0;">
          <strong>Motif :</strong> ${reason}
        </p>
        ` : ''}
      </div>
    </div>

    <div style="background:#e7f3ff;padding:20px;border-radius:6px;margin:20px 0;">
      <h4 style="color:#0c5460;margin-top:0;">📋 Prochaines étapes :</h4>
      <ul style="color:#333;line-height:1.6;">
        <li><strong>Votre candidature reste active</strong> dans notre système</li>
        <li><strong>Vous êtes maintenant en liste d'attente</strong> pour un nouveau jour d'audition</li>
        <li><strong>Nous vous contacterons</strong> dès qu'un nouveau créneau sera disponible</li>
        <li><strong>Aucune action requise</strong> de votre part pour le moment</li>
      </ul>
    </div>

    <div style="text-align:center;margin:30px 0;padding:20px;background:#f8f9fa;border-radius:8px;">
      <p style="color:#6c757d;margin:0;font-size:14px;">
        Merci pour votre patience et votre compréhension.<br/>
        L'équipe administrative vous contactera prochainement.
      </p>
    </div>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS
  };
};

export const createReminderEmailTemplate = ({
  firstName,
  lastName,
  candidateId,
  assignedDate,
  assignedTime,
  assignedEndTime
}) => {
  const subject = "⏰ Rappel - Répondez à votre convocation d'audition – CSO";

  const formattedDate = new Date(assignedDate).toLocaleDateString("fr-FR", {
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric"
  });

  const responseUrl = `${FRONTEND_URL}/convocation/response/${candidateId}`;

  const headerContent = `
    <h2 style="font-size:22px;color:#f59e0b;margin-bottom:10px;">
      ⏰ <strong>Rappel Important - ${firstName} ${lastName}</strong>
    </h2>
    <p style="font-size:16px;color:#6d5b4c;margin-bottom:25px;">
      Nous n'avons pas encore reçu votre réponse concernant votre convocation d'audition.
    </p>
  `;

  const bodyContent = `
    <div style="
      background:#fff3cd;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #ffc107;
    ">
      <h3 style="color:#856404;margin-top:0;font-size:18px;">🎵 Votre audition est programmée</h3>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Date :</strong> ${formattedDate}</p>
        <p style="margin:8px 0;"><strong>Heure :</strong> ${assignedTime} - ${assignedEndTime}</p>
      </div>
    </div>

    <div style="text-align:center;margin:40px 0;padding:30px;background:#f8d7da;border-radius:8px;">
      <h3 style="color:#721c24;margin-bottom:15px;font-size:20px;">⚠️ ACTION REQUISE</h3>
      <p style="color:#721c24;margin-bottom:25px;font-size:16px;">
        Veuillez répondre à cette convocation dès maintenant
      </p>
      
      <a href="${responseUrl}" style="
        display:inline-block;
        background:#28a745;
        color:white;
        padding:15px 30px;
        text-decoration:none;
        border-radius:8px;
        font-weight:bold;
        font-size:16px;
        margin:10px;
      ">Répondre Maintenant</a>
      
      <p style="color:#dc3545;margin-top:15px;font-size:14px;font-weight:bold;">
        ⚠️ Si vous ne répondez pas avant le jour de l'audition, vous serez automatiquement remis en liste d'attente.
      </p>
    </div>

    <div style="background:#e7f3ff;padding:20px;border-radius:6px;margin:20px 0;">
      <h4 style="color:#0c5460;margin-top:0;">📋 Vos options :</h4>
      <ul style="color:#333;line-height:1.6;">
        <li>✅ <strong>Confirmer</strong> votre présence</li>
        <li>🔄 <strong>Demander</strong> un autre créneau</li>
        <li>❌ <strong>Décliner</strong> (suppression définitive)</li>
      </ul>
    </div>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS
  };
};


export const createPupitreUpdatedEmailTemplate = (user) => {
  const subject = `Mise à jour de votre tessiture vocale - Orchestre CSO`;

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Tessiture vocale mise à jour</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      Bonjour <strong>${user.firstName} ${user.lastName}</strong>, votre tessiture vocale a été modifiée par un responsable.
    </p>
  `;

  const bodyContent = `
    <p>Voici votre nouvelle tessiture :</p>
    <ul style="font-size: 16px; color: #3c2f2f;">
      <li><strong>Tessiture :</strong> ${user.pupitre.charAt(0).toUpperCase() + user.pupitre.slice(1)}</li>
    </ul>

    <p>Merci pour votre implication au sein de l'orchestre.</p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};


// ✅ CORRECT: Notification when a choriste LEAVES their pupitre
export const createChefPupitreNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  choristeName,
  chorisiteEmail,
  newPupitre,
  oldPupitre,

}) => {
  const subject = `🎼 Modification tessiture - Choriste de votre pupitre - CSO`;
  
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) Chef de Pupitre <strong>${chefFirstName} ${chefLastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Nous vous informons qu'un choriste de votre pupitre <strong>${oldPupitre}</strong> 
      a été réaffecté vers une nouvelle tessiture.
    </p>
  `;

  const bodyContent = `
    <div style="
      background:#fff3cd;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #ffc107;
    ">
      <h3 style="color:#856404;margin-top:0;font-size:18px;">Modification de Tessiture</h3>
      <p style="color:#856404;margin-bottom:0;">
        Un membre de votre section a été transféré vers un autre pupitre.
      </p>
    </div>

    <div style="
      background:#f8f6f3;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #d4a574;
    ">
      <h4 style="color:#4b2e2e;margin-top:0;">📋 Détails de la Modification</h4>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Choriste concerné :</strong> ${choristeName}</p>
        <p style="margin:8px 0;"><strong>Email :</strong> <a href="mailto:${chorisiteEmail}" style="color:#7b3e19;">${chorisiteEmail}</a></p>
        
        <div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:4px;">
          <p style="margin:4px 0;">
            <strong>Ancienne tessiture :</strong> 
            <span style="background:#dc3545;color:white;padding:4px 12px;border-radius:15px;font-size:14px;">
              ${oldPupitre} (votre section)
            </span>
          </p>
          <p style="margin:4px 0;">
            <strong>Nouvelle tessiture :</strong> 
            <span style="background:#28a745;color:white;padding:4px 12px;border-radius:15px;font-size:14px;">
              ${newPupitre}
            </span>
          </p>
        </div>
        
        
        <p style="margin:8px 0;color:#6d5b4c;"><strong>Date du changement :</strong> ${new Date().toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>
    </div>



    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:14px 40px;font-size:16px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 5px 15px rgba(75,46,46,0.4);
        display:inline-block;
      ">
        🎵 Accéder à votre espace
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Merci de mettre à jour l'organisation de votre pupitre en conséquence.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

// ✅ NEW: Template for NEW chefs (choriste JOINING their pupitre)
export const createNewChefPupitreNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  choristeName,
  chorisiteEmail,
  newPupitre,
  oldPupitre,

}) => {
  const subject = `🎼 Nouveau choriste rejoint votre pupitre - CSO`;
  
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) Chef de Pupitre <strong>${chefFirstName} ${chefLastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Un choriste a été transféré vers votre pupitre <strong>${newPupitre}</strong> 
      et fait maintenant partie de votre section.
    </p>
  `;

  const bodyContent = `
    <div style="
      background:#d4edda;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #28a745;
    ">
      <h3 style="color:#155724;margin-top:0;font-size:18px;">🎼 Nouveau Membre de Votre Pupitre</h3>
      <p style="color:#155724;margin-bottom:0;">
        Veuillez accueillir ce choriste dans votre section ${newPupitre}.
      </p>
    </div>

    <div style="
      background:#f8f6f3;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #d4a574;
    ">
      <h4 style="color:#4b2e2e;margin-top:0;">📋 Détails du Nouveau Membre</h4>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Choriste :</strong> ${choristeName}</p>
        <p style="margin:8px 0;"><strong>Email :</strong> <a href="mailto:${chorisiteEmail}" style="color:#7b3e19;">${chorisiteEmail}</a></p>
        
        <div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:4px;">
          ${oldPupitre !== 'Non défini' ? `
          <p style="margin:4px 0;">
            <strong>Provient du pupitre :</strong> 
            <span style="background:#6c757d;color:white;padding:3px 10px;border-radius:15px;font-size:12px;">
              ${oldPupitre}
            </span>
          </p>
        
          ` : ''}
          <p style="margin:4px 0;">
            <strong>Maintenant dans votre pupitre :</strong> 
            <span style="background:#28a745;color:white;padding:4px 12px;border-radius:15px;font-size:14px;">
              ${newPupitre}
            </span>
          </p>
        </div>
        
        
        <p style="margin:8px 0;color:#6d5b4c;"><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>
    </div>



    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:14px 40px;font-size:16px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 5px 15px rgba(75,46,46,0.4);
        display:inline-block;
      ">
        🎵 Accéder à votre espace
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Merci d'accueillir ce nouveau membre et de faciliter son intégration.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};


// ✅ ADD: Email template for newly appointed chef
export const createChefAppointedNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  pupitre,
}) => {
  const subject = `🎵 Félicitations ! Vous êtes nommé(e) Chef de Pupitre ${pupitre} - CSO`;
  
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Félicitations <strong>${chefFirstName} ${chefLastName}</strong> !
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Nous avons le plaisir de vous informer que vous avez été nommé(e) 
      <strong>Chef de Pupitre ${pupitre}</strong> du Chœur Symphonique de l'Orchestre.
    </p>
  `;

  const bodyContent = `
    <div style="
      background:#d4edda;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #28a745;
    ">
      <h3 style="color:#155724;margin-top:0;font-size:18px;">🎵 Votre Nomination</h3>
      <p style="color:#155724;margin-bottom:0;">
        Vous avez été sélectionné(e) pour diriger la section ${pupitre} en raison de vos 
        compétences et de votre engagement exceptionnel.
      </p>
    </div>

    <div style="
      background:#f8f6f3;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #d4a574;
    ">
      <h4 style="color:#4b2e2e;margin-top:0;">👑 Détails de votre Nomination</h4>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Poste :</strong> Chef de Pupitre ${pupitre}</p>
        <p style="margin:8px 0;"><strong>Date de nomination :</strong> ${new Date('2025-08-16T19:53:18Z').toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        
        <div style="margin:15px 0;padding:15px;background:#e8f4f8;border-radius:6px;">
          <h5 style="color:#0c5460;margin-top:0;">🎼 Vos Responsabilités</h5>
          <ul style="color:#0c5460;margin:0;padding-left:20px;">
            <li>Coordonner et diriger la section ${pupitre}</li>
            <li>Aider les nouveaux membres de votre pupitre</li>
            <li>Communiquer avec la direction artistique</li>
            <li>Veiller à la cohésion de votre section</li>
          </ul>
        </div>
      </div>
    </div>

    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:14px 40px;font-size:16px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 5px 15px rgba(75,46,46,0.4);
        display:inline-block;
      ">
        🎵 Accéder à votre espace Chef
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Nous vous souhaitons beaucoup de succès dans cette nouvelle fonction !
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};



// ✅ ADD: Email template for existing co-chef when new partner is appointed
export const createCoChefNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  newCoChefName,
  pupitre
}) => {
  const subject = `🎵 Nouveau co-chef dans votre pupitre ${pupitre} - CSO`;
  
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) Chef de Pupitre <strong>${chefFirstName} ${chefLastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Nous vous informons qu'un nouveau co-chef a été nommé pour votre pupitre <strong>${pupitre}</strong>.
    </p>
  `;

  const bodyContent = `
    <div style="
      background:#d4edda;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #28a745;
    ">
      <h3 style="color:#155724;margin-top:0;font-size:18px;">🤝 Nouveau Partenariat</h3>
      <p style="color:#155724;margin-bottom:0;">
        Vous allez maintenant travailler en équipe pour diriger la section ${pupitre}.
      </p>
    </div>

    <div style="
      background:#f8f6f3;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #d4a574;
    ">
      <h4 style="color:#4b2e2e;margin-top:0;">👑 Votre Nouveau Co-Chef</h4>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Nouveau co-chef :</strong> ${newCoChefName}</p>
        <p style="margin:8px 0;"><strong>Pupitre :</strong> ${pupitre}</p>
        <p style="margin:8px 0;"><strong>Date de nomination :</strong> ${new Date('2025-08-16T19:53:18Z').toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>
    </div>

    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:14px 40px;font-size:16px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 5px 15px rgba(75,46,46,0.4);
        display:inline-block;
      ">
        🎵 Accéder à votre espace
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Nous vous souhaitons une excellente collaboration !
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

// ✅ ADD: Chef removed notification
export const createChefRemovedNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  pupitre,
}) => {
  const subject = `🎵 Fin de mandat Chef de Pupitre ${pupitre} - CSO`;
  
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) <strong>${chefFirstName} ${chefLastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Nous vous informons que votre mandat de Chef de Pupitre <strong>${pupitre}</strong> 
      a pris fin le ${new Date('2025-08-16T19:53:18Z').toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}.
    </p>
  `;

  const bodyContent = `
    <div style="
      background:#fff3cd;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #ffc107;
    ">
      <h3 style="color:#856404;margin-top:0;font-size:18px;">🎼 Fin de Mandat</h3>
      <p style="color:#856404;margin-bottom:0;">
        Merci pour votre excellent travail en tant que Chef de Pupitre ${pupitre}.
      </p>
    </div>

    <div style="
      background:#f8f6f3;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #d4a574;
    ">
      <h4 style="color:#4b2e2e;margin-top:0;">📋 Détails</h4>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Ancien poste :</strong> Chef de Pupitre ${pupitre}</p>
        <p style="margin:8px 0;"><strong>Date :</strong> ${new Date('2025-08-16T19:53:18Z').toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>
    </div>

    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:14px 40px;font-size:16px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 5px 15px rgba(75,46,46,0.4);
        display:inline-block;
      ">
        🎵 Accéder à votre espace
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Vous continuez à être un membre précieux du chœur!
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

// ✅ ADD: Co-chef left notification
export const createCoChefLeftNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  leftCoChefName,
  pupitre
}) => {
  const subject = `🎵 Votre co-chef ${leftCoChefName} quitte le pupitre ${pupitre} - CSO`;
  
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) Chef de Pupitre <strong>${chefFirstName} ${chefLastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Nous vous informons que votre co-chef <strong>${leftCoChefName}</strong> 
      n'est plus Chef de Pupitre ${pupitre}.
    </p>
  `;

  const bodyContent = `
    <div style="
      background:#fff3cd;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #ffc107;
    ">
      <h3 style="color:#856404;margin-top:0;font-size:18px;">🤝 Changement d'Équipe</h3>
      <p style="color:#856404;margin-bottom:0;">
        Vous êtes maintenant le seul chef de pupitre ${pupitre}.
      </p>
    </div>

    <div style="
      background:#f8f6f3;
      padding:25px;
      border-radius:8px;
      margin:25px 0;
      border-left:4px solid #d4a574;
    ">
      <h4 style="color:#4b2e2e;margin-top:0;">📋 Informations</h4>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Ancien co-chef :</strong> ${leftCoChefName}</p>
        <p style="margin:8px 0;"><strong>Pupitre :</strong> ${pupitre}</p>
        <p style="margin:8px 0;"><strong>Date :</strong> ${new Date('2025-08-16T19:53:18Z').toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
      </div>
    </div>

    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:14px 40px;font-size:16px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 5px 15px rgba(75,46,46,0.4);
        display:inline-block;
      ">
        🎵 Accéder à votre espace
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Continuez votre excellent travail de direction!
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};



// ✅ ADD THIS to your existing notifTemplate.js

export const createChefPupitreModificationTemplate = ({
  choristeFirstName,
  choristeLastName,
  chefName,
  pupitre,
  repetition,
  modifications,
  originalValues
}) => {
  const subject = `🎼 URGENT - Modification répétition ${pupitre} - CSO`;
  
  const headerContent = `
    <h2 style="font-size:22px;color:#dc3545;">
      <strong>MODIFICATION URGENTE</strong>
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Cher(e) <strong>${choristeFirstName} ${choristeLastName}</strong>,<br/>
      Votre chef de pupitre <strong>${chefName}</strong> a modifié une répétition.
    </p>
  `;

  const changes = [];
  if (modifications.newStartTime && modifications.newStartTime !== originalValues.startTime) {
    changes.push(`Heure de début: ${originalValues.startTime} → ${modifications.newStartTime}`);
  }
  if (modifications.newEndTime && modifications.newEndTime !== originalValues.endTime) {
    changes.push(`Heure de fin: ${originalValues.endTime} → ${modifications.newEndTime}`);
  }
  if (modifications.newLocation && modifications.newLocation !== originalValues.location) {
    changes.push(`Lieu: ${originalValues.location} → ${modifications.newLocation}`);
  }

  const bodyContent = `
    <div style="background:#f8d7da;padding:25px;border-radius:8px;margin:25px 0;border-left:4px solid #dc3545;">
      <h3 style="color:#721c24;margin-top:0;">🚨 ATTENTION - Votre pupitre ${pupitre}</h3>
      <p style="color:#721c24;margin-bottom:0;">
        Modification importante pour la répétition du ${new Date(repetition.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>

    ${changes.length > 0 ? `
    <div style="background:#fff3cd;padding:20px;border-radius:6px;margin:20px 0;">
      <h4 style="color:#856404;margin-top:0;">🔄 Changements:</h4>
      <ul style="color:#856404;line-height:1.8;">
        ${changes.map(change => `<li><strong>${change}</strong></li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${modifications.urgentMessage ? `
    <div style="background:#e7f3ff;padding:20px;border-radius:6px;margin:20px 0;">
      <h4 style="color:#0c5460;">💬 Message de votre chef:</h4>
      <p style="color:#0c5460;font-style:italic;">"${modifications.urgentMessage}"</p>
    </div>
    ` : ''}

    <div style="background:#f8f6f3;padding:25px;border-radius:8px;margin:25px 0;">
      <h4 style="color:#4b2e2e;margin-top:0;">📅 Détails Finaux:</h4>
      <div style="background:white;padding:20px;border-radius:6px;">
        <p style="margin:8px 0;"><strong>Date:</strong> ${new Date(repetition.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p style="margin:8px 0;"><strong>Heure:</strong> ${modifications.newStartTime || repetition.startTime} - ${modifications.newEndTime || repetition.endTime}</p>
        <p style="margin:8px 0;"><strong>Lieu:</strong> ${modifications.newLocation || repetition.location}</p>
        ${repetition.concert ? `<p style="margin:8px 0;"><strong>Concert lié:</strong> ${repetition.concert.title}</p>` : ''}
      </div>
    </div>

    <div style="text-align:center;margin:30px 0;">
      <a href="${FRONTEND_URL}/auth/signin" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:14px 40px;font-size:16px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 5px 15px rgba(75,46,46,0.4);
        display:inline-block;
      ">
        🎵 Accéder à votre espace
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      Merci de noter ces changements et d'être présent(e) aux nouvelles conditions.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};