window.currentLanguage = localStorage.getItem('CombatManager-Language') || 'PL';

const i18n = {
    'PL': {
        // --- INTERFEJS / UI ---
        'active_conditions': 'Aktywne Stany',
        'music_list': 'Muzyka',
        'hover_to_expand': '(Najedź, aby rozwinąć)',
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
        'gm_dice': 'Kostka Mistrza Gry',
        'dice_short': 'K',
        'title_mute_ui': 'Wycisz aplikację',
        'title_change_language': 'Zmień język',
        'title_dice_size': 'Wielkość kości',

        // --- PLACEHOLDERS ---
        'placeholder_no_conditions': 'Brak aktywnych stanów',
        'placeholder_no_heroes': 'Brak dodanych bohaterów',
        'placeholder_no_enemies': 'Brak dodanych przeciwników',
        'placeholder_no_character_selected': 'Nie wybrano żadnej postaci',
        'placeholder_no_initiative': 'Brak postaci z refleksem. Nie można pokazać kolejki tur',
        'placeholder_no_music': 'Brak utworów do otworzenia',
        'placeholder_no_extra_content': 'Postać nie posiada umiejętności ani ekwipunku',

        // --- TOP BAR ---
        'btn_next_turn': 'Następna tura (T)',
        'btn_next_round': 'Następna runda (R)',
        'btn_end_combat': 'Koniec walki',
        'condition': 'Stan',
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
        'vitality': 'żywotność',
        'intuition': 'intuicja',
        'strength': 'siła',
        'agility': 'zwinność',
        'attunement': 'dostrojenie',
        'perception': 'percepcja',
        'accuracy': 'celność',
        'reflex': 'refleks',
        'resilience': 'nieustępliwość',
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

        // Zmiany gramatyczne dla modyfikatora "rzut na..." (biernik)
        'roll_hp': 'zdrowie',
        'roll_vitality': 'żywotność',
        'roll_intuition': 'intuicję',
        'roll_strength': 'siłę',
        'roll_agility': 'zwinność',
        'roll_attunement': 'dostrojenie',
        'roll_perception': 'percepcję',
        'roll_accuracy': 'celność',
        'roll_reflex': 'refleks',
        'roll_resilience': 'nieustępliwość',

        'result_for': 'rzut na {stat}',
        'margin_of': 'przewaga {stat}',
        'to_result': 'do wyniku {stat}',

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
        'toggle_stun': 'Przełącz ogłuszenie',
        'reload_character': 'Przeładuj postać',
        'save_character_stats': 'Zapisz statystyki do bazy danych postaci',
        'no_changes_detected': 'Nie wykryto żadnych zmian',
        'confirm_save_stats_alert': 'Czy na pewno chcesz wprowadzić zmiany w statystykach postaci do pliku? Zmiany są trwałe.',
        'save_success': 'Statystyki zostały pomyślnie zapisane do pliku źródłowego na serwerze!',
        'save_error': 'Błąd serwera! Nie udało się zapisać zmian w pliku źródłowym.',

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
        'cooldown_once': 'raz na walkę',
        'dead': 'Nie żyje',
        'prop_unavoidable': 'Nieunikalne.',
        'prop_piercing': 'Przebijające.',
        'prop_extra_turn': 'Daje dodatkową turę.',
        'prop_reaction': 'Reakcja.',
        'prop_non_combat': 'Nie do walki.',
        
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
        'hover_to_expand': '(Hover to expand)',
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
        'gm_dice': 'Game Master dice',
        'dice_short': 'D',
        'title_mute_ui': 'Mute UI',
        'title_change_language': 'Change language',
        'title_dice_size': 'Dice size',

       // --- PLACEHOLDERS ---
       'placeholder_no_conditions': 'No active conditions',
       'placeholder_no_heroes': 'No heroes added',
       'placeholder_no_enemies': 'No enemies added',
       'placeholder_no_character_selected': 'No character selected',
       'placeholder_no_initiative': "No characters with reflex. Can't show the initiative bar",
       'placeholder_no_music': 'No music available',
       'placeholder_no_extra_content': 'Character has no skills or equipment',

        // --- TOP BAR ---
        'btn_next_turn': 'Next turn (T)',
        'btn_next_round': 'Next round (R)',
        'btn_end_combat': 'End combat',
        'condition': 'Condition',
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
        'vitality': 'vitality',
        'intuition': 'intuition',
        'strength': 'strength',
        'agility': 'agility',
        'attunement': 'attunement',
        'perception': 'perception',
        'accuracy': 'accuracy',
        'reflex': 'reflex',
        'resilience': 'resilience',
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

        // Fallbacks for "roll_..." keys in English (identical to base stats)
        'roll_hp': 'HP',
        'roll_vitality': 'vitality',
        'roll_intuition': 'intuition',
        'roll_strength': 'strength',
        'roll_agility': 'agility',
        'roll_attunement': 'attunement',
        'roll_perception': 'perception',
        'roll_accuracy': 'accuracy',
        'roll_reflex': 'reflex',
        'roll_resilience': 'resilience',

        'result_for': '{stat} roll',
        'margin_of': '{stat} success margin',
        'to_result': 'to {stat} result',

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
        'remove_character': 'Remove character',
        'toggle_stun': 'Toggle stun',
        'resurrect_character': 'Ressurect character',
        'reload_character': 'Reload character',
        'save_character_stats': 'Save stats to base character template',
        'no_changes_detected': 'No stat changes detected',
        'confirm_save_stats_alert': "Are you sure you want to apply changes to character data file? It's permanent.",
        'save_success': 'Stats successfully written and saved to the backend source file!',
        'save_error': 'Server error! Failed to permanently write adjustments to the source file.',

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
        'cooldown_once': 'once per combat',
        'dead': 'Dead',
        'prop_unavoidable': 'Unavoidable.',
        'prop_piercing': 'Piercing.',
        'prop_extra_turn': 'Grants extra turn.',
        'prop_reaction': 'Reaction.',
        'prop_non_combat': 'Non combat.',
        
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

// Function triggered by the Player and GM language buttons
function toggleLanguage() {
    window.currentLanguage = window.currentLanguage === 'PL' ? 'EN' : 'PL';
    localStorage.setItem('CombatManager-Language', window.currentLanguage);
    location.reload(); // Reload the page to apply the new language
}