import { createClient } from "@supabase/supabase-js";

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
    if(!supabaseClient) {
        supabaseClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_API_KEY
        );
    }

    return supabaseClient;
}

export async function uploadProfilePicture(file: File | Buffer, userId: string, fileName?: string) {
    const name = fileName || (file as File).name;
    if (!name) {
        throw new Error("File name is required when uploading a Buffer");
    }

    const { data, error } = await getSupabaseClient().storage
        .from(process.env.SUPABASE_BUCKET_ID)
        .upload(`users/${userId}/${name}`, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg' // Explicitly set content type for processed images
    });

    if(error) throw error;
    return data;
}

export async function uploadEventImage(file: Buffer, fileName: string) {
    const { data, error } = await getSupabaseClient().storage
        .from(process.env.SUPABASE_BUCKET_ID)
        .upload(`events/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/jpeg'
    });

    if(error) throw error;
    return data;
}

export async function uploadCommunityImage(file: Buffer, eventId: number, userId: string, fileName: string, contentType: string = "image/jpeg") {
    const { data, error } = await getSupabaseClient().storage
        .from(process.env.SUPABASE_BUCKET_ID)
        .upload(`community/${eventId}/${userId}/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
            contentType,
    });

    if(error) throw error;
    return data;
}


export async function getSignedUrl(path: string, expiresIn: number = 300) {
    const { data, error } = await getSupabaseClient().storage
        .from(process.env.SUPABASE_BUCKET_ID)
        .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return {...data, expiresIn: expiresIn};
}

export async function deleteProfilePicture(objectKey: string) {
    const { data, error } = await getSupabaseClient().storage
        .from(process.env.SUPABASE_BUCKET_ID)
        .remove([objectKey]);
        
    if (error) throw error;
    return data;
}
