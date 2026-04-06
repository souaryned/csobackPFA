// 📌 Allow only admins
export const isAdmin = (req, res, next) => {
  if (req.auth.role !== "admin") {
    return res.status(403).json({ error: "Accès refusé. Admin uniquement." });
  }
  next();
};

// 📌 Allow only managers
export const isManager = (req, res, next) => {
  if (req.auth.role !== "manager") {
    return res.status(403).json({ error: "Accès refusé. Manager uniquement." });
  }
  next();
};

// 📌 Allow only choristers
export const isChorister = (req, res, next) => {
  if (req.auth.role !== "choriste") {
    return res.status(403).json({ error: "Accès refusé. Choriste uniquement." });
  }
  next();
};

export const isChefDeChoeur = (req, res, next) => {
  if (req.auth.role !== "chef de choeur") {
    return res.status(403).json({ error: "Accès refusé. Chef de chœur uniquement." });
  }
  next();
};

// 📌 Allow only choristers or admins or managers
export const isChoristerOrAdminOrManager = (req, res, next) => {
  const { role } = req.auth;
  if (role !== "choriste" && role !== "admin" && role !== "manager") {
    return res.status(403).json({ error: "Accès refusé. Choriste ou admin uniquement." });
  }
  next();
};

// 📌 Allow only managers or admins
export const isManagerOrAdmin = (req, res, next) => {
  const { role } = req.auth;
  if (role !== "manager" && role !== "admin") {
    return res.status(403).json({ error: "Accès refusé. Choriste ou admin uniquement." });
  }
  next();
};

export const isChoristeOrChef = (req, res, next) => {
  const { role } = req.auth;
  if (role !== "choriste" && role !== "chef de choeur") {
    return res.status(403).json({ error: "Accès refusé. choriste ou chef uniquement." });
  }
  next();
};

export const isAdminOrChef = (req, res, next) => {
  const { role } = req.auth;
  if (role !== "admin" && role !== "chef de choeur") {
    return res.status(403).json({ error: "Accès refusé. Admin ou chef uniquement." });
  }
  next();
};

export const isManagerOrChef = (req, res, next) => {
  const { role } = req.auth;
  if (role !== "manager" && role !== "chef de choeur") {
    return res.status(403).json({ error: "Accès refusé. Manager ou chef uniquement." });
  }
  next();
};

// 📌 Allow all known roles
export const allowAll = (req, res, next) => {
  const { role } = req.auth;
  if (!["admin", "manager", "choriste", "chef de choeur"].includes(role)) {
    return res.status(403).json({ error: "Accès refusé. Rôle non autorisé." });
  }
  next();
};

// 📌 Réservé aux chefs de pupitre
export const isChefDePupitre = (req, res, next) => {
  if (!req.user || !req.user.isChefDePupitre) {
    return res.status(403).json({
      message: "Accès refusé. Réservé aux chefs de pupitre.",
    });
  }
  next();
};

// 📌 Réservé aux choristes
export const isChoriste = (req, res, next) => {
  if (!req.user || req.user.role !== "choriste") {
    return res.status(403).json({
      message: "Accès refusé. Réservé aux choristes.",
    });
  }
  next();
};

// ✅ FIX — Admin OU chef de pupitre (isChefDePupitre=true suffit)
// req.user est le document MongoDB complet (injecté par loggedMiddleware)
export const isAdminOrChefPupitre = (req, res, next) => {
  const role = req.user?.role;
  const isChefDePup = req.user?.isChefDePupitre === true;

  if (role === "admin" || isChefDePup) {
    return next();
  }
  return res.status(403).json({
    message: "Accès réservé aux admins et chefs de pupitre.",
  });
};