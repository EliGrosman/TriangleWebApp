const { default: Axios } = require('axios');
const { promiseImpl } = require('ejs');
const moment = require('moment-timezone');
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./database.db');
const axios = require('axios')

function recordOneOnOne(payload) {
  var userID = payload.user.id.toString();
  var partnerID = payload.submission.user.toString();
  var comment = payload.submission.comment.toString().trim();
  return new Promise((resolve, reject) => {
    if (!comment) {
      reject(425);
    } else if (userID === partnerID) {
      reject(426);
    } else {
      let time = moment().tz("America/Los_Angeles").format();
      db.get("SELECT * FROM records WHERE slackID1 = ? AND slackID2 = ?", [userID, partnerID], (err, row) => {
        if (!row) {
          db.run("INSERT INTO records (slackID1, slackID2, completedDate, comment) VALUES (?, ?, ?, ?)", [userID, partnerID, time, comment], (error) => {
            if (error) {
              reject(423);
            } else {
              resolve("Success!");
            }
          });
        } else {
          reject(422);
        }
      });
    }
  })
}


function getCompleted(slackID) {
  return new Promise((resolve, reject) => {
    db.all("SELECT DISTINCT(p.slackID) FROM people p, records r WHERE (r.slackID1 = ? AND r.slackID2 = p.slackID)", [slackID], (err, completed) => {
      if (completed.length === 0) {
        reject(0);
      } else {
        let data = [];
        let added = 0;
        for(let i = 0; i < completed.length; i++) {
          let partnerID = completed[i].slackID;
          db.get("SELECT r.slackID1 FROM records r WHERE (r.slackID1 = ? AND r.slackID2 = ?)", [partnerID, slackID], (err, row) => {
            data.push({ "slackID": partnerID, "completed": row ? true : false });
            added++;
            if (added === completed.length) {
              resolve(data);
            }
          })
        }
      }
    })
  })
}

function getIncomplete(slackID) {
  return new Promise((resolve, reject) => {
    db.all("SELECT pe.slackID FROM (SELECT slackID FROM people WHERE active = 1 AND slackID != ? ORDER BY fullname ASC) pe WHERE pe.slackID NOT IN (SELECT DISTINCT(p.slackID) FROM people p, records r WHERE (r.slackID1 = ? AND r.slackID2 = pe.slackID) OR (r.slackID1 = p.slackID AND r.slackID2 = ?))", [slackID, slackID, slackID],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      })
  })
}

function getOneOnOnes() {
  return new Promise((resolve, reject) => {
    db.all('SELECT p.slackID, p.fullname, p.username, COUNT(r1.slackID1) n FROM people p, records r1, records r2 WHERE (r1.slackID1 = r2.slackID2 AND r2.slackID1 = r1.slackID2) AND r1.slackID1 = p.slackID GROUP BY p.slackID ORDER BY n DESC',
      [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      })
  })
}

function getUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM people', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    })
  })
}

function sendError(res, errCode, text) {
  let message = text;
  if (!message) {
    message = "An error has occured! Please try again or contact Eli if this keeps occuring."
  }
  if (errCode) {
    message += " Error code: " + errCode;
  }
  res.send({
    text: message,
    response_type: 'ephemeral'
  })
}

function updateUser(slackID, attribute) {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE people SET ${attribute} = ((${attribute} | 1) - (${attribute} & 1)) WHERE slackID = ?`, [slackID],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve("Updated!");
        }
      })
  })
}

function sendDM(slackID, message) {
  return new Promise((resolve, reject) => {
    const slackAccessToken = process.env.BOT_USER_TOKEN
    let url = 'https://slack.com/api/chat.postMessage';
    let data = `?token=${slackAccessToken}&channel=${slackID}&text=${message}`;
    axios.post(url + data).then((response) => {
      resolve(response);
    }).catch((err) => {
      reject(err);
    })
  })
}

module.exports = { recordOneOnOne, getCompleted, getIncomplete, getOneOnOnes, getUsers, sendError, updateUser, sendDM }