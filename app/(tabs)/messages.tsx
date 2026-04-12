import { View, Text } from "react-native";

export default function MessagesScreen() {
    return (
        <View className="flex-1 items-center justify-center bg-background">
            <Text className="text-foreground text-xl font-semibold">Messages</Text>
        </View>
    );
}