import type { Dict } from "./en";

export const it: Dict = {
  localeTag: "it-IT",
  languageName: "Italiano",

  app: {
    name: "Consistency Guard",
    title: "Controlla la concentrazione dei tuoi profitti prima che lo faccia la compliance",
    intro:
      "Le prop firm annullano i profitti quando una quota eccessiva del guadagno arriva da un solo trade, una sola idea o un solo giorno. I limiti sono pubblicati come rapporti: significa che un trade dimensionato correttamente può comunque sforare, se il resto del periodo ha restituito il guadagno. Dopo un rebalance puoi dimensionare il prossimo ordine senza nessun file. Carica lo storico solo quando hai trade chiusi nel ciclo corrente.",
  },

  setup: {
    title: "Impostazioni del conto",
    desc: "Da questi campi dipendono tutte le soglie della pagina.",
    balance: "Saldo iniziale del conto",
    balanceHint:
      "Ogni limite percentuale si misura su questo valore, non sull'equity attuale.",
    riskCap: "Limite di rischio per trade idea",
    riskCapHint: "Superarlo è hard breach, non un avviso.",
    riskCap2: "2% — conto funded standard",
    riskCap1: "1% — Prime Consistency Program",
    rollover: "Cambio di giornata operativa",
    rolloverHint:
      "Gli orari sono quelli del server del broker. Cambiare questo valore può spostare un trade nel giorno adiacente e modificare il consistency score.",
    rolloverMidnight: "Mezzanotte — giorno di calendario del file",
    rollover17: "17:00 — ora di reset del limite giornaliero",
    cycleStart: "Il ciclo inizia il",
    cycleStartHint:
      "La concentrazione si misura sul ciclo. Un rebalance o un payout ne apre uno nuovo. Imposta questa data a oggi dopo un rebalance. Non ti serve un export vecchio: il pannello del prossimo ordine funziona su un ciclo vuoto.",
  },

  input: {
    dropTitle: "Trascina qui l'export del tuo storico operativo",
    dropDesc:
      "CSV da MT4, MT5, cTrader, DXtrade o Match-Trader — solo quando hai trade chiusi in questo ciclo. Un export vecchio rimette il picco precedente nel rapporto. Separatori, nomi delle colonne e formati di data vengono riconosciuti automaticamente. Tutto viene elaborato nel tuo browser e niente viene caricato online.",
    chooseFile: "Scegli il file",
    pasteToggle: "Incolla invece",
    startFresh: "Ciclo nuovo, senza storico",
    loadSample: "Carica l'esempio",
    clear: "Svuota",
    pasteLabel: "Incolla le righe, compresa quella di intestazione",
    analysePasted: "Analizza le righe incollate",
  },

  loaded: {
    summary: (filename: string, count: number) => `${filename} — ${count} trade`,
    skipped: (count: number) => `${count} riga/e non operative ignorate`,
    excluded: (count: number) => `${count} trade prima dell'inizio del ciclo esclusi`,
  },

  errors: {
    title: "Non è stato possibile leggere il file",
    fallback:
      "Questo file non è leggibile. Funziona meglio un normale export CSV dalla piattaforma di trading.",
    empty: "Il file è vuoto.",
    noRows: "Nel file non è stata trovata nessuna riga leggibile.",
    noHeader:
      "Non è stata trovata una riga di intestazione. Il file deve avere almeno una colonna di profitto più una colonna simbolo o ticket.",
    noTradeRows:
      "L'intestazione è stata riconosciuta ma non è stata letta nessuna riga operativa. Verifica che la colonna del profitto contenga numeri.",
  },

  warnings: {
    title: "Alcune colonne risultano mancanti",
    noDirectionColumn:
      "Non è stata trovata una colonna acquisto/vendita, quindi ogni posizione è stata trattata come acquisto. Il raggruppamento in trade idea potrebbe unire operazioni opposte.",
    noDateColumn:
      "Non è stata trovata una colonna con le date. I dati giornalieri e il consistency score non sono calcolabili.",
    noStopLossColumn:
      "Non è stata trovata una colonna con lo stop loss, quindi il rischio per trade idea non è verificabile contro il limite.",
    unparsedDates:
      "Le date erano presenti ma nessuna è stata interpretata. I dati giornalieri non sono disponibili.",
  },

  sample: {
    title: "Stai guardando un esempio ricostruito, non dati reali",
    body: (balance: string, ticket: string, profit: string) =>
      `Questo dataset è ricostruito dai numeri che l'email di compliance di Hola Prime afferma sul conto 131001: saldo pre-rebalance di ${balance}, ticket ${ticket} da ${profit} e altri due vincenti da $1.730 e $1.625. Riproduce esattamente il loro 101,76%, il che conferma che la formula usata era il singolo trade diviso il profitto netto del ciclo. I ticket perdenti e gli orari sono riempitivo. Carica un export reale per sostituire tutto.`,
  },

  empty: {
    title: "Nessun dato caricato",
    desc:
      "Puoi dimensionare il prossimo ordine senza un file. Esporta le posizioni chiuse di questo ciclo solo quando ne hai.",
    freshTitle: "Nuovo ciclo di payout",
    freshDesc:
      "In questo ciclo non ci sono trade chiusi, ed è il punto di partenza giusto dopo un rebalance. Imposta la data del ciclo qui sopra, poi stop, target, lotti e margine del prossimo ordine qui sotto. Carica un CSV solo dopo che hai chiuso trade in questo ciclo: un export vecchio rimetterebbe il picco precedente nel rapporto.",
    items: [
      {
        title: "Concentrazione",
        body: "Il tuo trade più grande, la tua trade idea più grande e il tuo miglior giorno, ciascuno come quota del profitto netto e delle vincite lorde, contro le soglie del 60%, 40% e 20%.",
      },
      {
        title: "Rischio e margine",
        body: "La distanza dello stop convertita in rischio in dollari per trade idea, con gli ingressi sovrapposti e le riaperture entro dieci minuti raggruppati insieme, più il picco di margine simultaneo.",
      },
      {
        title: "Percorso di payout",
        body: "Quale dei tre cicli di payout hai davvero diritto a chiedere adesso, e quanto profitto manca a ciascuno.",
      },
      {
        title: "Il tuo prossimo ordine",
        body: "Livelli di prezzo di stop loss e take profit, dimensione della posizione e margine per il prossimo trade, calcolati perché una vincita non possa portarti oltre il rapporto che scegli.",
      },
    ],
  },

  metrics: {
    netProfit: "Profitto netto",
    ofInitial: (share: string) => `${share} del saldo iniziale`,
    consistency: "Consistency score",
    consistencyHint: "Miglior giorno diviso il profitto totale",
    trades: "Trade",
    tradesHint: (wins: number, losses: number, ideas: number) =>
      `${wins} vincenti, ${losses} perdenti, ${ideas} trade idea`,
    winRate: "Percentuale di vincite",
    profitFactor: (value: string) => `Profit factor ${value}`,
    qualifyingDays: "Giorni qualificanti",
    qualifyingHint: (minimum: string, total: number) =>
      `Giorni pari o superiori a ${minimum} netti, su ${total}`,
    peakMargin: "Picco di margine usato",
    peakMarginHint: "Stimato, contro la soglia del 70%",
  },

  severity: {
    ok: "Nei limiti",
    watch: "Da tenere d'occhio",
    breach: "Oltre il limite",
    unknown: "Dati insufficienti",
  },

  checks: {
    speculative: {
      title: "Concentrazione dei profitti (clausola 3.1)",
      headlineUndefined: "Il profitto netto non è positivo, quindi il rapporto non è definito",
      headline: (share: string) =>
        `La trade idea più grande è il ${share} del profitto netto (limite 60%)`,
      detailUndefined:
        "La clausola 3.1 divide per il profitto complessivo del conto. Con un conto piatto o negativo non esiste un denominatore significativo.",
      detail: (gross: string) =>
        `Misurata sulle vincite lorde invece che sul profitto netto, la stessa trade idea è il ${gross}. La clausola non dice quale denominatore si applichi, e le due letture possono cadere ai lati opposti del limite.`,
    },
    consistency: {
      title: "Consistency score (payout on-demand)",
      headlineUndefined: "Attività datata e in profitto insufficiente per calcolare il punteggio",
      headline: (score: string) =>
        `${score} — miglior giorno diviso il profitto totale (limite 40%)`,
      detailOver: (required: string) =>
        `Sopra la soglia dell'on-demand. Il rimedio pubblicato è continuare a tradare finché il profitto totale raggiunge ${required}, non rimuovere il profitto. I cicli bi-weekly e mensile non hanno alcuna soglia di consistenza pubblicata.`,
      detailInside:
        "Un punteggio pari o inferiore al 20% è descritto come eccellente, e la lettura attuale è dentro quella fascia.",
      detailOutside:
        "Un punteggio pari o inferiore al 20% è descritto come eccellente. La lettura attuale è fuori da quella fascia ma dentro la soglia dell'on-demand.",
    },
    risk: {
      title: (limit: string) => `Rischio per trade idea (hard breach al ${limit})`,
      headlineNoData: "Nessun dato sugli stop loss nel file",
      headlineBreach: (count: number, limit: string) =>
        `${count} trade idea hanno rischiato più di ${limit}`,
      headlineOk: (limit: string) =>
        `Tutte le trade idea calcolabili sono rimaste entro ${limit}`,
      detailMissing: (count: number) =>
        `${count} trade idea hanno almeno una gamba senza stop loss registrato. Una posizione senza stop entro 3 minuti vale rischio infinito.`,
      detailOk:
        "Il rischio è calcolato dalla distanza dello stop, raggruppando in un'unica idea gli ingressi sovrapposti e le riaperture entro 10 minuti.",
    },
    margin: {
      title: "Utilizzo del margine (soglia 70%)",
      headlineUnknown: "Dati di prezzo o volume insufficienti per stimare il margine",
      headline: (peak: string) =>
        `Picco di margine simultaneo intorno al ${peak} del saldo iniziale`,
      detail:
        "Stimato sulla leva pubblicata per i conti Prime (metalli 10:1, forex 50:1, indici 5:1, crypto 1:1). Un solo lotto d'oro intorno a $4.000 impegna già circa il 40% di un conto da $100.000, quindi due lotti aperti insieme arrivano vicini alla soglia del 70%.",
    },
  },

  concentration: {
    title: "Da dove è arrivato il profitto",
    desc: "La clausola 3.1 limita al 60% del profitto complessivo del conto quanto può derivare da «una singola trade idea, sessione di trading o esito isolato», senza dire se il denominatore sia il profitto netto o le vincite lorde. Sono mostrati entrambi, perché le due letture possono cadere ai lati opposti del limite. Le barre sono in scala fino al 120% e segnate al 20%, 40% e 60%.",
    largestTrade: "Trade singolo più grande",
    largestIdea: "Trade idea più grande",
    biggestDay: "Miglior giorno",
    ticket: (ticket: string) => `Ticket ${ticket}`,
    ideaLabel: (symbol: string, side: string, legs: number) =>
      `${symbol} ${side} (${legs} gamba${legs === 1 ? "" : "/e"})`,
    ofNet: "del profitto netto",
    ofGross: "delle vincite lorde",
    peakValue: (value: string) => `Valore di picco ${value}`,
    netLabel: "Profitto netto (denominatore A)",
    grossLabel: "Vincite lorde (denominatore B)",
    lossLabel: "Perdite lorde",
    footnote:
      "Un rapporto sopra il 100% non significa che il trade fosse sovradimensionato. Significa solo che le perdite del periodo hanno annullato quasi tutte le vincite, riducendo il denominatore. Su base netta, una vincita da $200 con $190 di perdite fa anch'essa 105%.",
  },

  charts: {
    equityTitle: "Saldo sui trade chiusi",
    equityDesc: (drawdown: string) =>
      `Discesa da massimo a minimo di ${drawdown}. La linea tratteggiata è il saldo iniziale.`,
    balance: "Saldo",
    start: "Inizio",
    afterTrade: (index: number, ticket: string) =>
      `Dopo il trade ${index} — ticket ${ticket}`,
    closedTrades: "Trade chiusi",
    dailyTitle: "Profitto per giornata operativa",
    dailyDesc: (minimum: string) =>
      `La linea tratteggiata è ${minimum}, il minimo perché una giornata conti per un ciclo di payout bi-weekly o mensile.`,
    net: "Netto",
    noDates:
      "Non è stato possibile leggere le date dal file, quindi i dati giornalieri non sono disponibili.",
  },

  payout: {
    title: "Percorsi di payout",
    desc: "Solo l'on-demand ha una soglia di consistenza pubblicata. I cicli programmati dipendono invece dai giorni qualificanti, che spesso sono la via più semplice per uscire da un conto concentrato.",
    eligible: "Ammesso",
    blocked: "Bloccato",
    yourShare: (split: string) => `la tua quota con split al ${split}`,
    cycles: {
      biweekly: {
        label: "Bi-weekly",
        note: "Nessuna soglia di consistenza pubblicata. Servono 3 giorni ciascuno pari o superiore allo 0,5% del saldo iniziale.",
      },
      monthly: {
        label: "Mensile",
        note: "Split più alto. Servono 7 giorni ciascuno pari o superiore allo 0,5% del saldo iniziale.",
      },
      onDemand: {
        label: "On-demand",
        note: "Il miglior giorno deve restare pari o sotto il 40% del profitto totale, e il profitto totale deve arrivare al 2%.",
      },
    },
    blockers: {
      notInProfit: "Il conto non è in profitto.",
      belowMinProfit: (share: string, amount: string) =>
        `Il profitto totale è sotto il minimo del ${share} (${amount}).`,
      consistencyTooHigh: (score: string, required: string, limit: string) =>
        `Il consistency score è ${score}; il profitto totale deve arrivare a ${required} per portarlo al ${limit}.`,
      notEnoughDays: (have: number, need: number, minimum: string) =>
        `${have} giorni qualificanti su ${need} (ognuno richiede almeno ${minimum} netti).`,
    },
  },

  planner: {
    title: "Quanto grande può essere una vincita?",
    desc: "Non esiste un take profit sicuro o insicuro in assoluto. I limiti pubblicati sono tutti rapporti, quindi una vincita è «troppo grande» solo in relazione al profitto totale presente nel conto nel momento in cui il conto viene esaminato. Imposta un obiettivo e il tetto ne consegue.",
    targetLabel: "Profitto totale che vuoi raggiungere",
    targetHint: (share: string) => `${share} del saldo iniziale.`,
    ratioLabel: "Rapporto da non superare",
    ratioHint:
      "Mirare esattamente al limite non lascia margine se un trade perdente riduce il denominatore.",
    capLabel: "Tetto per trade e per giornata",
    minWinners: "Vincite minime di pari importo",
    spreadLabel: "Distribuite su almeno",
    days: (count: number) => `${count} giorni`,
    capNote:
      "Il tetto vale per l'intera trade idea e per l'intera giornata, non per un singolo ticket. Due ingressi nella stessa direzione sullo stesso simbolo entro dieci minuti contano come una sola idea, e tutto ciò che chiude nello stesso giorno conta come un solo giorno.",
    goldTitle: "Dimensionamento sull'oro per quel tetto",
    goldLot: (lots: string) => `${lots} lotti XAUUSD`,
    goldMove: (margin: string) => `di movimento per il tetto · circa ${margin} di margine`,
    goldNote:
      "Un lotto d'oro vale $100 per ogni dollaro di prezzo. Il margine è stimato sulla leva metalli pubblicata di 10:1 con l'oro intorno a $4.000: è per questo che un solo lotto impegna già circa il 40% di un conto da $100.000.",
    tableTitle: "Cosa richiede già il tuo picco attuale",
    colRatio: "Rapporto",
    colRequired: "Profitto totale necessario",
    colRemaining: "Ancora da guadagnare",
    colCap: "Tetto al tuo obiettivo",
    tableNote: (peak: string) =>
      `«Profitto totale necessario» è quello che tiene il tuo picco attuale di ${peak} dentro ciascun rapporto. Un payout parziale azzera il ciclo, quindi il picco che conta è quello dentro il ciclo corrente.`,
    thresholds: {
      speculative: "60% — il limite rigido della clausola 3.1",
      onDemand: "40% — soglia per il payout on-demand",
      excellent: "20% — la fascia descritta come eccellente",
    },
  },

  nextTrade: {
    title: "Il tuo prossimo ordine",
    desc: "Inserisci ingresso, stop e take profit che vuoi piazzare. Lotti, budget di rischio e il resto restano modificabili. Il pannello ti dice se quei prezzi restano dentro i limiti pubblicati, e cosa cambiare se non lo sono.",
    symbol: "Simbolo",
    direction: "Direzione",
    buy: "Acquisto",
    sell: "Vendita",
    entry: "Prezzo d'ingresso previsto",
    lots: "Dimensione in lotti",
    lotsHint: (suggested: string, ceiling: string) =>
      `Fino a ${suggested} il margine resta entro il ${ceiling}.`,
    risk: "Budget di rischio su questa trade idea",
    riskHint: (actual: string, budget: string) =>
      `${actual} al tuo stop. Budget ${budget}.`,
    useSuggested: "Usa stop e target suggeriti",
    suggestedHint: (stop: string, target: string) =>
      `Suggeriti da budget e rapporto: SL ${stop} · TP ${target}`,
    limitsTitle: "Questi livelli rispettano i limiti?",
    limitsPass: "Sì — questo ordine resta dentro i limiti scelti",
    limitsFail: "No — cambia un prezzo, i lotti o il budget di rischio",
    threshold: "Rapporto di concentrazione da rispettare",
    thresholdBinding: "Questo rapporto imposta il target conforme massimo qui sotto.",
    thresholdNotBinding: (winners: number) =>
      `Finché il ciclo non è in profitto questo rapporto non può ancora limitare il target, perché la prima vincita è il 100% del profitto qualunque sia la sua dimensione. Quello che imposta è il piano: ${winners} vincite di dimensione simile prima che il rapporto sia soddisfatto.`,
    marginCeiling: "Tetto operativo di margine",
    marginCeilingHint:
      "Il 30% è il tetto imposto dentro il Prime Consistency Program. Il 70% è la soglia di margine eccessivo che da sola giustifica un rebalance.",
    bookedToday: "Profitto già realizzato oggi",
    bookedTodayHint:
      "Conta contro il tetto giornaliero, perché il consistency score pubblicato usa il miglior giorno e non il miglior trade.",
    orderTitle: "Imposta questo ordine",
    entryLevel: "Ingresso",
    stopLevel: "Stop loss",
    targetLevel: "Take profit",
    maxTargetLevel: "Target conforme massimo",
    distance: (value: string) => `${value} di distanza`,
    riskLabel: "Rischio",
    rewardRisk: "Rapporto rischio/rendimento",
    margin: "Margine",
    windowTitle: "Finestra di profitto conforme",
    windowRange: (min: string, max: string) => `tra ${min} e ${max}`,
    windowClosedShort: "nessun singolo trade soddisfa entrambi i limiti",
    windowUndefined: "non definita finché il ciclo non è in profitto",
    windowExplain:
      "Il limite superiore evita che questo trade diventi il nuovo picco fuori norma. Il limite inferiore esiste perché una vincita troppo piccola muove appena il denominatore, e quindi non può riportare dentro il rapporto un conto già concentrato.",
    headroomTitle: "Perdite che il ciclo può assorbire",
    headroomNow: "Allo stato attuale",
    headroomAfterWin: "Se questo trade raggiunge il target",
    headroomExplain:
      "Il denominatore è il profitto netto con le operazioni perdenti incluse, quindi la conformità non è mai definita nel momento in cui chiudi un trade. Un drawdown successivo riduce il denominatore e può riportare oltre il limite una vincita che al momento era conforme. Questo è il cuscinetto che hai prima che accada, ed è il motivo per incassare un payout invece di lasciare il profitto esposto.",
    headroomBreached: "già oltre il limite",
    plannedWinnersTitle: "Vincite che questo rapporto richiede",
    plannedWinnersUnit: (count: number) => `${count} di dimensione simile`,
    plannedWinnersExplain:
      "Non c'è ancora un cuscinetto da mostrare. Un ciclo senza profitto non ha un rapporto da erodere, e la prima vincita è il 100% del profitto qualunque sia la sua dimensione, quindi nessun target lo evita. Il cuscinetto compare quando un secondo risultato dà al rapporto qualcosa da misurare. Fino ad allora il rapporto ti dice solo quante vincite mettere in conto.",
    valuePerPoint: (value: string) => `${value} per 1,00 di prezzo a questa dimensione`,
    noPrices:
      "Inserisci un simbolo di cui questo strumento conosce il contratto per ottenere i livelli di stop e target.",
    issues: {
      unknownSymbol:
        "Questo simbolo non è nella tabella delle dimensioni contrattuali, quindi il rischio in dollari e i livelli di prezzo non sono ricavabili. Sotto sono mostrati solo i valori che non dipendono da questo.",
      riskOverHardCap: (risk: string, cap: string) =>
        `Rischiare ${risk} supera il tetto di hard breach di ${cap} su una singola trade idea. Riduci il rischio prima di inserire l'ordine.`,
      marginOverCeiling: (margin: string, ceiling: string) =>
        `Un margine di ${margin} è sopra il tuo tetto operativo del ${ceiling}. È ancora regolare, ma non lascia spazio a una seconda posizione.`,
      marginOverHardLimit: (margin: string, limit: string) =>
        `Un margine di ${margin} raggiunge la soglia di margine eccessivo del ${limit}, che da sola giustifica un rebalance. Riduci i lotti.`,
      noProfitYet: (winners: number) =>
        `Il ciclo non è ancora in profitto, quindi nessun rapporto può essere soddisfatto da un solo trade: la prima vincita è per definizione il 100% del profitto. Metti in conto almeno ${winners} vincite di dimensione simile prima che il rapporto abbia un senso, e tienile dentro il limite di rischio.`,
      dayCapUsedUp: (booked: string) =>
        `Hai già realizzato ${booked} oggi, più di quanto il tetto giornaliero consenta a questo rapporto. Un'altra vincita oggi renderebbe questa giornata il picco fuori norma. Chiudi qui la giornata.`,
      windowEmpty: (trades: number, target: string) =>
        `Nessuna singola vincita può ristabilire questo rapporto. A ${target} per vincita servono circa ${trades} vincite ancora, perché il picco esistente rientra nel limite solo man mano che cresce il profitto totale.`,
      mustExceedMinimum: (minimum: string) =>
        `Una vincita sotto ${minimum} lascia il picco esistente fuori dal rapporto. Qualcosa di più piccolo si può prendere tranquillamente, semplicemente non risolve da sola la concentrazione.`,
      targetBelowRisk: (target: string, risk: string) =>
        `Il take profit di ${target} è più piccolo dei ${risk} che stai rischiando, quindi con il 50% di operazioni vincenti questo setup è peggio del pareggio. Riduci il rischio o alza il target.`,
      targetOverWindow: (target: string, max: string) =>
        `Una vincita di ${target} sta sopra il tetto di ${max} a questo rapporto. Stringi il take profit oppure aspetta che il ciclo abbia più profitto.`,
      stopWrongSide:
        "Lo stop è dalla parte sbagliata rispetto all'ingresso per questa direzione. Su un acquisto deve stare sotto l'ingresso; su una vendita, sopra.",
      targetWrongSide:
        "Il take profit è dalla parte sbagliata rispetto all'ingresso per questa direzione. Su un acquisto deve stare sopra l'ingresso; su una vendita, sotto.",
      stopTooTight:
        "Stop e ingresso sono lo stesso prezzo, quindi il rischio in dollari non è misurabile. Sposta lo stop.",
      riskOverWorkingBudget: (risk: string, budget: string) =>
        `Questo stop rischia ${risk}, sopra i ${budget} che hai impostato come budget. Resta legale se sta sotto il tetto di hard breach, ma è più grande della taglia che hai scelto.`,
      splitEntriesShareCap:
        "Il limite di rischio vale per l'intera trade idea. Frazionare in più ingressi sullo stesso simbolo e nella stessa direzione, o rientrare entro 10 minuti, condivide lo stesso budget invece di ottenerne uno nuovo.",
      lossErodesRatio: (headroom: string) =>
        `Il ciclo può assorbire ancora ${headroom} di perdite prima che il tuo miglior risultato esistente sfori il rapporto da solo. Le operazioni perdenti contano nel denominatore, quindi un drawdown alza il rapporto senza che tu apra un singolo trade sovradimensionato.`,
    },
    checks: {
      stopSide: {
        pass: "Lo stop è dalla parte giusta rispetto all'ingresso",
        fail: "Lo stop è dalla parte sbagliata rispetto all'ingresso per questa direzione",
      },
      targetSide: {
        pass: "Il take profit è dalla parte giusta rispetto all'ingresso",
        fail: "Il take profit è dalla parte sbagliata rispetto all'ingresso per questa direzione",
      },
      riskHardCap: {
        pass: (risk: string, cap: string) => `Il rischio allo stop è ${risk}, dentro il tetto di hard breach di ${cap}`,
        fail: (risk: string, cap: string) => `Il rischio allo stop è ${risk}, sopra il tetto di hard breach di ${cap}`,
      },
      riskWorking: {
        pass: (risk: string, budget: string) => `Il rischio allo stop è ${risk}, dentro il budget di ${budget}`,
        fail: (risk: string, budget: string) => `Il rischio allo stop è ${risk}, sopra il budget di ${budget}`,
      },
      marginHard: {
        pass: (margin: string, limit: string) => `Il margine è ${margin}, sotto la soglia di margine eccessivo del ${limit}`,
        fail: (margin: string, limit: string) => `Il margine è ${margin}, alla o sopra la soglia di margine eccessivo del ${limit}`,
      },
      marginWorking: {
        pass: (margin: string, ceiling: string) => `Il margine è ${margin}, dentro il tetto operativo del ${ceiling}`,
        fail: (margin: string, ceiling: string) => `Il margine è ${margin}, sopra il tetto operativo del ${ceiling}`,
      },
      targetMax: {
        pass: (profit: string, max: string) => `Una vincita di ${profit} resta al o sotto il tetto di ${max} a questo rapporto`,
        fail: (profit: string, max: string) => `Una vincita di ${profit} è sopra il tetto di ${max} a questo rapporto`,
        unknown: "Il ciclo non è ancora in profitto, quindi questa vincita non si può misurare contro un rapporto",
      },
      targetMin: {
        pass: (min: string) => `Questo take profit è abbastanza grande da riportare il picco esistente dentro il rapporto (minimo ${min})`,
        fail: (min: string) => `Questo take profit è sotto ${min}, quindi non riporta il picco esistente dentro il rapporto`,
        unknown: "Nessun minimo di vincita si applica finché il ciclo non è in profitto e già concentrato",
      },
      rewardRisk: {
        pass: (ratio: string) => `Il rapporto rischio/rendimento è ${ratio}:1`,
        fail: (ratio: string) => `Il rapporto rischio/rendimento è ${ratio}:1, peggio di 1:1`,
        unknown: "Il rapporto rischio/rendimento non è misurabile finché stop e target non sono validi",
      },
    },
  },

  tables: {
    trades: (count: number) => `Trade (${count})`,
    ideas: (count: number) => `Trade idea (${count})`,
    days: (count: number) => `Giorni (${count})`,
    ideasNote:
      "Stesso simbolo e stessa direzione, sovrapposti nel tempo oppure riaperti entro dieci minuti, raggruppati in un'unica idea. È l'unità a cui si applica il limite di rischio.",
    colTicket: "Ticket",
    colClosed: "Chiuso",
    colOpened: "Aperto",
    colSymbol: "Simbolo",
    colSide: "Direzione",
    colLots: "Lotti",
    colStop: "Stop",
    colNet: "Netto",
    colShare: "% del profitto netto",
    colLegs: "Gambe",
    colRisk: "Rischio allo stop",
    colMargin: "Margine",
    colDay: "Giorno",
    colTradeCount: "Trade",
    colCounts: "Conta per un ciclo",
    noStop: "assente",
    yes: "sì",
    no: "no",
    buy: "acquisto",
    sell: "vendita",
  },

  reference: {
    title: "I numeri pubblicati",
    desc: "Trascritti dalle pagine ufficiali di Hola Prime. I siti di recensioni citano 20%, 35%, 40% e 60% per il limite di concentrazione più o meno indifferentemente, quindi conviene citare solo il testo del firm.",
    quoteFooter: "Prohibited Trading Practices, clausola 3.1. La",
    archiveLink: (date: string) => `versione archiviata del ${date}`,
    quoteFooterEnd:
      "della stessa pagina non contiene alcuna clausola sulla concentrazione né alcuna percentuale.",
    facts: [
      { label: "Rischio per trade idea, conto funded", value: "2% del saldo iniziale — hard breach" },
      { label: "Rischio per trade idea, dentro il Consistency Program", value: "1% — hard breach" },
      { label: "Termine per lo stop loss", value: "Entro 3 minuti dall'apertura, altrimenti rischio infinito" },
      { label: "Una sola trade idea", value: "Stesso simbolo e direzione, sovrapposti o riaperti entro 10 minuti" },
      { label: "Margine eccessivo", value: "Utilizzo pari o superiore al 70%" },
      { label: "Margine aggregato nel Consistency Program", value: "Tetto del 30%" },
      { label: "Concentrazione dei profitti", value: "Oltre il 60% del profitto complessivo da una idea, sessione o esito" },
      { label: "Consistency score", value: "Miglior giorno ÷ profitto totale attuale del conto" },
      { label: "Payout on-demand", value: "Punteggio pari o sotto il 40%, più il 2% minimo di profitto, split 80%" },
      { label: "Payout bi-weekly", value: "3 giorni qualificanti su 14, split 80%" },
      { label: "Payout mensile", value: "7 giorni qualificanti su 30, split 95%" },
      { label: "Giorno qualificante", value: "Profitto netto chiuso di almeno lo 0,5% del saldo iniziale" },
    ],
  },

  footer: {
    text: "I valori delle regole sono trascritti dalle pagine pubblicate da Hola Prime e verificati ad agosto 2026. Le firm cambiano questi termini senza preavviso: verifica sulle pagine ufficiali e sul tuo contratto prima di agire. Questo è un calcolatore, non consulenza legale o finanziaria, e non ha alcun rapporto con Hola Prime.",
  },
};
