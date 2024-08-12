const path = require('path');
const fs = require('fs');

function loadProfiles(app) {
    const profilesPath = path.join(app.getPath('userData'), 'profiles.json');
    try {
        return JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    } catch (error) {
        console.error('Error loading profiles:', error);
        return [];
    }
}

module.exports = loadProfiles;
