const sqlite3 = require('sqlite3').verbose();
let db = new sqlite3.Database('./database.db');

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

module.exports = { checkLoginToken }