import express from 'express'
import bodyParser from 'body-parser'
import { type JSONRPCResponse, JSONRPCServer } from 'json-rpc-2.0'

import { getValues, setKeyValues, deleteValues } from './handlers/config'
import { genAndSendOtp, validateOtpAndSign } from './handlers/otp'
import { authMiddleware } from './middleware/auth'
import { CustomError } from './utils/types'

const server = new JSONRPCServer()

server.addMethod('config_get', async ({ keys }, user: any) => await getValues(user, keys))
server.addMethod('config_put', async ({ requests }, user: any) => await setKeyValues(user, requests))
server.addMethod('config_del', async ({ keys }, user: any) => await deleteValues(user, keys))
server.addMethod('auth_sendOtp', async (_request, user: any) => await genAndSendOtp(user))
server.addMethod('auth_validateOtpAndSign', async ({ otp }, user: any) => await validateOtpAndSign(user, otp))

server.applyMiddleware(authMiddleware)

const app = express()
app.use(bodyParser.json())

app.post('/rpc/', (req: any, res: any) => {
  const jsonRPCRequest = req.body
  const user = req.user
  server
    .receive(jsonRPCRequest, user)
    .then(
      (jsonRPCResponse: JSONRPCResponse | null) => {
        if (jsonRPCResponse != null) {
          res.json(jsonRPCResponse)
        } else {
          res.sendStatus(204)
        }
      },
      (err: any) => {
        if (err instanceof CustomError) {
          res.status(err.code).send(err.message)
        } else {
          res.status(500)
        }
      }
    )
})

app.listen(80)
