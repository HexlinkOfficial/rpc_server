import { createJSONRPCErrorResponse } from "json-rpc-2.0";
import { User, CustomError } from "../utils/types";

async function authenticate(user: User) {
  throw new CustomError(501, "Not Implemented");
}

export const authMiddleware = async (next: any, request: any, serverParams: any) => {
  if (request.method.startsWith("auth_")) {
    return await next(request, serverParams);
  }

  try {
    const { user } = serverParams;
    await authenticate(user);
  } catch (error) {
    return createJSONRPCErrorResponse(request.id, error.code, error.message);
  }
  return await next(request, serverParams);
};