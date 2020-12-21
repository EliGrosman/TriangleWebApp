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
      type: 'text',
      name: 'comment',
      placeholder: 'He is from Seattle, played guitar in high school. CHEM major.',
      hint: 'Write down a couple things you learned about your brother.',
    },
  ],
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