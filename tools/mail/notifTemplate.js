import { FRONTEND_URL } from '../../config.js';

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
      <strong>L’équipe administrative du CSO</strong>
    </div>
  </div>
`;

export const createAccountEmailTemplate = (user) => {
  const { firstName, lastName, email, password } = user;

  const subject = '🎼 Orchestre Symphonique de Carthage';

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Cher(e) <strong>${firstName} ${lastName}</strong>,</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      Bienvenue parmi les artistes de l'Orchestre Symphonique de Carthage (CSO).
    </p>
  `;

  const bodyContent = `
    <p>Votre compte a été <strong>activé avec succès</strong>. Voici vos identifiants pour accéder à votre espace :</p>

    <div style="background: #f4f0ea; padding: 18px; border-radius: 6px; margin: 25px 0; font-family: 'Courier New', monospace; color: #3c2f2f;">
      <p><strong>Email :</strong> <a href="mailto:${email}" style="color: #7b3e19;">${email}</a></p>
      <p><strong>Mot de passe :</strong> ${password}</p>
    </div>

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
    🎵 Se connecter
  </a>
</div>

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
      Merci de confirmer votre présence ou d’indiquer votre absence sur votre espace personnel.
    </p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};



export const createRejectionEmailTemplate = ({ firstName, lastName, reason }) => {
  const subject = "Candidature refusée – Orchestre CSO";

  const headerContent = `
    <h2 style="font-size: 22px; color: #4b2e2e;">Cher(e) <strong>${firstName} ${lastName}</strong>,</h2>
    <p style="font-size: 16px; color: #6d5b4c;">
      Nous vous remercions d’avoir postulé pour rejoindre l’Orchestre Symphonique de Carthage (CSO).
    </p>
  `;

  const bodyContent = `
    <p>Après examen de votre demande, nous sommes au regret de vous informer que votre candidature a été <strong>refusée</strong>.</p>

    <div style="background: #f9eae3; padding: 15px 20px; margin: 20px 0; border-left: 6px solid #c0392b; border-radius: 4px; color: #6d4c41;">
      <strong>Raison :</strong> ${reason}
    </div>

    <p>Nous vous remercions pour votre intérêt et vous souhaitons pleine réussite dans vos futurs projets artistiques.</p>
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

    <p>Merci de traiter cette demande dans l’interface de gestion.</p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
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

    <p>Merci pour votre implication au sein de l’orchestre.</p>
  `;

  return {
    subject,
    htmlContent: generateEmailTemplate(subject, headerContent, bodyContent),
    attachments: COMMON_ATTACHMENTS,
  };
};