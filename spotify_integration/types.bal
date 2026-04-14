// Subset of Spotify Web API response shapes - only the fields we surface.

public type SpotifyImage record {
    string url;
    int? height = ();
    int? width = ();
};

public type SpotifyArtistRef record {
    string id;
    string name;
};

public type SpotifyArtist record {
    string id;
    string name;
    string[] genres = [];
    int popularity = 0;
    int followers = 0;
    SpotifyImage[] images = [];
};

public type SpotifyTrack record {
    string id;
    string name;
    int popularity = 0;
    int duration_ms = 0;
    string album = "";
    SpotifyImage[] albumImages = [];
    SpotifyArtistRef[] artists = [];
};

public type PlayHistoryItem record {
    string played_at;
    SpotifyTrack track;
};

public type UserProfile record {
    string id;
    string display_name;
    string? email = ();
    string country = "";
    int followers = 0;
    string product = "";
};

public type AnalyticsSummary record {
    UserProfile profile;
    SpotifyArtist[] topArtists;
    SpotifyTrack[] topTracks;
    PlayHistoryItem[] recentlyPlayed;
    string[] topGenres;
    decimal averageTrackPopularity;
};

public type AuthSession record {
    boolean authenticated;
    UserProfile? profile = ();
};

public type ErrorResponse record {|
    string message;
    int? status = ();
|};
