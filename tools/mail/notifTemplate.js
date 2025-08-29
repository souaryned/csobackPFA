import { FRONTEND_URL } from "../../config.js";
import crypto from "crypto";

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
      🎻 Musicalement votre, <br />
      <strong>L'équipe du CSO</strong>
    </div>
  </div>
`;

//1 done
export const createAccountEmailTemplate = ({
  firstName,
  lastName,
  email,
  password,
  role,
  pupitre, // ✅ NEW: Pupitre parameter
  tessiture, // ✅ NEW: Tessiture parameter (optional, for reference)
}) => {
  const subject = "Carthage Symphony Orchestra";

  // ✅ NEW: Pupitre emoji mapping
  const pupitreEmojis = {
    soprano: "🎵",
    alto: "🎶",
    ténor: "🎤",
    basse: "🎸",
  };

  const pupitreEmoji = pupitreEmojis[pupitre] || "🎼";

  // ✅ UPDATED: Dynamic content based on role with pupitre support
  const getRoleSpecificContent = (userRole) => {
    switch (userRole) {
      case "choriste":
        return {
          greeting: pupitre
            ? `Vous venez de signer la charte qui confirme votre adhésion au choeur du CSO.<br/>Vous êtes officiellement choriste junior.`
            : "Félicitations, vous êtes officiellement choriste !",
          successTitle: "Adhésion réussie !",
          successMessage:
            "Bienvenue officiellement dans la CSO Family !<br/>Prochaines étapes :<br/>- Se présenter au welcome Day<br/>- Assister à la répétition<br/>- Vous connecter à votre espace ",
          welcomeMessage: pupitre
            ? `Nous sommes ravis de vous compter parmi nous dans le pupitre ${pupitre} et avons hâte de collaborer ensemble !`
            : "Nous sommes ravis de vous compter parmi nous et avons hâte de collaborer ensemble !",
          buttonText: "🎵 Se connecter",
        };

      case "manager":
        return {
          greeting:
            "Félicitations, vous êtes maintenant Manager de choeur ! Votre compte a été créé avec succès.",
          successTitle: "Compte Manager créé avec succès !",
          successMessage: "Bienvenue dans l'équipe de gestion de la CSO !",
          welcomeMessage:
            "En tant que Manager, vous avez accès aux outils de gestion et d'administration. Nous comptons sur votre expertise !",
          buttonText: "🎵 Se connecter",
        };

      case "chef de choeur":
        return {
          greeting:
            "Félicitations, vous êtes maintenant Chef de choeur ! Votre compte a été créé avec succès.",
          successTitle: "Compte Chef de choeur créé avec succès !",
          successMessage: "Bienvenue dans l'équipe dirigeante de la CSO !",
          welcomeMessage:
            "En tant que Chef de choeur, vous dirigez et inspirez nos choristes. Nous avons hâte de voir votre leadership en action !",
          buttonText: "🎵 Se connecter",
        };

      default:
        return {
          greeting: "Félicitations, votre compte a été créé avec succès !",
          successTitle: "Compte créé avec succès !",
          successMessage: "Bienvenue dans la CSO Family !",
          welcomeMessage: "Nous sommes ravis de vous compter parmi nous !",
          buttonText: "🎵 Se connecter",
        };
    }
  };

  const roleContent = getRoleSpecificContent(role);

  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      ${roleContent.greeting}
    </p>
  `;

  const bodyContent = `
    <div style="background:#d4edda;padding:18px;border-radius:8px;margin:25px 0;border:1px solid #c3e6cb;">
      <h4 style="color:#155724;margin-top:0;">${roleContent.successTitle}</h4>
      <p style="color:#155724;margin-bottom:0;">
        ${roleContent.successMessage}
      </p>
    </div>

    ${
      pupitre && role === "choriste"
        ? `
    <div style="background:#e7f3ff;padding:20px;border-radius:6px;margin:20px 0;border:1px solid #b8daff;">
      <h4 style="color:#0c5460;margin-top:0;">${pupitreEmoji} Tessiture</h4>
      <div style="background:white;padding:15px;border-radius:4px;margin:10px 0;">
        <p style="color:#0c5460;font-size:16px;margin:5px 0;">
          <strong>Pupitre:</strong> ${
            pupitre.charAt(0).toUpperCase() + pupitre.slice(1)
          }
          ${tessiture ? ` (Tessiture évaluée: ${tessiture})` : ""}
        </p>
      </div>
    </div>
    `
        : ""
    }

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
        ${roleContent.buttonText}
      </a>
    </div>

    <p style="font-size:14px;color:#6d5b4c;">
      ${roleContent.welcomeMessage}
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//2 done
export const charterSigningInvitationTemplate = ({
  firstName,
  lastName,
  email,
  charterSigningLink,
}) => {
  const subject =
    "Félicitations ! Validez et signez la charte du choeur du CSO";

  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <div style="background:#d4edda;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #28a745;">
      <p style="font-size:16px;color:#155724;margin:0 0 15px 0;font-weight:600;">
        Nous avons le plaisir de vous annoncer que vous êtes retenu(e) pour faire partie du chœur amateur du Carthage Symphony Orchestra.
      </p>
    </div>
    
    <div style="background:#f8f6f3;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #c19a6b;text-align:left;">
      <h4 style="color:#4b2e2e;margin:0 0 12px 0;font-size:16px;">📅 Organisation des répétitions</h4>
      <p style="color:#333;margin:0 0 10px 0;line-height:1.6;">
        Le chœur du CSO, répète régulièrement tous les mercredis à partir de 19H. Il arrive qu'on répète en dehors du mercredi en cas de :
      </p>
      <p style="color:#333;margin:0 0 10px 0;line-height:1.6;">
        - répétitions en préparation des concerts.
      </p>
      <p style="color:#333;margin:0 0 0 0;line-height:1.6;">
        - répétitions par pupitre (qui se passeront généralement au boulevard des arts)
      </p>
    </div>

    <div style="background:#fff3cd;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #ffc107;text-align:left;">
      <h4 style="color:#856404;margin:0 0 12px 0;font-size:16px;">⚖️ Engagement d'exclusivité</h4>
      <p style="color:#856404;margin:0 0 12px 0;line-height:1.7;">
        La participation au chœur du CSO exige l'exclusivité comme le stipule la charte ci-jointe: 
      </p>
        <p style="color:#856404;margin:0 0 12px 0;line-height:1.7;">
        Tout choriste membre du CSO doit donner une priorité absolue aux activités du chœur du CSO.
      </p>
      <p style="color:#856404;margin:0;line-height:1.7;">
        Le choriste n'a pas le droit de faire partie d'autres chœurs similaires (chœur polyphonique ou chœur monophonique chantant 
        avec un orchestre symphonique) sauf s'il obtient l'autorisation du comité du CSO.
      </p>
    </div>
  `;

  const bodyContent = `
    <div style="background:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #28a745;">
      <h4 style="color:#155724;margin-top:0;">🎉 Étape finale : Signature de la charte</h4>
      <p style="color:#155724;margin-bottom:0;">
        Pour confirmer votre adhésion au choeur du CSO, veuillez lire et signer la charte du choriste.
      </p>
    </div>

    <div style="text-align:center;margin:35px 0;">
      <a href="${charterSigningLink}" target="_blank" style="
        background: linear-gradient(135deg, rgba(193,154,107,1), rgba(75,46,46,1));
        color:white;padding:16px 50px;font-size:18px;font-weight:bold;
        text-decoration:none;border-radius:50px;
        box-shadow:0 8px 25px rgba(75,46,46,0.4);
        display:inline-block;
        transition:all 0.3s ease;
      ">
        📝 Lire et signer la charte maintenant
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
//3 done
export const createRejectionEmailTemplate = ({
  firstName,
  lastName,
  reason,
}) => {
  const subject = "Auditions CSO: Résultats de la Session de Reecrutement";

  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Merci d'avoir participé à l'audition pour rejoindre le chœur du CSO.
    </p>
  `;

  const bodyContent = `
    <p>Nous avons reçu plusieurs candidatures, beaucoup de voix sont intéressantes mais malheureusement le nombre des places ouvertes pour cette saison est limité. 
      La concurrence élevée a fait que vous n’avez pas été, malheureusement, retenu(e) au chœur.</p>

    <p style="font-size:16px;color:#6d5b4c;">
      Nous vous remercions sincèrement pour votre engagement et votre passion.
      Nous espérons vous revoir lors de nos auditions futures.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//4 done
export const createLeaveAcceptedEmailTemplate = (leave) => {
  const { user, startDate, endDate } = leave;
  const fullName = `${user.firstName} ${user.lastName}`;

  const subject = "Demande de congé acceptée";

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Cher(e) <strong>${fullName}</strong>,</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      Nous avons le plaisir de vous informer que votre demande de congé a été <strong>enregistrée</strong>.
    </p>
  `;

  const bodyContent = `
    <p>Voici les détails de votre congé :</p>
    <ul style="font-size: 16px; color: #3c2f2f;">
      <li><strong>Début :</strong> ${new Date(startDate).toLocaleDateString(
        "fr-FR"
      )}</li>
      <li><strong>Fin :</strong> ${new Date(endDate).toLocaleDateString(
        "fr-FR"
      )}</li>
    </ul>


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

//5 done
export const createLeaveDeclaredEmailTemplate = (user, leave) => {
  const subject = `Demande de congé déposée`;

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Nouvelle demande de congé reçue</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      <strong>${user.firstName} ${user.lastName}</strong> a soumis une nouvelle demande de congé.
    </p>
  `;

  const bodyContent = `
    <p>Voici les détails de la demande :</p>
    <ul style="font-size: 16px; color: #3c2f2f;">
      <li><strong>Début :</strong> ${new Date(
        leave.startDate
      ).toLocaleDateString("fr-FR")}</li>
      <li><strong>Fin :</strong> ${new Date(leave.endDate).toLocaleDateString(
        "fr-FR"
      )}</li>
      <li><strong>Raison :</strong> ${leave.reason || "(Non précisée)"}</li>
    </ul>

    <p>Merci de traiter cette demande dans l'interface de gestion.</p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//6 done
export const createTestDateEmailTemplate = ({
  firstName,
  lastName,
  candidateId,
  assignedDate,
  assignedTime,
  debutPause,
  finPause,
}) => {
  const subject = "Convocation à l'audition";

  // Format date & time
  const formattedDate = new Date(assignedDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 🎯 Create response URL
  const responseUrl = `${FRONTEND_URL}/convocation/response/${candidateId}`;

  // Header greeting
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;margin-bottom:10px;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;margin-bottom:25px;">
      Nous avons le plaisir de vous annoncer que votre inscription aux auditions organisées 
      par le Carthage Symphony Orchestra a été acceptée. 
    </p>
    <div style="background:#f0f7ff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #4a90e2;">
      <p style="font-size:16px;color:#2c5aa0;margin:0;line-height:1.6;">
        Nous vous invitons donc à vous présenter au siège de l'Association Musique Sans Frontières MSF domiciliée au centre culturel "Le Boulevard des Arts" (<a href="https://maps.google.com/?q=Boulevard+des+Arts+Carthage+Tunis" target="_blank" style="color:#1a73e8;text-decoration:none;font-weight:bold;">lien maps</a>) selon le plannig suivant :
      </p>
    </div>
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
      <h3 style="color:#4b2e2e;margin-top:0;font-size:18px;">Planning de votre audition</h3>
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Date :</strong> ${formattedDate}</p>
        <p style="margin:8px 0;"><strong>Heure d'arrivée :</strong> ${assignedTime} (soyez présent 15 minutes avant)</p>
      </div>
    </div>

    <div style="background:#fff9e6;padding:20px;border-radius:8px;margin:25px 0;border-left:4px solid #f39c12;">
      <h4 style="color:#b7750a;margin-top:0;font-size:16px;">🎵 Déroulement de l'audition</h4>
      <p style="color:#8b5a0a;margin:0;line-height:1.6;">
        L'audition se déroulera en deux temps : D'abord vous chanterez en a capella l'air (chanson) de votre choix (classique, arabe, pop, rock, etc..), ensuite vous suivrez le professeur de chant au piano qui vous demandera de reprendre quelques exercices vocaux.
      </p>
    </div>

    <!-- 🔧 UPDATED: Friendly response invitation (no deadline pressure) -->
    <div style="text-align:center;margin:40px 0;padding:30px;background:#e8f5e8;border-radius:8px;">
      <h3 style="color:#2d5a2d;margin-bottom:15px;font-size:20px;">💚 MERCI DE CONFIRMER VOTRE PRÉSENCE</h3>
      
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
      ">Confirmation</a>
      
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
    attachments: COMMON_ATTACHMENTS,
  };
};

//7 done
export const createTimeUpdateEmailTemplate = ({
  firstName,
  lastName,
  candidateId,
  newDate,
  newStartTime,
  newEndTime,
  debutPause,
  finPause,
}) => {
  const subject = "Audition CSO: Nouveau créneau confirmé";

  // Format date & time
  const formattedDate = new Date(newDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Header greeting
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;margin-bottom:10px;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;margin-bottom:25px;">
      Votre demande de changement de créneau a été approuvée.
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
      <h3 style="color:#155724;margin-top:0;font-size:18px;">Nouveau créneau confirmé</h3>
      
      <div style="background:white;padding:20px;border-radius:6px;margin:15px 0;">
        <p style="margin:8px 0;"><strong>Date :</strong> ${formattedDate}</p>
        <p style="margin:8px 0;"><strong>Nouveau créneau :</strong> ${newStartTime} - ${newEndTime} (soyez présent 15 minutes avant)</p>
        <p style="margin:8px 0;color:#28a745;font-weight:600;">
          <strong>Statut :</strong> Confirmé 
        </p>
      </div>
    </div>

    <div style="text-align:center;margin:30px 0;padding:20px;background:#f8f9fa;border-radius:8px;">
      <p style="color:#6c757d;margin:0;font-size:14px;">
        Votre présence est maintenant confirmée pour ce nouveau créneau.<br/>
      </p>
    </div>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//8 done
export const createRescheduleRejectionEmailTemplate = ({
  firstName,
  lastName,
  reason,
}) => {
  const subject = "Audition CSO : Changement de créneau";

  // Header greeting
  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;margin-bottom:10px;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;margin-bottom:25px;">
      Nous confirmons la réception de votre demande de changement de créneau.</br>
      Malheureusement, nous ne pouvons pas la valider. 
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
        ${
          reason
            ? `
        <p style="margin:8px 0;">
          <strong>Motif :</strong> ${reason}
        </p>
        `
            : ""
        }
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
        L'équipe du CSO vous contactera prochainement.
      </p>
    </div>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//9 done
export const createPupitreUpdatedEmailTemplate = (user) => {
  const subject = `Mise à jour de votre tessiture vocale`;

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Tessiture vocale mise à jour</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      Bonjour <strong>${user.firstName} ${user.lastName}</strong>, votre tessiture vocale a été modifiée par un responsable.
    </p>
  `;

  const bodyContent = `
    <p>Voici votre nouvelle tessiture :</p>
    <ul style="font-size: 16px; color: #3c2f2f;">
      <li><strong>Tessiture :</strong> ${
        user.pupitre.charAt(0).toUpperCase() + user.pupitre.slice(1)
      }</li>
    </ul>


  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//10 done
export const createChefPupitreNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  choristeName,
  chorisiteEmail,
  newPupitre,
  oldPupitre,
}) => {
  const subject = `Modification tessiture - Choriste de votre pupitre`;

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
        
        
        <p style="margin:8px 0;color:#6d5b4c;"><strong>Date du changement :</strong> ${new Date().toLocaleDateString(
          "fr-FR",
          {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        )}</p>
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

//11 done
export const createNewChefPupitreNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  choristeName,
  chorisiteEmail,
  newPupitre,
  oldPupitre,
}) => {
  const subject = `Nouveau choriste rejoint votre pupitre`;

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
          ${
            oldPupitre !== "Non défini"
              ? `
          <p style="margin:4px 0;">
            <strong>Provient du pupitre :</strong> 
            <span style="background:#6c757d;color:white;padding:3px 10px;border-radius:15px;font-size:12px;">
              ${oldPupitre}
            </span>
          </p>
        
          `
              : ""
          }
          <p style="margin:4px 0;">
            <strong>Maintenant dans votre pupitre :</strong> 
            <span style="background:#28a745;color:white;padding:4px 12px;border-radius:15px;font-size:14px;">
              ${newPupitre}
            </span>
          </p>
        </div>
        
        
        <p style="margin:8px 0;color:#6d5b4c;"><strong>Date :</strong> ${new Date().toLocaleDateString(
          "fr-FR",
          {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }
        )}</p>
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

//12 done
export const createChefAppointedNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  pupitre,
}) => {
  const subject = `Félicitations ! Vous êtes nommé(e) Chef de Pupitre ${pupitre}`;

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
        Vous avez été sélectionné(e) pour chapoter la section ${pupitre}</br>Merci de votre engagement exceptionnel.
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
        <p style="margin:8px 0;"><strong>Date de nomination :</strong> ${new Date(
          "2025-08-16T19:53:18Z"
        ).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
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

//13 done
export const createChefRemovedNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  pupitre,
}) => {
  const subject = `Fin de mandat Chef de Pupitre ${pupitre} - CSO`;

  const headerContent = `
    <h2 style="font-size:22px;color:#4b2e2e;">
      Cher(e) <strong>${chefFirstName} ${chefLastName}</strong>,
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Nous vous informons que votre mandat de Chef de Pupitre <strong>${pupitre}</strong> 
      a pris fin le ${new Date("2025-08-16T19:53:18Z").toLocaleDateString(
        "fr-FR",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      )}.
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
        <p style="margin:8px 0;"><strong>Date :</strong> ${new Date(
          "2025-08-16T19:53:18Z"
        ).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
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

//14 done
export const createCoChefLeftNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  leftCoChefName,
  pupitre,
}) => {
  const subject = `🎵 Votre co-chef ${leftCoChefName} quitte le pupitre ${pupitre}`;

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
        <p style="margin:8px 0;"><strong>Date :</strong> ${new Date(
          "2025-08-16T19:53:18Z"
        ).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
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
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//15 done
export const createCoChefNotificationTemplate = ({
  chefFirstName,
  chefLastName,
  newCoChefName,
  pupitre,
}) => {
  const subject = `🎵 Nouveau co-chef dans votre pupitre ${pupitre}`;

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
        <p style="margin:8px 0;"><strong>Date de nomination :</strong> ${new Date(
          "2025-08-16T19:53:18Z"
        ).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
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

//16 done
export const createManagerModificationTemplate = ({
  choristeFirstName,
  choristeLastName,
  choristerPupitre,
  managerName,
  repetition,
  modifications,
  originalValues,
}) => {
  const subject = `URGENT - Modification répétition`;

  const headerContent = `
    <h2 style="font-size:22px;color:#dc3545;">
      <strong>MODIFICATION URGENTE</strong>
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Cher(e) <strong>${choristeFirstName} ${choristeLastName}</strong> (${choristerPupitre}),<br/>
      Le manager <strong>${managerName}</strong> a modifié une répétition.
    </p>
  `;

  const changes = [];
  if (
    modifications.newStartTime &&
    modifications.newStartTime !== originalValues.startTime
  ) {
    changes.push(
      `Heure de début: ${originalValues.startTime} → ${modifications.newStartTime}`
    );
  }
  if (
    modifications.newEndTime &&
    modifications.newEndTime !== originalValues.endTime
  ) {
    changes.push(
      `Heure de fin: ${originalValues.endTime} → ${modifications.newEndTime}`
    );
  }
  if (
    modifications.newLocation &&
    modifications.newLocation !== originalValues.location
  ) {
    changes.push(
      `Lieu: ${originalValues.location} → ${modifications.newLocation}`
    );
  }

  const bodyContent = `
    <div style="background:#f8d7da;padding:25px;border-radius:8px;margin:25px 0;border-left:4px solid #dc3545;">
      <h3 style="color:#721c24;margin-top:0;">🚨 ATTENTION - Tous les choristes</h3>
      <p style="color:#721c24;margin-bottom:0;">
        Modification importante pour la répétition du ${new Date(
          repetition.date
        ).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
    </div>

    ${
      changes.length > 0
        ? `
    <div style="background:#fff3cd;padding:20px;border-radius:6px;margin:20px 0;">
      <h4 style="color:#856404;margin-top:0;">🔄 Changements:</h4>
      <ul style="color:#856404;line-height:1.8;">
        ${changes
          .map((change) => `<li><strong>${change}</strong></li>`)
          .join("")}
      </ul>
    </div>
    `
        : ""
    }

    ${
      modifications.urgentMessage
        ? `
    <div style="background:#e7f3ff;padding:20px;border-radius:6px;margin:20px 0;">
      <h4 style="color:#0c5460;">💬 Message de la direction:</h4>
      <p style="color:#0c5460;font-style:italic;">"${modifications.urgentMessage}"</p>
    </div>
    `
        : ""
    }

    <div style="background:#f8f6f3;padding:25px;border-radius:8px;margin:25px 0;">
      <h4 style="color:#4b2e2e;margin-top:0;">📅 Planning final:</h4>
      <div style="background:white;padding:20px;border-radius:6px;">
        <p style="margin:8px 0;"><strong>Date:</strong> ${new Date(
          repetition.date
        ).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}</p>
        <p style="margin:8px 0;"><strong>Heure:</strong> ${
          modifications.newStartTime || repetition.startTime
        } - ${modifications.newEndTime || repetition.endTime}</p>
        <p style="margin:8px 0;"><strong>Lieu:</strong> ${
          modifications.newLocation || repetition.location
        }</p>
        ${
          repetition.concert
            ? `<p style="margin:8px 0;"><strong>Concert lié:</strong> ${repetition.concert.title}</p>`
            : ""
        }
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
      Merci de noter ces changements et d'être présent(e) aux nouveaux horaires.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//17 done
export const createNominationWarningTemplate = ({
  firstName,
  lastName,
  concertTitle,
  attendanceRate,
  threshold,
  absencesCount,
  totalRepetitions,
  concertDate,
  repetitionDetails = [],
}) => {
  const subject = `Avertissement - Taux de présence insuffisant "${concertTitle}"`;

  const formattedConcertDate = new Date(concertDate).toLocaleDateString(
    "fr-FR",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  const headerContent = `
    <h2 style="font-size:22px;color:#f59e0b;">
      <strong>Avertissement Important</strong>
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,<br/>
      Votre taux de présence nécessite votre attention immédiate.
    </p>
  `;

  // Create repetition details table if provided
  const repetitionRows =
    repetitionDetails.length > 0
      ? repetitionDetails
          .map((rep) => {
            const repDate = new Date(rep.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const statusIcon = rep.attended ? "✅" : "❌";
            const statusText = rep.attended ? "Présent(e)" : "Absent(e)";
            const statusColor = rep.attended ? "#10b981" : "#ef4444";

            return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; text-align: left; font-size: 14px;">${repDate}</td>
        <td style="padding: 8px; text-align: left; font-size: 14px;">${
          rep.location || "Non défini"
        }</td>
        <td style="padding: 8px; text-align: center;">
          <span style="color: ${statusColor}; font-weight: 600; font-size: 12px;">
            ${statusIcon} ${statusText}
          </span>
        </td>
      </tr>
    `;
          })
          .join("")
      : "";

  const bodyContent = `
    <div style="background:#fef3c7;padding:25px;border-radius:8px;margin:25px 0;border-left:4px solid #f59e0b;">
      <h3 style="color:#92400e;margin-top:0;font-size:18px;">⚠️ Situation Critique</h3>
      <p style="color:#92400e;margin-bottom:0;">
        Votre taux de présence pour le concert <strong>"${concertTitle}"</strong> est insuffisant. 
        Vous risquez l'élimination si votre participation ne s'améliore pas rapidement.
      </p>
    </div>

  
      
      <!-- ✅ NEW DESIGN: Better percentage comparison -->
      <div style="background:white;padding:25px;border-radius:10px;margin:20px 0;border-left:5px solid #ef4444;">
        <h3 style="color:#374151;margin:0 0 20px 0;font-size:18px;font-weight:600;">
          📊 Votre Situation Actuelle
        </h3>
        
        <!-- Status Overview -->
        <div style="background:#fef2f2;padding:15px;border-radius:8px;margin-bottom:20px;border:1px solid #fecaca;">
          <div style="display:flex;align-items:center;margin-bottom:10px;">
            <span style="font-weight:600;color:#dc2626;font-size:16px;">Assiduité Insuffisante</span>
          </div>
          <p style="margin:0;color:#7f1d1d;font-size:14px;">
            Votre taux de présence est en dessous du minimum requis pour participer au concert.
          </p>
        </div>

        <!-- Attendance Comparison -->
        <div style="background:#f9fafb;padding:20px;border-radius:8px;border:1px solid #e5e7eb;">
          <div style="margin-bottom:15px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:600;color:#374151;">Votre Taux de Présence</span>
              <span style="font-size:24px;font-weight:700;color:#ef4444;">${Math.round(
                attendanceRate
              )}%</span>
            </div>
            <div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;">
              <div style="background:#ef4444;height:100%;width:${Math.min(
                attendanceRate,
                100
              )}%;transition:width 0.3s;"></div>
            </div>
          </div>

          <div style="margin-bottom:15px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-weight:600;color:#374151;">Taux Minimum Requis</span>
              <span style="font-size:24px;font-weight:700;color:#10b981;">${Math.round(
                threshold
              )}%</span>
            </div>
            <div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;">
              <div style="background:#10b981;height:100%;width:${threshold}%;transition:width 0.3s;"></div>
            </div>
          </div>

          <!-- Gap Indicator -->
          <div style="background:#fff3cd;padding:12px;border-radius:6px;border:1px solid #ffeaa7;margin-top:15px;">
            <div style="display:flex;align-items:center;">
              <span style="font-size:16px;margin-right:8px;">📈</span>
              <span style="font-weight:600;color:#856404;">
                Il vous manque ${Math.round(
                  threshold - attendanceRate
                )}% pour atteindre le minimum requis
              </span>
            </div>
          </div>
        </div>

        <!-- Concert Details -->
        <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin-top:20px;">
          <div style="grid:template-columns:1fr 1fr;gap:10px;">
            <p style="margin:4px 0;"><strong>Concert :</strong> ${concertTitle}</p>
            <p style="margin:4px 0;"><strong>Date du concert :</strong> ${formattedConcertDate}</p>
            <p style="margin:4px 0;"><strong>Répétitions assistées :</strong> ${
              totalRepetitions - absencesCount
            }/${totalRepetitions}</p>
            <p style="margin:4px 0;color:#ef4444;"><strong>Absences :</strong> ${absencesCount}</p>
          </div>
        </div>
      </div>
  

    ${
      repetitionRows
        ? `
    <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:25px 0;">
      <h4 style="color:#374151;margin-top:0;">📅 Détail de vos Présences</h4>
      <div style="overflow-x:auto;border-radius:6px;border:1px solid #e5e7eb;">
        <table style="width:100%;border-collapse:collapse;background-color:#ffffff;">
          <thead>
            <tr style="background-color:#f9fafb;">
              <th style="padding:10px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;">Date</th>
              <th style="padding:10px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;">Lieu</th>
              <th style="padding:10px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${repetitionRows}
          </tbody>
        </table>
      </div>
    </div>
    `
        : ""
    }

    <div style="background:#fef2f2;padding:20px;border-radius:8px;margin:25px 0;border:1px solid #fecaca;">
      <h4 style="color:#dc2626;margin-top:0;">🎯 Action immédiate requise</h4>
      <p style="color:#7f1d1d;margin:0;line-height:1.6;">
        <strong>Pour éviter l'élimination :</strong> Vous devez impérativement améliorer votre assiduité 
        aux prochaines répétitions. Contactez votre chef de pupitre ou la direction si vous rencontrez 
        des difficultés particulières.
      </p>
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
      Nous comptons sur votre engagement pour le succès de notre concert.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//18 done
export const createEliminationNoticeTemplate = ({
  firstName,
  lastName,
  reason,
  notes,
  concertTitle = null,
  attendanceRate = null,
  threshold = null,
  eliminatedAt,
}) => {
  const isAbsenceBased = reason === "absence_threshold";

  // ✅ UPDATED: Both types get concert-specific subject
  const subject = `Élimination du Concert "${concertTitle}"`;

  const formattedDate = new Date(eliminatedAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const reasonTitle = isAbsenceBased
    ? "Taux de Présence Insuffisant"
    : "Mesure Disciplinaire";
  const reasonIcon = isAbsenceBased ? "📉" : "⚠️";
  const reasonColor = isAbsenceBased ? "#dc2626" : "#ea580c";

  // ✅ UPDATED: Both types mention concert-specific elimination
  const headerContent = `
    <h2 style="font-size:22px;color:#dc2626;">
      <strong>Élimination du Concert</strong>
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,<br/>
      Nous vous informons que votre participation au concert <strong>"${concertTitle}"</strong> n’a pas été retenue.
    </p>
  `;

  const bodyContent = `
    <div style="background:#fef2f2;padding:25px;border-radius:8px;margin:25px 0;border-left:4px solid ${reasonColor};">
      <h3 style="color:${reasonColor};margin-top:0;font-size:18px;">${reasonIcon} ${reasonTitle}</h3>
      <p style="color:${reasonColor};margin-bottom:0;font-weight:500;">
        Votre participation au concert <strong>"${concertTitle}"</strong> n’a pas été retenue 
        ${
          isAbsenceBased
            ? "en raison d'un taux de présence insuffisant aux répétitions"
            : "suite à une décision disciplinaire"
        }.
      </p>
    </div>

    ${/* ✅ Show attendance details for BOTH types (context) */ ""}
    <div style="background:#fff3cd;padding:20px;border-radius:8px;margin:25px 0;border-left:4px solid #ffc107;">
      <h4 style="color:#856404;margin-top:0;">📊 Informations sur le Concert</h4>
      <div style="background:white;padding:15px;border-radius:6px;">
        <p style="margin:4px 0;"><strong>Concert concerné :</strong> ${concertTitle}</p>
        ${
          attendanceRate !== null
            ? `<p style="margin:4px 0;"><strong>Votre taux de présence :</strong> ${Math.round(
                attendanceRate
              )}%</p>`
            : ""
        }
        ${
          threshold !== null
            ? `<p style="margin:4px 0;"><strong>Seuil requis :</strong> ${Math.round(
                threshold
              )}%</p>`
            : ""
        }
        <p style="margin:4px 0;"><strong>Raison :</strong> ${
          isAbsenceBased ? "Assiduité insuffisante" : "Mesure disciplinaire"
        }</p>
      </div>
    </div>

    ${
      notes
        ? `
    <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:25px 0;border:1px solid #e5e7eb;">
      <h4 style="color:#374151;margin-top:0;">📝 Notes Additionnelles</h4>
      <p style="color:#6b7280;margin:0;font-style:italic;">
        "${notes}"
      </p>
    </div>
    `
        : ""
    }

  

    <div style="text-align:center;padding:25px;background:#f8fafc;border-radius:8px;margin:25px 0;">
      <h4 style="color:#4b5563;margin:0 0 10px 0;font-size:18px;">🙏 Remerciements</h4>
      <p style="color:#6b7280;margin:0;line-height:1.6;">
        Nous vous remercions pour votre engagement et espérons vous voir lors des prochains concerts.
      </p>
    </div>

  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//19 done
export const createManagerBroadcastTemplate = ({
  choristeFirstName,
  choristeLastName,
  choristerPupitre,
  managerName,
  messageContent,
}) => {
  const subject = `Message Important du Manager`;

  const headerContent = `
    <h2 style="font-size:22px;color:#1e3a5f;">
      <strong>📢 MESSAGE IMPORTANT</strong>
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Cher(e) <strong>${choristeFirstName} ${choristeLastName}</strong>,<br/>
      Le manager <strong>${managerName}</strong> vous adresse ce message important.
    </p>
  `;

  const bodyContent = `
  
    <div style="background:#f8f6f3;padding:25px;border-radius:8px;margin:25px 0;">
      <h4 style="color:#4b2e2e;margin-top:0;">💬 Message:</h4>
      <div style="background:white;padding:20px;border-radius:6px;border-left:4px solid #c19a6b;">
        <p style="color:#333;line-height:1.6;margin:0;white-space:pre-line;">${messageContent}</p>
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
      Merci de prendre note de ce message important.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//20 done
export const createChefPupitreMessageTemplate = ({
  choristeFirstName,
  choristeLastName,
  choristerPupitre,
  chefName,
  messageContent,
}) => {
  const subject = `Message Important de votre Chef de Pupitre`;

  const headerContent = `
    <h2 style="font-size:22px;color:#28a745;">
      <strong>📢 MESSAGE IMPORTANT </strong>
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Cher(e) <strong>${choristeFirstName} ${choristeLastName}</strong>,<br/>
      Votre Chef de Pupitre <strong>${chefName}</strong> (${choristerPupitre}) vous adresse ce message important.
    </p>
  `;

  const bodyContent = `
  

    <div style="background:#f8f6f3;padding:25px;border-radius:8px;margin:25px 0;">
      <h4 style="color:#4b2e2e;margin-top:0;">💬 Message de votre Chef de Pupitre:</h4>
      <div style="background:white;padding:20px;border-radius:6px;border-left:4px solid #28a745;">
        <p style="color:#333;line-height:1.6;margin:0;white-space:pre-line;">${messageContent}</p>
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
      Message important pour le pupitre <strong>${choristerPupitre}</strong>.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//21 done
export const createComprehensiveWarningTemplate = ({
  firstName,
  lastName,
  // Repetition data
  repetitionAttendanceRate,
  repetitionAbsencesCount,
  totalRepetitions,
  repetitionDetails = [],
  // Concert data
  concertAttendanceRate,
  concertAbsencesCount,
  totalConcerts,
  concertDetails = [],
  // General data
  threshold,
  overallMessage,
}) => {
  const subject = `Avertissement - Taux de présence insuffisant`;

  const headerContent = `
    <h2 style="font-size:22px;color:#f59e0b;">
      <strong>Avertissement Important</strong>
    </h2>
    <p style="font-size:16px;color:#6d5b4c;">
      Cher(e) <strong>${firstName} ${lastName}</strong>,<br/>
      Votre taux de présence nécessite votre attention immédiate.
    </p>
  `;

  // Create repetition details table
  const repetitionRows =
    repetitionDetails.length > 0
      ? repetitionDetails
          .map((rep) => {
            const repDate = new Date(rep.date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const statusIcon = rep.attended ? "✅" : "❌";
            const statusText = rep.attended ? "Présent(e)" : "Absent(e)";
            const statusColor = rep.attended ? "#10b981" : "#ef4444";
            const reasonText =
              !rep.attended && rep.reason ? ` - ${rep.reason}` : "";

            return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; text-align: left; font-size: 14px;">${repDate}</td>
        <td style="padding: 8px; text-align: left; font-size: 14px;">${
          rep.location || "Non défini"
        }</td>
        <td style="padding: 8px; text-align: left; font-size: 14px;">${
          rep.concertTitle || "Concert non défini"
        }</td>
        <td style="padding: 8px; text-align: center;">
          <span style="color: ${statusColor}; font-weight: 600; font-size: 12px;">
            ${statusIcon} ${statusText}${reasonText}
          </span>
        </td>
      </tr>
    `;
          })
          .join("")
      : "";

  // Create concert details table
  const concertRows =
    concertDetails.length > 0
      ? concertDetails
          .map((concert) => {
            const concertDate = new Date(concert.dateHeure).toLocaleDateString(
              "fr-FR",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              }
            );
            const statusIcon = concert.available ? "✅" : "❌";
            const statusText = concert.available ? "Disponible" : "Absent(e)";
            const statusColor = concert.available ? "#10b981" : "#ef4444";
            const reasonText =
              !concert.available && concert.reason
                ? ` - ${concert.reason}`
                : "";

            return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px; text-align: left; font-size: 14px;">${concertDate}</td>
        <td style="padding: 8px; text-align: left; font-size: 14px;">${concert.title}</td>
        <td style="padding: 8px; text-align: center;">
          <span style="color: ${statusColor}; font-weight: 600; font-size: 12px;">
            ${statusIcon} ${statusText}${reasonText}
          </span>
        </td>
      </tr>
    `;
          })
          .join("")
      : "";

  const bodyContent = `
    <div style="background:#fef3c7;padding:25px;border-radius:8px;margin:25px 0;border-left:4px solid #f59e0b;">
      <h3 style="color:#92400e;margin-top:0;font-size:18px;">⚠️ Situation Critique</h3>
      <p style="color:#92400e;margin-bottom:0;">
        ${
          overallMessage ||
          "Votre taux de participation aux répétitions et concerts est insuffisant. Vous risquez l'élimination si votre participation ne s'améliore pas rapidement."
        }
      </p>
    </div>

    <!-- ✅ UPDATED: Simplified Statistics Section -->
    <div style="background:white;padding:25px;border-radius:10px;margin:20px 0;border-left:5px solid #ef4444;">
      <h3 style="color:#374151;margin:0 0 20px 0;font-size:18px;font-weight:600;">
        📊 Votre Situation Actuelle
      </h3>
      
  

      <!-- REPETITION Attendance -->
      <div style="background:#f9fafb;padding:20px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:15px;">
        <h4 style="color:#374151;margin:0 0 15px 0;font-size:16px;font-weight:600;">📝 Répétitions</h4>
        
        <div style="margin-bottom:15px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:600;color:#374151;">Votre taux de présence</span>
            <span style="font-size:24px;font-weight:700;color:${
              repetitionAttendanceRate >= threshold ? "#10b981" : "#ef4444"
            };">${Math.round(repetitionAttendanceRate)}%</span>
          </div>
          <div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;">
            <div style="background:${
              repetitionAttendanceRate >= threshold ? "#10b981" : "#ef4444"
            };height:100%;width:${Math.min(
    repetitionAttendanceRate,
    100
  )}%;transition:width 0.3s;"></div>
          </div>
        </div>

        <!-- Repetition Details -->
        <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin-top:20px;">
          <div style="grid:template-columns:1fr 1fr;gap:10px;">
            <p style="margin:4px 0;"><strong>Répétitions assurées :</strong> ${
              totalRepetitions - repetitionAbsencesCount
            }/${totalRepetitions}</p>
            <p style="margin:4px 0;color:#ef4444;"><strong>Absences :</strong> ${repetitionAbsencesCount}</p>
          </div>
        </div>
      </div>

      <!-- CONCERT Availability -->
      <div style="background:#f9fafb;padding:20px;border-radius:8px;border:1px solid #e5e7eb;">
        <h4 style="color:#374151;margin:0 0 15px 0;font-size:16px;font-weight:600;">🎵 Concerts</h4>
        
        <div style="margin-bottom:15px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-weight:600;color:#374151;">Votre taux de présences</span>
            <span style="font-size:24px;font-weight:700;color:${
              concertAttendanceRate >= threshold ? "#10b981" : "#ef4444"
            };">${Math.round(concertAttendanceRate)}%</span>
          </div>
          <div style="background:#e5e7eb;height:8px;border-radius:4px;overflow:hidden;">
            <div style="background:${
              concertAttendanceRate >= threshold ? "#10b981" : "#ef4444"
            };height:100%;width:${Math.min(
    concertAttendanceRate,
    100
  )}%;transition:width 0.3s;"></div>
          </div>
        </div>

        <!-- ✅ UPDATED: Concert Details with corrected text -->
        <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin-top:20px;">
          <div style="grid:template-columns:1fr 1fr;gap:10px;">
            <p style="margin:4px 0;"><strong>Concerts assuré :</strong> ${
              totalConcerts - concertAbsencesCount
            }/${totalConcerts}</p>
            <p style="margin:4px 0;color:#ef4444;"><strong>Absences :</strong> ${concertAbsencesCount}</p>
          </div>
        </div>
      </div>
    </div>

    ${
      repetitionRows
        ? `
    <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:25px 0;">
      <h4 style="color:#374151;margin-top:0;">📅 Détail de votre présences aux répétitions</h4>
      <div style="overflow-x:auto;border-radius:6px;border:1px solid #e5e7eb;">
        <table style="width:100%;border-collapse:collapse;background-color:#ffffff;">
          <thead>
            <tr style="background-color:#f9fafb;">
              <th style="padding:10px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;">Date</th>
              <th style="padding:10px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;">Lieu</th>
              <th style="padding:10px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;">Concert</th>
              <th style="padding:10px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${repetitionRows}
          </tbody>
        </table>
      </div>
    </div>
    `
        : ""
    }

    ${
      concertRows
        ? `
    <div style="background:#f9fafb;padding:20px;border-radius:8px;margin:25px 0;">
      <h4 style="color:#374151;margin-top:0;">🎵 Détail de votre présences aux concerts</h4>
      <div style="overflow-x:auto;border-radius:6px;border:1px solid #e5e7eb;">
        <table style="width:100%;border-collapse:collapse;background-color:#ffffff;">
          <thead>
            <tr style="background-color:#f9fafb;">
              <th style="padding:10px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;">Date</th>
              <th style="padding:10px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;">Concert</th>
              <th style="padding:10px;text-align:center;font-size:12px;font-weight:600;color:#6b7280;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${concertRows}
          </tbody>
        </table>
      </div>
    </div>
    `
        : ""
    }

    <div style="background:#fef2f2;padding:20px;border-radius:8px;margin:25px 0;border:1px solid #fecaca;">
      <h4 style="color:#dc2626;margin-top:0;">🎯 Action immédiate requise</h4>
      <p style="color:#7f1d1d;margin:0;line-height:1.6;">
        <strong>Pour éviter l'élimination :</strong> Vous devez impérativement améliorer votre assiduité 
        aux répétitions et marquer votre disponibilité pour les concerts à venir. Contactez votre chef de pupitre 
        ou la direction si vous rencontrez des difficultés particulières.
      </p>
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
      Nous comptons sur votre engagement pour le succès de nos concerts.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};

//22 done
export const createReminderEmailTemplate = ({
  firstName,
  lastName,
  candidateId,
  assignedDate,
  assignedTime,
  assignedEndTime,
}) => {
  const subject = "Rappel - Répondez à votre convocation d'audition";

  const formattedDate = new Date(assignedDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
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
    attachments: COMMON_ATTACHMENTS,
  };
};


//23 done
export const reminderRepetitionTemplateGrouped = (user, repetitions) => {
  const { firstName, lastName } = user;

  const subject = "Vos prochaines répétitions";

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Cher(e) <strong>${firstName} ${lastName}</strong>,</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      Voici les dates des prochaines répétitions
    </p>
  `;

  // --- Card-based body ---
  const bodyContent = `
    ${repetitions
      .map((rep) => {
        const date = new Date(rep.date).toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
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
          ${rep.pupitres && rep.pupitres.length > 0 ? `
          <p style="margin: 8px 0 4px 0;">
            <strong>Pupitres concernés :</strong> 
            ${rep.pupitres.map(pupitre => `
              <span style="
                background: #f0f9ff;
                color: #0369a1;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                margin-right: 4px;
                display: inline-block;
              ">${pupitre}</span>
            `).join('')}
          </p>
          ` : ''}
        </div>
      `;
      })
      .join("")}
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};
