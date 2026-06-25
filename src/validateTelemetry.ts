import Ajv, { ValidateFunction } from "ajv";
import telemetrySchema from "../schema/bodyscan_telemetry.schema.json";

const ajv = new Ajv({ allErrors: true, strict: false });

let validator: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (!validator) {
    validator = ajv.compile(telemetrySchema as any);
  }
  return validator;
}

export function validateTelemetry(payload: unknown): {
  valid: boolean;
  errors?: string[];
} {
  const validate = getValidator();
  const valid = validate(payload);
  if (!valid) {
    const errors =
      validate.errors?.map(
        (e) => `${e.instancePath || "/"} ${e.message || ""}`.trim()
      ) || [];
    return { valid: false, errors };
  }
  return { valid: true };
}
