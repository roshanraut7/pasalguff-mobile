import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import {
  RichText,
  Toolbar,
  useBridgeState,
  useEditorBridge,
  useEditorContent,
} from "@10play/tentap-editor";
import { COLORS } from "@/constants/colors";

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
  placeholder = "",
  editorHeight = 240,
  showToolbar = false,
}: AppRichTextEditorProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const palette = {
    card: isDark ? "#0b3f20" : COLORS.card,
    surface: isDark ? "#14532d" : "#f8fffa",
    text: isDark ? "#f0fdf4" : COLORS.text,
    muted: isDark ? "#a7f3d0" : COLORS.muted,
    border: isDark ? "#166534" : COLORS.border,
  };

  const bridgeState = useBridgeState(editor);
  const isReady = bridgeState?.isReady ?? false;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      {!!label && (
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      )}

      {!!helperText && (
        <Text style={[styles.helper, { color: palette.muted }]}>
          {helperText}
        </Text>
      )}

      {showToolbar && (
        <View
          style={[
            styles.toolbarWrap,
            { borderColor: palette.border, backgroundColor: palette.surface },
          ]}
        >
          <Toolbar editor={editor} />
        </View>
      )}

      <View style={{ height: editorHeight, marginTop: 12 }}>
        <RichText editor={editor} />
        {!isReady && !!placeholder && (
          <View style={styles.overlay} pointerEvents="none">
            <Text style={[styles.placeholderHint, { color: palette.muted }]}>
              {/* {placeholder} */}
            </Text>
          </View>
        )}
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
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const palette = {
    surface: isDark ? "#14532d" : "#f8fffa",
    border: isDark ? "#166534" : COLORS.border,
  };

  if (!editor) return null;

  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: palette.border,
        backgroundColor: palette.surface,
        borderRadius: 16,
        overflow: "hidden",
        marginTop: 8,
      }}
    >
      <Toolbar editor={editor} />
    </View>
  );
}

export function useCreateEditor(isDark: boolean) {
  const palette = {
    card: isDark ? "#0b3f20" : COLORS.card,
    surface: isDark ? "#14532d" : "#f8fffa",
    border: isDark ? "#166534" : COLORS.border,
  };

  return useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    dynamicHeight: false,
    editable: true,
    initialContent: "<p></p>",
    theme: {
      webview: { backgroundColor: palette.card },
      webviewContainer: { backgroundColor: palette.card },
      toolbar: {
        toolbarBody: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderBottomColor: palette.border,
        },
      },
    },
  });
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    overflow: "hidden",
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-start",
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  placeholderHint: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
  },
  toolbarWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
});