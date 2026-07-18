window.currentLanguage = localStorage.getItem('CombatManager-Language') || 'PL';

const i18n = {
    'PL': {
        // --- INTERFEJS / UI ---
        'active_conditions': 'Aktywne Stany',
        'music_list': 'Lista Muzyki',
        'turn_order_title': 'Kolejność ruchów: [tura',
        'round': 'tura',
        'conditions': 'Stany',
        'unknown_character': 'Nieznana postać',
        'target': 'Cel:',
        'copy': 'Kopiuj',
        'value': 'wartość',
        'value_flat': 'Wartość: stała',
        'value_perc': 'Wartość: procentowa',
        'condition_copy': 'Kopiuj cel',
        'condition_remove': 'Usuń stan',
        'condition_duration': 'Pozostały czas trwania',

        // --- TOP BAR ---
        'btn_next_turn': 'Następna tura (T)',
        'btn_next_round': 'Następna runda (R)',
        'btn_end_combat': 'Zakończ walkę (Z)',
        'condition': 'Stan',
        'round_short': 't',
        'no_conditions': 'Brak aktywnych stanów',
        'confirm_end_combat': 'Zakończyć walkę i usunąć wszystkie postacie oraz stany?',
        
        // --- DODAWANIE POSTACI ---
        'add_mob': '+ Dodaj moba',
        'add_npc': '+ Dodaj NPC',
        'add_boss': '+ Dodaj bossa',
        'add_player': '+ Dodaj gracza',
        'add_character': '+ Dodaj postać',
        
        // --- KARTA POSTACI (LEWA KOLUMNA) ---
        'health': 'Zdrowie',
        'tab_rolls': 'Rzuty',
        'tab_damage': 'Obrażenia',
        'last_roll': 'Ostatni Rzut',
        
        // --- STATYSTYKI (RZUTY) ---
        'vitality': 'Żywotność',
        'intuition': 'Intuicja',
        'strength': 'Siła',
        'agility': 'Zwinność',
        'attunement': 'Dostrojenie',
        'perception': 'Percepcja',
        'accuracy': 'Celność',
        'reflex': 'Refleks',
        'resilience': 'Nieustępliwość',
        'mod': 'mod',

        // Zmiany gramatyczne do opisów umiejętności
        'desc_hp': 'zdrowia',
        'desc_vitality': 'żywotności',
        'desc_intuition': 'intuicji',
        'desc_strength': 'siły',
        'desc_agility': 'zwinności',
        'desc_attunement': 'dostrojenia',
        'desc_perception': 'percepcji',
        'desc_accuracy': 'celności',
        'desc_reflex': 'refleksu',
        'desc_resilience': 'nieustępliwości',
        'desc_damage': 'obrażeń',
        'desc_phys_armor': 'pancerza fizycznego',
        'desc_mag_armor': 'pancerza magicznego',
        'desc_mod': 'mod',

        // Zmiany gramatyczne do rzutów umiejętności
        'mod_vitality': 'do rzutu na żywotność',
        'mod_intuition': 'do rzutu na intuicję',
        'mod_strength': 'do rzutu na siłę',
        'mod_agility': 'do rzutu na zwinność',
        'mod_attunement': 'do rzutu na dostrojenie',
        'mod_perception': 'do rzutu na percepcję',
        'mod_accuracy': 'do rzutu na celność',
        'mod_reflex': 'do rzutu na refleks',
        'mod_resilience': 'do rzutu na nieustępliwość',

        // --- WALKA I OBRAŻENIA ---
        'damage': 'Obrażenia',
        'base_damage': 'Obrażenia Baz.',
        'heal': 'Leczenie',
        'add_armor': 'Dodaj Pancerz',
        'phys_armor': 'Pancerz fizyczny',
        'mag_armor': 'Pancerz magiczny',
        'phys_armor_caps': 'Panc. FIZYCZNY',
        'mag_armor_caps': 'Panc. MAGICZNY',
        'deaths_door': "Wrota śmierci",
        'roll': "RZUT",

        'dmg_type_phys': 'Fizyczne',
        'dmg_type_phys_short': 'FIZ',
        'dmg_type_mag': 'Magiczne',
        'dmg_type_mag_short': 'MAG',
        'dmg_type_pierce': 'Przebijające',
        'dmg_type_pierce_short': 'PRZ',
        
        'heal_type_normal': 'Zwykłe',
        'heal_type_normal_short': 'ZWY',
        'heal_type_threshold': 'Do progu',
        'heal_type_threshold_short': 'PRÓG',
        'heal_type_group': 'Grupowe',
        'heal_type_group_short': 'GRP',

        'armor_type_phys': 'Fizyczny',
        'armor_type_phys_short': 'FIZ',
        'armor_type_mag': 'Magiczny',
        'armor_type_mag_short': 'MAG',

        'armor_value_base': 'Wartość podstawowa',
        'armor_value_percent': 'Wartość procentowa',

        // Pasek funkcyjny
        'remove_character': 'Usuń postać',
        'reload_character': 'Przeładuj postać',
        'toggle_stun': 'Przełącz ogłuszenie',

        // --- UMIEJĘTNOŚCI I EKWIPUNEK (PRAWY PANEL) ---
        'tab_skills': 'Umiejętności',
        'tab_equip': 'Ekwipunek',
        'unavailable': 'Niedostępne',
        'available': 'Dostępne',
        'ability_roll': 'Rzut:',
        'ability_difficulty': 'Trudność:',
        'ability_cooldown': 'Czas oczekiwania:',
        'ability_success_chance': 'Szansa na powodzenie:',
        'gear': 'Oporządzenie',
        'other_items': 'Inne przedmioty',
        'quantity': 'Ilość:',
        'extra_action_ability': 'dodatkowa akcja',
        'cooldown_once': 'raz',
        'prop_unavoidable': 'Nieunikalne.',
        'prop_piercing': 'Przebijające.',
        'dead': 'Nie żyje',
        
        // --- POWIADOMIENIA I BŁĘDY ---
        'copied': 'Skopiowano:',
        'pasted': 'Wklejono:',
        'copy_error': 'Błąd kopiowania!',
        'paste_error': 'Błąd wklejania z domyślnego schowka!',
        'no_stats_error': 'Brak wymaganych pól statystyki!',
        'invalid_url': 'Brak poprawnych graczy w URL!',
        'connection_error': 'Błąd połączenia (zapewne serwer nie jest włączony)',
    },
    'EN': {
        // --- INTERFEJS / UI ---
        'active_conditions': 'Active Conditions',
        'music_list': 'Music List',
        'round': 'round',
        'conditions': 'Conditions',
        'unknown_character': 'Unknown character',
        'target': 'Target:',
        'copy': 'Copy',
        'value': 'value',
        'value_flat': 'Value: flat',
        'value_perc': 'Value: percentage',
        'condition_copy': 'Copy target',
        'condition_remove': 'Remove condition',
        'condition_duration': 'Remaining duration',


        // --- TOP BAR ---
        'btn_next_turn': 'Next turn (T)',
        'btn_next_round': 'Next round (R)',
        'btn_end_combat': 'End combat (Z)',
        'condition': 'Condition',
        'round_short': 't',
        'no_conditions': 'No active conditions',
        'confirm_end_combat': 'End combat and remove all characters and conditions?',
        
        // --- DODAWANIE POSTACI ---
        'add_mob': '+ Add mob',
        'add_npc': '+ Add NPC',
        'add_boss': '+ Add boss',
        'add_player': '+ Add player',
        'add_character': '+ Add character',
        
        // --- KARTA POSTACI (LEWA KOLUMNA) ---
        'health': 'Health',
        'tab_rolls': 'Rolls',
        'tab_damage': 'Damage',
        'last_roll': 'Last Roll',
        
        // --- STATYSTYKI (RZUTY) ---
        'vitality': 'Vitality',
        'intuition': 'Intuition',
        'strength': 'Strength',
        'agility': 'Agility',
        'attunement': 'Attunement',
        'perception': 'Perception',
        'accuracy': 'Accuracy',
        'reflex': 'Reflex',
        'resilience': 'Resilience',
        'mod': 'mod',

        // Zmiany gramatyczne (w j.ang. w zasadzie podstawowe słowa)
        'desc_hp': 'HP',
        'desc_vitality': 'vitality',
        'desc_intuition': 'intuition',
        'desc_strength': 'strength',
        'desc_agility': 'agility',
        'desc_attunement': 'attunement',
        'desc_perception': 'perception',
        'desc_accuracy': 'accuracy',
        'desc_reflex': 'reflex',
        'desc_resilience': 'resilience',
        'desc_damage': 'damage',
        'desc_phys_armor': 'physical armor',
        'desc_mag_armor': 'magical armor',
        'desc_mod': 'mod',

        // Zmiany gramatyczne do rzutów umiejętności
        'mod_vitality': 'to vitality roll',
        'mod_intuition': 'to intuition roll',
        'mod_strength': 'to strength roll',
        'mod_agility': 'to agility roll',
        'mod_attunement': 'to attunement roll',
        'mod_perception': 'to perception roll',
        'mod_accuracy': 'to accuracy roll',
        'mod_reflex': 'to reflex roll',
        'mod_resilience': 'to resilience roll',

        // --- WALKA I OBRAŻENIA ---
        'damage': 'Damage',
        'base_damage': 'Base Damage',
        'heal': 'Heal',
        'add_armor': 'Add Armor',
        'phys_armor': 'Physical armor',
        'mag_armor': 'Magical armor',
        'phys_armor_caps': 'PHYS Armor',
        'mag_armor_caps': 'MAG Armor',
        'deaths_door': "Death's door",
        'roll': "ROLL",

        'dmg_type_phys': 'Physical',
        'dmg_type_phys_short': 'PHYS',
        'dmg_type_mag': 'Magical',
        'dmg_type_mag_short': 'MAG',
        'dmg_type_pierce': 'Piercing',
        'dmg_type_pierce_short': 'PIERCE',
        
        'heal_type_normal': 'Normal',
        'heal_type_normal_short': 'NORM',
        'heal_type_threshold': 'To threshold',
        'heal_type_threshold_short': 'THRESH',
        'heal_type_group': 'Group',
        'heal_type_group_short': 'GRP',
    
        'armor_type_phys': 'Physical',
        'armor_type_phys_short': 'PHYS',
        'armor_type_mag': 'Magical',
        'armor_type_mag_short': 'MAG',

        'armor_value_base': 'Base value',
        'armor_value_percent': 'Percent value',

        // Pasek funkcyjny
        'remove_character': 'Delete character',
        'reload_character': 'Reload character',
        'toggle_stun': 'Toggle stun',

        // --- UMIEJĘTNOŚCI I EKWIPUNEK (PRAWY PANEL) ---
        'tab_skills': 'Skills',
        'tab_equip': 'Equipment',
        'unavailable': 'Unavailable',
        'available': 'Available',
        'ability_roll': 'Roll:',
        'ability_difficulty': 'Difficulty:',
        'ability_cooldown': 'Cooldown:',
        'ability_success_chance': 'Success chance:',
        'gear': 'Gear',
        'other_items': 'Other items',
        'quantity': 'Quantity:',
        'extra_action_ability': 'extra action',
        'cooldown_once': 'once',
        'prop_unavoidable': 'Unavoidable.',
        'prop_piercing': 'Piercing.',
        'dead': 'Dead',
        
        // --- POWIADOMIENIA I BŁĘDY ---
        'copied': 'Copied:',
        'pasted': 'Pasted:',
        'copy_error': 'Copy error!',
        'paste_error': 'Paste error from clipboard!',
        'no_stats_error': 'Required stat fields missing!',
        'invalid_url': 'No valid players in URL!',
        'connection_error': 'Connection error (it probably means server is down)',  
    }
};

// Returns a translated word, or the key itself if the translation is missing
function t(key) {
    return (i18n[window.currentLanguage] && i18n[window.currentLanguage][key]) || key;
}

// Checks if a given text matches any translation of a specific key across all languages
function matchesAnyLanguage(text, dictionaryKey) {
    const lowerText = text.toLowerCase().trim();
    return Object.keys(i18n).some(lang => {
        return i18n[lang][dictionaryKey] && i18n[lang][dictionaryKey].toLowerCase() === lowerText;
    });
}

// Function triggered by the Player and GM language buttons
function toggleLanguage() {
    window.currentLanguage = window.currentLanguage === 'PL' ? 'EN' : 'PL';
    localStorage.setItem('CombatManager-Language', window.currentLanguage);
    location.reload(); // Reload the page to apply the new language
}