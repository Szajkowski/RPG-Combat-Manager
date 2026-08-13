var ability = {
    
    // ogień, pierwszego stopnia
    
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
        condition: "Rozpalony. Zwiększa żywotność o [5].",
        conditionDuration: "8t"
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
        condition: "Ognista tarcza. Zadaje [50]% obrażeń ataku wręcz. Maksymalnie [8 * vitality]",
        conditionDuration: "-"
    },
    "Oślepiający rozbłysk": {
        name: "Oślepiający rozbłysk",
        description: "Wytwarza przed magiem rozbłysk pełen jasnych iskier, które lekko oślepiają ([-5] do rzutów na celność przez następną turę) wszystkie jednostki patrzące w jego kierunku.",
        roll: "vitality",
        difficulty: 6,
        cooldown: 0,
        condition: "Oślepiony. [-5] do rzutów na celność",
        conditionDuration: "1t"
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
        condition: "Podpalony. Otrzymuje [1 * vitality] obrażeń co turę",
        conditionDuration: "-"
    },
    "Ognisty sabotaż": {
        name: "Ognisty sabotaż",
        description: "[prop_undodgeable] Rozgrzewa broń celu. Rzut na żywotność maga kontra nieustępliwość celu. Jeśli mag wygra, cel puszcza broń i nie może jej podnieść przez swoją następną kolejkę.",
        roll: "vitality",
        difficulty: "X",
        cooldown: 2,
        condition: "Rozgrzana broń. Niemożność podniesienia broni.",
        conditionDuration: "2t"
    },


// ogień, drugiego stopnia


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


// ogień, niebojowe


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


// ogień, legendarne


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
        condition: "Feniks. Możliwość lotu. W razie śmierci eksploduje za [10 * vitality] i wraca z pełnym zdrowiem.",
        conditionDuration: "-"
    },


// ogień, specjalne


    "Płonący omen": {
        name: "Płonący omen",
        description: "[prop_undodgeable] Tworzy nad celem ognistą runę. Runa aktywuje się, gdy cel otrzyma obrażenia magiczne i przypali go za drugie tyle.",
        roll: "vitality",
        difficulty: 12,
        cooldown: 5
    },


// woda, pierwszego stopnia


    "Mrożący dotyk": {
        name: "Mrożący dotyk",
        description: "Mrozi ręce na lód i zadaje nimi [2 * intuition] obrażeń oraz podmraża cel, zmniejszając jego rzuty na zwinność o [-4] przez [2] tury.",
        roll: "intuition",
        difficulty: 3,
        cooldown: 0,
        condition: "Podmrożony. [-4] do rzutów na zwinność",
        conditionDuration: "2t"
    },
    "Wodny bicz": {
        name: "Wodny bicz",
        description: "Tworzy bicz z wody. Uderza on za [2 * intuition] obrażeń oraz podmraża cel, zmniejszając jego rzuty na zwinność o [-4] przez [2] tury.",
        roll: "intuition",
        difficulty: 5,
        cooldown: 0,
        condition: "Podmrożony. [-4] do rzutów na zwinność",
        conditionDuration: "2t"
    },
    "Regeneracja": {
        name: "Regeneracja",
        description: "Leczy cel za [4 * intuition] zdrowia oraz jeszcze raz za [2 * intuition] na początku następnej tury.",
        roll: "intuition",
        difficulty: 6,
        cooldown: 1,
        condition: "Regeneracja. Uleczony za [2 * intuition] na początku następnej tury.",
        conditionDuration: "-"
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
        condition: "Skupiony. [-4] do trudności rzucania zaklęć",
        conditionDuration: "2t"
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
        condition: "Lodowe lustro. Odbija [50]% następnych magicznych obrażeń",
        conditionDuration: "-"
    },
    "Oczyszczenie": {
        name: "Oczyszczenie",
        description: "Niweluje truciznę, uzdatnia do picia wodę oraz rozprasza klątwy.",
        roll: "intuition",
        difficulty: "X",
        cooldown: 0
    },


// woda, drugiego stopnia


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
        condition: "Zmrożony. [-6] do rzutów na zwinność",
        conditionDuration: "2t"
    },
    "Wodna powłoka": {
        name: "Wodna powłoka",
        description: "Dodaj celowi [10] pancerza magicznego. Pancerz utrzymuje się przez całą walkę.",
        roll: "intuition",
        difficulty: 15,
        cooldown: 3
    },


// woda, niebojowe


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


// woda, legendarne


    "Uduszenie": {
        name: "Uduszenie",
        description: "Tworzy bańkę skondensowanej wody wokół głowy celu. W każdej turze musi on znaleźć sposób jak pozbyć się tej bańki, albo zaliczyć coraz trudniejszy rzut na nieustępliwość. Jeśli nie zaliczy rzutu, traci przytomność. Jeśli nie zaliczy kolejnego rzutu, dusi się i ginie. Rzuty są wykonywane na końcu tury celu. Zabicie tym zaklęciem kogoś, kto nie zasługuje na śmierć zwiększa rozkład o [5].",
        roll: "intuition",
        difficulty: 30,
        cooldown: 5,
        condition: "Duszenie. Narastająca trudność rzutów na nieustępliwość. [5] -> [10] -> [15] itd.",
        conditionDuration: "-"
    },
    "Przepływ losu Artursa": {
        name: "Przepływ losu Artursa",
        description: "Jeśli to zaklęcie się uda, wówczas przez kolejne [5] rund wszystkie rzuty decydujące o szansie na coś stają się rzutami [50]:[50]. Zaklęcie obejmuje wszystkich zaangażowanych w walkę.",
        roll: "intuition",
        difficulty: 18,
        cooldown: 6,
        condition: "Losowość. Wszystkie rzuty są [50]:[50]",
        conditionDuration: "5r"
    },


// woda, specjalne


    "Lodowy miecz": {
        name: "Lodowy miecz",
        description: "Tworzy lodowy miecz, który zadaje [1 * intuition] obrażeń po turze maga. Roztapia się po wykonaniu [3] cięć, albo gdy zostanie uderzony.",
        roll: "intuition",
        difficulty: 5,
        cooldown: 0,
        conditions: [
            { 
                "conditionName": "Lodowy miecz",
                "conditionDescription": "Zadaje [1 * intuition] po turze maga przez [3] tury albo, gdy zostanie uderzony.",
                "conditionDuration": "3t",
            },
        ],
    },
    "Lodowy arsenał": {
        name: "Lodowy arsenał",
        description: "Tworzy [3] lodowe miecze, z których każdy zadaje [1 * intuition] obrażeń po turze maga. Roztapiają się po wykonaniu [3] cięć, albo gdy zostaną uderzone.",
        roll: "intuition",
        difficulty: 10,
        cooldown: 1,
        conditions: [
            { 
                "conditionName": "Lodowy miecz",
                "conditionDescription": "Zadaje [1 * intuition] po turze maga przez [3] tury albo, gdy zostanie uderzony.",
                "conditionDuration": "3t",
            },
            { 
                "conditionName": "Lodowy miecz",
                "conditionDescription": "Zadaje [1 * intuition] po turze maga przez [3] tury albo, gdy zostanie uderzony.",
                "conditionDuration": "3t",
            },
            { 
                "conditionName": "Lodowy miecz",
                "conditionDescription": "Zadaje [1 * intuition] po turze maga przez [3] tury albo, gdy zostanie uderzony.",
                "conditionDuration": "3t",
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
        conditions: [
            { 
                "conditionName": "Ostre lodowe miecze",
                "conditionDescription": "Lodowe miecze zadają obrażenia penetrujące.",
                "conditionDuration": "3t",
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


// ziemia, pierwszy stopień


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
        condition: "Zdeterminowany. Rzuty na nieustępliwość mnożone x[2]",
        conditionDuration: "3t"
    },
    "Pomoc ziemi": {
        name: "Pomoc ziemi",
        description: "Leczy cel za [4 * strength] zdrowia oraz obdarowuje go kamienną barierą, która zmniejszy obrażenia następnego ataku fizycznego o [50]%.",
        roll: "strength",
        difficulty: 6,
        cooldown: 1,
        condition: "Kamienna bariera. Redukcja następnych obrażeń fizycznych o [50]%",
        conditionDuration: "-"
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
        condition: "Unieruchomiony. Redukcja obrażeń fizycznych o [50]%",
        conditionDuration: "3t"
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
        condition: "Ubłocony. Ograniczony ruch. Wymaga całej kolejki na wyjście z błota",
        conditionDuration: "3t"
    },
    "Kamienny chwyt": {
        name: "Kamienny chwyt",
        description: "[prop_undodgeable] Tworzy ręce z ziemi, które próbują unieruchomić cel na [1] turę (rzut siła kontra siła).",
        roll: "strength",
        difficulty: "X",
        cooldown: 2,
        condition: "Unieruchomiony przez kamienne ręce.",
        conditionDuration: "1t"
    },


// ziemia, drugi stopień


    "Oczy na mnie": {
        name: "Oczy na mnie",
        description: "Mag obiera sobie za cel jednego przeciwnika. Tworzy skalne kastety na swoich dłoniach. Gdy dany przeciwnik zaatakuje kogoś innego niż mag i jest w jego zasięgu, może on użyć swojej reakcji i zadać przeciwnikowi nieunikalny cios za [5 * strength] obrażeń z szansą na ogłuszenie go.",
        roll: "strength",
        difficulty: 8,
        cooldown: 2,
        conditions: [
            { 
                "conditionName": "Skupiony na celu",
                "conditionDescription": "Jeśli jest blisko postaci ze stanem 'Cel skupienia', zada jej [5 * strength] nieunikalnych obrażeń z 20% szansą na ogłuszenie, za każdym razem gdy ta postać zaatakuje kogokolwiek innego niż cel tego stanu.",
                "conditionDuration": "2r",
            },
            { 
                "conditionName": "Cel skupienia",
                "conditionDescription": "Zaatakowanie kogokolwiek innego niż postaci ze stanem 'Skupiony na celu' skończy się silnym nieunikalnym ciosem z szansą ogłuszenia.",
                "conditionDuration": "2r",
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
        condition: "Krwawienie. [1 * strength] obrażeń penetrujących na początku tury.",
        conditionDuration: "3t"
    },
    "Niszczyciel zbroi": {
        name: "Niszczyciel zbroi",
        description: "Uderza cel skupiając się na jego obronie. Pozbawia cel [-2 * roll] pancerza fizycznego.",
        roll: "strength",
        difficulty: "X",
        cooldown: 4,
        condition: "Osłabiony. [-2 * roll] pancerza fizycznego.",
        conditionDuration: "-"
    },


// ziemia, nie bojowe


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


// ziemia, legendarne


    "Ofiara": {
        name: "Ofiara",
        description: "Spod celu wystrzeliwuje naostrzony ziemny kolec, który przebija go na wylot, zadając [15 * strength] penetrujących obrażeń. Cel staje się uwięziony w powietrzu, nadziany na kolec, co czyni go niezdolnym ruchu i uników. Kolec trwa [3] tury.",
        roll: "strength",
        difficulty: 25,
        cooldown: 3,
        condition: "Nadziany na kolec. Brak możliwości ruchu i uników",
        conditionDuration: "3t"
    },
    "Wzniesienie": {
        name: "Wzniesienie",
        description: "Chwyta ziemię i wznosi duży kawał terenu na [30] metrów w górę, łącznie ze wszystkim co się na nim znajduje. Teren pozostanie w takim kształcie dopóki mag tego nie cofnie, albo nie rzuci tego zaklęcia na jakiś inny obszar.",
        roll: "strength",
        difficulty: 15,
        cooldown: 2
    },


// powietrze, pierwszego stopnia


    "Zawirowanie": {
        name: "Zawirowanie",
        description: "[prop_undodgeable] Zakręca szybko celem wokół jego własnej osi, dezorientując go i zmniejszając jego następny rzut na celność oraz na unik o [-6].",
        roll: "agility",
        difficulty: 4,
        cooldown: 0,
        condition: "Dezorientacja. [-6] do rzutów na celność i unik",
        conditionDuration: "1t"
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
        condition: "Naenergetyzowany. Następny rzut na unik mnożony x[2]",
        conditionDuration: "-"
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
        condition: "Powietrzna tarcza. Przekierowanie [1] ataku dystansowego",
        conditionDuration: "-"
    },
    "Małe przyspieszenie": {
        name: "Małe przyspieszenie",
        description: "Wybrany cel zyskuje [1] dodatkową akcję. Nie stackuje się z niczym innym co zapewnia dodatkową turę.",
        roll: "agility",
        difficulty: 9,
        cooldown: 2,
        condition: "[prop_extra_turn] Działa przez [2] tury.",
        conditionDuration: "2t",
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


// powietrze, drugi stopień


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


// powietrze, nie bojowe


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
        condition: "Łagodne lądowanie. Brak obrażeń od upadku",
        conditionDuration: "-"
    },
    "Oddech życia": {
        name: "Oddech życia",
        description: "Leczy cel za [10 * agility] zdrowia. Oczyszcza aurę celu rozwiewając wszystkie pomniejsze klątwy na niego rzucone. Po zakończeniu czaru cel czuje się wypoczęty.",
        roll: "agility",
        difficulty: 5,
        cooldown: 0
    },


// powietrze, legendarne


    "Grupowe przyspieszenie": {
        name: "Grupowe przyspieszenie",
        description: "Przez następne [3] rundy, wszyscy sojusznicy wraz z magiem zostają obdarowani przyspieszeniem, dzięki czemu zyskują dodatkową akcję na turę, zawsze poruszają się pierwsi przed przeciwnikami oraz ich rzuty na unik zostają pomnożone przez [2].",
        roll: "agility",
        difficulty: 25,
        cooldown: 8,
        condition: "[prop_extra_turn] Przyśpieszenie. Dodatkowa akcja, pierwszeństwo ruchu, x[2] do uników",
        conditionDuration: "3t"
    },
    "Tornado": {
        name: "Tornado",
        description: "Wznieca ogromne tornado w wybranym miejscu. Wszystkie jednostki i obiekty zostają porwane przez trąbę powietrzną. Jest to efekt, którego można uniknąć tylko będąc bardzo ciężkim albo przytwierdzonym do ziemi. Tornado trwa [2] tury.",
        roll: "agility",
        difficulty: 35,
        cooldown: 10,
        condition: "Porwany przez tornado. Brak kontroli ruchu",
        conditionDuration: "2t"
    },


// mieszane


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

// Testy
    "Test: Extra Turn": {
        name: "Test: Extra Turn",
        description: "",
        properties: ["prop_extra_turn"],
    },
    "Test: Multiple Rolls": { // testuje rzucanie wiecej niz 1 kostka na raz
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
            { // test obliczania szansy oraz rzutu na pare rzeczy + multi bez possible targets (default 1)
                type: "damage",
                target: "multi",
                damageType: "pierce",
                value: "[1 * vitality + 1 * roll]",
                forceRoll: "vitality + agility + accuracy",
                forceRollDifficulty: 15,
                conditions: [
                    {
                        conditionName: "Stan po rzucie na wiele rzeczy",
                        conditionDescription: "Cel zaliczył rzut na żywotność, zwinność i celność z trudnością 15.",
                        conditionDuration: "2t",
                        conditionSource: "self",
                        conditionIsBeneficial: true,
                    },
                ]
            },
            { // test forceRoll i forceRollVS z wieloma atrybutami na raz.
                type: "damage",
                target: "multi",
                possibleTargets: 3,
                damageType: "pierce",
                value: "[1 * vitality + 1 * roll]",
                forceRollVS: "vitality + agility + vitality vs accuracy + agility",
                forceRoll: "strength + agility",
                forceRollDifficulty: 10,
                conditions: [
                    {
                        conditionName: "Stan po rzucie na wiele rzeczy vs",
                        conditionDescription: "Cel przegrał rzut na vitality + agility + vitality vs accuracy + agility LUB rzut siła + zwinność z trudnością 10.",
                        conditionDuration: "2t",
                        conditionSource: "self",
                        conditionIsBeneficial: false,
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
            { // test skomplikowanych formuł i namierzania multi oraz typu damage pierce
                type: "damage",
                target: "multi",
                possibleTargets: 3,
                damageType: "pierce",
                value: "[-3 * vitality + 4 * strength - 30 + 4 + reflex - 1 * roll + 1 * over]",
            },
            { // test namierzania single, typu damage phys oraz aplikowania wiecej niz 1 stanu. Przy okazji testuje trwanie stanu w turach
                type: "damage",
                target: "single",
                damageType: "phys",
                value: "[1 * vitality]",
                forceRoll: "vitality",
                forceRollDifficulty: 10,
                isConditionSuccessBeneficial: true, // liczy szanse na sukces w przypadku stanow
                conditions: [
                    {
                        conditionName: "Dobry stan po uderzeniu celu",
                        conditionDescription: "Powinien się pojawić tylko jeśli cel został trafiony i zaliczył roll na żywotność.",
                        conditionDuration: "2t",
                        conditionSource: "self",
                        conditionIsBeneficial: true,
                    },
                    {
                        conditionName: "Stan po beneficial uderzeniu celu",
                        conditionDescription: "Powinien się pojawić tylko jeśli cel został trafiony i zaliczył roll na żywotność.",
                        conditionDuration: "2t",
                        conditionSource: "self",
                        conditionIsBeneficial: true,
                    }
                ]
            },
            { // test namierzania self, typu obrazen mag i tego jak zachowuja sie stany oraz forcedRolls przy uderzaniu w siebie. Przy okazji testuje trwanie stanu w rundach
                type: "damage",
                target: "self",
                damageType: "mag",
                value: "[1 * vitality]",
                forceRoll: "intuition",
                forceRollDifficulty: 5,
                forceRollVS: "vitality vs reflex",
                conditions: [
                    {
                        conditionName: "Pozytywny stan po uderzeniu siebie",
                        conditionDescription: "Teoretycznie powinien sie pojawic po wyrzuceniu wiecej niz 5 intuicji oraz wyrzuceniu wiecej zywotnosci niz refleksu.",
                        conditionDuration: "2r",
                        conditionSource: "self",
                        conditionIsBeneficial: true,
                    },
                    {
                        conditionName: "Negatywny stan po uderzeniu siebie",
                        conditionDescription: "Teoretycznie powinien sie pojawic po wyrzuceniu wiecej niz 5 intuicji oraz wyrzuceniu wiecej zywotnosci niz refleksu.",
                        conditionDuration: "2r",
                        conditionSource: "self",
                        conditionIsBeneficial: false,
                    }
                ]
            },
            { // testuje uderzanie, wyswietlania rolli i aplikowanie stanow u wszystkich, a takze zrodlo czerpania informacji o wyswielaniu ze stanu (domyslnie to cel)
                type: "damage",
                target: "all",
                damageType: "mag",
                value: "[15]",
                forceRoll: "agility",
                forceRollDifficulty: 8,
                forceRollVS: "strength vs strength",
                conditions: [
                    {
                        conditionName: "Stan po uderzeniu celu",
                        conditionDescription: "Powinien się pojawić tylko po trafieniu celu obrazeń oraz wygraniu przez niego obu rolli. Stan bierze dane od wywołującego. [1 * strength]",
                        conditionDuration: "2t",
                        conditionSource: "self",
                        conditionIsBeneficial: true,
                    },
                    {
                        conditionName: "Stan po uderzeniu celu 2",
                        conditionDescription: "Powinien się pojawić tylko po trafieniu celu obrazeń oraz zawaleniu przez niego obu rolli. Stan bierze dane od celu. [1 * strength]",
                        conditionDuration: "2t",
                        conditionSource: "target",
                        conditionIsBeneficial: false,
                    },
                ]
            },
            { // testuje celowanie w team przeciwnika (czyli przeciwny do tego, ktory ma uzywajacy umiejetnosci), repeat (powtarzanie akcji x razy, w tym wypadku zadawania obrazen)
                type: "damage",
                target: "team_enemy",
                damageType: "pierce",
                value: "[2 * attunement]",
                repeat: 3,
                forceRoll: "strength",
                forceRollDifficulty: 9,
                conditions: [
                    {
                        conditionName: "Stan po masowym uderzeniu",
                        conditionDescription: "Powinien się pojawić tylko na tych, którzy zostali trafieni i uwalili roll na siłę. Trwa 2 rundy.",
                        conditionDuration: "2r",
                        conditionSource: "self",
                        conditionIsBeneficial: false,
                    }
                ]
            },
            { // testuje wymuszania rolla na wiecej niz 1 rzecz (ktory to roll nic nie robi w zasadzie, bo i tak nie ma stanow)
                type: "damage",
                target: "single",
                damageType: "pierce",
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
                conditions: [
                    {
                        conditionName: "Stan po uleczeniu siebie",
                        conditionDescription: "Powinien się pojawić zawsze, jako że nie ma forced rolla. Powinien także nie mieć wgl celu, bo akcja ma target self.",
                        conditionDuration: "2t",
                        conditionSource: "self",
                    },
                ]
            },
            {
                type: "heal",
                target: "single",
                healType: "threshold",
                value: 50,
                conditions: [
                    {
                        conditionName: "Stan po uleczeniu",
                        conditionDescription: "Powinien się pojawić zawsze dla danego celu, jako że nie ma forced rolla.",
                        conditionDuration: "2t",
                        conditionSource: "target",
                    },
                    {
                        conditionName: "Stan po uleczeniu 2",
                        conditionDescription: "Powinien się pojawić zawsze dla danego celu, jako że nie ma forced rolla.",
                        conditionDuration: "2t",
                        conditionSource: "target",
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
                forceRoll: "intuition", // roll jest, ale jest kinda useless, bo i tak nie ma zadnych stanow
                forceRollDifficulty: 4,
            },
            {
                type: "heal",
                target: "team_ally",
                healType: "normal",
                value: "[2 * attunement]",
                repeat: 3,
                forceRollVS: "vitality vs vitality",
                conditions: [
                    {
                        conditionName: "Stan po masowym leczeniu",
                        conditionDescription: "Powinien się pojawić tylko na tych, którzy wygrali roll żywotność vs żywotność. Trwa 2 rundy.",
                        conditionDuration: "2r",
                        conditionSource: "self",
                        conditionIsBeneficial: true,
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
                // Positive mag armor, multi-stat force roll, mixed conditions
                type: "armor",
                target: "single",
                magArmorValue: 15,
                forceRoll: "strength + vitality",
                forceRollDifficulty: 12,
                isConditionSuccessBeneficial: true, // Required due to mixed conditions AND a forced roll
                conditions: [
                    {
                        conditionName: "Good Armor Buff",
                        conditionDuration: "2t",
                        conditionIsBeneficial: true
                    },
                    {
                        conditionName: "Bad Armor Side-effect",
                        conditionDuration: "2t",
                        conditionIsBeneficial: false
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
                type: "condition",
                target: "self",
                forceRoll: "vitality",
                forceRollDifficulty: 5,
                // testujemy czy flaga isConditionSuccessBeneficial w akcji ma wplyw na aplikowanie stanow - nie powinna miec.
                // teoretycznie tutaj ta flaga jest useless bo target = self więc i tak nie liczymy szansy na powodzenie, 
                // niemniej jednak chce dalej pokazywać blad gdyby tej szansy nie bylo. Bo w przyszlosci to bezwzgledne wymaganie tej flagi w sytuacji gdy stany sa mieszane moze sie przydac 
                isConditionSuccessBeneficial: false, 
                conditions: [
                    { 
                        conditionName: "Przyspieszenie", 
                        conditionDescription: "Powinno się zawsze pokazać jeśli postać zaliczy wymuszone rolle.", 
                        conditionDuration: "1r",
                        conditionProperties: ["prop_extra_turn"],
                        conditionIsBeneficial: true,
                    },
                    { 
                        conditionName: "Nieudane przyspieszenie", 
                        conditionDescription: "Powinno się zawsze pokazać jeśli postać zawali wymuszone rolle.", 
                        conditionDuration: "1r",
                        conditionIsBeneficial: false,
                    }
                ],
            },
            {
                type: "condition",
                target: "single",
                forceRoll: "vitality",
                forceRollDifficulty: 4,
                forceRollVS: "strength vs strength",
                // Póki co jedyne co tutaj robi ta flaga to sluzy do obliczania szansy powodzenia. 
                // Jeśli true to liczymy i wyswietlamy szanse, że celowi uda się zaliczyć wymuszone rzuty
                // jeśli false to liczymy odwrotnosc - że zawali.
                isConditionSuccessBeneficial: true,
                conditions: [
                    { 
                        conditionName: "Przyspieszenie", 
                        conditionDescription: "Powinno się pojawić po zaliczeniu obu rzutów przez cel.", 
                        conditionDuration: "1r",
                        conditionProperties: ["prop_extra_turn"],
                        conditionIsBeneficial: true,
                    },
                    { 
                        conditionName: "Nieudane przyspieszenie", 
                        conditionDescription: "Powinno się pojawić po uwaleniu obu rzutów przez cel", 
                        conditionDuration: "1r",
                        conditionIsBeneficial: false,
                    }
                ],
            },
            {
                type: "condition",
                target: "team_ally",
                // Testuje nakladanie stanu na caly team sojuszniczy. Bez zadnych rolli itd.
                conditions: [
                    { 
                        conditionName: "Masowy bonus", 
                        conditionDescription: "Każdy sojusznik dostaje", 
                        conditionDuration: "1t",
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
                // Ignores properties, should NOT stun the target under any circumstances
                type: "condition",
                target: "single",
                // ignoresAbilityProperties: true,
                conditions: [
                    {
                        conditionName: "Dummy Condition",
                        conditionDuration: "1t",
                        conditionIsBeneficial: true
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
                // 3. error_armor_mixed_stats: armor action provides buffs and debuffs simultaneously without isActionBeneficial flag
                type: "armor",
                target: "single",
                physArmorValue: 10,
                magArmorValue: -5
            },
            {
                // 4. error_armor_zero_stats: armor action evaluates to 0 without isActionBeneficial flag
                type: "armor",
                target: "single",
                physArmorValue: 0
            },
            {
                // 5. error_condition_empty: condition action with empty conditions array or missing array entirely
                type: "condition",
                target: "single",
                conditions: [] 
            },
            {
                // 6. error_condition_missing_flag: action with forced roll but the condition lacks conditionIsBeneficial flag
                type: "damage",
                target: "single",
                damageType: "phys",
                value: 10,
                forceRoll: "agility",
                forceRollDifficulty: 10,
                conditions: [
                    {
                        conditionName: "Stan bez flagi",
                        conditionDuration: "1t"
                    }
                ]
            },
            {
                // 7. error_condition_mixed: heal type action is targeted, has forced roll AND mixed condition types, missing isConditionSuccessBeneficial root flag
                type: "heal",
                target: "single",
                forceRoll: "vitality",
                forceRollDifficulty: 10,
                conditions: [
                    {
                        conditionName: "Good Condition",
                        conditionDuration: "1t",
                        conditionIsBeneficial: true
                    },
                    {
                        conditionName: "Bad Condition",
                        conditionDuration: "1t",
                        conditionIsBeneficial: false
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