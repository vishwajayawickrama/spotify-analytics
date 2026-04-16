import ballerina/http;
import ballerina/log;

// REST API exposing Spotify analytics.
//
// Authentication supports both:
// 1) Ballerina-managed auth cookie (preferred for static frontend hosting), and
// 2) Authorization: Bearer <token> header (backward compatibility).
@http:ServiceConfig {
    cors: {
        allowOrigins: [allowedOrigin],
        allowCredentials: true,
        allowHeaders: ["Authorization", "Content-Type", "Cookie"],
        allowMethods: ["GET", "OPTIONS"]
    }
}
service /analytics on apiListener {

    // Health check.
    resource function get health() returns record {|string status;|} {
        return {status: "ok"};
    }

    // Authenticated user's profile.
    resource function get profile(@http:Header {name: "Authorization"} string? authorization,
            @http:Header {name: "Cookie"} string? cookieHeader)
            returns UserProfile|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = resolveAccessToken(authorization, cookieHeader);
        if token is http:Unauthorized {
            return token;
        }
        UserProfile|error result = fetchUserProfile(token);
        if result is error {
            log:printError("failed to fetch profile", 'error = result);
            return <http:InternalServerError>{body: {message: result.message()}};
        }
        return result;
    }

    // Top artists. timeRange ∈ short_term | medium_term | long_term
    resource function get top\-artists(@http:Header {name: "Authorization"} string? authorization,
            @http:Header {name: "Cookie"} string? cookieHeader,
            string timeRange = "medium_term", int 'limit = 20)
            returns SpotifyArtist[]|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = resolveAccessToken(authorization, cookieHeader);
        if token is http:Unauthorized {
            return token;
        }
        SpotifyArtist[]|error result = fetchTopArtists(token, timeRange, 'limit);
        if result is error {
            log:printError("failed to fetch top artists", 'error = result);
            return <http:InternalServerError>{body: {message: result.message()}};
        }
        return result;
    }

    // Top tracks.
    resource function get top\-tracks(@http:Header {name: "Authorization"} string? authorization,
            @http:Header {name: "Cookie"} string? cookieHeader,
            string timeRange = "medium_term", int 'limit = 20)
            returns SpotifyTrack[]|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = resolveAccessToken(authorization, cookieHeader);
        if token is http:Unauthorized {
            return token;
        }
        SpotifyTrack[]|error result = fetchTopTracks(token, timeRange, 'limit);
        if result is error {
            log:printError("failed to fetch top tracks", 'error = result);
            return <http:InternalServerError>{body: {message: result.message()}};
        }
        return result;
    }

    // Recently played tracks.
    resource function get recently\-played(@http:Header {name: "Authorization"} string? authorization,
            @http:Header {name: "Cookie"} string? cookieHeader,
            int 'limit = 20)
            returns PlayHistoryItem[]|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = resolveAccessToken(authorization, cookieHeader);
        if token is http:Unauthorized {
            return token;
        }
        PlayHistoryItem[]|error result = fetchRecentlyPlayed(token, 'limit);
        if result is error {
            log:printError("failed to fetch recently played", 'error = result);
            return <http:InternalServerError>{body: {message: result.message()}};
        }
        return result;
    }

    // Paginated listening history for windowed activity analytics.
    resource function get listening\-history(@http:Header {name: "Authorization"} string? authorization,
            @http:Header {name: "Cookie"} string? cookieHeader,
            int maxItems = 5000)
            returns ListeningHistoryResponse|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = resolveAccessToken(authorization, cookieHeader);
        if token is http:Unauthorized {
            return token;
        }
        ListeningHistoryResponse|error result = fetchListeningHistory(token, maxItems);
        if result is error {
            log:printError("failed to fetch listening history", 'error = result);
            return <http:InternalServerError>{body: {message: result.message()}};
        }
        return result;
    }

    // Aggregated analytics summary - one call to fetch everything.
    resource function get summary(@http:Header {name: "Authorization"} string? authorization,
            @http:Header {name: "Cookie"} string? cookieHeader,
            string timeRange = "medium_term")
            returns AnalyticsSummary|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = resolveAccessToken(authorization, cookieHeader);
        if token is http:Unauthorized {
            return token;
        }
        AnalyticsSummary|error result = buildAnalyticsSummary(token, timeRange);
        if result is error {
            log:printError("failed to build analytics summary", 'error = result);
            return <http:InternalServerError>{body: {message: result.message()}};
        }
        return result;
    }
}

isolated function resolveAccessToken(string? authorization, string? cookieHeader) returns string|http:Unauthorized {
    string|http:Unauthorized fromHeader = extractBearer(authorization);
    if fromHeader is string {
        return fromHeader;
    }
    return extractTokenFromCookie(cookieHeader);
}

// Pulls a Bearer token out of the Authorization header.
isolated function extractBearer(string? header) returns string|http:Unauthorized {
    if header is () || header.length() == 0 {
        return <http:Unauthorized>{body: {message: "missing Authorization header"}};
    }
    string trimmed = header.trim();
    string prefix = "Bearer ";
    if trimmed.length() <= prefix.length() || !trimmed.startsWith(prefix) {
        return <http:Unauthorized>{body: {message: "expected 'Bearer <token>' Authorization header"}};
    }
    return trimmed.substring(prefix.length()).trim();
}
