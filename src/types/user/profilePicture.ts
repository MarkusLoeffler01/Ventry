import { z } from 'zod';

// export type profilePicturePATCH = {
//     userId: number;
//     imageUrl: string;
// }



export const profilePictureSchema = z.object({
    oldImageId: z.string(),
    newImage: z.file(),
    userId: z.string(),
});

export type profilePicturePATCH = z.infer<typeof profilePictureSchema>;
