// server/middleware/auth.js
import mongoose from 'mongoose'; 
import User from '../models/User.js'; 

const auth = async (req, res, next) => { 
  const userIdFromToken = req.header('x-auth-token'); 

  // console.log('[Auth Middleware - Simplified] Received x-auth-token:', userIdFromToken); 

  if (!userIdFromToken) {
    // console.log('[Auth Middleware - Simplified] No token (user ID) found, authorization denied.'); 
    return res.status(401).json({ msg: 'No token (user ID) detected, authorization denied' });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(userIdFromToken)) {
      // console.warn('[Auth Middleware - Simplified] Invalid ObjectId format for token:', userIdFromToken); 
      return res.status(401).json({ msg: 'Token (user ID) format is invalid' });
    }

    const user = await User.findById(userIdFromToken).select('-password'); 

    if (!user) {
      // console.warn('[Auth Middleware - Simplified] User not found for token (user ID):', userIdFromToken); /
      return res.status(401).json({ msg: 'User for token (user ID) not found, authorization denied' });
    }

    req.user = { 
        id: user._id.toString(), 
        username: user.username 
    };
    // console.log('[Auth Middleware - Simplified] User authenticated and set in req:', req.user); 
    next();

  } catch (err) {
    // console.error('[Auth Middleware - Simplified] Error during authentication:', err.message, err.stack); 
    res.status(500).json({ msg: 'Server error during authentication' }); 
  }
};

export default auth;
