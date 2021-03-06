import path from 'path'
import express from 'express'
import fetch from 'node-fetch'
import router from '../dist/ssr/_assets/src/main.js'
import api from '../dist/functions.js'

// @ts-ignore
global.fetch = fetch // Must be polyfilled for SSR

const server = express()

server.use(
  '/_assets',
  express.static(path.join(__dirname, '../dist/client/_assets'))
)

server.use(
  '/favicon.ico',
  express.static(path.join(__dirname, '../dist/client/favicon.ico'))
)

async function getPageProps(request) {
  const { propsGetter, ...data } = router.resolve(request.url)
  const propsMeta = api[propsGetter]

  if (propsMeta) {
    try {
      return await propsMeta.handler({ request, ...data })
    } catch (error) {
      console.error(error)
      return {}
    }
  } else {
    return {}
  }
}

server.get('*', async (request, response) => {
  try {
    if (request.path.startsWith('/api/')) {
      console.log('api', request.query)
      const apiMeta = api[request.path]

      if (apiMeta) {
        return response.end(
          JSON.stringify(
            await apiMeta.handler({ request: request, params: request.query })
          )
        )
      } else {
        // Error
        return response.end('{}')
      }
    }

    if (request.path.startsWith('/props/')) {
      console.log('props', request.query)
      const props = await getPageProps(request)
      return response.end(JSON.stringify(props))
    }

    const initialState = await getPageProps(request)
    const { html } = await router.render({ request, initialState })
    response.end(html)
  } catch (error) {
    console.error(error)
  }
})

const port = 8080
console.log(`Server started: http://localhost:${port}`)
server.listen(port)
