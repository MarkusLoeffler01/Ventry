import type JwtPayload from "@/types/jwt";
import { getPrivateKey, getPublicKey } from "@/types/schemas/helper/env";
import jwt from "jsonwebtoken";


class JsonWebToken {
    private privateKey: string;
    private publicKey: string;

    constructor(privateKey: string, publicKey: string) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }

    sign(payload: object, userid: string, options?: jwt.SignOptions): string {
        return jwt.sign(payload, this.privateKey, {
            algorithm: "RS256",
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
            subject: userid,
            ...options,
        });
    }

    verify(token: string, options?: jwt.VerifyOptions): string | jwt.JwtPayload {
        const decoded = jwt.verify(token, this.publicKey, {
            algorithms: ["RS256"],
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
            clockTolerance: 30, // 30 seconds
            ...options,
        });

        if(typeof decoded === "string") {
            throw new Error("Invalid token");
        }
        return decoded;
    }

    /**
     * @deprecated never use for security, use `verify` instead
     * @param token 
     * @returns 
     */
    decode(token: string): null | string | jwt.JwtPayload | JwtPayload {
        return jwt.decode(token);
    }

    validatePayload(payload: null | string | jwt.JwtPayload | JwtPayload | object) {
        if(payload === null) throw new Error("Invalid token");
        if(typeof payload === "string") throw new Error("Invalid token");
        if("userId" in payload && "email" in payload && "iat" in payload && "exp" in payload) {
            return payload as JwtPayload;
        }
        throw new Error("Invalid token");
    }
}

const jwtService = new JsonWebToken(
    getPrivateKey(),
    getPublicKey()
);

export default jwtService;
export { JsonWebToken };