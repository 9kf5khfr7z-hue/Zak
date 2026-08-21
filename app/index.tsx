import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { getSavedSession } from "@/lib/session";

export default function Index() {
  const [destination, setDestination] = useState<"welcome" | "tabs" | null>(null);

  useEffect(() => {
    getSavedSession().then((session) => setDestination(session ? "tabs" : "welcome"));
  }, []);

  if (!destination) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7B900" }}><ActivityIndicator color="#071126" /></View>;
  }

  return <Redirect href={destination === "tabs" ? "/(tabs)" : "/welcome"} />;
}
