"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, User } from "lucide-react";
import Image from "next/image";
import type { VaultMetadata, Allocator } from "@/lib/morpho/useVaultDetail";

interface CuratorCardProps {
  metadata?: VaultMetadata;
  allocators?: Allocator[];
}

export function CuratorCard({ metadata }: CuratorCardProps) {
  if (!metadata?.curators || metadata.curators.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Vault Curator{metadata.curators.length > 1 ? "s" : ""}
        </CardTitle>
        <CardDescription>
          Managed by {metadata.curators.length > 1 ? "these curators" : "this curator"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metadata.curators.map((curator, index) => (
          <div
            key={index}
            className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          >
            {/* Curator Image */}
            {curator.image ? (
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                <Image
                  src={curator.image}
                  alt={curator.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-white" />
              </div>
            )}

            {/* Curator Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {curator.name}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  Curator
                </Badge>
              </div>
              
              {curator.url && (
                <a
                  href={curator.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Visit profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Additional Info */}
        {metadata.forumLink && (
          <div className="pt-3 border-t">
            <a
              href={metadata.forumLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              Discuss on Forum
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

