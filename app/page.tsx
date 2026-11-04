"use client";

import { useState } from "react";
import ClientePanel from "@/components/ClientePanel";
import RemitentePanel from "@/components/RemitentePanel";

export default function Home() {
  const [tab, setTab] = useState<"cliente" | "remitente">("cliente");

  return (
    <div className="wrap">
      <header>
        <div className="logo">LDH<span>·</span>Tracking</div>
        <div className="tabs" role="tablist" aria-label="Vista">
          <button role="tab" aria-selected={tab === "cliente"} onClick={() => setTab("cliente")}>Cliente</button>
          <button role="tab" aria-selected={tab === "remitente"} onClick={() => setTab("remitente")}>Remitente</button>
        </div>
      </header>
      {tab === "cliente" ? <ClientePanel /> : <RemitentePanel />}
    </div>
  );
}
