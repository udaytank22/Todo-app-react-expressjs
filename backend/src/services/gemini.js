const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');
const xlsx = require('xlsx');

// Initialize Gemini client if API key is provided
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Extracts text from a PDF Buffer
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<string>}
 */
const extractTextFromPDF = async (buffer) => {
  try {
    if (buffer && buffer.toString() === 'MOCK_PDF_REQUIREMENTS') {
      return `CLIENT SERVICE INQUIRY SPECIFICATION
Project: DevOps Migration Consulting
Client: Innovate Solutions
Scope: Migration of 15 legacy microservices to Kubernetes on AWS.
Required Deliverables:
- CI/CD pipelines (GitHub Actions)
- Terraform Infrastructure code
- Monitoring setup (Prometheus & Grafana)
Quantity: 1 Migration Consulting Engagement
Priority: High
Due Date: 2026-07-15`;
    }
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error.message);
    return `[PDF Text Extraction Failed: ${error.message}]`;
  }
};

/**
 * Parses an Excel spreadsheet and converts it to a readable string format
 * @param {Buffer} buffer - Spreadsheet file buffer
 * @returns {string}
 */
const extractTextFromExcel = (buffer) => {
  try {
    if (buffer && buffer.toString() === 'MOCK_EXCEL_ORDER_SHEET') {
      return `Sheet: Procurement Order
| Product / Part Name | Quantity | Catalog Number |
| --- | --- | --- |
| Widget Model X | 120 | WX-9823 |
| Power Adaptor 12V | 50 | PA-12-50 |
| Steel Brackets Large | 200 | SB-LG-200 |
`;
    }
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let sheetsData = '';

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      
      if (jsonData.length > 0) {
        sheetsData += `Sheet: ${sheetName}\n`;
        // Format sheets data as Markdown table for Gemini to understand easily
        const headers = Object.keys(jsonData[0]);
        sheetsData += `| ${headers.join(' | ')} |\n`;
        sheetsData += `| ${headers.map(() => '---').join(' | ')} |\n`;
        
        jsonData.forEach((row) => {
          const values = headers.map(header => String(row[header]).replace(/\n/g, ' '));
          sheetsData += `| ${values.join(' | ')} |\n`;
        });
        sheetsData += '\n';
      }
    });

    return sheetsData || '[Excel file contains no readable text or is empty]';
  } catch (error) {
    console.error('Error parsing Excel:', error.message);
    return `[Excel Text Extraction Failed: ${error.message}]`;
  }
};

/**
 * Simple Regex-based parser as a fallback when Gemini API key is missing
 * @param {string} text - Aggregated inquiry text
 * @returns {object}
 */
const fallbackHeuristicParser = (text, subject, senderEmail, senderName) => {
  console.log('[Gemini Service] Using heuristic fallback parser.');
  
  // Try to find customer name
  let customerName = senderName || 'Unknown Customer';
  const nameMatch = text.match(/(?:name|customer|client|company|co):\s*([^\n\r]+)/i);
  if (nameMatch && nameMatch[1]) {
    customerName = nameMatch[1].trim();
  }

  // Try to find external links
  const linkMatch = text.match(/https?:\/\/[^\s"'<>]+/gi);
  const externalLink = linkMatch ? linkMatch[0] : null;

  // Try to find product list
  const products = [];
  const qtyMatch = text.match(/(?:qty|quantity|amount|count):\s*(\d+)/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
  
  // Try to match product names
  const productTerms = ['licence', 'license', 'subscription', 'api', 'consulting', 'widget', 'service', 'installation', 'devops'];
  let detectedProduct = 'Standard Inquiry';
  for (const term of productTerms) {
    if (text.toLowerCase().includes(term)) {
      detectedProduct = term.charAt(0).toUpperCase() + term.slice(1);
      break;
    }
  }
  products.push({ name: detectedProduct, quantity });

  // Priority detection
  let priority = 'MEDIUM';
  if (text.toLowerCase().match(/(urgent|asap|critical|immediate|emergency)/i)) {
    priority = 'URGENT';
  } else if (text.toLowerCase().match(/(high|important)/i)) {
    priority = 'HIGH';
  } else if (text.toLowerCase().match(/(low|minor|backlog)/i)) {
    priority = 'LOW';
  }

  // Due date detection (looks for YYYY-MM-DD or similar)
  let dueDate = null;
  const dateMatch = text.match(/(?:due|before|by|deadline):\s*(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{2}[-\/]\d{2}[-\/]\d{4})/i);
  if (dateMatch && dateMatch[1]) {
    try {
      dueDate = new Date(dateMatch[1]).toISOString();
    } catch (e) {
      // ignore parsing error
    }
  }

  return {
    customerName,
    subject: subject || 'New Client Request',
    description: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
    dueDate,
    priority,
    products,
    remarks: externalLink ? `External ticket link detected: ${externalLink}` : 'Processed via fallback engine.',
    externalLink
  };
};

/**
 * Analyzes email content using Gemini generative AI
 * @param {object} email - Email object ({ subject, body, senderEmail, senderName })
 * @param {Array} attachments - Array of attachment objects ({ filename, buffer, mimeType })
 * @returns {Promise<{ taskData: object, rawResponse: string, prompt: string }>}
 */
const analyzeInquiryWithGemini = async (email, attachments = []) => {
  let pdfTexts = [];
  let excelTexts = [];
  let attachmentMetadataList = [];

  for (const att of attachments) {
    const isPDF = att.filename.toLowerCase().endsWith('.pdf') || att.mimeType === 'application/pdf';
    const isExcel = att.filename.toLowerCase().endsWith('.xlsx') || att.filename.toLowerCase().endsWith('.xls') || att.mimeType.includes('spreadsheet') || att.mimeType.includes('excel');

    if (isPDF) {
      const pdfText = await extractTextFromPDF(att.buffer);
      pdfTexts.push(`--- PDF Attachment: ${att.filename} ---\n${pdfText}\n`);
      attachmentMetadataList.push({ filename: att.filename, type: 'PDF' });
    } else if (isExcel) {
      const excelText = extractTextFromExcel(att.buffer);
      excelTexts.push(`--- Excel Attachment: ${att.filename} ---\n${excelText}\n`);
      attachmentMetadataList.push({ filename: att.filename, type: 'EXCEL' });
    } else {
      attachmentMetadataList.push({ filename: att.filename, type: 'OTHER' });
    }
  }

  const aggregatedText = `
Sender: ${email.senderName} <${email.senderEmail}>
Subject: ${email.subject}
Body:
${email.body}

${pdfTexts.length > 0 ? '\n' + pdfTexts.join('\n') : ''}
${excelTexts.length > 0 ? '\n' + excelTexts.join('\n') : ''}
`;

  // Fallback if no Gemini Key
  if (!genAI) {
    const taskData = fallbackHeuristicParser(aggregatedText, email.subject, email.senderEmail, email.senderName);
    return {
      taskData,
      rawResponse: JSON.stringify(taskData, null, 2),
      prompt: `[FALLBACK MODE] Heuristic parsing of: \n${aggregatedText.substring(0, 300)}...`
    };
  }

  const prompt = `
You are an advanced AI Task and Inquiry Management assistant.
Analyze the following email and its parsed attachments (PDF/Excel), and extract key details to create a task record in our system.

--- START EMAIL DETAILS ---
${aggregatedText}
--- END EMAIL DETAILS ---

Extract the following variables:
1. **customerName**: Company/Customer requesting. (If not found, use their sender display name: "${email.senderName}").
2. **subject**: Clean, concise subject line summarizing the query.
3. **description**: Structured, detailed inquiry description outlining what they need.
4. **dueDate**: Expected delivery date if mentioned (ISO format). If not mentioned, set to null.
5. **priority**: "LOW", "MEDIUM", "HIGH", or "URGENT". Assess based on wording (e.g. ASAP, emergency = URGENT; standard = MEDIUM).
6. **products**: List of products/services and their quantities requested. If quantities are not listed, default to 1. Schema: Array of { name: string, quantity: number }
7. **remarks**: Any notable extra information, contact phone numbers, or notes.
8. **externalLink**: Extract any links to external platforms like Jira, Salesforce, HubSpot, Shopify, or Trello. If none are found, use null.

Return your response strictly in JSON format. Ensure the response is valid JSON and contains only the JSON object. Do not include markdown code block tags.

Example JSON output structure:
{
  "customerName": "Acme Corp",
  "subject": "Quote request for widgets",
  "description": "Customer wants 50 red widgets and a consultation session.",
  "dueDate": "2026-07-01T00:00:00.000Z",
  "priority": "HIGH",
  "products": [
    { "name": "Red Widgets", "quantity": 50 },
    { "name": "Consultation", "quantity": 1 }
  ],
  "remarks": "Referred by John Doe. Phone: +1-555-0199.",
  "externalLink": "https://hubspot.com/tickets/12345"
}
`;

  try {
    // We use gemini-1.5-flash as it is fast and supports JSON response structures
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawResponse = response.text().trim();
    
    // Clean potential markdown wrapped backticks
    let cleanedJson = rawResponse;
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const taskData = JSON.parse(cleanedJson);
    return {
      taskData,
      rawResponse: cleanedJson,
      prompt
    };
  } catch (error) {
    console.error('Gemini API call failed, using heuristic fallback:', error.message);
    const taskData = fallbackHeuristicParser(aggregatedText, email.subject, email.senderEmail, email.senderName);
    return {
      taskData,
      rawResponse: JSON.stringify({ error: error.message, taskData }),
      prompt: `[GEMINI ERROR FALLBACK] \n${prompt.substring(0, 200)}...`
    };
  }
};

module.exports = {
  analyzeInquiryWithGemini,
  extractTextFromPDF,
  extractTextFromExcel,
};
