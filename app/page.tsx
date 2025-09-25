"use client";

import type React from "react";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Search,
  Database,
  ArrowLeft,
  Download,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiKeyInput } from "@/components/api-key-input";
import { ConflictResults } from "@/components/conflict-results";
import {
  detectConflicts,
  getConflictSummary,
  type YextEntity,
  type ConflictGroup,
} from "@/lib/conflict-detector";

export default function YextConflictDetector() {
  const [url, setUrl] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"url" | "api" | "results">("url");
  const [entities, setEntities] = useState<YextEntity[]>([]);
  const [conflicts, setConflicts] = useState<ConflictGroup[]>([]);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Please enter a valid Yext knowledge graph URL or business ID");
      return;
    }

    try {
      let extractedBusinessId: string;

      // Check if input is just a business ID (numeric)
      if (/^\d+$/.test(url.trim())) {
        extractedBusinessId = url.trim();
        console.log("[v0] Using business ID directly:", extractedBusinessId);
      } else {
        // Check if it's a valid Yext URL
        if (!url.includes("yext.com")) {
          throw new Error(
            "Please enter a valid Yext knowledge graph URL (should contain 'yext.com') or just the business ID (numbers only)"
          );
        }

        // Extract business ID from URL path pattern: /s/{businessId}/
        const businessIdMatch = url.match(/\/s\/(\d+)\//);
        if (!businessIdMatch) {
          throw new Error(
            "Could not extract business ID from URL. Please ensure the URL follows the pattern: https://www.yext.com/s/{businessId}/... or just enter the business ID directly"
          );
        }

        extractedBusinessId = businessIdMatch[1];
        console.log(
          "[v0] Extracted business ID from URL:",
          extractedBusinessId
        );
      }

      setBusinessId(extractedBusinessId);
      setStep("api");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process URL");
    }
  };

  const handleApiKeySubmit = async (apiKey: string) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/yext/entities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessId,
          apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch entities");
      }

      console.log("[v0] Fetched entities:", data.entities.length);
      setEntities(data.entities);

      console.log("[v0] Running conflict detection...");
      const detectedConflicts = detectConflicts(data.entities);
      console.log("[v0] Found conflicts:", detectedConflicts.length);
      setConflicts(detectedConflicts);

      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch entities");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "api") {
      setStep("url");
      setBusinessId("");
    } else if (step === "results") {
      setStep("api");
      setEntities([]);
      setConflicts([]);
    }
    setError("");
  };

  const handleExportReport = () => {
    if (!conflicts) return;

    const conflictSummary = getConflictSummary(conflicts);
    const report = {
      businessId,
      analysisDate: new Date().toISOString(),
      totalEntities: entities.length,
      summary: conflictSummary,
      conflicts: conflicts.map((conflict) => ({
        id: conflict.id,
        title: conflict.title,
        severity: conflict.severity,
        entities: conflict.entities,
        conflicts: conflict.conflictDetails.map((detail: any) => ({
          field: detail.field,
          conflictType: detail.conflictType,
          severity: detail.severity,
          description: detail.description,
          values: detail.values,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yext-conflict-report-${businessId}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const conflictSummary =
    conflicts && conflicts.length > 0 ? getConflictSummary(conflicts) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step !== "url" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="mr-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Yext Conflict Detector
                </h1>
                <p className="text-sm text-muted-foreground">
                  {step === "url" &&
                    "Identify data discrepancies in your knowledge graph"}
                  {step === "api" && `Business ID: ${businessId}`}
                  {step === "results" &&
                    `Analyzed ${entities.length} entities${
                      conflictSummary
                        ? ` - Found ${conflictSummary.totalConflicts} conflicts`
                        : " - No conflicts detected"
                    }`}
                </p>
              </div>
            </div>

            {step === "results" && (
              <Button onClick={handleExportReport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === "url" && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Introduction Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    Knowledge Graph Analysis
                  </CardTitle>
                  <CardDescription>
                    Enter your Yext knowledge graph URL to analyze entities for
                    conflicting data. We'll identify entities that may have
                    inconsistent information across your knowledge base.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* URL Input Form */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Enter Knowledge Graph URL or Business ID
                  </CardTitle>
                  <CardDescription>
                    Paste the URL from your Yext knowledge graph experiences
                    page, or just enter your business ID directly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUrlSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="url">
                        Yext Knowledge Graph URL or Business ID
                      </Label>
                      <Input
                        id="url"
                        type="text"
                        placeholder="https://www.yext.com/s/4042106 or just 4042106"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Examples:
                        https://www.yext.com/s/4042106/search2/experiences?b=4042106
                        or just 4042106
                      </p>
                    </div>

                    <Button type="submit" className="w-full">
                      <Search className="w-4 h-4 mr-2" />
                      Continue
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Instructions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>How it works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Extract Business ID</p>
                      <p className="text-sm text-muted-foreground">
                        We parse your URL to identify the business ID parameter,
                        or use the business ID directly if provided
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Fetch Entity Data</p>
                      <p className="text-sm text-muted-foreground">
                        Query the Yext Management API to retrieve all entities
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Detect Conflicts</p>
                      <p className="text-sm text-muted-foreground">
                        Analyze entities for conflicting data and highlight
                        discrepancies
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "api" && (
            <div className="max-w-2xl mx-auto">
              <ApiKeyInput
                onApiKeySubmit={handleApiKeySubmit}
                isLoading={isLoading}
              />
            </div>
          )}

          {step === "results" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Conflict Analysis Summary</CardTitle>
                  <CardDescription>
                    Analysis of {entities.length} entities from your knowledge
                    graph
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">
                        {conflictSummary?.totalConflicts || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Conflicts
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-destructive">
                        {conflictSummary?.highSeverity || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        High Priority
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-warning">
                        {conflictSummary?.mediumSeverity || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Medium Priority
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {conflictSummary?.affectedEntities || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Affected Entities
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ConflictResults
                conflicts={conflicts}
                totalEntities={entities.length}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
