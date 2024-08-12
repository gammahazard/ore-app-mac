const path = require('path');
const fs = require('fs');

function deleteProfile(app, event, profileName) {
    const profilesPath = path.join(app.getPath('userData'), 'profiles.json');
    let profiles = [];
    
    try {
        profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
        profiles = profiles.filter(p => p.name !== profileName);
        fs.writeFileSync(profilesPath, JSON.stringify(profiles));
        
        const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
        if (fs.existsSync(difficultyLogPath)) {
            fs.unlinkSync(difficultyLogPath);
        }
        
        event.reply('profile-deleted', profiles);
    } catch (error) {
        event.reply('profile-delete-error', error.message);
    }
}

module.exports = deleteProfile;
