
/**
 * Represents the structure of a validation error for a single field. 
 */
export type FieldError = {
    _errors: string[];
}

/**
 * Represents the details of a validation error response.
 */


export type ValidationDetails = {
    _errors?: string[];
    name?: FieldError;
    email?: FieldError;
    password?: FieldError;
    [key: string]: FieldError | string[] | undefined;
}

/**
 * Represents the whole error response structure.
 */

export type ValidationErrorResponse = {
    message: string;
    error: string;
    details: ValidationDetails;
}

export default ValidationErrorResponse;