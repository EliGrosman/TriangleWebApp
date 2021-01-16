const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./database.db');

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
        db.get('SELECT * FROM purchases p JOIN shopItems s ON p.itemID = s.id WHERE p.slackID = ? AND p.itemID = ? AND s.oneTime = 1', [slackID, itemID], (err, purchased) => {
          if (purchased) {
            reject("already purchased")
          } else if(err) {
            reject();
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
    db.run("INSERT INTO shopItems (itemName, customVal, forMember, message, oneTime, cringe, exercise) VALUES (' ', 0, 0, 0, 0, 0, 0)", [], (err) => {
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

module.exports = { getShopItems, getItemInfo, purchaseItem, updateShopItem, addEmptyItem, deleteShopitem, calculateFund }