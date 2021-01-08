require('dotenv').config()
const http = require('http')
const express = require('express')
var session = require('express-session')
const { createMessageAdapter } = require('@slack/interactive-messages')
const { WebClient } = require('@slack/client')
const bodyParser = require('body-parser')
const path = require('path');
var slackSlashCommand = require('./slackBot/slashCommands.js');
var { recordOneOnOne, generateAttendanceUrl, sendError, createPointsCode, purchaseItem, sumPoints, populateShopModal, shopGoBack, shopGoNext, getItemInfo, getNextPage } = require('./slackBot/utils.js');
var adminPages = require('./adminPages.js');
var attendancePages = require('./attendance.js');
var login = require('./login');
var shopPages = require('./shop.js');
var { sendWeekly, genWeekly } = require("./slackBot/weekly.js");

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN

if (!slackSigningSecret || !slackAccessToken) {
  throw new Error('A Slack signing secret and access token are required to run this app.');
}

let urlencodedParser = bodyParser.urlencoded({ extended: false })

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', './views');
app.set('view engine', 'jade');

app.set('trust proxy', 1)
app.use(session({
  secret: process.env["SESSION_SECRET"],
  cookie: {
    maxAge: 30 * 60 * 1000,
    httpOnly: true
  },
  rolling: true,
  resave: true,
  saveUninitialized: true,
}))

// Triangle endpoints
app.get('/', function (req, res, next) {
  res.render('home', { title: 'Home' })
})

app.use('/admin', adminPages);
app.use('/admin', shopPages);
app.use('/attendance', urlencodedParser, attendancePages);
app.use('/admin', urlencodedParser, login);

// Slack endpoints
const slackInteractions = createMessageAdapter(slackSigningSecret);
const web = new WebClient(slackAccessToken);

app.use('/slack/actions', slackInteractions.expressMiddleware());
app.post('/slack/commands', bodyParser.urlencoded({ extended: false }), slackSlashCommand);

app.get('/slack/sendWeekly', async (req, res) => {
  let data = await genWeekly();
  sendWeekly();
  res.send(data);
});

slackInteractions.action({ type: 'dialog_submission' }, (payload, respond) => {
  if (payload.callback_id === 'oneonone_submit') {
    console.log("oneonones")
    recordOneOnOne(payload)
      .then(() => {
        respond({ text: `Successfully logged your one-on-one with <@${payload.submission.user.toString()}>!` });
      }).catch((errCode) => {
        if (errCode == 422) {
          respond({ text: `It looks like you already logged your one-on-one with <@${payload.submission.user.toString()}>. If this seems like an error please contact Eli.` });
        } else if (errCode === 425) {
          respond({ text: "Your comment cannot be blank! Please try submitting the form again." });
        } else if (errCode === 426) {
          respond({ text: "You cannot log a one-on-one with yourself!" });
        } else {
          respond({ text: "An error has occured! Please try again or contact Eli if this keeps occuring. Error code: " + errCode });
        }
      })
  }
});

slackInteractions.viewSubmission('createCode_submit', payload => {
  let state = payload.view.state.values;
  let value = parseInt(state.value.value_input.value);
  let description = state.description.description_input.value;
  let uses = parseInt(state.uses.uses_input.value);


  let error = false;
  let errors = {};
  if (isNaN(value)) {
    error = true;
    errors['value'] = "'Value' must be a number";
  }
  if (isNaN(uses)) {
    error = true;
    errors['uses'] = "'Uses' must be a number";
  }

  if (error) {
    return Promise.resolve({
      response_action: "errors",
      errors: errors
    })
  } else {
    createPointsCode(payload.user.id, payload.view.private_metadata, value, description, uses);
    return Promise.resolve({
      response_action: "clear"
    })
  }
})

slackInteractions.viewSubmission('nextPage_submit', payload => {
  let slackID = payload.user.id;
  let itemID = payload.view.private_metadata;
  let stateValues = payload.view.state.values;
  let forMember = stateValues.forMember ? stateValues.forMember['static_select-action'].selected_option.value : undefined;
  let customVal = stateValues.customVal ? stateValues.customVal.value_input.value : undefined;
  if (customVal && !parseInt(customVal)) {
    return Promise.resolve({
      response_action: "errors",
      errors: { customVal: "'Custom Value' must be a number." }
    })
  }
  purchaseItem(slackID, itemID, customVal, forMember).then(() => {
    sumPoints(slackID).then(newPoints => {
      populateShopModal(itemID, newPoints).then(newView => {
        newView.blocks[0].text.text = "Purchase successful!\n" + newView.blocks[0].text.text;
        web.views.open({
          trigger_id: payload.trigger_id,
          view: newView
        })
      })
    })
  }).catch((err) => {
    console.log(err)
  })
})

slackInteractions.action('pick_committee', (payload, respond) => {
  generateAttendanceUrl(payload.user.id, payload.actions[0].selected_options[0].value).then((url) => {
    respond({
      text: "Use this link to record attendance: " + url + "\nThis will expire in 24 hours."
    })
  }).catch((err) => {
    respond({
      text: "An error has occured! Please try again or contact Eli if this keeps occuring."
    })
  })

})

slackInteractions.action({ type: 'button' }, (payload, respond) => {
  let action = payload.actions[0].action_id;
  let currentItemID = parseInt(payload.view.private_metadata);
  let slackID = payload.user.id;

  if (action === "purchase") {
    getItemInfo(currentItemID).then(data => {
      if (data.customVal === 1 || data.forMember === 1) {
        getNextPage(currentItemID).then(newView => {
          web.views.update({
            view_id: payload.view.id,
            hash: payload.view.hash,
            view: newView
          })
        })
      } else {
        purchaseItem(slackID, currentItemID).then(() => {
          sumPoints(slackID).then(newPoints => {
            populateShopModal(currentItemID, newPoints).then(newView => {
              newView.blocks[0].text.text = "Purchase successful!\n" + newView.blocks[0].text.text;
              web.views.update({
                view_id: payload.view.id,
                hash: payload.view.hash,
                view: newView
              })
            })
          })
        }).catch((err) => {
          sumPoints(slackID).then(points => {
            populateShopModal(currentItemID, points).then(newView => {
              if (err === "not enough") {
                newView.blocks[0].text.text = "You do not have enough points for this item.\n" + newView.blocks[0].text.text;
              } else {
                console.log(err)
                newView.blocks[0].text.text = "An error has occured. Please try again or contact Eli.\n" + newView.blocks[0].text.text;
              }
              web.views.update({
                view_id: payload.view.id,
                hash: payload.view.hash,
                view: newView
              })
            })
          })
        })
      }
    })
  } else if (action === "purchase_withExtraInfo") {

  } else if (action === "back") {
    shopGoBack(currentItemID).then(newItemID => {
      sumPoints(slackID).then(points => {
        populateShopModal(newItemID, points).then(newView => {
          web.views.update({
            view_id: payload.view.id,
            hash: payload.view.hash,
            view: newView
          })
        })
      })
    }).catch(err => {
      console.log(err);
    });
  } else if (action === "next") {
    shopGoNext(currentItemID).then(newItemID => {
      sumPoints(slackID).then(points => {
        populateShopModal(newItemID, points).then(newView => {
          web.views.update({
            view_id: payload.view.id,
            hash: payload.view.hash,
            view: newView
          })
        })
      })
    });
  }
})

const port = process.env.PORT || 5000;
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});