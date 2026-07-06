import fs from 'fs';

const serverCode = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.post\("\/api\/verify-screenshot"[\s\S]*?app\.listen/m;
const match = serverCode.match(regex);

if (match) {
  let routesCode = match[0].replace(/app\.listen$/, '');
  
  // also add the GET binance-prices route
  const getRegex = /app\.get\("\/api\/binance-prices"[\s\S]*?(?=\/\/ Vite middleware)/m;
  const getMatch = serverCode.match(getRegex);
  if (getMatch) {
    routesCode += getMatch[0];
  }

  const finalCode = `import express from "express";
import serverless from "serverless-http";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

${routesCode}

export const handler = serverless(app);
`;

  fs.writeFileSync('netlify/functions/api.ts', finalCode);
} else {
  console.log("no match");
}
