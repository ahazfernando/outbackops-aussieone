import { LucideIcon } from "lucide-react";

export type TargetVsActualStatus = "on-track" | "risk" | "off-track";

export interface TargetVsActualCardProps {
  title: string;
  target: number;
  actual: number;
  unit?: string;
  /**
   * Optional icon to display for the KPI
   */
  icon?: LucideIcon;
  /**
   * Optional override. If not provided, status is derived from target/actual:
   * - on-track: actual >= target
   * - risk: actual >= 70% of target
   * - off-track: actual < 70% of target
   */
  status?: TargetVsActualStatus;
}

