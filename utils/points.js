const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./database.db');

const committees = ['recruitment', 'events', 'engineering', 'fundraising'];
const branches = ['internal', 'external']

const GM_attendanceValue = 100;
const CM_attendanceValue = 100;
const alumni_attendanceValue = 50;
const branch_attendanceValue = 50;
const BIPD_attendanceValue = 100;
const oneOnOnesPointVal = 100;


function createPointsCode(slackID, channelID, value, description, uses) {
  return new Promise((resolve, reject) => {
    let code = generateToken(10);
    db.run("INSERT INTO pointCodes (code, value, description, uses, timesUsed) VALUES (?, ?, ?, ?, 0)", [code, value, description, uses], err => {
      if (err) {
        if (slackID !== "server") {
          sendEph(slackID, channelID, `An error has occured. Please try again or contact Eli if this keeps occuring.`);
        }
        reject(err);
      } else {
        if (slackID !== "server") {
          sendEph(slackID, channelID, `Code: '${code}' created successfully!`);
        }
        resolve(code);
      }
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

function redeemCode(slackID, code) {
  return new Promise((resolve, reject) => {
    db.get("SELECT uses, timesUsed FROM pointCodes WHERE code = ?", [code], (err, row) => {
      if (err || !row) {
        reject(err);
      } else {
        let timesUsed = row.timesUsed;
        if (row.uses === timesUsed) {
          reject("used too much");
        } else {
          db.get("SELECT * FROM points WHERE slackID = ? AND code = ?", [slackID, code], (err, row) => {
            if (err || row) {
              reject("user already used");
            } else {
              db.run("UPDATE pointCodes SET timesUsed = ? WHERE code = ?", [timesUsed + 1, code], err => {
                if (err) {
                  reject(err);
                } else {
                  db.run("INSERT INTO points (slackID, code) VALUES (?, ?)", [slackID, code], err => {
                    if (err) {
                      reject(err)
                    } else {
                      sumPoints(slackID).then((points) => {
                        resolve(points);
                      }).catch(() => {
                        reject();
                      })
                    }
                  })
                }
              })
            }
          })
        }
      }
    })
  })
}

function sumPoints(slackID) {
  return new Promise((resolve, reject) => {
    db.all("SELECT value FROM points p INNER JOIN pointCodes pc ON p.code = pc.code WHERE p.slackID = ?", [slackID], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        let codes = rows;
        db.all("SELECT s.itemVal AS itemVal, p.customVal AS customVal FROM purchases p INNER JOIN shopItems s ON p.itemId = s.id WHERE p.slackID = ?", [slackID], (err, rows) => {
          if (err) {
            reject(err);
          } else {
            let purchases = rows;
            db.all("SELECT COUNT(*) AS count, at.meeting AS meeting FROM attendance a JOIN attendanceTokens at ON a.token = at.token WHERE a.slackID = ? AND a.here = 1 AND a.token IN (SELECT DISTINCT(token) from attendanceTokens) GROUP BY at.meeting", [slackID], (err, attendance) => {
              if (err) {
                reject(err);
              } else {
                db.get("SELECT COUNT(*) AS count FROM records WHERE slackID1 = ?", [slackID], (err, oneOnOnes) => {
                  if (err || !oneOnOnes) {
                    reject(err);
                  } else {
                    let sum = 0;

                    // add points from codes
                    codes.forEach(row => {
                      sum += row.value;
                    })

                    // add points from attendance
                    if(attendance) {
                      attendance.forEach(a => {
                        if(a.meeting === "active") {
                          sum += GM_attendanceValue * a.count;
                        } else if (committees.includes(a.meeting)) {
                          sum += CM_attendanceValue * a.count;
                        } else if (a.meeting === "alumni") {
                          sum += alumni_attendanceValue * a.count;
                        } else if(branches.includes(a.meeting)) {
                          sum += branch_attendanceValue * a.count;
                        } else if (a.meeting === "bi/pd") {
                          sum += BIPD_attendanceValue * a.count;
                        }
                      })    
                    }

                    // add points from one on ones
                    sum += oneOnOnes.count * oneOnOnesPointVal;

                    // subtract points from purchases
                    purchases.forEach(row => {
                      if (row.customVal > 0) {
                        sum -= row.customVal;
                      } else {
                        sum -= row.itemVal;
                      }
                    })
                    resolve(sum);
                  }
                })
              }
            })
          }
        })
      }
    })
  })
}

module.exports = { createPointsCode, redeemCode, sumPoints }