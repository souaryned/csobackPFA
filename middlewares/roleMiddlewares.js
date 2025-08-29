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



// 📌 Allow only choristers or admins
export const isChoristerOrAdminOrManager = (req, res, next) => {
  const { role } = req.auth;
  if (role !== "choriste" && role !== "admin" && role !== "manager") {
    return res.status(403).json({ error: "Accès refusé. Choriste ou admin uniquement." });
  }
  next();
};



// 📌 Allow only choristers or admins
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



// 📌 Allow all known roles: admin, manager, choriste
export const allowAll = (req, res, next) => {
  const { role } = req.auth;
  if (!["admin", "manager", "choriste","chef de choeur"].includes(role)) {
    return res.status(403).json({ error: "Accès refusé. Rôle non autorisé." });
  }
  next();
};




