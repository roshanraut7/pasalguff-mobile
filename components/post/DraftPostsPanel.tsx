import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, Card } from "heroui-native";
import type { CommunityPost } from "@/store/api/postApi";
import { stripHtml } from "@/schema/post.schema";

type DraftPostsPanelProps = {
  drafts: CommunityPost[];
  activeDraftId?: string | null;
  isLoading?: boolean;
  onOpenDraft: (draft: CommunityPost) => void;
  onDeleteDraft: (draft: CommunityPost) => void;
};

export function DraftPostsPanel({
  drafts,
  activeDraftId,
  isLoading,
  onOpenDraft,
  onDeleteDraft,
}: DraftPostsPanelProps) {
  if (isLoading) {
    return (
      <Card className="border border-border bg-surface">
        <Card.Body className="p-4">
          <Text className="text-muted">Loading drafts...</Text>
        </Card.Body>
      </Card>
    );
  }

  if (!drafts.length) {
    return (
      <Card className="border border-border bg-surface">
        <Card.Body className="p-4">
          <Text className="text-foreground font-semibold">No drafts yet</Text>
          <Text className="text-muted mt-1">
            Save a draft from the composer and it will appear here.
          </Text>
        </Card.Body>
      </Card>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
    >
      {drafts.map((draft) => {
        const preview = stripHtml(draft.content).slice(0, 140);

        return (
          <Card
            key={draft.id}
            className={`border ${
              activeDraftId === draft.id ? "border-accent" : "border-border"
            } bg-surface`}
          >
            <Card.Body className="p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-foreground font-semibold">
                  {draft.community.name}
                </Text>
                <Text className="text-muted text-xs">{draft.tag}</Text>
              </View>

              <Text className="text-muted text-sm mt-2" numberOfLines={3}>
                {preview || "Empty draft"}
              </Text>

              <View className="flex-row gap-3 mt-4">
                <Button onPress={() => onOpenDraft(draft)} className="flex-1">
                  Open draft
                </Button>
                <Button
                  variant="danger"
                  onPress={() => onDeleteDraft(draft)}
                  className="flex-1"
                >
                  Delete
                </Button>
              </View>
            </Card.Body>
          </Card>
        );
      })}
    </ScrollView>
  );
}