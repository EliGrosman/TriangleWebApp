const moment = require('moment-timezone');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./database.db');

function checkToken(token) {
  return new Promise((resolve, reject) => {
    db.get('SELECT meeting, generatedTime FROM attendanceTokens WHERE token = ?', [token], (err, row) => {
      if (err || !row) {
        reject(err);
      } else {
        let timeNow = moment().tz("America/Los_Angeles").unix();
        if (timeNow - moment().unix(parseFloat(row.generatedTime)) > 86400) {
          reject('expired');
        } else {
          resolve(row);
        }
      }
    })
  })
}

function logAttendance(data, takenBy, token) {
  return new Promise((resolve, reject) => {
    let date = moment().tz("America/Los_Angeles").format("M/D/YYYY H:mm");
    let added = 0;
    data.forEach((member) => {
      let here = member.here ? 1 : 0;
      let excused = member.excused ? 1 : 0;
      db.all("SELECT * FROM attendance WHERE token = ?", [token], (err, rows) => {
        if (rows.length === 0) {
          db.run("INSERT INTO attendance (date, takenBy, slackID, here, excused, token) VALUES(?, ?, ?, ?, ?, ?)", [date, takenBy, member.slackID, here, excused, token], (err) => {
            if (err) reject(err);
            added++;
            if (added === data.length) {
              resolve("Success");
            }
          })
        } else {
          reject("exists");
        }
      })
    })
  })
}

function generateToken(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function generateAttendanceUrl(slackID, committee) {
  return new Promise((resolve, reject) => {
    let token = generateToken(15);
    db.get("SELECT * FROM attendanceTokens WHERE token = ?", [token], (err, row) => {
      if (row) resolve(generateAttendanceUrl(slackID, committee, time));
      else if (err) reject(err)
      else {
        let time = moment().tz("America/Los_Angeles").format("M/D/YYYY H:mm");
        db.run("INSERT INTO attendanceTokens (token, meeting, generatedTime) VALUES(?, ?, ?)", [token, committee, time]);
        db.get("SELECT fullname FROM people WHERE slackID = ?", [slackID], (err, row) => {
          if (err || !row) reject()
          else {
            resolve(`http://server.triangleuw.com:5000/attendance?meeting=${committee}&takenBy=${row.fullname.replace(" ", "%20")}&token=${token}`)
          }
        })
      }
    })
  })
}

async function getAttendanceData() {
  let data = [];
  let asyncDb = await createDbConnection("./database.db");

  let tokens = await asyncDb.all("SELECT DISTINCT token, meeting, generatedTime FROM attendanceTokens");
  for (let i = 0; i < tokens.length; i++) {
    let row = tokens[i];
    let attendanceData = await asyncDb.all("SELECT slackID, here, excused FROM attendance WHERE token = ?", [row.token]);
    let takenBy = await asyncDb.all("SELECT DISTINCT takenBY FROM attendance WHERE token = ?", [row.token])
    takenBy = takenBy.map((el) => {
      return (el.takenBy);
    })
    if (attendanceData.length > 0) {
      let attendance = { token: row.token, meeting: row.meeting === 'active' ? 'general' : row.meeting, time: row.generatedTime, takenBy: takenBy, attendance: attendanceData }
      data.push(attendance);
    }
  }
  return (data);
}

async function getAttendanceForToken(token) {
  let asyncDb = await createDbConnection("./database.db");
  let data = await asyncDb.all("SELECT * from attendance WHERE token = ?", [token]);
  for (let i = 0; i < data.length; i++) {
    let member = data[i];
    let fullname = await getFullname(member.slackID);
    member.fullname = fullname;
  }
  return (data);
}

async function getFullname(slackID) {
  let asyncDb = await createDbConnection("./database.db");
  let data = await asyncDb.get("SELECT fullname FROM people WHERE slackID = ?", [slackID]);

  return (data.fullname);
}


function updateAttendance(token, attribute, slackID) {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE attendance SET ${attribute} = ((${attribute} | 1) - (${attribute} & 1)) WHERE slackID = ? AND token = ?`, [slackID, token],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve("Updated!");
        }
      })
  })
}

function deleteAttendance(token) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM attendanceTokens WHERE token = ?", [token], (err) => {
      if(err) {
        reject();
      } else {
        resolve();
      }
    })
  })
}


function createDbConnection(filename) {
  return open({
    filename,
    driver: sqlite3.Database
  });
}

module.exports = { checkToken, logAttendance, getAttendanceData, generateAttendanceUrl, getAttendanceForToken, updateAttendance, deleteAttendance }