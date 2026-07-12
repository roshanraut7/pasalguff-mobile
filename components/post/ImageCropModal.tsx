import React, { useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_W } = Dimensions.get("window");

export type CropAspect = "square" | "wide";

type Props = {
  visible: boolean;
  imageUri: string | null;
  imageWidth: number;
  imageHeight: number;
  aspect?: CropAspect;
  onCancel: () => void;
  onConfirm: (uri: string) => void;
};

export default function ImageCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  aspect = "square",
  onCancel,
  onConfirm,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);

  const cropW = SCREEN_W * 0.85;
  const cropH = aspect === "square" ? cropW : cropW * 0.45;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  // The Image is rendered with resizeMode="cover" at exactly cropW x cropH,
  // meaning at scale=1 it already fills the crop box like Instagram's editor.
  // Zooming/panning happens on top of that base "cover" fit.
  const handleConfirm = async () => {
    if (!imageUri || imageWidth === 0 || imageHeight === 0) return;
    setIsProcessing(true);

    try {
      const baseScale = Math.max(cropW / imageWidth, cropH / imageHeight);
      const totalScale = baseScale * scale.value;

      const displayedW = imageWidth * totalScale;
      const displayedH = imageHeight * totalScale;

      const imgLeft = (cropW - displayedW) / 2 + translateX.value;
      const imgTop = (cropH - displayedH) / 2 + translateY.value;

      const originX = Math.max(0, -imgLeft / totalScale);
      const originY = Math.max(0, -imgTop / totalScale);
      const cropWidthOrig = Math.min(imageWidth - originX, cropW / totalScale);
      const cropHeightOrig = Math.min(imageHeight - originY, cropH / totalScale);

      const context = ImageManipulator.ImageManipulator.manipulate(imageUri);
      context.crop({
        originX,
        originY,
        width: cropWidthOrig,
        height: cropHeightOrig,
      });
      context.resize(
        aspect === "square" ? { width: 512, height: 512 } : { width: 1200 },
      );

      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      reset();
      onConfirm(result.uri);
    } catch (error) {
      console.log("Crop failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!imageUri) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={handleCancel} hitSlop={12}>
            <Text style={styles.headerAction}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Move and Scale</Text>
          <Pressable onPress={handleConfirm} disabled={isProcessing} hitSlop={12}>
            <Text style={[styles.headerAction, isProcessing && styles.headerActionDisabled]}>
              {isProcessing ? "..." : "Done"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.cropArea}>
          <View
            style={[
              styles.cropBox,
              {
                width: cropW,
                height: cropH,
                borderRadius: aspect === "square" ? cropW / 2 : 12,
              },
            ]}
          >
            <GestureDetector gesture={composed}>
              <Animated.Image
                source={{ uri: imageUri }}
                style={[{ width: cropW, height: cropH }, animatedStyle]}
                resizeMode="cover"
              />
            </GestureDetector>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="resize-outline" size={16} color="#aaa" />
          <Text style={styles.footerHint}>Pinch to zoom, drag to reposition</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  headerAction: { color: "#4da3ff", fontSize: 16, fontWeight: "600" },
  headerActionDisabled: { opacity: 0.5 },
  cropArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  cropBox: { overflow: "hidden", backgroundColor: "#111" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 24,
  },
  footerHint: { color: "#aaa", fontSize: 13 },
});