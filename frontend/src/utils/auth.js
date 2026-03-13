export const AUTH_TOKEN_KEY = "emap_session_token";
const LEGACY_AUTH_TOKEN_KEY = "token";

const STATIC_LOGIN = "admin";
const STATIC_PASSWORD = "12345";

export function isAuthenticated() {
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  return sessionStorage.getItem(AUTH_TOKEN_KEY) === "true";
}

export function loginWithCredentials(login, password) {
  const isValid = login === STATIC_LOGIN && password === STATIC_PASSWORD;

  if (isValid) {
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
    sessionStorage.setItem(AUTH_TOKEN_KEY, "true");
  }

  return isValid;
}
