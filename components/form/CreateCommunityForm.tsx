import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ionicons } from "@expo/vector-icons";
import {
    Button,
    FieldError,
    Input,
    Label,
    Menu,
    TextField,
} from "heroui-native";

import { COLORS } from "@/constants/colors";
import {
    createCommunitySchema,
    type CreateCommunityFormValues,
    type CreateCommunityFormInput
} from "@/schema/create-community.schema";
import {
    useCreateCommunityMutation,
    useGetCategoriesQuery,
} from "@/store/api/communityApi";

export default function CreateCommunityForm() {
    const [serverError, setServerError] = useState("");

    const {
        data: categories = [],
        isLoading: categoriesLoading,
        error: categoriesError,
    } = useGetCategoriesQuery();

    const [createCommunity, { isLoading: isCreating }] =
        useCreateCommunityMutation();

    const {
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<CreateCommunityFormInput, any, CreateCommunityFormValues>({
        resolver: zodResolver(createCommunitySchema),
        defaultValues: {
            name: "",
            categoryId: "",
            description: "",
            avatarImage: "",
            coverImage: "",
            visibility: "PUBLIC",
        },
    });

    const selectedCategoryId = watch("categoryId");
    const selectedVisibility = watch("visibility");

    const selectedCategory = useMemo(
        () => categories.find((item) => item.id === selectedCategoryId),
        [categories, selectedCategoryId],
    );

    const onSubmit = async (values: CreateCommunityFormValues) => {
        try {
            setServerError("");

            await createCommunity({
                name: values.name,
                categoryId: values.categoryId,
                description: values.description,
                avatarImage: values.avatarImage,
                coverImage: values.coverImage,
                visibility: values.visibility,
            }).unwrap();

            router.back();
        } catch (error: any) {
            setServerError(error?.data?.message || "Failed to create community");
        }
    };

    return (
        <View className="gap-4">
            <View>
                <Text
                    className="text-foreground"
                    style={{
                        fontSize: 26,
                        fontFamily: "Poppins_700Bold",
                    }}
                >
                    Create Community
                </Text>

                <Text
                    className="mt-1 text-muted"
                    style={{
                        fontSize: 14,
                        fontFamily: "Poppins_400Regular",
                    }}
                >
                    Create your own public or private community.
                </Text>
            </View>

            <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                    <TextField isRequired isInvalid={!!errors.name}>
                        <Label>Community Name</Label>
                        <Input
                            value={value}
                            onChangeText={onChange}
                            placeholder="Enter community name"
                            className="border-field-border bg-field-background"
                        />
                        {errors.name?.message ? (
                            <FieldError>{errors.name.message}</FieldError>
                        ) : null}
                    </TextField>
                )}
            />

            <View>
                <Label>Category</Label>

                <Menu>
                    <Menu.Trigger asChild>
                        <Pressable className="mt-2 flex-row items-center justify-between rounded-2xl border border-field-border bg-field-background px-4 py-4">
                            <Text
                                className={selectedCategory ? "text-foreground" : "text-muted"}
                                style={{
                                    fontSize: 15,
                                    fontFamily: "Poppins_500Medium",
                                }}
                            >
                                {categoriesLoading
                                    ? "Loading categories..."
                                    : selectedCategory?.name || "Select a category"}
                            </Text>

                            <Ionicons
                                name="chevron-down-outline"
                                size={18}
                                color={COLORS.muted}
                            />
                        </Pressable>
                    </Menu.Trigger>

                    <Menu.Portal>
                        <Menu.Overlay />
                        <Menu.Content
                            presentation="popover"
                            placement="bottom"
                            align="start"
                            width={260}
                            className="rounded-2xl border border-border bg-surface"
                        >
                            {categories.map((category) => (
                                <Menu.Item
                                    key={category.id}
                                    onPress={() =>
                                        setValue("categoryId", category.id, {
                                            shouldValidate: true,
                                            shouldDirty: true,
                                        })
                                    }
                                >
                                    <Menu.ItemTitle>{category.name}</Menu.ItemTitle>
                                </Menu.Item>
                            ))}
                        </Menu.Content>
                    </Menu.Portal>
                </Menu>

                {errors.categoryId?.message ? (
                    <FieldError>{errors.categoryId.message}</FieldError>
                ) : null}

                {categoriesError ? (
                    <Text
                        style={{
                            color: COLORS.danger,
                            fontSize: 13,
                            fontFamily: "Poppins_500Medium",
                            marginTop: 8,
                        }}
                    >
                        Failed to load categories
                    </Text>
                ) : null}
            </View>

            <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                    <TextField isInvalid={!!errors.description}>
                        <Label>Description</Label>
                        <Input
                            value={value ?? ""}
                            onChangeText={onChange}
                            placeholder="Enter community description"
                            className="border-field-border bg-field-background"
                        />
                        {errors.description?.message ? (
                            <FieldError>{errors.description.message}</FieldError>
                        ) : null}
                    </TextField>
                )}
            />

            <Controller
                control={control}
                name="avatarImage"
                render={({ field: { onChange, value } }) => (
                    <TextField isInvalid={!!errors.avatarImage}>
                        <Label>Avatar Image URL</Label>
                        <Input
                            value={value ?? ""}
                            onChangeText={onChange}
                            placeholder="https://example.com/avatar.jpg"
                            className="border-field-border bg-field-background"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {errors.avatarImage?.message ? (
                            <FieldError>{errors.avatarImage.message}</FieldError>
                        ) : null}
                    </TextField>
                )}
            />

            <Controller
                control={control}
                name="coverImage"
                render={({ field: { onChange, value } }) => (
                    <TextField isInvalid={!!errors.coverImage}>
                        <Label>Cover Image URL</Label>
                        <Input
                            value={value ?? ""}
                            onChangeText={onChange}
                            placeholder="https://example.com/cover.jpg"
                            className="border-field-border bg-field-background"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {errors.coverImage?.message ? (
                            <FieldError>{errors.coverImage.message}</FieldError>
                        ) : null}
                    </TextField>
                )}
            />

            <View>
                <Label>Visibility</Label>

                <View className="mt-2 flex-row gap-3">
                    <Button
                        onPress={() =>
                            setValue("visibility", "PUBLIC", {
                                shouldValidate: true,
                                shouldDirty: true,
                            })
                        }
                        className={
                            selectedVisibility === "PUBLIC"
                                ? "flex-1 rounded-full bg-accent"
                                : "flex-1 rounded-full border border-border bg-surface"
                        }
                    >
                        <Button.Label
                            className={
                                selectedVisibility === "PUBLIC"
                                    ? "text-accent-foreground"
                                    : "text-foreground"
                            }
                        >
                            Public
                        </Button.Label>
                    </Button>

                    <Button
                        onPress={() =>
                            setValue("visibility", "PRIVATE", {
                                shouldValidate: true,
                                shouldDirty: true,
                            })
                        }
                        className={
                            selectedVisibility === "PRIVATE"
                                ? "flex-1 rounded-full bg-accent"
                                : "flex-1 rounded-full border border-border bg-surface"
                        }
                    >
                        <Button.Label
                            className={
                                selectedVisibility === "PRIVATE"
                                    ? "text-accent-foreground"
                                    : "text-foreground"
                            }
                        >
                            Private
                        </Button.Label>
                    </Button>
                </View>
            </View>

            {serverError ? (
                <Text
                    style={{
                        color: COLORS.danger,
                        fontSize: 13,
                        fontFamily: "Poppins_500Medium",
                    }}
                >
                    {serverError}
                </Text>
            ) : null}

            <Button
                onPress={handleSubmit(onSubmit)}
                isDisabled={isCreating || categoriesLoading}
                className="mt-2 rounded-full bg-accent"
            >
                <Button.Label className="text-accent-foreground">
                    {isCreating ? "Creating..." : "Create Community"}
                </Button.Label>
            </Button>
        </View>
    );
}