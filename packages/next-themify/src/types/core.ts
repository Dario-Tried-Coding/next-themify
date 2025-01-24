import { ModeProp, ResolvedMode, CssSelector } from "./react";
import { NullOr } from "./utils";

export type Constraints = Map<string, { available: Set<string>; base: string }>
export type StorageKeys = { state: string; mode: string }
export type ModeConfig = NullOr<{ prop: string; stratObj: ModeProp; resolvedModes: Record<string, ResolvedMode>; selectors: CssSelector[]; store: boolean }>
export type State = NullOr<Map<string, string>>