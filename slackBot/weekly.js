const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const { sendDM } = require('../utils/slack.js');

const completedNoneQuery = "SELECT DISTINCT(p.slackID), p.fullname, COUNT(p.slackID) - 1 count FROM people p WHERE p.active = 1 AND p.slackID NOT IN (SELECT slackID1 FROM records) AND p.slackID NOT IN (SELECT slackID2 FROM records) GROUP BY p.slackID";
const completedSomeQuery = "SELECT slackID, fullname, COUNT(r.slackID1) count FROM people p, records r WHERE p.active = 1 AND r.slackID1 = p.slackID GROUP BY p.slackID ORDER BY count ASC";
const twoGuysQuery = "SELECT pe.slackID AS slackID, pe.fullname AS fullname FROM people pe WHERE pe.active = 1 AND pe.fullname NOT IN (SELECT DISTINCT(p.fullname) FROM people p, records r WHERE (r.slackID1 = ? AND r.slackID2 = p.slackID) OR (r.slackID1 = p.slackID AND r.slackID2 = ?)) AND pe.slackID != ? AND (SELECT COUNT(*) FROM weekly WHERE p1_slackID = pe.slackID) < 2 ORDER BY RANDOM() LIMIT 2";

function createDbConnection(filename) {
  return open({
    filename,
    driver: sqlite3.Database
  });
}

// Generate the weekly assignmetns
async function genWeekly() {
  let db = await createDbConnection('./database.db')

  let data = [];
  // reset weekly assignments
  await db.run("DELETE FROM weekly", []);
  const completedNone = await db.all(completedNoneQuery, []);
  const completedSome = await db.all(completedSomeQuery, []);
  // Combine these with those who have completed none coming first
  // NOTE: This is to prioritize assigning one-on-ones to guys who haven't completed any
  let actives = await completedNone.concat(completedSome);
  for (let i = 0; i < actives.length; i++) {
    let activeID = actives[i].slackID;

    // Get the number of one-on-ones already assigned
    const numAssigned = await db.get("SELECT count(*) AS count FROM weekly WHERE p1_slackID = ?", [activeID])
    // num is the amount of one-on-ones to assign
    // NOTE: If a user is assigned one already, only assign them one more
    let num = 2 - numAssigned.count;

    // Get two users (at random) to assign 
    const twoGuys = await db.all(twoGuysQuery, [activeID, activeID, activeID]);

    // We want to assign this user the correct amount of one-on-ones 
    // This is 2 (if they aren't assigned any) 
    // 1 (if they're assigned 1) 
    // or 0 (if they're already assigned 2)
    let m = Math.min(twoGuys.length, num);
    if (m !== 0) {
      for (let j = 0; j < m; j++) {
        let partnerID = twoGuys[j].slackID;
        await db.run("INSERT INTO weekly (p1_slackID, p2_slackID) VALUES (?, ?)", [activeID, partnerID]);
        data.push({ p1_slackID: actives[i].fullname, p2_slackID: twoGuys[j].fullname });
        await db.run("INSERT INTO weekly (p1_slackID, p2_slackID) VALUES (?, ?)", [partnerID, activeID]);
        data.push({ p1_slackID: twoGuys[j].fullname, p2_slackID: actives[i].fullname });
      }
    }
  }
  return (data);
}

async function sendWeekly() {
  let db = await createDbConnection('./database.db')

  let actives = await db.all("SELECT slackID, fullname FROM people WHERE active = 1");
  for (let i = 0; i < actives.length; i++) {
    let active = actives[i];
    const myTwo = await db.all("SELECT p2_slackID FROM weekly WHERE p1_slackID = ?", [active.slackID]);

    let message = "";
    if (myTwo.length === 0) {
      message = `Hi <@${active.slackID}>! You do not have any recommended one-on-ones this week. \n`;
    } else {
      message = `Hi <@${active.slackID}>! This week your recommended one-on-ones are with: \n`;
    }

    for (let j = 0; j < myTwo.length; j++) {
      message += `- <@${myTwo[j].p2_slackID}> \n`
    }

    message += "Again, these are no consequences for not completing these. These are just to help you decide who to do a one-on-one with next! \n Please let <@UDCLQH6EN> know if there are any issues (for example, if you were assigned someone you already did a one-on-one with).";
    await sendDMSleep(sendDM, active.slackID, message);
  }
}

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function sendDMSleep(func, slackID, message) {
  await timeout(2000);
  return func(slackID, message);
}






module.exports = { sendWeekly, genWeekly }