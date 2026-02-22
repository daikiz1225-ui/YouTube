const M3U8Player = {
    hls: null,

    async initPlayer(videoElementId, videoId) {
        const video = document.getElementById(videoElementId);
        if (!video) return;

        console.log("外部解析エンジンを使用してリンクを取得中...");
        
        try {
            // Vercelサーバーを使わず、外部のインビディアスAPI（解析用）を借りる
            // これにより「Bot認定」の制限を回避する
            const invidiousInstances = [
                'https://invidious.v0l.io',
                'https://inv.tux.rs',
                'https://invidious.namazso.eu'
            ];
            
            // ランダムなインスタンスからデータを取得
            const instance = invidiousInstances[Math.floor(Math.random() * invidiousInstances.length)];
            const response = await fetch(`${instance}/api/v1/videos/${videoId}`);
            const data = await response.json();

            // HLSリンク(m3u8)を探す
            let m3u8Url = data.hlsUrl;
            
            // もしhlsUrlが相対パスなら絶対パスに直す
            if (m3u8Url && m3u8Url.startsWith('/')) {
                m3u8Url = instance + m3u8Url;
            }

            if (!m3u8Url) {
                // HLSがない場合は直接動画ファイル(adaptiveFormats)から取得
                const format = data.adaptiveFormats.find(f => f.type.includes('video/mp4') && f.url);
                m3u8Url = format ? format.url : null;
            }

            if (!m3u8Url) throw new Error("再生可能なリンクが見つかりませんでした");

            if (Hls.isSupported()) {
                if (this.hls) this.hls.destroy();
                this.hls = new Hls();
                this.hls.loadSource(m3u8Url);
                this.hls.attachMedia(video);
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            } else {
                video.src = m3u8Url;
                video.play();
            }
        } catch (err) {
            console.error("Extraction Error:", err);
            alert("再生エラー: YouTubeのBot対策を突破できませんでした。Educationモード（標準）でお楽しみください。");
        }
    },

    stopPlayer() {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        const video = document.getElementById('custom-video-player');
        if (video) {
            video.pause();
            video.src = "";
            video.load();
        }
    }
};
