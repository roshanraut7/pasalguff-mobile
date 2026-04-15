import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { Provider } from "react-redux";
import { store } from "@/store";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
        <HeroUINativeProvider>
          <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
            <Stack initialRouteName="(auth)" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="modal" options={{ presentation: "modal" }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </Provider>
    </SafeAreaProvider>
  );
}