const ytdl = require('@distube/ytdl-core');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'No ID' });

    try {
        const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': '' // ここを空にすることで一時的なブロックを回避
                }
            }
        });

        // 複数のフォーマットから最適なもの（HLSまたはMP4）を探す
        const format = info.formats.find(f => f.isHLS) || 
                       info.formats.find(f => f.container === 'mp4' && f.hasVideo && f.hasAudio);

        if (!format) throw new Error('再生可能な形式が見つかりません');

        return res.status(200).json({
            success: true,
            url: format.url,
            title: info.videoDetails.title
        });
    } catch (error) {
        console.error('Extraction Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
};
