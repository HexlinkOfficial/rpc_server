import express from "express";
import bodyParser from "body-parser";
import { JSONRPCServer } from "json-rpc-2.0";

import { getValues, setKeyValues, deleteValues } from "./handlers/kv";
import { genAndSendOtp, validateOtpAndSign } from "./handlers/otp";
import { authMiddleware } from "./middleware/auth";

const server = new JSONRPCServer();

server.addMethod("kv_get", ({ keys }, user: any) => getValues(user, keys));
server.addMethod("kv_put", ({ requests }, user: any) => setKeyValues(user, requests));
server.addMethod("kv_del", ({ keys }, user: any) => deleteValues(user, keys));
server.addMethod("auth_sendOtp", ({ }, user: any) => genAndSendOtp(user));
server.addMethod("auth_validateOtpAndSign", ({ otp }, user: any) => validateOtpAndSign(user, otp));

server.applyMiddleware(authMiddleware);

const app = express();
app.use(bodyParser.json());

app.post("/rpc/", (req, res) => {
  const jsonRPCRequest = req.body;
  const user = req.user;
  // server.receive takes a JSON-RPC request and returns a promise of a JSON-RPC response.
  // It can also receive an array of requests, in which case it may return an array of responses.
  // Alternatively, you can use server.receiveJSON, which takes JSON string as is (in this case req.body).
  server.receive(jsonRPCRequest, user).then((jsonRPCResponse) => {
    if (jsonRPCResponse) {
      res.json(jsonRPCResponse);
    } else {
      // If response is absent, it was a JSON-RPC notification method.
      // Respond with no content status (204).
      res.sendStatus(204);
    }
  });
});

app.listen(80);
