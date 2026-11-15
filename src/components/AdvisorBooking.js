// Investment advisors: the compact advisor card and the "book a consultation"
// sheet, shared by the F.I.R.E. and Add-investment screens. Booking opens a
// pre-filled email to the advisor and offers a Google Calendar event.

import React, { useEffect, useState } from "react";
import { View, Image, Linking, Alert, StyleSheet } from "react-native";
import { Text, Card, Button, Field, Sheet, DateField, TextAction, Hint } from "./pulse";
import { P, themedStyles } from "../theme/theme";

import { toast } from "../ux/toast";
export const ADVISORS = [
  {
    id: 1,
    name: "Narendran S A P",
    role: "Mutual Fund Distributor",
    email: "narendran2cool@gmail.com",
    phone: "6380750550",
    image: require("../../assets/narendran.png"),
    experience: "7+ years",
    focus: "SIP & mutual funds · F.I.R.E. planning",
  },
  {
    id: 2,
    name: "Parthiban M",
    role: "Associate Partner",
    email: "parthiban.m@adityabirlacapital.com",
    phone: "7904082805",
    image: require("../../assets/parthiban.png"),
    experience: "10+ years",
    focus: "Wealth strategy · insurance · debt funds",
  },
];

export const AdvisorCard = ({ advisor, onBook }) => (
  <Card>
    <View style={styles.row}>
      <Image source={advisor.image} style={styles.photo} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Text style={styles.name}>{advisor.name}</Text>
        <Text style={styles.role} numberOfLines={1}>
          {advisor.role} · {advisor.experience}
        </Text>
      </View>
    </View>
    <Text style={styles.focus}>{advisor.focus}</Text>
    <View style={styles.links}>
      <TextAction title="Call" onPress={() => Linking.openURL(`tel:${advisor.phone}`)} />
      <TextAction title="Email" onPress={() => Linking.openURL(`mailto:${advisor.email}`)} />
      {onBook ? <TextAction title="Book a call" onPress={() => onBook(advisor)} style={{ marginLeft: "auto" }} /> : null}
    </View>
  </Card>
);

const fmtDate = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (d) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

const calendarUrl = (advisor, when, purpose, notes) => {
  const end = new Date(when.getTime() + 60 * 60 * 1000);
  const g = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const details = `Meeting with ${advisor.name}\nPurpose: ${purpose}\nNotes: ${notes || "N/A"}`;
  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(`Investment consultation - ${advisor.name}`)}` +
    `&dates=${g(when)}/${g(end)}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(advisor.name)}`
  );
};

/** Bottom sheet that drafts the booking email. `advisor` null = closed. */
export const BookingSheet = ({ advisor, onClose }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!advisor) return;
    setName("");
    setEmail("");
    setPurpose("");
    setNotes("");
    setDate(new Date());
    setTime(new Date());
  }, [advisor]);

  const submit = async () => {
    if (!name.trim()) return toast.warning("Please enter your name.", { title: "Your name" });
    if (!email.includes("@")) return toast.warning("Please enter a valid email address.", { title: "Your email" });
    if (!purpose.trim()) return toast.warning("Tell the advisor what you'd like to discuss.", { title: "Purpose" });
    const when = new Date(date);
    when.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (when < new Date()) return toast.warning("Choose a date and time in the future.", { title: "Pick a later time" });

    setSending(true);
    try {
      const body = [
        `Hello ${advisor.name},`,
        "",
        "I would like to schedule an investment consultation.",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Preferred time: ${fmtDate(date)}, ${fmtTime(time)}`,
        "",
        `Purpose: ${purpose}`,
        `Notes: ${notes || "None"}`,
        "",
        "Please confirm the appointment at your earliest convenience.",
        "",
        `Best regards,\n${name}`,
      ].join("\n");
      await Linking.openURL(
        `mailto:${advisor.email}?subject=${encodeURIComponent("Investment consultation request")}&body=${encodeURIComponent(body)}`
      );
      const cal = calendarUrl(advisor, when, purpose, notes);
      onClose();
      setTimeout(
        () =>
          Alert.alert("Request drafted", "Send the email to confirm your appointment.", [
            { text: "Add to calendar", onPress: () => Linking.openURL(cal) },
            { text: "Close", style: "cancel" },
          ]),
        400
      );
    } catch (e) {
      toast.error("Please try again or email the advisor directly.", { title: "Couldn't open email" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={!!advisor}
      onClose={onClose}
      overline="Book a consultation"
      title={advisor?.name}
      footer={<Button title="Send booking request" onPress={submit} loading={sending} />}
    >
      <Field label="Your name" placeholder="Full name" value={name} onChangeText={setName} />
      <Field label="Your email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field
        label="Purpose"
        placeholder="Portfolio review, SIP planning…"
        value={purpose}
        onChangeText={setPurpose}
        multiline
        inputStyle={{ height: 80, paddingTop: 12, textAlignVertical: "top" }}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <DateField label="Date" value={date} onChange={setDate} minimumDate={new Date()} style={{ flex: 1 }} />
        <DateField label="Time" mode="time" value={time} onChange={setTime} style={{ flex: 1 }} />
      </View>
      <Field label="Notes (optional)" placeholder="Anything specific to discuss" value={notes} onChangeText={setNotes} />
      <Hint>Opens an email to the advisor; you can add the meeting to your calendar after.</Hint>
    </Sheet>
  );
};

const styles = themedStyles(() =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    photo: { width: 48, height: 48, borderRadius: 12, backgroundColor: P.surf2 },
    name: { fontSize: 15, fontWeight: "600", color: P.ink },
    role: { fontSize: 13, color: P.ink2 },
    focus: { fontSize: 13, color: P.ink2, marginTop: 12 },
    links: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 10 },
  })
);
