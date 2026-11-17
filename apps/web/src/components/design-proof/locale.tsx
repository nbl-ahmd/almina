"use client";
import { createContext, useContext } from "react";
const LocaleContext = createContext<"en" | "ar">("en");
export const ProofLocaleProvider = LocaleContext.Provider;
export const useProofLocale = () => useContext(LocaleContext);
