import ballerina/http;
import ballerina/log;

// REST API exposing the Spotify analytics.
//
// Each request must carry the end-user's Spotify OAuth access token in the
// standard `Authorization: Bearer <token>` header. The Next.js frontend
// obtains that token via "Sign in with Spotify" (NextAuth) and forwards it
// here on every call.
@http:ServiceConfig {
    cors: {
        allowOrigins: [allowedOrigin],
        allowCredentials: false,
        allowHeaders: ["Authorization", "Content-Type"],
        allowMethods: ["GET", "OPTIONS"]
    }
}
service /analytics on new http:Listener(servicePort) {

    // Health check.
    resource function get health() returns record {|string status;|} {
        return {status: "ok"};
    }

    // Authenticated user's profile.
    resource function get profile(@http:Header {name: "Authorization"} string? authorization)
            returns UserProfile|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = extractBearer(authorization);
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
            string timeRange = "medium_term", int 'limit = 20)
            returns SpotifyArtist[]|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = extractBearer(authorization);
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
            string timeRange = "medium_term", int 'limit = 20)
            returns SpotifyTrack[]|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = extractBearer(authorization);
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
            int 'limit = 20)
            returns PlayHistoryItem[]|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = extractBearer(authorization);
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

    // Aggregated analytics summary - one call to fetch everything.
    resource function get summary(@http:Header {name: "Authorization"} string? authorization,
            string timeRange = "medium_term")
            returns AnalyticsSummary|http:Unauthorized|http:InternalServerError {
        string|http:Unauthorized token = extractBearer(authorization);
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
