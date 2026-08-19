var item = {
    "Ostateczny Item Testowy": {
        type: "gear",
        name: "Ostateczny Item Testowy",
        description: "Zmienia statystyki tak: siła: {stats.strength}, reflex: {stats.reflex}, modyfikator intuicji: {stats.intuitionMod}, modyfikator zwinności: {stats.agilityMod}, zdrowie: {stats.maxHp}, obrażenia: {stats.damage}, pancerz fizyczny: {stats.physArmor}, pancerz fizyczny procentowy: {stats.physArmorPerc}, pancerz magiczny: {stats.magArmor}, pancerz magiczny procentowy: {stats.magArmorPerc}.",
        stats: {
            strength: 2,
            reflex: -2,
            intuitionMod: -3,
            agilityMod: 1,
            maxHp: "[10 + 1 * reflex - 1 * strength]",
            damage: "[2 * strength]",
            physArmor: "[0.5 * vitality]",
            physArmorPerc: 20,
            magArmor: "[-3 - 0.5 * intuition]",
            magArmorPerc: "[20 - 0.5 * intuition]",
        },
    },
    "Ostateczny Item Testowy 2": {
        type: "gear",
        name: "Ostateczny Item Testowy 2",
        description: "Jest wredny, odejmuje -70 hp.",
        properties: ["prop_extra_turn"],
        stats: {
            maxHp: "[-1 * attunement + 2 * vitality]",
            damage: "[1 * resilience]",
            physArmor: "[-10 + 2 * vitality]",
            physArmorPerc: -30,
            magArmor: 5,
            magArmorPerc: "[-5 + 0.8 * intuition]",
        },
    }
}