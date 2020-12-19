var express = require("express");
var router = express.Router();

const attributes = ['active', 'brother', 'alumnus', 'server', 'recruitment', 'events', 'engineering', 'fundraising', 'standards'];

var { getUsers, updateUser } = require('./slackBot/utils.js')

router.get("/", function (req, res, next) {
  getUsers().then((data) => {
    res.render('editUsers', { title: 'Edit Users', data: data })
  })
});

router.get('/update', function (req, res) {
  let attr = req.query.attribute;
  if (attributes.includes(attr)) {
    updateUser(req.query.slackID, req.query.attribute).then(() => {
      res.redirect('/editUsers');
    }).catch((err) => {
      console.log(err);
      res.redirect('/editUsers');
    })
  } else {
    res.redirect('/editUsers');
  }

})

module.exports = router;