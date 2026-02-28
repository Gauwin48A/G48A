const BEARER_PREFIX = 'bearer ';

function getBearerTokenFromHeader(authHeader) {
    if (typeof authHeader !== 'string') return null;
    if (authHeader.length <= BEARER_PREFIX.length) return null;
    if (!authHeader.toLowerCase().startsWith(BEARER_PREFIX)) return null;

    const token = authHeader.slice(BEARER_PREFIX.length).trim();
    return token.length ? token : null;
}

function getAccessTokenFromRequest(req, options = {}) {
    const preferCookie = options.preferCookie === true;
    const cookieToken = req?.cookies?.accessToken || null;
    const headerToken = getBearerTokenFromHeader(req?.headers?.authorization);

    if (preferCookie) {
        return cookieToken || headerToken;
    }
    return headerToken || cookieToken;
}

module.exports = {
    getBearerTokenFromHeader,
    getAccessTokenFromRequest
};
