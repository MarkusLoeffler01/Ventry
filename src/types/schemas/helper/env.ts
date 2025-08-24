function getPrivateKey() {
    const key = process.env.JWT_PRIVATE_KEY;

    if(!key) throw new Error("JWT_PRIVATE_KEY is not defined");

    return key.replace(/\\n/g, "\n");
}

function getPublicKey() {
    const key = process.env.JWT_PUBLIC_KEY;

    if(!key) throw new Error("JWT_PUBLIC_KEY is not defined");

    return key.replace(/\\n/g, "\n");
}


export {
    getPrivateKey,
    getPublicKey
}