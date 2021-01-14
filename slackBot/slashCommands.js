const { record_dialog, createCode_dialog, attendanceCommitteeChoice, shop_modal } = require('./dialogs')
const { WebClient } = require('@slack/client')
var { getCompleted, getIncomplete, getOneOnOnes, sendError, isChair, generateAttendanceUrl, isAttribute, redeemCode, sumPoints, getShopItems, populateShopModal } = require('./utils.js')
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN
const web = new WebClient(slackAccessToken);
const moment = require('moment-timezone');

function slackSlashCommand(req, res, next) {
  var command = req.body.command.toLowerCase();
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

  } else if (command === "/whonext") {

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

  } else if (command === "/completed") {

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

  } else if (command === "/takeattendance") {
    isChair(req.body.user_id).then((committees) => {
      if (committees.length === 1) {
        if(committees[0] === "secretary")
          committees[0] = "active";
        generateAttendanceUrl(req.body.user_id, committees[0]).then((url) => {
          res.send("Use this link to record attendance: " + url + "\nThis will expire in 24 hours.");
        }).catch((err) => {
          res.send("An error has occured! Please try again or contact Eli if this keeps occuring.");
        })
      } else {
        let dialogJson = Object.assign({}, attendanceCommitteeChoice);
        // clear options
        dialogJson.attachments[0].actions[0].options = [];
        committees.forEach((committee) => {
          let text = committee;
          let value = committee;
          if (committee === "secretary") {
            text = "general";
            value = "active";
          }
          dialogJson.attachments[0].actions[0].options.push({ text: text, value: value })
        })
        res.json(dialogJson);
      }
    }).catch((err) => {
      if (err === "not chair") {
        res.send("You are not a committee chair. If this is an error, please contact Eli.")
      } else {
        console.log(err)
        sendError(res, 426);
      }
    })
  } else if (command === '/createcode') {
    isAttribute(req.body.user_id, 'eboard').then(() => {
      let modalJson = Object.assign({}, createCode_dialog);
      modalJson.private_metadata = req.body.channel_id;
      web.views.open({
        trigger_id: req.body.trigger_id,
        view: modalJson
      }).then(() => {
        res.send();
      }).catch((error) => {
        console.log(error);
        sendError(res, 421);
      });
    }).catch(() => {
      res.send("Unable to run this command. If this keeps occuring, please contact Eli.")
    })
  } else if (command === '/redeem') {

    let args = req.body.text.split(' ');
    if (req.body.text === '') {
      res.send("Please provide a code. The usage for this command is '/redeem <code>'")
    } else if (args.length > 1) {
      res.send("Invalid input. Please provide only one code.");
    } else {
      let code = args[0];
      redeemCode(req.body.user_id, code).then((newPoints) => {
        res.send(`T-Bucks redeemed successfully! You now have ${newPoints} T-Bucks.`);
      }).catch((err) => {
        if (err === "used too much") {
          res.send("This code has already been used. If this is an error, please contact Eli.")
        } else if (err === "user already used") {
          res.send("It seems you have already redeemed this code. If this is an error, please contact Eli.")
        } else {
          res.send("Unable to redeem T-Bucks. If this is an error, please contact Eli.")
        }
      })
    }
  } else if (command === '/tbucks') {
    sumPoints(req.body.user_id).then((points) => {
      res.send(`You have ${points} T-Bucks.`);
    }).catch(() => {
      res.send("An error has occured. Please try again or contact Eli if this keeps occuring.");
    })
  } else if (command === '/shop') {
    getShopItems().then((data) => {
      sumPoints(req.body.user_id).then((points) => {
        populateShopModal(data[0].id, points).then(shopJson => {
          web.views.open({
            trigger_id: req.body.trigger_id,
            view: shopJson
          }).then(() => {
            res.send();
          }).catch((error) => {
            console.log(error);
            sendError(res, 421);
          });
        });
      })
    }).catch(() => {
      res.send("Unable to run this command. If this keeps occuring, please contact Eli.")
    })
  } else {
    next();
  }

}

module.exports = slackSlashCommand;