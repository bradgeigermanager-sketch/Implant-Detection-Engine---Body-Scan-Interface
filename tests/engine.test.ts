import { describe, it, expect } from "vitest"; // or jest
import { loadJson, normalize } from "./helpers";
import { tryRunImplantDetectionEngine } from "../src/index";

interface ExamplePair {
  name: string;
  eventPath: string;
  outputPath: string;
}

const examples: ExamplePair[] = [
  {
    name: "01 – No Implant Detected",
    eventPath: "examples/01_no_implant_event.json",
    outputPath: "examples/01_no_implant_output.json"
  },
  {
    name: "02 – Benign Medical Implant",
    eventPath: "examples/02_benign_implant_event.json",
    outputPath: "examples/02_benign_implant_output.json"
  },
  {
    name: "03 – Suspicious Object",
    eventPath: "examples/03_suspicious_event.json",
    outputPath: "examples/03_suspicious_output.json"
  },
  {
    name: "04 – High Risk Implant",
    eventPath: "examples/04_high_risk_event.json",
    outputPath: "examples/04_high_risk_output.json"
  },
  {
    name: "05 – Poor Scan Quality",
    eventPath: "examples/05_poor_quality_event.json",
    outputPath: "examples/05_poor_quality_output.json"
  },
  {
    name: "06 – Context Conflict",
    eventPath: "examples/06_context_conflict_event.json",
    outputPath: "examples/06_context_conflict_output.json"
  }
];

describe("Implant Detection Engine – Example Validation Suite", () => {
  for (const ex of examples) {
    it(`validates example: ${ex.name}`, () => {
      const telemetry = loadJson(ex.eventPath);
      const expected = loadJson(ex.outputPath);

      const result = tryRunImplantDetectionEngine(telemetry);

      if (!result.ok) {
        throw new Error(
          `Engine failed for ${ex.name}: ${result.error}`
        );
      }

      const normalizedResult = normalize(result.result);
      const normalizedExpected = normalize(expected);

      expect(normalizedResult.verdict).toBe(normalizedExpected.verdict);
      expect(normalizedResult.channels).toEqual(normalizedExpected.channels);

      // Confidence can vary slightly if weights change — allow small tolerance
      expect(normalizedResult.confidence).toBeCloseTo(
        normalizedExpected.confidence,
        2
      );

      // Explanation arrays should contain the same semantic messages
      expect(normalizedResult.explanation).toEqual(
        normalizedExpected.explanation
      );

      // Debug fields must match exactly
      expect(normalizedResult.debug).toEqual(normalizedExpected.debug);
    });
  }
});
