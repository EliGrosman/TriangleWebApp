var express = require("express");
var router = express.Router();


router.post("/login", function (req, res, next) {
  if (req.body && req.body.login_token) {
    req.session.login_token = req.body.login_token;
    req.session.save(() => {
      res.redirect(req.query.redirect);
    });
  } else {
    res.render('login', { title: 'Login', redirect: '/admin/editUsers', flash: 'Invalid login token. Please try again.' });
  }
})

module.exports = router;