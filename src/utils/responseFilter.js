/**
 * Response Filter for GNDEC AI Assistant
 * Filters and validates responses to ensure they're GNDEC-related
 *
 * Gemini 2.5 Flash already filters responses through system instruction,
 * but this provides an additional safety layer for frontend consistency
 */

function filterResponse(response) {
  // Basic validation: if response is empty or undefined, return rejection
  if (!response || response.trim() === '') {
    return 'I can only assist with GNDEC Ludhiana related information.';
  }

  // If it's already the rejection message, return as-is
  if (response.includes('I can only assist with GNDEC Ludhiana related information.')) {
    return response;
  }

  // List of GNDEC-related keywords
  const allowedTerms = [
    'GNDEC',
    'Ludhiana',
    'college',
    'university',
    'department',
    'hostel',
    'timetable',
    'admission',
    'event',
    'facility',
    'placement',
    'academic',
    'campus',
    'student',
    'faculty',
    'library',
    'lab',
    'course',
    'semester',
    'exam',
    'result',
    'merit',
    'scholarship',
    'club',
    'society'
  ];

  const lowerResponse = response.toLowerCase();
  const hasAllowedTerm = allowedTerms.some(term =>
    lowerResponse.includes(term.toLowerCase())
  );

  // If response doesn't contain any GNDEC-related terms, return rejection
  if (!hasAllowedTerm) {
    return 'I can only assist with GNDEC Ludhiana related information.';
  }

  // Return the filtered response
  return response;
}

module.exports = { filterResponse };
