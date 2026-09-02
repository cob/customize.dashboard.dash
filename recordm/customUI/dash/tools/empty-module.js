// Módulo vazio usado como substituto, no bundle de browser, de dependências que só
// fazem sentido em Node (ver resolve.alias no vue.config.js).
// Os exports nomeados (com valor undefined) existem apenas para o webpack não emitir
// "export ... was not found" nos pontos que os referenciam dentro de guardas de
// ambiente — ex: auth.js do rest-api-wrapper usa toughCookie.CookieJar e
// axiosCookieJarSupport.wrapper apenas quando corre em Node.
export const CookieJar = undefined
export const wrapper = undefined
export default {}
