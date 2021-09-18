var express = require('express');
var router = express.Router();

const { authenticateToken } = require('../middlewares/authentication.js');
const { query } = require('../query/query.js');

/* Create new session. */
router.post('/', authenticateToken, function(req, res, next) {
  const { id: user_id } = req.user;
  const { name } = req.body;
  
  query(
    `INSERT INTO public."Session"(name, settings, user_id) values ('${name}', '{}', ${user_id}) RETURNING id`,
    []
    ).then(queryResponse => {
      res.json({id: queryResponse.rows[0].id});
    }).catch(err => {
      res.json({err});
    })
});

/* Update a session. */
router.put('/', authenticateToken, async function(req, res, next) {
  const { id, settings } = req.body;
  const { id: user_id } = req.user;
  
  const sessionOwner = await query(`select user_id from public."Session" where id=${id}`);

  if(sessionOwner.rows[0].user_id !== user_id) {
    res.json({ko: 'notSessionOwner'});
  }

  query(
    `UPDATE public."Session" SET settings='${JSON.stringify(settings)}' where id=${id}`,
    []
    ).then(() => {
      res.json({ok: true});
    }).catch(err => {
      res.json({err});
    })
});

/* Get my sessions. */
router.get('/list', authenticateToken, function(req, res, next) {
  const { id, settings } = req.body;
  const { id: user_id } = req.user;

  query(
    `SELECT * FROM public."Session" WHERE user_id=${user_id}`,
    []
    ).then(queryResponse => {
      res.json({sessions: queryResponse.rows});
    }).catch(err => {
      res.json({err});
    })
});

/* Get one session details. */
router.get('/details', authenticateToken, function(req, res, next) {
  const { id:  session_id } = req.query;
  const { id: user_id } = req.user;

  query(
    `SELECT * FROM public."Session" WHERE id=${session_id} AND user_id=${user_id}`,
    []
    ).then(queryResponse => {
      if(queryResponse.rows.length > 0)
        res.json({session: queryResponse.rows[0]});
      else 
        res.json({err});
    }).catch(err => {
      res.json({err});
    })
});

module.exports = router;