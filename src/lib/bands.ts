export type BandLetter = "A" | "B" | "C" | "D" | "E";

export interface BandInfo {
  band: BandLetter;
  hoursRange: string;
  minHours: number;
  tariffRange: string;
}

// Reference table — NERC's Service-Based Tariff (SBT) band definitions.
// Tariff figures are broad ranges (they vary slightly by DisCo); always
// pair with a "confirm on your bill" note in the UI, don't present as exact.
export const BAND_REFERENCE: Record<BandLetter, BandInfo> = {
  A: { band: "A", hoursRange: "20–24 hrs/day", minHours: 20, tariffRange: "₦206–225/kWh" },
  B: { band: "B", hoursRange: "16–20 hrs/day", minHours: 16, tariffRange: "₦180–200/kWh" },
  C: { band: "C", hoursRange: "12–16 hrs/day", minHours: 12, tariffRange: "₦150–170/kWh" },
  D: { band: "D", hoursRange: "8–12 hrs/day", minHours: 8, tariffRange: "₦60–100/kWh (subsidised)" },
  E: { band: "E", hoursRange: "4–8 hrs/day", minHours: 4, tariffRange: "₦32–43/kWh (subsidised)" },
};

export interface FeederRecord {
  disco: string;
  businessUnit: string;
  feederName: string;
  band: BandLetter;
}

export interface DiscoSourceMeta {
  disco: string;
  source: string;
  sourceMonth: string;
  lastIngested: string;
}

export interface FeedersDataset {
  meta: {
    note: string;
    sources: DiscoSourceMeta[];
  };
  records: FeederRecord[];
}
