var express = require("express");
var router = express.Router();

var { checkToken, getCommitteeMembers, logAttendance } = require('./utils/attendance.js')

router.get("/", function (req, res, next) {
  let token = req.query.token;
  let takenBy = req.query.takenBy;

  console.log(token)
  console.log(takenBy)
  if(!token || !takenBy) {
    res.send("Invalid")
  } else {
    checkToken(token).then((result) => {
      let meeting = result.meeting;
      let committee = result.meeting;
      if(meeting === "alumni" || meeting === "bi/pd")
        committee = "active"
      getCommitteeMembers(committee).then((members) => {
        res.render('takeAttendance', { title: 'Attendance', data: members, meeting: meeting, takenBy: takenBy, token: token })
      }).catch(() => {
        res.send("Error");
      })
    }).catch((err) => {
      console.log(err)
      if(err === "expired") {
        res.send("Link expired.")
      } else {
        res.send("Invalid");
      }
    })
  }
});

router.post("/submit", function (req, res, next) {
  let meeting = req.query.meeting;
  let takenBy = req.query.takenBy;
  let token = req.query.token;
  let committee = req.query.meeting;
  if(meeting === "alumni" || meeting === "bi/pd")
    committee = "active"
  getCommitteeMembers(committee).then((members) => {
    let data = [];
    members.forEach((member) => {
      let here = false;
      let excused = false;
      if (req.body[member.slackID + "_here"]) {
        here = true;
      }
      if (req.body[member.slackID + "_excused"]) {
        excused = true;
      }
      data.push({ slackID: member.slackID, here: here, excused: excused })
    })
    logAttendance(data, takenBy, token).then(() => {
      res.send("Attendance taken!")
    }).catch((err) => {
      if(err === "exists") {
        res.send("Attendance already taken!")
      } else {
        res.send("Error");
      }
    });
  }).catch((err) => {
    console.log(err);
    res.send("Invalid");
  })
})

module.exports = router;