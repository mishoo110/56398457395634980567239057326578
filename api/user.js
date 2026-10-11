const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

module.exports = async (req, res) => {
    // إعدادات CORS عشان تقدر تتصل بالـ API من أي مكان
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { username } = req.query;
    if (!username) {
        return res.status(400).json({ success: false, error: 'Username parameter is required' });
    }

    const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

    // Strategy A: Scraping TikTok Profile
    try {
        const response = await fetch(`https://www.tiktok.com/@${encodeURIComponent(cleanUsername)}`, {
            headers: {
                'User-Agent': CHROME_UA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            const html = await response.text();
            const startStr = '<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">';
            const startIndex = html.indexOf(startStr);
            if (startIndex !== -1) {
                const contentStart = startIndex + startStr.length;
                const endIndex = html.indexOf('</script>', contentStart);
                if (endIndex !== -1) {
                    const jsonText = html.substring(contentStart, endIndex);
                    const parsed = JSON.parse(jsonText);
                    const userDetail = parsed['__DEFAULT_SCOPE__']?.['webapp.user-detail'];
                    
                    if (userDetail && userDetail.userInfo) {
                        const u = userDetail.userInfo.user;
                        const s = userDetail.userInfo.stats;
                        
                        return res.status(200).json({
                            success: true,
                            data: {
                                name: u.nickname || cleanUsername,
                                username: u.uniqueId || cleanUsername,
                                followers: (s.followerCount || 0).toLocaleString(),
                                following: (s.followingCount || 0).toLocaleString(),
                                likes: (s.heartCount || 0).toLocaleString(),
                                avatar: u.avatarLarger || u.avatarMedium || u.avatarThumb || '',
                                verified: u.verified || false
                            }
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error("Direct Scraping Failed:", err.message);
    }

    // Strategy B: Fallback to tikwm API
    try {
        const tikwmUrl = `https://www.tikwm.com/api/user/info?unique_id=${encodeURIComponent(cleanUsername)}`;
        const response = await fetch(tikwmUrl, {
            headers: {
                'User-Agent': CHROME_UA,
                'Accept': 'application/json',
                'Referer': 'https://www.tikwm.com/'
            }
        });

        if (response.ok) {
            const json = await response.json();
            if (json.code === 0 && json.data && json.data.user) {
                const u = json.data.user;
                const s = json.data.stats;
                return res.status(200).json({
                    success: true,
                    data: {
                        name: u.nickname || cleanUsername,
                        username: u.uniqueId || cleanUsername,
                        followers: (s.followerCount || 0).toLocaleString(),
                        following: (s.followingCount || 0).toLocaleString(),
                        likes: (s.heartCount || 0).toLocaleString(),
                        avatar: u.avatarLarger || u.avatarMedium || u.avatarThumb || '',
                        verified: u.verified || false
                    }
                });
            }
        }
    } catch (err) {
        console.error("tikwm Failed:", err.message);
    }

    return res.status(404).json({ success: false, error: 'User not found' });
};