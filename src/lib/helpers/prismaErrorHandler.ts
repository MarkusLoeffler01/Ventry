// prismaErrorHandler.ts

// "use client";
import { PrismaClientValidationError, PrismaClientInitializationError, PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

/**
 * Registrierungsfehlertypen, die dem Client zurückgegeben werden
 */
export enum RegisterErrorType {
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  DUPLICATE_USERNAME = 'DUPLICATE_USERNAME',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Fehlerstruktur für die API-Antwort
 */
export interface ApiErrorResponse {
  error: RegisterErrorType;
  message: string;
  statusCode: number;
  details?: unknown;
}


/**
 * Verarbeitet Prisma-Fehler bei der Benutzerregistrierung
 * @param error Der aufgetretene Prisma-Fehler
 * @returns Ein strukturiertes Fehlerobjekt für die API-Antwort
 */
export function handlePrismaError(error: unknown): ApiErrorResponse {
  
  // ! Instanceof does not work here- so we stringify the class name and compare it as string


  const errorName = (error && typeof error === "object" && "name" in error) && error.name;

  // Prüft, ob es sich um einen Prisma-Fehler handelt
  if (error instanceof PrismaClientKnownRequestError || errorName === 'PrismaClientKnownRequestError') {

    const prismaError = error as PrismaClientKnownRequestError;
    // P2002: Unique constraint violation (E-Mail oder Benutzername bereits vorhanden)
    if (prismaError.code === 'P2002') {
      const target = prismaError.meta?.target as string[] | undefined;
      
      // Prüfen, welches Feld den Unique-Constraint-Fehler verursacht hat
      if (target?.includes('email')) {
        return {
          error: RegisterErrorType.DUPLICATE_EMAIL,
          message: 'Diese E-Mail-Adresse ist bereits registriert.',
          statusCode: 409
        };
      } else if (target?.includes('name')) {
        return {
          error: RegisterErrorType.DUPLICATE_USERNAME,
          message: 'Dieser Benutzername ist bereits vergeben.',
          statusCode: 409
        };
      } else {
        return {
          error: RegisterErrorType.DUPLICATE_EMAIL,
          message: 'Ein Benutzer mit diesen Daten existiert bereits.',
          statusCode: 409
        };
      }
    }
    
    // P2000: Wert zu lang für Spaltentyp
    else if (prismaError.code === 'P2000') {
      return {
        error: RegisterErrorType.VALIDATION_ERROR,
        message: 'Ein eingegebener Wert ist zu lang.',
        statusCode: 400,
        details: {
          field: prismaError.meta?.target || 'unknown',
          message: 'Der Wert überschreitet die maximal zulässige Länge.'
        }
      };
    }
    
    // P2011: Null-Constraint-Verletzung
    else if (prismaError.code === 'P2011') {
      return {
        error: RegisterErrorType.VALIDATION_ERROR,
        message: 'Ein erforderliches Feld wurde nicht angegeben.',
        statusCode: 400,
        details: {
          field: prismaError.meta?.target || 'unknown'
        }
      };
    }
    
    // P2012: Fehlender Pflichtfeldwert
    else if (prismaError.code === 'P2012') {
      return {
        error: RegisterErrorType.VALIDATION_ERROR,
        message: 'Ein erforderliches Feld wurde nicht angegeben.',
        statusCode: 400,
        details: {
          path: prismaError.meta?.path || 'unknown'
        }
      };
    }
    
    // P2019: Eingabefehler
    else if (prismaError.code === 'P2019') {
      return {
        error: RegisterErrorType.VALIDATION_ERROR,
        message: 'Eingabefehler bei der Registrierung.',
        statusCode: 400,
        details: prismaError.meta?.details
      };
    }
    
    // P2024: Datenbank-Verbindungsfehler
    else if (prismaError.code === 'P2024') {
      return {
        error: RegisterErrorType.CONNECTION_ERROR,
        message: 'Datenbankverbindungsfehler. Bitte versuche es später erneut.',
        statusCode: 503
      };
    }
    
    // P2037: Zu viele Datenbankverbindungen
    else if (prismaError.code === 'P2037') {
      return {
        error: RegisterErrorType.CONNECTION_ERROR,
        message: 'Der Server ist derzeit überlastet. Bitte versuche es später erneut.',
        statusCode: 503
      };
    }
    
    // Andere Prisma-Fehler
    else {
      return {
        error: RegisterErrorType.DATABASE_ERROR,
        message: 'Datenbankfehler bei der Registrierung.',
        statusCode: 500
      };
    }
  }
  
  // Prisma-Validierungsfehler
  else if (error instanceof PrismaClientValidationError || errorName === 'PrismaClientValidationError') {
    const prismaError = error as PrismaClientValidationError;
    return {
      error: RegisterErrorType.VALIDATION_ERROR,
      message: 'Die Benutzerdaten sind ungültig.',
      statusCode: 400,
      details: { message: prismaError.message }
    };
  }
  
  // Prisma-Initialisierungsfehler
  else if (error instanceof PrismaClientInitializationError || errorName === 'PrismaClientInitializationError') {
    return {
      error: RegisterErrorType.CONNECTION_ERROR,
      message: 'Datenbankverbindungsfehler. Bitte versuche es später erneut.',
      statusCode: 503
    };
  }
  
  // Andere Fehler
  else {
    return {
      error: RegisterErrorType.UNKNOWN_ERROR,
      message: 'Ein unbekannter Fehler ist aufgetreten.',
      statusCode: 500
    };
  }
}
