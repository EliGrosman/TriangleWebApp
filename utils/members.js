const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./database.db');

const attendancePositions = ['recruitment', 'events', 'engineering', 'fundraising', 'secretary', 'internal', 'external', 'alumni', 'bi/pd'];
const attributes = ['active', 'brother', 'alumnus', 'eboard', 'server', 'recruitment', 'events', 'engineering', 'fundraising', 'standards', 'nominee'];

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

function updateUserChairs(slackID, chairs) {
  return new Promise((resolve, reject) => {
    db.run(`UPDATE people SET chair = ? WHERE slackID = ?`, [chairs, slackID],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve("Updated!");
        }
      })
  })
}


function getMembersWithProperty(property) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT slackID, fullname FROM people WHERE ${property} = 1`, [], (err, rows) => {
      if (err || !rows) {
        reject(err);
      } else {
        resolve(rows);
      }
    })
  })
}

function isProperty(slackID, attribute) {
  attribute = attribute.toLowerCase();
  return new Promise((resolve, reject) => {
    if (!attributes.includes(attribute)) {
      reject();
    } else {
      db.get(`SELECT * FROM people WHERE slackID = ? AND ${attribute} = 1`, [slackID], (err, row) => {
        if (err || !row) {
          reject();
        } else {
          resolve();
        }
      })
    }
  })
}

function getChairs(slackID) {
  return new Promise((resolve, reject) => {
    let checked = 0;
    let result = [];
    attendancePositions.forEach((committee) => {
      db.get(`SELECT * FROM people WHERE slackID = ? AND chair LIKE '%${committee}%'`, [slackID], (err, row) => {
        if (row) result.push(committee);
        checked++;
        if (checked === attendancePositions.length) {
          if (result.length === 0) reject("not chair")
          else resolve(result);
        }
      })
    })
  })
}

function addEmptyUser() {
  console.log("e")
  return new Promise((resolve, reject) => {
    db.run("INSERT INTO people (fullname, slackID, username, chair) VALUES ('', '', '', '')", [], (err) => {
      if (err) {
        console.log(err)
        reject();
      } else {
        resolve();
      }
    })
  })
}

module.exports = { getUsers, updateUser, updateUserChairs, getMembersWithProperty, isProperty, getChairs, addEmptyUser }