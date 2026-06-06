import { ImageResponse } from "next/og";

// Genera el ícono de la app (PNG) en los tamaños que pide el manifest.
// Fondo degradado de la marca + una "tarjeta" blanca con franja violeta.
export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }];
}

type Ctx = { params: Promise<{ size: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { size: s } = await ctx.params;
  const size = Number(s) === 512 ? 512 : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#6d28d9 0%,#db2777 100%)",
        }}
      >
        <div
          style={{
            width: size * 0.56,
            height: size * 0.4,
            background: "#ffffff",
            borderRadius: size * 0.07,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              marginTop: size * 0.09,
              width: "100%",
              height: size * 0.085,
              background: "#6d28d9",
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
