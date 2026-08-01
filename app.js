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

            renderCategoryStreamers(data.streams || []);
        } catch (e) {
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
