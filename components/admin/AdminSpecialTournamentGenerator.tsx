import { Button, Card, ClassicEmptyState, Input } from "@/components/ui";
import Colors from "@/constants/Colors";
import { useAuth } from "@/context/AuthContext";
import {
    cancelAdminSpecialTournament,
    createAdminSpecialTournament,
    fetchAdminGamesCatalog,
    openAdminSpecialTournamentRegistration,
} from "@/services/admin.service";
import { ApiError } from "@/services/api.service";
import { useAppDispatch } from "@/store/hooks";
import { hideLoader, showLoader } from "@/store/slices/loaderSlice";
import type { AdminCatalogGame } from "@/types/admin";
import { isAdminUser } from "@/utils/adminUser";
import { formatDateDdMmYyyy } from "@/utils/date";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { ChangeEvent } from "react";
import React, {
    createElement,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

const MODES = ["BR", "CS"] as const;
const SUB_MODES = ["solo", "duo", "squad"] as const;

function parsePositiveInt(raw: string, label: string): number {
  const s = String(raw ?? "").trim();
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw new Error(`${label} must be a whole number ≥ 1`);
  }
  return n;
}

function parsePercent(raw: string, label: string): number {
  const s = String(raw ?? "").trim();
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error(`${label} must be between 0 and 100`);
  }
  return Math.round(n * 10) / 10;
}

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdToDate(s: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(y, mo - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

function startOfTodayYmd(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return ymdFromDate(d);
}

function defaultScheduleYmds(): {
  registrationStartYmd: string;
  registrationEndYmd: string;
  tournamentStartYmd: string;
  tournamentEndYmd: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const regEnd = new Date(today);
  regEnd.setDate(regEnd.getDate() + 7);
  const tourStart = new Date(today);
  tourStart.setDate(tourStart.getDate() + 8);
  const tourEnd = new Date(today);
  tourEnd.setDate(tourEnd.getDate() + 8);
  return {
    registrationStartYmd: ymdFromDate(today),
    registrationEndYmd: ymdFromDate(regEnd),
    tournamentStartYmd: ymdFromDate(tourStart),
    tournamentEndYmd: ymdFromDate(tourEnd),
  };
}

/** Parse HH:mm (24h). */
function parseHm(raw: string, label: string): { h: number; m: number } {
  const s = String(raw ?? "").trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!match) {
    throw new Error(`${label}: use 24h format HH:mm (e.g. 14:00)`);
  }
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (
    !Number.isInteger(hh) ||
    !Number.isInteger(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    throw new Error(`${label}: invalid time`);
  }
  return { h: hh, m: mm };
}

/** Local wall time → ISO string (UTC Z) as in Swagger examples. */
function localYmdHmToIso(ymd: string, hm: string, label: string): string {
  const d = parseYmdToDate(ymd);
  if (!d) throw new Error(`${label}: invalid date`);
  const { h, m } = parseHm(hm, label);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function YmdDateField({
  label,
  valueYmd,
  onChangeYmd,
  colors,
  w,
  h,
  minYmd,
}: {
  label: string;
  valueYmd: string;
  onChangeYmd: (v: string) => void;
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  h: (n: number) => number;
  minYmd?: string;
}) {
  const display = formatDateDdMmYyyy(valueYmd);
  const valid = parseYmdToDate(valueYmd) != null;

  return (
    <View style={{ flex: 1, minWidth: w(140) }}>
      <Text
        style={{
          fontSize: w(11),
          fontWeight: "600",
          color: colors.text,
          marginBottom: h(6),
        }}
      >
        {label}
      </Text>
      {Platform.OS === "web" ? (
        createElement("input", {
          type: "date",
          value: valueYmd,
          min: minYmd,
          "aria-label": label,
          onChange: (e: ChangeEvent<HTMLInputElement>) =>
            onChangeYmd(e.target.value),
          style: {
            width: "100%",
            boxSizing: "border-box",
            padding: 10,
            fontSize: 15,
            borderRadius: 10,
            border: `1.5px solid ${colors.border}`,
            backgroundColor: colors.inputBg,
            color: colors.text,
          },
        })
      ) : (
        <TextInput
          value={valueYmd}
          onChangeText={onChangeYmd}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.tabIconDefault}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: w(10),
            paddingHorizontal: w(10),
            paddingVertical: h(10),
            fontSize: w(14),
            color: colors.text,
            backgroundColor: colors.inputBg,
          }}
        />
      )}
      <Text
        style={{
          fontSize: w(10),
          color: valid ? colors.tabIconDefault : colors.accent,
          marginTop: h(4),
        }}
      >
        {valid ? display : "YYYY-MM-DD"}
      </Text>
    </View>
  );
}

function TimeHmField({
  label,
  valueHm,
  onChangeHm,
  colors,
  w,
  h,
}: {
  label: string;
  valueHm: string;
  onChangeHm: (v: string) => void;
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  h: (n: number) => number;
}) {
  let ok = false;
  try {
    parseHm(valueHm, "");
    ok = true;
  } catch {
    ok = false;
  }

  return (
    <View style={{ flex: 1, minWidth: w(100) }}>
      <Text
        style={{
          fontSize: w(11),
          fontWeight: "600",
          color: colors.text,
          marginBottom: h(6),
        }}
      >
        {label}
      </Text>
      {Platform.OS === "web" ? (
        createElement("input", {
          type: "time",
          value: valueHm,
          step: 60,
          "aria-label": label,
          onChange: (e: ChangeEvent<HTMLInputElement>) =>
            onChangeHm(e.target.value),
          style: {
            width: "100%",
            boxSizing: "border-box",
            padding: 10,
            fontSize: 15,
            borderRadius: 10,
            border: `1.5px solid ${colors.border}`,
            backgroundColor: colors.inputBg,
            color: colors.text,
          },
        })
      ) : (
        <TextInput
          value={valueHm}
          onChangeText={onChangeHm}
          placeholder="HH:mm"
          placeholderTextColor={colors.tabIconDefault}
          autoCapitalize="none"
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: w(10),
            paddingHorizontal: w(10),
            paddingVertical: h(10),
            fontSize: w(14),
            color: colors.text,
            backgroundColor: colors.inputBg,
          }}
        />
      )}
      <Text
        style={{
          fontSize: w(10),
          color: ok ? colors.tabIconDefault : colors.accent,
          marginTop: h(4),
        }}
      >
        {ok ? "24h" : "HH:mm"}
      </Text>
    </View>
  );
}

type Props = {
  colors: (typeof Colors)["light"];
  w: (n: number) => number;
  h: (n: number) => number;
};

export function AdminSpecialTournamentGenerator({ colors, w, h }: Props) {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();

  const initialSchedule = useMemo(() => defaultScheduleYmds(), []);
  const [registrationStartYmd, setRegistrationStartYmd] = useState(
    initialSchedule.registrationStartYmd,
  );
  const [registrationEndYmd, setRegistrationEndYmd] = useState(
    initialSchedule.registrationEndYmd,
  );
  const [tournamentStartYmd, setTournamentStartYmd] = useState(
    initialSchedule.tournamentStartYmd,
  );
  const [tournamentEndYmd, setTournamentEndYmd] = useState(
    initialSchedule.tournamentEndYmd,
  );

  const [regStartTime, setRegStartTime] = useState("10:00");
  const [regEndTime, setRegEndTime] = useState("23:59");
  const [tourStartTime, setTourStartTime] = useState("14:00");
  const [tourEndTime, setTourEndTime] = useState("22:00");
  const [scheduledTime, setScheduledTime] = useState("18:00");

  const [catalogGames, setCatalogGames] = useState<AdminCatalogGame[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [gameSearchQuery, setGameSearchQuery] = useState("");

  const [tournamentName, setTournamentName] = useState("");
  const [selectedGameSlug, setSelectedGameSlug] = useState("");
  const [mode, setMode] = useState<(typeof MODES)[number]>("BR");
  const [subMode, setSubMode] = useState<(typeof SUB_MODES)[number]>("squad");
  const [region, setRegion] = useState("Global");
  const [maxSlots, setMaxSlots] = useState("180");
  const [bracketQualifyPerSlot, setBracketQualifyPerSlot] = useState("4");
  const [bracketMatchesPerSlot, setBracketMatchesPerSlot] = useState("3");
  const [prizePool, setPrizePool] = useState("10000");
  const [pctFirst, setPctFirst] = useState("50");
  const [pctSecond, setPctSecond] = useState("30");
  const [pctThird, setPctThird] = useState("20");

  const [logoUrl, setLogoUrl] = useState("");
  const [youtubeStreamUrl, setYoutubeStreamUrl] = useState("");
  const [description, setDescription] = useState("");
  const [sponsorsJson, setSponsorsJson] = useState("");
  const [sponsorInstagram, setSponsorInstagram] = useState("");
  const [sponsorDiscord, setSponsorDiscord] = useState("");
  const [sponsorYoutube, setSponsorYoutube] = useState("");
  const [sponsorTelegram, setSponsorTelegram] = useState("");
  const [sponsorWhatsapp, setSponsorWhatsapp] = useState("");

  const [tournamentId, setTournamentId] = useState("");
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelModalReason, setCancelModalReason] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    fetchAdminGamesCatalog()
      .then((list) => {
        if (cancelled) return;
        setCatalogGames(list);
        setSelectedGameSlug((prev) => {
          if (prev && list.some((g) => g.slug === prev)) return prev;
          const ff = list.find((g) => g.slug.toLowerCase().includes("free"));
          const bgmi = list.find((g) => g.slug.toLowerCase() === "bgmi");
          return ff?.slug ?? bgmi?.slug ?? list[0]?.slug ?? "";
        });
      })
      .catch(() => {
        if (cancelled) return;
        setCatalogError("Could not load games");
        Toast.show({ type: "error", text1: "Failed to load games catalog" });
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);

  const selectedGame = useMemo(
    () => catalogGames.find((g) => g.slug === selectedGameSlug),
    [catalogGames, selectedGameSlug],
  );

  const filteredGames = useMemo(() => {
    const q = gameSearchQuery.trim().toLowerCase();
    if (!q) return catalogGames;
    return catalogGames.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.slug.toLowerCase().includes(q) ||
        (g.platform?.toLowerCase().includes(q) ?? false),
    );
  }, [catalogGames, gameSearchQuery]);

  const reloadCatalog = useCallback(() => {
    if (!isAuthenticated || !isAdminUser(user)) return;
    setCatalogLoading(true);
    setCatalogError(null);
    fetchAdminGamesCatalog()
      .then((list) => {
        setCatalogGames(list);
        setSelectedGameSlug((prev) => {
          if (prev && list.some((g) => g.slug === prev)) return prev;
          const bgmi = list.find((g) => g.slug.toLowerCase() === "bgmi");
          return bgmi?.slug ?? list[0]?.slug ?? "";
        });
      })
      .catch(() => {
        setCatalogError("Could not load games");
        Toast.show({ type: "error", text1: "Failed to load games catalog" });
      })
      .finally(() => setCatalogLoading(false));
  }, [isAuthenticated, user]);

  const buildCreateBody = useCallback((): Record<string, unknown> => {
    const title = tournamentName.trim();
    if (!title) throw new Error("Tournament name is required");
    if (!selectedGame) throw new Error("Select a game from the catalog");

    const pool = parsePositiveInt(prizePool, "Prize pool");
    const slots = parsePositiveInt(maxSlots, "Max slots");
    const qps = parsePositiveInt(
      bracketQualifyPerSlot,
      "Qualify per slot (bracket)",
    );
    const mps = parsePositiveInt(
      bracketMatchesPerSlot,
      "Matches per slot (bracket)",
    );

    const p1 = parsePercent(pctFirst, "1st %");
    const p2 = parsePercent(pctSecond, "2nd %");
    const p3 = parsePercent(pctThird, "3rd %");
    const sum = p1 + p2 + p3;
    if (Math.abs(sum - 100) > 0.5) {
      throw new Error(`Prize % must add to 100 (now ${sum.toFixed(1)}%)`);
    }

    const regStartIso = localYmdHmToIso(
      registrationStartYmd,
      regStartTime,
      "Registration opens",
    );
    const regEndIso = localYmdHmToIso(
      registrationEndYmd,
      regEndTime,
      "Registration closes",
    );
    const tourStartIso = localYmdHmToIso(
      tournamentStartYmd,
      tourStartTime,
      "Tournament starts",
    );
    const tourEndIso = localYmdHmToIso(
      tournamentEndYmd,
      tourEndTime,
      "Tournament ends",
    );

    if (Date.parse(regStartIso) > Date.parse(regEndIso)) {
      throw new Error("Registration: start must be before end");
    }
    if (Date.parse(tourStartIso) > Date.parse(tourEndIso)) {
      throw new Error("Tournament: start must be before end");
    }

    parseHm(scheduledTime.trim(), "Scheduled time (display)");

    const body: Record<string, unknown> = {
      title,
      game: selectedGame.title,
      mode,
      subMode,
      region: region.trim() || "Global",
      maxSlots: slots,
      prizePool: pool,
      bracketAuto: {
        qualifyPerSlot: qps,
        matchesPerSlot: mps,
      },
      prizeDistribution: [
        { position: 1, percent: p1 },
        { position: 2, percent: p2 },
        { position: 3, percent: p3 },
      ],
      registrationPeriodStart: regStartIso,
      registrationPeriodEnd: regEndIso,
      tournamentStartDate: tourStartIso,
      tournamentEndDate: tourEndIso,
      scheduledTime: scheduledTime.trim() || "18:00",
    };

    const logo = logoUrl.trim();
    if (logo) body.logoUrl = logo;
    const yt = youtubeStreamUrl.trim();
    if (yt) body.youtubeStreamUrl = yt;
    const desc = description.trim();
    if (desc) body.description = desc;

    const handles: Record<string, string> = {};
    const ig = sponsorInstagram.trim();
    const dc = sponsorDiscord.trim();
    const sy = sponsorYoutube.trim();
    const tg = sponsorTelegram.trim();
    const wa = sponsorWhatsapp.trim();
    if (ig) handles.instagram = ig;
    if (dc) handles.discord = dc;
    if (sy) handles.youtube = sy;
    if (tg) handles.telegram = tg;
    if (wa) handles.whatsapp = wa;
    if (Object.keys(handles).length > 0) body.sponsorHandles = handles;

    const sj = sponsorsJson.trim();
    if (sj !== "" && sj !== "[]") {
      try {
        const parsed = JSON.parse(sj) as unknown;
        if (!Array.isArray(parsed)) {
          throw new Error("Sponsors must be a JSON array");
        }
        body.sponsors = parsed;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid JSON";
        throw new Error(`Sponsors JSON: ${msg}`);
      }
    }

    return body;
  }, [
    tournamentName,
    selectedGame,
    mode,
    subMode,
    region,
    maxSlots,
    bracketQualifyPerSlot,
    bracketMatchesPerSlot,
    prizePool,
    pctFirst,
    pctSecond,
    pctThird,
    registrationStartYmd,
    registrationEndYmd,
    tournamentStartYmd,
    tournamentEndYmd,
    regStartTime,
    regEndTime,
    tourStartTime,
    tourEndTime,
    scheduledTime,
    logoUrl,
    youtubeStreamUrl,
    description,
    sponsorsJson,
    sponsorInstagram,
    sponsorDiscord,
    sponsorYoutube,
    sponsorTelegram,
    sponsorWhatsapp,
  ]);

  const onCreateDraft = useCallback(async () => {
    let body: Record<string, unknown>;
    try {
      body = buildCreateBody();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check the form";
      Toast.show({ type: "error", text1: msg });
      return;
    }

    dispatch(showLoader());
    try {
      const { id } = await createAdminSpecialTournament(body);
      setTournamentId(id);
      Toast.show({
        type: "success",
        text1: "Tournament created (draft)",
        text2: `Id: ${id}`,
      });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Create failed";
      Toast.show({ type: "error", text1: msg });
    } finally {
      dispatch(hideLoader());
    }
  }, [buildCreateBody, dispatch]);

  const onStart = useCallback(async () => {
    const id = tournamentId.trim();
    if (!id) {
      Toast.show({
        type: "info",
        text1: "Create a tournament first or paste its id",
      });
      return;
    }
    dispatch(showLoader());
    try {
      await openAdminSpecialTournamentRegistration(id);
      Toast.show({ type: "success", text1: "Registration opened" });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Request failed";
      Toast.show({ type: "error", text1: msg });
    } finally {
      dispatch(hideLoader());
    }
  }, [tournamentId, dispatch]);

  const openCancelModal = useCallback(() => {
    const id = tournamentId.trim();
    if (!id) {
      Toast.show({ type: "info", text1: "Enter the tournament id first" });
      return;
    }
    setCancelModalReason("");
    setCancelModalOpen(true);
  }, [tournamentId]);

  const onConfirmCancelFromModal = useCallback(async () => {
    const id = tournamentId.trim();
    const reason = cancelModalReason.trim();
    if (!reason) {
      Toast.show({
        type: "error",
        text1: "Reason required",
        text2: "Players will see this message if the event is cancelled.",
      });
      return;
    }
    setCancelModalOpen(false);
    dispatch(showLoader());
    try {
      await cancelAdminSpecialTournament(id, { reason });
      Toast.show({ type: "success", text1: "Tournament cancelled" });
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Request failed";
      Toast.show({ type: "error", text1: msg });
    } finally {
      dispatch(hideLoader());
    }
  }, [tournamentId, cancelModalReason, dispatch]);

  const sectionLabel = (t: string) => (
    <Text
      style={{
        fontSize: w(11),
        fontWeight: "700",
        color: colors.tabIconDefault,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: h(8),
      }}
    >
      {t}
    </Text>
  );

  const dateTimeRow = (
    title: string,
    ymd: string,
    setYmd: (v: string) => void,
    hm: string,
    setHm: (v: string) => void,
    minYmd?: string,
  ) => (
    <View style={{ marginBottom: h(16) }}>
      <Text
        style={{
          fontSize: w(12),
          fontWeight: "700",
          color: colors.text,
          marginBottom: h(8),
        }}
      >
        {title}
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: w(12),
          alignItems: "flex-start",
        }}
      >
        <YmdDateField
          label="Date"
          valueYmd={ymd}
          onChangeYmd={setYmd}
          minYmd={minYmd}
          colors={colors}
          w={w}
          h={h}
        />
        <TimeHmField
          label="Time (local)"
          valueHm={hm}
          onChangeHm={setHm}
          colors={colors}
          w={w}
          h={h}
        />
      </View>
    </View>
  );

  return (
    <View>
      <Text
        style={{
          fontSize: w(22),
          fontWeight: "700",
          color: colors.text,
          marginBottom: h(6),
        }}
      >
        Tournament generator
      </Text>
      <Text
        style={{
          fontSize: w(12),
          color: colors.tabIconDefault,
          marginBottom: h(16),
          lineHeight: w(18),
        }}
      >
        Payload matches special-tournament create: game title, bracket auto, ISO
        datetimes, optional media & sponsors. Draft → Start opens signup.
      </Text>

      <Card style={{ marginBottom: h(12) }} padded>
        {sectionLabel("Tournament")}
        <Input
          label="Tournament name (title)"
          value={tournamentName}
          onChangeText={setTournamentName}
          placeholder="e.g. Spring FF Open"
        />

        {sectionLabel("Game")}
        <Text
          style={{
            fontSize: w(12),
            color: colors.tabIconDefault,
            marginBottom: h(10),
            lineHeight: w(17),
          }}
        >
          API field <Text style={{ fontWeight: "700" }}>game</Text> uses the
          catalog display name (e.g. &quot;Free Fire&quot;), not the slug.
        </Text>
        {catalogLoading ? (
          <Text style={{ color: colors.tabIconDefault, fontSize: w(13) }}>
            Loading games…
          </Text>
        ) : null}
        {catalogError && !catalogLoading ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: w(10),
              marginBottom: h(10),
              flexWrap: "wrap",
            }}
          >
            <Text style={{ color: colors.accent, fontSize: w(12), flex: 1 }}>
              {catalogError}
            </Text>
            <Pressable onPress={reloadCatalog} hitSlop={8}>
              <Text
                style={{
                  color: colors.tint,
                  fontSize: w(13),
                  fontWeight: "700",
                }}
              >
                Retry
              </Text>
            </Pressable>
          </View>
        ) : null}
        <Pressable
          onPress={() => {
            if (catalogGames.length === 0 || catalogLoading) return;
            setGameSearchQuery("");
            setShowGamePicker(true);
          }}
          disabled={catalogLoading || catalogGames.length === 0}
          style={{
            opacity: catalogLoading || catalogGames.length === 0 ? 0.55 : 1,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderRadius: w(12),
            paddingHorizontal: w(14),
            paddingVertical: h(14),
            backgroundColor: colors.inputBg,
          }}
        >
          <Text
            style={{
              fontSize: w(12),
              color: colors.tabIconDefault,
              marginBottom: h(4),
            }}
          >
            Selected game → sent as &quot;game&quot;
          </Text>
          <Text
            style={{
              fontSize: w(16),
              fontWeight: "600",
              color: colors.text,
            }}
            numberOfLines={2}
          >
            {selectedGame
              ? `${selectedGame.title} · ${selectedGame.slug}`
              : "Tap to choose"}
          </Text>
        </Pressable>

        <View style={{ marginTop: h(14) }}>
          <Input
            label="Region"
            value={region}
            onChangeText={setRegion}
            placeholder="Global"
          />
        </View>

        {sectionLabel("Mode")}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: w(8) }}>
          {MODES.map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={{
                  paddingHorizontal: w(12),
                  paddingVertical: h(8),
                  borderRadius: w(8),
                  borderWidth: 1,
                  borderColor: active ? colors.tint : colors.border,
                  backgroundColor: active ? colors.tint + "22" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: w(13),
                    fontWeight: "600",
                    color: active ? colors.tint : colors.text,
                  }}
                >
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {sectionLabel("Team size (subMode)")}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: w(8),
            marginTop: h(4),
          }}
        >
          {SUB_MODES.map((sm) => {
            const active = subMode === sm;
            return (
              <Pressable
                key={sm}
                onPress={() => setSubMode(sm)}
                style={{
                  paddingHorizontal: w(12),
                  paddingVertical: h(8),
                  borderRadius: w(8),
                  borderWidth: 1,
                  borderColor: active ? colors.tint : colors.border,
                  backgroundColor: active ? colors.tint + "22" : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: w(13),
                    fontWeight: "600",
                    color: active ? colors.tint : colors.text,
                    textTransform: "capitalize",
                  }}
                >
                  {sm}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginBottom: h(12) }} padded>
        {sectionLabel("Bracket & capacity")}
        <Input
          label="Max slots (teams / entries)"
          value={maxSlots}
          onChangeText={setMaxSlots}
          keyboardType="number-pad"
        />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: w(10),
            marginTop: h(10),
          }}
        >
          <View style={{ flex: 1, minWidth: w(140) }}>
            <Input
              label="Qualify per slot (bracketAuto)"
              value={bracketQualifyPerSlot}
              onChangeText={setBracketQualifyPerSlot}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1, minWidth: w(140) }}>
            <Input
              label="Matches per slot (bracketAuto)"
              value={bracketMatchesPerSlot}
              onChangeText={setBracketMatchesPerSlot}
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Text
          style={{
            fontSize: w(11),
            color: colors.tabIconDefault,
            marginTop: h(8),
            lineHeight: w(16),
          }}
        >
          Sent as{" "}
          <Text style={{ fontWeight: "600", color: colors.text }}>
            bracketAuto: {"{"} qualifyPerSlot, matchesPerSlot {"}"}
          </Text>
        </Text>
      </Card>

      <Card style={{ marginBottom: h(12) }} padded>
        {sectionLabel("Schedule (ISO in payload)")}
        <Text
          style={{
            fontSize: w(12),
            color: colors.tabIconDefault,
            marginBottom: h(12),
            lineHeight: w(17),
          }}
        >
          Date + time use your device local timezone, then convert to UTC ISO
          strings (
          <Text style={{ fontWeight: "600" }}>registrationPeriodStart/End</Text>
          , <Text style={{ fontWeight: "600" }}>tournamentStartDate/End</Text>
          ).
        </Text>

        {sectionLabel("Registration")}
        {dateTimeRow(
          "Registration opens",
          registrationStartYmd,
          setRegistrationStartYmd,
          regStartTime,
          setRegStartTime,
          startOfTodayYmd(),
        )}
        {dateTimeRow(
          "Registration closes",
          registrationEndYmd,
          setRegistrationEndYmd,
          regEndTime,
          setRegEndTime,
          registrationStartYmd,
        )}

        {sectionLabel("Tournament run")}
        {dateTimeRow(
          "Tournament starts",
          tournamentStartYmd,
          setTournamentStartYmd,
          tourStartTime,
          setTourStartTime,
          registrationStartYmd,
        )}
        {dateTimeRow(
          "Tournament ends",
          tournamentEndYmd,
          setTournamentEndYmd,
          tourEndTime,
          setTourEndTime,
          tournamentStartYmd,
        )}

        <Input
          label="scheduledTime (display, e.g. main match)"
          value={scheduledTime}
          onChangeText={setScheduledTime}
          placeholder="18:00"
          autoCapitalize="none"
        />
      </Card>

      <Card style={{ marginBottom: h(12) }} padded>
        {sectionLabel("Prize")}
        <Input
          label="Prize pool (GC)"
          value={prizePool}
          onChangeText={setPrizePool}
          keyboardType="number-pad"
        />
        <Text
          style={{
            fontSize: w(11),
            color: colors.tabIconDefault,
            marginTop: h(10),
            marginBottom: h(6),
          }}
        >
          prizeDistribution: position 1 / 2 / 3 — % must total 100.
        </Text>
        <Input
          label="1st place %"
          value={pctFirst}
          onChangeText={setPctFirst}
          keyboardType="decimal-pad"
        />
        <Input
          label="2nd place %"
          value={pctSecond}
          onChangeText={setPctSecond}
          keyboardType="decimal-pad"
        />
        <Input
          label="3rd place %"
          value={pctThird}
          onChangeText={setPctThird}
          keyboardType="decimal-pad"
        />
      </Card>

      <Card style={{ marginBottom: h(12) }} padded>
        {sectionLabel("Optional — branding & copy")}
        <Input
          label="Logo URL"
          value={logoUrl}
          onChangeText={setLogoUrl}
          autoCapitalize="none"
          placeholder="https://…"
        />
        <Input
          label="YouTube stream URL"
          value={youtubeStreamUrl}
          onChangeText={setYoutubeStreamUrl}
          autoCapitalize="none"
        />
        <Text
          style={{
            fontSize: w(11),
            fontWeight: "600",
            color: colors.tabIconDefault,
            marginTop: h(10),
            marginBottom: h(6),
          }}
        >
          Description (rules / notes for players)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Shown in app when backend returns it"
          placeholderTextColor={colors.tabIconDefault}
          multiline
          style={{
            minHeight: h(88),
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: w(10),
            padding: w(12),
            fontSize: w(14),
            color: colors.text,
            backgroundColor: colors.inputBg,
            textAlignVertical: "top",
          }}
        />
      </Card>

      <Card style={{ marginBottom: h(12) }} padded>
        {sectionLabel("Optional — sponsor handles")}
        <Input
          label="Instagram"
          value={sponsorInstagram}
          onChangeText={setSponsorInstagram}
          placeholder="@handle"
          autoCapitalize="none"
        />
        <Input
          label="Discord"
          value={sponsorDiscord}
          onChangeText={setSponsorDiscord}
          placeholder="https://discord.gg/…"
          autoCapitalize="none"
        />
        <Input
          label="YouTube"
          value={sponsorYoutube}
          onChangeText={setSponsorYoutube}
          placeholder="@channel"
          autoCapitalize="none"
        />
        <Input
          label="Telegram"
          value={sponsorTelegram}
          onChangeText={setSponsorTelegram}
          placeholder="https://t.me/…"
          autoCapitalize="none"
        />
        <Input
          label="WhatsApp"
          value={sponsorWhatsapp}
          onChangeText={setSponsorWhatsapp}
          placeholder="https://wa.me/…"
          autoCapitalize="none"
        />
      </Card>

      <Card style={{ marginBottom: h(12) }} padded>
        {sectionLabel("Optional — sponsors JSON")}
        <Text
          style={{
            fontSize: w(11),
            color: colors.tabIconDefault,
            marginBottom: h(8),
          }}
        >
          Array of {"{"} name, logoUrl, link {"}"}. Leave as [] or clear to
          omit.
        </Text>
        <TextInput
          value={sponsorsJson}
          onChangeText={setSponsorsJson}
          placeholder='[{"name":"Sponsor A","logoUrl":"https://...","link":"https://..."}]'
          placeholderTextColor={colors.tabIconDefault}
          multiline
          style={{
            minHeight: h(100),
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: w(10),
            padding: w(12),
            fontSize: w(12),
            color: colors.text,
            backgroundColor: colors.inputBg,
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            textAlignVertical: "top",
          }}
        />
      </Card>

      <Button
        title="Create tournament (draft)"
        onPress={() => void onCreateDraft()}
        fullWidth
        style={{ marginBottom: h(12) }}
      />

      <Card style={{ marginBottom: h(12) }} padded>
        {sectionLabel("After create")}
        <Input
          label="Tournament id"
          value={tournamentId}
          onChangeText={setTournamentId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Filled after create, or paste from admin / Swagger"
        />
        <View style={{ flexDirection: "row", gap: w(10), marginTop: h(14) }}>
          <View style={{ flex: 1 }}>
            <Button title="Start" onPress={() => void onStart()} fullWidth />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Cancel…"
              variant="destructive"
              onPress={openCancelModal}
              fullWidth
            />
          </View>
        </View>
        <Text
          style={{
            fontSize: w(11),
            color: colors.tabIconDefault,
            marginTop: h(10),
            lineHeight: w(16),
          }}
        >
          Start opens registration. Cancel asks for a user-visible reason.
        </Text>
      </Card>

      <Modal
        visible={showGamePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGamePicker(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: w(20),
            paddingVertical: h(24),
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close game list"
            onPress={() => setShowGamePicker(false)}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            pointerEvents="box-none"
            style={{
              width: "100%",
              maxWidth: 440,
              alignSelf: "center",
              borderRadius: w(16),
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.cardBg,
              overflow: "hidden",
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: w(16),
                paddingVertical: h(14),
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: w(17),
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Select game
              </Text>
              <Pressable onPress={() => setShowGamePicker(false)} hitSlop={12}>
                <Text
                  style={{
                    color: colors.tint,
                    fontWeight: "600",
                    fontSize: w(15),
                  }}
                >
                  Done
                </Text>
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: w(16), paddingVertical: h(10) }}>
              <TextInput
                value={gameSearchQuery}
                onChangeText={setGameSearchQuery}
                placeholder="Search name, slug, platform…"
                placeholderTextColor={colors.tabIconDefault}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: w(10),
                  paddingHorizontal: w(12),
                  paddingVertical: h(11),
                  fontSize: w(15),
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                }}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: h(360) }}
            >
              {filteredGames.length === 0 ? (
                <View
                  style={{ paddingHorizontal: w(12), paddingVertical: h(8) }}
                >
                  <ClassicEmptyState
                    title="No matches"
                    message="Try another search term."
                    icon="search"
                    style={{ marginVertical: 0, paddingVertical: h(14) }}
                  />
                </View>
              ) : (
                filteredGames.map((g, i) => {
                  const isLast = i === filteredGames.length - 1;
                  const plat =
                    g.platform && g.platform.length > 0
                      ? g.platform.charAt(0).toUpperCase() +
                        g.platform.slice(1).toLowerCase()
                      : "";
                  return (
                    <Pressable
                      key={g.slug}
                      onPress={() => {
                        setSelectedGameSlug(g.slug);
                        setShowGamePicker(false);
                      }}
                      style={{
                        paddingVertical: h(14),
                        paddingHorizontal: w(16),
                        borderBottomWidth: isLast
                          ? 0
                          : StyleSheet.hairlineWidth,
                        borderBottomColor: colors.border,
                        backgroundColor:
                          g.slug === selectedGameSlug
                            ? colors.tint + "18"
                            : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: w(16),
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {g.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: w(12),
                          color: colors.tabIconDefault,
                          marginTop: h(4),
                        }}
                      >
                        {plat ? `${plat} · ` : ""}
                        {g.slug}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cancelModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "center",
            padding: w(20),
          }}
          onPress={() => setCancelModalOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: w(16),
              borderWidth: 1,
              borderColor: colors.border,
              padding: w(18),
              maxWidth: 420,
              width: "100%",
              alignSelf: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: w(10),
                marginBottom: h(10),
              }}
            >
              <FontAwesome
                name="exclamation-circle"
                size={w(22)}
                color={colors.accent}
              />
              <Text
                style={{
                  fontSize: w(18),
                  fontWeight: "700",
                  color: colors.text,
                  flex: 1,
                }}
              >
                Cancel tournament
              </Text>
            </View>
            <Text
              style={{
                fontSize: w(13),
                color: colors.tabIconDefault,
                marginBottom: h(12),
                lineHeight: w(19),
              }}
            >
              This reason can be shown to players. Write a clear message.
            </Text>
            <Text
              style={{
                fontSize: w(11),
                fontWeight: "600",
                color: colors.tabIconDefault,
                marginBottom: h(6),
              }}
            >
              Reason shown to users
            </Text>
            <TextInput
              value={cancelModalReason}
              onChangeText={setCancelModalReason}
              placeholder="e.g. Insufficient registrations"
              placeholderTextColor={colors.tabIconDefault}
              multiline
              style={{
                minHeight: h(100),
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: w(10),
                padding: w(12),
                fontSize: w(14),
                color: colors.text,
                backgroundColor: colors.inputBg,
                textAlignVertical: "top",
              }}
            />
            <View
              style={{
                flexDirection: "row",
                gap: w(10),
                marginTop: h(16),
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  title="Close"
                  variant="outline"
                  onPress={() => setCancelModalOpen(false)}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Confirm cancel"
                  variant="destructive"
                  onPress={() => void onConfirmCancelFromModal()}
                  fullWidth
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
