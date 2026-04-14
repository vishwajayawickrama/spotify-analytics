import ballerina/http;

// Spotify scopes needed by the analytics dashboard.
const string SPOTIFY_SCOPES = "user-read-email%20user-read-private%20user-top-read%20user-read-recently-played";

service /auth on new http:Listener(servicePort) {

    // Starts OAuth by redirecting the browser to Spotify's authorize page.
    resource function get login() returns http:Response {
        string authorizeUrl = string `${spotifyAccountsApiUrl}/authorize?response_type=code&client_id=${spotifyClientId}&scope=${SPOTIFY_SCOPES}&redirect_uri=${oauthCallbackUrl}`;
        http:Response response = new;
        response.statusCode = 302;
        response.setHeader("Location", authorizeUrl);
        return response;
    }

    // Handles Spotify callback, exchanges authorization code for tokens,
    // stores the access token in an HttpOnly cookie, and redirects to UI.
    resource function get callback(string code = "") returns http:Response|http:BadRequest {
        if code.length() == 0 {
            return <http:BadRequest>{body: {message: "missing OAuth code"}};
        }

        string|error accessTokenResult = exchangeCodeForAccessToken(code);
        if accessTokenResult is error {
            return buildRedirectResponse(string `${frontendBaseUrl}/?authError=token_exchange_failed`);
        }

        http:Response response = buildRedirectResponse(string `${frontendBaseUrl}/dashboard`);
        response.setHeader("Set-Cookie", buildSessionCookie(accessTokenResult, false));
        return response;
    }

    // Returns current session info based on the auth cookie.
    resource function get session(@http:Header {name: "Cookie"} string? cookieHeader)
            returns AuthSession|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = extractTokenFromCookie(cookieHeader);
        if token is http:Unauthorized {
            return token;
        }

        UserProfile|error profile = fetchUserProfile(token);
        if profile is error {
            return <http:InternalServerError>{body: {message: profile.message()}};
        }

        return {
            authenticated: true,
            profile
        };
    }

    // Clears auth cookie.
    resource function post logout() returns http:Response {
        http:Response response = new;
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Set-Cookie", buildSessionCookie("", true));
        response.setPayload({authenticated: false});
        return response;
    }
}

isolated function exchangeCodeForAccessToken(string code) returns string|error {
    http:Request request = new;
    request.setHeader("Content-Type", "application/x-www-form-urlencoded");

    string body = string `grant_type=authorization_code&code=${code}&redirect_uri=${oauthCallbackUrl}&client_id=${spotifyClientId}&client_secret=${spotifyClientSecret}`;
    request.setPayload(body);

    json payload = check spotifyAccountsClient->post("/api/token", request);
    json accessTokenJson = check payload.access_token;
    if accessTokenJson is string {
        return accessTokenJson;
    }
    return error("Spotify token response missing access_token");
}

isolated function buildSessionCookie(string token, boolean expireNow) returns string {
    string secure = frontendBaseUrl.startsWith("https://") ? "; Secure" : "";
    if expireNow {
        return string `${sessionCookieName}=; Path=/; HttpOnly; SameSite=None; Max-Age=0${secure}`;
    }
    return string `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=None; Max-Age=3600${secure}`;
}

isolated function buildRedirectResponse(string location) returns http:Response {
    http:Response response = new;
    response.statusCode = 302;
    response.setHeader("Location", location);
    return response;
}

isolated function extractTokenFromCookie(string? cookieHeader) returns string|http:Unauthorized {
    if cookieHeader is () || cookieHeader.length() == 0 {
        return <http:Unauthorized>{body: {message: "missing auth cookie"}};
    }

    string key = sessionCookieName + "=";
    int? keyIndex = cookieHeader.indexOf(key);
    if keyIndex is int {
        int valueStart = keyIndex + key.length();
        int valueEnd = cookieHeader.length();
        int i = valueStart;
        while i < cookieHeader.length() {
            if cookieHeader.substring(i, i + 1) == ";" {
                valueEnd = i;
                break;
            }
            i += 1;
        }
        string value = cookieHeader.substring(valueStart, valueEnd).trim();
        if value.length() > 0 {
            return value;
        }
    }

    return <http:Unauthorized>{body: {message: "missing auth session"}};
}
