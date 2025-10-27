const API_URL = import.meta.env.VITE_API_BASE_URL + "/api/location";

export async function sendLocation(locationData) {
  let attempts = 0;
  let lastError = null;
  while (attempts < 3) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(locationData),
        credentials: "include",
      });
      if (!response.ok) {
        const errText = await response.text();
        lastError = `Server returned ${response.status}: ${errText}`;
        throw new Error(lastError);
      }
      const result = await response.json();
      console.log("Location API response:", result);
      return result;
    } catch (error) {
      lastError = error.message;
      console.error("sendLocation error:", lastError);
      attempts++;
      if (attempts >= 3) throw new Error(lastError);
    }
  }
}
