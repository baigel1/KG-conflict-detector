import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { businessId, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    console.log(
      `[v0] Fetching all entities for account ${businessId} with pagination`
    );

    try {
      let allEntities: any[] = [];
      let page = 1;
      let hasMorePages = true;
      const limit = 50; // Maximum entities per page (API limit)

      while (hasMorePages) {
        // Try different pagination approaches
        const url = `https://api.yextapis.com/v2/accounts/${businessId}/entities?api_key=${encodeURIComponent(
          apiKey
        )}&v=20240101&limit=${limit}&offset=${(page - 1) * limit}`;

        console.log(
          `[v0] Fetching page ${page} (offset: ${(page - 1) * limit})...`
        );

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`[v0] API request failed:`, response.status, errorText);

          if (response.status === 401) {
            return NextResponse.json(
              {
                error:
                  "Invalid API key. Please ensure you're using a valid API key from the API Credentials tab with 'Entities (Management API)' permissions.",
                details: errorText,
              },
              { status: 401 }
            );
          }

          if (response.status === 403) {
            return NextResponse.json(
              {
                error:
                  "Access forbidden. Please ensure your API key has 'Entities (Management API)' permissions.",
                details: errorText,
              },
              { status: 403 }
            );
          }

          if (response.status === 404) {
            return NextResponse.json(
              {
                error:
                  "Account not found. Please verify the business ID is correct.",
                details: errorText,
              },
              { status: 404 }
            );
          }

          return NextResponse.json(
            {
              error: `API request failed with status ${response.status}`,
              details: errorText,
            },
            { status: response.status }
          );
        }

        const data = await response.json();
        const entities = data.response?.entities || [];
        const totalCount = data.response?.count || 0;

        console.log(
          `[v0] Page ${page}: ${entities.length} entities (Total: ${totalCount})`
        );

        // Debug: Log first and last entity IDs on each page
        if (entities.length > 0) {
          const firstId = entities[0].meta?.id || entities[0].id;
          const lastId =
            entities[entities.length - 1].meta?.id ||
            entities[entities.length - 1].id;
          console.log(`[v0] Page ${page} entity IDs: ${firstId} ... ${lastId}`);
        }

        allEntities = allEntities.concat(entities);

        // Check if we have more pages
        hasMorePages =
          entities.length === limit && allEntities.length < totalCount;
        page++;

        // Safety check to prevent infinite loops (with 50 per page, 200 pages = 10,000 entities max)
        if (page > 200) {
          console.log(`[v0] Safety limit reached at page ${page}`);
          break;
        }
      }

      console.log(
        `[v0] Successfully fetched all ${allEntities.length} entities across ${
          page - 1
        } pages`
      );

      // Debug: Check for duplicate entity IDs
      const entityIds = allEntities.map((e) => e.meta?.id || e.id);
      const uniqueIds = new Set(entityIds);
      const duplicateCount = entityIds.length - uniqueIds.size;

      console.log(`[v0] Total entity IDs: ${entityIds.length}`);
      console.log(`[v0] Unique entity IDs: ${uniqueIds.size}`);
      console.log(`[v0] Duplicate entities: ${duplicateCount}`);

      if (duplicateCount > 0) {
        // Find which IDs are duplicated
        const idCounts = entityIds.reduce((acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const duplicatedIds = Object.entries(idCounts)
          .filter(([id, count]) => (count as number) > 1)
          .slice(0, 5); // Show first 5 duplicates

        console.log("[v0] Sample duplicated entity IDs:", duplicatedIds);

        // Remove duplicates by keeping only the first occurrence of each ID
        const seenIds = new Set();
        const deduplicatedEntities = allEntities.filter((entity) => {
          const id = entity.meta?.id || entity.id;
          if (seenIds.has(id)) {
            return false;
          }
          seenIds.add(id);
          return true;
        });

        console.log(
          `[v0] After deduplication: ${deduplicatedEntities.length} entities`
        );
        allEntities = deduplicatedEntities;
      }

      // Debug: Log entity types and sample FAQ entities
      const entityTypes = allEntities.reduce((acc, entity) => {
        const entityType = entity.meta?.entityType || "unknown";
        acc[entityType] = (acc[entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log("[v0] Entity types found:", entityTypes);

      // Debug: Check what fields are actually available
      if (allEntities.length > 0) {
        console.log("[v0] Sample entity structure:", {
          id: allEntities[0].id,
          name: allEntities[0].name,
          availableFields: Object.keys(allEntities[0]).slice(0, 20), // First 20 fields
          entityType: allEntities[0].entityType,
          type: allEntities[0].type,
          entityTypeId: allEntities[0].entityTypeId,
          meta: allEntities[0].meta,
        });
      }

      // Debug: Check multiple entity samples to see different types
      const uniqueEntityTypes = new Set();
      const entitySamples = [];

      for (let i = 0; i < Math.min(allEntities.length, 100); i++) {
        const entity = allEntities[i];
        const entityType = entity.meta?.entityType;
        if (entityType && !uniqueEntityTypes.has(entityType)) {
          uniqueEntityTypes.add(entityType);
          entitySamples.push({
            index: i,
            id: entity.id,
            name: entity.name,
            entityType: entityType,
            meta: entity.meta,
          });
        }
      }

      console.log(
        "[v0] Found unique entity types:",
        Array.from(uniqueEntityTypes)
      );
      console.log("[v0] Sample entities by type:", entitySamples.slice(0, 10));

      // Debug: Check for entities without meta field or with different structures
      const entitiesWithoutMeta = allEntities.filter((e) => !e.meta);
      const entitiesWithDifferentMeta = allEntities.filter(
        (e) => e.meta && !e.meta.entityType
      );

      console.log(
        `[v0] Entities without meta field: ${entitiesWithoutMeta.length}`
      );
      console.log(
        `[v0] Entities with meta but no entityType: ${entitiesWithDifferentMeta.length}`
      );

      if (entitiesWithoutMeta.length > 0) {
        console.log("[v0] Sample entity without meta:", {
          id: entitiesWithoutMeta[0].id,
          name: entitiesWithoutMeta[0].name,
          availableFields: Object.keys(entitiesWithoutMeta[0]).slice(0, 10),
        });
      }

      if (entitiesWithDifferentMeta.length > 0) {
        console.log("[v0] Sample entity with different meta structure:", {
          id: entitiesWithDifferentMeta[0].id,
          name: entitiesWithDifferentMeta[0].name,
          meta: entitiesWithDifferentMeta[0].meta,
        });
      }

      const faqEntities = allEntities.filter(
        (e) => e.meta?.entityType === "faq"
      );
      console.log(`[v0] Found ${faqEntities.length} FAQ entities`);

      if (faqEntities.length > 0) {
        console.log(
          "[v0] Sample FAQ entities:",
          faqEntities.slice(0, 3).map((e) => ({
            id: e.id,
            name: e.name,
            answer: e.answer || e.description || "No answer field",
            entityType: e.entityType,
          }))
        );
      }

      return NextResponse.json({
        success: true,
        entities: allEntities,
        count: allEntities.length,
        pagesFetched: page - 1,
      });
    } catch (fetchError) {
      console.log(`[v0] Network error:`, fetchError);
      return NextResponse.json(
        {
          error: "Network error occurred while connecting to Yext API",
          details:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[v0] API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
