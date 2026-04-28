import { Ionicons } from "@expo/vector-icons";

export type AdminKpiItem = {
  id: string;
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const adminKpiData: AdminKpiItem[] = [
  {
    id: "community",
    title: "Communities",
    value: "128",
    icon: "people-outline",
  },
  {
    id: "post",
    title: "Posts",
    value: "2,840",
    icon: "document-text-outline",
  },
  {
    id: "user",
    title: "Users",
    value: "1,245",
    icon: "person-outline",
  },
  {
    id: "category",
    title: "Categories",
    value: "24",
    icon: "grid-outline",
  },
];

export const communityGrowthData = [
  { value: 12, label: "Jan" },
  { value: 18, label: "Feb" },
  { value: 24, label: "Mar" },
  { value: 31, label: "Apr" },
  { value: 40, label: "May" },
  { value: 52, label: "Jun" },
];

export const userGrowthData = [
  { value: 40, label: "Jan" },
  { value: 56, label: "Feb" },
  { value: 74, label: "Mar" },
  { value: 92, label: "Apr" },
  { value: 118, label: "May" },
  { value: 146, label: "Jun" },
];