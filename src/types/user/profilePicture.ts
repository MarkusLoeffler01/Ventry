import { z } from 'zod';

// export type profilePicturePATCH = {
//     userId: number;
//     imageUrl: string;
// }



export const profilePictureSchema = z.object({
    imageUrl: z.string(),
    userId: z.string(),
});

export type profilePicturePATCH = z.infer<typeof profilePictureSchema>;
