import type { FieldError, ValidationDetails } from "@/types/apiResponses/register";

/**
 * Helperfunction tto check if a field has an error
 * @param details 
 * @param fieldName 
 * @returns 
 */
export const hasFieldError = (details: ValidationDetails | undefined, fieldName: string): boolean => {
    if(!details) return false;
    const field = details[fieldName] as FieldError | undefined;
    return !!field && field._errors && field._errors.length > 0;
}  

/**
 * Helperfunction to get the error message for a field
 * @param details 
 * @param fieldName 
 * @returns 
 */
export const getFieldErrorMessage = (details: ValidationDetails | undefined, fieldName: string): string | null => {
    if(!details) return null;
    const field = details[fieldName] as FieldError | undefined;
    return field?._errors?.[0] || null;
}

/**
 * Helperfunction to get the general error message
 * @param details 
 * @returns 
 */
export const getGeneralErrorMessage = (details: ValidationDetails | undefined): string[] | null => {
    if(!details || !details._errors) return null;
    return details._errors;
}