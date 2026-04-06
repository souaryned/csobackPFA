// middlewares/authMiddlewares.js
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { JWT_SECRET } from '../config.js';

export const loggedMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ message: 'Access denied. Token missing or malformed.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    // ✅ Force logout if account is locked
    if (user.isLocked) {
      return res.status(403).json({ message: 'Account is locked.' });
    }

    // ✅ req.user = document MongoDB complet
    //    → donne accès à user.role, user.isChefDePupitre, user.pupitre, etc.
    req.user = user;

    req.auth = {
      userId: user._id,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};