import axios from 'axios';
import 'dotenv/config';

async function listMyModels() {
  console.log("🔍 Asking Google for your exact available models...");
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
    const { data } = await axios.get(url);
    
    console.log("\n✅ YOU CAN USE THESE EXACT MODEL NAMES:");
    console.log("-------------------------------------------------");
    
    data.models.forEach(model => {
      // We only care about models that can read text and generate text
      if (model.supportedGenerationMethods.includes("generateContent")) {
        // Strip out the 'models/' prefix so it's ready to copy-paste
        const cleanName = model.name.replace('models/', '');
        console.log(`👉 "${cleanName}"`);
      }
    });
    
    console.log("-------------------------------------------------\n");
  } catch (error) {
    console.error("❌ Error:", error.response ? error.response.data : error.message);
  }
}

listMyModels();