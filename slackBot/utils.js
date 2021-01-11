const { default: Axios } = require('axios');
const { promiseImpl, resolveInclude } = require('ejs');
const moment = require('moment-timezone');
const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./database.db');
const axios = require('axios')
const { open } = require('sqlite');
const { shop_modal, nextPage_modal, customVal_block, forMember_block, message_block } = require('./dialogs')
const queryString = require('query-string');

const committees = ["recruitment", "events", "engineering", "fundraising", "secretary"];
const attributes = ['active', 'brother', 'alumnus', 'eboard', 'server', 'recruitment', 'events', 'engineering', 'fundraising', 'standards', 'nominee'];

const fundGoal = 10000;
const attendancePointVal = 10;
const oneOnOnesPointVal = 20;

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
      let time = moment().tz("America/Los_Angeles").format("M/D/YYYY H:mm");
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
        for (let i = 0; i < completed.length; i++) {
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

function sendDM(slackID, message) {
  return new Promise((resolve, reject) => {
    const slackAccessToken = process.env.BOT_USER_TOKEN
    let url = 'https://slack.com/api/chat.postMessage';
    let data = `?token=${slackAccessToken}&channel=${slackID}&text=${message}&pretty=1`;
    axios.post(url + data).then((response) => {
      resolve(response);
    }).catch((err) => {
      reject(err);
    })
  })
}

function sendEph(slackID, channelID, message) {
  return new Promise((resolve, reject) => {
    const slackAccessToken = process.env.BOT_USER_TOKEN
    let url = 'https://slack.com/api/chat.postEphemeral';
    let data = `?token=${slackAccessToken}&channel=${channelID}&text=${message}&user=${slackID}`;
    axios.post(url + data).then((response) => {
      resolve(response);
    }).catch((err) => {
      reject(err);
    })
  })
}

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

function getCommitteeMembers(meeting) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT slackID, fullname FROM people WHERE ${meeting} = 1`, [], (err, rows) => {
      if (err || !rows) {
        reject(err);
      } else {
        resolve(rows);
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

function isChair(slackID) {
  return new Promise((resolve, reject) => {
    let checked = 0;
    let result = [];
    committees.forEach((committee) => {
      db.get(`SELECT * FROM people WHERE slackID = ? AND chair LIKE '%${committee}%'`, [slackID], (err, row) => {
        if (row) result.push(committee);
        checked++;
        if (checked === committees.length) {
          if (result.length === 0) reject("not chair")
          else resolve(result);
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
            resolve(`http://server.eligrosman.com:5000/attendance?meeting=${committee}&takenBy=${row.fullname.replace(" ", "%20")}&token=${token}`)
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

function createDbConnection(filename) {
  return open({
    filename,
    driver: sqlite3.Database
  });
}

function checkLoginToken(token) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM loginTokens WHERE token = ?", [token], (err, row) => {
      if (err || !row) {
        reject();
      } else {
        resolve();
      }
    })
  })
}

function isAttribute(slackID, attribute) {
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
            db.get("SELECT COUNT(*) AS count FROM attendance WHERE slackID = ? AND here = 1", [slackID], (err, attendance) => {
              if (err || !attendance) {
                reject(err);
              } else {
                db.get("SELECT COUNT(*) AS count FROM records WHERE slackID1 = ?", [slackID], (err, oneOnOnes) => {
                  if (err || !attendance) {
                    reject(err);
                  } else {
                    let sum = 0;

                    // add points from codes
                    codes.forEach(row => {
                      sum += row.value;
                    })

                    // add points from attendance
                    sum += attendance.count * attendancePointVal;

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

function getShopItems() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM shopItems', [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    })
  })
}

function getItemInfo(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM shopItems WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    })
  })
}

function purchaseItem(slackID, itemID, customVal, forMember, message) {
  return new Promise((resolve, reject) => {
    db.get('SELECT itemVal, itemName FROM shopItems WHERE id = ?', [itemID], (err, row) => {
      if (err || !row) {
        reject();
      } else {
        db.get('SELECT * FROM purchases WHERE slackID = ? AND itemID = ?', [slackID, itemID], (err, purchased) => {
          if(err || purchased) {
            reject("already purchased")
          } else {
            let value = row.itemVal;
            if (customVal) {
              value = customVal;
            }
            let itemName = row.itemName;
            sumPoints(slackID).then((points) => {
              if (points < value) {
                reject("not enough")
              } else {
                let cusVal = customVal ? customVal : 0;
                let forMem = forMember ? forMember : "N/A";
                let mess = message ? message : "N/A";
                db.run('INSERT INTO purchases (slackID, itemId, customVal, forMember, message) VALUES(?, ?, ?, ?, ?)', [slackID, itemID, cusVal, forMem, mess], (err) => {
                  if (err) reject();
                  else resolve(itemName);
                })
              }
            })
          }
        })
      }
    })
  })
}

function populateShopModal(itemID, points) {
  return new Promise((resolve, reject) => {
    getItemInfo(itemID).then(data => {
      calculateFund().then(fund => {
        let percent = (fund / fundGoal) * 100;
        let numBoxes = Math.ceil((percent / 10)) >= 10 ? 10 : Math.ceil((percent / 10));
        let goalBar = "";
        for (let i = 0; i < numBoxes; i++) {
          goalBar += '█';
        }

        for (let i = 0; i < 10 - numBoxes; i++) {
          goalBar += '_';
        }

        let modal = Object.assign({}, shop_modal);
        modal.private_metadata = "" + data.id;

        modal.blocks[0].text.text = `You have ${points} points!`;
        modal.blocks[2].text.text = `We are ${Math.ceil(percent)}% to our goal to get a dunk tank! \n ${goalBar} ${fund}/10,000 points`
        modal.blocks[4].fields[0].text = `*Item:*\n ${data.itemName}`
        modal.blocks[4].fields[1].text = `*Value:*\n ${!data.customVal ? data.itemVal : 'Custom value'}`
        modal.blocks[4].fields[2].text = `*Description:*\n ${data.itemDesc}`

        resolve(modal);
      })
    }).catch(() => {
      reject();
    })
  })
}

function shopGoBack(currentItemID) {
  return new Promise((resolve, reject) => {
    getShopItems().then(data => {
      let currentIndex = data.findIndex(el => {
        return (el.id === currentItemID);
      })

      if (data[currentIndex - 1]) {
        resolve(data[currentIndex - 1].id);
      } else {
        resolve(data[data.length - 1].id);
      }
    })
  }).catch(err => {
    resolve(err);
  })
}

function shopGoNext(currentItemID) {
  return new Promise((resolve, reject) => {
    getShopItems().then(data => {
      let currentIndex = data.findIndex(el => {
        return (el.id === currentItemID);
      })

      if (data[currentIndex + 1]) {
        resolve(data[currentIndex + 1].id);
      } else {
        resolve(data[0].id);
      }
    })
  }).catch(err => {
    resolve(err);
  })
}

function getNextPage(itemID) {
  return new Promise((resolve, reject) => {
    getItemInfo(itemID).then(data => {
      let modal = JSON.parse(JSON.stringify(nextPage_modal));
      modal.blocks[0].text.text = `To purchase '${data.itemName}' we need some information:`;
      modal.private_metadata = "" + itemID;
      getCommitteeMembers("nominee").then(nominees => {
        if (data.customVal === 1) {
          modal.blocks.push(customVal_block);
        }
        if (data.message === 1) {
          modal.blocks.push(message_block);
        }
        if (data.forMember === 1) {
          let forMember = Object.assign({}, forMember_block);
          forMember.element.options = [];
          for (let i = 0; i < nominees.length; i++) {
            forMember.element.options.push({
              "text": {
                "type": "plain_text",
                "text": nominees[i].fullname,
                "emoji": true
              },
              "value": nominees[i].slackID
            })
          }
          modal.blocks.push(forMember);
        }
        resolve(modal);
      })
    })
  })
}

function updateShopItem(itemID, attribute, value) {
  return new Promise((resolve, reject) => {
    if (!value) {
      db.run(`UPDATE shopItems SET ${attribute} = ((${attribute} | 1) - (${attribute} & 1)) WHERE id = ?`, [itemID],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve("Updated!");
          }
        })
    } else {
      db.run(`UPDATE shopItems SET ${attribute} = ? WHERE id = ?`, [value, itemID], (err) => {
        if (err) {
          reject(err);
        } else {
          resolve("Updated!");
        }
      })
    }
  })
}

function addEmptyItem() {
  return new Promise((resolve, reject) => {
    db.run("INSERT INTO shopItems (itemName, customVal, forMember, message, oneTime) VALUES (' ', 0, 0, 0, 0)", [], (err) => {
      if (err) {
        reject();
      } else {
        resolve();
      }
    })
  })
}

function deleteShopitem(itemID) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM shopItems WHERE id = ?", [itemID], (err) => {
      if (err) {
        reject();
      } else {
        resolve();
      }
    })
  })
}

function calculateFund() {
  return new Promise((resolve, reject) => {
    db.all("SELECT p.customVal AS value FROM purchases p INNER JOIN shopItems s ON p.itemID = s.id WHERE s.itemName = 'Dunk Tank Fund'", [], (err, rows) => {
      if (err || !rows) {
        reject();
      } else {
        let sum = 0;
        rows.forEach(row => {
          sum += row.value;
        })
        resolve(sum);
      }
    })
  })
}

function sendNomination(toSlackID, fromSlackID, challengeName, message) {
  let text = `You have been nominated for '${challengeName}' by <@${fromSlackID}>! `
  if (message) {
    text += `\nTheir message says: '${message}'`;
  }
  text += `\n\n If you need more information on how to complete this challenge, type '/shop' to see its description or check the pinned post in the challenges channel.`
  text += `\n Send proof of completion to the challenges channel or to <@${fromSlackID}> directly!`
  sendDM(toSlackID, text);
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

module.exports = { recordOneOnOne, getCompleted, getIncomplete, getOneOnOnes, getUsers, sendError, sendEph, updateUser, updateUserChairs, checkToken, getCommitteeMembers, logAttendance, isChair, generateAttendanceUrl, getAttendanceData, getAttendanceForToken, sendDM, checkLoginToken, isAttribute, createPointsCode, redeemCode, sumPoints, getShopItems, getItemInfo, purchaseItem, getFullname, populateShopModal, shopGoBack, shopGoNext, getNextPage, updateShopItem, addEmptyItem, deleteShopitem, sendNomination, updateAttendance }