var express = require("express");
var router = express.Router();

const attributes = ['active', 'brother', 'alumnus', 'server', 'recruitment', 'events', 'engineering', 'fundraising', 'standards'];
const committees = ['recruitment', 'events', 'engineering', 'fundraising'];

var { getUsers, updateUser, getAttendanceData, getAttendanceForToken, updateUserChairs } = require('./slackBot/utils.js')

router.get("/editUsers", function (req, res, next) {
  getUsers().then((data) => {
    res.render('editUsers', { title: 'Edit Users', data: data })
  })
});

router.get('/editUsers/update', function (req, res) {
  let attr = req.query.attribute;
  if (attributes.includes(attr)) {
    updateUser(req.query.slackID, req.query.attribute).then(() => {
      res.redirect('/admin/editUsers');
    }).catch((err) => {
      console.log(err);
      res.redirect('/admin/editUsers');
    })
  } else {
    res.redirect('/admin/editUsers');
  }
})

router.get('/editUsers/updateChairs', function(req,res) {
  let slackID = req.query.slackID;
  let values = req.query.value.replace(/^,+|,+$/g, '').split(",");
  let chairs = values.filter((val) => {
    if(committees.includes(val.toLowerCase())) {
      return(val.toLowerCase());
    }
  })

  updateUserChairs(slackID, chairs.join(",")).then(() => {
    res.redirect('/admin/editUsers');
  }).catch((err) => {
    console.log(err)
    res.redirect('/admin/editUsers');
  })
})

router.get('/attendance', async (req, res) => {
  if(req.query.token) {
    let data = await getAttendanceForToken(req.query.token);
    res.render('attendanceView', { title: 'Attendance', data: data })
  } else {
    let data = await getAttendanceData();
    res.render('attendanceHome', { title: 'Attendance', data: data })
  }
})

module.exports = router;