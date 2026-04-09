import ballerina/http;

// Plain HTTP client for the Spotify Web API.
//
// Authentication is NOT configured on the client itself. Each request that
// flows through the analytics service receives the end-user's OAuth access
// token (obtained by the Next.js frontend via "Sign in with Spotify") in the
// Authorization header. The functions in functions.bal forward that token
// directly to Spotify as a Bearer credential.
final http:Client spotifyClient = check new (spotifyApiUrl);
