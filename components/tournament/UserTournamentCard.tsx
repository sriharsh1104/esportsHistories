import { Button, ClassicEmptyState, Input } from "@/components/ui";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/context/ResponsiveContext";
import type { JoinedTeamSlotRow, TournamentLiveResultsPayload, TournamentUiItem } from "@/services/tournament.service";
import {
  buildJoinedTeamSlotRows,
  buildTournamentResultsStreamUrl,
  fetchTournamentDetail,
  fetchTournamentJoinedTeams,
  fetchTournamentLiveResults,
  formatRulesRecordForDisplay,
  joinUserTournament,
  livePayloadFromLegacyLeaderboardArray,
  normalizeTournamentLiveResultsPayload,
  parseUserTournamentRules,
} from "@/services/tournament.service";
import { getToken } from "@/services/common.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

function userTournamentStatusLabel(apiStatus: string): string {
  const s = apiStatus.toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    upcoming: "Upcoming",
    live: "Live",
    ongoing: "Live",
    completed: "Completed",
    pendingresult: "Pending result",
    cancelled: "Cancelled",
  };
  if (map[s]) return map[s];
  if (!apiStatus) return "";
  return apiStatus.replace(/([A-Z])/g, " $1").trim();
}

function userTournamentStatusColor(apiStatus: string, fallback: string): string {
  const s = apiStatus.toLowerCase();
  if (s === "upcoming") return "#f97316";
  if (s === "live" || s === "ongoing") return "#22c55e";
  if (s === "cancelled") return "#ef4444";
  if (s === "completed") return "#eab308";
  return fallback;
}

type Props = {
  item: TournamentUiItem;
  onTournamentMutated?: () => void;
};

export function UserTournamentCard({ item, onTournamentMutated }: Props) {
  const scheme = useColorScheme() ?? "light";
  const { w, h, isSmallDevice } = useResponsive();
  const colors = Colors[scheme];
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [rulesOpen, setRulesOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  const [rulesDetail, setRulesDetail] = useState<TournamentUiItem | null>(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesTab, setRulesTab] = useState<"lobby" | "points" | "fair">("lobby");

  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [teamsRows, setTeamsRows] = useState<JoinedTeamSlotRow[]>([]);

  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [liveResults, setLiveResults] = useState<TournamentLiveResultsPayload>({
    standings: [],
    matchResults: [],
  });
  /** Slot + team names for results preview before host posts scores (Pts/KP/BY = 0). */
  const [resultsPreviewSlots, setResultsPreviewSlots] = useState<JoinedTeamSlotRow[]>([]);
  const [resultsSlotsLoading, setResultsSlotsLoading] = useState(false);
  const [resultsLiveNote, setResultsLiveNote] = useState<string | null>(null);

  const [joining, setJoining] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinTeamName, setJoinTeamName] = useState("");
  /** Up to four teammate in-game names (optional); sent as `players` on join API. */
  const [joinTeammateNames, setJoinTeammateNames] = useState<
    [string, string, string, string]
  >(["", "", "", ""]);
  const [joinFormError, setJoinFormError] = useState<string | null>(null);
  const resultsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const label =
    item.lobbyName ||
    item.name ||
    item.gameName ||
    item.mode ||
    item.id.slice(0, 8).toUpperCase();

  const subtitleParts: string[] = [];
  if (item.gameName && item.gameName !== "—") subtitleParts.push(item.gameName);
  if (item.mode) subtitleParts.push(item.mode);
  if (item.subMode) subtitleParts.push(item.subMode);
  const subtitle = subtitleParts.join(" · ");

  const startTime = item.startTimeDisplay;

  const totalSlots =
    item.maxTeams != null ? String(item.maxTeams) : undefined;
  const availableSlots =
    item.maxTeams != null && item.slotsAvailable != null
      ? String(item.slotsAvailable)
      : item.maxTeams != null
        ? String(
            Math.max(0, item.maxTeams - (item.joinedCount ?? 0)),
          )
        : undefined;

  const statusColor = userTournamentStatusColor(
    item.apiStatus,
    colors.tabIconDefault,
  );
  const statusLabel = userTournamentStatusLabel(item.apiStatus);

  const statCells: { key: string; caption: string; value: string }[] = [];
  if (startTime)
    statCells.push({ key: "start", caption: "Start", value: startTime });
  if (totalSlots)
    statCells.push({
      key: "slots",
      caption: "Total slots",
      value: totalSlots,
    });
  if (availableSlots)
    statCells.push({
      key: "available",
      caption: "Available slots",
      value: availableSlots,
    });
  if (item.entryFee != null)
    statCells.push({
      key: "entry",
      caption: "Entry fee",
      value: `₹${item.entryFee}`,
    });
  if (item.winnerPrizePool != null)
    statCells.push({
      key: "winner",
      caption: "Winner pool",
      value: `₹${item.winnerPrizePool}`,
    });
  if (item.totalFees != null)
    statCells.push({
      key: "fees",
      caption: "Fees",
      value: `₹${item.totalFees}`,
    });

  const statColWidth = isSmallDevice ? "48%" : "31%";

  const maxTeammateSlots = useMemo(() => {
    const mode = String(item.mode ?? "")
      .toUpperCase()
      .trim();
    if (mode === "CS") return 4;
    return 5;
  }, [item.mode]);

  const isCurrentUserJoined = useMemo(() => {
    const uid = String(user?.id ?? "").trim();
    if (!uid) return false;
    return (item.joinedTeamsList ?? []).some(
      (t) => String(t.leaderUserId ?? "").trim() === uid,
    );
  }, [user?.id, item.joinedTeamsList]);

  const joinDisabled = useMemo(() => {
    if (joining || isCurrentUserJoined) return true;
    const s = item.apiStatus.toLowerCase().replace(/\s+/g, "");
    if (
      s === "completed" ||
      s === "cancelled" ||
      s === "live" ||
      s === "ongoing" ||
      s === "pendingresult"
    ) {
      return true;
    }
    if (item.slotsAvailable != null && item.slotsAvailable <= 0) return true;
    return false;
  }, [joining, isCurrentUserJoined, item.apiStatus, item.slotsAvailable]);

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    setTeamsError(null);
    try {
      const rows = await fetchTournamentJoinedTeams(item.id);
      setTeamsRows(rows);
    } catch (e) {
      setTeamsError(e instanceof Error ? e.message : "Failed to load teams");
      setTeamsRows([]);
    } finally {
      setTeamsLoading(false);
    }
  }, [item.id]);

  const loadResults = useCallback(async () => {
    setResultsError(null);
    try {
      const payload = await fetchTournamentLiveResults(item.id);
      setLiveResults(payload);
    } catch (e) {
      setResultsError(e instanceof Error ? e.message : "Failed to load results");
      setLiveResults({ standings: [], matchResults: [] });
    }
  }, [item.id]);

  useEffect(() => {
    if (!teamsOpen) return;
    if (item.joinedTeamsList !== undefined) {
      setTeamsError(null);
      setTeamsLoading(false);
      setTeamsRows(
        buildJoinedTeamSlotRows(item.maxTeams, item.joinedTeamsList),
      );
      return;
    }
    void loadTeams();
  }, [teamsOpen, item.joinedTeamsList, item.maxTeams, loadTeams]);

  useEffect(() => {
    if (!resultsOpen) {
      if (resultsPollRef.current) {
        clearInterval(resultsPollRef.current);
        resultsPollRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setResultsLiveNote(null);
      return;
    }

    setResultsLoading(true);
    void (async () => {
      await loadResults();
      setResultsLoading(false);
    })();

    const pollMs = 12000;
    resultsPollRef.current = setInterval(() => {
      void loadResults();
    }, pollMs);

    if (
      Platform.OS === "web" &&
      typeof EventSource !== "undefined"
    ) {
      const token = getToken();
      if (token) {
        try {
          const url = buildTournamentResultsStreamUrl(item.id, token);
          const es = new EventSource(url);
          eventSourceRef.current = es;
          setResultsLiveNote("Live updates (web stream)");
          es.onmessage = (ev) => {
            try {
              const parsed = JSON.parse(ev.data) as unknown;
              const body =
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed) &&
                "data" in parsed
                  ? (parsed as { data: unknown }).data
                  : parsed;
              if (Array.isArray(body)) {
                setLiveResults(livePayloadFromLegacyLeaderboardArray(body));
                return;
              }
              const normalized = normalizeTournamentLiveResultsPayload(body);
              if (
                normalized.standings.length > 0 ||
                normalized.matchResults.some((m) => m.teams.length > 0)
              ) {
                setLiveResults(normalized);
              }
            } catch {
              /* ignore malformed SSE chunks */
            }
          };
          es.onerror = () => {
            /* keep polling */
          };
        } catch {
          setResultsLiveNote(`Refreshing every ${pollMs / 1000}s`);
        }
      } else {
        setResultsLiveNote(`Refreshing every ${pollMs / 1000}s`);
      }
    } else {
      setResultsLiveNote(`Refreshing every ${pollMs / 1000}s`);
    }

    return () => {
      if (resultsPollRef.current) {
        clearInterval(resultsPollRef.current);
        resultsPollRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [resultsOpen, item.id, loadResults]);

  useEffect(() => {
    if (!resultsOpen) {
      setResultsPreviewSlots([]);
      setResultsSlotsLoading(false);
      return;
    }
    if (item.joinedTeamsList !== undefined) {
      setResultsSlotsLoading(false);
      setResultsPreviewSlots(
        buildJoinedTeamSlotRows(item.maxTeams, item.joinedTeamsList),
      );
      return;
    }
    setResultsSlotsLoading(true);
    setResultsPreviewSlots([]);
    let cancelled = false;
    void (async () => {
      try {
        const rows = await fetchTournamentJoinedTeams(item.id);
        if (!cancelled) setResultsPreviewSlots(rows);
      } catch {
        if (!cancelled) setResultsPreviewSlots([]);
      } finally {
        if (!cancelled) setResultsSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resultsOpen, item.id, item.maxTeams, item.joinedTeamsList]);

  const hasLiveResultsData = useMemo(
    () =>
      liveResults.standings.length > 0 ||
      liveResults.matchResults.some((m) => m.teams.length > 0),
    [liveResults],
  );

  const liveResultsMeta = useMemo(() => {
    const parts: string[] = [];
    if (liveResults.game) parts.push(liveResults.game);
    if (liveResults.mode) parts.push(liveResults.mode);
    if (liveResults.subMode) parts.push(liveResults.subMode);
    if (liveResults.status) parts.push(liveResults.status);
    if (liveResults.totalMatches != null) {
      parts.push(`${liveResults.totalMatches} match${liveResults.totalMatches === 1 ? "" : "es"}`);
    }
    return parts.join(" · ");
  }, [liveResults]);

  useEffect(() => {
    if (rulesOpen) setRulesTab("lobby");
  }, [rulesOpen]);

  useEffect(() => {
    if (!rulesOpen) {
      setRulesDetail(null);
      return;
    }
    const hasLocal =
      Boolean(item.lobbyRulesText) ||
      Boolean(item.rulesRecord && Object.keys(item.rulesRecord).length);
    if (hasLocal) return;
    setRulesLoading(true);
    void (async () => {
      try {
        const d = await fetchTournamentDetail(item.id);
        setRulesDetail(d);
      } catch {
        setRulesDetail(null);
      } finally {
        setRulesLoading(false);
      }
    })();
  }, [rulesOpen, item.id, item.lobbyRulesText, item.rulesRecord]);

  const openJoinModal = useCallback(() => {
    if (joinDisabled) return;
    setJoinFormError(null);
    setJoinTeamName("");
    setJoinTeammateNames(["", "", "", ""]);
    setJoinModalOpen(true);
  }, [joinDisabled]);

  const submitJoin = useCallback(async () => {
    if (joinDisabled) return;
    const teamName = joinTeamName.trim();
    if (!teamName) {
      setJoinFormError("Enter a team name.");
      return;
    }
    const players = joinTeammateNames
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, maxTeammateSlots);
    setJoinFormError(null);
    setJoining(true);
    dispatch(showLoader());
    try {
      await joinUserTournament({
        tournamentId: item.id,
        teamName,
        players,
      });
      setJoinModalOpen(false);
      setJoinTeamName("");
      setJoinTeammateNames(["", "", "", ""]);
      onTournamentMutated?.();
    } catch {
      /* api.service surfaces toast */
    } finally {
      dispatch(hideLoader());
      setJoining(false);
    }
  }, [
    dispatch,
    item.id,
    joinDisabled,
    joinTeammateNames,
    joinTeamName,
    maxTeammateSlots,
    onTournamentMutated,
  ]);

  const rulesSourceItem = rulesDetail ?? item;
  const rulesLobbyText =
    rulesSourceItem.lobbyRulesText ?? "";
  const rulesStructured =
    rulesSourceItem.rulesRecord ?? null;
  const structuredText = formatRulesRecordForDisplay(rulesStructured);
  const rulesParsed = useMemo(
    () => parseUserTournamentRules(rulesLobbyText, rulesStructured),
    [rulesLobbyText, rulesStructured],
  );
  const hasStructuredRulesUi =
    Boolean(rulesParsed.matchTitle) ||
    Boolean(rulesParsed.matchSubtitle) ||
    rulesParsed.lobbyBullets.length > 0 ||
    rulesParsed.fairPlayBullets.length > 0 ||
    Boolean(rulesParsed.killPointsLine) ||
    rulesParsed.positionRows.length > 0;

  const hasPointTableContent =
    Boolean(rulesParsed.killPointsLine) ||
    rulesParsed.positionRows.length > 0;

  const roomIdDisplay =
    rulesSourceItem.lobbyRoomId ?? item.lobbyRoomId ?? null;
  const roomPasswordDisplay =
    rulesSourceItem.lobbyRoomPassword ?? item.lobbyRoomPassword ?? null;
  const hasRoomCredentials =
    Boolean(String(roomIdDisplay ?? "").trim()) ||
    Boolean(String(roomPasswordDisplay ?? "").trim());

  const iconBtn = (opts: {
    name: React.ComponentProps<typeof FontAwesome>["name"];
    label: string;
    onPress: () => void;
  }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={opts.label}
      onPress={opts.onPress}
      hitSlop={10}
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: h(8),
        paddingHorizontal: w(12),
        borderRadius: w(10),
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        minWidth: w(72),
      }}
    >
      <FontAwesome name={opts.name} size={w(20)} color={colors.tint} />
      <Text
        style={{
          fontSize: w(10),
          fontWeight: "600",
          color: colors.tabIconDefault,
          marginTop: h(4),
        }}
        numberOfLines={1}
      >
        {opts.label}
      </Text>
    </Pressable>
  );

  return (
    <View
      style={{
        paddingVertical: h(14),
        paddingHorizontal: w(14),
        borderRadius: w(12),
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.cardBg,
        marginBottom: h(10),
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: w(40),
            height: w(40),
            borderRadius: w(20),
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.tint + "22",
            marginRight: w(12),
          }}
        >
          <FontAwesome name="trophy" size={w(18)} color={colors.tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingRight: w(6) }}>
          <Text
            style={{
              fontSize: w(15),
              fontWeight: "700",
              color: colors.text,
              lineHeight: w(20),
            }}
            numberOfLines={2}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              style={{
                fontSize: w(12),
                color: colors.tabIconDefault,
                marginTop: h(4),
                lineHeight: w(16),
              }}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {statusLabel ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: statusColor + "55",
              backgroundColor: statusColor + "18",
              paddingHorizontal: w(8),
              paddingVertical: h(4),
              borderRadius: w(8),
              maxWidth: "42%",
            }}
          >
            <Text
              style={{
                fontSize: w(11),
                fontWeight: "700",
                color: statusColor,
              }}
              numberOfLines={2}
            >
              {statusLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {statCells.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginTop: h(14),
            paddingTop: h(4),
            gap: w(10),
          }}
        >
          {statCells.map((cell) => (
            <View key={cell.key} style={{ width: statColWidth }}>
              <Text
                style={{
                  fontSize: w(11),
                  color: colors.tabIconDefault,
                  fontWeight: "600",
                }}
                numberOfLines={1}
              >
                {cell.caption}
              </Text>
              <Text
                style={{
                  fontSize: w(13),
                  fontWeight: "600",
                  color: colors.text,
                  marginTop: h(4),
                }}
                numberOfLines={2}
              >
                {cell.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View
        style={{
          marginTop: h(14),
          padding: w(12),
          borderRadius: w(12),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            fontSize: w(12),
            fontWeight: "700",
            color: colors.text,
            marginBottom: h(8),
          }}
        >
          Room ID & password
        </Text>
        {hasRoomCredentials ? (
          <>
            {roomIdDisplay ? (
              <View style={{ marginBottom: h(8) }}>
                <Text
                  style={{
                    fontSize: w(11),
                    color: colors.tabIconDefault,
                    marginBottom: h(2),
                  }}
                >
                  Room ID
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: w(14),
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {String(roomIdDisplay).trim()}
                </Text>
              </View>
            ) : null}
            {roomPasswordDisplay ? (
              <View>
                <Text
                  style={{
                    fontSize: w(11),
                    color: colors.tabIconDefault,
                    marginBottom: h(2),
                  }}
                >
                  Password
                </Text>
                <Text
                  selectable
                  style={{
                    fontSize: w(14),
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {String(roomPasswordDisplay).trim()}
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={{ fontSize: w(12), color: colors.tabIconDefault, lineHeight: w(18) }}>
            The host will set the custom room ID and password here after the lobby
            is ready. Check back before match time.
          </Text>
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: w(10),
          marginTop: h(14),
        }}
      >
        {iconBtn({
          name: "book",
          label: "Rules",
          onPress: () => setRulesOpen(true),
        })}
        {iconBtn({
          name: "list-ol",
          label: "Results",
          onPress: () => setResultsOpen(true),
        })}
      </View>

      <View style={{ marginTop: h(12), gap: h(10) }}>
        {isCurrentUserJoined ? (
          <Button title="Joined" disabled fullWidth onPress={() => {}} />
        ) : (
          <Button
            title="Join"
            onPress={openJoinModal}
            disabled={joinDisabled}
            fullWidth
          />
        )}
        <Button
          title="View joined teams"
          variant="outline"
          onPress={() => setTeamsOpen(true)}
          fullWidth
        />
      </View>

      <Modal
        visible={joinModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!joining) setJoinModalOpen(false);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: w(20),
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <Pressable
            style={{ position: "absolute", inset: 0 }}
            onPress={() => {
              if (!joining) setJoinModalOpen(false);
            }}
          />
          <View
            style={{
              maxHeight: "85%",
              borderRadius: w(16),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardBg ?? colors.background,
              paddingHorizontal: w(16),
              paddingVertical: h(12),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: h(8),
              }}
            >
              <Text
                style={{
                  fontSize: w(16),
                  fontWeight: "700",
                  color: colors.text,
                  flex: 1,
                }}
              >
                Join tournament
              </Text>
              <Pressable
                onPress={() => {
                  if (!joining) setJoinModalOpen(false);
                }}
                hitSlop={12}
              >
                <Text style={{ color: colors.tint, fontWeight: "600" }}>
                  Close
                </Text>
              </Pressable>
            </View>
            <Text
              style={{
                fontSize: w(12),
                color: colors.tabIconDefault,
                marginBottom: h(10),
                lineHeight: w(18),
              }}
            >
              Entry fee is deducted from your wallet on confirm. Status must be
              upcoming or locked. Add up to four teammate in-game names
              (optional); API allows up to {maxTeammateSlots} names for this mode.
            </Text>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Input
                label="Team name"
                value={joinTeamName}
                onChangeText={setJoinTeamName}
                placeholder="e.g. Thunder Squad"
                editable={!joining}
              />
              <Text
                style={{
                  fontSize: w(14),
                  fontWeight: "500",
                  marginBottom: h(4),
                  color: colors.text,
                }}
              >
                Teammate names (optional)
              </Text>
              <Text
                style={{
                  fontSize: w(12),
                  color: colors.tabIconDefault,
                  marginBottom: h(10),
                }}
              >
                One name per box. Empty boxes are ignored.
              </Text>
              {([0, 1, 2, 3] as const).map((i) => (
                <Input
                  key={i}
                  label={`Teammate ${i + 1}`}
                  value={joinTeammateNames[i]}
                  onChangeText={(text) =>
                    setJoinTeammateNames((prev) => {
                      const next: [string, string, string, string] = [...prev];
                      next[i] = text;
                      return next;
                    })
                  }
                  placeholder={`Player name ${i + 1}`}
                  editable={!joining}
                />
              ))}
              {joinFormError ? (
                <Text
                  style={{
                    color: "#dc3545",
                    fontSize: w(12),
                    marginBottom: h(8),
                  }}
                >
                  {joinFormError}
                </Text>
              ) : null}
              <View style={{ gap: h(10), marginBottom: h(8) }}>
                <Button
                  title={joining ? "Joining…" : "Confirm join"}
                  onPress={() => void submitJoin()}
                  disabled={joining}
                  fullWidth
                />
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    if (!joining) setJoinModalOpen(false);
                  }}
                  disabled={joining}
                  fullWidth
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rulesOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRulesOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: w(20),
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <Pressable
            style={{ position: "absolute", inset: 0 }}
            onPress={() => setRulesOpen(false)}
          />
          <View
            style={{
              width: "100%",
              maxWidth: w(400),
              alignSelf: "center",
              maxHeight: "78%",
              borderRadius: w(14),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardBg ?? colors.background,
              paddingHorizontal: w(14),
              paddingVertical: h(8),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: h(4),
              }}
            >
              <Text
                style={{
                  fontSize: w(15),
                  fontWeight: "700",
                  color: colors.text,
                  flex: 1,
                }}
              >
                Rules
              </Text>
              <Pressable onPress={() => setRulesOpen(false)} hitSlop={12}>
                <Text style={{ color: colors.tint, fontWeight: "600" }}>
                  Close
                </Text>
              </Pressable>
            </View>
            {rulesLoading ? (
              <ActivityIndicator color={colors.tint} style={{ marginVertical: h(24) }} />
            ) : hasStructuredRulesUi ? (
              <View
                style={{
                  width: "100%",
                  height: h(320),
                }}
              >
                {rulesParsed.matchTitle ? (
                  <Text
                    style={{
                      fontSize: w(15),
                      fontWeight: "700",
                      color: colors.text,
                      marginBottom: h(2),
                    }}
                    numberOfLines={2}
                  >
                    {rulesParsed.matchTitle}
                  </Text>
                ) : null}
                {rulesParsed.matchSubtitle ? (
                  <Text
                    style={{
                      fontSize: w(12),
                      color: colors.tint,
                      fontWeight: "600",
                      marginBottom: h(6),
                    }}
                    numberOfLines={1}
                  >
                    {rulesParsed.matchSubtitle}
                  </Text>
                ) : null}
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.border,
                    marginBottom: h(6),
                  }}
                />
                <View
                  style={{
                    backgroundColor: colors.inputBg,
                    borderRadius: w(10),
                    padding: w(4),
                    marginBottom: h(6),
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: w(6), paddingHorizontal: w(2) }}
                  >
                    {(
                      [
                        { id: "lobby" as const, label: "Lobby rules" },
                        { id: "points" as const, label: "Point table" },
                        { id: "fair" as const, label: "Fair play" },
                      ] as const
                    ).map((tab) => {
                      const active = rulesTab === tab.id;
                      return (
                        <Pressable
                          key={tab.id}
                          onPress={() => setRulesTab(tab.id)}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: active }}
                          style={{
                            paddingVertical: h(6),
                            paddingHorizontal: w(11),
                            borderRadius: w(999),
                            borderWidth: active ? 0 : 1,
                            borderColor: colors.border,
                            backgroundColor: active ? colors.tint : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: w(11),
                              fontWeight: "700",
                              color: active ? "#FFFFFF" : colors.text,
                            }}
                            numberOfLines={1}
                          >
                            {tab.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled
                  style={{ flex: 1, minHeight: 0 }}
                  contentContainerStyle={{ paddingBottom: h(8) }}
                >
                  {rulesTab === "lobby" ? (
                    rulesParsed.lobbyBullets.length > 0 ? (
                      <View>
                        {rulesParsed.lobbyBullets.map((line, idx) => (
                          <View
                            key={`${idx}-${line.slice(0, 24)}`}
                            style={{
                              flexDirection: "row",
                              alignItems: "flex-start",
                              marginBottom: h(5),
                              paddingRight: w(2),
                            }}
                          >
                            <FontAwesome
                              name="circle"
                              size={w(5)}
                              color={colors.tint}
                              style={{ marginTop: h(6), marginRight: w(8) }}
                            />
                            <Text
                              style={{
                                flex: 1,
                                fontSize: w(12),
                                color: colors.text,
                                lineHeight: w(17),
                              }}
                            >
                              {line}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <ClassicEmptyState
                        variant="info"
                        title="No lobby rules listed"
                        message="Organizer has not added format or lobby details here."
                      />
                    )
                  ) : null}
                  {rulesTab === "points" ? (
                    hasPointTableContent ? (
                      <View
                        style={{
                          borderRadius: w(10),
                          borderWidth: 1,
                          borderColor: colors.border,
                          padding: w(8),
                          backgroundColor: colors.background,
                        }}
                      >
                        {rulesParsed.killPointsLine ? (
                          <View
                            style={{
                              marginBottom: h(8),
                              paddingVertical: h(6),
                              paddingHorizontal: w(8),
                              borderRadius: w(8),
                              backgroundColor: colors.tint + "18",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: w(10),
                                fontWeight: "700",
                                color: colors.tint,
                                marginBottom: h(2),
                              }}
                            >
                              Kill points
                            </Text>
                            <Text
                              style={{
                                fontSize: w(12),
                                color: colors.text,
                                lineHeight: w(17),
                              }}
                            >
                              {rulesParsed.killPointsLine}
                            </Text>
                          </View>
                        ) : null}
                        {rulesParsed.positionRows.length > 0 ? (
                          <View style={{ marginTop: h(2) }}>
                            <View
                              style={{
                                flexDirection: "row",
                                paddingBottom: h(4),
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                              }}
                            >
                              <Text
                                style={{
                                  flex: 1,
                                  fontSize: w(10),
                                  fontWeight: "700",
                                  color: colors.tabIconDefault,
                                }}
                              >
                                Position
                              </Text>
                              <Text
                                style={{
                                  width: w(48),
                                  textAlign: "right",
                                  fontSize: w(10),
                                  fontWeight: "700",
                                  color: colors.tabIconDefault,
                                }}
                              >
                                Points
                              </Text>
                            </View>
                            {rulesParsed.positionRows.map((row, idx) => (
                              <View
                                key={`${row.label}-${idx}`}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  paddingVertical: h(4),
                                  borderBottomWidth:
                                    idx < rulesParsed.positionRows.length - 1 ? 1 : 0,
                                  borderBottomColor: colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    flex: 1,
                                    fontSize: w(12),
                                    color: colors.text,
                                    paddingRight: w(6),
                                  }}
                                >
                                  {row.label}
                                </Text>
                                <Text
                                  style={{
                                    width: w(48),
                                    textAlign: "right",
                                    fontSize: w(13),
                                    fontWeight: "700",
                                    color: colors.tint,
                                  }}
                                >
                                  {row.points}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <ClassicEmptyState
                        variant="info"
                        title="No point table"
                        message="Kill points and placement scoring will show here when configured."
                      />
                    )
                  ) : null}
                  {rulesTab === "fair" ? (
                    <View>
                      <View
                        style={{
                          borderLeftWidth: w(3),
                          borderLeftColor: "#f97316",
                          backgroundColor: "#f9731618",
                          paddingVertical: h(6),
                          paddingHorizontal: w(8),
                          borderRadius: w(8),
                          marginBottom: h(8),
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: h(4),
                          }}
                        >
                          <FontAwesome
                            name="exclamation-triangle"
                            size={w(13)}
                            color="#f97316"
                            style={{ marginRight: w(6) }}
                          />
                          <Text
                            style={{
                              fontSize: w(12),
                              fontWeight: "700",
                              color: colors.text,
                            }}
                          >
                            Cheating & conduct
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: w(11),
                            color: colors.tabIconDefault,
                            lineHeight: w(16),
                          }}
                        >
                          Breaking fair-play rules can lead to disqualification, loss of
                          prizes, wallet or account penalties, or permanent bans — as
                          decided by organizers and platform policy.
                        </Text>
                      </View>
                      {rulesParsed.fairPlayBullets.length > 0 ? (
                        <View>
                          {rulesParsed.fairPlayBullets.map((line, idx) => (
                            <View
                              key={`${idx}-${line.slice(0, 24)}`}
                              style={{
                                flexDirection: "row",
                                alignItems: "flex-start",
                                marginBottom: h(5),
                                paddingRight: w(2),
                              }}
                            >
                              <FontAwesome
                                name="ban"
                                size={w(10)}
                                color="#f97316"
                                style={{ marginTop: h(4), marginRight: w(8) }}
                              />
                              <Text
                                style={{
                                  flex: 1,
                                  fontSize: w(12),
                                  color: colors.text,
                                  lineHeight: w(17),
                                }}
                              >
                                {line}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <ClassicEmptyState
                          variant="info"
                          title="No extra fair-play list"
                          message="There are no separate anti-cheat lines from the organizer. You must still follow every lobby rule and honest play."
                        />
                      )}
                    </View>
                  ) : null}
                </ScrollView>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {!hasStructuredRulesUi && rulesLobbyText ? (
                  <Text
                    style={{
                      fontSize: w(13),
                      color: colors.text,
                      lineHeight: w(20),
                      marginBottom: h(12),
                    }}
                  >
                    {rulesLobbyText}
                  </Text>
                ) : null}
                {!hasStructuredRulesUi && structuredText ? (
                  <Text
                    style={{
                      fontSize: w(12),
                      color: colors.tabIconDefault,
                      lineHeight: w(18),
                      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    }}
                  >
                    {structuredText}
                  </Text>
                ) : null}
                {!hasStructuredRulesUi &&
                !rulesLobbyText &&
                !structuredText &&
                !rulesLoading ? (
                  <ClassicEmptyState
                    variant="info"
                    title="No rules published"
                    message="Rules and point table will appear here when the organizer adds them."
                  />
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={teamsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTeamsOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: w(20),
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <Pressable
            style={{ position: "absolute", inset: 0 }}
            onPress={() => setTeamsOpen(false)}
          />
          <View
            style={{
              maxHeight: "75%",
              borderRadius: w(16),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardBg ?? colors.background,
              paddingHorizontal: w(16),
              paddingVertical: h(12),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: h(8),
              }}
            >
              <Text
                style={{
                  fontSize: w(16),
                  fontWeight: "700",
                  color: colors.text,
                  flex: 1,
                }}
              >
                Joined teams (by slot)
              </Text>
              <Pressable onPress={() => setTeamsOpen(false)} hitSlop={12}>
                <Text style={{ color: colors.tint, fontWeight: "600" }}>
                  Close
                </Text>
              </Pressable>
            </View>
            {teamsLoading ? (
              <ActivityIndicator color={colors.tint} style={{ marginVertical: h(24) }} />
            ) : teamsError ? (
              <ClassicEmptyState variant="error" title="Could not load" message={teamsError}>
                <Button title="Retry" variant="outline" onPress={() => void loadTeams()} />
              </ClassicEmptyState>
            ) : teamsRows.length === 0 ? (
              <ClassicEmptyState
                title="No teams yet"
                message="Slots will show here as players join."
              />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {item.joinedTeamsList !== undefined &&
                item.joinedTeamsList.length === 0 ? (
                  <Text
                    style={{
                      fontSize: w(13),
                      color: colors.tabIconDefault,
                      marginBottom: h(12),
                      fontWeight: "600",
                    }}
                  >
                    No team joined
                  </Text>
                ) : null}
                {teamsRows.map((row, idx) => (
                  <View
                    key={`${row.slotLabel}-${idx}`}
                    style={{
                      paddingVertical: h(10),
                      borderBottomWidth: idx < teamsRows.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: w(11),
                        fontWeight: "700",
                        color: colors.tint,
                        marginBottom: h(4),
                      }}
                    >
                      {row.slotLabel}
                    </Text>
                    {row.primaryText.trim() ? (
                      <Text
                        style={{
                          fontSize: w(14),
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {row.primaryText}
                      </Text>
                    ) : (
                      <View style={{ minHeight: h(22) }} />
                    )}
                    {row.secondaryText ? (
                      <Text
                        style={{
                          fontSize: w(12),
                          color: colors.tabIconDefault,
                          marginTop: h(2),
                        }}
                      >
                        {row.secondaryText}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={resultsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setResultsOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: w(20),
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <Pressable
            style={{ position: "absolute", inset: 0 }}
            onPress={() => setResultsOpen(false)}
          />
          <View
            style={{
              maxHeight: "80%",
              borderRadius: w(16),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardBg ?? colors.background,
              paddingHorizontal: w(16),
              paddingVertical: h(12),
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: h(8),
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: w(16),
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  Live results
                </Text>
                {liveResultsMeta ? (
                  <Text
                    style={{
                      fontSize: w(11),
                      color: colors.tabIconDefault,
                      marginTop: h(2),
                    }}
                    numberOfLines={2}
                  >
                    {liveResultsMeta}
                  </Text>
                ) : null}
                {resultsLiveNote ? (
                  <Text
                    style={{
                      fontSize: w(11),
                      color: colors.tabIconDefault,
                      marginTop: h(2),
                    }}
                  >
                    {resultsLiveNote}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => setResultsOpen(false)} hitSlop={12}>
                <Text style={{ color: colors.tint, fontWeight: "600" }}>
                  Close
                </Text>
              </Pressable>
            </View>
            {hasLiveResultsData ? (
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: h(420) }}
              >
                {liveResults.standings.length > 0 ? (
                  <View style={{ marginBottom: h(16) }}>
                    <Text
                      style={{
                        fontSize: w(12),
                        fontWeight: "700",
                        color: colors.text,
                        marginBottom: h(6),
                      }}
                    >
                      Standings
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ minWidth: w(340) }}>
                        <View
                          style={{
                            flexDirection: "row",
                            paddingVertical: h(8),
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          }}
                        >
                          {[
                            { k: "#", flex: 0.7 },
                            { k: "Team", flex: 2.2 },
                            { k: "Pts", flex: 1 },
                            { k: "Kills", flex: 1 },
                            { k: "BY", flex: 0.8 },
                            { k: "Pos", flex: 1 },
                          ].map((col) => (
                            <Text
                              key={col.k}
                              style={{
                                flex: col.flex,
                                fontSize: w(10),
                                fontWeight: "700",
                                color: colors.tabIconDefault,
                              }}
                            >
                              {col.k}
                            </Text>
                          ))}
                        </View>
                        {liveResults.standings.map((row, idx) => (
                          <View
                            key={`${row.teamName}-${row.position}-${idx}`}
                            style={{
                              flexDirection: "row",
                              paddingVertical: h(10),
                              borderBottomWidth:
                                idx < liveResults.standings.length - 1 ? 1 : 0,
                              borderBottomColor: colors.border,
                            }}
                          >
                            <Text
                              style={{
                                flex: 0.7,
                                fontSize: w(13),
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {row.position}
                            </Text>
                            <Text
                              style={{ flex: 2.2, fontSize: w(13), color: colors.text }}
                              numberOfLines={2}
                            >
                              {row.teamName}
                            </Text>
                            <Text style={{ flex: 1, fontSize: w(13), color: colors.text }}>
                              {row.totalPoint}
                            </Text>
                            <Text style={{ flex: 1, fontSize: w(13), color: colors.text }}>
                              {row.kills}
                            </Text>
                            <Text style={{ flex: 0.8, fontSize: w(13), color: colors.text }}>
                              {row.booyah}
                            </Text>
                            <Text style={{ flex: 1, fontSize: w(13), color: colors.text }}>
                              {row.totalPositionPoints}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ) : null}

                {liveResults.matchResults.filter((m) => m.teams.length > 0).map((m) => (
                  <View key={m.matchIndex} style={{ marginBottom: h(14) }}>
                    <Text
                      style={{
                        fontSize: w(12),
                        fontWeight: "700",
                        color: colors.text,
                        marginBottom: h(6),
                      }}
                    >
                      Match {m.matchIndex + 1}
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ minWidth: w(340) }}>
                        <View
                          style={{
                            flexDirection: "row",
                            paddingVertical: h(8),
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          }}
                        >
                          {[
                            { k: "#", flex: 0.7 },
                            { k: "Team", flex: 2.2 },
                            { k: "K", flex: 0.7 },
                            { k: "Pos", flex: 0.9 },
                            { k: "Pts", flex: 0.9 },
                            { k: "BY", flex: 0.7 },
                          ].map((col) => (
                            <Text
                              key={col.k}
                              style={{
                                flex: col.flex,
                                fontSize: w(10),
                                fontWeight: "700",
                                color: colors.tabIconDefault,
                              }}
                            >
                              {col.k}
                            </Text>
                          ))}
                        </View>
                        {m.teams.map((t, idx) => (
                          <View
                            key={`${m.matchIndex}-${t.teamName}-${idx}`}
                            style={{
                              flexDirection: "row",
                              paddingVertical: h(10),
                              borderBottomWidth: idx < m.teams.length - 1 ? 1 : 0,
                              borderBottomColor: colors.border,
                            }}
                          >
                            <Text
                              style={{
                                flex: 0.7,
                                fontSize: w(13),
                                color: colors.text,
                                fontWeight: "600",
                              }}
                            >
                              {t.position}
                            </Text>
                            <Text
                              style={{ flex: 2.2, fontSize: w(13), color: colors.text }}
                              numberOfLines={2}
                            >
                              {t.teamName}
                            </Text>
                            <Text style={{ flex: 0.7, fontSize: w(13), color: colors.text }}>
                              {t.kills}
                            </Text>
                            <Text style={{ flex: 0.9, fontSize: w(13), color: colors.text }}>
                              {t.positionPoints}
                            </Text>
                            <Text style={{ flex: 0.9, fontSize: w(13), color: colors.text }}>
                              {t.totalPoint}
                            </Text>
                            <Text style={{ flex: 0.7, fontSize: w(13), color: colors.text }}>
                              {t.booyah}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                ))}
              </ScrollView>
            ) : resultsPreviewSlots.length > 0 ? (
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: h(420) }}
              >
                <Text
                  style={{
                    fontSize: w(12),
                    fontWeight: "700",
                    color: colors.text,
                    marginBottom: h(6),
                  }}
                >
                  Teams by slot
                </Text>
                <Text
                  style={{
                    fontSize: w(11),
                    color: colors.tabIconDefault,
                    marginBottom: h(10),
                  }}
                >
                  Pts, KP, and Booyah show 0 until the host submits match results.
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ minWidth: w(320) }}>
                    <View
                      style={{
                        flexDirection: "row",
                        paddingVertical: h(8),
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      {[
                        { k: "Slot", flex: 1.1 },
                        { k: "Team", flex: 2.4 },
                        { k: "Pts", flex: 0.8 },
                        { k: "KP", flex: 0.8 },
                        { k: "Booyah", flex: 0.9 },
                      ].map((col) => (
                        <Text
                          key={col.k}
                          style={{
                            flex: col.flex,
                            fontSize: w(10),
                            fontWeight: "700",
                            color: colors.tabIconDefault,
                          }}
                        >
                          {col.k}
                        </Text>
                      ))}
                    </View>
                    {resultsPreviewSlots.map((row, idx) => (
                      <View
                        key={`${row.slotLabel}-${idx}`}
                        style={{
                          flexDirection: "row",
                          paddingVertical: h(10),
                          borderBottomWidth:
                            idx < resultsPreviewSlots.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                        }}
                      >
                        <Text
                          style={{
                            flex: 1.1,
                            fontSize: w(13),
                            color: colors.text,
                            fontWeight: "600",
                          }}
                        >
                          {row.slotLabel}
                        </Text>
                        <Text
                          style={{ flex: 2.4, fontSize: w(13), color: colors.text }}
                          numberOfLines={2}
                        >
                          {row.primaryText.trim() ? row.primaryText : "—"}
                        </Text>
                        <Text style={{ flex: 0.8, fontSize: w(13), color: colors.text }}>
                          0
                        </Text>
                        <Text style={{ flex: 0.8, fontSize: w(13), color: colors.text }}>
                          0
                        </Text>
                        <Text style={{ flex: 0.9, fontSize: w(13), color: colors.text }}>
                          0
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            ) : resultsLoading || resultsSlotsLoading ? (
              <ActivityIndicator color={colors.tint} style={{ marginVertical: h(24) }} />
            ) : resultsError ? (
              <ClassicEmptyState variant="error" title="Could not load" message={resultsError}>
                <Button title="Retry" variant="outline" onPress={() => void loadResults()} />
              </ClassicEmptyState>
            ) : (
              <ClassicEmptyState
                title="No results yet"
                message="No team slots to show yet. Join the lobby or check back after teams register."
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
