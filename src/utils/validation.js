const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

export const validateSessionId = (sessionId) => {
  if (!sessionId || typeof sessionId !== "string") {
    return false;
  }

  return SESSION_ID_REGEX.test(sessionId);
};

export { SESSION_ID_REGEX };

