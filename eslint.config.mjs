import hmppsConfig from '@ministryofjustice/eslint-config-hmpps'

export default [
  ...hmppsConfig({
    extraIgnorePaths: ['assets/**'],
  }),
  {
    rules: {
      camelcase: 'off',
      'no-plusplus': 'off',
      'no-param-reassign': ['error', { props: false }],
    },
  },
]
