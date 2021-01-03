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