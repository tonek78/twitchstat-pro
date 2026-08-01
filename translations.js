// TwitchStats Pro - Multi-Language (i18n) Translations Dictionary

const translations = {
    hu: {
        app_title: "TwitchStats PRO - Streamer Analitika",
        search_placeholder: "Keress streamert (pl. TheVR, xQc, Pierce)...",
        search_btn: "Keresés",
        popular_label: "Népszerű:",
        favorites_title: "Kedvencek:",
        empty_fav_msg: "Kattints a profil csillag gombjára a kedvencekhez adáshoz!",
        open_twitch: "Megnyitás Twitch-en",
        registered_label: "Regisztráció:",
        language_label: "Nyelv:",
        live_badge: "ÉLŐ",
        offline_badge: "OFFLINE",
        watch_here: "Lejátszás itt",
        viewers_label: "néző jelenleg",
        
        // KPI Cards
        kpi_followers: "Követők",
        kpi_followers_sub: "Követőtábor",
        kpi_views: "Megtekintés",
        kpi_views_sub: "Összes nézettség",
        kpi_avg: "Átlag Néző",
        kpi_avg_sub: "30 napos átlag",
        kpi_peak: "Csúcs Néző",
        kpi_peak_sub: "Rekord egyidejű",
        
        // Charts
        chart_viewers_title: "Nézőszám Trendek",
        chart_subs_title: "Feliratkozók (Becsült Tier Eloszlás)",
        chart_location_title: "Nézők Becsült Földrajzi Eloszlása",
        chart_activity_title: "Adásidők és Csúcsidőszakok (Óránként)",
        tf_7d: "7 Nap",
        tf_30d: "30 Nap",
        tf_90d: "90 Nap",
        est_badge: "ℹ️ Becsült adat",

        // Embed & Modals
        embed_title: "Statisztika Widget Beágyazása",
        embed_desc: "Másold ki az alábbi iframe kódot a saját weboldaladba!",
        copy_code_btn: "Kód Másolása",
        widget_preview: "Widget Előnézet:",
        close_btn: "Bezárás",

        // Category Search & Modal
        section_channels: "Streamerek",
        section_categories: "Kategóriák / Játékok",
        cat_top_streamers: "Legnépszerűbb Élő Streamerek ebben a Kategóriában",
        cat_viewers: "Élő Néző",
        cat_active_streams: "Aktív Csatorna",

        // Toast Messages
        toast_fav_add: "{name} hozzáadva a kedvencekhez!",
        toast_fav_remove: "{name} eltávolítva a kedvencek közül.",
        toast_link_copied: "Profil hivatkozás másolva a vágólapra!",
        toast_embed_copied: "Widget beágyazó kód másolva a vágólapra!",
        toast_not_found: "Nem található '{name}' nevű streamer vagy kategória.",
        toast_demo: "⚠️ Demó adatok (a .env-ben lévő Twitch Client Secret érvénytelen)."
    },

    en: {
        app_title: "TwitchStats PRO - Streamer Analytics",
        search_placeholder: "Search streamer or category (e.g. TheVR, GTA V, Just Chatting)...",
        search_btn: "Search",
        popular_label: "Popular:",
        favorites_title: "Favorites:",
        empty_fav_msg: "Click the star icon on any profile to add to favorites!",
        open_twitch: "Open on Twitch",
        registered_label: "Registered:",
        language_label: "Language:",
        live_badge: "LIVE",
        offline_badge: "OFFLINE",
        watch_here: "Watch Here",
        viewers_label: "current viewers",

        // KPI Cards
        kpi_followers: "Followers",
        kpi_followers_sub: "Total fanbase",
        kpi_views: "Total Views",
        kpi_views_sub: "Channel views",
        kpi_avg: "Avg Viewers",
        kpi_avg_sub: "30-day average",
        kpi_peak: "Peak Viewers",
        kpi_peak_sub: "Record concurrent",

        // Charts
        chart_viewers_title: "Viewer Trends",
        chart_subs_title: "Subscribers (Estimated Tier Distribution)",
        chart_location_title: "Estimated Viewer Demographics",
        chart_activity_title: "Stream Schedule & Peak Hours (Hourly)",
        tf_7d: "7 Days",
        tf_30d: "30 Days",
        tf_90d: "90 Days",
        est_badge: "ℹ️ Estimated",

        // Embed & Modals
        embed_title: "Embed Statistics Widget",
        embed_desc: "Copy the iframe snippet below to embed on your website!",
        copy_code_btn: "Copy Code",
        widget_preview: "Widget Preview:",
        close_btn: "Close",

        // Category Search & Modal
        section_channels: "Streamers",
        section_categories: "Categories / Games",
        cat_top_streamers: "Top Live Streamers in this Category",
        cat_viewers: "Live Viewers",
        cat_active_streams: "Active Streams",

        // Toast Messages
        toast_fav_add: "{name} added to favorites!",
        toast_fav_remove: "{name} removed from favorites.",
        toast_link_copied: "Profile link copied to clipboard!",
        toast_embed_copied: "Widget embed code copied to clipboard!",
        toast_not_found: "Streamer or Category '{name}' not found.",
        toast_demo: "⚠️ Demo mode (Twitch Client Secret in .env is invalid)."
    },

    de: {
        app_title: "TwitchStats PRO - Streamer Analytik",
        search_placeholder: "Streamer oder Kategorie suchen (z. B. GTA V, Just Chatting)...",
        search_btn: "Suchen",
        popular_label: "Beliebt:",
        favorites_title: "Favoriten:",
        empty_fav_msg: "Klicke auf das Stern-Symbol, um Favoriten hinzuzufügen!",
        open_twitch: "Auf Twitch öffnen",
        registered_label: "Registriert:",
        language_label: "Sprache:",
        live_badge: "LIVE",
        offline_badge: "OFFLINE",
        watch_here: "Hier ansehen",
        viewers_label: "Zuschauer aktuell",

        // KPI Cards
        kpi_followers: "Follower",
        kpi_followers_sub: "Gesamte Fans",
        kpi_views: "Aufrufe",
        kpi_views_sub: "Kanal-Aufrufe",
        kpi_avg: "Ø Zuschauer",
        kpi_avg_sub: "30-Tage Durchschnitt",
        kpi_peak: "Spitzen-Zuschauer",
        kpi_peak_sub: "Rekord gleichzeitig",

        // Charts
        chart_viewers_title: "Zuschauer-Trends",
        chart_subs_title: "Abonnenten (Geschätzte Tier-Verteilung)",
        chart_location_title: "Geschätzte Zuschauer-Demografie",
        chart_activity_title: "Streaming-Zeiten & Spitzenstunden",
        tf_7d: "7 Tage",
        tf_30d: "30 Tage",
        tf_90d: "90 Tage",
        est_badge: "ℹ️ Geschätzt",

        // Embed & Modals
        embed_title: "Statistik-Widget einbetten",
        embed_desc: "Kopiere den iFrame-Code für deine Webseite!",
        copy_code_btn: "Code kopieren",
        widget_preview: "Widget Vorschau:",
        close_btn: "Schließen",

        // Category Search & Modal
        section_channels: "Streamer",
        section_categories: "Kategorien / Spiele",
        cat_top_streamers: "Top-Live-Streamer in dieser Kategorie",
        cat_viewers: "Live-Zuschauer",
        cat_active_streams: "Aktive Streams",

        // Toast Messages
        toast_fav_add: "{name} zu Favoriten hinzugefügt!",
        toast_fav_remove: "{name} aus Favoriten entfernt.",
        toast_link_copied: "Profil-Link in Zwischenablage kopiert!",
        toast_embed_copied: "Einbettungscode in Zwischenablage kopiert!",
        toast_not_found: "Streamer oder Kategorie '{name}' nicht gefunden.",
        toast_demo: "⚠️ Demo-Modus (Twitch Client Secret in .env ist ungültig)."
    }
};

if (typeof module !== 'undefined') {
    module.exports = translations;
}
