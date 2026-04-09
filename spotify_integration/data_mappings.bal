// Transforms raw Spotify API JSON payloads into the trimmed analytics types.

isolated function toUserProfile(json payload) returns UserProfile|error {
    map<json> m = check payload.ensureType();
    json followersJson = check m["followers"].ensureType();
    map<json> followersMap = check followersJson.ensureType();
    return {
        id: check m["id"].ensureType(string),
        display_name: check m["display_name"].ensureType(string),
        email: m.hasKey("email") ? check m["email"].cloneWithType() : (),
        country: m.hasKey("country") ? check m["country"].ensureType(string) : "",
        followers: check followersMap["total"].ensureType(int),
        product: m.hasKey("product") ? check m["product"].ensureType(string) : ""
    };
}

isolated function toSpotifyImages(json imagesJson) returns SpotifyImage[]|error {
    json[] arr = check imagesJson.ensureType();
    return from json img in arr
        select check img.cloneWithType(SpotifyImage);
}

isolated function toSpotifyArtist(json payload) returns SpotifyArtist|error {
    map<json> m = check payload.ensureType();
    map<json> followersMap = check m["followers"].ensureType();
    json[] genresJson = check m["genres"].ensureType();
    return {
        id: check m["id"].ensureType(string),
        name: check m["name"].ensureType(string),
        genres: from json g in genresJson
            select check g.ensureType(string),
        popularity: check m["popularity"].ensureType(int),
        followers: check followersMap["total"].ensureType(int),
        images: check toSpotifyImages(m["images"])
    };
}

isolated function toSpotifyTrack(json payload) returns SpotifyTrack|error {
    map<json> m = check payload.ensureType();
    map<json> albumMap = check m["album"].ensureType();
    json[] artistsJson = check m["artists"].ensureType();
    return {
        id: check m["id"].ensureType(string),
        name: check m["name"].ensureType(string),
        popularity: m.hasKey("popularity") ? check m["popularity"].ensureType(int) : 0,
        duration_ms: check m["duration_ms"].ensureType(int),
        album: check albumMap["name"].ensureType(string),
        artists: from json a in artistsJson
            let map<json> am = checkpanic a.ensureType()
            select {
                id: checkpanic am["id"].ensureType(string),
                name: checkpanic am["name"].ensureType(string)
            }
    };
}

isolated function toRecentlyPlayed(json payload) returns PlayHistoryItem[]|error {
    map<json> m = check payload.ensureType();
    json[] items = check m["items"].ensureType();
    return from json item in items
        let map<json> im = checkpanic item.ensureType()
        select {
            played_at: checkpanic im["played_at"].ensureType(string),
            track: checkpanic toSpotifyTrack(im["track"])
        };
}

isolated function extractItems(json payload) returns json[]|error {
    map<json> m = check payload.ensureType();
    return check m["items"].ensureType();
}
