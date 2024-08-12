const path = require('path');
const fs = require('fs');

function getAvgDifficulty(app, event, profileName) {
    const difficultyPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
    try {
        const content = fs.readFileSync(difficultyPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const difficulties = lines.map(line => {
            const match = line.match(/difficulty (\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        }).filter(diff => diff > 0);

        if (difficulties.length === 0) return 'N/A';

        const avg = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
        return avg.toFixed(2);
    } catch (error) {
        console.error('Error calculating average difficulty:', error);
        return 'N/A';
    }
}

function getDifficultyDetails(app, event, profileName) {
    const difficultyPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
    try {
        const content = fs.readFileSync(difficultyPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const sortedLines = lines.sort((a, b) => {
            const diffA = parseInt(a.match(/difficulty (\d+)/)[1], 10);
            const diffB = parseInt(b.match(/difficulty (\d+)/)[1], 10);
            return diffB - diffA;
        });
        return sortedLines.join('\n');
    } catch (error) {
        console.error('Error reading difficulty details:', error);
        return 'No difficulty data available.';
    }
}

function getBestHash(app, event, profileName) {
    const difficultyPath = path.join(app.getPath('userData'), `difficulty_${profileName}.log`);
    try {
        const content = fs.readFileSync(difficultyPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const sortedLines = lines.sort((a, b) => {
            const diffA = parseInt(a.match(/difficulty (\d+)/)[1], 10);
            const diffB = parseInt(b.match(/difficulty (\d+)/)[1], 10);
            return diffB - diffA;
        });
        if (sortedLines.length > 0) {
            const bestHashLine = sortedLines[0];
            const match = bestHashLine.match(/Best hash: (.+) \(difficulty (\d+)\)/);
            if (match) {
                return { hash: match[1], difficulty: parseInt(match[2], 10) };
            }
        }
        return null;
    } catch (error) {
        console.error('Error reading best hash:', error);
        return null;
    }
}

module.exports = {
    getAvgDifficulty,
    getDifficultyDetails,
    getBestHash
};