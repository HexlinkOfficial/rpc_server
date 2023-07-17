import express from 'express'
import bodyParser from 'body-parser'
import { type JSONRPCResponse, JSONRPCServer } from 'json-rpc-2.0'

import { getConfig, setConfig, deleteConfig } from './handlers/config_store'
import { sendOtp, validateOtp } from './handlers/otp'
import { rateLimitMiddleware } from './middleware/ratelimit'
import { authMiddleware } from './middleware/auth'
import { CustomError } from './utils/types'

const server = new JSONRPCServer()

server.addMethod('config_get', async (request) => await getConfig(request))
server.addMethod('config_put', async (request) => await setConfig(request))
server.addMethod('config_del', async (request) => await deleteConfig(request))
server.addMethod('auth_sendOtp', async (request) => await sendOtp(request))
server.addMethod('auth_validateOtp', async (request) => await validateOtp(request))

server.applyMiddleware(rateLimitMiddleware, authMiddleware)

const app = express()
app.use(bodyParser.json())

app.post('/rpc/', (req: any, res: any) => {
  const jsonRPCRequest = req.body
  server
    .receive(jsonRPCRequest)
    .then(
      (jsonRPCResponse: JSONRPCResponse | null) => {
        if (jsonRPCResponse != null) {
          res.json(jsonRPCResponse)
        } else {
          res.status(-32501).send('no content') // no content
        }
      },
      (err: any) => {
        if (err instanceof CustomError) {
          res.status(err.code).send(err.message)
        } else {
          res.status(-32603).send('internal server error')
        }
      }
    )
})

app.listen(80)
