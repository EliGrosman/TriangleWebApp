var express = require("express");
var router = express.Router();

var { getShopItems, updateShopItem, addEmptyItem, deleteShopitem } = require('./utils/shop.js')
var { checkLoginToken } = require('./utils/login.js')
const itemAttributes = ['itemName', 'itemDesc', 'customVal', 'forMember', 'message', 'oneTime', 'cringe', 'exercise']

router.get("/shop", function (req, res, next) {
  if (req.session && req.session.login_token) {
    checkLoginToken(req.session.login_token).then(() => {
      getShopItems().then((data) => {
        res.render('shop', { title: 'Shop', data: data })
      })
    }).catch(() => {
      res.render('login', { title: 'Login', redirect: '/admin/shop', flash: 'Invalid login token. Please try again.' });
    })
  } else {
    res.render('login', { title: 'Login', redirect: '/admin/shop', flash: 'No token' });
  }
});

router.get('/shop/update', function (req, res) {
  let attr = req.query.attribute;
  let itemID = req.query.id;
  let value = req.query.value ? req.query.value : undefined;
  if (itemAttributes.includes(attr) || (attr === "itemVal" && parseInt(value))) {
    updateShopItem(itemID, attr, value).then(() => {
      res.redirect('/admin/shop');
    }).catch((err) => {
      console.log(err);
      res.redirect('/admin/shop');
    })
  } else {
    res.redirect('/admin/shop');
  }
})

router.get('/shop/addItem', function(req, res) {
  addEmptyItem().then(() => {
    res.redirect('/admin/shop');
  }).catch(() => {
    res.redirect('/admin/shop');
  })
})

router.get('/shop/deleteItem', function(req, res) {
  let itemID = req.query.id;
  deleteShopitem(itemID).then(() => {
    res.redirect('/admin/shop');
  }).catch(() => {
    res.redirect('/admin/shop');
  })
})




module.exports = router;