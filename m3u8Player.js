/**
 * m3u8Player.js
 * Video.js と Piped API を使用した最強プレイヤー
 */
const M3U8Player = {
    player: null,

    async initPlayer(videoElementId, videoId) {
        // すでにプレイヤーがある場合は破棄して作り直し
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }

        const container = document.querySelector('.video-wrapper');
        container.innerHTML = `<video id="${videoElementId}" class="video-js vjs-default-skin vjs-big-play-centered" controls preload="auto" width="100%" height="100%"></video>`;

        console.log("Bot対策を回避しつつ解析中...");

        try {
            // YouTube公式がBot認定してくるので、Piped API(中継サーバー)を利用する
            // これにより、VercelのIPがブロックされていても再生できる可能性が高まる
            const res = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
            const data = await res.json();

            // m3u8リンクを探す
            const hlsUrl = data.hls;
            
            if (!hlsUrl) throw new Error("m3u8リンクの抽出に失敗しました");

            // Video.js の初期化
            this.player = videojs(videoElementId, {
                fluid: true,
                autoplay: true,
                controls: true,
                sources: [{
                    src: hlsUrl,
                    type: 'application/x-mpegURL'
                }]
            });

            this.player.ready(() => {
                console.log("Video.js is ready!");
                this.player.play();
            });

        } catch (err) {
            console.error("Playback Error:", err);
            alert("Bot認定を突破できませんでした。Educationモード(標準)に戻してください。");
        }
    },

    stopPlayer() {
        if (this.player) {
            this.player.dispose();
            this.player = null;
        }
    }
};
