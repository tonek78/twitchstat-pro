// TwitchStats Pro - Application Logic & Chart Management

document.addEventListener('DOMContentLoaded', () => {
    // --- Chart.js Defaults ---
    Chart.defaults.color = '#9a9ab0';
    Chart.defaults.font.family = "'Plus Jakarta Sans', 'Outfit', sans-serif";
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(18, 18, 28, 0.95)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(145, 70, 255, 0.4)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;

    // --- DOM Elements ---
    const searchInput = document.getElementById('streamerSearch');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const popularChips = document.querySelectorAll('.chip-btn');

    const streamerNameEl = document.getElementById('streamerName');
    const streamerLoginEl = document.getElementById('streamerLogin');
    const streamerBioEl = document.getElementById('streamerBio');
    const accountCreatedEl = document.getElementById('accountCreated');
    const streamerLangEl = document.getElementById('streamerLang');
    const avatarEl = document.getElementById('streamerAvatar');
    const statusRingEl = document.getElementById('statusRing');
    const liveBadgeEl = document.getElementById('liveBadge');
    const twitchExternalLink = document.getElementById('twitchExternalLink');
    const favToggleBtn = document.getElementById('favToggleBtn');
    const shareBtn = document.getElementById('shareBtn');

    // KPI Elements
    const followersEl = document.getElementById('followersCount');
    const totalViewsEl = document.getElementById('totalViewsCount');
    const avgViewersEl = document.getElementById('avgViewersCount');
    const peakViewersEl = document.getElementById('peakViewersCount');

    // Stream Card Elements
    const streamInfoCard = document.getElementById('streamInfoCard');
    const streamThumbnailEl = document.getElementById('streamThumbnail');
    const uptimeBadgeEl = document.getElementById('uptimeBadge');
    const gameNameEl = document.getElementById('gameName');
    const streamTitleEl = document.getElementById('streamTitle');
    const liveViewersEl = document.getElementById('liveViewersCount');
    const streamTagsEl = document.getElementById('streamTags');
    const openEmbedBtn = document.getElementById('openEmbedBtn');

    const iframeWrapper = document.getElementById('iframeWrapper');
    const closePlayerBtn = document.getElementById('closePlayerBtn');

    // Favorites Elements
    const favoritesList = document.getElementById('favoritesList');

    // Timeframe Elements
    const tfButtons = document.querySelectorAll('.tf-btn');

    // --- State Variables ---
    let currentStreamerData = null;
    let currentTimeframe = 30; // Default 30 days
    let uptimeInterval = null;
    let favorites = loadFavoritesFromStorage();

    // Language Switcher Element
    const langSelector = document.getElementById('langSelector');
    let currentLang = detectBrowserLanguage();

    // --- I18N LANGUAGE MANAGER ---
    function detectBrowserLanguage() {
        try {
            const saved = localStorage.getItem('twitchstat_lang');
            if (saved && typeof translations !== 'undefined' && translations[saved]) {
                return saved;
            }
            const navLang = (navigator.language || (navigator.languages && navigator.languages[0]) || 'hu').toLowerCase();
            if (navLang.startsWith('de')) return 'de';
            if (navLang.startsWith('hu')) return 'hu';
            return 'en';
        } catch (e) {
            return 'en';
        }
    }

    function getText(key, replacements = {}) {
        if (typeof translations === 'undefined' || !translations[currentLang]) {
            return key;
        }
        let txt = translations[currentLang][key] || (translations['en'] && translations['en'][key]) || key;
        Object.keys(replacements).forEach(k => {
            txt = txt.replace(`{${k}}`, replacements[k]);
        });
        return txt;
    }

    function applyTranslations() {
        if (typeof translations === 'undefined') return;

        // Update all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const txt = getText(key);
            if (txt) el.innerText = txt;
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const txt = getText(key);
            if (txt) el.placeholder = txt;
        });

        if (langSelector) langSelector.value = currentLang;

        // Re-render charts if data exists
        if (currentStreamerData) {
            const baseViewers = currentStreamerData.is_live ? currentStreamerData.viewers : (currentStreamerData.followers > 0 ? Math.round(currentStreamerData.followers * 0.03) : 2500);
            renderAllCharts(baseViewers, currentTimeframe);
        }
    }

    function setLanguage(lang) {
        if (typeof translations === 'undefined' || !translations[lang]) return;
        currentLang = lang;
        try {
            localStorage.setItem('twitchstat_lang', lang);
        } catch (e) {}
        applyTranslations();
    }

    if (langSelector) {
        langSelector.addEventListener('change', (e) => {
            setLanguage(e.target.value);
        });
    }

    // Chart Instances
    let viewersChartInstance = null;
    let subsChartInstance = null;
    let locationChartInstance = null;
    let activityChartInstance = null;

    // --- TOAST NOTIFICATION ---
    function showToast(message, icon = '✨') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
        
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- HELPER FUNCTIONS ---
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function formatNumber(num) {
        if (num === undefined || num === null || num < 0) return '-';
        return new Intl.NumberFormat('hu-HU').format(num);
    }

    function startUptimeTimer(startTime) {
        if (uptimeInterval) clearInterval(uptimeInterval);
        if (!startTime) return;

        const start = new Date(startTime).getTime();

        function update() {
            const now = new Date().getTime();
            const diff = now - start;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            uptimeBadgeEl.innerText =
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        update();
        uptimeInterval = setInterval(update, 1000);
    }

    // --- FAVORITES SYSTEM ---
    function loadFavoritesFromStorage() {
        try {
            const stored = localStorage.getItem('twitchstat_favorites');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    function saveFavoritesToStorage() {
        try {
            localStorage.setItem('twitchstat_favorites', JSON.stringify(favorites));
        } catch (e) {
            console.error('Failed to save favorites to localStorage', e);
        }
    }

    function renderFavoritesUI() {
        favoritesList.innerHTML = '';

        if (favorites.length === 0) {
            favoritesList.innerHTML = '<span class="empty-fav-msg">Kattints a streamer profilján lévő csillagra a kedvencekhez adáshoz!</span>';
            return;
        }

        favorites.forEach(fav => {
            const chip = document.createElement('div');
            chip.className = 'fav-chip';
            chip.innerHTML = `
                <img class="fav-avatar" src="${fav.avatar}" alt="${fav.name}">
                <span class="fav-name">${fav.name}</span>
                <button class="remove-fav-btn" title="Eltávolítás">&times;</button>
            `;

            chip.querySelector('.fav-name').addEventListener('click', () => {
                updateDashboard(fav.login);
            });

            chip.querySelector('.fav-avatar').addEventListener('click', () => {
                updateDashboard(fav.login);
            });

            chip.querySelector('.remove-fav-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFavorite(fav.login);
            });

            favoritesList.appendChild(chip);
        });
    }

    function toggleFavorite() {
        if (!currentStreamerData) return;

        const login = currentStreamerData.login;
        const index = favorites.findIndex(f => f.login === login);

        if (index > -1) {
            favorites.splice(index, 1);
            favToggleBtn.classList.remove('active');
            showToast(`${currentStreamerData.name} eltávolítva a kedvencek közül.`, '🗑️');
        } else {
            favorites.push({
                name: currentStreamerData.name,
                login: currentStreamerData.login,
                avatar: currentStreamerData.avatar
            });
            favToggleBtn.classList.add('active');
            showToast(`${currentStreamerData.name} hozzáadva a kedvencekhez!`, '⭐');
        }

        saveFavoritesToStorage();
        renderFavoritesUI();
    }

    function removeFavorite(login) {
        favorites = favorites.filter(f => f.login !== login);
        if (currentStreamerData && currentStreamerData.login === login) {
            favToggleBtn.classList.remove('active');
        }
        saveFavoritesToStorage();
        renderFavoritesUI();
        showToast(`Kedvenc eltávolítva.`, 'ℹ️');
    }

    function updateFavoriteButtonState() {
        if (!currentStreamerData) return;
        const isFav = favorites.some(f => f.login === currentStreamerData.login);
        if (isFav) {
            favToggleBtn.classList.add('active');
        } else {
            favToggleBtn.classList.remove('active');
        }
    }

    // --- EMBEDDED TWITCH PLAYER ---
    function openEmbedPlayer(login) {
        if (!login) return;

        playerStreamerName.innerText = `${currentStreamerData ? currentStreamerData.name : login} - Élő Adás`;
        const parentDomain = window.location.hostname || 'localhost';

        iframeWrapper.innerHTML = `
            <iframe
                src="https://player.twitch.tv/?channel=${login}&parent=${parentDomain}&autoplay=true"
                allowfullscreen>
            </iframe>
        `;

        playerModal.style.display = 'block';
        playerModal.scrollIntoView({ behavior: 'smooth' });
    }

    function closeEmbedPlayer() {
        iframeWrapper.innerHTML = '';
        playerModal.style.display = 'none';
    }

    // --- EMBED WIDGET MODAL LOGIC ---
    const embedBtn = document.getElementById('embedBtn');
    const embedModal = document.getElementById('embedModal');
    const closeEmbedModalBtn = document.getElementById('closeEmbedModalBtn');
    const embedCodeText = document.getElementById('embedCodeText');
    const copyEmbedCodeBtn = document.getElementById('copyEmbedCodeBtn');
    const embedPreviewWrapper = document.getElementById('embedPreviewWrapper');

    function openEmbedWidgetModal() {
        if (!currentStreamerData) return;

        const login = currentStreamerData.login;
        const embedUrl = `${window.location.origin}/embed.html?q=${encodeURIComponent(login)}`;
        const iframeSnippet = `<iframe src="${embedUrl}" width="400" height="320" frameborder="0" scrolling="no" style="border-radius:16px; border:1px solid rgba(255,255,255,0.1);"></iframe>`;

        embedCodeText.value = iframeSnippet;

        embedPreviewWrapper.innerHTML = `
            <iframe src="${embedUrl}" frameborder="0" scrolling="no"></iframe>
        `;

        embedModal.style.display = 'block';
        embedModal.scrollIntoView({ behavior: 'smooth' });
    }

    function closeEmbedWidgetModal() {
        embedPreviewWrapper.innerHTML = '';
        embedModal.style.display = 'none';
    }

    if (embedBtn) embedBtn.addEventListener('click', openEmbedWidgetModal);
    if (closeEmbedModalBtn) closeEmbedModalBtn.addEventListener('click', closeEmbedWidgetModal);

    if (copyEmbedCodeBtn) {
        copyEmbedCodeBtn.addEventListener('click', () => {
            if (embedCodeText.value) {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(embedCodeText.value).then(() => {
                        showToast('Widget beágyazó kód másolva a vágólapra!', '📋');
                    });
                } else {
                    embedCodeText.select();
                    document.execCommand('copy');
                    showToast('Widget beágyazó kód másolva a vágólapra!', '📋');
                }
            }
        });
    }

    // --- DASHBOARD DATA FETCHING ---
    async function updateDashboard(streamerName) {
        if (!streamerName) return;

        // UI Loading state
        streamerNameEl.innerText = "Betöltés...";
        streamerNameEl.style.opacity = "0.5";

        try {
            const response = await fetch(`/api/streamer?q=${encodeURIComponent(streamerName)}`);
            const data = await response.json();

            if (!response.ok) {
                if (data.error === 'Streamer not found') {
                    showToast(`Nem található '${streamerName}' nevű streamer.`, '❌');
                } else {
                    showToast('Hiba történt az adatok lekérésekor.', '⚠️');
                }
                streamerNameEl.innerText = "Hiba";
                streamerNameEl.style.opacity = "1";
                return;
            }

            currentStreamerData = data;

            if (data.is_demo) {
                showToast(`⚠️ Demó adatok (A .env fájlban megadott Twitch Client Secret érvénytelen).`, '🔑');
            }

            // 1. Update Profile Card
            streamerNameEl.innerText = data.name;
            streamerNameEl.style.opacity = "1";
            streamerLoginEl.innerText = `@${data.login}`;
            streamerBioEl.innerText = data.description || "Ennek a streamernek nincs megadott leírása.";
            accountCreatedEl.innerText = formatDate(data.created_at);
            streamerLangEl.innerText = data.language ? data.language.toUpperCase() : 'Magyar';
            avatarEl.src = data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=9146FF&color=fff&size=128`;
            twitchExternalLink.href = `https://twitch.tv/${data.login}`;

            updateFavoriteButtonState();

            // 2. Update KPI Stats
            if (data.followers === -1) {
                followersEl.innerText = "Privát";
                followersEl.title = "A követők száma nem nyilvános (Twitch API korlát).";
            } else {
                followersEl.innerText = formatNumber(data.followers);
                followersEl.title = "";
            }

            totalViewsEl.innerText = formatNumber(data.view_count);

            const baseViewers = data.is_live ? data.viewers : (data.followers > 0 ? Math.round(data.followers * 0.03) : 2500);
            const avgCalc = Math.round(baseViewers * (0.85 + Math.random() * 0.2));
            const peakCalc = Math.round(baseViewers * (1.6 + Math.random() * 0.5));

            avgViewersEl.innerText = formatNumber(avgCalc > 0 ? avgCalc : 1200);
            peakViewersEl.innerText = formatNumber(peakCalc > 0 ? peakCalc : 3500);

            // 3. Update Live Status & Stream Card
            if (data.is_live) {
                liveBadgeEl.innerText = 'ÉLŐ';
                liveBadgeEl.className = 'status-badge live';
                statusRingEl.className = 'status-ring live';

                streamInfoCard.style.display = 'block';
                streamTitleEl.innerText = data.title || "Élő adás";
                gameNameEl.innerText = data.game_name || "Egyéb kategória";
                streamThumbnailEl.src = data.thumbnail_url ? `${data.thumbnail_url}?t=${new Date().getTime()}` : '';
                liveViewersEl.innerText = formatNumber(data.viewers);

                // Stream Tags
                streamTagsEl.innerHTML = '';
                if (data.tags && data.tags.length > 0) {
                    data.tags.forEach(tag => {
                        const pill = document.createElement('span');
                        pill.className = 'tag-pill';
                        pill.innerText = tag;
                        streamTagsEl.appendChild(pill);
                    });
                } else {
                    const pill = document.createElement('span');
                    pill.className = 'tag-pill';
                    pill.innerText = 'Gaming';
                    streamTagsEl.appendChild(pill);
                }

                startUptimeTimer(data.started_at);
            } else {
                liveBadgeEl.innerText = 'OFFLINE';
                liveBadgeEl.className = 'status-badge offline';
                statusRingEl.className = 'status-ring';
                streamInfoCard.style.display = 'none';

                if (uptimeInterval) clearInterval(uptimeInterval);
            }

            // 4. Render All Interactive Charts
            renderAllCharts(baseViewers, currentTimeframe);

        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Hálózati hiba a csatlakozás során.', '🚨');
            streamerNameEl.innerText = "Hálózati Hiba";
            streamerNameEl.style.opacity = "1";
        }
    }

    // --- CHART RENDERING ENGINE ---
    function renderAllCharts(baseViewers, timeframeDays) {
        destroyCharts();

        // Chart 1: Viewer Trends Line Chart
        renderViewersChart(baseViewers, timeframeDays);

        // Chart 2: Subscribers Doughnut Chart
        renderSubsChart(baseViewers);

        // Chart 3: Geographic Bar Chart
        renderLocationChart();

        // Chart 4: Stream Hours Activity Chart
        renderActivityChart(baseViewers);
    }

    function destroyCharts() {
        if (viewersChartInstance) viewersChartInstance.destroy();
        if (subsChartInstance) subsChartInstance.destroy();
        if (locationChartInstance) locationChartInstance.destroy();
        if (activityChartInstance) activityChartInstance.destroy();
    }

    // 1. Viewer History Line Chart
    function renderViewersChart(baseViewers, days) {
        const timeData = generateTimeSeriesData(baseViewers, days);
        const ctx = document.getElementById('viewersChart').getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(145, 70, 255, 0.45)');
        gradient.addColorStop(1, 'rgba(145, 70, 255, 0.0)');

        viewersChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeData.labels,
                datasets: [{
                    label: 'Átlagos nézőszám',
                    data: timeData.data,
                    borderColor: '#9146ff',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#9146ff',
                    pointBorderWidth: 2,
                    pointRadius: days > 30 ? 2 : 4,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.38
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            callback: value => formatNumber(value)
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 2. Subscribers Tier Doughnut Chart
    function renderSubsChart(baseViewers) {
        const ctx = document.getElementById('subsChart').getContext('2d');

        const estTotalSubs = Math.max(150, Math.round(baseViewers * (0.15 + Math.random() * 0.1)));
        const tier1 = Math.round(estTotalSubs * 0.82);
        const tier2 = Math.round(estTotalSubs * 0.12);
        const tier3 = Math.round(estTotalSubs * 0.06);

        subsChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [`Tier 1 (${tier1})`, `Tier 2 (${tier2})`, `Tier 3 (${tier3})`],
                datasets: [{
                    data: [tier1, tier2, tier3],
                    backgroundColor: ['#9146ff', '#00f0ff', '#ff0055'],
                    borderColor: '#070709',
                    borderWidth: 3,
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 16,
                            color: '#f4f4f8'
                        }
                    }
                }
            }
        });
    }

    // 3. Location Chart
    function renderLocationChart() {
        const ctx = document.getElementById('locationChart').getContext('2d');
        const countries = ['Magyarország', 'Németország', 'Egyesült Királyság', 'Egyesült Államok', 'Románia', 'Ausztria'];
        const values = [84, 5, 4, 3, 2, 2];

        locationChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: countries,
                datasets: [{
                    label: 'Nézők (%)',
                    data: values,
                    backgroundColor: [
                        '#9146ff',
                        'rgba(145, 70, 255, 0.7)',
                        'rgba(145, 70, 255, 0.5)',
                        'rgba(145, 70, 255, 0.4)',
                        'rgba(145, 70, 255, 0.3)',
                        'rgba(145, 70, 255, 0.2)'
                    ],
                    borderRadius: 6,
                    barThickness: 18
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { callback: v => v + '%' }
                    },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // 4. Stream Hours Activity Chart
    function renderActivityChart(baseViewers) {
        const ctx = document.getElementById('activityChart').getContext('2d');
        const hours = ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00'];
        
        // Curve peak around 20:00 - 22:00
        const activityData = hours.map((h, i) => {
            const multiplier = [0.2, 0.35, 0.6, 0.85, 1.0, 0.9, 0.4, 0.1][i];
            return Math.round(baseViewers * multiplier * (0.9 + Math.random() * 0.2));
        });

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

        activityChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Átlagos nézőszám óránként',
                    data: activityData,
                    backgroundColor: gradient,
                    borderColor: '#00f0ff',
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 24
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { callback: v => formatNumber(v) }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Dynamic Time Series Generator
    function generateTimeSeriesData(baseLine = 5000, days = 30) {
        const labels = [];
        const data = [];
        const today = new Date();

        for (let i = days; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            const dateStr = days > 30 
                ? date.toLocaleDateString('hu-HU', { month: 'numeric', day: 'numeric' })
                : date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });

            labels.push(dateStr);

            // Weekend & Trend boost simulation
            let val = baseLine + (Math.random() * (baseLine * 0.4)) - (baseLine * 0.2);
            if (val < 0) val = 100;
            if (i % 7 === 0 || i % 7 === 6) val *= 1.25; // Weekend boost

            data.push(Math.round(val));
        }
        return { labels, data };
    }

    const searchSuggestionsEl = document.getElementById('searchSuggestions');
    let searchDebounceTimer = null;
    let selectedSuggestionIndex = -1;

    // --- SEARCH AUTOCOMPLETE DROPDOWN (Channels & Categories) ---
    async function fetchSearchSuggestions(query) {
        if (!query || query.length < 2) {
            hideSuggestions();
            return;
        }

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            const hasChannels = data && data.channels && data.channels.length > 0;
            const hasCategories = data && data.categories && data.categories.length > 0;

            if (hasChannels || hasCategories) {
                renderSuggestions(data);
            } else {
                hideSuggestions();
            }
        } catch (e) {
            hideSuggestions();
        }
    }

    function renderSuggestions(data) {
        searchSuggestionsEl.innerHTML = '';
        selectedSuggestionIndex = -1;

        const channels = data.channels || [];
        const categories = data.categories || [];

        // 1. Render Streamers Section
        if (channels.length > 0) {
            const header = document.createElement('div');
            header.className = 'suggestion-header';
            header.innerText = `💜 ${getText('section_channels')}`;
            searchSuggestionsEl.appendChild(header);

            channels.forEach((ch) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <div class="suggestion-main">
                        <img class="suggestion-avatar" src="${ch.avatar}" alt="${ch.name}">
                        <div class="suggestion-info">
                            <span class="suggestion-name">${ch.name}</span>
                            <span class="suggestion-game">${ch.game || 'Twitch Streamer'}</span>
                        </div>
                    </div>
                    <span class="suggestion-status ${ch.is_live ? 'live' : 'offline'}">
                        ${ch.is_live ? getText('live_badge') : getText('offline_badge')}
                    </span>
                `;

                item.addEventListener('click', () => {
                    selectSuggestion(ch.login, ch.name);
                });

                searchSuggestionsEl.appendChild(item);
            });
        }

        // 2. Render Categories Section
        if (categories.length > 0) {
            const catHeader = document.createElement('div');
            catHeader.className = 'suggestion-header';
            catHeader.innerText = `🎮 ${getText('section_categories')}`;
            searchSuggestionsEl.appendChild(catHeader);

            categories.forEach((cat) => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <div class="suggestion-main">
                        <img class="suggestion-boxart" src="${cat.box_art}" alt="${cat.name}">
                        <div class="suggestion-info">
                            <span class="suggestion-name">${cat.name}</span>
                            <span class="suggestion-game">Twitch Kategória / Játék</span>
                        </div>
                    </div>
                    <span class="badge bg-purple-subtle text-purple border font-normal fs-7">
                        🎮 Játék
                    </span>
                `;

                item.addEventListener('click', () => {
                    hideSuggestions();
                    openCategoryModal(cat.id, cat.name);
                });

                searchSuggestionsEl.appendChild(item);
            });
        }

        searchSuggestionsEl.style.display = 'block';
    }

    function selectSuggestion(login, displayName) {
        searchInput.value = displayName || login;
        clearSearchBtn.style.display = 'block';
        hideSuggestions();
        updateDashboard(login);
    }

    function hideSuggestions() {
        searchSuggestionsEl.style.display = 'none';
        searchSuggestionsEl.innerHTML = '';
        selectedSuggestionIndex = -1;
    }

    // --- CATEGORY ANALYTICS MODAL ---
    const categoryModal = document.getElementById('categoryModal');
    const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
    const categoryNameEl = document.getElementById('categoryName');
    const categoryBoxArtEl = document.getElementById('categoryBoxArt');
    const catTotalViewersEl = document.getElementById('catTotalViewers');
    const catActiveStreamsEl = document.getElementById('catActiveStreams');
    const categoryStreamersGrid = document.getElementById('categoryStreamersGrid');

    async function openCategoryModal(catId, catName) {
        if (!categoryModal) return;

        categoryNameEl.innerText = catName;
        catTotalViewersEl.innerText = '...';
        catActiveStreamsEl.innerText = '...';
        categoryStreamersGrid.innerHTML = '<div class="col-12 text-center py-4 text-muted">A kategória adatainak betöltése...</div>';
        categoryModal.style.display = 'block';

        try {
            const validId = (catId && catId !== 'null' && catId !== 'undefined') ? catId : null;
            const url = validId ? `/api/category?id=${validId}&name=${encodeURIComponent(catName)}` : `/api/category?name=${encodeURIComponent(catName)}`;
            const res = await fetch(url);
            const data = await res.json();

            categoryNameEl.innerText = data.name || catName;
            categoryBoxArtEl.src = data.box_art || 'https://static-cdn.jtvnw.net/ttv-boxart/509658-180x240.jpg';
            catTotalViewersEl.innerText = formatNumber(data.total_viewers || 0);
            catActiveStreamsEl.innerText = formatNumber(data.stream_count || 0);

            // Populate Growth Index & Insights
            const catGrowthIndexEl = document.getElementById('catGrowthIndex');
            const catGrowthLabelEl = document.getElementById('catGrowthLabel');
            const catCompetitionLevelEl = document.getElementById('catCompetitionLevel');
            const catBestHoursListEl = document.getElementById('catBestHoursList');

            if (catGrowthIndexEl) catGrowthIndexEl.innerText = `${data.growth_potential_index || 85}%`;
            if (catGrowthLabelEl) catGrowthLabelEl.innerText = data.growth_label || '🚀 Kiemelkedő Potenciál';
            if (catCompetitionLevelEl) catCompetitionLevelEl.innerText = data.competition_level || 'Alacsony Telítettség / Magas Nézői Kereslet';

            if (catBestHoursListEl && data.best_hours) {
                catBestHoursListEl.innerHTML = data.best_hours.map(bh => `
                    <div class="d-flex justify-content-between align-items-center border-bottom border-secondary-subtle py-1">
                        <span class="fw-bold text-light">${bh.hour}</span>
                        <span class="text-success font-monospace fw-bold">${bh.score} hatékonyság</span>
                    </div>
                `).join('');
            }

            renderCategoryStreamers(data.streams || []);
        } catch (e) {
            console.error('Category Modal error:', e);
            categoryStreamersGrid.innerHTML = '<div class="col-12 text-center py-4 text-danger">Nem sikerült betölteni a kategória adatait.</div>';
        }
    }

    function renderCategoryStreamers(streams) {
        categoryStreamersGrid.innerHTML = '';

        if (!streams || streams.length === 0) {
            categoryStreamersGrid.innerHTML = '<div class="col-12 text-center py-4 text-muted">Nincs aktív adás ebben a kategóriában.</div>';
            return;
        }

        streams.forEach(st => {
            const col = document.createElement('div');
            col.className = 'col-12 col-sm-6 col-md-4 col-lg-3';
            col.innerHTML = `
                <div class="cat-stream-card p-3 h-100 d-flex flex-column justify-content-between gap-2" data-login="${st.user_login}">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <img class="suggestion-avatar" src="${st.avatar}" alt="${st.user_name}">
                        <div class="overflow-hidden">
                            <h5 class="m-0 fs-6 fw-bold text-truncate">${st.user_name}</h5>
                            <span class="badge bg-danger p-1 fs-7">🔴 ${formatNumber(st.viewer_count)} néző</span>
                        </div>
                    </div>
                    <p class="small text-muted text-truncate-2 m-0" style="font-size:0.78rem;">${st.title || 'Élő adás'}</p>
                    <button class="btn btn-sm btn-outline-primary w-100 mt-2">
                        <span>Statisztika megtekintése</span>
                    </button>
                </div>
            `;

            col.querySelector('.cat-stream-card').addEventListener('click', () => {
                categoryModal.style.display = 'none';
                searchInput.value = st.user_name;
                updateDashboard(st.user_login);
            });

            categoryStreamersGrid.appendChild(col);
        });
    }

    if (closeCategoryModalBtn) {
        closeCategoryModalBtn.addEventListener('click', () => {
            if (categoryModal) categoryModal.style.display = 'none';
        });
    }

    // --- EVENT LISTENERS ---

    // Search Action
    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        hideSuggestions();
        clearSearchBtn.style.display = 'block';

        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            const categories = data.categories || [];
            const channels = data.channels || [];

            const exactCat = categories.find(c => c.name.toLowerCase() === query.toLowerCase());
            const exactChan = channels.find(c => c.name.toLowerCase() === query.toLowerCase() || c.login === query.toLowerCase());

            if (exactCat && !exactChan) {
                openCategoryModal(exactCat.id, exactCat.name);
            } else if (categories.length > 0 && channels.length === 0) {
                openCategoryModal(categories[0].id, categories[0].name);
            } else {
                updateDashboard(query);
            }
        } catch (e) {
            updateDashboard(query);
        }
    }

    searchBtn.addEventListener('click', handleSearch);

    searchInput.addEventListener('input', (e) => {
        const val = searchInput.value.trim();
        clearSearchBtn.style.display = val.length > 0 ? 'block' : 'none';

        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            fetchSearchSuggestions(val);
        }, 220);
    });

    searchInput.addEventListener('keydown', (e) => {
        const items = searchSuggestionsEl.querySelectorAll('.suggestion-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length > 0) {
                selectedSuggestionIndex = (selectedSuggestionIndex + 1) % items.length;
                updateActiveSuggestion(items);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length > 0) {
                selectedSuggestionIndex = (selectedSuggestionIndex - 1 + items.length) % items.length;
                updateActiveSuggestion(items);
            }
        } else if (e.key === 'Enter') {
            if (selectedSuggestionIndex >= 0 && items[selectedSuggestionIndex]) {
                e.preventDefault();
                const login = items[selectedSuggestionIndex].getAttribute('data-login');
                const name = items[selectedSuggestionIndex].getAttribute('data-name');
                selectSuggestion(login, name);
            } else {
                handleSearch();
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });

    function updateActiveSuggestion(items) {
        items.forEach((item, idx) => {
            if (idx === selectedSuggestionIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestionsEl.contains(e.target)) {
            hideSuggestions();
        }
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        hideSuggestions();
        searchInput.focus();
    });

    // Popular Chips Click (Streamer or Category)
    popularChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const streamer = chip.getAttribute('data-streamer');
            const category = chip.getAttribute('data-category');

            if (category) {
                searchInput.value = category;
                clearSearchBtn.style.display = 'block';
                openCategoryModal(null, category);
            } else if (streamer) {
                searchInput.value = streamer;
                clearSearchBtn.style.display = 'block';
                updateDashboard(streamer);
            }
        });
    });

    // Timeframe Selector Click
    tfButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tfButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentTimeframe = parseInt(btn.getAttribute('data-days'), 10);
            if (currentStreamerData) {
                const baseViewers = currentStreamerData.is_live ? currentStreamerData.viewers : (currentStreamerData.followers > 0 ? Math.round(currentStreamerData.followers * 0.03) : 2500);
                renderViewersChart(baseViewers, currentTimeframe);
            }
        });
    });

    // Favorite Toggle Button Click
    favToggleBtn.addEventListener('click', toggleFavorite);

    // Share Button Click
    shareBtn.addEventListener('click', () => {
        if (!currentStreamerData) return;
        const shareUrl = `${window.location.origin}${window.location.pathname}?q=${encodeURIComponent(currentStreamerData.login)}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('Profil hivatkozás másolva a vágólapra!', '🔗');
            });
        } else {
            showToast(`Hivatkozás: ${shareUrl}`, '🔗');
        }
    });

    // Open/Close Embedded Player
    openEmbedBtn.addEventListener('click', () => {
        if (currentStreamerData && currentStreamerData.login) {
            openEmbedPlayer(currentStreamerData.login);
        }
    });

    closePlayerBtn.addEventListener('click', closeEmbedPlayer);

    // --- Streamer Tools & Integrations Click Handlers ---
    const copyObsOverlayBtn = document.getElementById('copyObsOverlayBtn');
    const previewObsOverlayBtn = document.getElementById('previewObsOverlayBtn');
    const generateMediaKitBtn = document.getElementById('generateMediaKitBtn');
    const setupDiscordWebhookBtn = document.getElementById('setupDiscordWebhookBtn');

    if (copyObsOverlayBtn) {
        copyObsOverlayBtn.addEventListener('click', () => {
            const streamer = currentStreamerData ? currentStreamerData.login : 'thevr';
            const overlayUrl = `${window.location.origin}/overlay/follower-counter.html?streamer=${encodeURIComponent(streamer)}&color=ffffff&accent=9146ff&bg=transparent&size=28`;

            if (previewObsOverlayBtn) {
                previewObsOverlayBtn.setAttribute('href', `/overlay/follower-counter.html?streamer=${encodeURIComponent(streamer)}`);
            }

            if (navigator.clipboard) {
                navigator.clipboard.writeText(overlayUrl).then(() => {
                    showToast(`OBS Overlay URL kimásolva (${streamer})!`, '📺');
                });
            } else {
                showToast(`OBS URL: ${overlayUrl}`, '📺');
            }
        });
    }

    if (generateMediaKitBtn) {
        generateMediaKitBtn.addEventListener('click', async () => {
            const streamer = currentStreamerData ? currentStreamerData.login : 'thevr';
            showToast('Media Kit PDF riport generálása folyamatban...', '⏳');

            try {
                const res = await fetch('/api/mediakit/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ streamer })
                });
                const data = await res.json();
                if (data.success && data.report) {
                    showToast(`Media Kit PDF elkészült (${data.report.profile.name})!`, '📄');
                    generatePdfMediaKitDocument(data.report);
                } else {
                    showToast('Nem sikerült a Media Kit adatok lekérése.', '❌');
                }
            } catch (err) {
                console.error('Media Kit PDF hiba:', err);
                showToast('Hiba történt a Media Kit generálásakor.', '❌');
            }
        });
    }

    // --- Client-side jsPDF Document Builder ---
    function generatePdfMediaKitDocument(report) {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            showToast('jsPDF betöltési hiba. Frissítsd az oldalt!', '❌');
            return;
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const profile = report.profile || {};
        const kpis = report.kpis_30d || {};
        const categories = report.top_categories || [];

        // 1. Dark Header Banner
        doc.setFillColor(12, 12, 18);
        doc.rect(0, 0, 210, 42, 'F');

        doc.setTextColor(145, 70, 255); // Twitch Purple #9146FF
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('TwitchStat PRO', 15, 18);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.text('STREAMER MEDIA KIT & RIPORT', 15, 28);

        doc.setTextColor(154, 154, 176);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const formattedDate = new Date(report.generated_at || Date.now()).toLocaleDateString('hu-HU');
        doc.text(`Kiadás dátuma: ${formattedDate}`, 145, 28);

        // 2. Streamer Profile Info Card
        doc.setDrawColor(145, 70, 255);
        doc.setLineWidth(0.6);
        doc.setFillColor(24, 24, 38);
        doc.roundedRect(15, 50, 180, 36, 3, 3, 'FD');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(profile.name || 'Streamer', 22, 62);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(173, 114, 255);
        doc.text(`twitch.tv/${profile.login || 'streamer'}`, 22, 69);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(200, 200, 220);
        const bioText = (profile.bio || 'Twitch tartalomgyártó').slice(0, 85);
        doc.text(`Bio: ${bioText}`, 22, 77);

        // 3. 30-Day Key Metrics Section
        doc.setTextColor(145, 70, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('30 Napos Teljesítmény Mutatók (KPI)', 15, 97);

        const kpiBoxes = [
            { label: 'Követők', val: Number(kpis.followers || 0).toLocaleString('hu-HU') },
            { label: 'Átlagos Nézőszám', val: Number(kpis.avg_viewers || 0).toLocaleString('hu-HU') },
            { label: 'Csúcs Nézőszám', val: Number(kpis.peak_viewers || 0).toLocaleString('hu-HU') },
            { label: 'Összes Megtekintés', val: Number(kpis.total_views || 0).toLocaleString('hu-HU') },
            { label: 'Streamelt Órák', val: `${kpis.hours_streamed || 120} óra` },
            { label: 'Becsült Feliratkozók', val: Number(kpis.estimated_subs || 0).toLocaleString('hu-HU') }
        ];

        const startX = 15;
        const startY = 104;
        const boxWidth = 56;
        const boxHeight = 22;

        kpiBoxes.forEach((item, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const x = startX + col * (boxWidth + 6);
            const y = startY + row * (boxHeight + 6);

            doc.setFillColor(242, 242, 248);
            doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');

            doc.setTextColor(100, 100, 125);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.text(item.label.toUpperCase(), x + 4, y + 7);

            doc.setTextColor(12, 12, 18);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(item.val, x + 4, y + 16);
        });

        // 4. Top Categories Section
        doc.setTextColor(145, 70, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Legnépszerűbb Kategóriák (30 Nap)', 15, 168);

        let catY = 175;
        categories.forEach((cat) => {
            doc.setFillColor(242, 242, 248);
            doc.rect(15, catY, 180, 11, 'F');

            doc.setTextColor(20, 20, 30);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(cat.name, 20, catY + 7);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80, 80, 100);
            doc.text(`${cat.hours} óra adásidő  |  Átlag néző: ${Number(cat.avg_viewers).toLocaleString('hu-HU')}`, 105, catY + 7);

            catY += 15;
        });

        // 5. Footer Branding
        doc.setDrawColor(210, 210, 225);
        doc.line(15, 275, 195, 275);
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 150);
        doc.setFont('helvetica', 'normal');
        doc.text('Verifikált TwitchStat PRO Media Kit Riport - https://twitchstat.pro', 15, 282);

        // Trigger PDF file download in browser
        doc.save(`MediaKit_${profile.login || 'streamer'}_TwitchStatPRO.pdf`);
    }

    // --- Custom Action Modal Helper ---
    function showCustomPromptModal({ title, icon, desc, defaultValue = '', placeholder = '' }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customActionModal');
            const iconEl = document.getElementById('actionModalIcon');
            const titleEl = document.getElementById('actionModalTitle');
            const descEl = document.getElementById('actionModalDesc');
            const inputEl = document.getElementById('actionModalInput');
            const closeBtn = document.getElementById('closeActionModalBtn');
            const cancelBtn = document.getElementById('cancelActionModalBtn');
            const confirmBtn = document.getElementById('confirmActionModalBtn');

            if (!modal) {
                resolve(null);
                return;
            }

            if (iconEl) iconEl.textContent = icon || '⚙️';
            if (titleEl) titleEl.textContent = title || 'Művelet Megerősítése';
            if (descEl) descEl.textContent = desc || 'Adja meg a kért adatot:';
            if (inputEl) {
                inputEl.value = defaultValue;
                inputEl.placeholder = placeholder;
            }

            modal.style.display = 'block';
            setTimeout(() => { if (inputEl) inputEl.focus(); }, 100);

            const cleanup = () => {
                modal.style.display = 'none';
                confirmBtn.removeEventListener('click', onConfirm);
                cancelBtn.removeEventListener('click', onCancel);
                closeBtn.removeEventListener('click', onCancel);
            };

            const onConfirm = () => {
                const val = inputEl ? inputEl.value : '';
                cleanup();
                resolve(val);
            };

            const onCancel = () => {
                cleanup();
                resolve(null);
            };

            confirmBtn.addEventListener('click', onConfirm);
            cancelBtn.addEventListener('click', onCancel);
            closeBtn.addEventListener('click', onCancel);

            if (inputEl) {
                inputEl.onkeydown = (e) => {
                    if (e.key === 'Enter') onConfirm();
                    if (e.key === 'Escape') onCancel();
                };
            }
        });
    }

    if (setupDiscordWebhookBtn) {
        setupDiscordWebhookBtn.addEventListener('click', async () => {
            const streamer = currentStreamerData ? currentStreamerData.name : 'TheVR';
            
            const webhookUrl = await showCustomPromptModal({
                title: 'Discord Webhook Beállítása',
                icon: '🤖',
                desc: `Adja meg a Discord csatornája Webhook URL-jét az élő adás értesítésekhez (${streamer}):`,
                placeholder: 'https://discord.com/api/webhooks/...'
            });

            if (!webhookUrl || !webhookUrl.trim()) return;

            showToast('Discord teszt értesítés küldése...', '⏳');
            try {
                const res = await fetch('/api/webhooks/discord/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ webhook_url: webhookUrl.trim(), streamer })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Teszt Discord értesítés sikeresen elküldve!', '🤖');
                } else {
                    showToast(`⚠️ ${data.error || 'Discord hiba.'}`, '❌');
                }
            } catch (err) {
                showToast('Hálózati hiba a Discord webhook küldésekor.', '❌');
            }
        });
    }

    // --- 4. OBS Goal Progress Bar Overlay Builder Handler ---
    const copyObsGoalBarBtn = document.getElementById('copyObsGoalBarBtn');
    const previewGoalBarBtn = document.getElementById('previewGoalBarBtn');

    if (copyObsGoalBarBtn) {
        copyObsGoalBarBtn.addEventListener('click', async () => {
            const streamer = currentStreamerData ? currentStreamerData.login : 'thevr';
            const currentFollowers = currentStreamerData ? currentStreamerData.followers : 842000;
            const defaultGoal = currentFollowers > 500000 ? 1000000 : (currentFollowers > 100000 ? 500000 : 100000);

            const inputGoal = await showCustomPromptModal({
                title: 'OBS Goal Bar Követő Cél',
                icon: '🎯',
                desc: `Add meg a kitűzött követő célt a(z) ${streamer} csatornához:`,
                defaultValue: defaultGoal.toString(),
                placeholder: 'Pl. 1000000'
            });

            if (!inputGoal) return;

            const targetVal = parseInt(inputGoal.replace(/\s/g, ''), 10) || defaultGoal;
            const goalUrl = `${window.location.origin}/overlay/goal-bar.html?streamer=${encodeURIComponent(streamer)}&target=${targetVal}&title=Követő+Cél&color=ffffff&accent=00ff88`;

            if (previewGoalBarBtn) {
                previewGoalBarBtn.setAttribute('href', `/overlay/goal-bar.html?streamer=${encodeURIComponent(streamer)}&target=${targetVal}`);
            }

            if (navigator.clipboard) {
                navigator.clipboard.writeText(goalUrl).then(() => {
                    showToast(`OBS Goal Bar URL kimásolva (${targetVal.toLocaleString('hu-HU')} cél)!`, '🎯');
                });
            } else {
                showToast(`Goal Bar URL: ${goalUrl}`, '🎯');
            }
        });
    }

    // --- 5. Social Milestone Card Generator Handler ---
    const generateSocialCardBtn = document.getElementById('generateSocialCardBtn');

    if (generateSocialCardBtn) {
        generateSocialCardBtn.addEventListener('click', () => {
            const streamer = currentStreamerData ? currentStreamerData.name : 'TheVR';
            const followers = currentStreamerData ? currentStreamerData.followers : 842000;

            showToast('Mérföldkő kártya generálása...', '🎨');

            // Create Canvas
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 630;
            const ctx = canvas.getContext('2d');

            // Dark Neon Background
            const bgGradient = ctx.createLinearGradient(0, 0, 1200, 630);
            bgGradient.addColorStop(0, '#0c0c12');
            bgGradient.addColorStop(0.5, '#141424');
            bgGradient.addColorStop(1, '#070709');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, 1200, 630);

            // Glowing Purple Orb Effect
            const orbGradient = ctx.createRadialGradient(1000, 150, 50, 1000, 150, 450);
            orbGradient.addColorStop(0, 'rgba(145, 70, 255, 0.4)');
            orbGradient.addColorStop(1, 'rgba(145, 70, 255, 0)');
            ctx.fillStyle = orbGradient;
            ctx.fillRect(0, 0, 1200, 630);

            // Border Frame
            ctx.strokeStyle = 'rgba(145, 70, 255, 0.5)';
            ctx.lineWidth = 8;
            ctx.strokeRect(30, 30, 1140, 570);

            // Brand Header
            ctx.fillStyle = '#9146ff';
            ctx.font = 'bold 36px Outfit, sans-serif';
            ctx.fillText('TWITCHSTAT PRO', 80, 100);

            ctx.fillStyle = '#9a9ab0';
            ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
            ctx.fillText('OFFICIAL MILESTONE BADGE', 80, 135);

            // Streamer Name
            ctx.fillStyle = '#ffffff';
            ctx.font = 'extrabold 72px Outfit, sans-serif';
            ctx.fillText(streamer, 80, 260);

            // Milestone Badge / Value
            ctx.fillStyle = '#00ff88';
            ctx.font = 'extrabold 90px Outfit, sans-serif';
            ctx.fillText(`${Number(followers).toLocaleString('hu-HU')} KÖVETŐ!`, 80, 370);

            // Subtitle Celebration
            ctx.fillStyle = '#f4f4f8';
            ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
            ctx.fillText('🎉 Hivatalos közösségi mérföldkő elérve!', 80, 440);

            // Footer URL
            ctx.fillStyle = '#ad72ff';
            ctx.font = 'bold 24px Outfit, sans-serif';
            ctx.fillText('https://twitchstat.pro', 80, 540);

            // Download Image
            const dataUrl = canvas.toDataURL('image/png');
            const anchor = document.createElement('a');
            anchor.href = dataUrl;
            anchor.download = `Milestone_${streamer.replace(/\s+/g, '_')}_TwitchStatPRO.png`;
            anchor.click();

            showToast('🖼️ Mérföldkő kártya letöltve!', '✅');
        });
    }

    // Initial Load Logic
    applyTranslations();
    renderFavoritesUI();

    // Check URL Parameters for ?q=streamer
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');

    if (initialQuery) {
        searchInput.value = initialQuery;
        clearSearchBtn.style.display = 'block';
        updateDashboard(initialQuery);
    } else if (favorites.length > 0) {
        updateDashboard(favorites[0].login);
    } else {
        // Default initial load: TheVR
        updateDashboard('TheVR');
    }
});
