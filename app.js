async function loadProfile(username) {
    const cleanUser = username.replace('@', '').trim();
    if (!cleanUser) return;

    searchBtn.disabled = true;
    profileStatusMsg.textContent = `Fetching profile for @${cleanUser}...`;

    try {
        // بيتصل بـ API الـ Vercel المحلي تلقائياً
        const response = await fetch(`/api/user?username=${encodeURIComponent(cleanUser)}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;

            // تحديث الواجهة بالبيانات الحقيقية
            targetName.textContent = data.name;
            targetUsername.textContent = `@${data.username}`;
            targetFollowers.textContent = data.followers;
            
            detailsName.textContent = data.name;
            detailsUsername.textContent = `@${data.username}`;
            successTargetUsername.textContent = `@${data.username}`;

            if (data.avatar) {
                targetAvatar.src = data.avatar;
                detailsAvatar.src = data.avatar;
            }

            profileStatusMsg.textContent = `Profile loaded for @${data.username}`;
        } else {
            profileStatusMsg.textContent = `User @${cleanUser} not found.`;
        }
    } catch (err) {
        console.error("API Error:", err);
        profileStatusMsg.textContent = `Could not fetch data for @${cleanUser}`;
    } finally {
        searchBtn.disabled = false;
    }
}