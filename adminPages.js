var express = require("express");
var router = express.Router();

const attributes = ['active', 'brother', 'alumnus', 'eboard', 'server', 'recruitment', 'events', 'engineering', 'fundraising', 'standards', 'cringe_nom', 'exercise_nom'];
const committees = ['recruitment', 'events', 'engineering', 'fundraising', 'secretary'];

var { getUsers, updateUser, getCommitteeMembers, getAttendanceData, getAttendanceForToken, updateUserChairs, checkLoginToken, updateAttendance, createPointsCode, redeemCode } = require('./slackBot/utils.js')

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
        res.render('attendanceView', { title: 'Attendance', data: data, token: req.query.token })
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

router.get('/attendance/update', function (req, res) {
  let token = req.query.token;
  let attr = req.query.attribute;
  let slackID = req.query.slackID;
  if (attr === "here" || attr === "excused") {
    updateAttendance(token, attr, slackID).then(() => {
      res.redirect(`/admin/attendance?token=${token}`);
    }).catch((err) => {
      console.log(err);
      res.redirect(`/admin/attendance?token=${token}`);
    })
  } else {
    res.redirect(`/admin/attendance?token=${token}`);
  }
})

router.get('/applyPoints', function (req, res) {
  if (req.session && req.session.login_token) {
    checkLoginToken(req.session.login_token).then(() => {
      getCommitteeMembers('active').then(data => {
        res.render('applyPoints', { title: 'Apply Points', data: data })
      })
    }).catch(() => {
      res.render('login', { title: 'Login', redirect: '/admin/applyPoints', flash: 'Invalid login token. Please try again.' });
    })
  } else {
    res.render('login', { title: 'Login', redirect: '/admin/applyPoints', flash: 'No token' });
  }

})

router.post('/applyPoints', async function (req, res) {
  let points = req.body.num_points;
  let desc = req.body.desc;
  if (!parseInt(points)) {
    res.redirect('/admin/applyPoints');
  } else {
    let members = Object.keys(req.body).filter(el => el !== 'num_points' && el !== 'desc')
    let code = await createPointsCode("server", "NA", points, desc, members.length);
    let added = 0
    for (let i = 0; i < members.length; i++) {
      await redeemCode(members[i], code)
      added += 1;
      if (added === members.length) {
        res.redirect('/admin/applyPoints');
      }
    }
  }
})

module.exports = router;