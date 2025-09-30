import { YextEntity, ConflictGroup, ConflictDetail } from "@/lib/types";

// Re-export types for convenience
export type { YextEntity, ConflictGroup, ConflictDetail };

// Extract text content from markdown/HTML or bodyV2 object
function extractTextContent(content: any): string {
  if (!content) return "";

  // Handle bodyV2 object structure: { markdown: "...", html: "..." }
  if (typeof content === "object" && content.markdown) {
    content = content.markdown;
  }

  // Handle bodyV2 object structure: { html: "..." }
  if (typeof content === "object" && content.html) {
    content = content.html;
  }

  // If it's still not a string, try to stringify it
  if (typeof content !== "string") {
    content = JSON.stringify(content);
  }

  // Remove HTML tags
  let text = content.replace(/<[^>]*>/g, "");

  // Remove markdown formatting
  text = text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Bold
    .replace(/\*(.*?)\*/g, "$1") // Italic
    .replace(/__(.*?)__/g, "$1") // Bold
    .replace(/_(.*?)_/g, "$1") // Italic
    .replace(/`(.*?)`/g, "$1") // Inline code
    .replace(/```[\s\S]*?```/g, "") // Code blocks
    .replace(/#{1,6}\s+/g, "") // Headers
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // Links
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // Images
    .replace(/^\s*[-*+]\s+/gm, "") // List items
    .replace(/^\s*\d+\.\s+/gm, "") // Numbered list items
    .replace(/^\s*>\s+/gm, "") // Blockquotes
    .replace(/---+/g, "") // Horizontal rules
    .replace(/\n{3,}/g, "\n\n") // Multiple newlines
    .trim();

  return text;
}

// Normalize strings for comparison
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

// Calculate similarity between two strings using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1 : (maxLen - distance) / maxLen;
}

// Normalize phone numbers for comparison
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

// Detect contradictions in text content
function detectContradictions(text1: string, text2: string): boolean {
  const normalized1 = normalizeString(text1);
  const normalized2 = normalizeString(text2);

  console.log(
    `[v0] Contradiction check: "${text1.substring(
      0,
      50
    )}..." vs "${text2.substring(0, 50)}..."`
  );

  // If texts are identical, no contradiction
  if (normalized1 === normalized2) {
    console.log(`[v0] Texts are identical, no contradiction`);
    return false;
  }

  // Check for direct contradictions (true/false, yes/no, etc.)
  const contradictionPatterns = [
    // Direct opposites
    {
      pattern: /(true|yes|correct|right|accurate)/gi,
      opposite: /(false|no|incorrect|wrong|inaccurate)/gi,
    },
    {
      pattern: /(false|no|incorrect|wrong|inaccurate)/gi,
      opposite: /(true|yes|correct|right|accurate)/gi,
    },

    // Temporal contradictions
    {
      pattern: /(always|never|all|every|none)/gi,
      opposite: /(sometimes|occasionally|some|few|rarely)/gi,
    },
    {
      pattern: /(sometimes|occasionally|some|few|rarely)/gi,
      opposite: /(always|never|all|every|none)/gi,
    },

    // Existence contradictions
    {
      pattern: /(exists|present|available|found)/gi,
      opposite: /(doesn't exist|absent|unavailable|not found|missing)/gi,
    },
    {
      pattern: /(doesn't exist|absent|unavailable|not found|missing)/gi,
      opposite: /(exists|present|available|found)/gi,
    },

    // Quantity contradictions
    {
      pattern: /(many|multiple|several|numerous)/gi,
      opposite: /(few|single|one|limited)/gi,
    },
    {
      pattern: /(few|single|one|limited)/gi,
      opposite: /(many|multiple|several|numerous)/gi,
    },

    // Discovery/Origin contradictions
    {
      pattern: /(discovered|found|created|invented|originated)/gi,
      opposite:
        /(not discovered|not found|not created|not invented|didn't originate)/gi,
    },
    {
      pattern:
        /(not discovered|not found|not created|not invented|didn't originate)/gi,
      opposite: /(discovered|found|created|invented|originated)/gi,
    },
  ];

  // Check each contradiction pattern
  for (const { pattern, opposite } of contradictionPatterns) {
    const hasPattern1 = pattern.test(normalized1);
    const hasOpposite1 = opposite.test(normalized1);
    const hasPattern2 = pattern.test(normalized2);
    const hasOpposite2 = opposite.test(normalized2);

    // If one text has the pattern and the other has its opposite, it's a contradiction
    if ((hasPattern1 && hasOpposite2) || (hasOpposite1 && hasPattern2)) {
      console.log(
        `[v0] CONTRADICTION FOUND: Pattern "${pattern}" vs Opposite "${opposite}"`
      );
      return true;
    }
  }

  // Check for specific factual contradictions (dates, numbers, names)
  const factualPatterns = [
    // Year contradictions
    { pattern: /(\d{4})/g, type: "year" },
    // Number contradictions (for quantities, measurements)
    {
      pattern:
        /(\d+(?:\.\d+)?)\s*(?:years?|months?|days?|hours?|minutes?|seconds?|times?|units?|items?|pieces?)/gi,
      type: "quantity",
    },
    // Name/entity contradictions
    {
      pattern:
        /(?:named|called|known as|referred to as)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      type: "name",
    },
  ];

  for (const { pattern, type } of factualPatterns) {
    const matches1 = [...normalized1.matchAll(pattern)];
    const matches2 = [...normalized2.matchAll(pattern)];

    if (matches1.length > 0 && matches2.length > 0) {
      // Check if the same type of fact has different values
      for (const match1 of matches1) {
        for (const match2 of matches2) {
          if (match1[1] !== match2[1]) {
            console.log(
              `[v0] FACTUAL CONTRADICTION FOUND: ${type} "${match1[1]}" vs "${match2[1]}"`
            );
            return true; // Different factual claims
          }
        }
      }
    }
  }

  return false;
}

// Advanced semantic contradiction detection
function detectSemanticContradictions(text1: string, text2: string): boolean {
  const normalized1 = normalizeString(text1);
  const normalized2 = normalizeString(text2);

  console.log(
    `[v0] Semantic contradiction check: "${text1.substring(
      0,
      50
    )}..." vs "${text2.substring(0, 50)}..."`
  );

  // If texts are identical, no contradiction
  if (normalized1 === normalized2) {
    console.log(`[v0] Texts are identical, no contradiction`);
    return false;
  }

  // 1. Extract key facts and claims from both texts
  const facts1 = extractFacts(normalized1);
  const facts2 = extractFacts(normalized2);

  console.log(`[v0] Facts from text1:`, facts1);
  console.log(`[v0] Facts from text2:`, facts2);

  // 2. Check for direct contradictions in facts
  const contradictions = findFactualContradictions(facts1, facts2);
  if (contradictions.length > 0) {
    console.log(`[v0] FACTUAL CONTRADICTIONS FOUND:`, contradictions);
    return true;
  }

  // 3. Check for procedural contradictions (different instructions for same task)
  const proceduralContradictions = findProceduralContradictions(
    normalized1,
    normalized2
  );
  if (proceduralContradictions.length > 0) {
    console.log(
      `[v0] PROCEDURAL CONTRADICTIONS FOUND:`,
      proceduralContradictions
    );
    return true;
  }

  // 4. Check for temporal contradictions (different dates/times for same event)
  const temporalContradictions = findTemporalContradictions(
    normalized1,
    normalized2
  );
  if (temporalContradictions.length > 0) {
    console.log(`[v0] TEMPORAL CONTRADICTIONS FOUND:`, temporalContradictions);
    return true;
  }

  // 5. Check for quantitative contradictions (different numbers for same measurement)
  const quantitativeContradictions = findQuantitativeContradictions(
    normalized1,
    normalized2
  );
  if (quantitativeContradictions.length > 0) {
    console.log(
      `[v0] QUANTITATIVE CONTRADICTIONS FOUND:`,
      quantitativeContradictions
    );
    return true;
  }

  return false;
}

// Extract key facts from text
function extractFacts(
  text: string
): Array<{ type: string; value: string; context: string }> {
  const facts = [];

  // Extract dates
  const dateMatches = [
    ...text.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{4})/g),
  ];
  dateMatches.forEach((match) => {
    facts.push({
      type: "date",
      value: match[1],
      context: text.substring(
        Math.max(0, match.index! - 20),
        match.index! + match[1].length + 20
      ),
    });
  });

  // Extract numbers with units
  const numberMatches = [
    ...text.matchAll(
      /(\d+(?:\.\d+)?)\s*(years?|months?|days?|hours?|minutes?|seconds?|times?|units?|items?|pieces?|steps?|versions?)/gi
    ),
  ];
  numberMatches.forEach((match) => {
    facts.push({
      type: "quantity",
      value: `${match[1]} ${match[2]}`,
      context: text.substring(
        Math.max(0, match.index! - 20),
        match.index! + match[0].length + 20
      ),
    });
  });

  // Extract names/entities
  const nameMatches = [
    ...text.matchAll(
      /(?:named|called|known as|referred to as|created by|invented by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ),
  ];
  nameMatches.forEach((match) => {
    facts.push({
      type: "name",
      value: match[1],
      context: text.substring(
        Math.max(0, match.index! - 20),
        match.index! + match[0].length + 20
      ),
    });
  });

  // Extract boolean claims
  const booleanMatches = [
    ...text.matchAll(
      /(true|false|yes|no|correct|incorrect|right|wrong|accurate|inaccurate|exists|doesn't exist|present|absent|available|unavailable)/gi
    ),
  ];
  booleanMatches.forEach((match) => {
    facts.push({
      type: "boolean",
      value: match[1],
      context: text.substring(
        Math.max(0, match.index! - 20),
        match.index! + match[1].length + 20
      ),
    });
  });

  return facts;
}

// Find contradictions between facts
function findFactualContradictions(
  facts1: Array<{ type: string; value: string; context: string }>,
  facts2: Array<{ type: string; value: string; context: string }>
): Array<string> {
  const contradictions = [];

  // Group facts by type
  const facts1ByType = facts1.reduce((acc, fact) => {
    if (!acc[fact.type]) acc[fact.type] = [];
    acc[fact.type].push(fact);
    return acc;
  }, {} as Record<string, Array<{ type: string; value: string; context: string }>>);

  const facts2ByType = facts2.reduce((acc, fact) => {
    if (!acc[fact.type]) acc[fact.type] = [];
    acc[fact.type].push(fact);
    return acc;
  }, {} as Record<string, Array<{ type: string; value: string; context: string }>>);

  // Check for contradictions in each type
  for (const type of Object.keys(facts1ByType)) {
    if (facts2ByType[type]) {
      for (const fact1 of facts1ByType[type]) {
        for (const fact2 of facts2ByType[type]) {
          if (areFactsContradictory(fact1, fact2)) {
            contradictions.push(
              `${type}: "${fact1.value}" vs "${fact2.value}"`
            );
          }
        }
      }
    }
  }

  return contradictions;
}

// Check if two facts are contradictory
function areFactsContradictory(
  fact1: { type: string; value: string; context: string },
  fact2: { type: string; value: string; context: string }
): boolean {
  if (fact1.type === "boolean") {
    const opposites = {
      true: ["false", "no", "incorrect", "wrong", "inaccurate"],
      false: ["true", "yes", "correct", "right", "accurate"],
      yes: ["no", "false", "incorrect", "wrong"],
      no: ["yes", "true", "correct", "right"],
      exists: ["doesn't exist", "absent", "unavailable"],
      "doesn't exist": ["exists", "present", "available"],
      present: ["absent", "unavailable", "doesn't exist"],
      absent: ["present", "available", "exists"],
    };

    const fact1Lower = fact1.value.toLowerCase();
    const fact2Lower = fact2.value.toLowerCase();

    return (
      opposites[fact1Lower]?.includes(fact2Lower) ||
      opposites[fact2Lower]?.includes(fact1Lower)
    );
  }

  if (
    fact1.type === "date" ||
    fact1.type === "quantity" ||
    fact1.type === "name"
  ) {
    return fact1.value !== fact2.value;
  }

  return false;
}

// Find procedural contradictions (different instructions for same task)
function findProceduralContradictions(
  text1: string,
  text2: string
): Array<string> {
  const contradictions = [];

  // Look for step-by-step instructions
  const steps1 = [
    ...text1.matchAll(
      /(?:step\s*\d+|first|second|third|then|next|finally|lastly)/gi
    ),
  ];
  const steps2 = [
    ...text2.matchAll(
      /(?:step\s*\d+|first|second|third|then|next|finally|lastly)/gi
    ),
  ];

  if (steps1.length > 0 && steps2.length > 0) {
    // Extract the actual instructions around each step
    const instructions1 = steps1.map((match) =>
      text1.substring(Math.max(0, match.index! - 50), match.index! + 100)
    );
    const instructions2 = steps2.map((match) =>
      text2.substring(Math.max(0, match.index! - 50), match.index! + 100)
    );

    // Check for contradictory instructions
    for (
      let i = 0;
      i < Math.min(instructions1.length, instructions2.length);
      i++
    ) {
      if (areInstructionsContradictory(instructions1[i], instructions2[i])) {
        contradictions.push(`Step ${i + 1}: Different instructions`);
      }
    }
  }

  return contradictions;
}

// Check if two instruction texts are contradictory
function areInstructionsContradictory(inst1: string, inst2: string): boolean {
  const inst1Norm = normalizeString(inst1);
  const inst2Norm = normalizeString(inst2);

  // Look for opposite action words
  const actionOpposites = [
    ["click", "don't click", "avoid clicking"],
    ["select", "deselect", "unselect"],
    ["enable", "disable"],
    ["turn on", "turn off"],
    ["start", "stop"],
    ["begin", "end"],
    ["open", "close"],
    ["add", "remove", "delete"],
    ["include", "exclude"],
    ["allow", "prevent", "block"],
  ];

  for (const [positive, ...negatives] of actionOpposites) {
    const hasPositive1 = inst1Norm.includes(positive);
    const hasNegative1 = negatives.some((neg) => inst1Norm.includes(neg));
    const hasPositive2 = inst2Norm.includes(positive);
    const hasNegative2 = negatives.some((neg) => inst2Norm.includes(neg));

    if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
      return true;
    }
  }

  return false;
}

// Find temporal contradictions (different dates/times for same event)
function findTemporalContradictions(
  text1: string,
  text2: string
): Array<string> {
  const contradictions = [];

  // Extract all dates and times
  const dates1 = [
    ...text1.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{4})/g),
  ];
  const dates2 = [
    ...text2.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{4})/g),
  ];

  if (dates1.length > 0 && dates2.length > 0) {
    // Check if different dates are mentioned for the same event
    for (const date1 of dates1) {
      for (const date2 of dates2) {
        if (date1[1] !== date2[1]) {
          // Check if they're talking about the same event by looking at context
          const context1 = text1.substring(
            Math.max(0, date1.index! - 30),
            date1.index! + date1[1].length + 30
          );
          const context2 = text2.substring(
            Math.max(0, date2.index! - 30),
            date2.index! + date2[1].length + 30
          );

          if (areContextsSimilar(context1, context2)) {
            contradictions.push(
              `Date: "${date1[1]}" vs "${date2[1]}" for same event`
            );
          }
        }
      }
    }
  }

  return contradictions;
}

// Find quantitative contradictions (different numbers for same measurement)
function findQuantitativeContradictions(
  text1: string,
  text2: string
): Array<string> {
  const contradictions = [];

  // Extract numbers with units
  const numbers1 = [
    ...text1.matchAll(
      /(\d+(?:\.\d+)?)\s*(years?|months?|days?|hours?|minutes?|seconds?|times?|units?|items?|pieces?|steps?|versions?)/gi
    ),
  ];
  const numbers2 = [
    ...text2.matchAll(
      /(\d+(?:\.\d+)?)\s*(years?|months?|days?|hours?|minutes?|seconds?|times?|units?|items?|pieces?|steps?|versions?)/gi
    ),
  ];

  if (numbers1.length > 0 && numbers2.length > 0) {
    for (const num1 of numbers1) {
      for (const num2 of numbers2) {
        if (
          num1[2].toLowerCase() === num2[2].toLowerCase() &&
          num1[1] !== num2[1]
        ) {
          // Check if they're talking about the same measurement
          const context1 = text1.substring(
            Math.max(0, num1.index! - 30),
            num1.index! + num1[0].length + 30
          );
          const context2 = text2.substring(
            Math.max(0, num2.index! - 30),
            num2.index! + num2[0].length + 30
          );

          if (areContextsSimilar(context1, context2)) {
            contradictions.push(
              `Quantity: "${num1[0]}" vs "${num2[0]}" for same measurement`
            );
          }
        }
      }
    }
  }

  return contradictions;
}

// Check if two contexts are similar (simple similarity check)
function areContextsSimilar(context1: string, context2: string): boolean {
  const norm1 = normalizeString(context1);
  const norm2 = normalizeString(context2);

  // Simple word overlap check
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const similarity = intersection.size / union.size;
  return similarity > 0.3; // 30% word overlap indicates similar context
}

// Detect conflicts in entity data
export function detectConflicts(entities: YextEntity[]): ConflictGroup[] {
  const conflicts: ConflictGroup[] = [];

  console.log(
    `[v0] Starting conflict detection on ${entities.length} entities`
  );

  // Debug: Log entity types
  const entityTypes = entities.reduce((acc, entity) => {
    const entityType = entity.meta?.entityType || "unknown";
    acc[entityType] = (acc[entityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log("[v0] Entity types in conflict detection:", entityTypes);

  // Optimized FAQ conflict detection using grouping
  const faqEntities = entities.filter(
    (e) => e.meta?.entityType === "faq" || e.meta?.entityType === "ce_faq"
  );
  if (faqEntities.length > 0) {
    console.log(
      `[v0] Processing ${faqEntities.length} FAQ entities with optimized algorithm`
    );

    // Group FAQs by normalized question for O(n) comparison
    const questionGroups = new Map<string, YextEntity[]>();

    for (const faq of faqEntities) {
      const normalizedQuestion = normalizeString(faq.name || "");
      if (!questionGroups.has(normalizedQuestion)) {
        questionGroups.set(normalizedQuestion, []);
      }
      questionGroups.get(normalizedQuestion)!.push(faq);
    }

    console.log(`[v0] Found ${questionGroups.size} unique FAQ questions`);

    // Check for conflicts within each group
    for (const [question, faqs] of questionGroups) {
      if (faqs.length > 1) {
        console.log(
          `[v0] Found ${faqs.length} FAQs with question: "${question}"`
        );

        // Check if answers are different
        const answers = faqs.map((faq) => ({
          entity: faq,
          answer: normalizeString(faq.answer || faq.description || ""),
        }));

        const uniqueAnswers = new Set(answers.map((a) => a.answer));

        if (uniqueAnswers.size > 1) {
          console.log(
            `[v0] FAQ conflict detected: ${faqs.length} entities with same question but different answers`
          );

          const conflictDetails: ConflictDetail[] = [
            {
              field: "answer",
              values: answers.map((a) => ({
                entityId: a.entity.meta?.id || a.entity.id || "unknown",
                entityName: a.entity.name || "Unknown Entity",
                value:
                  (a.entity.answer || a.entity.description || "").substring(
                    0,
                    100
                  ) + "...",
              })),
              conflictType: "faq_answer_conflict",
              severity: "high",
              description: `${faqs.length} FAQ entities with identical questions have different answers`,
            },
          ];

          conflicts.push({
            id: `faq-conflict-${question}`,
            title: `FAQ Conflict: "${question}"`,
            entities: faqs.map((faq) => ({
              id: faq.meta?.id || faq.id || "unknown",
              name: faq.name || "Unknown Entity",
              type: faq.meta?.entityType,
            })),
            conflictDetails,
            severity: conflictDetails.some((c) => c.severity === "high")
              ? "high"
              : "medium",
          });
        }
      }
    }
  }

  // Process other entity types with optimized approach
  const nonFaqEntities = entities.filter(
    (e) =>
      e.meta?.entityType !== "faq" &&
      e.meta?.entityType !== "ce_faq" &&
      e.meta?.entityType !== "location" &&
      e.meta?.entityType !== "ce_location" &&
      e.meta?.entityType !== "bufo" &&
      e.meta?.entityType !== "ce_bufo"
  );

  console.log(`[v0] Total entities: ${entities.length}`);
  console.log(`[v0] Non-FAQ entities: ${nonFaqEntities.length}`);
  console.log(
    `[v0] Excluded entity types: FAQ (faq/ce_faq), location (location/ce_location), bufo (bufo/ce_bufo)`
  );

  // Debug: Show entity types
  const entityTypeCounts = entities.reduce((acc, entity) => {
    const entityType = entity.meta?.entityType || "unknown";
    acc[entityType] = (acc[entityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`[v0] Entity type counts:`, entityTypeCounts);

  if (nonFaqEntities.length > 0) {
    console.log(`[v0] Processing ${nonFaqEntities.length} non-FAQ entities`);

    // Group by entity type for more efficient processing
    const entityGroups = new Map<string, YextEntity[]>();
    for (const entity of nonFaqEntities) {
      const entityType = entity.meta?.entityType || "unknown";
      if (!entityGroups.has(entityType)) {
        entityGroups.set(entityType, []);
      }
      entityGroups.get(entityType)!.push(entity);
    }

    // Process each entity type group
    for (const [entityType, entityGroup] of entityGroups) {
      console.log(
        `[v0] Processing ${entityGroup.length} ${entityType} entities`
      );

      // Special debug for book entities
      if (entityType === "book" || entityType === "ce_book") {
        console.log(
          `[v0] BOOK ENTITIES FOUND:`,
          entityGroup.map((e) => ({
            id: e.meta?.id || e.id,
            name: e.name,
            body:
              typeof e.body === "string"
                ? e.body.substring(0, 100) + "..."
                : e.body,
            bodyV2:
              typeof e.bodyV2 === "string"
                ? e.bodyV2.substring(0, 100) + "..."
                : e.bodyV2,
            description:
              typeof e.description === "string"
                ? e.description.substring(0, 100) + "..."
                : e.description,
            content:
              typeof e.content === "string"
                ? e.content.substring(0, 100) + "..."
                : e.content,
            richTextDescription:
              typeof e.richTextDescription === "string"
                ? e.richTextDescription.substring(0, 100) + "..."
                : e.richTextDescription,
            richText:
              typeof e.richText === "string"
                ? e.richText.substring(0, 100) + "..."
                : e.richText,
          }))
        );

        // Show all available fields on the first book entity
        if (entityGroup.length > 0) {
          const firstBook = entityGroup[0];
          console.log(`[v0] ALL FIELDS ON FIRST BOOK ENTITY:`, {
            name: firstBook.name,
            allFields: Object.keys(firstBook),
            bodyV2Field: firstBook.bodyV2,
            bodyV2Type: typeof firstBook.bodyV2,
            bodyField: firstBook.body,
            bodyType: typeof firstBook.body,
          });
        }
      }

      // Use optimized comparison for smaller groups
      for (let i = 0; i < entityGroup.length; i++) {
        for (let j = i + 1; j < entityGroup.length; j++) {
          const entity1 = entityGroup[i];
          const entity2 = entityGroup[j];
          const conflictDetails: ConflictDetail[] = [];

          // Check for content conflicts in similar entities
          const name1 = normalizeString(entity1.name || "");
          const name2 = normalizeString(entity2.name || "");
          const nameSimilarity = calculateSimilarity(name1, name2);

          console.log(
            `[v0] Comparing "${entity1.name}" vs "${
              entity2.name
            }" (${Math.round(nameSimilarity * 100)}% similar)`
          );

          // Special debug for book entities
          if (
            entity1.meta?.entityType === "book" ||
            entity1.meta?.entityType === "ce_book" ||
            entity2.meta?.entityType === "book" ||
            entity2.meta?.entityType === "ce_book"
          ) {
            console.log(`[v0] BOOK COMPARISON:`, {
              entity1: {
                name: entity1.name,
                body:
                  typeof entity1.body === "string"
                    ? entity1.body.substring(0, 100)
                    : entity1.body,
                bodyV2:
                  typeof entity1.bodyV2 === "string"
                    ? entity1.bodyV2.substring(0, 100)
                    : entity1.bodyV2,
                description:
                  typeof entity1.description === "string"
                    ? entity1.description.substring(0, 100)
                    : entity1.description,
                content:
                  typeof entity1.content === "string"
                    ? entity1.content.substring(0, 100)
                    : entity1.content,
              },
              entity2: {
                name: entity2.name,
                body:
                  typeof entity2.body === "string"
                    ? entity2.body.substring(0, 100)
                    : entity2.body,
                bodyV2:
                  typeof entity2.bodyV2 === "string"
                    ? entity2.bodyV2.substring(0, 100)
                    : entity2.bodyV2,
                description:
                  typeof entity2.description === "string"
                    ? entity2.description.substring(0, 100)
                    : entity2.description,
                content:
                  typeof entity2.content === "string"
                    ? entity2.content.substring(0, 100)
                    : entity2.content,
              },
              similarity: Math.round(nameSimilarity * 100) + "%",
            });
          }

          if (nameSimilarity > 0.3) {
            // Lowered threshold for debugging - should catch "a book about food" vs "another book about food"
            console.log(
              `[v0] HIGH SIMILARITY DETECTED: ${Math.round(
                nameSimilarity * 100
              )}%`
            );

            // Check for conflicting content - prioritize bodyV2 for book entities
            let content1 = "";
            let content2 = "";

            // For book entities, prioritize bodyV2 and extract text from markdown/HTML
            if (
              entity1.meta?.entityType === "book" ||
              entity1.meta?.entityType === "ce_book"
            ) {
              const bodyV2Text = entity1.bodyV2
                ? extractTextContent(entity1.bodyV2)
                : "";
              const bodyText = entity1.body
                ? extractTextContent(entity1.body)
                : "";
              const descriptionText =
                typeof entity1.description === "string"
                  ? entity1.description
                  : "";
              const contentText =
                typeof entity1.content === "string" ? entity1.content : "";
              const richTextDescriptionText = entity1.richTextDescription
                ? extractTextContent(entity1.richTextDescription)
                : "";
              const richTextText = entity1.richText
                ? extractTextContent(entity1.richText)
                : "";

              content1 =
                bodyV2Text ||
                bodyText ||
                descriptionText ||
                contentText ||
                richTextDescriptionText ||
                richTextText ||
                "";
            } else {
              // For other entities, use standard priority
              content1 =
                (typeof entity1.description === "string"
                  ? entity1.description
                  : "") ||
                (typeof entity1.content === "string" ? entity1.content : "") ||
                (typeof entity1.body === "string" ? entity1.body : "") ||
                (entity1.bodyV2 ? extractTextContent(entity1.bodyV2) : "") ||
                (entity1.richTextDescription
                  ? extractTextContent(entity1.richTextDescription)
                  : "") ||
                (entity1.richText
                  ? extractTextContent(entity1.richText)
                  : "") ||
                "";
            }

            if (
              entity2.meta?.entityType === "book" ||
              entity2.meta?.entityType === "ce_book"
            ) {
              const bodyV2Text = entity2.bodyV2
                ? extractTextContent(entity2.bodyV2)
                : "";
              const bodyText = entity2.body
                ? extractTextContent(entity2.body)
                : "";
              const descriptionText =
                typeof entity2.description === "string"
                  ? entity2.description
                  : "";
              const contentText =
                typeof entity2.content === "string" ? entity2.content : "";
              const richTextDescriptionText = entity2.richTextDescription
                ? extractTextContent(entity2.richTextDescription)
                : "";
              const richTextText = entity2.richText
                ? extractTextContent(entity2.richText)
                : "";

              content2 =
                bodyV2Text ||
                bodyText ||
                descriptionText ||
                contentText ||
                richTextDescriptionText ||
                richTextText ||
                "";
            } else {
              // For other entities, use standard priority
              content2 =
                (typeof entity2.description === "string"
                  ? entity2.description
                  : "") ||
                (typeof entity2.content === "string" ? entity2.content : "") ||
                (typeof entity2.body === "string" ? entity2.body : "") ||
                (entity2.bodyV2 ? extractTextContent(entity2.bodyV2) : "") ||
                (entity2.richTextDescription
                  ? extractTextContent(entity2.richTextDescription)
                  : "") ||
                (entity2.richText
                  ? extractTextContent(entity2.richText)
                  : "") ||
                "";
            }

            console.log(`[v0] Content1: "${content1.substring(0, 100)}..."`);
            console.log(`[v0] Content2: "${content2.substring(0, 100)}..."`);
            console.log(
              `[v0] Content1 length: ${content1.length}, Content2 length: ${content2.length}`
            );

            // Special debug for book entities - show which field was used
            if (
              entity1.meta?.entityType === "book" ||
              entity1.meta?.entityType === "ce_book" ||
              entity2.meta?.entityType === "book" ||
              entity2.meta?.entityType === "ce_book"
            ) {
              console.log(`[v0] BOOK CONTENT SOURCE:`, {
                entity1: {
                  name: entity1.name,
                  bodyV2:
                    typeof entity1.bodyV2 === "string"
                      ? "EXISTS"
                      : entity1.bodyV2 === undefined
                      ? "UNDEFINED"
                      : entity1.bodyV2 === null
                      ? "NULL"
                      : `TYPE: ${typeof entity1.bodyV2} VALUE: ${JSON.stringify(
                          entity1.bodyV2
                        ).substring(0, 100)}`,
                  body:
                    typeof entity1.body === "string"
                      ? "EXISTS"
                      : entity1.body === undefined
                      ? "UNDEFINED"
                      : entity1.body === null
                      ? "NULL"
                      : `TYPE: ${typeof entity1.body} VALUE: ${JSON.stringify(
                          entity1.body
                        ).substring(0, 100)}`,
                  description:
                    typeof entity1.description === "string"
                      ? "EXISTS"
                      : entity1.description === undefined
                      ? "UNDEFINED"
                      : entity1.description === null
                      ? "NULL"
                      : `TYPE: ${typeof entity1.description} VALUE: ${JSON.stringify(
                          entity1.description
                        ).substring(0, 100)}`,
                  content:
                    typeof entity1.content === "string"
                      ? "EXISTS"
                      : entity1.content === undefined
                      ? "UNDEFINED"
                      : entity1.content === null
                      ? "NULL"
                      : `TYPE: ${typeof entity1.content} VALUE: ${JSON.stringify(
                          entity1.content
                        ).substring(0, 100)}`,
                  finalContent: content1.substring(0, 200),
                },
                entity2: {
                  name: entity2.name,
                  bodyV2:
                    typeof entity2.bodyV2 === "string"
                      ? "EXISTS"
                      : entity2.bodyV2 === undefined
                      ? "UNDEFINED"
                      : entity2.bodyV2 === null
                      ? "NULL"
                      : `TYPE: ${typeof entity2.bodyV2} VALUE: ${JSON.stringify(
                          entity2.bodyV2
                        ).substring(0, 100)}`,
                  body:
                    typeof entity2.body === "string"
                      ? "EXISTS"
                      : entity2.body === undefined
                      ? "UNDEFINED"
                      : entity2.body === null
                      ? "NULL"
                      : `TYPE: ${typeof entity2.body} VALUE: ${JSON.stringify(
                          entity2.body
                        ).substring(0, 100)}`,
                  description:
                    typeof entity2.description === "string"
                      ? "EXISTS"
                      : entity2.description === undefined
                      ? "UNDEFINED"
                      : entity2.description === null
                      ? "NULL"
                      : `TYPE: ${typeof entity2.description} VALUE: ${JSON.stringify(
                          entity2.description
                        ).substring(0, 100)}`,
                  content:
                    typeof entity2.content === "string"
                      ? "EXISTS"
                      : entity2.content === undefined
                      ? "UNDEFINED"
                      : entity2.content === null
                      ? "NULL"
                      : `TYPE: ${typeof entity2.content} VALUE: ${JSON.stringify(
                          entity2.content
                        ).substring(0, 100)}`,
                  finalContent: content2.substring(0, 200),
                },
              });
            }

            if (content1 && content2) {
              // First check if content is different
              const isDifferent =
                normalizeString(content1) !== normalizeString(content2);

              // Then check for actual contradictions
              const hasContradiction = detectSemanticContradictions(
                content1,
                content2
              );

              console.log(
                `[v0] Content different: ${isDifferent}, Has contradiction: ${hasContradiction}`
              );

              if (isDifferent && hasContradiction) {
                console.log(
                  `[v0] CONTRADICTION DETECTED between "${entity1.name}" and "${entity2.name}"`
                );

                // Determine which field has the conflict for better reporting
                let conflictField = "content";
                let conflictType = "inconsistent_data";

                if (entity1.body && entity2.body) {
                  conflictField = "body";
                  conflictType = "body_content_contradiction";
                } else if (entity1.content && entity2.content) {
                  conflictField = "content";
                  conflictType = "content_contradiction";
                } else if (entity1.description && entity2.description) {
                  conflictField = "description";
                  conflictType = "description_contradiction";
                }

                conflictDetails.push({
                  field: conflictField,
                  values: [
                    {
                      entityId: entity1.meta?.id || entity1.id || "unknown",
                      entityName: entity1.name || "Unknown Entity",
                      value: content1.substring(0, 100) + "...",
                    },
                    {
                      entityId: entity2.meta?.id || entity2.id || "unknown",
                      entityName: entity2.name || "Unknown Entity",
                      value: content2.substring(0, 100) + "...",
                    },
                  ],
                  conflictType: conflictType,
                  severity: "high", // Contradictions are always high severity
                  description: `${entityType} entities with similar names (${Math.round(
                    nameSimilarity * 100
                  )}% similar) have contradictory ${conflictField} content`,
                });
              } else if (isDifferent) {
                console.log(
                  `[v0] CONTENT DIFFERENCE DETECTED between "${entity1.name}" and "${entity2.name}"`
                );

                // Content is different but not contradictory - lower severity
                let conflictField = "content";
                let conflictType = "inconsistent_data";

                if (entity1.body && entity2.body) {
                  conflictField = "body";
                  conflictType = "body_content_conflict";
                } else if (entity1.content && entity2.content) {
                  conflictField = "content";
                  conflictType = "content_conflict";
                } else if (entity1.description && entity2.description) {
                  conflictField = "description";
                  conflictType = "description_conflict";
                }

                conflictDetails.push({
                  field: conflictField,
                  values: [
                    {
                      entityId: entity1.meta?.id || entity1.id || "unknown",
                      entityName: entity1.name || "Unknown Entity",
                      value: content1.substring(0, 100) + "...",
                    },
                    {
                      entityId: entity2.meta?.id || entity2.id || "unknown",
                      entityName: entity2.name || "Unknown Entity",
                      value: content2.substring(0, 100) + "...",
                    },
                  ],
                  conflictType: conflictType,
                  severity: "medium",
                  description: `${entityType} entities with similar names (${Math.round(
                    nameSimilarity * 100
                  )}% similar) have different ${conflictField} content`,
                });
              }
            }
          }

          // Check for phone number conflicts
          if (entity1.mainPhone && entity2.mainPhone) {
            const phone1 = normalizePhone(entity1.mainPhone);
            const phone2 = normalizePhone(entity2.mainPhone);

            if (phone1 === phone2 && entity1.name !== entity2.name) {
              conflictDetails.push({
                field: "mainPhone",
                values: [
                  {
                    entityId: entity1.meta?.id || entity1.id || "unknown",
                    entityName: entity1.name || "Unknown Entity",
                    value: entity1.mainPhone,
                  },
                  {
                    entityId: entity2.meta?.id || entity2.id || "unknown",
                    entityName: entity2.name || "Unknown Entity",
                    value: entity2.mainPhone,
                  },
                ],
                conflictType: "phone_mismatch",
                severity: "medium",
                description: "Different entities sharing the same phone number",
              });
            }
          }

          // Check for website URL conflicts
          if (
            entity1.websiteUrl &&
            entity2.websiteUrl &&
            entity1.websiteUrl === entity2.websiteUrl &&
            entity1.name !== entity2.name
          ) {
            conflictDetails.push({
              field: "websiteUrl",
              values: [
                {
                  entityId: entity1.meta?.id || entity1.id || "unknown",
                  entityName: entity1.name || "Unknown Entity",
                  value: entity1.websiteUrl,
                },
                {
                  entityId: entity2.meta?.id || entity2.id || "unknown",
                  entityName: entity2.name || "Unknown Entity",
                  value: entity2.websiteUrl,
                },
              ],
              conflictType: "url_mismatch",
              severity: "medium",
              description: "Different entities sharing the same website URL",
            });
          }

          // Add conflict if any conflicts were found
          if (conflictDetails.length > 0) {
            const severity = conflictDetails.some((c) => c.severity === "high")
              ? "high"
              : conflictDetails.some((c) => c.severity === "medium")
              ? "medium"
              : "low";

            conflicts.push({
              id: `conflict-${entity1.name}-${entity2.name}`,
              title: `Potential conflict between "${entity1.name}" and "${entity2.name}"`,
              entities: [
                {
                  id: entity1.meta?.id || entity1.id || "unknown",
                  name: entity1.name || "Unknown Entity",
                  type: entity1.meta?.entityType,
                },
                {
                  id: entity2.meta?.id || entity2.id || "unknown",
                  name: entity2.name || "Unknown Entity",
                  type: entity2.meta?.entityType,
                },
              ],
              conflictDetails,
              severity,
            });
          }
        }
      }
    }
  }

  console.log(
    `[v0] Conflict detection completed. Found ${conflicts.length} conflicts.`
  );
  return conflicts;
}

// Generate summary statistics for conflicts
export function getConflictSummary(conflicts: ConflictGroup[]) {
  const totalConflicts = conflicts.length;
  const highSeverity = conflicts.filter((c) => c.severity === "high").length;
  const mediumSeverity = conflicts.filter(
    (c) => c.severity === "medium"
  ).length;
  const lowSeverity = conflicts.filter((c) => c.severity === "low").length;

  const affectedEntities = new Set();
  conflicts.forEach((conflict) => {
    conflict.entities.forEach((entity: { id: string | undefined }) => {
      if (entity.id) {
        affectedEntities.add(entity.id);
      }
    });
  });

  return {
    totalConflicts,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    affectedEntities: affectedEntities.size,
  };
}
