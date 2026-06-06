/**
 * Dutch copy dictionary (default locale). Brand voice (§1/§13): direct,
 * benefit-driven, lightly cheeky — "Zij onthoudt alles. Jij niet."
 * All user-facing strings live here so an English locale can be slotted in.
 *
 * Use {placeholders} for interpolation via `t()` in ./index.ts.
 */
export const nl = {
  brand: {
    name: "Attent",
    tagline: "Thoughtful on autopilot.",
  },

  // Splash shown briefly on each login / app open (§ login splash).
  splash: {
    welcomeBack: "Welkom terug, {name}.",
    welcome: "Welkom terug.",
    tapToEnter: "Tik om verder te gaan",
    // Motivating, marketing-register lines on *why* he makes the effort.
    // Paired by index with the photos in src/lib/splash.ts.
    lines: [
      "Grootse momenten beginnen met een klein gebaar.",
      "Vijf minuten nu. Een glimlach die blijft.",
      "Jij dacht eraan. Dat is alles wat telt.",
      "Zij onthoudt hoe het voelde. Jij regelde het.",
      "De verrassing is voor haar. De credits zijn voor jou.",
    ],
  },

  nav: {
    home: "Vandaag",
    dates: "Data",
    her: "Zij",
    inspiration: "Inspiratie",
    settings: "Profiel",
  },

  common: {
    save: "Opslaan",
    cancel: "Annuleren",
    delete: "Verwijderen",
    edit: "Bewerken",
    add: "Toevoegen",
    confirm: "Bevestigen",
    later: "Later",
    skip: "Overslaan",
    next: "Volgende",
    back: "Terug",
    done: "Klaar",
    loading: "Even geduld…",
    optional: "optioneel",
    daysLeft: "{n} dagen te gaan",
    oneDayLeft: "Nog 1 dag",
    today: "Vandaag",
  },

  auth: {
    signInTitle: "Welkom terug",
    signUpTitle: "Maak een account",
    email: "E-mailadres",
    password: "Wachtwoord",
    signIn: "Inloggen",
    signUp: "Account maken",
    withGoogle: "Verder met Google",
    toSignUp: "Nog geen account? Maak er een.",
    toSignIn: "Heb je al een account? Log in.",
    checkEmail: "Check je mail om je account te bevestigen.",
  },

  onboarding: {
    progress: "Stap {step} van {total}",
    account: {
      title: "Begin hier",
      subtitle: "Eén account. Daarna onthoudt Attent de rest.",
    },
    aboutYou: {
      title: "Over jou",
      firstName: "Je voornaam",
      photo: "Foto",
    },
    partner: {
      title: "Over haar",
      name: "Haar naam",
      pronoun: "Aanspreekvorm",
      endearment: "Koosnaampje",
      birthday: "Verjaardag",
      relationshipStart: "Samen sinds",
    },
    dates: {
      title: "Belangrijke data",
      subtitle: "Voeg toe wat je niet mag vergeten. Later kan altijd meer.",
      addBirthday: "Verjaardag",
      addAnniversary: "Jullie jubileum",
      addValentine: "Valentijn",
      addRecurring: "Verras haar regelmatig",
      recurringHelp: "Bijv. elke 3 weken een kleine attentie.",
    },
    facts: {
      title: "Haar cheat sheet",
      subtitle: "Hoe meer je invult, hoe beter de tips. Alles is optioneel.",
      flowers: "Favoriete bloemen",
      cuisine: "Favoriete keuken",
      drink: "Koffie / drankje",
      sizes: "Kledingmaten",
      loveLanguage: "Liefdestaal",
      dislikes: "No-go's (wat ze niet wil)",
      wishlist: "Wenslijst-hints",
    },
    permissions: {
      title: "Twee laatste dingen",
      notifications: "Meldingen",
      notificationsWhy: "Zodat Attent je op het juiste moment porren kan.",
      calendar: "Agenda koppelen",
      calendarWhy: "Zodat we een vrij moment vinden als je iets uitbesteedt.",
      enable: "Aanzetten",
    },
    finish: "Klaar. Op naar vandaag.",
  },

  home: {
    calmTitle: "Je bent helemaal bij.",
    calmBody: "Niets dringends. We porren je als er iets aankomt.",
    nextUp: "Binnenkort",
    activeNudgeKicker: "Tijd voor actie",
    selfDo: "Ik regel het zelf",
    outsource: "Laat Attent het regelen",
    seeIdea: "Bekijk het idee",
    snooze: "Later",
    dismiss: "Niet nu",
    creditsLine: "Geregeld. Jij krijgt de credits.",
  },

  dates: {
    title: "Data",
    upcoming: "Binnenkort",
    recurring: "Terugkerend",
    past: "Geweest",
    empty: "Nog geen data. Voeg er een toe — stop met raden.",
    addTitle: "Nieuwe datum",
    fieldTitle: "Titel",
    fieldType: "Type",
    fieldDate: "Datum",
    fieldLeadTime: "Hoeveel dagen vooraf porren",
    fieldRecurrence: "Herhaling",
    active: "Actief",
    typeBirthday: "Verjaardag",
    typeAnniversary: "Jubileum",
    typeValentines: "Valentijn",
    typeCustom: "Eigen datum",
    typeRecurring: "Terugkerende attentie",
  },

  her: {
    title: "Zij",
    cheatSheet: "Cheat sheet",
    avoid: "Wat je moet vermijden",
    avoidHelp: "Zodat een tip nooit iets voorstelt wat ze haat.",
    learnedFromReel: "Geleerd van een reel",
    enteredManually: "Zelf ingevuld",
    confirmFact: "Klopt dit?",
    addFact: "Feitje toevoegen",
    emptyCategory: "Nog niets hier.",
    categories: {
      flowers: "Bloemen",
      food: "Eten",
      drink: "Drinken",
      sizes: "Maten",
      love_language: "Liefdestaal",
      dislike: "No-go's",
      wishlist: "Wenslijst",
      misc: "Overig",
    },
  },

  inspiration: {
    title: "Inspiratie",
    pasteLabel: "Plak een link",
    pastePlaceholder: "Plak een Instagram-reel of andere link…",
    pasteHelp: "Zij stuurt jou de reels die ze leuk vindt. Attent onthoudt ze.",
    parse: "Ophalen",
    parsing: "Aan het ophalen…",
    previewTitle: "Klopt dit?",
    saveItem: "Bewaren",
    manualAdd: "Handmatig toevoegen",
    feedEmpty: "Nog geen inspiratie. Plak een link om te beginnen.",
    filterAll: "Alles",
    toFact: "Naar cheat sheet",
  },

  settings: {
    title: "Profiel",
    account: "Account",
    partner: "Partner",
    subscription: "Abonnement",
    manageBilling: "Beheer abonnement",
    calendar: "Agenda",
    connectGoogle: "Google Agenda koppelen",
    disconnect: "Ontkoppelen",
    notifications: "Meldingen",
    quietHours: "Stille uren",
    escalationTone: "Toon van de porren",
    toneGentle: "Zacht",
    toneStandard: "Standaard",
    tonePersistent: "Vasthoudend",
    privacy: "Privacy",
    exportData: "Exporteer mijn data",
    deleteAccount: "Verwijder account + alle data",
    deleteConfirm: "Zeker weten? Dit verwijdert alles permanent.",
    signOut: "Uitloggen",
  },

  suggestion: {
    why: "Waarom dit",
    estCost: "Geschat: {amount}",
    free: "Gratis",
  },

  outsource: {
    title: "Laat Attent het regelen",
    checkingCalendar: "Agenda checken…",
    pickTime: "Kies een moment",
    partySize: "Aantal personen",
    messageTitle: "Bericht voor {name}",
    messageHelp: "Stuur dit alsof jij het bedacht — want dat deed je.",
    summary: "Dit gaat er gebeuren",
    confirmCta: "Bevestig",
    confirmHelp: "Er wordt niets geboekt, betaald of verstuurd voor je bevestigt.",
    successTitle: "Geregeld.",
    successBody: "Jij krijgt de credits.",
  },

  privacy: {
    onboardingNote:
      "De gegevens over haar zijn jouw eigen aantekeningen. Je kunt ze altijd aanpassen of wissen. Reels lezen we alleen via openbare info.",
  },
} as const;

export type Dictionary = typeof nl;
