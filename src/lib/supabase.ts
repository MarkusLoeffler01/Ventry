import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_API_KEY
);

export async function uploadProfilePicture(file: File, userId: string) {
    const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_ID)
        .upload(`users/${userId}/${file.name}`, file, {
            cacheControl: '3600',
            upsert: false
    });

    if(error) throw error;
    return data;
}


export async function getSignedUrl(path: string, expiresIn: number = 300) {
    const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_ID)
        .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return {...data, expiresIn: expiresIn};
}

export async function deleteProfilePicture(objectKey: string) {
    const { data, error } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET_ID)
        .remove([objectKey]);
        
    if (error) throw error;
    return data;
}