import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  RichText,
  Toolbar,
  useBridgeState,
  useEditorBridge,
  useEditorContent,
} from "@10play/tentap-editor";

import { useAppTheme } from "@/hooks/useAppTheme";

type AppRichTextEditorProps = {
  editor: ReturnType<typeof useEditorBridge>;
  onChangeHtml?: (html: string) => void;
  label?: string;
  helperText?: string;
  placeholder?: string;
  editorHeight?: number;
  showToolbar?: boolean;
};

function HtmlWatcher({
  editor,
  onChangeHtml,
}: {
  editor: ReturnType<typeof useEditorBridge>;
  onChangeHtml?: (html: string) => void;
}) {
  const html = useEditorContent(editor, {
    type: "html",
    debounceInterval: 180,
  }) as string | undefined;

  useEffect(() => {
    if (typeof html === "string") {
      onChangeHtml?.(html);
    }
  }, [html, onChangeHtml]);

  return null;
}

export function AppRichTextEditor({
  editor,
  onChangeHtml,
  label = "Post content",
  helperText,
  editorHeight = 240,
  showToolbar = false,
}: AppRichTextEditorProps) {
  const { colors } = useAppTheme();

  const palette = {
    card: colors.surface,
    surface: colors.surfaceSecondary,
    text: colors.foreground,
    muted: colors.muted,
    border: colors.border,
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.header}>
        {!!label && (
          <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        )}

        {!!helperText && (
          <Text style={[styles.helper, { color: palette.muted }]}>
            {helperText}
          </Text>
        )}
      </View>

      {showToolbar && (
        <View
          style={[
            styles.toolbarWrap,
            {
              borderTopColor: palette.border,
              borderBottomColor: palette.border,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <Toolbar editor={editor} />
        </View>
      )}

      <View
        style={[
          styles.editorArea,
          {
            height: editorHeight,
            backgroundColor: palette.card,
          },
        ]}
      >
        <RichText editor={editor} />
      </View>

      <HtmlWatcher editor={editor} onChangeHtml={onChangeHtml} />
    </View>
  );
}

export function AppRichTextToolbar({
  editor,
}: {
  editor: ReturnType<typeof useEditorBridge> | null;
}) {
  const { colors } = useAppTheme();

  const palette = {
    surface: colors.surfaceSecondary,
    border: colors.border,
  };

  if (!editor) return null;

  return (
    <View
      style={[
        styles.toolbarStandalone,
        {
          borderColor: palette.border,
          backgroundColor: palette.surface,
        },
      ]}
    >
      <Toolbar editor={editor} />
    </View>
  );
}

export function useCreateEditor() {
  const { colors } = useAppTheme();

  const palette = useMemo(
    () => ({
      card: colors.surface,
      surface: colors.surfaceSecondary,
      border: colors.border,
      text: colors.foreground,
      muted: colors.muted,
      link: colors.link,
    }),
    [colors]
  );

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    dynamicHeight: false,
    editable: true,
    initialContent: "<p></p>",
    theme: {
      webview: {
        backgroundColor: palette.card,
      },
      webviewContainer: {
        backgroundColor: palette.card,
      },
      toolbar: {
        toolbarBody: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderBottomColor: palette.border,
        },
      },
    },
  });

  const bridgeState = useBridgeState(editor);
  const isEditorReady = bridgeState?.isReady ?? false;

  const injectedCss = useMemo(
    () => `
      html, body {
        background: ${palette.card} !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .ProseMirror {
        background: ${palette.card} !important;
        color: ${palette.text} !important;
        caret-color: ${palette.text} !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: 100% !important;
      }

      .ProseMirror,
      .ProseMirror p,
      .ProseMirror li,
      .ProseMirror div,
      .ProseMirror span,
      .ProseMirror strong,
      .ProseMirror em,
      .ProseMirror u,
      .ProseMirror blockquote,
      .ProseMirror h1,
      .ProseMirror h2,
      .ProseMirror h3,
      .ProseMirror h4,
      .ProseMirror h5,
      .ProseMirror h6 {
        color: ${palette.text} !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      .ProseMirror a {
        color: ${palette.link} !important;
      }

      .ProseMirror p.is-editor-empty:first-child::before,
      .ProseMirror .is-empty::before {
        color: ${palette.muted} !important;
      }
    `,
    [palette.card, palette.text, palette.muted, palette.link]
  );

  useEffect(() => {
    if (!isEditorReady) return;
    editor.injectCSS(injectedCss, "app-rich-text-theme");
  }, [editor, injectedCss, isEditorReady]);

  return editor;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  label: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
  },
  helper: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  toolbarWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  editorArea: {
    width: "100%",
    minHeight: 0,
    overflow: "hidden",
  },
  toolbarStandalone: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
});