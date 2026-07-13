window.currentLanguage = localStorage.getItem('CombatManager-Language') || 'PL';

const i18n = {
    'PL': {
        // UI States
        'unavailable': 'Niedostępne',
        'available': 'Dostępne',
        'unknown_character': 'Nieznana postać',
        
        // Stats
        'name': 'Nazwa',
        'health': 'Zdrowie',
        'vitality': 'Żywotność',
        'intuition': 'Intuicja',
        'strength': 'Siła',
        'agility': 'Zwinność',
        'attunement': 'Dostrojenie',
        'perception': 'Percepcja',
        'accuracy': 'Celność',
        'reflex': 'Refleks',
        'resilience': 'Nieustępliwość',
        'damage': 'Obrażenia',
        'phys_armor': 'Pancerz fizyczny',
        'mag_armor': 'Pancerz magiczny',
        
        // UI Elements & Placeholders
        'value': 'Wartość',
        'heal': 'Leczenie',
        'armor': 'Pancerz',
        'mod': 'mod',
        'proc': 'proc',
        'conditions': 'Stany',
        'turn_order': 'Kolejność ruchów',
        'round': 'tura',
        
        // GM Menu
        'btn_turn_order': 'Pokaż kolejność ruchów (K)',
        'btn_new_round': 'Nowa tura (N)',
        'btn_end_combat': 'Zakończ walkę (Z)',
        'btn_music_list': 'Lista utworów (M)',
        'btn_toggle_music': 'Zatrzymaj / Wznów utwór (S)',
        'btn_toggle_sidebar': 'Wysuń / Schowaj boczne menu (L)',
        
        // GM Adding Characters
        'heroes': 'Bohaterowie',
        'enemies': 'Przeciwnicy',
        'add_specific_monster': '+ Dodaj konkretnego potwora',
        'add_specific_adventurer': '+ Dodaj konkretnego poszukiwacza',
        'add_boss': '+ Dodaj bossa',
        'add_monster': '+ Dodaj potwora',
        'add_adventurer': '+ Dodaj poszukiwacza',

        // Sidebar
        'turn_order_title': 'Kolejność ruchów: [tura',
        'conditions': 'Stany',
        'copy': 'Kopiuj',
        'music_list': 'Lista utworów:',
        
        // Abilities & Equipment
        'roll': 'Rzut:',
        'difficulty': 'Trudność:',
        'cooldown': 'Czas oczekiwania:',
        'success_chance': 'Szansa na powodzenie:',
        'gear': 'Oporządzenie',
        'other_items': 'Inne przedmioty',
        'quantity': 'Ilość:',
        
        // Notifications
        'copied': 'Skopiowano:',
        'pasted': 'Wklejono:',

        // Errors
        'copy_error': 'Błąd kopiowania!',
        'paste_error': 'Błąd wklejania z domyślnego schowka!',
        'no_stats_error': 'Brak wymaganych pól statystyki!',
        'invalid_url': 'Brak poprawnych graczy w URL!',
    },
    'EN': {
        // UI States
        'unavailable': 'Unavailable',
        'available': 'Available',
        'unknown_character': 'Unknown character',
        
        // Stats
        'name': 'Name',
        'health': 'Health',
        'vitality': 'Vitality',
        'intuition': 'Intuition',
        'strength': 'Strength',
        'agility': 'Agility',
        'attunement': 'Attunement',
        'perception': 'Perception',
        'accuracy': 'Accuracy',
        'reflex': 'Reflex',
        'resilience': 'Resilience',
        'damage': 'Damage',
        'phys_armor': 'Physical Armor',
        'mag_armor': 'Magical Armor',
        
        // UI Elements & Placeholders
        'value': 'Value',
        'heal': 'Heal',
        'armor': 'Armor',
        'mod': 'mod',
        'proc': 'perc',
        'conditions': 'Conditions',
        'turn_order': 'Turn order',
        'round': 'round',
        
        // GM Menu
        'btn_turn_order': 'Show turn order (K)',
        'btn_new_round': 'New round (N)',
        'btn_end_combat': 'End combat (Z)',
        'btn_music_list': 'Music list (M)',
        'btn_toggle_music': 'Pause / Resume music (S)',
        'btn_toggle_sidebar': 'Toggle sidebar (L)',
        
        // GM Adding Characters
        'heroes': 'Heroes',
        'enemies': 'Enemies',
        'add_specific_monster': '+ Add specific monster',
        'add_specific_adventurer': '+ Add specific adventurer',
        'add_boss': '+ Add boss',
        'add_monster': '+ Add monster',
        'add_adventurer': '+ Add adventurer',

        // Sidebar
        'turn_order_title': 'Turn order: [round',
        'conditions': 'Conditions',
        'copy': 'Copy',
        'music_list': 'Music list:',
        
        // Abilities & Equipment
        'roll': 'Roll:',
        'difficulty': 'Difficulty:',
        'cooldown': 'Cooldown:',
        'success_chance': 'Success chance:',
        'gear': 'Gear',
        'other_items': 'Other items',
        'quantity': 'Quantity:',
        
        // Notifications
        'copied': 'Copied:',
        'pasted': 'Pasted:',

        // Errors
        'copy_error': 'Copy error!',
        'paste_error': 'Paste error from clipboard!',
        'no_stats_error': 'Required stat fields missing!',
        'invalid_url': 'No valid players in URL!',
    }
};

// Returns a translated word, or the key itself if the translation is missing
function t(key) {
    return (i18n[window.currentLanguage] && i18n[window.currentLanguage][key]) || key;
}

// Function triggered by the Player and GM language buttons
function toggleLanguage() {
    window.currentLanguage = window.currentLanguage === 'PL' ? 'EN' : 'PL';
    localStorage.setItem('CombatManager-Language', window.currentLanguage);
    location.reload(); // Reload the page to apply the new language
}