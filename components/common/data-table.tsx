import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Menu, Searchbar } from "react-native-paper";

import { useAppTheme } from "@/hooks/useAppTheme";

export type SortDirection = "asc" | "desc";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  width: number;
  searchable?: boolean;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  getSearchValue?: (row: T) => string;
  getSortValue?: (row: T) => string | number | Date | null | undefined;
  render: (row: T) => React.ReactNode;
};

export type DataTableFilterOption = {
  label: string;
  value: string;
};

export type DataTableFilterConfig<T> = {
  key: string;
  label: string;
  defaultValue?: string;
  options: DataTableFilterOption[];
  predicate: (row: T, value: string) => boolean;
};

export type DataTablePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export type DataTableProps<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilterConfig<T>[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  sortBy?: string;
  sortDirection?: SortDirection;
  onSortChange?: (key: string) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  isLoading?: boolean;
  pagination?: DataTablePaginationProps;
};

type UseDataTableStateArgs<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  filters?: DataTableFilterConfig<T>[];
  initialSort?: {
    key: string;
    direction?: SortDirection;
  };
  initialPageSize?: number;
};

function getRowValue<T>(row: T, key: string) {
  const record = row as Record<string, unknown>;
  return record[key];
}

function normalizeSortValue(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value == null) return "";
  return String(value).toLowerCase();
}

function getAlignStyle(align: "left" | "center" | "right" = "left") {
  if (align === "center") {
    return {
      alignItems: "center" as const,
      justifyContent: "center" as const,
    };
  }

  if (align === "right") {
    return {
      alignItems: "flex-end" as const,
      justifyContent: "center" as const,
    };
  }

  return {
    alignItems: "flex-start" as const,
    justifyContent: "center" as const,
  };
}

export function useDataTableState<T>({
  data,
  columns,
  filters = [],
  initialSort,
  initialPageSize = 5,
}: UseDataTableStateArgs<T>) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | undefined>(initialSort?.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialSort?.direction ?? "asc"
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(() =>
    filters.reduce<Record<string, string>>((acc, filter) => {
      acc[filter.key] = filter.defaultValue ?? "ALL";
      return acc;
    }, {})
  );

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSortChange = (key: string) => {
    setSortBy((prevSortBy) => {
      if (prevSortBy === key) {
        setSortDirection((prevDirection) =>
          prevDirection === "asc" ? "desc" : "asc"
        );
        return prevSortBy;
      }

      setSortDirection("asc");
      return key;
    });
  };

  const processedRows = useMemo(() => {
    let processed = [...data];
    const trimmedSearch = search.trim().toLowerCase();

    if (trimmedSearch) {
      const searchableColumns = columns.filter((column) => column.searchable);

      processed = processed.filter((row) =>
        searchableColumns.some((column) => {
          const value = column.getSearchValue
            ? column.getSearchValue(row)
            : String(getRowValue(row, column.key) ?? "");

          return value.toLowerCase().includes(trimmedSearch);
        })
      );
    }

    if (filters.length) {
      processed = processed.filter((row) =>
        filters.every((filter) => {
          const activeValue =
            activeFilters[filter.key] ?? filter.defaultValue ?? "ALL";

          if (activeValue === "ALL") return true;
          return filter.predicate(row, activeValue);
        })
      );
    }

    if (sortBy) {
      const activeColumn = columns.find(
        (column) => column.key === sortBy && column.sortable
      );

      if (activeColumn) {
        processed.sort((a, b) => {
          const aValue = activeColumn.getSortValue
            ? activeColumn.getSortValue(a)
            : getRowValue(a, activeColumn.key);

          const bValue = activeColumn.getSortValue
            ? activeColumn.getSortValue(b)
            : getRowValue(b, activeColumn.key);

          const normalizedA = normalizeSortValue(aValue);
          const normalizedB = normalizeSortValue(bValue);

          if (normalizedA < normalizedB) {
            return sortDirection === "asc" ? -1 : 1;
          }

          if (normalizedA > normalizedB) {
            return sortDirection === "asc" ? 1 : -1;
          }

          return 0;
        });
      }
    }

    return processed;
  }, [activeFilters, columns, data, filters, search, sortBy, sortDirection]);

  const filteredCount = processedRows.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));

  useEffect(() => {
    setPage(0);
  }, [search, sortBy, sortDirection, activeFilters, pageSize]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(totalPages - 1);
    }
  }, [page, totalPages]);

  const rows = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return processedRows.slice(start, end);
  }, [page, pageSize, processedRows]);

  return {
    rows,
    search,
    setSearch,
    sortBy,
    sortDirection,
    handleSortChange,
    activeFilters,
    handleFilterChange,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount: data.length,
    filteredCount,
    totalPages,
  };
}

function FilterDropdown<T>({
  filter,
  value,
  onChange,
}: {
  filter: DataTableFilterConfig<T>;
  value: string;
  onChange?: (key: string, value: string) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);

  const selectedLabel =
    filter.options.find((option) => option.value === value)?.label ?? filter.label;

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Pressable
          onPress={() => setVisible(true)}
          style={[
            styles.filterSelectButton,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="filter-outline" size={16} color={colors.muted} />
          <Text style={[styles.filterSelectText, { color: colors.foreground }]}>
            {selectedLabel}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
      }
      contentStyle={{
        backgroundColor: colors.surface,
        borderRadius: 16,
      }}
    >
      {filter.options.map((option) => (
        <Menu.Item
          key={`${filter.key}-${option.value}`}
          onPress={() => {
            setVisible(false);
            onChange?.(filter.key, option.value);
          }}
          title={option.label}
        />
      ))}
    </Menu>
  );
}

function PageSizeDropdown({
  value,
  options,
  onChange,
}: {
  value: number;
  options: number[];
  onChange?: (pageSize: number) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Pressable
          onPress={() => setVisible(true)}
          style={[
            styles.pageSizeButton,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.pageSizeText, { color: colors.foreground }]}>
            {value}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
      }
      contentStyle={{
        backgroundColor: colors.surface,
        borderRadius: 16,
      }}
    >
      {options.map((option) => (
        <Menu.Item
          key={`page-size-${option}`}
          onPress={() => {
            setVisible(false);
            onChange?.(option);
          }}
          title={`${option}`}
        />
      ))}
    </Menu>
  );
}

export default function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
  filters = [],
  activeFilters = {},
  onFilterChange,
  sortBy,
  sortDirection,
  onSortChange,
  emptyTitle = "No data found",
  emptySubtitle = "Try another search or filter.",
  isLoading = false,
  pagination,
}: DataTableProps<T>) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const paginationLabel = useMemo(() => {
    if (!pagination || pagination.totalItems === 0) return "0-0 of 0";

    const from = pagination.page * pagination.pageSize + 1;
    const to = Math.min(
      (pagination.page + 1) * pagination.pageSize,
      pagination.totalItems
    );

    return `${from}-${to} of ${pagination.totalItems}`;
  }, [pagination]);

  return (
    <View style={styles.tableRoot}>
      <View
        style={[
          styles.controlsRow,
          {
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.searchWrap}>
         <Searchbar
  value={searchValue}
  onChangeText={onSearchChange}
  placeholder={searchPlaceholder}
  inputStyle={[
    styles.searchInput,
    {
      color: colors.foreground,
    },
  ]}
  style={[
    styles.searchbar,
    {
      backgroundColor: colors.surfaceSecondary,
      borderColor: colors.border,
    },
  ]}
  placeholderTextColor={colors.muted}
  iconColor={colors.muted}
  elevation={0}
/>
        </View>

        {filters.length ? (
          <View style={styles.filterRow}>
            {filters.map((filter) => {
              const currentValue =
                activeFilters[filter.key] ?? filter.defaultValue ?? "ALL";

              return (
                <FilterDropdown
                  key={filter.key}
                  filter={filter}
                  value={currentValue}
                  onChange={onFilterChange}
                />
              );
            })}
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View
            style={[
              styles.headerRow,
              {
                borderBottomColor: colors.border,
              },
            ]}
          >
            {columns.map((column) => {
              const isSorted = sortBy === column.key;

              return (
                <Pressable
                  key={column.key}
                  disabled={!column.sortable}
                  onPress={() => onSortChange?.(column.key)}
                  style={[
                    styles.headerCell,
                    { width: column.width },
                    getAlignStyle(column.align),
                  ]}
                >
                  <View style={styles.headerCellInner}>
                    <Text style={[styles.headerText, { color: colors.muted }]}>
                      {column.label}
                    </Text>

                    {column.sortable ? (
                      <Ionicons
                        name={
                          isSorted
                            ? sortDirection === "asc"
                              ? "chevron-up"
                              : "chevron-down"
                            : "swap-vertical"
                        }
                        size={14}
                        color={isSorted ? colors.accent : colors.muted}
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : rows.length ? (
            rows.map((row, index) => (
              <View
                key={rowKey(row)}
                style={[
                  styles.bodyRow,
                  {
                    borderBottomColor:
                      index === rows.length - 1 ? "transparent" : colors.border,
                  },
                ]}
              >
                {columns.map((column) => (
                  <View
                    key={`${rowKey(row)}-${column.key}`}
                    style={[
                      styles.bodyCell,
                      { width: column.width },
                      getAlignStyle(column.align),
                    ]}
                  >
                    {column.render(row)}
                  </View>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {emptyTitle}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                {emptySubtitle}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {pagination ? (
        <View
          style={[
            styles.paginationRow,
            {
              borderTopColor: colors.border,
            },
          ]}
        >
          <View style={styles.paginationLeft}>
            <Text style={[styles.paginationMetaText, { color: colors.muted }]}>
              Rows per page
            </Text>

            <PageSizeDropdown
              value={pagination.pageSize}
              options={pagination.pageSizeOptions ?? [5, 10, 20]}
              onChange={pagination.onPageSizeChange}
            />
          </View>

          <View style={styles.paginationRight}>
            <Text style={[styles.paginationMetaText, { color: colors.muted }]}>
              {paginationLabel}
            </Text>

            <View style={styles.paginationActions}>
              <Pressable
                disabled={pagination.page === 0}
                onPress={() => pagination.onPageChange(pagination.page - 1)}
                style={[
                  styles.pageButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity: pagination.page === 0 ? 0.45 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={colors.foreground}
                />
              </Pressable>

              <Pressable
                disabled={pagination.page >= pagination.totalPages - 1}
                onPress={() => pagination.onPageChange(pagination.page + 1)}
                style={[
                  styles.pageButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    opacity:
                      pagination.page >= pagination.totalPages - 1 ? 0.45 : 1,
                  },
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.foreground}
                />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>["colors"]) {
  return StyleSheet.create({
    tableRoot: {
      flex: 1,
    },
    controlsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderBottomWidth: 1,
    },
    searchWrap: {
      flex: 1,
    },
    searchbar: {
      borderRadius: 0,
      margin: 0,
    },
   searchInput: {
  fontSize: 14,
  fontFamily: "Poppins_400Regular",
  minHeight: 0,
  paddingVertical: 0,
},
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 12,
    },
    filterSelectButton: {
      minHeight: 42,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    filterSelectText: {
      fontSize: 13,
      fontFamily: "Poppins_500Medium",
    },
    headerRow: {
      flexDirection: "row",
      minHeight: 56,
      borderBottomWidth: 1,
    },
    bodyRow: {
      flexDirection: "row",
      minHeight: 78,
      borderBottomWidth: 1,
    },
    headerCell: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    bodyCell: {
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    headerCellInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    headerText: {
      fontSize: 12,
      fontFamily: "Poppins_600SemiBold",
    },
    loadingWrap: {
      minHeight: 240,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyWrap: {
      minHeight: 220,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Poppins_600SemiBold",
    },
    emptySubtitle: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: "Poppins_400Regular",
      textAlign: "center",
    },
    paginationRow: {
      minHeight: 62,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 0,
      paddingVertical: 10,
      gap: 12,
    },
    paginationLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    paginationRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    paginationMetaText: {
      fontSize: 13,
      fontFamily: "Poppins_400Regular",
    },
    pageSizeButton: {
      minWidth: 58,
      minHeight: 38,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    pageSizeText: {
      fontSize: 14,
      fontFamily: "Poppins_600SemiBold",
    },
    paginationActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    pageButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}