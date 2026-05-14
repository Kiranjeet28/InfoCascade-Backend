/**
 * Response Filter for GNDEC AI Assistant
 * Filters and validates responses to ensure they're GNDEC-related
 *
 * This filter is permissive - it only rejects clearly irrelevant responses
 * Gemini 2.5 Flash system instruction already ensures GNDEC-only content
 */

function filterResponse(response) {
  // Basic validation: if response is empty or undefined, return rejection
  if (!response || response.trim() === "") {
    return "I can only assist with GNDEC Ludhiana related information.";
  }

  // If response is very short (likely an error), check it
  if (response.trim().length < 10) {
    return "I can only assist with GNDEC Ludhiana related information.";
  }

  // If it's already the rejection message, return as-is
  if (
    response.includes(
      "I can only assist with GNDEC Ludhiana related information",
    )
  ) {
    return response;
  }

  // List of rejection/unrelated indicators
  const rejectionIndicators = [
    "can only answer questions related to gndec",
    "can only assist with gndec",
    "outside my scope",
    "not related to gndec",
    "cannot help with",
    "i'm unable to",
    "i cannot provide information",
  ];

  const lowerResponse = response.toLowerCase();

  // Check if response contains rejection indicators
  const isRejection = rejectionIndicators.some((indicator) =>
    lowerResponse.includes(indicator),
  );

  if (isRejection) {
    return "I can only assist with GNDEC Ludhiana related information.";
  }

  // If response is reasonably long and doesn't contain rejection indicators,
  // assume it's a valid response (Gemini's system instruction ensures it's GNDEC-related)
  return response;
}

module.exports = { filterResponse };
