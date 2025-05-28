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

