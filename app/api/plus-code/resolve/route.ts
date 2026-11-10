import { NextResponse } from "next/server";
import { OpenLocationCode } from "open-location-code";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { value?: string };
    const input = (body.value || "").trim();
    const match = input.match(/^([^\s]+)(?:\s+(.+))?$/);
    if (!match) return NextResponse.json({ error: "Informe um Plus Code válido." }, { status: 400 });

    const code = match[1].toUpperCase();
    const locality = match[2]?.trim();
    let fullCode = code;

    if (OpenLocationCode.isShort(code)) {
      if (!locality) {
        return NextResponse.json({ error: "Esse é um Plus Code curto. Acrescente a cidade e o estado, por exemplo: 3PGP+9R2 Parnamirim, RN." }, { status: 400 });
      }
      const query = encodeURIComponent(locality + ", Brazil");
      const response = await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=" + query, {
        headers: { "User-Agent": "CHAMA-VIVA/1.0 (location lookup)" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Não foi possível consultar a cidade informada.");
      const places = await response.json() as { lat: string; lon: string }[];
      if (!places.length) throw new Error("Não encontrei a cidade/estado informado. Confira o nome e tente novamente.");
      fullCode = OpenLocationCode.recoverNearest(code, Number(places[0].lat), Number(places[0].lon));
    } else if (!OpenLocationCode.isFull(code)) {
      return NextResponse.json({ error: "Plus Code inválido. Use um código completo ou um código curto acompanhado da cidade e do estado." }, { status: 400 });
    }

    const area = OpenLocationCode.decode(fullCode);
    return NextResponse.json({ latitude: area.latitudeCenter, longitude: area.longitudeCenter, fullCode });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível interpretar o Plus Code." }, { status: 400 });
  }
}
