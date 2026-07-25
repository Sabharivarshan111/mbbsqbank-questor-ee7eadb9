import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.2.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const requestSchema = z.object({
  prompt: z.string()
    .trim()
    .min(1, 'Prompt cannot be empty')
    .max(4000, 'Prompt must be less than 4000 characters'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(15000)
  })).max(20).optional(),
  isTripleTap: z.boolean().optional(),
  isMCQRequest: z.boolean().optional(),
  isDoubleTap: z.boolean().optional(),
  isImportantQuestionsRequest: z.boolean().optional(),
  isNeedingClarification: z.boolean().optional()
});

// Estimate token count (roughly 1 token per 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Enhanced rate limiting mechanism with backoff
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 5; // Max requests per minute

// Function to check if the request is rate limited with exponential backoff
function isRateLimited(clientId: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId) || { 
    requests: [],
    consecutiveHits: 0,
    backoffUntil: 0
  };
  
  // Check if in backoff period
  if (clientData.backoffUntil > now) {
    return { limited: true, retryAfter: Math.ceil((clientData.backoffUntil - now) / 1000) };
  }
  
  // Remove timestamps older than the window
  const recentRequests = clientData.requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  // Check if too many requests in the window
  const isLimited = recentRequests.length >= MAX_REQUESTS_PER_WINDOW;
  
  if (isLimited) {
    // Increase consecutive hits and calculate backoff
    clientData.consecutiveHits++;
    const backoffSeconds = Math.min(30, Math.pow(2, clientData.consecutiveHits - 1)); // Exponential backoff, max 30 seconds
    clientData.backoffUntil = now + (backoffSeconds * 1000);
    
    // Update the map with current state
    clientData.requests = recentRequests;
    rateLimitMap.set(clientId, clientData);
    
    return { limited: true, retryAfter: backoffSeconds };
  } else {
    // Reset consecutive hits on successful non-limited request
    if (recentRequests.length === 0) {
      clientData.consecutiveHits = 0;
    }
    
    // Add the new timestamp
    recentRequests.push(now);
    
    // Update the map
    clientData.requests = recentRequests;
    rateLimitMap.set(clientId, clientData);
    
    return { limited: false };
  }
}

// Function to validate a URL and check if it's from a trusted medical source
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

function isTrustedMedicalDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const trustedDomains = [
      'pubmed.ncbi.nlm.nih.gov',
      'ncbi.nlm.nih.gov',
      'nlm.nih.gov',
      'mayoclinic.org',
      'clevelandclinic.org',
      'medlineplus.gov',
      'cdc.gov',
      'who.int',
      'nih.gov',
      'nejm.org',
      'jamanetwork.com',
      'thelancet.com',
      'bmj.com',
      'acponline.org',
      'heart.org',
      'cancer.gov',
      'cancer.org',
      'diabetes.org',
      'uptodate.com',
      'medscape.com',
      'webmd.com',
      'healthline.com',
      'medicalnewstoday.com'
    ];
    
    return trustedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain));
  } catch (e) {
    return false;
  }
}

// Enhanced function to extract references from the text with better parsing and validation
function extractReferences(text: string): Array<{title: string; authors: string; journal?: string; year: string; url?: string; source?: string}> {
  const references = [];
  
  // Check if the response contains a references section
  const referencesMatch = text.match(/References:?\s*\n([\s\S]+)$/i) || 
                         text.match(/Sources:?\s*\n([\s\S]+)$/i) ||
                         text.match(/Citations:?\s*\n([\s\S]+)$/i);
  
  if (referencesMatch) {
    const referencesText = referencesMatch[1];
    
    // Split by numbered references or bullet points
    const referenceItems = referencesText.split(/\n\s*(?:\d+\.|\-|\*)\s+/);
    
    for (let item of referenceItems) {
      item = item.trim();
      if (!item) continue;
      
      // Try to extract structured information from each reference
      const reference: {
        title: string;
        authors: string;
        journal?: string;
        year: string;
        url?: string;
        source?: string;
      } = {
        title: "Untitled Reference",
        authors: "Unknown",
        year: "n.d."
      };
      
      // Extract URL if present
      const urlMatch = item.match(/(https?:\/\/[^\s\)]+)/);
      if (urlMatch) {
        const potentialUrl = urlMatch[1].replace(/[,\.;"\)]+$/, ''); // Clean up potential trailing punctuation
        if (isValidUrl(potentialUrl)) {
          reference.url = potentialUrl;
          
          // Try to determine the source domain
          try {
            const urlObj = new URL(potentialUrl);
            if (urlObj.hostname.includes('pubmed') || urlObj.hostname.includes('ncbi.nlm.nih.gov')) {
              reference.source = 'PubMed';
            } else if (urlObj.hostname.includes('mayoclinic')) {
              reference.source = 'Mayo Clinic';
            } else if (urlObj.hostname.includes('clevelandclinic')) {
              reference.source = 'Cleveland Clinic';
            } else if (urlObj.hostname.includes('medscape')) {
              reference.source = 'Medscape';
            } else if (urlObj.hostname.includes('who.int')) {
              reference.source = 'WHO';
            } else if (urlObj.hostname.includes('cdc.gov')) {
              reference.source = 'CDC';
            } else if (urlObj.hostname.includes('nih.gov')) {
              reference.source = 'NIH';
            } else {
              reference.source = urlObj.hostname.replace('www.', '');
            }
          } catch (e) {
            // URL parsing failed
          }
          
          // Remove the URL from the item to make other parsing easier
          item = item.replace(urlMatch[1], '').trim();
        }
      }
      
      // Extract title - usually the first part up to a period or comma
      const titleMatch = item.match(/^"([^"]+)"/) ||  // Quoted title
                        item.match(/^([^\.,:]+)[\.,:]/); // Up to first punctuation
      if (titleMatch) {
        reference.title = titleMatch[1].trim();
        // Remove the title from the item to make other parsing easier
        item = item.replace(titleMatch[0], '').trim();
      } else {
        // If no clear title pattern, try to extract a reasonable title
        const potentialTitle = item.split(/[\.,:]/).shift() || '';
        if (potentialTitle.length > 3) {
          reference.title = potentialTitle.trim();
          item = item.replace(potentialTitle, '').replace(/^[\.,:]/, '').trim();
        }
      }
      
      // Extract year
      const yearMatch = item.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        reference.year = yearMatch[0];
      }
      
      // Extract journal if present
      const journalMatch = item.match(/([A-Z][A-Za-z\s]+Journal|[A-Z][A-Za-z\s]+Annals|[A-Z][A-Za-z\s]+Review|[A-Z][A-Za-z\s&;]+)/);
      if (journalMatch) {
        reference.journal = journalMatch[1].trim();
      }
      
      // Extract authors - anything remaining before the year or journal
      let authorsText = item;
      if (reference.journal) {
        authorsText = item.split(reference.journal)[0].trim();
      } else if (yearMatch) {
        authorsText = item.split(yearMatch[0])[0].trim();
      }
      
      if (authorsText) {
        // Clean up authors text (remove trailing punctuation)
        authorsText = authorsText.replace(/[,\.;]$/, '').trim();
        reference.authors = authorsText || "Unknown";
      }
      
      // Only add references with URLs if they have a valid title
      if (reference.title !== "Untitled Reference") {
        references.push(reference);
      }
    }
  }
  
  // Filter out references without valid URLs
  return references.filter(ref => !ref.url || isValidUrl(ref.url));
}

// Add logging with timestamp
function logWithTimestamp(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(data);
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  logWithTimestamp(`[${requestId}] Request received`);
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  // Get client IP or some identifier for rate limiting
  const clientId = req.headers.get('x-forwarded-for') || 'anonymous';
  
  // Check rate limiting with enhanced logic
  const rateLimitResult = isRateLimited(clientId);
  if (rateLimitResult.limited) {
    logWithTimestamp(`[${requestId}] Rate limited client: ${clientId}, retry after: ${rateLimitResult.retryAfter}s`);
    return new Response(
      JSON.stringify({ 
        error: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        isRateLimit: true,
        retryAfter: rateLimitResult.retryAfter
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }

  try {
    let reqData;
    try {
      reqData = await req.json();
    } catch (parseError) {
      logWithTimestamp(`[${requestId}] Error parsing request:`, parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Validate input with zod schema
    const validation = requestSchema.safeParse(reqData);
    if (!validation.success) {
      logWithTimestamp(`[${requestId}] Validation error:`, validation.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input: ' + validation.error.issues.map(i => i.message).join(', ')
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    const { 
      prompt, 
      conversationHistory: rawConversationHistory = [], 
      isTripleTap = false,
      isMCQRequest: explicitMCQRequest = false,
      isImportantQuestionsRequest: explicitImportantQRequest = false,
      isNeedingClarification = false
    } = validation.data;
    
    // Sanitize conversation history
    const conversationHistory = rawConversationHistory
      .slice(-10) // Last 10 messages only
      .filter(msg => 
        msg && 
        typeof msg === 'object' && 
        ['user', 'assistant', 'system'].includes(msg.role) &&
        typeof msg.content === 'string' &&
        msg.content.length > 0 &&
        msg.content.length <= 15000
      );
    
    // Check estimated token usage (prompt + conversation history)
    const totalContentLength = prompt.length + 
      conversationHistory.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimatedTokenCount = estimateTokens(totalContentLength.toString()) + Math.ceil(totalContentLength / 4);
    
    if (estimatedTokenCount > 16000) {
      logWithTimestamp(`[${requestId}] Request too large:`, estimatedTokenCount, 'estimated tokens');
      return new Response(
        JSON.stringify({ error: 'Request too large. Please shorten your prompt or conversation.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Check if the prompt is medical-related
    const isMedicalQuery = prompt.toLowerCase().includes('medical') || 
                        prompt.toLowerCase().includes('medicine') ||
                        prompt.toLowerCase().includes('doctor') ||
                        prompt.toLowerCase().includes('disease') ||
                        prompt.toLowerCase().includes('pathology') ||
                        prompt.toLowerCase().includes('pharmacology') ||
                        prompt.toLowerCase().includes('symptom') ||
                        prompt.toLowerCase().includes('treatment') ||
                        prompt.toLowerCase().includes('diagnosis') ||
                        prompt.toLowerCase().includes('patient') ||
                        prompt.toLowerCase().includes('hospital') ||
                        prompt.toLowerCase().includes('clinic');
    
    logWithTimestamp(`[${requestId}] Processing prompt: ${prompt.substring(0, 50)}...`);
    logWithTimestamp(`[${requestId}] Is medical query: ${isMedicalQuery}`);
    logWithTimestamp(`[${requestId}] Conversation history length: ${conversationHistory.length}`);
    logWithTimestamp(`[${requestId}] Request types: isTripleTap=${isTripleTap}, isMCQRequest=${explicitMCQRequest}, isImportantQuestionsRequest=${explicitImportantQRequest}, isNeedingClarification=${isNeedingClarification}`);
    
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey && !LOVABLE_API_KEY) {
      logWithTimestamp(`[${requestId}] No AI API keys set in environment variables`);
      return new Response(
        JSON.stringify({ error: "API key configuration error" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Create a client instance for direct Gemini (only if key available)
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    // Direct Gemini API — use the same 3.1 flash-lite model as handwritten notes
    const model = genAI ? genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" }) : null;
    // Legacy Lovable Gateway fallback model (only used if direct Gemini has no key)
    const LOVABLE_MODEL = "google/gemini-2.5-flash-lite";

    // Extract the actual question content without any prefix
    const actualQuestion = isTripleTap ? prompt.replace(/Triple-tapped:|triple-tapped:/i, "").trim() : prompt;
    
    // Determine if we have a specialized request type
    const isMCQsRequest = explicitMCQRequest;
    const isImportantQsRequest = explicitImportantQRequest;
    
    // For context-based questions, we need the conversation history
    const needsConversationContext = conversationHistory.length > 0 && 
                                    (isNeedingClarification || 
                                     actualQuestion.toLowerCase().includes("i don't understand") || 
                                     actualQuestion.toLowerCase().includes("can't understand") ||
                                     actualQuestion.toLowerCase().includes("explain") ||
                                     actualQuestion.toLowerCase().includes("similar") ||
                                     actualQuestion.toLowerCase().includes("generate") ||
                                     actualQuestion.toLowerCase().includes("more detail"));
    
    // Create a targeted system prompt based on the request type
    let systemPrompt = "";
    let generationConfig = {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2000, // Increase for more detailed responses
    };
    
    // If requesting MCQs
    if (isMCQsRequest) {
      systemPrompt = `You are ACEV, a highly specialized medical AI assistant. The user has requested you to generate 10 high-quality multiple choice questions (MCQs) in the style of NEET PG or USMLE exams.

Please generate EXACTLY 10 MCQs based on ${needsConversationContext ? "the previous conversation context" : "the user's request"}. 

Each MCQ should:
1. Be clinically relevant
2. Test application of knowledge rather than mere recall
3. Have 4 options (A, B, C, D) with one correct answer
4. Include a brief explanation immediately after each question's answer

CRITICAL FORMATTING RULES - YOU MUST FOLLOW EXACTLY:

**Question 1:** [Question text]

**A)** [Option A]

**B)** [Option B]

**C)** [Option C]

**D)** [Option D]

**✓ Correct Answer: [Letter]** - [Brief explanation of why this is correct]

---

**Question 2:** [Question text]
...and so on.

MANDATORY FORMATTING:
- Each option (A, B, C, D) MUST be on its OWN SEPARATE LINE with a blank line between them
- Use bold (**) for Question numbers, option letters, and the Answer line
- Add a checkmark (✓) before "Correct Answer"
- Add a horizontal rule (---) between each question
- NEVER put multiple options on the same line
- Generate EXACTLY 5 case-based scenarios and 5 direct knowledge questions
- Place the answer and explanation immediately after each question
- Follow NEET PG/USMLE style format and complexity`;

      // Adjust generation parameters for MCQs
      generationConfig.temperature = 0.8; // More creative
      generationConfig.maxOutputTokens = 4000; // Longer for 10 MCQs
    }
    // For regular chat questions about medical topics
    else if (isMedicalQuery) {
      systemPrompt = `You are ACEV, a helpful and knowledgeable medical assistant. Provide concise, accurate medical information. For medical emergencies, always advise seeking immediate professional help. Your responses should be compassionate, clear, and based on established medical knowledge. Never mention that you're powered by Gemini.

FORMATTING — KEY-TERM TAGS (REQUIRED):
Wrap every important medical term in your answer using EXACTLY one of these inline tags so the app can color-highlight it. Use them naturally inside sentences — do NOT list them separately, do NOT escape them, do NOT put them in code blocks.

- [[dis:term]]   → diseases / conditions / syndromes (e.g. [[dis:myocardial infarction]])
- [[drug:term]]  → drugs / treatments / vaccines (e.g. [[drug:aspirin]])
- [[anat:term]]  → anatomy / organs / structures / cells (e.g. [[anat:left ventricle]])
- [[inv:term]]   → investigations / signs / scores / tests (e.g. [[inv:ECG]], [[inv:Murphy's sign]])
- [[val:term]]   → key values / doses / cutoffs (e.g. [[val:300 mg]], [[val:>140/90 mmHg]])

Rules for tags:
- Tag 5–15 of the MOST important terms per answer; do not over-tag every word.
- Keep the term inside [[...]] short (1–5 words), exactly as it should be displayed to the reader.
- Never nest tags. Never tag inside headings of MCQ JSON output.
- Format the rest of the answer with clear short paragraphs, bullet lists, and spacing — never one congested wall of text.

IMPORTANT: You MUST include reputable medical references and sources at the end of your response. 

Your references MUST:
1. Be from reputable medical sources like PubMed, NCBI, Mayo Clinic, Cleveland Clinic, WHO, CDC, NIH, or major medical journals
2. Include full, working URLs that start with http:// or https://
3. Be directly relevant to the specific medical topic being discussed
4. Be formatted in a section called "References:" at the end of your response
5. Include at least 3-5 references for each response

Format each reference as follows:
1. Author(s) (Year). Title. Journal/Source. URL

For example:
References:
1. Smith J, et al. (2021). Recent advances in treating hypertension. Journal of Cardiology. https://pubmed.ncbi.nlm.nih.gov/example12345
2. Mayo Clinic Staff. (2023). Hypertension. Mayo Clinic. https://www.mayoclinic.org/diseases-conditions/high-blood-pressure/symptoms-causes/syc-20373410
3. Centers for Disease Control and Prevention. (2023). Facts about Hypertension. CDC. https://www.cdc.gov/bloodpressure/facts.htm

Again, make sure all URLs are complete, correct, and from reputable medical sources.`;
      
      // Adjust for medical responses
      generationConfig.temperature = 0.6; // Less creative, more factual
      generationConfig.maxOutputTokens = 3000; // Longer to include references
    }
    // For regular chat questions (non-medical)
    else {
      systemPrompt = "You are ACEV, a helpful and knowledgeable assistant. Provide concise, accurate information. Your responses should be compassionate, clear, and based on established knowledge. Never mention that you're powered by Gemini. If you use information from textbooks or research papers, please include a list of sources or references at the end of your response in a section titled 'References:'.";
    }
    
    logWithTimestamp(`[${requestId}] Request type: ${isMCQsRequest ? "MCQs" : isImportantQsRequest ? "Important Questions" : isTripleTap ? "Triple-tap" : isMedicalQuery ? "Medical Query" : needsConversationContext ? "Contextual" : "Regular"}`);
    
    try {
      // Increased timeout for Gemini requests
      const timeoutMs = 30000; // 30 seconds timeout
      
      // Build conversation messages with history if needed
      const messages = [];
      
      // Add system prompt
      messages.push({ role: "user", parts: [{ text: systemPrompt }] });
      messages.push({ role: "model", parts: [{ text: "I understand. I'll act as ACEV, a medical assistant providing helpful, accurate information while prioritizing patient safety." }] });
      
      // Add conversation history if needed for context
      if (needsConversationContext && conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-10);
        
        logWithTimestamp(`[${requestId}] Including ${recentHistory.length} messages from conversation history`);
        
        for (const message of recentHistory) {
          messages.push({ 
            role: message.role === 'user' ? 'user' : 'model', 
            parts: [{ text: message.content }] 
          });
        }
      }
      
      // Add current user question
      messages.push({ role: "user", parts: [{ text: actualQuestion }] });
      
      let text = "";
      let usedFallback = false;

      // PRIMARY: Direct Gemini API (uses your GEMINI_API_KEY)
      if (model) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const modelPromise = model.generateContent({
              contents: messages,
              generationConfig
            });

            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);
            });

            const result = await Promise.race([modelPromise, timeoutPromise]) as any;
            text = result.response.text();
            if (text) {
              logWithTimestamp(`[${requestId}] Response generated via direct Gemini API`);
              break;
            }
          } catch (geminiErr) {
            const errMsg = geminiErr.message || "";
            logWithTimestamp(`[${requestId}] Direct Gemini attempt ${attempt + 1} failed: ${errMsg}`);

            if ((errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("Service Unavailable")) && attempt === 0) {
              await new Promise(r => setTimeout(r, 2000));
              continue;
            }
            if (attempt === 1) break;
          }
        }
      }

      // FALLBACK: Lovable AI Gateway (only if direct Gemini failed AND key present)
      if (!text && LOVABLE_API_KEY) {
        usedFallback = true;
        logWithTimestamp(`[${requestId}] Falling back to Lovable AI Gateway`);
        try {
          const openaiMessages: { role: string; content: string }[] = [
            { role: "system", content: systemPrompt }
          ];

          if (needsConversationContext && conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-10);
            for (const msg of recentHistory) {
              openaiMessages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
            }
          }

          openaiMessages.push({ role: "user", content: actualQuestion });

          const gatewayResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: LOVABLE_MODEL,
              messages: openaiMessages,
              temperature: generationConfig.temperature || 0.7,
              max_tokens: generationConfig.maxOutputTokens || 2000,
            }),
          });

          if (gatewayResponse.ok) {
            const gatewayData = await gatewayResponse.json();
            text = gatewayData.choices?.[0]?.message?.content || "";
          } else {
            logWithTimestamp(`[${requestId}] Lovable Gateway fallback failed: ${gatewayResponse.status}`);
          }
        } catch (gatewayErr) {
          logWithTimestamp(`[${requestId}] Lovable Gateway exception: ${gatewayErr.message}`);
        }
      }

      if (!text) {
        throw new Error("All AI providers are currently unavailable. Please try again in a moment.");
      }

      // Extract and validate references
      const references = extractReferences(text);
      
      // Only for medical queries, validate the references if present
      let validatedReferences = references;
      if (isMedicalQuery && references.length > 0) {
        validatedReferences = references
          .filter(ref => !ref.url || isValidUrl(ref.url))
          .map(ref => {
            if (ref.url && isTrustedMedicalDomain(ref.url)) {
              ref.source = ref.source || "Trusted Medical Source";
            }
            return ref;
          });
        
        logWithTimestamp(`[${requestId}] Found ${references.length} references, ${validatedReferences.length} validated`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      logWithTimestamp(`[${requestId}] AI response generated successfully in ${duration}ms${usedFallback ? ' (via fallback)' : ''}`);

      return new Response(
        JSON.stringify({ 
          response: text,
          references: validatedReferences.length > 0 ? validatedReferences : undefined,
          isMedicalQuery: isMedicalQuery
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (modelError) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      logWithTimestamp(`[${requestId}] AI Model Error after ${duration}ms:`, modelError);
      
      if (modelError.message) {
        logWithTimestamp(`[${requestId}] Error message: ${modelError.message}`);
        
        if (modelError.message.includes("not found") || modelError.message.includes("404")) {
          logWithTimestamp(`[${requestId}] Model not found error`);
          return new Response(
            JSON.stringify({ 
              error: "The AI model is currently unavailable. Our team has been notified.",
              details: "Model configuration error"
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
      }
      
      if (modelError.message && modelError.message.includes("timed out")) {
        logWithTimestamp(`[${requestId}] Request to AI timed out`);
        return new Response(
          JSON.stringify({ 
            error: "The AI service is taking longer than expected. Try asking a more focused question or try again later.",
            details: "AI processing timeout"
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "The AI service is temporarily unavailable. Please try again in a moment.", 
          details: modelError.message 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    logWithTimestamp(`[${requestId}] Unhandled error after ${duration}ms:`, error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred while processing your request",
        requestId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
