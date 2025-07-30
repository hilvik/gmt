import { GoogleGenerativeAI } from "@google/generative-ai"
import { GoogleAICacheManager } from "@google/generative-ai/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// using flash model for faster responses
export const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

// cache manager for context caching
export const cacheManager = new GoogleAICacheManager(process.env.GEMINI_API_KEY)