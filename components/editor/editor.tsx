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
  plain?:boolean
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
  editorHeight = 260,
  showToolbar = false,
  plain= false
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
      borderColor: plain ? "transparent" : palette.border,
      borderWidth: plain ? 0 : 1,
      borderRadius: plain ? 0 : 24,
        },
      ]}
    >
      {!!label || !!helperText ? (
        <View
          style={[
            styles.header,
            {
              borderBottomColor: palette.border,
              backgroundColor: palette.card,
            },
          ]}
        >
          {!!label ? (
            <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
          ) : null}

          {!!helperText ? (
            <Text style={[styles.helper, { color: palette.muted }]}>
              {helperText}
            </Text>
          ) : null}
        </View>
      ) : null}

      {showToolbar ? (
        <View
          style={[
            styles.toolbarWrap,
            {
              borderBottomColor: palette.border,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <Toolbar editor={editor} />
        </View>
      ) : null}

      <View
        style={[
          styles.editorArea,
          {
            minHeight: editorHeight,
            backgroundColor: palette.card,
          },
        ]}
      >
        <RichText
          editor={editor}
          style={[
            styles.richText,
            {
              minHeight: editorHeight,
            },
          ]}
        />
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
    [colors],
  );

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,

    /**
     * IMPORTANT:
     * Keep this true.
     * This allows the editor to grow when long text is pasted.
     * Then the parent ScrollView in CreatePostScreen will scroll normally.
     */
    dynamicHeight: true,

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
      html,
      body {
        background: ${palette.card} !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 100% !important;

        /*
          IMPORTANT:
          Do not make the WebView internally scroll.
          The editor should grow, and React Native ScrollView should scroll the page.
        */
        overflow-y: hidden !important;
      }

      body {
        min-height: 100% !important;
      }

      .ProseMirror {
        background: ${palette.card} !important;
        color: ${palette.text} !important;
        caret-color: ${palette.text} !important;
        padding: 0 !important;
        margin: 0 !important;

        /*
          IMPORTANT:
          Do not use 100vh here.
          100vh traps long content inside the editor WebView on Android.
          260px gives an empty editor enough clickable height.
        */
        min-height: 260px !important;

        outline: none !important;
        overflow: visible !important;
        box-sizing: border-box !important;
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

      .ProseMirror p {
        margin-top: 0 !important;
        margin-bottom: 8px !important;
      }

      .ProseMirror a {
        color: ${palette.link} !important;
      }

      .ProseMirror p.is-editor-empty:first-child::before,
      .ProseMirror .is-empty::before {
        color: ${palette.muted} !important;
      }
    `,
    [palette.card, palette.text, palette.muted, palette.link],
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  label: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
  },

  helper: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },

  toolbarWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },

  editorArea: {
    width: "100%",
    padding: 0,

    /**
     * IMPORTANT:
     * visible allows the dynamic editor height to expand inside the page ScrollView.
     */
    overflow: "visible",
  },

  richText: {
    width: "100%",
  },

  toolbarStandalone: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
});