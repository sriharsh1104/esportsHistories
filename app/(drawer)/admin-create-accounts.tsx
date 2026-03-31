import { Button, Card, Input, Screen } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import {
  blockAdminOrganization,
  blockAdminUsers,
  createAdminHost,
  createAdminOrganization,
  fetchAdminOrganizations,
  fetchAdminUsers,
  unblockAdminOrganization,
  unblockAdminUsers,
  updateAdminOrgManager,
  type AdminCreateOrgBody,
  type AdminManualAccountCreateBody,
  type AdminUpdateOrgManagerBody,
} from "@/services/admin.service";
import { ApiError } from "@/services/api.service";
import type {
  AdminOrganization,
  AdminUserRoleFilter,
  AdminUserRow,
} from "@/types/admin";
import { isAdminUser } from "@/utils/adminUser";
import { Redirect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

function emptyForm(): AdminManualAccountCreateBody {
  return { email: "", name: "", password: "" };
}

type FormState = AdminManualAccountCreateBody;

function emptyCreateOrgForm(): AdminCreateOrgBody {
  return { name: "", slug: "", manager: { email: "", name: "", password: "" } };
}

function emptyUpdateManagerForm(): AdminUpdateOrgManagerBody {
  return { email: "", name: "", password: "" };
}

const ROLE_FILTERS: AdminUserRoleFilter[] = [
  "ALL",
  "ADMIN",
  "HOST",
  "USER",
  "ORG_MANAGER",
];

function humanizeRoleLabel(role: string): string {
  return String(role).replace(/_/g, " ").trim();
}

function capitalizeWords(text: string): string {
  const t = String(text).trim();
  if (!t) return t;
  return t
    .split(/\s+/)
    .map((part) =>
      part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part,
    )
    .join(" ");
}

function roleFilterLabel(r: AdminUserRoleFilter): string {
  return capitalizeWords(humanizeRoleLabel(r));
}

function isAdminRoleForBulkBlock(role?: string): boolean {
  const r = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]/g, "_");
  return r === "admin";
}

function UserRow({
  row,
  colors,
  w,
  isLast,
  checked,
  checkable,
  onToggle,
}: {
  row: AdminUserRow;
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  isLast?: boolean;
  checked?: boolean;
  checkable?: boolean;
  onToggle?: () => void;
}) {
  const rawTitle = row.displayName || row.fullName || row.name || row.email;
  const title = rawTitle === row.email ? rawTitle : capitalizeWords(rawTitle);
  return (
    <Pressable
      onPress={checkable ? onToggle : undefined}
      accessibilityRole={checkable ? "button" : "none"}
      style={[
        styles.userRow,
        {
          paddingVertical: w(12),
          paddingHorizontal: w(6),
          borderBottomColor: colors.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          backgroundColor: row.isBlocked
            ? "rgba(198,40,40,0.07)"
            : "transparent",
          borderRadius: 4,
        },
      ]}
    >
      {/* Checkbox */}
      {checkable ? (
        <View
          style={{
            width: w(20),
            height: w(20),
            borderRadius: 3,
            borderWidth: 1,
            borderColor: checked ? colors.tint : colors.border,
            backgroundColor: checked ? colors.tint : "transparent",
            marginRight: w(10),
            flexShrink: 0,
          }}
        />
      ) : (
        <View style={{ width: w(20), marginRight: w(10), flexShrink: 0 }} />
      )}

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: w(6) }}>
          <Text
            style={{ color: colors.text, fontSize: w(14), fontWeight: "600", flex: 1 }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {row.role ? (
            <Text
              style={{ color: colors.tint, fontSize: w(11), fontWeight: "600" }}
              numberOfLines={1}
            >
              {capitalizeWords(humanizeRoleLabel(String(row.role)))}
            </Text>
          ) : null}
        </View>
        <Text
          style={{ color: colors.tabIconDefault, fontSize: w(12), marginTop: w(3) }}
          numberOfLines={1}
        >
          {row.email}
        </Text>
        {row.isBlocked ? (
          <View
            style={{
              alignSelf: "flex-start",
              marginTop: w(4),
              backgroundColor: "rgba(198,40,40,0.15)",
              paddingHorizontal: w(6),
              paddingVertical: w(2),
              borderRadius: 3,
            }}
          >
            <Text style={{ color: "#ef5350", fontSize: w(10), fontWeight: "700" }}>
              BLOCKED
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function AccountForm({
  title,
  description,
  colors,
  w,
  h,
  values,
  onChange,
  onSubmit,
  submitting,
  submitLabel,
}: {
  title: string;
  description: string;
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  h: (n: number) => number;
  values: FormState;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <Card style={{ marginBottom: h(20) }}>
      <Text
        style={{
          color: colors.text,
          fontSize: w(16),
          fontWeight: "700",
          marginBottom: h(6),
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.tabIconDefault,
          fontSize: w(12),
          lineHeight: w(18),
          marginBottom: h(14),
        }}
      >
        {description}
      </Text>
      <Input
        label="Email"
        value={values.email}
        onChangeText={(t) => onChange({ email: t })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <Input
        label="Name"
        value={values.name}
        onChangeText={(t) => onChange({ name: t })}
      />
      <Input
        label="Password"
        value={values.password}
        onChangeText={(t) => onChange({ password: t })}
        secure
      />
      <Button
        title={submitLabel}
        onPress={onSubmit}
        disabled={submitting}
        fullWidth
      />
    </Card>
  );
}

function OrgRow({
  org,
  colors,
  w,
  isLast,
  checked,
  onToggle,
}: {
  org: AdminOrganization;
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  isLast?: boolean;
  checked?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.userRow,
        {
          paddingVertical: w(12),
          paddingHorizontal: w(6),
          borderBottomColor: colors.border,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          backgroundColor: org.isBlocked
            ? "rgba(198,40,40,0.07)"
            : "transparent",
          borderRadius: 4,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ checked: !!checked }}
    >
      {/* Checkbox */}
      <View
        style={{
          width: w(20),
          height: w(20),
          borderRadius: 3,
          borderWidth: 1,
          borderColor: checked ? colors.tint : colors.border,
          backgroundColor: checked ? colors.tint : "transparent",
          marginRight: w(10),
          flexShrink: 0,
        }}
      />

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ color: colors.text, fontSize: w(14), fontWeight: "600" }}
          numberOfLines={1}
        >
          {org.name}
        </Text>
        {org.managerEmail ? (
          <Text
            style={{ color: colors.tabIconDefault, fontSize: w(12), marginTop: w(3) }}
            numberOfLines={1}
          >
            {org.managerEmail}
          </Text>
        ) : null}
        {org.isBlocked ? (
          <View
            style={{
              alignSelf: "flex-start",
              marginTop: w(4),
              backgroundColor: "rgba(198,40,40,0.15)",
              paddingHorizontal: w(6),
              paddingVertical: w(2),
              borderRadius: 3,
            }}
          >
            <Text style={{ color: "#ef5350", fontSize: w(10), fontWeight: "700" }}>
              BLOCKED
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function OrgManagementSection({
  colors,
  w,
  h,
}: {
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  h: (n: number) => number;
}) {
  const [createOrgForm, setCreateOrgForm] = useState<AdminCreateOrgBody>(
    () => emptyCreateOrgForm(),
  );
  const [createOrgSubmitting, setCreateOrgSubmitting] = useState(false);

  const [orgPage, setOrgPage] = useState(1);
  const orgLimit = 10;
  const [orgRows, setOrgRows] = useState<AdminOrganization[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgTotalPages, setOrgTotalPages] = useState(1);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  // Bulk selection
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(() => new Set());
  const [bulkBlockPending, setBulkBlockPending] = useState<"block" | "unblock" | null>(null);

  // Update manager (single org, shown when exactly 1 checked)
  const [updateManagerForm, setUpdateManagerForm] =
    useState<AdminUpdateOrgManagerBody>(() => emptyUpdateManagerForm());
  const [updateManagerSubmitting, setUpdateManagerSubmitting] = useState(false);
  const [showUpdateManager, setShowUpdateManager] = useState(false);

  const selectedCount = selectedOrgIds.size;
  const singleSelectedOrg =
    selectedCount === 1
      ? orgRows.find((o) => selectedOrgIds.has(o.id)) ?? null
      : null;

  const loadOrgs = useCallback(async () => {
    setOrgsError(null);
    setOrgsLoading(true);
    try {
      const res = await fetchAdminOrganizations({ page: orgPage, limit: orgLimit });
      setOrgRows(res.items);
      setOrgTotal(res.total);
      setOrgTotalPages(res.totalPages);
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Failed to load organizations";
      setOrgsError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setOrgsLoading(false);
    }
  }, [orgPage]);

  useEffect(() => {
    void loadOrgs();
  }, [loadOrgs]);

  useEffect(() => {
    setSelectedOrgIds(new Set());
    setShowUpdateManager(false);
  }, [orgPage]);

  const toggleOrgCheck = useCallback((id: string) => {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setShowUpdateManager(false);
  }, []);

  const submitCreateOrg = useCallback(async () => {
    const name = createOrgForm.name.trim();
    const email = createOrgForm.manager.email.trim();
    const managerName = createOrgForm.manager.name.trim();
    const password = createOrgForm.manager.password;
    if (!name || !email || !managerName || !password) {
      Toast.show({
        type: "error",
        text1: "Fill all fields: org name, manager email, name, password",
      });
      return;
    }
    setCreateOrgSubmitting(true);
    try {
      await createAdminOrganization({
        name,
        slug: name,
        manager: { email, name: managerName, password },
      });
      Toast.show({ type: "success", text1: "Organization created" });
      setCreateOrgForm(emptyCreateOrgForm());
      await loadOrgs();
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Could not create organization";
      Toast.show({ type: "error", text1: msg });
    } finally {
      setCreateOrgSubmitting(false);
    }
  }, [createOrgForm, loadOrgs]);

  const submitBulkBlockUnblock = useCallback(
    async (mode: "block" | "unblock") => {
      const ids = [...selectedOrgIds];
      if (ids.length === 0) {
        Toast.show({ type: "info", text1: "Select at least one organization" });
        return;
      }
      setBulkBlockPending(mode);
      try {
        await Promise.all(
          ids.map((id) =>
            mode === "block"
              ? blockAdminOrganization(id)
              : unblockAdminOrganization(id),
          ),
        );
        Toast.show({
          type: "success",
          text1:
            mode === "block"
              ? `${ids.length} org(s) blocked`
              : `${ids.length} org(s) unblocked`,
        });
        setSelectedOrgIds(new Set());
        await loadOrgs();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Action failed";
        Toast.show({ type: "error", text1: msg });
      } finally {
        setBulkBlockPending(null);
      }
    },
    [selectedOrgIds, loadOrgs],
  );

  const submitUpdateManager = useCallback(async () => {
    if (!singleSelectedOrg) return;
    const email = updateManagerForm.email.trim();
    const name = updateManagerForm.name.trim();
    const password = updateManagerForm.password;
    if (!email || !name || !password) {
      Toast.show({ type: "error", text1: "Fill manager email, name, and password" });
      return;
    }
    setUpdateManagerSubmitting(true);
    try {
      await updateAdminOrgManager(singleSelectedOrg.id, { email, name, password });
      Toast.show({ type: "success", text1: `Manager updated for "${singleSelectedOrg.name}"` });
      setUpdateManagerForm(emptyUpdateManagerForm());
      setSelectedOrgIds(new Set());
      setShowUpdateManager(false);
      await loadOrgs();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not update manager";
      Toast.show({ type: "error", text1: msg });
    } finally {
      setUpdateManagerSubmitting(false);
    }
  }, [singleSelectedOrg, updateManagerForm, loadOrgs]);

  return (
    <View style={{ marginTop: h(24) }}>

      {/* ── 1. Create Organization ── */}
      <Text
        style={{
          color: colors.text,
          fontSize: w(13),
          fontWeight: "700",
          letterSpacing: 0.4,
          textTransform: "uppercase",
          marginBottom: h(10),
        }}
      >
        Create Organization
      </Text>
      <Card style={{ marginBottom: h(24) }}>
        <Text
          style={{
            color: colors.tabIconDefault,
            fontSize: w(11),
            fontWeight: "600",
            letterSpacing: 0.5,
            marginBottom: h(8),
            textTransform: "uppercase",
          }}
        >
          Organization
        </Text>
        <Input
          label="Name"
          value={createOrgForm.name}
          onChangeText={(t) => setCreateOrgForm((s) => ({ ...s, name: t }))}
        />
        <Text
          style={{
            color: colors.tabIconDefault,
            fontSize: w(11),
            fontWeight: "600",
            letterSpacing: 0.5,
            marginTop: h(12),
            marginBottom: h(8),
            textTransform: "uppercase",
          }}
        >
          Manager Account
        </Text>
        <Input
          label="Email"
          value={createOrgForm.manager.email}
          onChangeText={(t) =>
            setCreateOrgForm((s) => ({ ...s, manager: { ...s.manager, email: t } }))
          }
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <Input
          label="Name"
          value={createOrgForm.manager.name}
          onChangeText={(t) =>
            setCreateOrgForm((s) => ({ ...s, manager: { ...s.manager, name: t } }))
          }
        />
        <Input
          label="Password"
          value={createOrgForm.manager.password}
          onChangeText={(t) =>
            setCreateOrgForm((s) => ({ ...s, manager: { ...s.manager, password: t } }))
          }
          secure
        />
        <Button
          title={createOrgSubmitting ? "Creating…" : "Create Organization"}
          onPress={() => void submitCreateOrg()}
          disabled={createOrgSubmitting}
          fullWidth
        />
      </Card>

      {/* ── 2. Organizations List ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: h(10),
        }}
      >
        <Text
          style={{
            color: colors.text,
            fontSize: w(13),
            fontWeight: "700",
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          Organizations
        </Text>
        {orgTotal > 0 ? (
          <Text style={{ color: colors.tabIconDefault, fontSize: w(12) }}>
            {orgTotal.toLocaleString("en-IN")} total
          </Text>
        ) : null}
      </View>

      {/* Bulk action bar */}
      <View
        style={{
          flexDirection: "row",
          gap: w(8),
          marginBottom: h(10),
          alignItems: "center",
        }}
      >
        <Text
          style={{
            color: selectedCount > 0 ? colors.text : colors.tabIconDefault,
            fontSize: w(12),
            flex: 1,
          }}
        >
          {selectedCount > 0
            ? `${selectedCount} selected`
            : "Select orgs to block / unblock"}
        </Text>
        <Button
          title={bulkBlockPending === "block" ? "Blocking…" : "Block"}
          variant="outline"
          disabled={selectedCount === 0 || bulkBlockPending !== null}
          onPress={() => void submitBulkBlockUnblock("block")}
        />
        <Button
          title={bulkBlockPending === "unblock" ? "Unblocking…" : "Unblock"}
          variant="outline"
          disabled={selectedCount === 0 || bulkBlockPending !== null}
          onPress={() => void submitBulkBlockUnblock("unblock")}
        />
      </View>

      <Card padded>
        {orgsLoading ? (
          <ActivityIndicator color={colors.tint} style={{ marginVertical: h(16) }} />
        ) : orgsError ? (
          <Text style={{ color: colors.accent }}>{orgsError}</Text>
        ) : orgRows.length === 0 ? (
          <Text style={{ color: colors.tabIconDefault }}>No organizations yet.</Text>
        ) : (
          orgRows.map((org, i) => (
            <OrgRow
              key={org.id}
              org={org}
              colors={colors}
              w={w}
              isLast={i === orgRows.length - 1}
              checked={selectedOrgIds.has(org.id)}
              onToggle={() => toggleOrgCheck(org.id)}
            />
          ))
        )}
      </Card>

      {orgTotalPages > 1 && !orgsLoading && (
        <View style={[styles.pager, { marginTop: h(12), gap: w(12) }]}>
          <Button
            title="Previous"
            variant="outline"
            disabled={orgPage <= 1}
            onPress={() => setOrgPage((p) => Math.max(1, p - 1))}
          />
          <Text style={{ color: colors.tabIconDefault, fontSize: w(13) }}>
            {orgPage} / {orgTotalPages}
          </Text>
          <Button
            title="Next"
            variant="outline"
            disabled={orgPage >= orgTotalPages}
            onPress={() => setOrgPage((p) => Math.min(orgTotalPages, p + 1))}
          />
        </View>
      )}

      {/* ── 3. Update Manager — only when exactly 1 org is checked ── */}
      {singleSelectedOrg ? (
        <Card style={{ marginTop: h(16) }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: h(12),
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.tabIconDefault,
                  fontSize: w(11),
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Update Manager
              </Text>
              <Text
                style={{ color: colors.text, fontSize: w(14), fontWeight: "700", marginTop: h(2) }}
                numberOfLines={1}
              >
                {singleSelectedOrg.name}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowUpdateManager((v) => !v)}
              style={{
                paddingHorizontal: w(10),
                paddingVertical: w(6),
                borderRadius: 6,
                borderWidth: 1,
                borderColor: showUpdateManager ? colors.tint : colors.border,
                backgroundColor: showUpdateManager ? colors.tint + "18" : "transparent",
              }}
              accessibilityRole="button"
            >
              <Text
                style={{
                  color: showUpdateManager ? colors.tint : colors.tabIconDefault,
                  fontSize: w(12),
                  fontWeight: "600",
                }}
              >
                {showUpdateManager ? "Hide" : "Edit"}
              </Text>
            </Pressable>
          </View>

          {showUpdateManager ? (
            <View>
              <Input
                label="New Manager Email"
                value={updateManagerForm.email}
                onChangeText={(t) => setUpdateManagerForm((s) => ({ ...s, email: t }))}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <Input
                label="Name"
                value={updateManagerForm.name}
                onChangeText={(t) => setUpdateManagerForm((s) => ({ ...s, name: t }))}
              />
              <Input
                label="Password"
                value={updateManagerForm.password}
                onChangeText={(t) => setUpdateManagerForm((s) => ({ ...s, password: t }))}
                secure
              />
              <Button
                title={updateManagerSubmitting ? "Updating…" : "Confirm Update"}
                onPress={() => void submitUpdateManager()}
                disabled={updateManagerSubmitting}
                fullWidth
              />
            </View>
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

export default function AdminCreateAccountsScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { w, h } = useResponsive();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [hostForm, setHostForm] = useState<FormState>(() => emptyForm());
  const [hostSubmitting, setHostSubmitting] = useState(false);

  const [roleFilter, setRoleFilter] = useState<AdminUserRoleFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [userRows, setUserRows] = useState<AdminUserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set());
  const [userBulkPending, setUserBulkPending] = useState<"block" | "unblock" | null>(null);

  const loadUsers = useCallback(async () => {
    setUsersError(null);
    setUsersLoading(true);
    try {
      const res = await fetchAdminUsers({
        page,
        limit,
        search: searchApplied || undefined,
        role: roleFilter,
      });
      setUserRows(res.items);
      setUserTotal(res.total);
      setUserTotalPages(res.totalPages);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Failed to load users";
      setUsersError(msg);
      Toast.show({ type: "error", text1: msg });
    } finally {
      setUsersLoading(false);
    }
  }, [page, limit, searchApplied, roleFilter]);

  const submitHost = useCallback(async () => {
    const email = hostForm.email.trim();
    const name = hostForm.name.trim();
    const password = hostForm.password;
    if (!email || !name || !password) {
      Toast.show({ type: "error", text1: "Fill email, name, and password" });
      return;
    }
    setHostSubmitting(true);
    try {
      await createAdminHost({ email, name, password });
      Toast.show({ type: "success", text1: "Host account created" });
      setHostForm(emptyForm());
      await loadUsers();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not create host";
      Toast.show({ type: "error", text1: msg });
    } finally {
      setHostSubmitting(false);
    }
  }, [hostForm.email, hostForm.name, hostForm.password, loadUsers]);

  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    void loadUsers();
  }, [isAuthenticated, user, loadUsers]);

  useEffect(() => {
    setSelectedUserIds(new Set());
  }, [page, roleFilter, searchApplied]);

  const toggleUserCheck = useCallback((id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runBulkBlockUnblock = useCallback(
    async (mode: "block" | "unblock") => {
      const eligible = [...selectedUserIds].filter((id) => {
        if (id === user?.id) return false;
        const row = userRows.find((r) => r.id === id);
        if (!row) return false;
        if (isAdminRoleForBulkBlock(row.role)) return false;
        if (mode === "block") return !row.isBlocked;
        return row.isBlocked === true;
      });
      if (eligible.length === 0) {
        Toast.show({
          type: "info",
          text1:
            mode === "block"
              ? "No eligible users to block"
              : "No eligible users to unblock",
        });
        return;
      }
      setUserBulkPending(mode);
      try {
        if (mode === "block") await blockAdminUsers(eligible);
        else await unblockAdminUsers(eligible);
        Toast.show({
          type: "success",
          text1:
            mode === "block"
              ? `${eligible.length} user(s) blocked`
              : `${eligible.length} user(s) unblocked`,
        });
        setSelectedUserIds(new Set());
        await loadUsers();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Action failed";
        Toast.show({ type: "error", text1: msg });
      } finally {
        setUserBulkPending(null);
      }
    },
    [selectedUserIds, user?.id, userRows, loadUsers],
  );

  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text }}>Loading…</Text>
      </View>
    );
  }

  if (!isAuthenticated || !isAdminUser(user)) {
    return <Redirect href={ROUTES.HOME} />;
  }

  return (
    <Screen
      scroll={false}
      padded
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingBottom: h(32),
          paddingTop: h(4),
          maxWidth: w(560),
          alignSelf: "center",
          width: "100%",
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: colors.text,
            fontSize: w(18),
            fontWeight: "700",
            marginBottom: h(8),
          }}
        >
          Create accounts
        </Text>

        <View style={{ marginTop: h(24) }}>
          <Text
            style={{
              color: colors.tabIconDefault,
              fontSize: w(14),
              marginBottom: h(8),
            }}
          >
            Total users (reported): {userTotal.toLocaleString("en-IN")}
          </Text>

          <Text
            style={{
              color: colors.tabIconDefault,
              fontSize: w(12),
              marginBottom: h(6),
            }}
          >
            Role
          </Text>
          <View style={[styles.roleRow, { gap: w(8), marginBottom: h(12) }]}>
            {ROLE_FILTERS.map((r) => {
              const active = roleFilter === r;
              return (
                <Button
                  key={r}
                  title={roleFilterLabel(r)}
                  onPress={() => {
                    setRoleFilter(r);
                    setPage(1);
                  }}
                  variant={active ? "primary" : "outline"}
                />
              );
            })}
          </View>

          {roleFilter === "HOST" && (
            <AccountForm
              title="Host"
              description=" New host account, auto-verified."
              colors={colors}
              w={w}
              h={h}
              values={hostForm}
              onChange={(patch) => setHostForm((s) => ({ ...s, ...patch }))}
              onSubmit={submitHost}
              submitting={hostSubmitting}
              submitLabel={hostSubmitting ? "Creating…" : "Create host"}
            />
          )}

          {roleFilter === "ORG_MANAGER" ? (
            <OrgManagementSection colors={colors} w={w} h={h} />
          ) : (
            <>
              <Input
                label="Search"
                placeholder="Name or email"
                value={searchInput}
                onChangeText={setSearchInput}
                autoCapitalize="none"
                leftIcon="search"
              />
              <Button
                title="Search"
                onPress={() => {
                  setSearchApplied(searchInput.trim());
                  setPage(1);
                }}
                fullWidth
                style={{ marginTop: h(12) }}
              />

              {/* Bulk action bar */}
              {(() => {
                const selectedCount = selectedUserIds.size;
                const selectedRows = userRows.filter((r) => selectedUserIds.has(r.id));
                const hasBlockable = selectedRows.some(
                  (r) => !r.isBlocked && !isAdminRoleForBulkBlock(r.role) && r.id !== user?.id,
                );
                const hasUnblockable = selectedRows.some((r) => r.isBlocked);
                return (
                  <View
                    style={{
                      flexDirection: "row",
                      gap: w(8),
                      marginTop: h(14),
                      marginBottom: h(6),
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: selectedCount > 0 ? colors.text : colors.tabIconDefault,
                        fontSize: w(12),
                        flex: 1,
                      }}
                    >
                      {selectedCount > 0
                        ? `${selectedCount} selected`
                        : "Select users to block / unblock"}
                    </Text>
                    <Button
                      title={userBulkPending === "block" ? "Blocking…" : "Block"}
                      variant="outline"
                      disabled={!hasBlockable || userBulkPending !== null}
                      onPress={() => void runBulkBlockUnblock("block")}
                    />
                    <Button
                      title={userBulkPending === "unblock" ? "Unblocking…" : "Unblock"}
                      variant="outline"
                      disabled={!hasUnblockable || userBulkPending !== null}
                      onPress={() => void runBulkBlockUnblock("unblock")}
                    />
                  </View>
                );
              })()}

              <Card padded>
                {usersLoading ? (
                  <ActivityIndicator
                    color={colors.tint}
                    style={{ marginVertical: h(16) }}
                  />
                ) : usersError ? (
                  <Text style={{ color: colors.accent }}>{usersError}</Text>
                ) : userRows.length === 0 ? (
                  <Text style={{ color: colors.tabIconDefault }}>
                    No users for this query.
                  </Text>
                ) : (
                  userRows.map((item, i) => {
                    const checkable =
                      !isAdminRoleForBulkBlock(item.role) && item.id !== user?.id;
                    return (
                      <UserRow
                        key={item.id}
                        row={item}
                        colors={colors}
                        w={w}
                        isLast={i === userRows.length - 1}
                        checkable={checkable}
                        checked={checkable && selectedUserIds.has(item.id)}
                        onToggle={checkable ? () => toggleUserCheck(item.id) : undefined}
                      />
                    );
                  })
                )}
              </Card>

              {userTotalPages > 1 && !usersLoading && (
                <View style={[styles.pager, { marginTop: h(16), gap: w(12) }]}>
                  <Button
                    title="Previous"
                    variant="outline"
                    disabled={page <= 1}
                    onPress={() => setPage((p) => Math.max(1, p - 1))}
                  />
                  <Text style={{ color: colors.tabIconDefault, fontSize: w(14) }}>
                    {page} / {userTotalPages}
                  </Text>
                  <Button
                    title="Next"
                    variant="outline"
                    disabled={page >= userTotalPages}
                    onPress={() => setPage((p) => Math.min(userTotalPages, p + 1))}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  roleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
});
