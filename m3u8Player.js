const M3U8Player = {
    hls: null,

    async initPlayer(videoElementId, videoId) {
        const video = document.getElementById(videoElementId);
        if (!video) return;

        console.log("m3u8 link fetching... ID:", videoId);

        try {
            // Vercel APIからHLSリンクを取得
            const response = await fetch(`/api/extract?id=${videoId}`);
            const data = await response.json();

            if (!data.success || !data.url) throw new Error("API failed");

            const m3u8Url = data.url;

            if (Hls.isSupported()) {
                if (this.hls) this.hls.destroy();
                this.hls = new Hls();
                this.hls.loadSource(m3u8Url);
                this.hls.attachMedia(video);
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            } 
            else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // iPad / Safari Native Support
                video.src = m3u8Url;
                video.play();
            }
        } catch (err) {
            console.error(err);
            alert("m3u8解析に失敗しました。解析サーバーが未準備か、動画が対応していません。");
            return false;
        }
        return true;
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
