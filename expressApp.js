require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// --- Twitch API OAuth Token Manager ---
let cachedAccessToken = null;
let tokenExpiresAt = 0;
let lastAuthError = null;

async function getTwitchAccessToken() {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;

    if (!clientId || !clientSecret || clientId === 'YOUR_CLIENT_ID_HERE') {
        lastAuthError = 'Twitch Client ID vagy Secret hiányzik a környezeti változókból.';
        return null;
    }

    if (cachedAccessToken && Date.now() < tokenExpiresAt - 300000) {
        return cachedAccessToken;
    }

    try {
        console.log('🔄 Fetching new Twitch Access Token...');
        const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials'
            })
        });

        const data = await response.json();

        if (response.ok && data.access_token) {
            cachedAccessToken = data.access_token;
            tokenExpiresAt = Date.now() + (data.expires_in * 1000);
            lastAuthError = null;
            console.log('✅ Twitch Access Token sikeresen megszervezve!');
            return cachedAccessToken;
        } else {
            lastAuthError = data.message || 'Érvénytelen Twitch Client Secret/ID';
            console.error('❌ Twitch OAuth hiba:', data);
            return null;
        }
    } catch (err) {
        lastAuthError = err.message;
        console.error('❌ Twitch Token hálózati hiba:', err.message);
        return null;
    }
}

// --- Twitch Helix API Call ---
async function makeHelixCall(endpoint, params = {}) {
    const token = await getTwitchAccessToken();
    if (!token) return null;

    const queryString = new URLSearchParams(params).toString();
    const url = `https://api.twitch.tv/helix/${endpoint}${queryString ? '?' + queryString : ''}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.warn(`⚠️ Helix API HTTP ${response.status} válasz: ${endpoint}`);
            return { status: response.status, data: null };
        }

        const data = await response.json();
        return { status: 200, data };
    } catch (err) {
        console.error(`❌ Helix hívás hiba (${endpoint}):`, err.message);
        return null;
    }
}

// Fallback generator
function generateFallbackData(streamerName, errorReason = null) {
    const cleanName = streamerName.charAt(0).toUpperCase() + streamerName.slice(1);
    const login = streamerName.toLowerCase().trim();

    const presets = {
        'thevr': {
            name: 'TheVR',
            followers: 842000,
            view_count: 145000000,
            is_live: true,
            viewers: 6420,
            game: 'Just Chatting',
            title: 'HAPPY HOUR #840 | Napi Hírek, Chat és Játékok! | !discord !webshop',
            bio: 'Hivatalos TheVR Twitch csatorna. Napi élő adások, Happy Hour, gaming és tech hírek.',
            created: '2014-04-12T14:20:00Z',
            tags: ['Hungarian', 'HappyHour', 'Gaming', 'Co-op', 'Podcast']
        },
        'pierce': {
            name: 'Pierce',
            followers: 215000,
            view_count: 38000000,
            is_live: true,
            viewers: 2180,
            game: 'League of Legends',
            title: 'CHALLENGER RANKED CLIMB | Szezon nyitás | !discord',
            bio: 'League of Legends streamer & gamer tartalomgyártó.',
            created: '2015-09-01T10:00:00Z',
            tags: ['Hungarian', 'LoL', 'Challenger', 'Ranked']
        },
        'xqc': {
            name: 'xQc',
            followers: 12000000,
            view_count: 540000000,
            is_live: true,
            viewers: 38500,
            game: 'Grand Theft Auto V',
            title: 'JUICE TIME! EVERYTHING DAY | CHAT DECIDES | !DISCORD',
            bio: 'THE JUICE IS LOOSE. Full-time Canadian streamer and former Overwatch Pro.',
            created: '2014-09-12T18:00:00Z',
            tags: ['English', 'GTA RP', 'Variety', 'Juice']
        },
        'shroud': {
            name: 'shroud',
            followers: 10900000,
            view_count: 490000000,
            is_live: false,
            viewers: 0,
            game: 'VALORANT',
            title: 'FPS GOD BACK AT IT | NEW PATCH TESTING',
            bio: 'Human aimbot. Former CS:GO Pro, full time streamer.',
            created: '2012-11-03T11:00:00Z',
            tags: ['English', 'FPS', 'Valorant', 'Competitive']
        }
    };

    const baseData = presets[login] || {
        name: cleanName,
        followers: Math.floor(Math.random() * 300000) + 15000,
        view_count: Math.floor(Math.random() * 10000000) + 500000,
        is_live: Math.random() > 0.5,
        viewers: Math.floor(Math.random() * 4000) + 400,
        game: 'Just Chatting',
        title: `${cleanName} Élő Adás - Gyere és csatlakozz!`,
        bio: `${cleanName} Twitch csatornája és közössége.`,
        created: '2018-05-15T12:00:00Z',
        tags: ['Gaming', 'Live', 'Community']
    };

    return {
        name: baseData.name,
        login: login,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(baseData.name)}&background=9146FF&color=fff&size=256`,
        description: baseData.bio,
        created_at: baseData.created,
        view_count: baseData.view_count,
        followers: baseData.followers,
        is_live: baseData.is_live,
        viewers: baseData.is_live ? baseData.viewers : 0,
        started_at: baseData.is_live ? new Date(Date.now() - 7420000).toISOString() : null,
        thumbnail_url: baseData.is_live ? `https://picsum.photos/400/225?random=${Math.floor(Math.random() * 100)}` : null,
        game_name: baseData.game,
        title: baseData.title,
        tags: baseData.tags,
        language: 'hu',
        is_demo: true,
        auth_error: errorReason || lastAuthError || 'Invalid Twitch API Client Secret in .env'
    };
}

// --- API Endpoint: Channel & Category Search Autocomplete ---
const router = express.Router();

router.get('/search', async (req, res) => {
    const query = (req.query.q || '').trim();
    if (!query || query.length < 2) {
        return res.json({ channels: [], categories: [] });
    }

    const [channelRes, categoryRes] = await Promise.all([
        makeHelixCall('search/channels', { query: query, first: 5, live_only: false }),
        makeHelixCall('search/categories', { query: query, first: 5 })
    ]);

    let channels = [];
    let categories = [];

    if (channelRes && channelRes.status === 200 && channelRes.data && channelRes.data.data) {
        channels = channelRes.data.data.map(ch => ({
            name: ch.display_name,
            login: ch.broadcaster_login,
            avatar: ch.thumbnail_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ch.display_name)}&background=9146FF&color=fff&size=64`,
            is_live: ch.is_live,
            game: ch.game_name || ''
        }));
    }

    if (categoryRes && categoryRes.status === 200 && categoryRes.data && categoryRes.data.data) {
        categories = categoryRes.data.data.map(cat => ({
            id: cat.id,
            name: cat.name,
            box_art: (cat.box_art_url || '').replace('{width}x{height}', '90x120')
        }));
    }

    // Fallbacks if API data is empty
    if (channels.length === 0 && categories.length === 0) {
        const presetChannels = [
            { name: 'TheVR', login: 'thevr', is_live: true, game: 'Just Chatting' },
            { name: 'Pierce', login: 'pierce', is_live: true, game: 'League of Legends' },
            { name: 'xQc', login: 'xqc', is_live: true, game: 'Grand Theft Auto V' },
            { name: 'shroud', login: 'shroud', is_live: false, game: 'VALORANT' },
            { name: 'Papaplatte', login: 'papaplatte', is_live: true, game: 'Just Chatting' }
        ];

        const presetCategories = [
            { id: '509658', name: 'Just Chatting', box_art: 'https://static-cdn.jtvnw.net/ttv-boxart/509658-90x120.jpg' },
            { id: '32982', name: 'Grand Theft Auto V', box_art: 'https://static-cdn.jtvnw.net/ttv-boxart/32982-90x120.jpg' },
            { id: '21779', name: 'League of Legends', box_art: 'https://static-cdn.jtvnw.net/ttv-boxart/21779-90x120.jpg' },
            { id: '516575', name: 'VALORANT', box_art: 'https://static-cdn.jtvnw.net/ttv-boxart/516575-90x120.jpg' },
            { id: '27471', name: 'Minecraft', box_art: 'https://static-cdn.jtvnw.net/ttv-boxart/27471-90x120.jpg' }
        ];

        channels = presetChannels
            .filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.login.includes(query.toLowerCase()))
            .map(p => ({
                ...p,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=9146FF&color=fff&size=64`
            }));

        categories = presetCategories
            .filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
    }

    return res.json({ channels, categories });
});

// --- API Endpoint: Live Streamer Data ---
router.get('/streamer', async (req, res) => {
    const streamerName = req.query.q || 'TheVR';
    const loginName = streamerName.toLowerCase().trim();

    console.log(`🔎 Streamer adatok lekérése: ${loginName}`);

    const userRes = await makeHelixCall('users', { login: loginName });

    if (!userRes || userRes.status !== 200 || !userRes.data || !userRes.data.data || userRes.data.data.length === 0) {
        console.warn(`⚠️ Twitch API nem adta vissza '${loginName}' adatait. Demó mód használata...`);
        return res.json(generateFallbackData(loginName, lastAuthError));
    }

    const user = userRes.data.data[0];
    const userId = user.id;

    const channelRes = await makeHelixCall('channels', { broadcaster_id: userId });
    const channelInfo = (channelRes && channelRes.data && channelRes.data.data && channelRes.data.data.length > 0)
        ? channelRes.data.data[0]
        : {};

    const followersRes = await makeHelixCall('channels/followers', { broadcaster_id: userId });
    const followerCount = (followersRes && followersRes.data && followersRes.data.total !== undefined)
        ? followersRes.data.total
        : -1;

    const streamRes = await makeHelixCall('streams', { user_login: loginName });
    let isLive = false;
    let streamData = {};

    if (streamRes && streamRes.data && streamRes.data.data && streamRes.data.data.length > 0) {
        isLive = true;
        streamData = streamRes.data.data[0];
    }

    console.log(`✅ Valós Twitch adatok sikeresen lekérve: ${user.display_name} (Élő: ${isLive})`);

    return res.json({
        name: user.display_name,
        login: user.login,
        avatar: user.profile_image_url,
        description: user.description,
        created_at: user.created_at,
        view_count: user.view_count,

        followers: followerCount,

        is_live: isLive,
        viewers: isLive ? streamData.viewer_count : 0,
        started_at: isLive ? streamData.started_at : null,
        thumbnail_url: isLive ? (streamData.thumbnail_url || '').replace('{width}x{height}', '400x225') : null,

        game_name: channelInfo.game_name || '',
        title: channelInfo.title || '',
        tags: channelInfo.tags || [],
        language: channelInfo.broadcaster_language || 'hu',
        is_demo: false,
        auth_error: null
    });
});

// --- API Endpoint: Category & Top Streams Data ---
router.get('/category', async (req, res) => {
    const categoryName = (req.query.q || req.query.name || 'Just Chatting').trim();
    const categoryId = req.query.id || null;

    console.log(`🔎 Kategória adatok lekérése: ${categoryName} (ID: ${categoryId})`);

    let gameData = null;

    if (categoryId) {
        const gameRes = await makeHelixCall('games', { id: categoryId });
        if (gameRes && gameRes.status === 200 && gameRes.data && gameRes.data.data && gameRes.data.data.length > 0) {
            gameData = gameRes.data.data[0];
        }
    }

    if (!gameData) {
        const gameSearchRes = await makeHelixCall('games', { name: categoryName });
        if (gameSearchRes && gameSearchRes.status === 200 && gameSearchRes.data && gameSearchRes.data.data && gameSearchRes.data.data.length > 0) {
            gameData = gameSearchRes.data.data[0];
        }
    }

    const targetGameId = gameData ? gameData.id : categoryId;
    const targetGameName = gameData ? gameData.name : categoryName;
    const boxArt = gameData ? gameData.box_art_url.replace('{width}x{height}', '180x240') : 'https://static-cdn.jtvnw.net/ttv-boxart/509658-180x240.jpg';

    // Fetch top live streams for this game
    let topStreams = [];
    let totalViewers = 0;

    if (targetGameId) {
        const streamsRes = await makeHelixCall('streams', { game_id: targetGameId, first: 12 });
        if (streamsRes && streamsRes.status === 200 && streamsRes.data && streamsRes.data.data) {
            topStreams = streamsRes.data.data.map(st => ({
                user_name: st.user_name,
                user_login: st.user_login,
                viewer_count: st.viewer_count,
                title: st.title,
                language: st.language,
                thumbnail_url: (st.thumbnail_url || '').replace('{width}x{height}', '320x180'),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(st.user_name)}&background=9146FF&color=fff&size=64`
            }));
            totalViewers = topStreams.reduce((acc, curr) => acc + curr.viewer_count, 0);
        }
    }

    // Fallback demo data if Twitch API is offline or restricted
    if (topStreams.length === 0) {
        topStreams = [
            { user_name: 'TheVR', user_login: 'thevr', viewer_count: 3145, title: 'Élő adás - ' + targetGameName, language: 'hu', thumbnail_url: 'https://picsum.photos/320/180?random=1', avatar: 'https://ui-avatars.com/api/?name=TheVR&background=9146FF&color=fff&size=64' },
            { user_name: 'Papaplatte', user_login: 'papaplatte', viewer_count: 14200, title: 'Streaming ' + targetGameName, language: 'de', thumbnail_url: 'https://picsum.photos/320/180?random=2', avatar: 'https://ui-avatars.com/api/?name=Papaplatte&background=9146FF&color=fff&size=64' },
            { user_name: 'Pierce', user_login: 'pierce', viewer_count: 1850, title: 'Élő adás!', language: 'hu', thumbnail_url: 'https://picsum.photos/320/180?random=3', avatar: 'https://ui-avatars.com/api/?name=Pierce&background=9146FF&color=fff&size=64' },
            { user_name: 'xQc', user_login: 'xqc', viewer_count: 32400, title: 'BEST STREAM ' + targetGameName, language: 'en', thumbnail_url: 'https://picsum.photos/320/180?random=4', avatar: 'https://ui-avatars.com/api/?name=xQc&background=9146FF&color=fff&size=64' },
            { user_name: 'shroud', user_login: 'shroud', viewer_count: 9800, title: 'RANKED SESSIONS', language: 'en', thumbnail_url: 'https://picsum.photos/320/180?random=5', avatar: 'https://ui-avatars.com/api/?name=shroud&background=9146FF&color=fff&size=64' }
        ];
        totalViewers = 61395;
    }

    return res.json({
        id: targetGameId,
        name: targetGameName,
        box_art: boxArt,
        total_viewers: totalViewers,
        stream_count: topStreams.length,
        streams: topStreams
    });
});

// Mount router on /api and /.netlify/functions/api
app.use('/api', router);
app.use('/.netlify/functions/api', router);

module.exports = app;
