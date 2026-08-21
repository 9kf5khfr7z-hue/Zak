export const ZAK_SERVICE_CENTER = { latitude: 32.8872, longitude: 13.1913 } as const;
export const ZAK_DELIVERY_RADIUS_KM = 10;

export type Coordinates = { latitude: number; longitude: number };

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceInKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(from.latitude))
    * Math.cos(toRadians(to.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinZakDeliveryRadius(coordinates: Coordinates) {
  return distanceInKm(ZAK_SERVICE_CENTER, coordinates) <= ZAK_DELIVERY_RADIUS_KM;
}

export function getDeliveryDistanceLabel(coordinates: Coordinates) {
  return `${distanceInKm(ZAK_SERVICE_CENTER, coordinates).toFixed(1)} كم من مركز زاك`;
}
