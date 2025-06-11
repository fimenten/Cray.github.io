// Test cases for URL normalization

// Test function that mimics the normalizeUrl implementation
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    // Build the normalized URL
    let normalized = urlObj.origin;
    
    // Add pathname if it's not just '/'
    if (urlObj.pathname && urlObj.pathname !== '/') {
      // Remove trailing slash from pathname
      normalized += urlObj.pathname.replace(/\/$/, '');
    }
    
    return normalized;
  } catch (e) {
    // If URL parsing fails, just trim whitespace and trailing slashes
    return url.trim().replace(/\/$/, '');
  }
}

// Test cases
const testCases = [
  { input: "https://example.com/", expected: "https://example.com" },
  { input: "https://example.com", expected: "https://example.com" },
  { input: "https://example.com/path/", expected: "https://example.com/path" },
  { input: "https://example.com/path", expected: "https://example.com/path" },
  { input: "https://example.com:8080/", expected: "https://example.com:8080" },
  { input: "https://example.com:8080", expected: "https://example.com:8080" },
  { input: "https://example.com/path?query=1", expected: "https://example.com/path" },
  { input: "https://example.com/path#hash", expected: "https://example.com/path" },
  { input: "http://localhost:3000/", expected: "http://localhost:3000" },
  { input: "http://localhost:3000", expected: "http://localhost:3000" },
  { input: " https://example.com/ ", expected: "https://example.com" },
  { input: "invalid-url/", expected: "invalid-url" },
];

console.log("URL Normalization Test Results:");
console.log("==============================");

testCases.forEach(({ input, expected }) => {
  const result = normalizeUrl(input);
  const passed = result === expected;
  console.log(`Input: "${input}"`);
  console.log(`Expected: "${expected}"`);
  console.log(`Got: "${result}"`);
  console.log(`Status: ${passed ? "✓ PASS" : "✗ FAIL"}`);
  console.log("");
});