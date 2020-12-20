const { record_dialog } = require('./dialogs')
const { WebClient } = require('@slack/client')
var { getCompleted, getIncomplete, getOneOnOnes, sendError } = require('./utils.js')
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN
const web = new WebClient(slackAccessToken);

function slackSlashCommand(req, res, next) {
  var command = req.body.command
  if (command === '/record') {
    web.dialog.open({
      trigger_id: req.body.trigger_id,
      dialog: record_dialog
    }).then(() => {
      res.send();
    }).catch((error) => {
      console.log(error);
      sendError(res, 421);
    });

  } else if (command === "/oneonones") {

    getOneOnOnes().then((data) => {
      let responseText = '```Rank   Name             Completed 1-on-1s\n';
      let num = 10;

      if (data.length < 10)
        num = data.length;

      for (let i = 0; i < num; i++) {
        let rank = (i + 1) + ".";
        let fullname = data[i].fullname;
        let n = data[i].n;
        responseText += rank.padEnd(7, ' ') + fullname.padEnd(17, ' ') + n + "\n"
      }

      responseText += "```";
      res.send({
        text: responseText,
        response_type: 'ephemeral'
      })
    }).catch((err) => {
      sendError(res, 420);
    })

  } else if (command == "/whonext") {

    getIncomplete(req.body.user_id).then((data) => {
      let responseText = "";

      if (data.length === 0) {
        responseText = "Congrats! You are all finished with your one-on-ones!"
      } else {
        responseText = "You have not had a one-on-one with: \n"
        data.forEach((member) => {
          responseText += `- <@${member.slackID}> \n`
        })
      }

      res.send(responseText);
    }).catch((err) => {
      console.log(err);
      sendError(res, 424);
    })

  } else if (command == "/completed") {

    getCompleted(req.body.user_id).then((data) => {
      let responseText = "You have had one-on-ones with the following. There is a check if they have recorded and an X if not. \n";
      data.forEach((el) => {
        responseText += `- <@${el.slackID}> ${el.completed ? "✔️" : "❌"} \n`
      })
      res.send(responseText);
    }).catch((err) => {
      if (err === 0) {
        res.send("You have not completed any one-on-ones.")
      } else {
        console.log(err);
        sendError(res, 425);
      }
    })

  } else {
    next();
  }

}

module.exports = slackSlashCommand;