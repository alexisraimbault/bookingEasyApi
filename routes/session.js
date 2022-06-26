var express = require('express');
var moment = require('moment');
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

/* Get booking infos for a session. */
router.get('/booking', async function(req, res, next) {
  const { id:  session_id } = req.query;

  const sessionSettingsQuery = await query(
    `SELECT settings FROM public."Session" WHERE id=${session_id}`,
    []
  );

  const sessionEventsQuery = await query(
    `SELECT e.id, e.from, e.to FROM public."Event" e WHERE e."Session_id"=${session_id}`,
    []
  );

  const sessionSettings = sessionSettingsQuery.rows[0];
  const sessionEvents = sessionEventsQuery.rows;

  if(
      !sessionSettings || 
      !sessionSettings.settings || 
      !sessionSettings.settings.from || 
      !sessionSettings.settings.to || 
      !sessionSettings.settings.ranges || 
      !sessionSettings.settings.types
    ) {
    res.json({
      ok: false,
      error: 'Session settings not fully defined',
    });
  }

  const {
    from, to, ranges, types
  } = sessionSettings.settings;

  // Later spans will be  saved in Session
  const spans = [];

  const nbDays = moment(to).diff(from, 'days');

  for(var dayIdx = 0; dayIdx <= nbDays; dayIdx++){
    ranges.forEach(range => {
      spans.push({
        from: moment(from).add(dayIdx, 'days').hours(range.from.hours).minutes(range.from.minutes),
        to: moment(from).add(dayIdx, 'days').hours(range.to.hours).minutes(range.to.minutes),
        // TODO count later
        count: 1,
      })
    })
  }

  const available = [];

  spans.forEach(span => {
    const nbMinutes = moment(span.to).diff(span.from, 'minutes');

    const eventsOnSpan = sessionEvents.filter(event => moment(event.from).isBetween(span.from, span.to) || moment(event.to).isBetween(span.from, span.to) || (moment(event.from).isBefore(span.from)  && moment(event.to).isAfter(span.to)))

    const availableMinutesArray = Array(Math.round(nbMinutes / 5)).fill(span.count);

    eventsOnSpan.forEach(eventOnSpan =>  {
      const eventNbMinutes = moment(moment.min(eventOnSpan.to, span.to)).diff(moment.max(eventOnSpan.from, span.from), 'minutes');
      const eventOffsetMnutes =  moment(eventOnSpan.from).diff(span.from, 'minutes');
      
      for(var minuteIdx = eventOffsetMnutes > 0 ? Math.round(eventOffsetMnutes / 5) : 0; minuteIdx < (eventOffsetMnutes > 0 ? Math.round(eventOffsetMnutes / 5) : 0) + Math.round(eventNbMinutes / 5); minuteIdx++){
        if(availableMinutesArray.length > minuteIdx) {
          availableMinutesArray[minuteIdx] = availableMinutesArray[minuteIdx] - 1;
        }
      }
    });

    console.log('ALEXIS availableMinutesArray', availableMinutesArray);

    let tmpFrom = -1;

    for(var minuteParser = 0; minuteParser < availableMinutesArray.length; minuteParser++){
      const current5MinutesChunk = availableMinutesArray[minuteParser];
      const isAvailable = current5MinutesChunk > 0;

      if(tmpFrom === -1) {
        if(isAvailable) {
          tmpFrom = minuteParser;
        }
      } else {
        if(!isAvailable || minuteParser === availableMinutesArray.length - 1) {
          const realFromMinutesOffset = tmpFrom * 5;
          const realToMinutesOffset = (minuteParser + 1) * 5;
          
          available.push({
            from: moment(span.from).add(realFromMinutesOffset, 'minutes'),
            to: moment(span.from).add(realToMinutesOffset, 'minutes'),
          });

          tmpFrom = -1;
        }
      }
    }
  });

  res.json({
    ok: true,
    available,
    types,
  });
});

/* Save an event. */
router.post('/booking', function(req, res, next) {
  const { id:  session_id, from, to, infos } = req.body;

  query(
    `INSERT INTO public."Event"("Session_id", "from", "to", infos) values (${session_id}, '${from}', '${to}', '${infos || {}}')`,
    []
    ).then(_res => {
      res.json({ok: true});
    }).catch(err => {
      res.json({err});
    })
});

module.exports = router;