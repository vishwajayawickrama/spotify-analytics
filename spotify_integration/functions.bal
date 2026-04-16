// Wrapper functions around the raw Spotify Web API calls.
// Each accepts the end-user's OAuth access token and forwards it as a
// Bearer credential. Returns the trimmed analytics types from types.bal.

isolated function authHeaders(string accessToken) returns map<string|string[]> {
    return {"Authorization": "Bearer " + accessToken};
}

public isolated function fetchUserProfile(string accessToken) returns UserProfile|error {
    json payload = check spotifyClient->get("/me", authHeaders(accessToken));
    return toUserProfile(payload);
}

public isolated function fetchTopArtists(string accessToken, string timeRange = "medium_term", int 'limit = 20)
        returns SpotifyArtist[]|error {
    string path = string `/me/top/artists?time_range=${timeRange}&limit=${'limit}`;
    json payload = check spotifyClient->get(path, authHeaders(accessToken));
    json[] items = check extractItems(payload);
    SpotifyArtist[] artists = [];
    foreach json item in items {
        artists.push(check toSpotifyArtist(item));
    }
    return artists;
}

public isolated function fetchTopTracks(string accessToken, string timeRange = "medium_term", int 'limit = 20)
        returns SpotifyTrack[]|error {
    string path = string `/me/top/tracks?time_range=${timeRange}&limit=${'limit}`;
    json payload = check spotifyClient->get(path, authHeaders(accessToken));
    json[] items = check extractItems(payload);
    SpotifyTrack[] tracks = [];
    foreach json item in items {
        tracks.push(check toSpotifyTrack(item));
    }
    return tracks;
}

public isolated function fetchRecentlyPlayed(string accessToken, int 'limit = 20)
        returns PlayHistoryItem[]|error {
    string path = string `/me/player/recently-played?limit=${'limit}`;
    json payload = check spotifyClient->get(path, authHeaders(accessToken));
    return toRecentlyPlayed(payload);
}

public isolated function fetchListeningHistory(string accessToken, int maxItems = 20000)
        returns ListeningHistoryResponse|error {
    int safeMaxItems = maxItems < 50 ? 50 : maxItems;
    int total = 0;
    boolean truncated = false;
    string? beforeCursor = ();
    PlayHistoryItem[] history = [];

    while total < safeMaxItems {
        int remaining = safeMaxItems - total;
        int pageLimit = remaining < 50 ? remaining : 50;
        string path = string `/me/player/recently-played?limit=${pageLimit}`;
        if beforeCursor is string {
            path = string `${path}&before=${beforeCursor}`;
        }

        json payload = check spotifyClient->get(path, authHeaders(accessToken));
        PlayHistoryItem[] page = check toRecentlyPlayed(payload);
        if page.length() == 0 {
            break;
        }

        foreach PlayHistoryItem item in page {
            history.push(item);
        }
        total = history.length();

        map<json> payloadMap = check payload.ensureType();
        string? nextBeforeCursor = extractBeforeCursor(payloadMap);
        if nextBeforeCursor is () {
            break;
        }
        if beforeCursor is string && beforeCursor == nextBeforeCursor {
            break;
        }
        beforeCursor = nextBeforeCursor;
    }

    if total >= safeMaxItems {
        truncated = true;
    }

    return {
        history,
        fetchedItems: total,
        truncated
    };
}

isolated function extractBeforeCursor(map<json> payloadMap) returns string? {
    if payloadMap.hasKey("cursors") {
        json cursorsJson = payloadMap["cursors"];
        if cursorsJson is map<json> {
            map<json> cursorMap = cursorsJson;
            if cursorMap.hasKey("before") {
                json beforeJson = cursorMap["before"];
                if beforeJson is string && beforeJson.length() > 0 {
                    return beforeJson;
                }
            }
        }
    }

    if payloadMap.hasKey("next") {
        json nextJson = payloadMap["next"];
        if nextJson is string && nextJson.length() > 0 {
            int? beforeIndex = nextJson.indexOf("before=");
            if beforeIndex is int {
                int valueStart = beforeIndex + 7;
                string tail = nextJson.substring(valueStart);
                int? ampIndex = tail.indexOf("&");
                if ampIndex is int {
                    string cursor = tail.substring(0, ampIndex);
                    if cursor.length() > 0 {
                        return cursor;
                    }
                } else if tail.length() > 0 {
                    return tail;
                }
            }
        }
    }

    return ();
}

// Aggregates several endpoints into a single analytics summary.
public isolated function buildAnalyticsSummary(string accessToken, string timeRange = "medium_term")
        returns AnalyticsSummary|error {
    UserProfile profile = check fetchUserProfile(accessToken);
    SpotifyArtist[] topArtists = check fetchTopArtists(accessToken, timeRange, 20);
    SpotifyTrack[] topTracks = check fetchTopTracks(accessToken, timeRange, 20);
    PlayHistoryItem[] recent = check fetchRecentlyPlayed(accessToken, 20);

    // Aggregate top genres across the user's top artists.
    map<int> genreCounts = {};
    foreach SpotifyArtist a in topArtists {
        foreach string g in a.genres {
            genreCounts[g] = (genreCounts[g] ?: 0) + 1;
        }
    }
    string[] sortedGenres = from var [g, _] in genreCounts.entries().toArray()
            .sort("descending", e => e[1])
        select g;

    decimal avgPop = 0;
    if topTracks.length() > 0 {
        int total = 0;
        foreach SpotifyTrack t in topTracks {
            total += t.popularity;
        }
        avgPop = <decimal>total / <decimal>topTracks.length();
    }

    return {
        profile,
        topArtists,
        topTracks,
        recentlyPlayed: recent,
        topGenres: sortedGenres.length() > 10 ? sortedGenres.slice(0, 10) : sortedGenres,
        averageTrackPopularity: avgPop
    };
}
