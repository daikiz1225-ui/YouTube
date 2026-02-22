const ytdl = require('@distube/ytdl-core');

module.exports = async (req, res) => {
    // CORS設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Video ID is required' });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        
        // iPadからのアクセスを装う
        const info = await ytdl.getInfo(videoUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
                }
            }
        });

        // HLS形式を探す
        const hlsFormat = info.formats.find(f => f.isHLS || (f.url && f.url.includes('manifest/hls_variant')));

        if (hlsFormat && hlsFormat.url) {
            return res.status(200).json({
                success: true,
                url: hlsFormat.url,
                type: 'm3u8'
            });
        } 

        // 見つからない場合は最高画質の通常動画
        const fallback = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'videoandaudio' });
        
        if (fallback && fallback.url) {
            return res.status(200).json({
                success: true,
                url: fallback.url,
                type: 'mp4'
            });
        }

        throw new Error('No playable formats');

    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
