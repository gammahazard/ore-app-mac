function checkMaxTX(cleanedOutput, txSubmissionCap) {
    const submissionMatch = cleanedOutput.match(/Submitting transaction... \(attempt (\d+)\)/);
    if (submissionMatch) {
        const attemptNumber = parseInt(submissionMatch[1], 10);
        const cap = parseInt(txSubmissionCap, 10) || 150;
        
        if (attemptNumber >= cap) {
            return true;
        }
    }
    return false;
}

module.exports = checkMaxTX;