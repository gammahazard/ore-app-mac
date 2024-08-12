function buildMinerArgs(options) {
    const args = [];
    if (options.rpcUrl) args.push('--rpc', options.rpcUrl);
    if (options.keypairPath) args.push('--keypair', options.keypairPath);
    if (options.feePayerPath) args.push('--fee-payer', options.feePayerPath);
    if (options.feeType === 'dynamic') {
        args.push('--dynamic-fee');
        if (options.maxFeeCap) args.push('--priority-fee', options.maxFeeCap);
    } else if (options.feeType === 'dynamic-custom') {
        args.push('--dynamic-fee', '--dynamic-fee-url', options.dynamicFeeUrl);
        if (options.maxFeeCap) args.push('--priority-fee', options.maxFeeCap);
    } else if (options.feeType === 'static' && options.priorityFee) {
        args.push('--priority-fee', options.priorityFee);
    }
    if (options.cores && parseInt(options.cores) > 0) {
        args.push('--cores', options.cores);
    }
    return args;
}

module.exports = buildMinerArgs;