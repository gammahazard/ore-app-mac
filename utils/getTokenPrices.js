const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

async function getOREPrice() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Calculate the current time and 30 minutes in the past
        const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
        const time30MinutesAgo = currentTime - 1800; // 1800 seconds = 30 minutes

        const url = `https://birdeye-proxy.raydium.io/defi/ohlcv/base_quote?base_address=oreoU2P8bN6jkk3jbaiVxYnG1dCXcYxwhwyK9jSybcp&quote_address=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&type=15m&time_from=${time30MinutesAgo}&time_to=${currentTime}`;

        await page.goto(url, {
            waitUntil: 'networkidle2',
        });

        const bodyHandle = await page.$('body');
        const responseBody = await page.evaluate(body => body.innerText, bodyHandle);
        await bodyHandle.dispose();

        const data = JSON.parse(responseBody);

        if (data.success && data.data.items && data.data.items.length > 0) {
        
            const total = data.data.items.reduce((sum, item) => sum + item.c, 0);
            const averagePrice = total / data.data.items.length;

            console.log(`1 ORE = ${averagePrice.toFixed(3)} USDC`);

            return averagePrice.toFixed(3);
        } else {
            console.log('No OHLCV data available.');
            return null;
        }
    } catch (error) {
        console.error('Error fetching ORE price:', error.message);
        return null;
    } finally {
        await browser.close();
    }
}

module.exports = getOREPrice;
