import type { BuyerSupportIntent } from "./types";

export function respondToBuyerSupport(intent: BuyerSupportIntent): string {
  switch (intent) {
    case "foreign_buyers":
      return "Foreign buyers may be able to buy property in Cape Verde, but the process should be verified with local legal support. Are you buying as a resident, diaspora buyer, or international buyer?";
    case "mortgage":
      return "I can help with general financing questions, but I'm not a licensed mortgage advisor. Are you buying with cash, local financing, or financing from abroad?";
    case "lawyer":
      return "For a Cape Verde property purchase, it's usually wise to use independent local legal support before signing or transferring funds. I can flag this as a legal-support question, but I can't recommend a specific lawyer yet.";
    case "agent_contact":
      return "I can help you contact the source for a listing later. Choose a listing or ask for the links, and I'll help you prepare the next step.";
    case "taxes_costs":
      return "I can help outline the key buying-cost questions to verify, such as taxes, notary, registration, legal fees, and agent/source fees. Do you want a checklist?";
    case "viewing":
      return "I can help prepare a viewing request later. Which listing are you interested in?";
    case "buying_process":
      return "I can outline the buying-process questions to verify before you commit. Are you buying with cash, financing, or still comparing options?";
    case "safety":
      return "I can't confirm whether a property is safe to buy from chat alone. Before signing or sending funds, use independent local legal checks and verify ownership, permits, debts, and source documents.";
  }
}
