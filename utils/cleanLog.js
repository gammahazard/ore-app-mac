function cleanLog(log) {
    return log.replace(/\x1b\[.*?m/g, '') // Remove ANSI codes
              .replace(/⠁|⠉|⠙|⠚|⠒|⠂|⠲|⠴|⠤|⠄|⠦|⠖|⠓|⠋|⠠|⠐|⠈/g, '') // Remove spinner characters
              .replace(/\(\s*,\s*\)/g, '') // Remove malformed log parts like "(,)"
              .trim();
}

module.exports = cleanLog;
