import { lightColors, AppColorName } from "@/constants/theme";

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: AppColorName,
) {
  const colorFromProps = props.light;

  if (colorFromProps) {
    return colorFromProps;
  }

  return lightColors[colorName];
}