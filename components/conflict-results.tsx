"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Phone,
  MapPin,
  Globe,
  Users,
  FileText,
} from "lucide-react";
import type { ConflictGroup, ConflictDetail } from "@/lib/conflict-detector";

interface ConflictResultsProps {
  conflicts: ConflictGroup[];
  totalEntities: number;
}

function getSeverityColor(severity: "high" | "medium" | "low") {
  switch (severity) {
    case "high":
      return "bg-destructive text-destructive-foreground";
    case "medium":
      return "bg-warning text-warning-foreground";
    case "low":
      return "bg-secondary text-secondary-foreground";
  }
}

function getSeverityIcon(severity: "high" | "medium" | "low") {
  return <AlertTriangle className="w-4 h-4" />;
}

function getConflictTypeLabel(type: ConflictDetail["conflictType"]) {
  switch (type) {
    case "duplicate_name":
      return "Duplicate Names";
    case "similar_address":
      return "Similar Addresses";
    case "phone_mismatch":
      return "Phone Conflicts";
    case "inconsistent_data":
      return "Data Inconsistency";
    case "faq_answer_conflict":
      return "FAQ Answer Conflicts";
  }
}

function getFieldIcon(field: string) {
  switch (field) {
    case "mainPhone":
      return <Phone className="w-4 h-4" />;
    case "address":
      return <MapPin className="w-4 h-4" />;
    case "websiteUrl":
      return <Globe className="w-4 h-4" />;
    case "name":
      return <Users className="w-4 h-4" />;
    case "answer":
      return <FileText className="w-4 h-4" />;
    case "content":
      return <FileText className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

function ConflictDetailCard({ conflict }: { conflict: ConflictDetail }) {
  const [copied, setCopied] = useState(false);

  const copyEntityIds = () => {
    const ids = conflict.values.map((v) => v.entityId).join(", ");
    navigator.clipboard.writeText(ids);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {getFieldIcon(conflict.field)}
          <div>
            <h4 className="font-medium">
              {getConflictTypeLabel(conflict.conflictType)}
            </h4>
            <p className="text-sm text-muted-foreground">
              {conflict.description}
            </p>
          </div>
        </div>
        <Badge className={getSeverityColor(conflict.severity)}>
          {conflict.severity.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h5 className="text-sm font-medium">Conflicting Values:</h5>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyEntityIds}
            className="text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />
            {copied ? "Copied!" : "Copy IDs"}
          </Button>
        </div>

        <div className="grid gap-2">
          {conflict.values.map((value, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-muted rounded"
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{value.entityName}</div>
                <div className="text-xs text-muted-foreground">
                  ID: {value.entityId}
                </div>
              </div>
              <div className="text-sm font-mono bg-background px-2 py-1 rounded border">
                {typeof value.value === "string"
                  ? value.value
                  : JSON.stringify(value.value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConflictGroupCard({
  conflictGroup,
}: {
  conflictGroup: ConflictGroup;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getSeverityIcon(conflictGroup.severity)}
                <div>
                  <CardTitle className="text-lg">
                    {conflictGroup.title}
                  </CardTitle>
                  <CardDescription>
                    {conflictGroup.conflictDetails.length} conflict
                    {conflictGroup.conflictDetails.length !== 1 ? "s" : ""}{" "}
                    detected
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getSeverityColor(conflictGroup.severity)}>
                  {conflictGroup.severity.toUpperCase()}
                </Badge>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Entity Information */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Affected Entities
              </h4>
              <div className="grid gap-2">
                {conflictGroup.entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div>
                      <div className="font-medium">{entity.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {entity.entityType} • ID: {entity.id}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View in Yext
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Conflict Details */}
            <div>
              <h4 className="font-medium mb-3">Conflict Details</h4>
              <div className="space-y-3">
                {conflictGroup.conflictDetails.map((conflict, index) => (
                  <ConflictDetailCard key={index} conflict={conflict} />
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Recommended Actions:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {conflictGroup.severity === "high" && (
                      <>
                        <li>
                          Review these entities immediately as they may
                          represent duplicate or conflicting data
                        </li>
                        <li>
                          Consider merging duplicate entities or updating
                          conflicting information
                        </li>
                      </>
                    )}
                    {conflictGroup.severity === "medium" && (
                      <>
                        <li>
                          Verify if these entities should share the same data or
                          if they represent different locations
                        </li>
                        <li>Update entity information to ensure consistency</li>
                      </>
                    )}
                    {conflictGroup.severity === "low" && (
                      <li>Review when convenient to ensure data accuracy</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function ConflictResults({
  conflicts,
  totalEntities,
}: ConflictResultsProps) {
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">(
    "all"
  );

  const filteredConflicts = conflicts.filter(
    (conflict) => filter === "all" || conflict.severity === filter
  );

  const conflictCounts = {
    high: conflicts.filter((c) => c.severity === "high").length,
    medium: conflicts.filter((c) => c.severity === "medium").length,
    low: conflicts.filter((c) => c.severity === "low").length,
  };

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-green-600 text-2xl font-bold mb-2">
            ✓ No conflicts detected
          </div>
          <p className="text-muted-foreground text-lg mb-4">
            Your knowledge graph appears to have consistent data across all{" "}
            {totalEntities} entities.
          </p>
          <p className="text-sm text-muted-foreground">
            This analysis checked for duplicate names, conflicting contact
            information, similar addresses, and inconsistent data across your
            entities.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Conflicts</CardTitle>
          <CardDescription>
            Showing {filteredConflicts.length} of {conflicts.length} conflicts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All ({conflicts.length})
            </Button>
            <Button
              variant={filter === "high" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("high")}
              className={
                filter === "high"
                  ? ""
                  : "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              }
            >
              High Priority ({conflictCounts.high})
            </Button>
            <Button
              variant={filter === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("medium")}
              className={
                filter === "medium"
                  ? ""
                  : "border-warning text-warning hover:bg-warning hover:text-warning-foreground"
              }
            >
              Medium Priority ({conflictCounts.medium})
            </Button>
            <Button
              variant={filter === "low" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("low")}
            >
              Low Priority ({conflictCounts.low})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Conflict List */}
      <div className="space-y-4">
        {filteredConflicts.map((conflictGroup) => (
          <ConflictGroupCard
            key={conflictGroup.id}
            conflictGroup={conflictGroup}
          />
        ))}
      </div>

      {filteredConflicts.length === 0 && filter !== "all" && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              No {filter} priority conflicts found.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
