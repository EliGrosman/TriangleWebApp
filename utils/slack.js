const axios = require('axios')

function sendDM(slackID, message) {
  return new Promise((resolve, reject) => {
    const slackAccessToken = process.env.BOT_USER_TOKEN
    let url = 'https://slack.com/api/chat.postMessage';
    let data = `?token=${slackAccessToken}&channel=${slackID}&text=${message}&pretty=1`;
    axios.post(url + data).then((response) => {
      resolve(response);
    }).catch((err) => {
      reject(err);
    })
  })
}

function sendEph(slackID, channelID, message) {
  return new Promise((resolve, reject) => {
    const slackAccessToken = process.env.BOT_USER_TOKEN
    let url = 'https://slack.com/api/chat.postEphemeral';
    let data = `?token=${slackAccessToken}&channel=${channelID}&text=${message}&user=${slackID}`;
    axios.post(url + data).then((response) => {
      resolve(response);
    }).catch((err) => {
      reject(err);
    })
  })
}

function sendNomination(toSlackID, fromSlackID, challengeName, message) {
  let text = `You have been nominated for '${challengeName}' by <@${fromSlackID}>! `
  if (message) {
    text += `\nTheir message says: '${message}'`;
  }
  text += `\n\n If you need more information on how to complete this challenge, type '/shop' to see its description or check the pinned post in the challenges channel.`
  text += `\n Send proof of completion to the challenges channel or to <@${fromSlackID}> directly!`
  sendDM(toSlackID, text);
}

function sendError(res, errCode, text) {
  let message = text;
  if (!message) {
    message = "An error has occured! Please try again or contact Eli if this keeps occuring."
  }
  if (errCode) {
    message += " Error code: " + errCode;
  }
  res.send({
    text: message,
    response_type: 'ephemeral'
  })
}

module.exports = { sendDM, sendNomination, sendEph, sendError }