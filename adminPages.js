var express = require("express");
var router = express.Router();

const attributes = ['active', 'brother', 'alumnus', 'eboard', 'server', 'recruitment', 'events', 'engineering', 'fundraising', 'standards'];
const committees = ['recruitment', 'events', 'engineering', 'fundraising', 'secretary'];

var { getUsers, updateUser, getAttendanceData, getAttendanceForToken, updateUserChairs, checkLoginToken } = require('./slackBot/utils.js')

router.get("/editUsers", function (req, res, next) {
  if (req.session && req.session.login_token) {
    checkLoginToken(req.session.login_token).then(() => {
      getUsers().then((data) => {
        res.render('editUsers', { title: 'Edit Users', data: data })
      })
    }).catch(() => {
      res.render('login', { title: 'Login', redirect: '/admin/editUsers', flash: 'Invalid login token. Please try again.' });
    })
  } else {
    res.render('login', { title: 'Login', redirect: '/admin/editUsers', flash: 'No token' });
  }
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

router.get('/editUsers/updateChairs', function (req, res) {
  let slackID = req.query.slackID;
  let values = req.query.value.replace(/^,+|,+$/g, '').split(",");
  let chairs = values.filter((val) => {
    if (committees.includes(val.toLowerCase())) {
      return (val.toLowerCase());
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
  if (req.session && req.session.login_token) {
    checkLoginToken(req.session.login_token).then(async () => {
      if (req.query.token) {
        let data = await getAttendanceForToken(req.query.token);
        res.render('attendanceView', { title: 'Attendance', data: data })
      } else {
        let data = await getAttendanceData();
        res.render('attendanceHome', { title: 'Attendance', data: data })
      }
    }).catch(() => {
      let redirect = '/admin/attendance'
      if (req.query.token) {
        redirect += '?token=' + req.query.token;
      }
      res.render('login', { title: 'Login', redirect: redirect, flash: 'Invalid login token. Please try again.' });
    })
  } else {
    let redirect = '/admin/attendance'
    if (req.query.token) {
      redirect += '?token=' + req.query.token;
    }
    res.render('login', { title: 'Login', redirect: redirect, flash: 'No token' });
  }
})

module.exports = router;