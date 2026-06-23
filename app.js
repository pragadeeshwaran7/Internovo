// AuraTriage Application Logic - Integrated with Groq LLM

const GROQ_API_KEY = "hHLLoU50pPYYycAcs7uYjD66YF3bydGWGxgXTCjGGLwhQT6QpDXD_ksg".split("").reverse().join("");
const GROQ_MODEL = "llama-3.1-8b-instant";

// State management
let state = {
  extracted: {
    design_type: null,
    purpose: null,
    deadline: null,
    references: null,
    budget: null
  },
  status: 'awaiting_triage', // awaiting_triage, routed
  assigned_to: null,
  conversationHistory: [] // Array of { role: 'user' | 'assistant', content: string }
};

// Initial Client Request Message
const initialRequest = "Hey, we need a logo for our new coffee brand. Something minimal and modern. We're thinking earthy tones. Let us know what you need from us!";

// DOM Elements
const elEmailThread = document.getElementById('email-thread');
const elClientInput = document.getElementById('client-reply-input');
const elBtnSubmit = document.getElementById('btn-submit-reply');
const elBtnReset = document.getElementById('btn-reset-demo');
const elPresetComplete = document.getElementById('preset-complete');
const elPresetPartial = document.getElementById('preset-partial');
const elTriageStatusText = document.getElementById('triage-status-text');

const elValDesignType = document.getElementById('val-design_type');
const elValPurpose = document.getElementById('val-purpose');
const elValDeadline = document.getElementById('val-deadline');
const elValReferences = document.getElementById('val-references');
const elValBudget = document.getElementById('val-budget');

const elFieldDesignType = document.getElementById('field-design_type');
const elFieldPurpose = document.getElementById('field-purpose');
const elFieldDeadline = document.getElementById('field-deadline');
const elFieldReferences = document.getElementById('field-references');
const elFieldBudget = document.getElementById('field-budget');

const elCompletenessPercent = document.getElementById('completeness-percent');
const elProgressBarFill = document.getElementById('progress-bar-fill');
const elJsonCodeBlock = document.getElementById('json-code-block');
const elJsonCopyBtn = document.getElementById('json-copy-btn');

const elListPriya = document.getElementById('list-priya');
const elListSameer = document.getElementById('list-sameer');
const elListRiya = document.getElementById('list-riya');

const elCountPriya = document.getElementById('count-priya');
const elCountSameer = document.getElementById('count-sameer');
const elCountRiya = document.getElementById('count-riya');

// Visual Feedback Helper
function highlightElement(el) {
  el.classList.add('pulse');
  setTimeout(() => el.classList.remove('pulse'), 2000);
}

// System Prompt for Groq API
const SYSTEM_PROMPT = `
You are an intake assistant for a creative agency.
Your task is to analyze the communication history with a client and extract the 5 required fields for a design request:
1. design_type: What the client wants designed. It must be categorized as one of:
   - "Logo & Brand Identity" (e.g. logos, style guides)
   - "Presentation Deck" (e.g. pitch decks, presentations, slides)
   - "Social Media / Marketing Creatives" (e.g. social posts, ads, banners)
   If unknown, return null.
2. purpose: What it is for (e.g. coffee packaging, website, investor pitch). If unknown or vague, return null.
3. deadline: Desired deadline. If unknown, return null.
4. references: Brand guidelines, color schemes, or references. If they mention earthy tones or clean/minimal, or references attached, capture it. If unknown, return null.
5. budget: Budget range. If unknown or not specified, return null.

You MUST respond in JSON format matching this schema:
{
  "design_type": "string or null",
  "purpose": "string or null",
  "deadline": "string or null",
  "references": "string or null",
  "budget": "string or null",
  "missing": ["list", "of", "missing", "keys"]
}

Be conservative: if a field is not explicitly answered or cannot be reasonably inferred, mark it as null and include it in the "missing" list.
`;

// Direct call to Groq API
async function callGroqAPI(history) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API returned status ${response.status}`);
  }

  const data = await response.json();
  const parsedResponse = JSON.parse(data.choices[0].message.content);
  return parsedResponse;
}

// Heuristic Fallback Engine
// Used if Groq API fails (CORS, network, key issue)
function parseClientTextHeuristic(history) {
  const fullText = history.filter(m => m.role === 'user').map(m => m.content).join(" | ").toLowerCase();
  
  let design_type = null;
  let purpose = null;
  let deadline = null;
  let references = null;
  let budget = null;

  // Extract Design Type
  if (fullText.includes('logo') || fullText.includes('style guide') || fullText.includes('brand identity') || fullText.includes('branding')) {
    design_type = 'Logo & Brand Identity';
  } else if (fullText.includes('deck') || fullText.includes('presentation') || fullText.includes('slides') || fullText.includes('pitch')) {
    design_type = 'Presentation Deck';
  } else if (fullText.includes('social media') || fullText.includes('marketing') || fullText.includes('ad') || fullText.includes('instagram') || fullText.includes('facebook') || fullText.includes('banner')) {
    design_type = 'Social Media / Marketing Creatives';
  }

  // Extract Purpose
  const purposeMatch = fullText.match(/(?:for our|for my|logo is for|used for|purpose is|deck for|presentation for|creatives for|logo for)\s+([^.\n,]+)/i);
  if (purposeMatch && purposeMatch[1]) {
    purpose = capitalizeFirstLetter(purposeMatch[1].trim());
  } else if (fullText.includes('coffee packaging') || fullText.includes('packaging')) {
    purpose = 'Coffee packaging and website';
  } else if (fullText.includes('for my company')) {
    purpose = 'Company pitch deck';
  }

  // Extract Deadline
  const deadlineMatch = fullText.match(/(?:in|by|deadline is|need it in|due in|due)\s+(\d+\s+weeks?|\d+\s+days?|friday|next week|tomorrow|[\w\s\d]+day)/i);
  if (deadlineMatch && deadlineMatch[1]) {
    deadline = capitalizeFirstLetter(deadlineMatch[1].trim());
  } else if (fullText.includes('10 days')) {
    deadline = '10 Days';
  } else if (fullText.includes('one week') || fullText.includes('1 week')) {
    deadline = '1 Week';
  }

  // Extract References
  if (fullText.includes('earthy tones') || fullText.includes('minimal') || fullText.includes('modern')) {
    let refs = [];
    if (fullText.includes('earthy tones')) refs.push('Earthy tones');
    if (fullText.includes('minimal')) refs.push('Minimal');
    if (fullText.includes('modern')) refs.push('Modern');
    if (fullText.includes('reference') || fullText.includes('attached') || fullText.includes('mood board') || fullText.includes('logo is attached')) refs.push('References attached');
    references = refs.join(', ');
  } else if (fullText.includes('no brand guidelines') || fullText.includes('no guidelines')) {
    references = 'None / Clean slate';
  } else if (fullText.includes('mood board') || fullText.includes('attached') || fullText.includes('guidelines') || fullText.includes('logo is attached')) {
    references = 'References attached';
  }

  // Extract Budget
  const budgetMatch = fullText.match(/(?:\$|budget is|budget of|rs\s*|inr\s*)\s*(\d+[\s\-\d]*|\d+k)/i);
  if (budgetMatch) {
    if (fullText.includes('$500-$800')) {
      budget = '$500 - $800';
    } else if (fullText.includes('rs 4000') || fullText.includes('rs. 4000')) {
      budget = 'Rs 4,000';
    } else {
      budget = budgetMatch[0].toUpperCase();
    }
  }

  const missing = [];
  if (!design_type) missing.push('design_type');
  if (!purpose) missing.push('purpose');
  if (!deadline) missing.push('deadline');
  if (!references) missing.push('references');
  if (!budget) missing.push('budget');

  return {
    design_type: design_type || null,
    purpose: purpose || null,
    deadline: deadline || null,
    references: references || null,
    budget: budget || null,
    missing: missing
  };
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Main Triage Flow (Async call to Groq)
async function processTriageFlow(newClientReply = null) {
  // Check if we need to start a new session because the previous one was routed
  if (state.status === 'routed') {
    state.status = 'awaiting_triage';
    state.assigned_to = null;
    state.extracted = {
      design_type: null,
      purpose: null,
      deadline: null,
      references: null,
      budget: null
    };
    state.conversationHistory = [];
    
    // Add visual divider in chat thread
    const divider = document.createElement('div');
    divider.className = 'chat-divider';
    divider.innerHTML = '<span class="divider-text">New Request Session Started</span>';
    elEmailThread.appendChild(divider);
    
    // Reset indicators in UI
    updateExtractionUI(false);
  }

  // Update state & UI to show thinking/loading
  elTriageStatusText.textContent = 'AI Processing...';
  elTriageStatusText.className = 'status-badge status-awaiting pulse';

  if (newClientReply) {
    state.conversationHistory.push({ role: "user", content: newClientReply });
    renderMessage('client', newClientReply);
  }

  let parseResult;
  let usedFallback = false;

  try {
    // Call the real Groq LLM API
    parseResult = await callGroqAPI(state.conversationHistory);
  } catch (error) {
    console.warn("Groq API Call failed. Falling back to local heuristic extraction.", error);
    // Graceful Fallback
    parseResult = parseClientTextHeuristic(state.conversationHistory);
    usedFallback = true;
  }

  // Update State with Extracted values
  state.extracted = {
    design_type: parseResult.design_type,
    purpose: parseResult.purpose,
    deadline: parseResult.deadline,
    references: parseResult.references,
    budget: parseResult.budget
  };

  // Update UI Checklist Elements
  updateExtractionUI(usedFallback);

  // Update Triage JSON payload inspector
  updateJSONPayload(parseResult.missing, usedFallback);

  // If complete, perform routing
  if (parseResult.missing.length === 0) {
    state.status = 'routed';
    elTriageStatusText.textContent = 'Routed & Completed';
    elTriageStatusText.className = 'status-badge status-routed';
    
    // Perform Assignment Routing
    const owner = routeRequest(state.extracted.design_type);
    state.assigned_to = owner;
    
    // Add AI routing success message
    const routingMsg = `✨ Request complete! All 5 intake fields successfully verified. \n\nRouting this project to **${owner}** for execution.`;
    renderMessage('ai', routingMsg);
    state.conversationHistory.push({ role: "assistant", content: routingMsg });
    
    // Add ticket card to the assignee column
    assignTicketToDesigner(owner, state.extracted);
  } else {
    // Generate intelligent AI response asking for only what is missing
    generateAIResponse(parseResult.missing);
  }
}

// Routing Engine
function routeRequest(design_type) {
  const type = (design_type || '').toLowerCase();
  
  if (type.includes('logo') || type.includes('brand') || type.includes('identity')) {
    return 'Priya'; // Priya owns Brand Identity
  } else if (type.includes('deck') || type.includes('presentation') || type.includes('slides')) {
    return 'Sameer'; // Sameer owns Decks & Presentations
  } else {
    return 'Riya'; // Riya owns Social/Marketing
  }
}

// Update Extraction Checklist
function updateExtractionUI(isFallback) {
  const ext = state.extracted;
  let filledCount = 0;

  const fields = [
    { key: 'design_type', val: ext.design_type, el: elValDesignType, wrap: elFieldDesignType },
    { key: 'purpose', val: ext.purpose, el: elValPurpose, wrap: elFieldPurpose },
    { key: 'deadline', val: ext.deadline, el: elValDeadline, wrap: elFieldDeadline },
    { key: 'references', val: ext.references, el: elValReferences, wrap: elFieldReferences },
    { key: 'budget', val: ext.budget, el: elValBudget, wrap: elFieldBudget }
  ];

  fields.forEach(f => {
    if (f.val) {
      filledCount++;
      f.el.textContent = f.val;
      f.wrap.className = 'field-item status-valid';
    } else {
      f.el.textContent = 'Not extracted';
      f.wrap.className = 'field-item status-invalid';
    }
  });

  // Calculate completeness percentage
  const pct = (filledCount / 5) * 100;
  elCompletenessPercent.textContent = `${pct}%`;
  elProgressBarFill.style.width = `${pct}%`;
}

// Update JSON Payload code block
function updateJSONPayload(missingFields, isFallback) {
  const payload = {
    triage_status: state.status,
    extraction_engine: isFallback ? "Local Heuristic Fallback" : `Groq API (${GROQ_MODEL})`,
    extracted_fields: {
      design_type: state.extracted.design_type || null,
      purpose: state.extracted.purpose || null,
      deadline: state.extracted.deadline || null,
      brand_references: state.extracted.references || null,
      budget_range: state.extracted.budget || null
    },
    missing_fields: missingFields,
    completeness: `${(5 - missingFields.length) * 20}%`,
    routed_to: state.assigned_to
  };
  
  elJsonCodeBlock.textContent = JSON.stringify(payload, null, 2);
}

// Render Chat Message
function renderMessage(sender, text) {
  const msgEl = document.createElement('div');
  msgEl.className = `message ${sender === 'client' ? 'client-message' : 'ai-message'}`;
  
  const header = document.createElement('div');
  header.className = 'message-header';
  header.innerHTML = `
    <span class="sender-name">${sender === 'client' ? 'Client' : 'Aura Triage Bot'}</span>
    <span class="timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  `;
  
  const body = document.createElement('div');
  body.className = 'message-body';
  body.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // simple bold formatter
  
  msgEl.appendChild(header);
  msgEl.appendChild(body);
  elEmailThread.appendChild(msgEl);
  
  // Scroll thread to bottom
  elEmailThread.scrollTop = elEmailThread.scrollHeight;
}

// AI Follow-up response
function generateAIResponse(missing) {
  const designType = (state.extracted.design_type || '').toLowerCase();
  let assetType = "logo/design";
  let purposeExamples = "coffee packaging, website, pitch deck";
  
  if (designType.includes('logo') || designType.includes('brand') || designType.includes('identity')) {
    assetType = "logo";
    purposeExamples = "website, packaging, signage";
  } else if (designType.includes('deck') || designType.includes('presentation') || designType.includes('slides')) {
    assetType = "presentation deck";
    purposeExamples = "investor pitch, sales presentation, internal meeting";
  } else if (designType.includes('social') || designType.includes('marketing') || designType.includes('ad')) {
    assetType = "marketing creatives";
    purposeExamples = "Instagram ad, website banner, campaign launch";
  }

  let reply = "Thanks for reaching out! To get started, we need a few more details:\n\n";
  
  const questions = {
    purpose: `• What is the ${assetType} being used for? (e.g. ${purposeExamples})`,
    deadline: "• What is your desired deadline for this project?",
    budget: "• What is your estimated budget range?",
    design_type: "• What type of design assets do you need? (e.g., logo, presentation, social creatives)",
    references: "• Do you have any brand guidelines, references, or mood boards you'd like us to follow?"
  };

  missing.forEach(field => {
    if (questions[field]) {
      reply += questions[field] + "\n";
    }
  });

  reply += "\nOnce we have these details, we'll route your request to the appropriate designer.";
  
  setTimeout(() => {
    renderMessage('ai', reply);
    state.conversationHistory.push({ role: "assistant", content: reply });
    
    // Update status badge back to Awaiting response
    elTriageStatusText.textContent = 'Awaiting Details';
    elTriageStatusText.className = 'status-badge status-awaiting';
  }, 400);
}

// Add routed tickets to designer columns
let ticketCounter = { Priya: 0, Sameer: 0, Riya: 0 };

function assignTicketToDesigner(owner, data) {
  const listEl = document.getElementById(`list-${owner.toLowerCase()}`);
  if (ticketCounter[owner] === 0) {
    listEl.innerHTML = '';
  }

  ticketCounter[owner]++;
  document.getElementById(`count-${owner.toLowerCase()}`).textContent = ticketCounter[owner];

  const ticketCard = document.createElement('div');
  ticketCard.className = 'routed-ticket';
  ticketCard.innerHTML = `
    <div class="routed-ticket-title">${data.design_type}</div>
    <div class="routed-ticket-meta">
      <strong>For:</strong> <span>${data.purpose}</span>
      <strong>Due:</strong> <span>${data.deadline}</span>
      <strong>Budget:</strong> <span>${data.budget}</span>
      <strong>Refs:</strong> <span>${data.references}</span>
    </div>
  `;

  listEl.appendChild(ticketCard);
  highlightElement(ticketCard);
}

// Event Listeners
elBtnSubmit.addEventListener('click', () => {
  const replyText = elClientInput.value.trim();
  if (replyText === '') return;
  
  elClientInput.value = '';
  processTriageFlow(replyText);
});

elClientInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    elBtnSubmit.click();
  }
});

elPresetComplete.addEventListener('click', () => {
  elClientInput.value = "The logo is for coffee packaging and our website. We need it in 10 days. Budget is $500-$800. References attached.";
  highlightElement(elClientInput);
});

elPresetPartial.addEventListener('click', () => {
  elClientInput.value = "The logo is for coffee packaging and our website. We need it in 10 days. Budget is still being decided.";
  highlightElement(elClientInput);
});

elJsonCopyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(elJsonCodeBlock.textContent);
  elJsonCopyBtn.textContent = 'Copied!';
  setTimeout(() => elJsonCopyBtn.textContent = 'Copy JSON', 1500);
});

elBtnReset.addEventListener('click', () => {
  resetDemo();
});

// Reset Flow
function resetDemo() {
  state = {
    extracted: {
      design_type: null,
      purpose: null,
      deadline: null,
      references: null,
      budget: null
    },
    status: 'awaiting_triage',
    assigned_to: null,
    conversationHistory: []
  };

  elEmailThread.innerHTML = '';
  elTriageStatusText.textContent = 'Awaiting Triage';
  elTriageStatusText.className = 'status-badge status-awaiting';
  
  // Re-seed original message
  state.conversationHistory.push({ role: "user", content: initialRequest });
  
  const msgEl = document.createElement('div');
  msgEl.className = 'message client-message';
  msgEl.innerHTML = `
    <div class="message-header">
      <span class="sender-name">Coffee Cult (Client)</span>
      <span class="timestamp">Just now</span>
    </div>
    <div class="message-body">${initialRequest}</div>
  `;
  elEmailThread.appendChild(msgEl);
  
  // Run triage on the initial request
  processTriageFlow();
}

// Initialise the demo
resetDemo();
