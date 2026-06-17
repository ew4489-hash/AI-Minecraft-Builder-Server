const mineflayer = require('mineflayer');
const axios = require('axios');
const { GEMMA_API_KEY } = require('./gemma_key');

// Configuration
const config = {
    host: 'localhost',
    port: 25565, // Default Minecraft port
    username: 'GemmaBuilderBot'
};

const bot = mineflayer.createBot(config);

async function callGemma(prompt) {
    console.log(`Thinking: ${prompt}...`);
    try {
        // This is a representative API call to a Gemma 4 31b endpoint. 
        // Replace the URL with the actual endpoint you are using (e.g., Google AI Studio, Vertex AI, etc.)
        const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b:generateContent?key=' + GEMMA_API_KEY, {
            contents: [{
                parts: [{
                    text: `You are a Minecraft Building Assistant. The user wants to build: "${prompt}". 
                    Respond ONLY with a JSON array of build commands. 
                    Each command should be an object: { "action": "setblock", "x": number, "y": number, "z": number, "block": "minecraft:block_name" }.
                    Example: [{"action": "setblock", "x": 10, "y": 64, "z": 10, "block": "minecraft:stone"}]
                    Provide a detailed "thought" process first in a separate field "thought".
                    JSON format: { "thought": "I will build a small stone pillar...", "commands": [...] }`
                }]
            }]
        });

        const result = response.data.candidates[0].content.parts[0].text;
        // Extract JSON from the markdown block if present
        const jsonMatch = result.match(/\{.*\}/s);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
        console.error('Error calling Gemma:', error.message);
        return null;
    }
}

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    // Check if the block just asked the question
    if (message === 'AI Builder: I am listening! What should I build?') {
        bot.listeningTo = username;
        return;
    }

    // If the bot is listening to this specific user, treat their message as a build request
    if (bot.listeningTo === username) {
        const prompt = message;
        bot.listeningTo = null; // Reset listening mode

        bot.chat(`/msg ${username} I'm thinking about how to build: ${prompt}...`);
        
        const result = await callGemma(prompt);
        if (result) {
            bot.chat(`/msg ${username} Thought: ${result.thought}`);
            
            for (const cmd of result.commands) {
                bot.chat(`/msg ${username} Placing ${cmd.block} at ${cmd.x}, ${cmd.y}, ${cmd.z}...`);
                bot.chat(`/setblock ${cmd.x} ${cmd.y} ${cmd.z} ${cmd.block}`);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            bot.chat(`/msg ${username} Build complete!`);
        } else {
            bot.chat(`/msg ${username} Sorry, I encountered an error while processing your request.`);
        }
    }
});

bot.on('spawn', () => {
    console.log('GemmaBuilderBot has spawned into the world!');
});

console.log('Server started. Please ensure Minecraft is running and the bot can connect.');
