function filterResponse(response) {
  // Basic filter: if response is empty or undefined, reject
  if (!response || response.trim() === '') {
    return 'I can only assist with GNDEC Ludhiana related information.';
  }

  // Check if it's the rejection message
  if (response.includes('I can only assist with GNDEC Ludhiana related information.')) {
    return response;
  }

  // Additional check: ensure response mentions GNDEC or related terms
  const allowedTerms = ['GNDEC', 'Ludhiana', 'college', 'department', 'hostel', 'timetable', 'admission', 'event', 'facility', 'placement', 'academic'];
  const lowerResponse = response.toLowerCase();
  const hasAllowed = allowedTerms.some(term => lowerResponse.includes(term.toLowerCase()));

  if (!hasAllowed) {
    return 'I can only assist with GNDEC Ludhiana related information.';
  }

  return response;
}

module.exports = { filterResponse };