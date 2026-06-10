// Port of src/lib/postLabels.js. Kept in sync with server/postLabels.js.
export const POST_LABELS = [
  'Question',
  'Form check',
  'PR',
  'Program',
  'Template',
  'Study',
  'Nutrition',
  'Recovery',
  'Programming',
  'Beginner',
  'Gear',
];

// Post kinds and how they surface in the composer chooser.
export const POST_KINDS = [
  { kind: 'discussion', label: 'Discussion', blurb: 'Start an open discussion or ask a question.' },
  { kind: 'workout', label: 'Workout', blurb: 'Share a completed workout.' },
  { kind: 'program', label: 'Program', blurb: 'Share a multi-week program.' },
  { kind: 'template', label: 'Template', blurb: 'Share a reusable workout template.' },
  { kind: 'study', label: 'Study', blurb: 'Share an in-app Study result.' },
] as const;
