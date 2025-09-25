import { YextEntity, ConflictGroup, ConflictDetail } from "@/lib/types";

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
  const faqEntities = entities.filter((e) => e.meta?.entityType === "faq");
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
    (e) => e.meta?.entityType !== "faq" && e.meta?.entityType !== "location"
  );

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

          if (nameSimilarity > 0.9) {
            // Check for conflicting content in description or other fields
            const content1 = entity1.description || entity1.content || "";
            const content2 = entity2.description || entity2.content || "";

            if (
              content1 &&
              content2 &&
              normalizeString(content1) !== normalizeString(content2)
            ) {
              conflictDetails.push({
                field: "content",
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
                conflictType: "inconsistent_data",
                severity: "medium",
                description: `${entityType} entities with similar names (${Math.round(
                  nameSimilarity * 100
                )}% similar) have different content`,
              });
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
