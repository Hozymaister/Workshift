let csrfToken: string | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function getCsrfToken() {
  if (!csrfToken && isBrowser()) {
    csrfToken = window.sessionStorage.getItem("csrfToken");
  }
  return csrfToken;
}

export function setCsrfToken(token: string | null) {
  csrfToken = token;
  if (!isBrowser()) {
    return;
  }

  if (token) {
    window.sessionStorage.setItem("csrfToken", token);
  } else {
    window.sessionStorage.removeItem("csrfToken");
  }
}
