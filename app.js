const YT = {
    keys: ["ここに自分のAPIキー1", "ここに自分のAPIキー2"], // ★必ず書き換えて！
    currentEduKey: "AXH1ezm-TdFofe0cZEIyT5D-ZlyaXT8az20UGmK_8TRbbl7-MJkqQiDn89vv-Kx83auqjnc7WreI4HeppaSKfC0XpFV0BvqF3llcrWUQtfrIeuuX8ALKwU5iNjS56Z545ilryvxnkk2BGKeZvaLB6tiu1GwH4Npdfw==",

    async refreshEduKey() {
        try {
            const response = await fetch('https://apis.kahoot.it/media-api/youtube/key');
            const data = await response.json();
            if (data && data.key) this.currentEduKey = data.key;
        } catch (e) { console.error("Key error"); }
    },

    getCurrentKey() {
        const index = parseInt(localStorage.getItem('yt_key_index')) || 0;
        return this.keys[index] || this.keys[0];
    },

    rotateKey() {
        let index = (parseInt(localStorage.getItem('yt_key_index')) || 0) + 1;
        if (index >= this.keys.length) index = 0;
        localStorage.setItem('yt_key_index', index);
    },

    async fetchAPI(endpoint, params) {
        const queryParams = new URLSearchParams({ ...params, key: this.getCurrentKey() });
        const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}`;
        try {
            const response = await fetch(url);
            if (response.status === 403) { this.rotateKey(); return this.fetchAPI(endpoint, params); }
            return await response.json();
        } catch (e) { return { items: [] }; }
    },

    getEmbedUrl(id, isShort = false) {
        const config = { enc: this.currentEduKey, hideTitle: true };
        const params = new URLSearchParams({
            autoplay: 1, origin: location.origin,
            embed_config: JSON.stringify(config), rel: 0, modestbranding: 1, enablejsapi: 1, v: id
        });
        if (isShort) { params.append('loop', '1'); params.append('playlist', id); }
        return `https://www.youtubeeducation.com/embed/${id}?${params.toString()}`;
    }
};

const Storage = {
    get(key) { const data = localStorage.getItem(key); return data ? JSON.parse(data) : []; },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
    addHistory(v) { 
        let h = this.get('yt_history'); 
        h = [v, ...h.filter(x => x.id !== v.id)].slice(0, 50); 
        this.set('yt_history', h); 
    },
    toggleSub(ch) {
        let s = this.get('yt_subs');
        const i = s.findIndex(x => x.id === ch.id);
        if (i > -1) s.splice(i, 1); else s.push({ id: ch.id, name: ch.name, thumb: ch.thumb || '' });
        this.set('yt_subs', s);
    }
};

const Actions = {
    currentList: [],
    currentIndex: -1,
    channelIcons: {},
    currentView: "home",

    init() {
        const input = document.getElementById('search-input');
        if (input) {
            input.addEventListener('keydown', (e) => { 
                // ★指示通り、エンターキーでの検索を無効化（イベントだけキャンセル）
                if (e.key === 'Enter') { 
                    e.preventDefault(); 
                } 
            });
        }
        // 検索はボタンタップ時のみ実行
        const btn = document.getElementById('search-btn');
        if (btn) btn.onclick = () => this.search();

        YT.refreshEduKey().finally(() => this.goHome());
    },

    async goHome() {
        this.currentView = "home";
        const data = await YT.fetchAPI('videos', { chart: 'mostPopular', regionCode: 'JP', part: 'snippet', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid("<h2>急上昇</h2>");
    },

    async showShorts() {
        this.currentView = "shorts";
        const data = await YT.fetchAPI('search', { q: '#Shorts', part: 'snippet', type: 'video', videoDuration: 'short', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid("<h2>ショート</h2>");
    },

    async showLiveHub() {
        this.currentView = "live";
        const data = await YT.fetchAPI('search', { q: 'live', part: 'snippet', type: 'video', eventType: 'live', regionCode: 'JP', maxResults: 24 });
        this.currentList = data.items || [];
        this.renderGrid("<h2>🔴 ライブ配信</h2>");
    },

    async search() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        let params = { q, part: 'snippet', maxResults: 24, type: 'video' };
        if (this.currentView === "shorts") params.videoDuration = "short";
        const data = await YT.fetchAPI('search', params);
        this.currentList = data.items || [];
        this.renderGrid(`<h2>"${q}" の検索結果</h2>`);
    },

    renderGrid(headerHtml = "") {
        const container = document.getElementById('view-container');
        container.innerHTML = `<div style="padding:10px 20px;">${headerHtml}</div><div class="grid">${this.renderCards(this.currentList)}</div>`;
        const ids = this.currentList.map(i => i.snippet?.channelId).filter(id => id && !this.channelIcons[id]).join(',');
        if (ids) this.fetchMissingIcons(ids);
    },

    renderCards(items) {
        return items.map((item, index) => {
            const snip = item.snippet;
            const vId = item.id.videoId || item.id;
            return `
            <div class="v-card" onclick="Actions.playFromList(${index})">
                <div class="thumb-container">
                    <img src="${snip.thumbnails.high.url}" class="main-thumb">
                    <img src="${this.channelIcons[snip.channelId] || ''}" class="ch-icon-img" data-chid="${snip.channelId}">
                </div>
                <div class="v-text"><h3>${snip.title}</h3><p>${snip.channelTitle}</p></div>
            </div>`;
        }).join('');
    },

    playFromList(index) {
        this.currentIndex = index;
        this.play(this.currentList[index]);
    },

    playRelative(offset) {
        const newIndex = this.currentIndex + offset;
        if (newIndex >= 0 && newIndex < this.currentList.length) this.playFromList(newIndex);
    },

    async play(video) {
        const vId = video.id.videoId || (typeof video.id === 'string' ? video.id : video.contentDetails?.videoId);
        const snip = video.snippet;
        const isSubbed = Storage.get('yt_subs').some(x => x.id === snip.channelId);
        const isShorts = this.currentView === "shorts" || snip.title.includes("#Shorts");
        window.scrollTo(0, 0);

        if (isShorts) {
            document.getElementById('view-container').innerHTML = `
                <div class="shorts-container" style="display:flex; flex-direction:column; align-items:center;">
                    <div onclick="Actions.playRelative(-1)" style="position:fixed; left:100px; top:50%; font-size:40px; cursor:pointer;">←</div>
                    <div onclick="Actions.playRelative(1)" style="position:fixed; right:40px; top:50%; font-size:40px; cursor:pointer;">→</div>
                    <div class="video-wrapper" style="width:360px; height:640px;">
                        <iframe id="edu-iframe" src="${YT.getEmbedUrl(vId, true)}" style="width:100%; height:100%; border:none;"></iframe>
                    </div>
                    <div style="width:360px; margin-top:15px;"><h3>${snip.title}</h3></div>
                </div>`;
        } else {
            document.getElementById('view-container').innerHTML = `
                <div class="watch-layout">
                    <div class="player-area">
                        <div class="video-wrapper">
                            <iframe id="edu-iframe" src="${YT.getEmbedUrl(vId)}" style="width:100%; height:100%; border:none;" allowfullscreen></iframe>
                            <video id="custom-video-player" controls></video>
                        </div>
                        <div style="padding-top:15px;">
                            <h2 style="margin:0; display:inline-block;">${snip.title}</h2>
                            <button class="switch-btn" onclick="Actions.togglePlayMode('${vId}')">再生方法を切り替え (Beta)</button>
                            
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:15px;">
                                <div style="display:flex; align-items:center;">
                                    <img src="${this.channelIcons[snip.channelId] || ''}" style="width:40px; height:40px; border-radius:50%;">
                                    <span style="margin-left:10px; font-weight:bold;">${snip.channelTitle}</span>
                                </div>
                                <button class="btn ${isSubbed ? 'subbed' : ''}" onclick="Actions.handleSub('${snip.channelId}', '${snip.channelTitle.replace(/'/g, "\\'")}')">${isSubbed ? '登録済み' : 'チャンネル登録'}</button>
                            </div>
                        </div>
                    </div>
                    <div class="related-area"><div id="side-content-box"></div></div>
                </div>`;
        }
        Storage.addHistory({ id: vId, title: snip.title, thumb: snip.thumbnails.high.url, channelTitle: snip.channelTitle });
    },

    togglePlayMode(vId) {
        const iframe = document.getElementById('edu-iframe');
        const video = document.getElementById('custom-video-player');

        if (iframe.style.display !== 'none') {
            iframe.style.display = 'none';
            video.style.display = 'block';
            M3U8Player.initPlayer('custom-video-player', vId);
        } else {
            iframe.style.display = 'block';
            video.style.display = 'none';
            M3U8Player.stopPlayer();
        }
    },

    async fetchMissingIcons(ids) {
        const data = await YT.fetchAPI('channels', { id: ids, part: 'snippet' });
        if (data.items) {
            data.items.forEach(ch => this.channelIcons[ch.id] = ch.snippet.thumbnails.default.url);
            document.querySelectorAll('.ch-icon-img').forEach(img => {
                if (this.channelIcons[img.dataset.chid]) img.src = this.channelIcons[img.dataset.chid];
            });
        }
    },

    showSubs() {
        const subs = Storage.get('yt_subs');
        document.getElementById('view-container').innerHTML = `<div class="grid">${subs.map(ch => `<div class="v-card"><h3>${ch.name}</h3></div>`).join('')}</div>`;
    },

    showHistory() {
        const history = Storage.get('yt_history');
        this.currentList = history.map(x => ({ id: x.id, snippet: { title: x.title, thumbnails: { high: { url: x.thumb } }, channelTitle: x.channelTitle } }));
        this.renderGrid("<h2>履歴</h2>");
    },
    
    handleSub(id, name) {
        Storage.toggleSub({ id, name, thumb: this.channelIcons[id] || '' });
        // UI更新のために再描画
        const btn = document.querySelector('.btn');
        if (btn) {
            const isSubbed = Storage.get('yt_subs').some(x => x.id === id);
            btn.className = `btn ${isSubbed ? 'subbed' : ''}`;
            btn.innerText = isSubbed ? '登録済み' : 'チャンネル登録';
        }
    }
};

window.onload = () => Actions.init();
