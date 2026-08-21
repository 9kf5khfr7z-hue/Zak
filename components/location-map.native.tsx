import { StyleSheet } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

export function LocationMap({ initialRegion, region, onRegionChangeComplete }: { initialRegion: Region; region: Region; onRegionChangeComplete: (region: Region) => void }) {
  return <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion} onRegionChangeComplete={onRegionChangeComplete} showsUserLocation showsMyLocationButton><Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="عنوان التوصيل" pinColor="#FFC400" /></MapView>;
}
