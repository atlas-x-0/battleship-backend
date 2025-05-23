// server/middleware/auth.js
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ msg: 'No token detected, authorization denied' });
  }

  try {
    req.user = { id: token };
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ msg: 'Invalid token' });
  }
};

export default auth; 
