import { z } from "zod";

type isValidDateType = z.ZodObject<{ 
  startDate: z.ZodDate | z.ZodString | z.ZodCoercedDate<unknown>; 
  endDate: z.ZodDate | z.ZodString | z.ZodCoercedDate<unknown>;
  }>

const isValidDate = <T extends isValidDateType>(schema: T) => {
    return schema.refine(
      data => new Date(data.endDate) > new Date(data.startDate),
      {
        message: "End date must be after start date",
        path: ["endDate"],
      }
    );
}

export {
    isValidDate
}

export type {
    isValidDateType
}