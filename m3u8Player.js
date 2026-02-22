const M3U8Player = {
    hls: null,

    async initPlayer(videoElementId, videoId) {
        const video = document.getElementById(videoElementId);
        if (!video) return;

        // 読み込み中表示
        console.log("解析中...");
        
        try {
            const response = await fetch(`/api/extract?id=${videoId}`);
            const data = await response.json();

            if (!data.success) {
                console.error("Server Error:", data.error);
                throw new Error(data.error);
            }

            if (Hls.isSupported()) {
                if (this.hls) this.hls.destroy();
                this.hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true
                });
                this.hls.loadSource(data.url);
                this.hls.attachMedia(video);
                this.hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // iPad / Safari用
                video.src = data.url;
                video.addEventListener('loadedmetadata', () => video.play());
            }
        } catch (err) {
            console.error("Player Error:", err);
            alert("再生エラー: " + err.message);
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
