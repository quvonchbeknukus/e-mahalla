export const AUTH_TOKEN_KEY = "emap_api_token";
export const AUTH_USER_KEY = "emap_api_user";
export const AUTH_BASE_URL_KEY = "emap_api_base_url";
export const DEFAULT_API_BASE_URL = "https://backend.xavfsiz-mahalla.uz/api";

const LEGACY_AUTH_KEYS = ["token", "emap_session_token"];

class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function cleanupLegacyAuth() {
  LEGACY_AUTH_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

function normalizeBaseUrl(baseUrl) {
  return typeof baseUrl === "string" ? baseUrl.trim().replace(/\/+$/, "") : "";
}

function getConfiguredBaseUrl() {
  return normalizeBaseUrl(
    process.env.REACT_APP_API_BASE_URL || DEFAULT_API_BASE_URL
  );
}

function getApiBaseCandidates() {
  const configuredBaseUrl = getConfiguredBaseUrl();
  const protocol = window.location.protocol || "http:";
  const hostname = window.location.hostname || "localhost";

  if (configuredBaseUrl) {
    return [configuredBaseUrl];
  }

  return Array.from(
    new Set(
      [
        `${protocol}//${hostname}/e-mahalla/public/api`,
        `${protocol}//${hostname}:8000/api`,
        `${protocol}//${hostname}/api`,
      ]
        .filter(Boolean)
        .map(normalizeBaseUrl)
    )
  );
}

function getStoredBaseUrl() {
  const baseUrl = localStorage.getItem(AUTH_BASE_URL_KEY);
  return baseUrl ? normalizeBaseUrl(baseUrl) : null;
}

function getRequestBaseUrls() {
  const configuredBaseUrl = getConfiguredBaseUrl();

  if (configuredBaseUrl) {
    return [configuredBaseUrl];
  }

  return Array.from(
    new Set([getStoredBaseUrl(), ...getApiBaseCandidates()].filter(Boolean))
  );
}

function getBaseOrigin(baseUrl) {
  try {
    return new URL(normalizeBaseUrl(baseUrl)).origin;
  } catch (error) {
    return "";
  }
}

function resolveAbsoluteUrl(value, baseUrl) {
  if (typeof value !== "string") {
    return value;
  }

  const normalizedValue = value.trim();

  if (
    !normalizedValue ||
    /^(?:[a-z]+:)?\/\//i.test(normalizedValue) ||
    normalizedValue.startsWith("data:") ||
    normalizedValue.startsWith("blob:")
  ) {
    return normalizedValue;
  }

  const origin = getBaseOrigin(baseUrl);

  if (!origin) {
    return normalizedValue;
  }

  return `${origin}${normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`}`;
}

function normalizeApiPayload(payload, baseUrl) {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeApiPayload(item, baseUrl));
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  return Object.entries(payload).reduce((result, [key, value]) => {
    result[key] =
      key === "image_url"
        ? resolveAbsoluteUrl(value, baseUrl)
        : normalizeApiPayload(value, baseUrl);

    return result;
  }, {});
}

function parseStoredUser() {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

async function requestJson(baseUrl, path, options = {}) {
  const { method = "GET", body, token } = options;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? body
            : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError("Server bilan bog'lana olmadik.");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload?.message
        ? payload.message
        : "So'rov bajarilmadi.";

    throw new ApiError(message, response.status, payload);
  }

  return normalizeApiPayload(payload, baseUrl);
}

async function requestWithFallback(path, options = {}, stopOnStatuses = []) {
  let lastError = null;

  for (const baseUrl of getRequestBaseUrls()) {
    try {
      const data = await requestJson(baseUrl, path, options);
      return { data, baseUrl };
    } catch (error) {
      lastError = error;

      if (error instanceof ApiError && stopOnStatuses.includes(error.status)) {
        throw error;
      }

      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new ApiError("API manzili topilmadi.");
}

function persistAuth({ token, user, baseUrl }) {
  cleanupLegacyAuth();

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  if (baseUrl) {
    localStorage.setItem(AUTH_BASE_URL_KEY, normalizeBaseUrl(baseUrl));
  }
}

export function getStoredToken() {
  cleanupLegacyAuth();
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser() {
  cleanupLegacyAuth();
  return parseStoredUser();
}

export function clearAuth() {
  cleanupLegacyAuth();
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_BASE_URL_KEY);
}

export function isAuthenticated() {
  return Boolean(getStoredToken());
}

export async function loginWithCredentials(login, password) {
  const { data, baseUrl } = await requestWithFallback(
    "/login",
    {
      method: "POST",
      body: {
        phone: login.trim(),
        password,
      },
    },
    [401, 422]
  );

  persistAuth({
    token: data.token,
    user: data.user,
    baseUrl,
  });

  return data.user;
}

export async function apiRequest(path, options = {}) {
  const { authenticated = false, stopOnStatuses = [], token, ...requestOptions } = options;

  const resolvedToken = authenticated ? token ?? getStoredToken() : token;

  if (authenticated && !resolvedToken) {
    throw new ApiError("Avval tizimga kiring.", 401);
  }

  const { data, baseUrl } = await requestWithFallback(
    path,
    {
      ...requestOptions,
      token: resolvedToken,
    },
    stopOnStatuses
  );

  if (baseUrl) {
    localStorage.setItem(AUTH_BASE_URL_KEY, normalizeBaseUrl(baseUrl));
  }

  return data;
}

export async function fetchCurrentUser() {
  const token = getStoredToken();

  if (!token) {
    return null;
  }

  try {
    const { data, baseUrl } = await requestWithFallback(
      "/me",
      {
        method: "GET",
        token,
      },
      [401]
    );

    persistAuth({
      token,
      user: data,
      baseUrl,
    });

    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuth();
      return null;
    }

    throw error;
  }
}

export async function logoutUser() {
  const token = getStoredToken();

  try {
    if (token) {
      for (const baseUrl of getRequestBaseUrls()) {
        try {
          await requestJson(baseUrl, "/logout", {
            method: "POST",
            token,
          });
          break;
        } catch (error) {
          if (error instanceof ApiError && [0, 401, 404].includes(error.status)) {
            continue;
          }

          throw error;
        }
      }
    }
  } finally {
    clearAuth();
  }
}

export function getAuthErrorMessage(error) {
  if (error instanceof ApiError) {
    const validationErrors = error.data?.errors;

    if (validationErrors && typeof validationErrors === "object") {
      const firstValidationMessage = Object.values(validationErrors)
        .flat()
        .find(
          (message) => typeof message === "string" && message.trim() !== ""
        );

      if (firstValidationMessage) {
        return firstValidationMessage;
      }
    }

    return error.message;
  }

  return "Kirish vaqtida xatolik yuz berdi.";
}
