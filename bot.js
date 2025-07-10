import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import express from 'express';

// === Your credentials ===
const TELEGRAM_TOKEN = '7741072999:AAH2kj4m_N6pXjuH3lNUO5SeggE1mf03HRk';
const ETHERSCAN_API = 'HCBYJC9Z4MV3J8GUKAGY45S4UFR5A3GJHT';
const BSCSCAN_API = 'UP67QXP1XY6PFZJN4HFDIK9MKB9WWNM14J';
const USDT_ERC20 = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const USDT_BEP20 = '0x55d398326f99059fF775485246999027B3197955';

// === Initialize bot & server ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('Bot is running'));
app.listen(PORT, () => console.log(`Bot server running on port ${PORT}`));

// === Utility function to validate wallet address ===
const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

// === Message handler ===
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userInput = msg.text;

  if (!userInput || !userInput.startsWith('0x')) {
    return bot.sendMessage(chatId, '⚠️ This is a wrong address. Please paste a correct wallet address (starts with 0x).');
  }

  if (!isValidAddress(userInput)) {
    return bot.sendMessage(chatId, '⚠️ This is a wrong address. Make sure it is a valid Ethereum/BSC wallet (starts with 0x and 42 characters long).');
  }

  bot.sendMessage(chatId, '⏳ We are working on it... Please wait for the result.');

  try {
    const [
      eth, erc20, bnb, bep20,
      usdtErcTx, usdtBepTx
    ] = await Promise.all([
      axios.get(`https://api.etherscan.io/api?module=account&action=balance&address=${userInput}&tag=latest&apikey=${ETHERSCAN_API}`),
      axios.get(`https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${USDT_ERC20}&address=${userInput}&tag=latest&apikey=${ETHERSCAN_API}`),
      axios.get(`https://api.bscscan.com/api?module=account&action=balance&address=${userInput}&apikey=${BSCSCAN_API}`),
      axios.get(`https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${USDT_BEP20}&address=${userInput}&tag=latest&apikey=${BSCSCAN_API}`),
      axios.get(`https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${USDT_ERC20}&address=${userInput}&sort=desc&apikey=${ETHERSCAN_API}`),
      axios.get(`https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${USDT_BEP20}&address=${userInput}&sort=desc&apikey=${BSCSCAN_API}`)
    ]);

    const ethBal = (parseFloat(eth.data.result) / 1e18).toFixed(4);
    const erc20Bal = (parseFloat(erc20.data.result) / 1e6).toFixed(2);
    const bnbBal = (parseFloat(bnb.data.result) / 1e18).toFixed(4);
    const bep20Bal = (parseFloat(bep20.data.result) / 1e18).toFixed(2);

    const formatTxList = (txArray, walletAddress, network) => {
      if (!txArray || txArray.length === 0) return `⚠️ No recent USDT transactions found on ${network}.`;

      const latest5 = txArray.slice(0, 5);
      let result = `📜 Last 5 USDT (${network}) Transactions:\n`;

      latest5.forEach((tx, idx) => {
        const isReceived = tx.to.toLowerCase() === walletAddress.toLowerCase();
        const status = isReceived ? '🟢 Received' : '🔴 Sent';
        const amount = (parseFloat(tx.value) / 1e6).toFixed(2);
        const date = new Date(tx.timeStamp * 1000).toLocaleString();
        result += `\n${idx + 1}. ${status}\n💵 Amount: ${amount} USDT\n🔗 Tx: ${tx.hash.slice(0, 10)}...\n📅 ${date}\n`;
      });

      return result;
    };

    const usdtErcHistory = formatTxList(usdtErcTx.data.result, userInput, 'ERC20');
    const usdtBepHistory = formatTxList(usdtBepTx.data.result, userInput, 'BEP20');

    const reply = `🔔 Wallet Update

💼 Address: ${userInput}

🟣 ETH: ${ethBal}
💵 USDT (ERC20): ${erc20Bal}
🟡 BNB: ${bnbBal}
💵 USDT (BEP20): ${bep20Bal}

${usdtErcHistory}
${usdtBepHistory}

🤖 Bot by Ronaldo – Fortune favors the wise 💎`;

    bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '⚠️ Error fetching data. Please try again later.');
  }
});
