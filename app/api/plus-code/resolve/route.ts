import { NextResponse } from "next/server";

const ALPHABET = "23456789CFGHJMPQRVWX";
const PAIR_RESOLUTIONS = [20, 1, 0.05, 0.0025, 0.000125];

function isValidCode(code: string) {
  const separator = code.indexOf("+");
  if (separator < 2 || separator > 8 || separator % 2 !== 0 || separator !== code.lastIndexOf("+")) return false;
  const before = code.slice(0, separator);
  const after = code.slice(separator + 1);
  if (after.length === 1 || after.length > 7) return false;
  if (before.includes("0")) return separator === 8 && /^([23456789CFGHJMPQRVWX]+)(00|0000|000000)$/.test(before);
  return [...before, ...after].every((char) => ALPHABET.includes(char));
}

function isFullCode(code: string) {
  return isValidCode(code) && code.indexOf("+") === 8;
}

function decodeFullCode(code: string) {
  if (!isFullCode(code)) throw new Error("Plus Code completo inválido.");
  const digits = code.replace("+", "").replace(/0/g, "");
  let latitude = -90;
  let longitude = -180;
  let latResolution = 0;
  let lngResolution = 0;
  const pairLength = Math.min(digits.length, 10);
  for (let i = 0; i < pairLength; i += 2) {
    const resolution = PAIR_RESOLUTIONS[i / 2];
    latitude += ALPHABET.indexOf(digits[i]) * resolution;
    longitude += ALPHABET.indexOf(digits[i + 1]) * resolution;
    latResolution = resolution;
    lngResolution = resolution;
  }
  for (let i = 10; i < digits.length; i++) {
    latResolution /= 5;
    lngResolution /= 4;
    const value = ALPHABET.indexOf(digits[i]);
    latitude += Math.floor(value / 4) * latResolution;
    longitude += (value % 4) * lngResolution;
  }
  return { latitudeCenter: latitude + latResolution / 2, longitudeCenter: longitude + lngResolution / 2 };
}

function encodeReferencePrefix(latitude: number, longitude: number) {
  let lat = Math.max(-90, Math.min(90 - 1e-12, latitude)) + 90;
  let lng = ((longitude + 180) % 360 + 360) % 360;
  let code = "";
  for (const resolution of PAIR_RESOLUTIONS) {
    const latDigit = Math.max(0, Math.min(19, Math.floor(lat / resolution)));
    const lngDigit = Math.max(0, Math.min(19, Math.floor(lng / resolution)));
    code += ALPHABET[latDigit] + ALPHABET[lngDigit];
    lat -= latDigit * resolution;
    lng -= lngDigit * resolution;
  }
  return code;
}

function recoverShortCode(shortCode: string, referenceLatitude: number, referenceLongitude: number) {
  const separator = shortCode.indexOf("+");
  if (!isValidCode(shortCode) || separator >= 8) throw new Error("Plus Code curto inválido.");
  const paddingLength = 8 - separator;
  const resolution = Math.pow(20, 2 - paddingLength / 2);
  const halfResolution = resolution / 2;
  const area = decodeFullCode(encodeReferencePrefix(referenceLatitude, referenceLongitude).slice(0, paddingLength) + shortCode);
  let latitude = area.latitudeCenter;
  let longitude = area.longitudeCenter;
  if (referenceLatitude + halfResolution < latitude && latitude - resolution >= -90) latitude -= resolution;
  else if (referenceLatitude - halfResolution > latitude && latitude + resolution <= 90) latitude += resolution;
  if (referenceLongitude + halfResolution < longitude) longitude -= resolution;
  else if (referenceLongitude - halfResolution > longitude) longitude += resolution;
  return { latitude, longitude };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { value?: string };
    const input = (body.value || "").trim().toUpperCase();
    const match = input.match(/^([^\s]+)(?:\s+(.+))?$/);
    if (!match) return NextResponse.json({ error: "Informe um Plus Code válido." }, { status: 400 });
    const code = match[1];
    const locality = match[2]?.trim();
    if (!isValidCode(code)) return NextResponse.json({ error: "Plus Code inválido. Confira os caracteres digitados." }, { status: 400 });

    let point: { latitude: number; longitude: number };
    let fullCode = code;
    if (isFullCode(code)) {
      point = decodeFullCode(code);
    } else {
      if (!locality) return NextResponse.json({ error: "Esse é um Plus Code curto. Acrescente a cidade e o estado, por exemplo: 3PGP+9R2 Parnamirim, RN." }, { status: 400 });
      const query = encodeURIComponent(locality + ", Brazil");
      const response = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=" + query, {
        headers: { "User-Agent": "CHAMA-VIVA/1.0 (location lookup)" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Não foi possível consultar a cidade informada.");
      const places = await response.json() as { lat: string; lon: string }[];
      if (!places.length) throw new Error("Não encontrei a cidade/estado informado. Confira o nome e tente novamente.");
      point = recoverShortCode(code, Number(places[0].lat), Number(places[0].lon));
      fullCode = encodeReferencePrefix(point.latitude, point.longitude);
    }
    return NextResponse.json({ latitude: point.latitude, longitude: point.longitude, fullCode });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível interpretar o Plus Code." }, { status: 400 });
  }
}
