import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: "fade",
                contentStyle: {
                    backgroundColor: "transparent"
                },
            }}
        >
            {/* Explicitly define your auth screens */}
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false
                }}
            />
        </Stack>
    );
}