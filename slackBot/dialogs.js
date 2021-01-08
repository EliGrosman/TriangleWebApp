exports.record_dialog = {
  callback_id: 'oneonone_submit',
  delete_original: true,
  replace_original: true,
  response_type: 'ephemeral',
  title: 'Record one-on-one',
  submit_label: 'Record',
  elements: [
    {
      label: 'Partner',
      type: 'select',
      name: 'user',
      data_source: 'users',
      placeholder: 'Who you did your one-on-one with'
    },
    {
      label: 'Comment',
      type: 'textarea',
      name: 'comment',
      placeholder: 'He is from Seattle, played guitar in high school. CHEM major.',
      hint: 'Write down a couple things you learned about your brother.',
    },
  ],
};

exports.createCode_dialog = {
  type: 'modal',
  callback_id: 'createCode_submit',
  title: {
    type: 'plain_text',
    text: 'Create points code'
  },
  submit: {
    type: 'plain_text',
    text: 'Create'
  },
  blocks: [
    {
      type: "input",
      block_id: "value",
      element: {
        type: "plain_text_input",
        action_id: "value_input",
        placeholder: {
          type: "plain_text",
          text: " "
        }
      },
      label: {
        type: "plain_text",
        text: "Value"
      },
      hint: {
        type: "plain_text",
        text: "How many points will this code be worth?"
      }
    },
    {
      type: "input",
      block_id: "description",
      element: {
        type: "plain_text_input",
        action_id: "description_input",
        placeholder: {
          type: "plain_text",
          text: " "
        }
      },
      label: {
        type: "plain_text",
        text: "Description"
      },
      hint: {
        type: "plain_text",
        text: "What are these points for?"
      }
    },
    {
      type: "input",
      block_id: "uses",
      element: {
        type: "plain_text_input",
        action_id: "uses_input",
        placeholder: {
          type: "plain_text",
          text: " "
        }
      },
      label: {
        type: "plain_text",
        text: "Uses"
      },
      hint: {
        type: "plain_text",
        text: "How many members can redeem this code?"
      }
    }
  ]
};

exports.attendanceCommitteeChoice = {
  text: 'Which committee are you taking attendance for?',
  response_type: 'ephemeral',
  delete_original: true,
  replace_original: true,
  attachments: [{
    text: 'Choose a committee',
    callback_id: 'pick_committee',
    actions: [{
      name: 'committee',
      text: 'Choose a committee',
      type: 'select',
      options: []
    }],
  }],
};

exports.shop_modal = {
  type: 'modal',
  callback_id: 'shop_submit',
  title: {
    type: 'plain_text',
    text: 'Shop'
  },
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "You have N points!"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "We are N% to our goal to get a dunk tank! \n ██████▁▁▁▁▁▁ n/10,000 points"
      }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Item:*\n itemName"
        },
        {
          "type": "mrkdwn",
          "text": "*Price:*\n itemVal"
        },
        {
          "type": "mrkdwn",
          "text": "*Description:*\n itemDesc"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Purchase",
            "emoji": true
          },
          "style": "primary",
          "value": "click_me_123",
          "action_id": "purchase"
        }
      ]
    },
    {
      "type": "divider"
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "emoji": true,
            "text": "Back"
          },
          "style": "primary",
          "value": "click_me_123",
          "action_id": "back"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "emoji": true,
            "text": "Next"
          },
          "style": "danger",
          "value": "click_me_123",
          "action_id": "next"
        }
      ]
    }
  ]
}

exports.nextPage_modal = {
  type: 'modal',
  callback_id: 'nextPage_submit',
  title: {
    type: 'plain_text',
    text: 'Shop'
  },
  submit: {
    type: 'plain_text',
    text: 'Purchase'
  },
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "To purchase X we need some more info:"
      }
    },
    {
      "type": "divider"
    }
  ]
}

exports.customVal_block = {
  type: "input",
  block_id: "customVal",
  element: {
    type: "plain_text_input",
    action_id: "value_input",
    placeholder: {
      type: "plain_text",
      text: " "
    }
  },
  label: {
    type: "plain_text",
    text: "Custom Value"
  },
  hint: {
    type: "plain_text",
    text: "How many points do you want to spend?"
  }
}

exports.forMember_block = {
  type: "input",
  block_id: "forMember",
  label: {
    type: "plain_text",
    text: "For"
  },
  element: {
    "type": "static_select",
    "options": [

    ],
    "action_id": "static_select-action"
  }
}