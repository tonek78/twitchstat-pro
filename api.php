<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow local dev
require_once 'config.php';

function getAccessToken()
{
    if (!defined('TWITCH_CLIENT_ID') || !defined('TWITCH_CLIENT_SECRET') || TWITCH_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
        return ['error' => 'Config not set'];
    }

    $url = 'https://id.twitch.tv/oauth2/token';
    $data = [
        'client_id' => TWITCH_CLIENT_ID,
        'client_secret' => TWITCH_CLIENT_SECRET,
        'grant_type' => 'client_credentials'
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $json = json_decode($response, true);

    if ($httpCode !== 200) {
        return ['error' => $json, 'code' => $httpCode];
    }
    return $json['access_token'] ?? null;
}

function makeApiCall($endpoint, $params, $accessToken)
{
    if (!$accessToken)
        return null;
    $url = "https://api.twitch.tv/helix/$endpoint?" . http_build_query($params);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Client-ID: ' . TWITCH_CLIENT_ID,
        'Authorization: Bearer ' . $accessToken
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['data' => json_decode($response, true), 'code' => $httpCode];
}

function generateFallbackData($streamerName) {
    $cleanName = ucfirst(trim($streamerName));
    $login = strtolower(trim($streamerName));
    
    // Preset popular streamer details
    $presets = [
        'thevr' => [
            'name' => 'TheVR',
            'followers' => 842000,
            'view_count' => 145000000,
            'is_live' => true,
            'viewers' => 6420,
            'game' => 'Just Chatting',
            'title' => 'HAPPY HOUR #840 | Napi Hírek, Chat és Játékok! | !discord !webshop',
            'bio' => 'Hivatalos TheVR Twitch csatorna. Napi élő adások, Happy Hour, gaming és tech hírek.',
            'created' => '2014-04-12T14:20:00Z',
            'tags' => ['Hungarian', 'HappyHour', 'Gaming', 'Co-op', 'Podcast']
        ],
        'pierce' => [
            'name' => 'Pierce',
            'followers' => 215000,
            'view_count' => 38000000,
            'is_live' => true,
            'viewers' => 2180,
            'game' => 'League of Legends',
            'title' => 'CHALLENGER RANKED CLIMB | Szezon nyitás | !discord',
            'bio' => 'League of Legends streamer & gamer tartalomgyártó.',
            'created' => '2015-09-01T10:00:00Z',
            'tags' => ['Hungarian', 'LoL', 'Challenger', 'Ranked']
        ],
        'xqc' => [
            'name' => 'xQc',
            'followers' => 12000000,
            'view_count' => 540000000,
            'is_live' => true,
            'viewers' => 38500,
            'game' => 'Grand Theft Auto V',
            'title' => 'JUICE TIME! EVERYTHING DAY | CHAT DECIDES | !DISCORD',
            'bio' => 'THE JUICE IS LOOSE. Full-time Canadian streamer and former Overwatch Pro.',
            'created' => '2014-09-12T18:00:00Z',
            'tags' => ['English', 'GTA RP', 'Variety', 'Juice']
        ],
        'shroud' => [
            'name' => 'shroud',
            'followers' => 10900000,
            'view_count' => 490000000,
            'is_live' => false,
            'viewers' => 0,
            'game' => 'VALORANT',
            'title' => 'FPS GOD BACK AT IT | NEW PATCH TESTING',
            'bio' => 'Human aimbot. Former CS:GO Pro, full time streamer.',
            'created' => '2012-11-03T11:00:00Z',
            'tags' => ['English', 'FPS', 'Valorant', 'Competitive']
        ],
        'papaplatte' => [
            'name' => 'Papaplatte',
            'followers' => 2400000,
            'view_count' => 180000000,
            'is_live' => true,
            'viewers' => 18900,
            'game' => 'Just Chatting',
            'title' => 'EDELTALK PODCAST & VARIETY GAMING | FREITAG STREAM',
            'bio' => 'Deutscher Streamer, Podcaster und Content Creator aus Berlin.',
            'created' => '2013-12-24T12:00:00Z',
            'tags' => ['German', 'Variety', 'Podcast', 'IRL']
        ]
    ];

    if (isset($presets[$login])) {
        $p = $presets[$login];
        return [
            'name' => $p['name'],
            'login' => $login,
            'avatar' => "https://ui-avatars.com/api/?name=" . urlencode($p['name']) . "&background=9146FF&color=fff&size=256",
            'description' => $p['bio'],
            'created_at' => $p['created'],
            'view_count' => $p['view_count'],
            'followers' => $p['followers'],
            'is_live' => $p['is_live'],
            'viewers' => $p['viewers'],
            'started_at' => $p['is_live'] ? date('c', time() - 7420) : null,
            'thumbnail_url' => $p['is_live'] ? "https://picsum.photos/400/225?random=" . rand(1, 100) : null,
            'game_name' => $p['game'],
            'title' => $p['title'],
            'tags' => $p['tags'],
            'language' => 'hu',
            'is_demo' => true
        ];
    }

    // Generic fallback for any other streamer name
    $isLive = (rand(0, 1) === 1);
    return [
        'name' => $cleanName,
        'login' => $login,
        'avatar' => "https://ui-avatars.com/api/?name=" . urlencode($cleanName) . "&background=9146FF&color=fff&size=256",
        'description' => "$cleanName Twitch csatornája és streamer közössége.",
        'created_at' => '2018-05-15T12:00:00Z',
        'view_count' => rand(500000, 15000000),
        'followers' => rand(15000, 350000),
        'is_live' => $isLive,
        'viewers' => $isLive ? rand(450, 4800) : 0,
        'started_at' => $isLive ? date('c', time() - rand(1800, 12000)) : null,
        'thumbnail_url' => $isLive ? "https://picsum.photos/400/225?random=" . rand(1, 100) : null,
        'game_name' => 'Just Chatting',
        'title' => "$cleanName Élő Adás - Gyere és beszélgessünk!",
        'tags' => ['Gaming', 'Live', 'Community'],
        'language' => 'hu',
        'is_demo' => true
    ];
}

// --- Main Execution ---
$streamerName = $_GET['q'] ?? 'TheVR';
$tokenResult = getAccessToken();

if (is_array($tokenResult) && isset($tokenResult['error'])) {
    // API auth failed (e.g. invalid client secret in config), return rich fallback mock data
    echo json_encode(generateFallbackData($streamerName));
    exit;
}

$accessToken = $tokenResult;

// A. Get User
$userRes = makeApiCall('users', ['login' => $streamerName], $accessToken);
if (!isset($userRes['code']) || $userRes['code'] !== 200 || empty($userRes['data']['data'])) {
    // Fallback if user not found via API
    echo json_encode(generateFallbackData($streamerName));
    exit;
}

$user = $userRes['data']['data'][0];
$userId = $user['id'];

// B. Get Channel Info
$channelRes = makeApiCall('channels', ['broadcaster_id' => $userId], $accessToken);
$channelInfo = [];
if ($channelRes['code'] === 200 && !empty($channelRes['data']['data'])) {
    $channelInfo = $channelRes['data']['data'][0];
}

// C. Get Followers
$followersRes = makeApiCall('channels/followers', ['broadcaster_id' => $userId], $accessToken);
$followerCount = ($followersRes['code'] === 200) ? ($followersRes['data']['total'] ?? 0) : -1;

// D. Get Stream Status
$streamRes = makeApiCall('streams', ['user_login' => $streamerName], $accessToken);
$isLive = false;
$streamData = [];
if ($streamRes['code'] === 200 && !empty($streamRes['data']['data'])) {
    $isLive = true;
    $streamData = $streamRes['data']['data'][0];
}

echo json_encode([
    'name' => $user['display_name'],
    'login' => $user['login'],
    'avatar' => $user['profile_image_url'],
    'description' => $user['description'],
    'created_at' => $user['created_at'],
    'view_count' => (int) $user['view_count'],

    'followers' => $followerCount,

    'is_live' => $isLive,
    'viewers' => $isLive ? (int) $streamData['viewer_count'] : 0,
    'started_at' => $isLive ? $streamData['started_at'] : null,
    'thumbnail_url' => $isLive ? str_replace('{width}x{height}', '400x225', $streamData['thumbnail_url']) : null,

    'game_name' => $channelInfo['game_name'] ?? '',
    'title' => $channelInfo['title'] ?? '',
    'tags' => $channelInfo['tags'] ?? [],
    'language' => $channelInfo['broadcaster_language'] ?? 'hu',
    'is_demo' => false
]);
