# Hexlink RPC Server

This is a very lightweight rpc server implementation to serve hexlink accounts. It follows json-rpc-2.0 spec. The server exposes two groups of rpc functions, one for account config data store and the other is for otp authentication.

## Config Data Store

These rpc functions expose APIs for users to store/query their account config. The config store in current design is a simple key value store where the key is the config name and the value is the config file user set. 

### Rationale

User config data may contain very sensitive data including PII or even some credentials. These data should never be stored on-chain or any public decentralized storage system and must be well protected with proper ACL at a secure private data store. 

### Authentication

The config store must authenticate users before executing. It must read the first factor from its on-chain contract and verify if the request is signed by a proper validator.

### RPC Interface

```
interface Error {
   code: number
   message: string
}

interface User {
   account: string;
   idType: string;
}

interface GetConfigRequest {
   user: User
   keys: string[]
}

interface GetConfigResponse {
  [key: string]: string | Error
}

interface ConfigSetItem {
  key: string
  value: string
  overwrite: boolean // default false
}

interface SetConfigRequest {
   user: User
   requests: ConfigSetItem[]
}

interface SetConfigResponse {
  [key: string]: boolean | Error
}

interface DelConfigRequest {
   user: User
   keys: string[]
}

interface SetConfigResponse {
  [key: string]: boolean | Error
}

service HexlinkConfigStore {
  function config_get(GetConfigRequest): GetConfigResponse | Error;

  function config_set(SetConfigRequest): SetConfigResponse | Error;

  function config_del(DelConfigRequest): DelConfigResponse | Error;
}
```

## Authentication

```
interface SendOtpRequest {
  user: User
}

interface SendOtpResponse {
  sentAt: integer
}

interface ValidateOtpRequest {
  user: User
  code: string;
  requestId: string; // extra message to sign
}

interface ValidateOtpSuccess {
  signature: string;
}

service HexlinkAuth {
  function auth_sendOtp(SendOtpRequest): SendOtpResponse | Error

  function auth_validateOtp(ValidateOtpRequest): ValidateOtpSuccess | Error
}
```

### Sybil/DoS Attack Prevention

The authentication rpc calls are used to authenticate users which means anyone can call the service. Rpc node runners will need to figure out a way to prevent spams or DDoS attacks. We can apply a token staking mechanism to prevent it from happening. THe details are TBD.

