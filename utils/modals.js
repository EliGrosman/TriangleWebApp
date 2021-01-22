const { shop_modal, nextPage_modal, customVal_block, forMember_block, message_block } = require('../slackBot/dialogs.js')
const { getItemInfo, calculateFund, getShopItems } = require('../utils/shop.js');

const fundGoal = 20000;

function populateShopModal(itemID, points) {
  return new Promise((resolve, reject) => {
    getItemInfo(itemID).then(data => {
      calculateFund().then(fund => {
        let percent = (fund / fundGoal) * 100;
        let numBoxes = Math.ceil((percent / 10)) >= 10 ? 10 : Math.ceil((percent / 10));
        let goalBar = "";
        for (let i = 0; i < numBoxes; i++) {
          goalBar += '█';
        }

        for (let i = 0; i < 10 - numBoxes; i++) {
          goalBar += '_';
        }

        let modal = Object.assign({}, shop_modal);
        modal.private_metadata = "" + data.id;

        modal.blocks[0].text.text = `You have ${points} points!`;
        modal.blocks[2].text.text = `We are ${Math.ceil(percent)}% to our goal to get a dunk tank! \n ${goalBar} ${fund}/${fundGoal} points`
        modal.blocks[4].fields[0].text = `*Item:*\n ${data.itemName}`
        modal.blocks[4].fields[1].text = `*Value:*\n ${!data.customVal ? data.itemVal : 'Custom value'}`
        modal.blocks[4].fields[2].text = `*Description:*\n ${data.itemDesc}`

        resolve(modal);
      })
    }).catch(() => {
      reject();
    })
  })
}

function shopGoBack(currentItemID) {
  return new Promise((resolve, reject) => {
    getShopItems().then(data => {
      let currentIndex = data.findIndex(el => {
        return (el.id === currentItemID);
      })

      if (data[currentIndex - 1]) {
        resolve(data[currentIndex - 1].id);
      } else {
        resolve(data[data.length - 1].id);
      }
    })
  }).catch(err => {
    resolve(err);
  })
}

function shopGoNext(currentItemID) {
  return new Promise((resolve, reject) => {
    getShopItems().then(data => {
      let currentIndex = data.findIndex(el => {
        return (el.id === currentItemID);
      })

      if (data[currentIndex + 1]) {
        resolve(data[currentIndex + 1].id);
      } else {
        resolve(data[0].id);
      }
    })
  }).catch(err => {
    resolve(err);
  })
}

function getNextPage(itemID) {
  return new Promise((resolve, reject) => {
    getItemInfo(itemID).then(data => {
      let modal = JSON.parse(JSON.stringify(nextPage_modal));
      modal.blocks[0].text.text = `To purchase '${data.itemName}' we need some information:`;
      modal.private_metadata = "" + itemID;
      getCommitteeMembers("cringe_nom").then(cringe_noms => {
        getCommitteeMembers("exercise_nom").then(exercise_noms => {
          if (data.customVal === 1) {
            modal.blocks.push(customVal_block);
          }
          if (data.message === 1) {
            modal.blocks.push(message_block);
          }
          if (data.forMember === 1 && (data.exercise === 1 || data.cringe === 1)) {
            let forMember = Object.assign({}, forMember_block);
            forMember.element.options = [];
            let nominees = [];
            if(data.cringe === 1) {
              nominees = cringe_noms;
            } else if(data.exercise === 1) {
              nominees = exercise_noms;
            }
            for (let i = 0; i < nominees.length; i++) {
              forMember.element.options.push({
                "text": {
                  "type": "plain_text",
                  "text": nominees[i].fullname,
                  "emoji": true
                },
                "value": nominees[i].slackID
              })
            }
            modal.blocks.push(forMember);
          }
          resolve(modal);
        })
      })
    })
  })
}

module.exports = { populateShopModal, shopGoBack, shopGoNext, getNextPage }