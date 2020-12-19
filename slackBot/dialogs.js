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