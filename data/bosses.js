var bosses = {
    "Najświętszy Edeus": {
        name: "Najświętszy Edeus",
        hp: 2000,
        maxHp: 2000,
        vitality: 50,
        intuition: 10,
        strength: 20,
        agility: 15,
        attunement: 40,
        perception: 20,
        accuracy: 25,
        reflex: 20,
        resilience: 25,
        damage: 100,
        physArmor: 15,
        magArmor: 50,
        abilities: [
            {
                name: "Dominująca obecność",
                description: "Pasywne. Psychicznie zmusza inne postacie do czynienia jego woli. Przeciwników może uratować tylko rzut na nieustępliwość z trudnością 25. Musi się on powieść za każdym razem, gdy chce się oprzeć woli Edeusa.",
                cooldown: 3
            },
            ability["Feniks"],
            ability["Narastający żar zagłady"],
        ]
    },
    "Astronytowy Niszczyciel": {
        name: "Astronytowy Niszczyciel",
        hp: 100000,
        maxHp: 100000,
        vitality: 500,
        strength: 500,
        intuition: 1,
        accuracy: 50,
        agility: 10,
        resilience: 500,
        reflex: 10,
        damage: 4000,
        physArmor: 200,
        magArmor: 200,
    },
    "Anomalia czasowa": {
        name: "Anomalia czasowa",
        hp: 600,
        maxHp: 600,
        vitality: 30,
        strength: 30,
        intuition: 10,
        accuracy: 20,
        agility: 10,
        resilience: 50,
        reflex: 50,
        damage: 150,
        physArmor: 0,
        magArmor: 0,
        abilities: [
            {
                name: "Ponadczasowe istnienie",
                description: "Pasywne. Postać zniekształca czas i spowalnia swoich przeciwników, sprawiając że ich akcję wykonują się dopiero w następnej turze.",
            },
            {
                name: "Zgubne przyspieszenie",
                description: "Rzuca na przeciwnika przyspieszenie, które wyprowadza go ze stanu spowolnienia na jedną turę. Otrzymanie zgubnego przyspieszenia zadaje [20] penetrujących obrażeń. Obrażenia wzrastają o 10 co turę.",
            },
        ],
        equipment: [
            {
                type: "gear",
                name: "Potworna tarcza zegarowa",
                description: "[+2 reflex]. Raz dziennie pozwala użytkownikowi na chwilę się mocno przyspieszyć. Użytkownik zyskuje 2 dodatkowe akcje w swojej kolejce. Sama aktywacja tarczy nie kosztuje akcji",
                physArmor: 5,
                magArmor: 8,
                value: "20 Z",
            },
        ],
    },
    "(Czerwone Szale) Herszt": {
        name: "(Czerwone Szale) Herszt",
        hp: 1500,
        maxHp: 1500,
        vitality: 30,
        strength: 30,
        intuition: 10,
        accuracy: 50,
        agility: 25,
        resilience: 25,
        reflex: 30,
        damage: 200,
        physArmor: 0,
        magArmor: 0,
        abilities: [
            {
                name: "Orientuj się",
                description: "[prop_reaction] [prop_unavoidable] Jeśli gracz będzie potrzebował więcej niż 8 sekund, aby zdecydować się co robi, zostanie postrzelony za [100] obrażeń",
                cooldown: 0
            },
            {
                name: "Dodatkowa akcja",
                description: "[prop_extra_turn] Postać porusza się dwa razy. Raz refleksem równym 100%, drugi raz z równym 50%.",
            },
            {
                name: "Niepokonany",
                description: "[prop_reaction] Blokuje jedną udaną próbę ogłuszenia.",
                cooldown: 5
            },
            {
                name: "Na dobitkę",
                description: "[prop_unavoidable] Strzela dwa razy w tego samego przeciwnika.",
                roll: "accuracy",
                difficulty: 15,
                cooldown: 1
            },
            {
                name: "Rykoszet",
                description: "[prop_unavoidable] Strzela w przeciwnika. Jeśli trafi, pocisk odbija się i leci w najbliższego przeciwnika.",
                roll: "accuracy",
                difficulty: 10,
                cooldown: 1
            },
            {
                name: "Granat błyskowy",
                description: "Rzuca granat błyskowy. Zmusza wszystkich przeciwników do rzutu refleks kontra refleks. Ktokolwiek wyrzuci mniej, zostaje oślepiony na [1] turę.",
                roll: "reflex",
                difficulty: "X",
                cooldown: 4
            },
            {
                name: "Furia Czerwonych Szali",
                description: "Można użyć tylko gdy ma się mniej niż 400 zdrowia. Wystrzeliwuje [30] pocisków w losowych wrogów, każdy z nich zadaje [100] obrażeń.",
                cooldown: "[cooldown_once]"
            },
        ],
    },
}