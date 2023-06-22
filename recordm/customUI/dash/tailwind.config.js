/* NOT BEING USED. Using play-cdn approach: https://tailwindcss.com/docs/upgrade-guide#play-cdn */
/* Downloaded the file and included on customizations.__MERGE__.css */

module.exports = {
    safelist: [
      // {
      //     pattern: /.*/,
      //     variants: ['sm','md','lg','xl','2xl','hover']
      // },

      {pattern: /.*-[w|h]-.*/},
      {pattern: /text-.*/},
      {pattern: /font-.*/},
      {pattern: /.*italic/},
      // {pattern: /tracking-.*/},
      {pattern: /leading-.*/},
      {pattern: /list-.*/},
      {pattern: /placeholder-.*/},
      {pattern: /underline/},
      // {pattern: /line-through/},
      {pattern: /no-underline/},
      {pattern: /uppercase/},
      {pattern: /lowercase/},
      {pattern: /capitalize/},
      {pattern: /normal-case/},
      {pattern: /truncate/},
      {pattern: /overflow-.*/},
      {pattern: /align-.*/},
      {pattern: /whitespace-.*/},
      {pattern: /break-.*/},
      {pattern: /bg-.*/},
      {pattern: /from-.*/},
      {pattern: /via-.*/},
      {pattern: /to-.*/},
      {pattern: /rounded-.*/},
      {pattern: /border-.*/},
      // {pattern: /divide-.*/},
      {pattern: /ring-.*/},
      // {pattern: /shadow-.*/},
      // {pattern: /opacity-.*/ },
      // {pattern: /table-.*/},
      // {pattern: /transition.*/  , variants: ['sm','md','lg','xl','2xl','hover'] },
      // {pattern: /ease-.*/       , variants: ['sm','md','lg','xl','2xl','hover'] },
      // {pattern: /duration-.*/   , variants: ['sm','md','lg','xl','2xl','hover'] },
      // {pattern: /delay-.*/      , variants: ['sm','md','lg','xl','2xl','hover'] },
      // {pattern: /animate-.*/    , variants: ['sm','md','lg','xl','2xl','hover'] },
      // {pattern: /cursor-.*/     , variants: ['sm','md','lg','xl','2xl','hover'] },
      // {pattern: /pointer-.*/    , variants: ['sm','md','lg','xl','2xl','hover'] }
  ],
  plugins: [],
}