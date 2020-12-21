require('dotenv').config()
const http = require('http')
const express = require('express')
const { createMessageAdapter } = require('@slack/interactive-messages')
const bodyParser = require('body-parser')
var slackSlashCommand = require('./slackBot/slashCommands.js');
var { recordOneOnOne } = require('./slackBot/utils.js');
var adminPages = require('./adminPages.js');
var attendancePages = require('./attendance.js');
var { sendWeekly } = require("./slackBot/weekly.js")

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN

if (!slackSigningSecret || !slackAccessToken) {
  throw new Error('A Slack signing secret and access token are required to run this app.');
}

const app = express();

app.set('views', './views');
app.set('view engine', 'jade');

app.use(bodyParser.urlencoded({ extended: false }))


// 
app.use('/admin', adminPages);
app.use('/attendance', attendancePages);


// Slack endpoints
const slackInteractions = createMessageAdapter(slackSigningSecret);

app.use('/slack/actions', slackInteractions.expressMiddleware());
app.post('/slack/commands', bodyParser.urlencoded({ extended: false }), slackSlashCommand);

app.get('/slack/sendWeekly', async (req, res) => {
  let data = await genWeekly();
  sendWeekly();
  res.send(data);
});

slackInteractions.action({ type: 'dialog_submission' }, (payload, respond) => {
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
});

const port = process.env.PORT || 5000;
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});