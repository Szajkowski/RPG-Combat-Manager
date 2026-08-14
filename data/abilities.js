var ability = {
    
    // fire, first tier
    
    "Żarzący dotyk": {
        name: "Żarzący dotyk",
        description: "Rozgrzewa do czerwoności ręce maga i zadaje nimi [3 * vitality] obrażeń.",
        roll: "vitality",
        difficulty: 3,
        cooldown: 0
    },
    "Mniejsze rozpalenie": {
        name: "Mniejsze rozpalenie",
        description: "Zwiększa żywotność celu o [5]. Trwa [8] tur.",
        roll: "vitality",
        difficulty: 4,
        cooldown: 0,
        effect: "Rozpalony. Zwiększa żywotność o [5].",
        effectDuration: "8t"
    },
    "Kula ognia": {
        name: "Kula ognia",
        description: "Wystrzeliwuje kulę ognia, która zadaje [2 * vitality] obrażeń + [1 * vitality] od eksplozji, razem [3 * vitality] obrażeń.",
        roll: "vitality",
        difficulty: 5,
        cooldown: 0
    },
    "Płomień ochronny": {
        name: "Płomień ochronny",
        description: "Leczy za [4 * vitality] zdrowia i daje tarczę, która przypali wroga za [50]% następnego ataku wręcz (maksymalnie [8 * vitality]).",
        roll: "vitality",
        difficulty: 6,
        cooldown: 1,
        effect: "Ognista tarcza. Zadaje [50]% obrażeń ataku wręcz. Maksymalnie [8 * vitality]",
        effectDuration: "-"
    },
    "Oślepiający rozbłysk": {
        name: "Oślepiający rozbłysk",
        description: "Wytwarza przed magiem rozbłysk pełen jasnych iskier, które lekko oślepiają ([-5] do rzutów na celność przez następną turę) wszystkie jednostki patrzące w jego kierunku.",
        roll: "vitality",
        difficulty: 6,
        cooldown: 0,
        effect: "Oślepiony. [-5] do rzutów na celność",
        effectDuration: "1t"
    },
    "Mały smok": {
        name: "Mały smok",
        description: "Zieje ogniem z ust, zadając [2 * vitality] obrażeń wszystkim postaciom stojącym przed magiem. Czar można utrzymać jeszcze przez następną kolejkę bez ponownego rzutu.",
        roll: "vitality",
        difficulty: 8,
        cooldown: 1
    },
    "Mniejsze podpalenie": {
        name: "Mniejsze podpalenie",
        description: "Lekko podpala cel, zadając mu [1 * vitality] obrażeń co turę, aż zostanie zgaszony lub zginie.",
        roll: "vitality",
        difficulty: 8,
        cooldown: 1,
        effect: "Podpalony. Otrzymuje [1 * vitality] obrażeń co turę",
        effectDuration: "-"
    },
    "Ognisty sabotaż": {
        name: "Ognisty sabotaż",
        description: "[prop_undodgeable] Rozgrzewa broń celu. Rzut na żywotność maga kontra nieustępliwość celu. Jeśli mag wygra, cel puszcza broń i nie może jej podnieść przez swoją następną kolejkę.",
        roll: "vitality",
        difficulty: "X",
        cooldown: 2,
        effect: "Rozgrzana broń. Niemożność podniesienia broni.",
        effectDuration: "2t"
    },


// fire, second tier


    "Płomienne złączenie": {
        name: "Płomienne złączenie",
        description: "Leczy maga oraz jego cel za [6 * vitality].",
        roll: "vitality",
        difficulty: 12,
        cooldown: 2
    },
    "Ściana ognia": {
        name: "Ściana ognia",
        description: "Tworzy prostokątną ścianę ognia, którą można posłać w przeciwników, zadając im [4 * vitality] obrażeń.",
        roll: "vitality",
        difficulty: 14,
        cooldown: 3
    },
    "Piroliza": {
        name: "Piroliza",
        description: "Tworzy ogromną kulę lawy, którą można posłać w cel. Pocisk zada [10 * vitality] obrażeń. Mag potrzebuje dwóch tur, aby ukończyć zaklęcie i jest między nimi podatny na przerwania.",
        roll: "vitality",
        difficulty: 15,
        cooldown: 5
    },
    "Roztapiacz pancerza": {
        name: "Roztapiacz pancerza",
        description: "[prop_undodgeable] Zmniejsza pancerz magiczny celu o [2 * roll].",
        roll: "vitality",
        difficulty: "X",
        cooldown: 4
    },
    "Pętla ognia": {
        name: "Pętla ognia",
        description: "[prop_undodgeable] Rysuje pod celem runę, która wybucha za [5 * roll] obrażeń.",
        roll: "vitality",
        difficulty: "X",
        cooldown: 4
    },


// fire, non-combat


    "Płomyczek oświetliczek": {
        name: "Płomyczek oświetliczek",
        description: "Zapala mały, ale bardzo jasny płomyk na końcu kciuka maga.",
        roll: "vitality",
        difficulty: 2,
        cooldown: 0
    },
    "Przypalająca reformacja": {
        name: "Przypalająca reformacja",
        description: "Tamuje krwotoki celu oraz pozwala 'przyspawać' odciętą kończynę z powrotem do ciała. Jeśli jest w dobrym stanie.",
        roll: "vitality",
        difficulty: 10,
        cooldown: 0
    },


// fire, legendary


    "Narastający żar zagłady": {
        name: "Narastający żar zagłady",
        description: "Wyczarowuje niszczycielski płomień, który zada [2 ^ over] obrażeń celowi. Jeśli to zabije cel, zostanie z niego tylko popiół.",
        roll: "vitality",
        difficulty: 30,
        cooldown: "[cooldown_once]"
    },
    "Feniks": {
        name: "Feniks",
        description: "Tworzy ogniste skrzydła, umożliwiające lot. Zaklęcie trwa do końca walki lub do śmierci maga. W przypadku śmierci mag wywołuje potężną eksplozję za [10 * vitality] i odradza się z pełnym zdrowiem.",
        roll: "vitality",
        difficulty: 20,
        cooldown: "[cooldown_once]",
        effect: "Feniks. Możliwość lotu. W razie śmierci eksploduje za [10 * vitality] i wraca z pełnym zdrowiem.",
        effectDuration: "-"
    },


// fire, special


    "Płonący omen": {
        name: "Płonący omen",
        description: "[prop_undodgeable] Tworzy nad celem ognistą runę. Runa aktywuje się, gdy cel otrzyma obrażenia magiczne i przypali go za drugie tyle.",
        roll: "vitality",
        difficulty: 12,
        cooldown: 5
    },


// water, first tier


    "Mrożący dotyk": {
        name: "Mrożący dotyk",
        description: "Mrozi ręce na lód i zadaje nimi [2 * intuition] obrażeń oraz podmraża cel, zmniejszając jego rzuty na zwinność o [-4] przez [2] tury.",
        roll: "intuition",
        difficulty: 3,
        cooldown: 0,
        effect: "Podmrożony. [-4] do rzutów na zwinność",
        effectDuration: "2t"
    },
    "Wodny bicz": {
        name: "Wodny bicz",
        description: "Tworzy bicz z wody. Uderza on za [2 * intuition] obrażeń oraz podmraża cel, zmniejszając jego rzuty na zwinność o [-4] przez [2] tury.",
        roll: "intuition",
        difficulty: 5,
        cooldown: 0,
        effect: "Podmrożony. [-4] do rzutów na zwinność",
        effectDuration: "2t"
    },
    "Regeneracja": {
        name: "Regeneracja",
        description: "Leczy cel za [4 * intuition] zdrowia oraz jeszcze raz za [2 * intuition] na początku następnej tury.",
        roll: "intuition",
        difficulty: 6,
        cooldown: 1,
        effect: "Regeneracja. Uleczony za [2 * intuition] na początku następnej tury.",
        effectDuration: "-"
    },
    "Lodowe wiertło": {
        name: "Lodowe wiertło",
        description: "Tworzy na dłoni lodowe wiertło. Atak wiertłem zadaje [3 * intuition] obrażeń.",
        roll: "intuition",
        difficulty: 8,
        cooldown: 1
    },
    "Łagodząca fala": {
        name: "Łagodząca fala",
        description: "Zdejmuje przerażenie, szaleństwo i inne podobne efekty z celu oraz może go zgasić. Dodatkowo fala zmniejsza trudność zaklęć rzucanych przez cel o [-4] przez [2] tury.",
        roll: "intuition",
        difficulty: 9,
        cooldown: 2,
        effect: "Skupiony. [-4] do trudności rzucania zaklęć",
        effectDuration: "2t"
    },
    "Pazur oceanu": {
        name: "Pazur oceanu",
        description: "Przywołuje pędzącą falę, która zada [3 * intuition] obrażeń jednemu celowi i przewróci go (rzut intuicja kontra nieustępliwość).",
        roll: "intuition",
        difficulty: 10,
        cooldown: 1
    },
    "Magiczne zwierciadło": {
        name: "Magiczne zwierciadło",
        description: "Tworzy lodowe lustro przed celem. Lustro odbije [50]% następnych magicznych obrażeń z powrotem w agresora. Nie odbija penetrujących ataków. Użycie penetrującego ataku niszczy lustro.",
        roll: "intuition",
        difficulty: 10,
        cooldown: 2,
        effect: "Lodowe lustro. Odbija [50]% następnych magicznych obrażeń",
        effectDuration: "-"
    },
    "Oczyszczenie": {
        name: "Oczyszczenie",
        description: "Niweluje truciznę, uzdatnia do picia wodę oraz rozprasza klątwy.",
        roll: "intuition",
        difficulty: "X",
        cooldown: 0
    },


// water, second tier


    "Grupowe orzeźwienie": {
        name: "Grupowe orzeźwienie",
        description: "Leczy grupowo za [3 * intuition] zdrowia.",
        roll: "intuition",
        difficulty: 12,
        cooldown: 2
    },
    "Przeszywający mróz": {
        name: "Przeszywający mróz",
        description: "[prop_undodgeable] Mocno schładza wodę w organizmie celu, zadając [5 * intuition] obrażeń i zmniejszając jego rzuty na zwinność o [-6] przez [2] tury.",
        roll: "intuition",
        difficulty: 12,
        cooldown: 3,
        effect: "Zmrożony. [-6] do rzutów na zwinność",
        effectDuration: "2t"
    },
    "Wodna powłoka": {
        name: "Wodna powłoka",
        description: "Dodaj celowi [10] pancerza magicznego. Pancerz utrzymuje się przez całą walkę.",
        roll: "intuition",
        difficulty: 15,
        cooldown: 3
    },


// water, non-combat


    "Wysuszenie": {
        name: "Wysuszenie",
        description: "Zamień całą wodę na sobie w parę. Można to robić także na innych istotach czy przedmiotach, ale wymaga dotyku.",
        roll: "intuition",
        difficulty: 3,
        cooldown: 0
    },
    "Odnawiający nurt": {
        name: "Odnawiający nurt",
        description: "Leczy sojusznika za [10 * intuition] i usuwa wszelkie oparzenia, przywróć odpowiednią temperaturę ciała oraz zapewnia wypoczęcie.",
        roll: "intuition",
        difficulty: 5,
        cooldown: 0
    },


// water, legendary


    "Uduszenie": {
        name: "Uduszenie",
        description: "Tworzy bańkę skondensowanej wody wokół głowy celu. W każdej turze musi on znaleźć sposób jak pozbyć się tej bańki, albo zaliczyć coraz trudniejszy rzut na nieustępliwość. Jeśli nie zaliczy rzutu, traci przytomność. Jeśli nie zaliczy kolejnego rzutu, dusi się i ginie. Rzuty są wykonywane na końcu tury celu. Zabicie tym zaklęciem kogoś, kto nie zasługuje na śmierć zwiększa rozkład o [5].",
        roll: "intuition",
        difficulty: 30,
        cooldown: 5,
        effect: "Duszenie. Narastająca trudność rzutów na nieustępliwość. [5] -> [10] -> [15] itd.",
        effectDuration: "-"
    },
    "Przepływ losu Artursa": {
        name: "Przepływ losu Artursa",
        description: "Jeśli to zaklęcie się uda, wówczas przez kolejne [5] rund wszystkie rzuty decydujące o szansie na coś stają się rzutami [50]:[50]. Zaklęcie obejmuje wszystkich zaangażowanych w walkę.",
        roll: "intuition",
        difficulty: 18,
        cooldown: 6,
        effect: "Losowość. Wszystkie rzuty są [50]:[50]",
        effectDuration: "5r"
    },


// water, special


    "Lodowy miecz": {
        name: "Lodowy miecz",
        description: "Tworzy lodowy miecz, który zadaje [1 * intuition] obrażeń po turze maga. Roztapia się po wykonaniu [3] cięć, albo gdy zostanie uderzony.",
        roll: "intuition",
        difficulty: 5,
        cooldown: 0,
        effects: [
            { 
                "effectName": "Lodowy miecz",
                "effectDescription": "Zadaje [1 * intuition] po turze maga przez [3] tury albo, gdy zostanie uderzony.",
                "effectDuration": "3t",
            },
        ],
    },
    "Lodowy arsenał": {
        name: "Lodowy arsenał",
        description: "Tworzy [3] lodowe miecze, z których każdy zadaje [1 * intuition] obrażeń po turze maga. Roztapiają się po wykonaniu [3] cięć, albo gdy zostaną uderzone.",
        roll: "intuition",
        difficulty: 10,
        cooldown: 1,
        effects: [
            { 
                "effectName": "Lodowy miecz",
                "effectDescription": "Zadaje [1 * intuition] po turze maga przez [3] tury albo, gdy zostanie uderzony.",
                "effectDuration": "3t",
            },
            { 
                "effectName": "Lodowy miecz",
                "effectDescription": "Zadaje [1 * intuition] po turze maga przez [3] tury albo, gdy zostanie uderzony.",
                "effectDuration": "3t",
            },
            { 
                "effectName": "Lodowy miecz",
                "effectDescription": "Zadaje [1 * intuition] po turze maga przez [3] tury albo, gdy zostanie uderzony.",
                "effectDuration": "3t",
            },
        ],
    },
    "Miecze: Atak!": {
        name: "Miecze: Atak!",
        description: "Zmusza wszystkie aktualnie posiadane miecze do ataku. Nie sprawia, że miecze tracą swoją akcję.",
        roll: "intuition",
        difficulty: 14,
        cooldown: 2
    },
    "Miecze: Naostrzenie!": {
        name: "Miecze: Naostrzenie!",
        description: "Sprawia, że posiadane lodowe miecze zaczynają zadawać penetrujące obrażenia. Trwa [3] tury.",
        roll: "intuition",
        difficulty: 15,
        cooldown: 2,
        effects: [
            { 
                "effectName": "Ostre lodowe miecze",
                "effectDescription": "Lodowe miecze zadają obrażenia penetrujące.",
                "effectDuration": "3t",
            },
        ],
    },
    "Lodowe przytłoczenie": {
        name: "Lodowe przytłoczenie",
        description: "Podwaja liczbę posiadanych aktualnie lodowych mieczy.",
        roll: "intuition",
        difficulty: 20,
        cooldown: 4
    },


// earth, first tier


    "Kamienna pięść": {
        name: "Kamienna pięść",
        description: "Pokrywa rękę ciężką, kamienną skorupą. Można nią uderzyć, zadając [3 * strength] obrażeń.",
        roll: "strength",
        difficulty: 3,
        cooldown: 0
    },
    "Twardy jak skała": {
        name: "Twardy jak skała",
        description: "Mnoży każdy rzut celu na nieustępliwość przez [2]. Trwa [3] tury. Nie stackuje się same ze sobą.",
        roll: "strength",
        difficulty: 5,
        cooldown: 0,
        effect: "Zdeterminowany. Rzuty na nieustępliwość mnożone x[2]",
        effectDuration: "3t"
    },
    "Pomoc ziemi": {
        name: "Pomoc ziemi",
        description: "Leczy cel za [4 * strength] zdrowia oraz obdarowuje go kamienną barierą, która zmniejszy obrażenia następnego ataku fizycznego o [50]%.",
        roll: "strength",
        difficulty: 6,
        cooldown: 1,
        effect: "Kamienna bariera. Redukcja następnych obrażeń fizycznych o [50]%",
        effectDuration: "-"
    },
    "Spadająca bryła": {
        name: "Spadająca bryła",
        description: "Przywołuje sporą skałę nad głową celu, która spadnie i go zmiażdży, zadając [4 * strength] obrażeń. Rzuty na to zaklęcie mają [-4] celności.",
        roll: "strength",
        difficulty: 8,
        cooldown: 0
    },
    "Bastion": {
        name: "Bastion",
        description: "Zakopuje nogi maga w ziemi. Nie może się on poruszać oraz być poruszanym przez cokolwiek. Ciało maga pokrywa się kamienną skorupą, która zmniejsza otrzymywane obrażenia fizyczne o [50]%. Efekt trwa [3] tury.",
        roll: "strength",
        difficulty: 8,
        cooldown: 3,
        effect: "Unieruchomiony. Redukcja obrażeń fizycznych o [50]%",
        effectDuration: "3t"
    },
    "Pędzący głaz": {
        name: "Pędzący głaz",
        description: "Otocza maga kamienną powierzchnią zdolną do taranowania wszystkiego, gdy ten zacznie biec. Zadaje [3 * strength] wszystkiemu na drodze.",
        roll: "strength",
        difficulty: 10,
        cooldown: 1
    },
    "Bagnista powierzchnia": {
        name: "Bagnista powierzchnia",
        description: "[prop_undodgeable] Zamienia ziemię w klejące błoto na kolistym obszarze o średnicy paru metrów. Każda jednostka znajdująca się na tym terenie ma bardzo utrudnione poruszanie się i musi spędzić kolejkę, jeśli chce z niego wyjść. Efekt trwa [3] tury.",
        roll: "strength",
        difficulty: 10,
        cooldown: 2,
        effect: "Ubłocony. Ograniczony ruch. Wymaga całej kolejki na wyjście z błota",
        effectDuration: "3t"
    },
    "Kamienny chwyt": {
        name: "Kamienny chwyt",
        description: "[prop_undodgeable] Tworzy ręce z ziemi, które próbują unieruchomić cel na [1] turę (rzut siła kontra siła).",
        roll: "strength",
        difficulty: "X",
        cooldown: 2,
        effect: "Unieruchomiony przez kamienne ręce.",
        effectDuration: "1t"
    },


// earth, second tier


    "Oczy na mnie": {
        name: "Oczy na mnie",
        description: "Mag obiera sobie za cel jednego przeciwnika. Tworzy skalne kastety na swoich dłoniach. Gdy dany przeciwnik zaatakuje kogoś innego niż mag i jest w jego zasięgu, może on użyć swojej reakcji i zadać przeciwnikowi nieunikalny cios za [5 * strength] obrażeń z szansą na ogłuszenie go.",
        roll: "strength",
        difficulty: 8,
        cooldown: 2,
        effects: [
            { 
                "effectName": "Skupiony na celu",
                "effectDescription": "Jeśli jest blisko postaci ze stanem 'Cel skupienia', zada jej [5 * strength] nieunikalnych obrażeń z 20% szansą na ogłuszenie, za każdym razem gdy ta postać zaatakuje kogokolwiek innego niż cel tego stanu.",
                "effectDuration": "2r",
            },
            { 
                "effectName": "Cel skupienia",
                "effectDescription": "Zaatakowanie kogokolwiek innego niż postaci ze stanem 'Skupiony na celu' skończy się silnym nieunikalnym ciosem z szansą ogłuszenia.",
                "effectDuration": "2r",
            }
        ],
    },
    "Skalne włócznie": {
        name: "Skalne włócznie",
        description: "Wyczarowuje [2] włócznie ze skał. Można nimi rzucić (rzut na celność 2 razy). Każda trafiona włócznia zadaje [3 * strength] obrażeń.",
        roll: "strength",
        difficulty: 12,
        cooldown: 3
    },
    "Obsydianowa eksplozja": {
        name: "Obsydianowa eksplozja",
        description: "Mag eksploduje dookoła siebie ostrymi, obsydianowymi kawałkami, które zranią wszystkich znajdujących się w promieniu kilku metrów od niego. Odłamki zadają [3 * strength] obrażeń + [1 * strength] penetrujących obrażeń od krwotoku przez [3] następne tury.",
        roll: "strength",
        difficulty: 15,
        cooldown: 4,
        effect: "Krwawienie. [1 * strength] obrażeń penetrujących na początku tury.",
        effectDuration: "3t"
    },
    "Niszczyciel zbroi": {
        name: "Niszczyciel zbroi",
        description: "Uderza cel skupiając się na jego obronie. Pozbawia cel [-2 * roll] pancerza fizycznego.",
        roll: "strength",
        difficulty: "X",
        cooldown: 4,
        effect: "Osłabiony. [-2 * roll] pancerza fizycznego.",
        effectDuration: "-"
    },


// earth, non-combat


    "Sztuka rozłupywania": {
        name: "Sztuka rozłupywania",
        description: "Uderza w powierzchnię bokiem otwartej dłoni. Jeśli rzut się powiedzie, przepoławia ją. Trudność rzutu zależy od tego jak twardy jest obiekt.",
        roll: "strength",
        difficulty: "X",
        cooldown: 0
    },
    "Ziemiolokacja": {
        name: "Ziemiolokacja",
        description: "[prop_non_combat] Pozwala poczuć kształt, rozłożenie i zmiany ziemii wokół maga.",
        roll: "strength",
        difficulty: 8,
        cooldown: 0
    },
    "Błotna terapia": {
        name: "Błotna terapia",
        description: "Usuwa wszystkie choroby i trucizny z ciała, poprzez okrycie uzdrawiającym błotem. Po zmyciu błota cel czuje się wypoczęty.",
        roll: "strength",
        difficulty: 5,
        cooldown: 0
    },
    "Tunel": {
        name: "Tunel",
        description: "Uderza w ziemię i tworzy tunel od maga do wyznaczonego przez niego miejsca. Tunel może mieć maksymalnie [1 * roll] metrów, lub mniej, jeśli mag będzie miał taką potrzebę.",
        roll: "strength",
        difficulty: "X",
        cooldown: 0
    },


// earth, legendary


    "Ofiara": {
        name: "Ofiara",
        description: "Spod celu wystrzeliwuje naostrzony ziemny kolec, który przebija go na wylot, zadając [15 * strength] penetrujących obrażeń. Cel staje się uwięziony w powietrzu, nadziany na kolec, co czyni go niezdolnym ruchu i uników. Kolec trwa [3] tury.",
        roll: "strength",
        difficulty: 25,
        cooldown: 3,
        effect: "Nadziany na kolec. Brak możliwości ruchu i uników",
        effectDuration: "3t"
    },
    "Wzniesienie": {
        name: "Wzniesienie",
        description: "Chwyta ziemię i wznosi duży kawał terenu na [30] metrów w górę, łącznie ze wszystkim co się na nim znajduje. Teren pozostanie w takim kształcie dopóki mag tego nie cofnie, albo nie rzuci tego zaklęcia na jakiś inny obszar.",
        roll: "strength",
        difficulty: 15,
        cooldown: 2
    },


// air, first tier


    "Zawirowanie": {
        name: "Zawirowanie",
        description: "[prop_undodgeable] Zakręca szybko celem wokół jego własnej osi, dezorientując go i zmniejszając jego następny rzut na celność oraz na unik o [-6].",
        roll: "agility",
        difficulty: 4,
        cooldown: 0,
        effect: "Dezorientacja. [-6] do rzutów na celność i unik",
        effectDuration: "1t"
    },
    "Tnące łuki": {
        name: "Tnące łuki",
        description: "[prop_undodgeable] Wystrzeliwuje [3] pociski z powietrza w kształcie łuków, które uderzą w wybrany cel. Każdy zadaje [1 * agility] obrażeń.",
        roll: "agility",
        difficulty: 6,
        cooldown: 0
    },
    "Leczniczy podmuch": {
        name: "Leczniczy podmuch",
        description: "Leczy cel za [4 * agility] zdrowia i mnoży następny rzut na unik x[2].",
        roll: "agility",
        difficulty: 6,
        cooldown: 1,
        effect: "Naenergetyzowany. Następny rzut na unik mnożony x[2]",
        effectDuration: "-"
    },
    "Rozpędzony cios": {
        name: "Rozpędzony cios",
        description: "Rzuca maga do przodu i wykorzystuje jego pęd w celu zadania mocnego ciosu za [4 * agility] obrażeń. Działa tylko na cele, którzy są odpowiednio daleko.",
        roll: "agility",
        difficulty: 7,
        cooldown: 0
    },
    "Powietrzna tarcza": {
        name: "Powietrzna tarcza",
        description: "Tworzy tarczę z powietrza, która przekieruje [1] atak dystansowy. Nie działa na ataki i zaklęcia penetrujące.",
        roll: "agility",
        difficulty: 8,
        cooldown: 0,
        effect: "Powietrzna tarcza. Przekierowanie [1] ataku dystansowego",
        effectDuration: "-"
    },
    "Małe przyspieszenie": {
        name: "Małe przyspieszenie",
        description: "Wybrany cel zyskuje [1] dodatkową akcję. Nie stackuje się z niczym innym co zapewnia dodatkową turę.",
        roll: "agility",
        difficulty: 9,
        cooldown: 2,
        effect: "[prop_extra_turn] Działa przez [2] tury.",
        effectDuration: "2t",
    },
    "Wir pięści": {
        name: "Wir pięści",
        description: "[prop_undodgeable] Wyczarowuje [10] pięści z powietrza. Każda uderza cel za [0.5 * agility].",
        roll: "agility",
        difficulty: 10,
        cooldown: 1
    },
    "Odepchnięcie": {
        name: "Odepchnięcie",
        description: "Odpycha cel na kilka metrów. Im cięższy cel, tym wyższe wymaganie do sukcesu.",
        roll: "agility",
        difficulty: "X",
        cooldown: 0
    },


// air, second tier


    "Wyrzut": {
        name: "Wyrzut",
        description: "Wyrzuć cel w powietrze. Cel leci na [1 * over] metrów w górę. Im wyżej poleci, tym bardziej się potłucze spadając.",
        roll: "agility",
        difficulty: 15,
        cooldown: 3
    },
    "Trąba": {
        name: "Trąba",
        description: "[prop_undodgeable] Uderza cel skompresowanym powietrzem za [4 * agility] i próbuje go przewrócić.",
        roll: "agility",
        difficulty: 15,
        cooldown: 3
    },


// air, non-combat


    "Hen w górę": {
        name: "Hen w górę",
        description: "Pozwala skoczyć w górę na [1 * roll] metrów. Nie łagodzi w żaden sposób upadku.",
        roll: "agility",
        difficulty: "X",
        cooldown: 0
    },
    "Łagodny spadek": {
        name: "Łagodny spadek",
        description: "Niweluje jakiekolwiek potencjalne obrażenia od upadku.",
        roll: "agility",
        difficulty: 5,
        cooldown: 0,
        effect: "Łagodne lądowanie. Brak obrażeń od upadku",
        effectDuration: "-"
    },
    "Oddech życia": {
        name: "Oddech życia",
        description: "Leczy cel za [10 * agility] zdrowia. Oczyszcza aurę celu rozwiewając wszystkie pomniejsze klątwy na niego rzucone. Po zakończeniu czaru cel czuje się wypoczęty.",
        roll: "agility",
        difficulty: 5,
        cooldown: 0
    },


// air, legendary


    "Grupowe przyspieszenie": {
        name: "Grupowe przyspieszenie",
        description: "Przez następne [3] rundy, wszyscy sojusznicy wraz z magiem zostają obdarowani przyspieszeniem, dzięki czemu zyskują dodatkową akcję na turę, zawsze poruszają się pierwsi przed przeciwnikami oraz ich rzuty na unik zostają pomnożone przez [2].",
        roll: "agility",
        difficulty: 25,
        cooldown: 8,
        effect: "[prop_extra_turn] Przyśpieszenie. Dodatkowa akcja, pierwszeństwo ruchu, x[2] do uników",
        effectDuration: "3t"
    },
    "Tornado": {
        name: "Tornado",
        description: "Wznieca ogromne tornado w wybranym miejscu. Wszystkie jednostki i obiekty zostają porwane przez trąbę powietrzną. Jest to efekt, którego można uniknąć tylko będąc bardzo ciężkim albo przytwierdzonym do ziemi. Tornado trwa [2] tury.",
        roll: "agility",
        difficulty: 35,
        cooldown: 10,
        effect: "Porwany przez tornado. Brak kontroli ruchu",
        effectDuration: "2t"
    },


// mixed


    "Oddychanie pod wodą": {
        name: "Oddychanie pod wodą",
        description: "Tworzy/zachowuje bańkę powietrza wokół głowy celu.",
        roll: "intuition + agility",
        difficulty: 5,
        cooldown: 0
    },
    "Grupowe oddychanie pod wodą": {
        name: "Grupowe oddychanie pod wodą",
        description: "Tworzy/zachowuje bańkę powietrza wokół głowy wszystkich członków drużyny.",
        roll: "intuition + agility",
        difficulty: 10,
        cooldown: 0
    },

// Tests
    "Test: Extra Turn": {
        name: "Test: Extra Turn",
        description: "",
        properties: ["prop_extra_turn"],
    },
    "Test: Multiple Rolls": { // tests rolling more than 1 die at a time
        name: "Test: Multiple Rolls",
        description: "Uderza do 2 celów za [2 * over] 3 razy. A potem jeden cel za [1 * roll]",
        roll: "vitality + strength + intuition",
        difficulty: 14,
        cooldown: 0,
        actions: [
            { // test over
                type: "damage",
                target: "multi",
                possibleTargets: 2,
                repeat: 3,
                damageType: "pierce",
                value: "[2 * over]",
            },
            { // test roll
                type: "damage",
                target: "single",
                damageType: "pierce",
                value: "[1 * roll]",
            },
            { // tests calculating chance and rolling for multiple things + multi without possible targets (default 1)
                type: "damage",
                target: "multi",
                damageType: "pierce",
                value: "[1 * vitality + 1 * roll]",
                forceRoll: "vitality + agility + accuracy",
                forceRollDifficulty: 15,
                effects: [
                    {
                        effectName: "Stan po rzucie na wiele rzeczy",
                        effectDescription: "Cel zaliczył rzut na żywotność, zwinność i celność z trudnością 15.",
                        effectDuration: "2t",
                        effectSource: "self",
                        effectIsBeneficial: true,
                    },
                ]
            },
            { // tests forceRoll and forceRollVS with multiple attributes at once.
                type: "damage",
                target: "multi",
                possibleTargets: 3,
                damageType: "phys",
                value: "[1 * vitality + 1 * roll]",
                forceRollVS: "vitality + agility + vitality vs accuracy + agility",
                forceRoll: "strength + agility",
                forceRollDifficulty: 10,
                effects: [
                    {
                        effectName: "Stan po rzucie na wiele rzeczy vs",
                        effectDescription: "Cel przegrał rzut na vitality + agility + vitality vs accuracy + agility LUB rzut siła + zwinność z trudnością 10.",
                        effectDuration: "2t",
                        effectSource: "self",
                        effectIsBeneficial: false,
                    },
                ]
            },
        ]
    },
    "Test: Damage Actions": {
        name: "Test: Damage Actions",
        description: "Uderza do 3 celów za [-3 * vitality + 4 * strength - 30 + 4 + reflex - 1 * roll + 1 * over]. Potem robi wiele innych rzeczy, których nie chce mi się opisywać.",
        roll: "reflex",
        difficulty: 5,
        cooldown: 0,
        actions: [
            { // tests complex formulas, multi targeting, and pierce damage type
                type: "damage",
                target: "multi",
                possibleTargets: 3,
                damageType: "pierce",
                value: "[-3 * vitality + 4 * strength - 30 + 4 + reflex - 1 * roll + 1 * over]",
            },
            { // tests single targeting, phys damage type, and applying more than 1 effect. Also tests effect duration in turns.
                type: "damage",
                target: "single",
                damageType: "phys",
                value: "[1 * vitality]",
                forceRoll: "vitality",
                forceRollDifficulty: 10,
                isEffectSuccessBeneficial: true, // calculates success chance for effects
                effects: [
                    {
                        effectName: "Dobry stan po uderzeniu celu",
                        effectDescription: "Powinien się pojawić tylko jeśli cel został trafiony i zaliczył roll na żywotność.",
                        effectDuration: "2t",
                        effectSource: "self",
                        effectIsBeneficial: true,
                    },
                    {
                        effectName: "Stan po beneficial uderzeniu celu",
                        effectDescription: "Powinien się pojawić tylko jeśli cel został trafiony i zaliczył roll na żywotność.",
                        effectDuration: "2t",
                        effectSource: "self",
                        effectIsBeneficial: true,
                    }
                ]
            },
            { // tests self targeting, mag damage type, and how effects and forcedRolls behave when hitting oneself. Also tests effect duration in rounds.
                type: "damage",
                target: "self",
                damageType: "mag",
                value: "[1 * vitality]",
                forceRoll: "intuition",
                forceRollDifficulty: 5,
                forceRollVS: "vitality vs reflex",
                effects: [
                    {
                        effectName: "Pozytywny stan po uderzeniu siebie",
                        effectDescription: "Teoretycznie powinien sie pojawic po wyrzuceniu wiecej niz 5 intuicji oraz wyrzuceniu wiecej zywotnosci niz refleksu.",
                        effectDuration: "2r",
                        effectSource: "self",
                        effectIsBeneficial: true,
                    },
                    {
                        effectName: "Negatywny stan po uderzeniu siebie",
                        effectDescription: "Teoretycznie powinien sie pojawic po wyrzuceniu wiecej niz 5 intuicji oraz wyrzuceniu wiecej zywotnosci niz refleksu.",
                        effectDuration: "2r",
                        effectSource: "self",
                        effectIsBeneficial: false,
                    }
                ]
            },
            { // tests hitting, displaying rolls, and applying effects to all, as well as the source of information for the effect display (default is target)
                type: "damage",
                target: "all",
                damageType: "mag",
                value: "[15]",
                forceRoll: "agility",
                forceRollDifficulty: 8,
                forceRollVS: "strength vs strength",
                effects: [
                    {
                        effectName: "Stan po uderzeniu celu",
                        effectDescription: "Powinien się pojawić tylko po trafieniu celu obrazeń oraz wygraniu przez niego obu rolli. Stan bierze dane od wywołującego. [1 * strength]",
                        effectDuration: "2t",
                        effectSource: "self",
                        effectIsBeneficial: true,
                    },
                    {
                        effectName: "Stan po uderzeniu celu 2",
                        effectDescription: "Powinien się pojawić tylko po trafieniu celu obrazeń oraz zawaleniu przez niego obu rolli. Stan bierze dane od celu. [1 * strength]",
                        effectDuration: "2t",
                        effectSource: "target",
                        effectIsBeneficial: false,
                    },
                ]
            },
            { // tests targeting enemy team (opposite to the ability user), repeat (repeating action x times, in this case dealing damage)
                type: "damage",
                target: "team_enemy",
                damageType: "pierce",
                value: "[2 * attunement]",
                repeat: 3,
                forceRoll: "strength",
                forceRollDifficulty: 9,
                effects: [
                    {
                        effectName: "Stan po masowym uderzeniu",
                        effectDescription: "Powinien się pojawić tylko na tych, którzy zostali trafieni i uwalili roll na siłę. Trwa 2 rundy.",
                        effectDuration: "2r",
                        effectSource: "self",
                        effectIsBeneficial: false,
                    }
                ]
            },
            { // tests forcing a roll for more than 1 thing (which basically does nothing since there are no effects)
                type: "damage",
                target: "single",
                damageType: "phys",
                value: "[2 * attunement]",
                forceRoll: "strength + agility",
                forceRollDifficulty: 12,
            },
        ]
    },
    "Test: Healing Actions": {
        name: "Test: Healing Actions",
        description: "Leczy siebie do progu 500, leczy cel do progu 50, leczy do 3 celow za [3 * attunement] x2 jesli wyrzuca chociaz 4 intuicji, leczy cala sojusznicza druzyne za [2 * attunement] jesli wygraja rzut witalnosc vs witalnosc, leczy kazdego do progu 1, jesli wyrzuca chociaz 3 refleksu",
        cooldown: 0,
        actions: [
            {
                type: "heal",
                target: "self",
                healType: "threshold",
                value: 500,
                effects: [
                    {
                        effectName: "Stan po uleczeniu siebie",
                        effectDescription: "Powinien się pojawić zawsze, jako że nie ma forced rolla. Powinien także nie mieć wgl celu, bo akcja ma target self.",
                        effectDuration: "2t",
                        effectSource: "self",
                    },
                ]
            },
            {
                type: "heal",
                target: "single",
                healType: "threshold",
                value: 50,
                effects: [
                    {
                        effectName: "Stan po uleczeniu",
                        effectDescription: "Powinien się pojawić zawsze dla danego celu, jako że nie ma forced rolla.",
                        effectDuration: "2t",
                        effectSource: "target",
                    },
                    {
                        effectName: "Stan po uleczeniu 2",
                        effectDescription: "Powinien się pojawić zawsze dla danego celu, jako że nie ma forced rolla.",
                        effectDuration: "2t",
                        effectSource: "target",
                    },
                ]
            },
            {
                type: "heal",
                target: "multi",
                possibleTargets: 3,
                healType: "normal",
                value: "[2 * attunement]",
                repeat: 2,
                forceRoll: "intuition", // roll exists, but it's kinda useless since there are no effects
                forceRollDifficulty: 4,
            },
            {
                type: "heal",
                target: "team_ally",
                healType: "normal",
                value: "[2 * attunement]",
                repeat: 3,
                forceRollVS: "vitality vs vitality",
                effects: [
                    {
                        effectName: "Stan po masowym leczeniu",
                        effectDescription: "Powinien się pojawić tylko na tych, którzy wygrali roll żywotność vs żywotność. Trwa 2 rundy.",
                        effectDuration: "2r",
                        effectSource: "self",
                        effectIsBeneficial: true,
                    }
                ]
            },
            {
                type: "heal",
                target: "all",
                healType: "threshold",
                value: 1,
                forceRoll: "reflex",
                forceRollDifficulty: 3,
            },
        ]
    },
    "Test: Armor Actions": {
        name: "Test: Armor Actions",
        description: "Extensive test for armor actions, handling combinations of stats, forced rolls, and missing limits.",
        roll: "vitality", 
        difficulty: "X",
        cooldown: 0,
        actions: [
            { 
                // Flat positive phys armor. Base case.
                type: "armor",
                target: "single",
                physArmorValue: 10
            },
            { 
                // Positive mag armor, multi-stat force roll, mixed effects
                type: "armor",
                target: "single",
                magArmorValue: 15,
                forceRoll: "strength + vitality",
                forceRollDifficulty: 12,
                isEffectSuccessBeneficial: true, // Required due to mixed effects AND a forced roll
                effects: [
                    {
                        effectName: "Good Armor Buff",
                        effectDuration: "2t",
                        effectIsBeneficial: true
                    },
                    {
                        effectName: "Bad Armor Side-effect",
                        effectDuration: "2t",
                        effectIsBeneficial: false
                    }
                ]
            },
            { 
                // All 4 armor properties positive, 1v1 forced roll
                type: "armor",
                target: "single",
                physArmorValue: 5,
                magArmorValue: 5,
                physArmorValuePerc: 10,
                magArmorValuePerc: 10,
                forceRollVS: "agility vs agility"
            },
            { 
                // Negative armor (debuff), single stat force roll.
                // Does NOT need isActionBeneficial because all values are strictly negative, making it explicitly non-beneficial.
                type: "armor",
                target: "single",
                physArmorValue: -10,
                magArmorValue: -10,
                forceRoll: "resilience",
                forceRollDifficulty: 8
            },
            { 
                // Mixed armor values without forced rolls
                type: "armor",
                target: "single",
                physArmorValue: 10,
                magArmorValue: -5,
                // isActionBeneficial: true // No need for the flag, since there are no forced rolls
            },
            { 
                // Mixed armor values with forced rolls
                type: "armor",
                target: "single",
                physArmorValue: -10,
                magArmorValue: 15,
                forceRoll: "intuition",
                forceRollDifficulty: 10,
                isActionBeneficial: false // Defined as an attack/debuff despite granting mag armor
            },
            { 
                // Dynamic formulas that cannot be statically evaluated as positive/negative at parse time
                type: "armor",
                target: "single",
                physArmorValue: "[-10 + 1 * roll]",
                magArmorValue: "[-10 + 2 * roll]",
                forceRoll: "reflex",
                forceRollDifficulty: 8,
                isActionBeneficial: true // Explicitly required since formulas evaluate at runtime and validation throws an error otherwise
            }
        ]
    },
    "Test: Condition Actions": {
        name: "Test: Condition Actions",
        description: "Po użyciu przyspiesza siebie na 1 rundę jeśli uda się wyrzucić 5 lub więcej żywotności. Potem przyspiesza cel jeśli wyrzuci chociaż 4 żywotności i wygra roll siła vs siła.",
        roll: "reflex",
        difficulty: 5,
        cooldown: 2,
        actions: [
            {
                type: "effect",
                target: "self",
                forceRoll: "vitality",
                forceRollDifficulty: 5,
                // testing if the isEffectSuccessBeneficial flag in the action affects applying effects - it shouldn't.
                isEffectSuccessBeneficial: false, 
                effects: [
                    { 
                        effectName: "Przyspieszenie", 
                        effectDescription: "Powinno się zawsze pokazać jeśli postać zaliczy wymuszone rolle.", 
                        effectDuration: "1r",
                        effectProperties: ["prop_extra_turn"],
                        effectIsBeneficial: true,
                    },
                    { 
                        effectName: "Nieudane przyspieszenie", 
                        effectDescription: "Powinno się zawsze pokazać jeśli postać zawali wymuszone rolle.", 
                        effectDuration: "1r",
                        effectIsBeneficial: false,
                    }
                ],
            },
            {
                type: "effect",
                target: "single",
                forceRoll: "vitality",
                forceRollDifficulty: 4,
                forceRollVS: "strength vs strength",
                // For now, the only thing this flag does here is calculate the success chance. 
                // If true, we calculate and display the chance that the target will pass the forced rolls
                // if false, we calculate the inverse - that they will fail.
                isEffectSuccessBeneficial: true,
                effects: [
                    { 
                        effectName: "Przyspieszenie", 
                        effectDescription: "Powinno się pojawić po zaliczeniu obu rzutów przez cel.", 
                        effectDuration: "1r",
                        effectProperties: ["prop_extra_turn"],
                        effectIsBeneficial: true,
                    },
                    { 
                        effectName: "Nieudane przyspieszenie", 
                        effectDescription: "Powinno się pojawić po uwaleniu obu rzutów przez cel", 
                        effectDuration: "1r",
                        effectIsBeneficial: false,
                    }
                ],
            },
            {
                type: "effect",
                target: "single",
                forceRoll: "vitality",
                forceRollDifficulty: 4,
                isEffectSuccessBeneficial: true,
                effects: [ // check if the chance displays correctly
                    { 
                        effectName: "Dwa przyspieszenia", 
                        effectDescription: "Powinno się pojawić po zaliczeniu obu rzutów przez cel.", 
                        effectDuration: "1r",
                        effectProperties: ["prop_extra_turn"],
                        effectIsBeneficial: true,
                    },
                    { 
                        effectName: "Dwa przyspieszenia", 
                        effectDescription: "Powinno się pojawić po zaliczeniu obu rzutów przez cel.", 
                        effectDuration: "1r",
                        effectProperties: ["prop_extra_turn"],
                        effectIsBeneficial: true,
                    },
                    { 
                        effectName: "Nieudane przyspieszenie", 
                        effectDescription: "Powinno się pojawić po uwaleniu obu rzutów przez cel", 
                        effectDuration: "1r",
                        effectIsBeneficial: false,
                    }
                ],
            },
            {
                type: "effect",
                target: "team_ally",
                // Tests applying effect to the whole ally team. Without any rolls etc.
                effects: [
                    { 
                        effectName: "Masowy bonus", 
                        effectDescription: "Każdy sojusznik dostaje", 
                        effectDuration: "1t",
                    },
                ],
            },
        ]
    },
    "Test: Undodgeable": {
        name: "Test: Undodgeable",
        description: "Tests the undodgeable property. Should bypass hit vs dodge rolls entirely.",
        properties: ["prop_undodgeable"],
        cooldown: 0,
        actions: [
            {
                // Single target, should have 100% hit chance and skip opposed roll
                type: "damage",
                target: "single",
                damageType: "phys",
                value: 100
            },
            {
                // Multi target, should also have 100% hit chance and skip opposed rolls
                type: "damage",
                target: "team_enemy",
                damageType: "mag",
                value: 150
            }
        ]
    },
    "Test: Lethal": {
        name: "Test: Lethal",
        description: "Tests the lethal property. Hits targets for 1000 to instantly kill, bypassing Death's Door.",
        properties: ["prop_lethal"],
        cooldown: 0,
        actions: [
            {
                // Deals massive damage to guarantee target hp drops to 0 or below
                type: "damage",
                target: "multi",
                possibleTargets: 3,
                damageType: "pierce",
                value: 1000
            }
        ]
    },
    "Test: Stuns": {
        name: "Test: Stuns",
        description: "Tests stun application across different action types, forced rolls, and the ignore flag.",
        properties: ["prop_stuns"],
        cooldown: 0,
        actions: [
            { 
                // No forced roll, always stuns upon hitting
                type: "damage",
                target: "single",
                damageType: "phys",
                value: 5
            },
            { 
                // Forced roll present on a heal, stuns ONLY if target fails the vitality roll
                type: "heal",
                target: "single",
                healType: "normal",
                value: 10,
                forceRoll: "vitality",
                forceRollDifficulty: 10
            },
            { 
                // Armor action with an opposed roll, stuns if target loses the roll
                type: "armor",
                target: "single",
                physArmorValue: 5,
                forceRollVS: "strength vs strength"
            },
            { 
                // Ignores properties, should NOT stun the target
                type: "effect",
                target: "single",
                ignoresAbilityProperties: true,
                effects: [
                    {
                        effectName: "Dummy Effect",
                        effectDuration: "1t",
                        effectIsBeneficial: true
                    }
                ]
            }
        ]
    },
    "Test: Combined Properties": {
        name: "Test: Combined Properties",
        description: "Combines Lethal, Undodgeable, and Stuns in one skill.",
        properties: ["prop_lethal", "prop_undodgeable", "prop_stuns"],
        cooldown: 0,
        actions: [
            { 
                // Inherits all traits: 100% hit, stuns, and kills instantly if HP reaches 0
                type: "damage",
                target: "single",
                damageType: "phys",
                value: 1000
            },
            { 
                // Ignores all properties, works strictly like a standard basic attack
                type: "damage",
                target: "single",
                damageType: "mag",
                value: 1000,
                ignoresAbilityProperties: true
            }
        ]
    },
    "Test: Action Errors": {
        name: "Test: Action Errors",
        description: "Skill created specifically to intentionally trigger all possible logic errors within actions.",
        cooldown: 0,
        actions: [
            {
                // 1. error_force_roll_missing: forceRoll exists, but forceRollDifficulty is missing
                type: "damage",
                target: "single",
                damageType: "phys",
                value: 10,
                forceRoll: "agility" 
            },
            {
                // 2. error_armor_missing_vals: armor action with no declared armor values
                type: "armor",
                target: "single" 
            },
            {
                // 3. error_armor_mixed_stats: armor action provides buffs and debuffs simultaneously without isActionBeneficial flag, while there's a forcedRoll present
                type: "armor",
                target: "single",
                physArmorValue: 10,
                magArmorValue: -5,
                forceRollVS: "vitality vs vitality",
            },
            {
                // 4. error_armor_zero_stats: armor action evaluates to 0 without isActionBeneficial flag while there's a forcedRoll present
                type: "armor",
                target: "single",
                physArmorValue: 0,
                forceRoll: "vitality",
                forceRollDifficulty: 4,
            },
            {
                // 5. error_effect_empty: effect action with empty effects array or missing array entirely
                type: "effect",
                target: "single",
                effects: [] 
            },
            {
                // 6. error_effect_missing_flag: action with forced roll but the effect lacks effectIsBeneficial flag
                type: "damage",
                target: "single",
                damageType: "phys",
                value: 10,
                forceRoll: "agility",
                forceRollDifficulty: 10,
                effects: [
                    {
                        effectName: "Stan bez flagi",
                        effectDuration: "1t"
                    }
                ]
            },
            {
                // 7. error_effect_mixed: heal type action is targeted, has forced roll AND mixed effect types, missing isEffectSuccessBeneficial root flag
                type: "heal",
                target: "single",
                forceRoll: "vitality",
                forceRollDifficulty: 10,
                effects: [
                    {
                        effectName: "Good Condition",
                        effectDuration: "1t",
                        effectIsBeneficial: true
                    },
                    {
                        effectName: "Bad Condition",
                        effectDuration: "1t",
                        effectIsBeneficial: false
                    }
                ]
            },
            {
                // 8. error_armor_dynamic_missing_flag: armor action using a dynamic formula without isActionBeneficial flag
                type: "armor",
                target: "single",
                physArmorValue: "[-10 + 1 * roll]",
                forceRoll: "agility",
                forceRollDifficulty: 10
            }
        ]
    },
}