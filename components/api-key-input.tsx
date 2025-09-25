"use client";

import type React from "react";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Key, ExternalLink } from "lucide-react";

interface ApiKeyInputProps {
  onApiKeySubmit: (apiKey: string) => void;
  isLoading: boolean;
}

export function ApiKeyInput({ onApiKeySubmit, isLoading }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onApiKeySubmit(apiKey.trim());
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          API Authentication Required
        </CardTitle>
        <CardDescription>
          Enter your Yext API Key to access entity data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Yext API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder="Enter your Yext API Key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  You need an API Key from the API Credentials tab:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                  <li>Log in to your Yext account</li>
                  <li>Go to Developer → Developer Console</li>
                  <li>Create or select an existing app</li>
                  <li>Go to the "API Credentials" tab</li>
                  <li>
                    Copy the API Key (not the Client Secret from OAuth tab)
                  </li>
                  <li>Ensure it has "Entities (Management API)" permissions</li>
                  <li>
                    The API key should be a long string starting with
                    letters/numbers
                  </li>
                  <li>
                    Make sure you're using the correct Business ID from your
                    knowledge graph URL
                  </li>
                </ol>
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                  <p className="font-medium text-blue-800">Important:</p>
                  <p className="text-blue-700">
                    Use the API Key from the "API Credentials" tab, not the
                    Client Secret from the "OAuth" tab. The API Key is for
                    server-to-server authentication.
                  </p>
                </div>
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <p className="font-medium text-green-800">Note:</p>
                  <p className="text-green-700">
                    This will fetch ALL entities from your knowledge graph (50
                    entities per page, may take a moment for large datasets).
                  </p>
                </div>
                <a
                  href="https://www.yext.com/s/me/developer/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                >
                  Developer Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </AlertDescription>
          </Alert>

          <Button
            type="submit"
            disabled={!apiKey.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                Fetching All Entities...
              </>
            ) : (
              "Continue with API Key"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
