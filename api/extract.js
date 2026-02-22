const ytdl = require('@distube/ytdl-core');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Video ID is required' });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        
        const info = await ytdl.getInfo(videoUrl, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
                }
            }
        });

        const hlsFormat = info.formats.find(f => f.isHLS || (f.url && f.url.includes('manifest/hls_variant')));

        if (hlsFormat && hlsFormat.url) {
            return res.status(200).json({
                success: true,
                url: hlsFormat.url,
                title: info.videoDetails.title,
                type: 'm3u8'
            });
        } 

        const fallbackFormat = ytdl.chooseFormat(info.formats, { 
            quality: 'highestvideo', 
            filter: 'videoandaudio' 
        });

        if (fallbackFormat && fallbackFormat.url) {
            return res.status(200).json({
                success: true,
                url: fallbackFormat.url,
                title: info.videoDetails.title,
                type: 'mp4_fallback'
            });
        }

        throw new Error('No playable formats found');

    } catch (error) {
        console.error('Extraction Error:', error.message);
        return res.status(500).json({ 
            success: false, 
            error: 'Failed to extract video link',
            details: error.message 
        });
    }
};
