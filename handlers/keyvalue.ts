import { User } from "../utils/types";

export const getValues = async (user: User, keys: string[]): Promise<string[]> => {
    throw new Error("Not implemented");
};

export const setKeyValues = async (
    user: User,
    requests: {key: string, value: string}[]
): Promise<boolean> => {
    throw new Error("Not implemented");
}

export const deleteValues = async (
    user: User,
    keys: string[]
): Promise<boolean> => {
    throw new Error("Not implemented");
}