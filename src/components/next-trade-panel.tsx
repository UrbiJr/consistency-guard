"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Crosshair } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Analysis } from "@/lib/analyze";
import { useI18n } from "@/lib/i18n";
import { planNextTrade, planSeverity, priceDecimals, type Direction } from "@/lib/next-trade";
import {
  CONSISTENCY_EXCELLENT,
  MAX_MARGIN_UTILISATION,
  ON_DEMAND_CONSISTENCY_LIMIT,
  PCP_MAX_MARGIN_UTILISATION,
  SPECULATIVE_CONCENTRATION_LIMIT,
} from "@/lib/rules";
import { SEVERITY_STYLES } from "@/lib/severity";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

const RISK_CHOICES = [0.0025, 0.005, 0.0075, 0.01, 0.015, 0.02];
