import { BodyScanTelemetry, ImplantDetectionEngineOutput } from "./types";
import { validateTelemetry } from "./validateTelemetry";
import { computeVerdict } from "./computeVerdict";

export function runImplantDetectionEngine(
  telemetry: BodyScanTelemetry
): ImplantDetectionEngineOutput {
  const { valid, errors } = validateTelemetry(telemetry);
  if (!valid) {
    const errorText = (errors || []).join("; ");
    throw new Error(`Invalid BodyScanTelemetry payload: ${errorText}`);
  }
  return computeVerdict(telemetry);
}

// Convenience: safe wrapper that returns either result or error.
export function tryRunImplantDetectionEngine(
  telemetry: unknown
):
  | { ok: true; result: ImplantDetectionEngineOutput }
  | { ok: false; error: string } {
  const { valid, errors } = validateTelemetry(telemetry);
  if (!valid) {
    return {
      ok: false,
      error: `Invalid BodyScanTelemetry payload: ${(errors || []).join("; ")}`
    };
  }
  try {
    const result = computeVerdict(telemetry as BodyScanTelemetry);
    return { ok: true, result };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
