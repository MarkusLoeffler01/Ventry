import jwt from "jsonwebtoken";


export const config = {
    runtime: "edge"
}

class JsonWebToken {
    private privateKey: string;
    private publicKey: string;

    constructor(privateKey: string, publicKey: string) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }

    sign(payload: object, options?: jwt.SignOptions): string {
        return jwt.sign(payload, this.privateKey, {
            algorithm: "RS256",
            ...options,
        });
    }

    verify(token: string, options?: jwt.VerifyOptions): string | jwt.JwtPayload {
        const decoded = jwt.verify(token, this.publicKey, {
            algorithms: ["RS256"],
            ...options,
        });

        if(typeof decoded === "string") {
            throw new Error("Invalid token");
        }
        return decoded;
    }
}

// const keys = new KeyReader("jwt_private.key", "jwt_public.key");


if(process.env.JWT_PRIVATE_KEY === undefined) {
    throw new Error("JWT_PRIVATE_KEY is not defined");
}

if(process.env.JWT_PUBLIC_KEY === undefined) {
    throw new Error("JWT_PUBLIC_KEY is not defined");
}

const jwtService = new JsonWebToken(
    process.env.JWT_PRIVATE_KEY,
    process.env.JWT_PUBLIC_KEY
);

export default jwtService;
export { JsonWebToken };