const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

// get config vars
dotenv.config();

const generateAccessToken = object => {
  return jwt.sign(object, process.env.TOKEN_SECRET, { expiresIn: '2 days' });
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  // const token = authHeader && authHeader.split('.')[1]

  if (authHeader == null) return res.sendStatus(401)

  jwt.verify(authHeader, process.env.TOKEN_SECRET, (err, user) => {

    if (err) return res.sendStatus(403)

    req.user = user

    next()
  })
}

module.exports = {
  generateAccessToken,
  authenticateToken,
};