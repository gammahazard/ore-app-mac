const path = require('path');
const fs = require('fs');

function saveProfile(app, event, profile) {
    if (!profile.name || profile.name.trim() === '') {
        event.reply('profile-save-error', 'Profile name cannot be empty');
        return;
    }

    const profilesPath = path.join(app.getPath('userData'), 'profiles.json');
    let profiles = [];
    
    try {
        profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    } catch (error) {
        // File doesn't exist or is invalid, we'll create a new one
        console.log('Creating new profiles file');
    }

    const existingProfileIndex = profiles.findIndex(p => p.name === profile.name);
    if (existingProfileIndex !== -1) {
        profiles[existingProfileIndex] = profile;
    } else {
        profiles.push(profile);
    }

    fs.writeFileSync(profilesPath, JSON.stringify(profiles));
    event.reply('profile-saved', profiles);

    // Create or ensure the difficulty log file exists
    const difficultyLogPath = path.join(app.getPath('userData'), `difficulty_${profile.name}.log`);
    if (!fs.existsSync(difficultyLogPath)) {
        fs.writeFileSync(difficultyLogPath, '');
        console.log(`Created new difficulty log file for profile: ${profile.name}`);
    }

    console.log(`Profile saved: ${profile.name}`);
}

module.exports = saveProfile;