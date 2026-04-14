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
    int followers = 0;
    if m.hasKey("followers") {
        json followersJson = m["followers"];
        if followersJson is map<json> {
            map<json> followersMap = followersJson;
            if followersMap.hasKey("total") {
                followers = check followersMap["total"].ensureType(int);
            }
        }
    }

    string[] genres = [];
    if m.hasKey("genres") {
        json genresJson = m["genres"];
        if genresJson is json[] {
            foreach json g in genresJson {
                genres.push(check g.ensureType(string));
            }
        }
    }

    SpotifyImage[] images = [];
    if m.hasKey("images") {
        json imagesJson = m["images"];
        if imagesJson is json[] {
            images = check toSpotifyImages(imagesJson);
        }
    }

    return {
        id: check m["id"].ensureType(string),
        name: check m["name"].ensureType(string),
        genres,
        popularity: m.hasKey("popularity") && m["popularity"] != () ? check m["popularity"].ensureType(int) : 0,
        followers,
        images
    };
}

isolated function toSpotifyTrack(json payload) returns SpotifyTrack|error {
    map<json> m = check payload.ensureType();
    map<json> albumMap = check m["album"].ensureType();
    json[] artistsJson = check m["artists"].ensureType();
    SpotifyImage[] albumImages = [];
    if albumMap.hasKey("images") {
        json albumImagesJson = albumMap["images"];
        if albumImagesJson is json[] {
            albumImages = check toSpotifyImages(albumImagesJson);
        }
    }
    string trackId = "";
    if m.hasKey("id") {
        json idJson = m["id"];
        if idJson is string {
            trackId = idJson;
        }
    }
    if trackId.length() == 0 {
        // Local/unavailable tracks can omit/null id in some payloads.
        trackId = check m["name"].ensureType(string);
    }
    return {
        id: trackId,
        name: check m["name"].ensureType(string),
        popularity: m.hasKey("popularity") ? check m["popularity"].ensureType(int) : 0,
        duration_ms: check m["duration_ms"].ensureType(int),
        album: check albumMap["name"].ensureType(string),
        albumImages,
        artists: from json a in artistsJson
            let map<json> am = check a.ensureType()
            select {
                id: am.hasKey("id") ? check am["id"].ensureType(string) : "",
                name: am.hasKey("name") ? check am["name"].ensureType(string) : "Unknown artist"
            }
    };
}

isolated function toRecentlyPlayed(json payload) returns PlayHistoryItem[]|error {
    map<json> m = check payload.ensureType();
    json[] items = check m["items"].ensureType();
    return from json item in items
        let map<json> im = check item.ensureType()
        select {
            played_at: im.hasKey("played_at") ? check im["played_at"].ensureType(string) : "",
            track: check toSpotifyTrack(im["track"])
        };
}

isolated function extractItems(json payload) returns json[]|error {
    map<json> m = check payload.ensureType();
    return check m["items"].ensureType();
}
