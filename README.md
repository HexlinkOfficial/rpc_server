# Hexlink RPC Server

This is a very lightweight rpc server implementation to serve hexlink accounts. It follows json-rpc-2.0 spec. The server exposes two groups of rpc functions, one for account config data store and the other is for otp authentication.

## Config Data Store

These rpc functions expose APIs for users to store/query their account config. The config store in current design is a simple key value store where the key is the config name and the value is the config file user set. 

### Rationale

User config data may contain very sensitive data including PII or even some credentials. These data should never be stored on-chain or any public decentralized storage system and must be well protected with proper ACL at a secure private data store. 

### Authentication

The config store must authenticate users before executing. It must read the first factor from its on-chain contract and verify if the request is signed by a proper validator.

### RPC Interface

The request and response types are defined at [here](https://github.com/HexlinkOfficial/rpc_server/blob/main/src/utils/types.ts).

```
service HexlinkConfigStore {
  function config_get(GetConfigRequest): GetConfigResponse;

  function config_set(SetConfigRequest): SetConfigResponse;

  function config_del(DelConfigRequest): DelConfigResponse;
}
```

## Authentication

### RPC Interface

The request and response types are defined at [here](https://github.com/HexlinkOfficial/rpc_server/blob/main/src/utils/types.ts).

```
service HexlinkAuth {
  function auth_sendOtp(SendOtpRequest): SendOtpResponse

  function auth_validateOtp(ValidateOtpRequest): ValidateOtpSuccess
}
```

## Sybil/DoS Attack Prevention

The authentication rpc calls are used to authenticate users which means anyone can call the service. Rpc node runners will need to figure out a way to prevent spams or DDoS attacks. We can apply a token staking mechanism to prevent it from happening. THe details are TBD.

