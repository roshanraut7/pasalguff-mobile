import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HeroUINativeConfig, HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Provider } from "react-redux";
import { store } from "@/store";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

// Separate component so useSafeAreaInsets works inside SafeAreaProvider
function AppContent() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const config: HeroUINativeConfig = {
    toast: {
      defaultProps: {
        placement: "top",
        variant: "default",
        isSwipeable: true,
        animation: true,
      },
      insets: {
        // Respect the real safe area top (status bar height)
        top: insets.top,
        bottom: 12,
        left: 12,
        right: 12,
      },
      contentWrapper: (children) => (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
          style={{ flex: 1 }}
        >
          {children}
        </KeyboardAvoidingView>
      ),
    },
  };

  return (
    <HeroUINativeProvider config={config}>
      <BottomSheetModalProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack initialRouteName="(auth)" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </BottomSheetModalProvider>
    </HeroUINativeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppContent />
        </GestureHandlerRootView>
      </Provider>
    </SafeAreaProvider>
  );
}