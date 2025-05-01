import zxcvbn from 'zxcvbn';

/**
 * The user information type used for zxcvbn analysis.
 * This can include email, username, or any other user-specific data.
 * Example: 'Max', 'Doe', '1990'
 */
type UserInformation = string;

export interface PasswordStrengthResult {
    /** 0-4 (0 = very weak, 4 = very strong) */
  score: number; 
  feedback: {
    warning: string;     // Warning message if weak
    suggestions: string[]; // Suggestions to improve
  };
  strengthText: string;  // Human-readable strength
  isStrong: boolean;     // Whether it meets minimum requirements
}

/**
 * Analyze password strength using zxcvbn
 * 
 * @param password The password to analyze
 * @param userInputs Optional array of user-specific inputs to check against (email, username, etc.)
 * @param minStrength Minimum required strength (0-4)
 */
export function checkPasswordStrength(
  password: string, 
  userInputs: UserInformation[] = [], 
  minStrength: number = 2
): PasswordStrengthResult {
  // Run zxcvbn analysis
  const result = zxcvbn(password, userInputs);
  
  // Map score to human-readable strength
  const strengthMap = [
    'Very Weak',
    'Weak',
    'Fair',
    'Good',
    'Strong'
  ];
  
  return {
    score: result.score,
    feedback: result.feedback,
    strengthText: strengthMap[result.score] || 'Unknown',
    isStrong: result.score >= minStrength
  };
}
