import type { AreaGuidanceIntent, BuyerIntent } from "./types";

export function respondToAreaGuidance(
  guidance: AreaGuidanceIntent,
  currentIntent: BuyerIntent
): string {
  const island = guidance.island ?? currentIntent.island;
  const city = guidance.city ?? currentIntent.city;

  if (city === "Sal Rei") {
    return "Sal Rei is a common Boa Vista search area, especially for town access and nearby beach areas. I can show Sal Rei listings, or narrow by budget, beach access, or sea view.";
  }
  if (city === "Santa Maria") {
    return "Santa Maria is the main Sal search area for tourism, beach access, and holiday apartments. I can show Santa Maria listings, or narrow by budget, sea view, or walking distance to the beach.";
  }
  if (island === "Boa Vista") {
    return "Boa Vista searches often focus on Sal Rei, Estoril, and beach-access areas. I can show listings in Sal Rei, or narrow by budget, beach access, or sea view.";
  }
  if (island === "Sal") {
    return "Sal searches often focus on Santa Maria for tourism, beach access, and holiday apartments. I can show Santa Maria listings, or narrow by budget, sea view, or walking distance to the beach.";
  }
  return "I can give area guidance at a high level, but I won't overclaim rental yield or market returns. Which island or town are you comparing?";
}
