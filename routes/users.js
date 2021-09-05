var express = require('express');
var router = express.Router();

const { generateAccessToken, authenticateToken } = require('../middlewares/authentication.js');
const { query } = require('../query/query.js');

/* Creating a new user. */
router.post('/', function (req, res, next) {
  const { firstname, lastname, email, password } = req.body;

  query(
    'INSERT INTO public."User"(firstname, lastname, email, password) values ($1, $2, $3, $4) RETURNING id',
    [firstname, lastname, email, password]
  ).then(queryResponse => {
    const token = generateAccessToken({
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      email: req.body.email,
      id: queryResponse.rows[0].id,
    });

    res.json({ token, firstname, lastname, email, id: queryResponse.rows[0].id });
  }).catch(err => {
    res.json({ err });
  })
});

/* Login to my account. */
router.get('/login', function (req, res, next) {
  const { email, password } = req.query;

  query(
    `SELECT * FROM public."User" where email='${email}' and password='${password}'`,
    []
  ).then(queryResponse => {
    const { firstname, lastname, id, email } = queryResponse.rows[0];

    const token = generateAccessToken({
      firstname,
      lastname,
      email,
      id,
    });

    res.json({ token, firstname, lastname, email, id });
  }).catch(err => {
    res.json({ err });
  })
});

module.exports = router;
