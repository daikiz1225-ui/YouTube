/**
 * m3u8Player.js (Client-side Decipher Edition)
 * サーバーを通さずiPad側で解析を試みる
 */
const M3U8Player = {
    hls: null,

    async initPlayer(videoElementId, videoId) {
        const video = document.getElementById(videoElementId);
        console.log("ダウンローダー手法で解析中...");

        try {
            // サーバーを介さず、複数の「中継解析API」をランダムに試す
            // これがダウンローダーが使っているのと同等の手法
            const apis = [
                `https://pipedapi.kavin.rocks/streams/${videoId}`,
                `https://api.cobalt.tools/api/json` // ダウンロードサイトがよく使うAPI
            ];

            let streamUrl = null;

            // Piped API をまずは試す
            const res = await fetch(apis[0]);
            const data = await res.json();
            
            if (data.hls) {
                streamUrl = data.hls;
            } else if (data.videoStreams) {
                // 最も高画質なストリームを選択
                const best = data.videoStreams.find(s => s.format === 'M4A' || s.format === 'WEBM') || data.videoStreams[0];
                streamUrl = best.url;
            }

            if (!streamUrl) throw new Error("解析に失敗しました");

            this.startPlay(video, streamUrl);

        } catch (err) {
            console.error("Downloader Method Failed:", err);
            alert("YouTubeのBotガードが強固です。Educationモードへの自動切り替えを推奨します。");
        }
    },

    startPlay(video, url) {
        if (Hls.isSupported()) {
            if (this.hls) this.hls.destroy();
            this.hls = new Hls();
            this.hls.loadSource(url);
            this.hls.attachMedia(video);
            this.hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        } else {
            video.src = url;
            video.play();
        }
    },

    stopPlayer() {
        if (this.hls) this.hls.destroy();
    }
};
