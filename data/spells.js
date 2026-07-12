const spell = {
    
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
        description: "Zwiększa żywotność celu o 5. Trwa 8 tur.",
        roll: "vitality",
        difficulty: 4,
        cooldown: 0,
        condition: "Rozpalony. Zwiększa żywotność o 5.",
        conditionDuration: 8
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
        description: "Leczy za [4 * vitality] zdrowia i daje tarczę, która przypali wroga za 50% następnego ataku wręcz (maksymalnie [8 * vitality]).",
        roll: "vitality",
        difficulty: 6,
        cooldown: 1,
        condition: "Ognista tarcza. Zadaje 50% obrażeń ataku wręcz. Maksymalnie [8 * vitality]",
        conditionDuration: "-"
    },
    "Oślepiający rozbłysk": {
        name: "Oślepiający rozbłysk",
        description: "Wytwarza przed magiem rozbłysk pełen jasnych iskier, które lekko oślepiają (-5 do rzutów na celność przez następną turę) wszystkie jednostki patrzące w jego kierunku.",
        roll: "vitality",
        difficulty: 6,
        cooldown: 0,
        condition: "Oślepiony. -5 do rzutów na celność",
        conditionDuration: 1
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
        description: "Nieunikalne. Rozgrzewa broń celu. Rzut na żywotność maga kontra nieustępliwość celu. Jeśli mag wygra, cel puszcza broń i nie może jej podnieść przez swoją następną kolejkę.",
        roll: "vitality",
        difficulty: "X",
        cooldown: 2,
        condition: "Rozgrzana broń. Niemożność podniesienia broni.",
        conditionDuration: 1
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
        description: "Nieunikalne. Zmniejsza pancerz magiczny celu o [2 * roll].",
        roll: "vitality",
        difficulty: "X",
        cooldown: 4
    },
    "Pętla ognia": {
        name: "Pętla ognia",
        description: "Nieunikalne. Rysuje pod celem runę, która wybucha za [5 * roll] obrażeń.",
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
        description: "Penetrujące. Wyczarowuje niszczycielski płomień, który zada [2 ^ over] obrażeń celowi. Jeśli to zabije cel, zostanie z niego tylko popiół.",
        roll: "vitality",
        difficulty: 30,
        cooldown: "raz"
    },
    "Feniks": {
        name: "Feniks",
        description: "Tworzy ogniste skrzydła, umożliwiające lot. Zaklęcie trwa do końca walki lub do śmierci maga. W przypadku śmierci mag wywołuje potężną eksplozję za [10 * vitality] i odradza się z pełnym zdrowiem.",
        roll: "vitality",
        difficulty: 20,
        cooldown: "raz",
        condition: "Feniks. Możliwość lotu. W razie śmierci eksploduje za [10 * vitality] i wraca z pełnym zdrowiem.",
        conditionDuration: "-"
    },


// ogień, specjalne


    "Płonący omen": {
        name: "Płonący omen",
        description: "Nieunikalne. Tworzy nad celem ognistą runę. Runa aktywuje się, gdy cel otrzyma obrażenia magiczne i przypali go za drugie tyle.",
        roll: "vitality",
        difficulty: 12,
        cooldown: 5
    },


// woda, pierwszego stopnia


    "Mrożący dotyk": {
        name: "Mrożący dotyk",
        description: "Mrozi ręce na lód i zadaje nimi [2 * intuition] obrażeń oraz podmraża cel, zmniejszając jego rzuty na zwinność o -4 przez 2 tury.",
        roll: "intuition",
        difficulty: 3,
        cooldown: 0,
        condition: "Podmrożony. -4 do rzutów na zwinność",
        conditionDuration: 2
    },
    "Wodny bicz": {
        name: "Wodny bicz",
        description: "Tworzy bicz z wody. Uderza on za [2 * intuition] obrażeń oraz podmraża cel, zmniejszając jego rzuty na zwinność o -4 przez 2 tury.",
        roll: "intuition",
        difficulty: 5,
        cooldown: 0,
        condition: "Podmrożony. -4 do rzutów na zwinność",
        conditionDuration: 2
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
        description: "Penetrujące. Tworzy na dłoni lodowe wiertło. Atak wiertłem zadaje [3 * intuition] obrażeń.",
        roll: "intuition",
        difficulty: 8,
        cooldown: 1
    },
    "Łagodząca fala": {
        name: "Łagodząca fala",
        description: "Zdejmuje przerażenie, szaleństwo i inne podobne efekty z celu oraz może go zgasić. Dodatkowo fala zmniejsza trudność zaklęć rzucanych przez cel o -4 przez 2 tury.",
        roll: "intuition",
        difficulty: 9,
        cooldown: 2,
        condition: "Skupiony. -4 do trudności rzucania zaklęć",
        conditionDuration: 2
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
        description: "Tworzy lodowe lustro przed celem. Lustro odbije 50% następnych magicznych obrażeń z powrotem w agresora. Nie odbija penetrujących ataków. Użycie penetrującego ataku niszczy lustro.",
        roll: "intuition",
        difficulty: 10,
        cooldown: 2,
        condition: "Lodowe lustro. Odbija 50% następnych magicznych obrażeń",
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
        description: "Nieunikalne. Mocno schładza wodę w organizmie celu, zadając [5 * intuition] obrażeń i zmniejszając jego rzuty na zwinność o -6 przez 2 tury.",
        roll: "intuition",
        difficulty: 12,
        cooldown: 3,
        condition: "Zmrożony. -6 do rzutów na zwinność",
        conditionDuration: 2
    },
    "Wodna powłoka": {
        name: "Wodna powłoka",
        description: "Dodaj celowi 10 pancerza magicznego. Pancerz utrzymuje się przez całą walkę.",
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
        description: "Tworzy bańkę skondensowanej wody wokół głowy celu. W każdej turze musi on znaleźć sposób jak pozbyć się tej bańki, albo zaliczyć coraz trudniejszy rzut na nieustępliwość. Jeśli nie zaliczy rzutu, traci przytomność. Jeśli nie zaliczy kolejnego rzutu, dusi się i ginie. Rzuty są wykonywane na końcu tury celu. Zabicie tym zaklęciem kogoś, kto nie zasługuje na śmierć zwiększa rozkład o 5.",
        roll: "intuition",
        difficulty: 30,
        cooldown: 5,
        condition: "Duszenie. Narastająca trudność rzutów na nieustępliwość. 5 -> 10 -> 15 itd.",
        conditionDuration: "-"
    },
    "Przepływ losu Artursa": {
        name: "Przepływ losu Artursa",
        description: "Jeśli to zaklęcie się uda, wówczas przez kolejne 5 tur wszystkie rzuty decydujące o szansie na coś stają się rzutami 50:50. Zaklęcie obejmuje wszystkich zaangażowanych w walkę.",
        roll: "intuition",
        difficulty: 18,
        cooldown: 6,
        condition: "Losowość. Wszystkie rzuty są 50:50",
        conditionDuration: 5
    },


// woda, specjalne


    "Lodowy miecz": {
        name: "Lodowy miecz",
        description: "Tworzy lodowy miecz, który zadaje [1 * intuition] obrażeń po turze maga. Roztapia się po walce, albo gdy zostanie uderzony.",
        roll: "intuition",
        difficulty: 5,
        cooldown: 0
    },
    "Lodowy arsenał": {
        name: "Lodowy arsenał",
        description: "Tworzy 3 lodowe miecze, z których każdy zadaje [1 * intuition] obrażeń po turze maga. Roztapiają się po walce, albo gdy zostaną uderzone.",
        roll: "intuition",
        difficulty: 10,
        cooldown: 1
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
        description: "Sprawia, że posiadane lodowe miecze zaczynają zadawać penetrujące obrażenia. Trwa 2 tury.",
        roll: "intuition",
        difficulty: 15,
        cooldown: 2,
        condition: "Ostre lodowe miecze. Zadają obrażenia penetrujące.",
        conditionDuration: 2
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
        description: "Mnoży każdy rzut celu na nieustępliwość przez 2. Trwa 3 tury. Nie stackuje się same ze sobą.",
        roll: "strength",
        difficulty: 5,
        cooldown: 0,
        condition: "Zdeterminowany. Rzuty na nieustępliwość mnożone x2",
        conditionDuration: 3
    },
    "Pomoc ziemi": {
        name: "Pomoc ziemi",
        description: "Leczy cel za [4 * strength] zdrowia oraz obdarowuje go kamienną barierą, która zmniejszy obrażenia następnego ataku fizycznego o 50%.",
        roll: "strength",
        difficulty: 6,
        cooldown: 1,
        condition: "Kamienna bariera. Redukcja następnych obrażeń fizycznych o 50%",
        conditionDuration: "-"
    },
    "Spadająca bryła": {
        name: "Spadająca bryła",
        description: "Przywołuje sporą skałę nad głową celu, która spadnie i go zmiażdży, zadając [4 * strength] obrażeń. Rzuty na to zaklęcie mają -4 celności.",
        roll: "strength",
        difficulty: 8,
        cooldown: 0
    },
    "Bastion": {
        name: "Bastion",
        description: "Zakopuje nogi maga w ziemi. Nie może się on poruszać oraz być poruszanym przez cokolwiek. Ciało maga pokrywa się kamienną skorupą, która zmniejsza otrzymywane obrażenia fizyczne o 50%. Efekt trwa 3 tury.",
        roll: "strength",
        difficulty: 8,
        cooldown: 3,
        condition: "Unieruchomiony. Redukcja obrażeń fizycznych o 50%",
        conditionDuration: 3
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
        description: "Nieunikalne. Zamienia ziemię w klejące błoto na kolistym obszarze o średnicy paru metrów. Każda jednostka znajdująca się na tym terenie ma bardzo utrudnione poruszanie się i musi spędzić kolejkę, jeśli chce z niego wyjść. Efekt trwa 2 tury.",
        roll: "strength",
        difficulty: 10,
        cooldown: 2,
        condition: "Ubłocony. Ograniczony ruch. Wymaga całej kolejki na wyjście z błota",
        conditionDuration: 2
    },
    "Kamienny chwyt": {
        name: "Kamienny chwyt",
        description: "Nieunikalne. Tworzy ręce z ziemi, które próbują unieruchomić cel na 1 turę (rzut siła kontra siła).",
        roll: "strength",
        difficulty: "X",
        cooldown: 2
    },


// ziemia, drugi stopień


    "Oczy na mnie": {
        name: "Oczy na mnie",
        description: "Mag obiera sobie za cel jednego przeciwnika. Tworzy skalne kastety na swoich dłoniach. Gdy dany przeciwnik zaatakuje kogoś innego niż mag i jest w jego zasięgu, może on użyć swojej reakcji i zadać przeciwnikowi nieunikalny cios za [5 * siła] obrażeń z szansą na ogłuszenie go.",
        roll: "strength",
        difficulty: 8,
        cooldown: 2,
        condition: "Cel skupienia. Zaatakowanie innego przeciwnika niż mag skończy się źle",
    },
    "Skalne włócznie": {
        name: "Skalne włócznie",
        description: "Penetrujące. Wyczarowuje dwie włócznie ze skał. Można nimi rzucić (rzut na celność 2 razy). Każda trafiona włócznia zadaje [3 * strength] obrażeń.",
        roll: "strength",
        difficulty: 12,
        cooldown: 3
    },
    "Obsydianowa eksplozja": {
        name: "Obsydianowa eksplozja",
        description: "Mag eksploduje dookoła siebie ostrymi, obsydianowymi kawałkami, które zranią wszystkich znajdujących się w promieniu kilku metrów od niego. Odłamki zadają [3 * strength] obrażeń + [1 * strength] penetrujących obrażeń od krwotoku przez 3 następne tury.",
        roll: "strength",
        difficulty: 15,
        cooldown: 4,
        condition: "Krwawienie. [1 * strength] obrażeń penetrujących na początku tury.",
        conditionDuration: 3
    },
    "Niszczyciel zbroi": {
        name: "Niszczyciel zbroi",
        description: "Uderza cel skupiając się na jego obronie. Pozbawia cel [2 * roll] pancerza fizycznego.",
        roll: "strength",
        difficulty: "X",
        cooldown: 4
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
        description: "Pozwala poczuć kształt, rozłożenie i zmiany ziemii wokół maga.",
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
        description: "Spod celu wystrzeliwuje naostrzony ziemny kolec, który przebija go na wylot, zadając [15 * strength] penetrujących obrażeń. Cel staje się uwięziony w powietrzu, nadziany na kolec, co czyni go niezdolnym ruchu i uników. Kolec trwa 3 tury.",
        roll: "strength",
        difficulty: 25,
        cooldown: 3,
        condition: "Nadziany na kolec. Brak możliwości ruchu i uników",
        conditionDuration: 3
    },
    "Wzniesienie": {
        name: "Wzniesienie",
        description: "Chwyta ziemię i wznosi duży kawał terenu na 30 metrów w górę, łącznie ze wszystkim co się na nim znajduje. Teren pozostanie w takim kształcie dopóki mag tego nie cofnie, albo nie rzuci tego zaklęcia na jakiś inny obszar.",
        roll: "strength",
        difficulty: 15,
        cooldown: 2
    },


// powietrze, pierwszego stopnia


    "Zawirowanie": {
        name: "Zawirowanie",
        description: "Nieunikalne. Zakręca szybko celem wokół jego własnej osi, dezorientując go i zmniejszając jego następny rzut na celność oraz na unik o -6.",
        roll: "agility",
        difficulty: 4,
        cooldown: 0,
        condition: "Dezorientacja. -6 do rzutów na celność i unik",
        conditionDuration: 1
    },
    "Tnące łuki": {
        name: "Tnące łuki",
        description: "Nieunikalne. Wystrzeliwuje 3 pociski z powietrza w kształcie łuków, które uderzą w wybrany cel. Każdy zadaje [1 * agility] obrażeń.",
        roll: "agility",
        difficulty: 6,
        cooldown: 0
    },
    "Leczniczy podmuch": {
        name: "Leczniczy podmuch",
        description: "Leczy cel za [4 * agility] zdrowia i mnoży następny rzut na unik x2.",
        roll: "agility",
        difficulty: 6,
        cooldown: 1,
        condition: "Naenergetyzowany. Następny rzut na unik mnożony x2",
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
        description: "Tworzy tarczę z powietrza, która przekieruje jeden atak dystansowy. Nie działa na ataki i zaklęcia penetrujące.",
        roll: "agility",
        difficulty: 8,
        cooldown: 0,
        condition: "Powietrzna tarcza. Przekierowanie jednego ataku dystansowego",
        conditionDuration: "-"
    },
    "Małe przyspieszenie": {
        name: "Małe przyspieszenie",
        description: "Wybrany cel zyskuje dodatkową akcję w swojej następnej turze.",
        roll: "agility",
        difficulty: 9,
        cooldown: 2,
        condition: "Przyśpieszony. Dodatkowa akcja w następnej turze",
        conditionDuration: 1,
    },
    "Wir pięści": {
        name: "Wir pięści",
        description: "Nieunikalne. Wyczarowuje 10 pięści z powietrza. Każda uderza cel za [0.5 * agility].",
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
        description: "Nieunikalne. Uderza cel skompresowanym powietrzem za [4 * agility] i próbuje go przewrócić.",
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
        description: "Przez swoje następne 3 tury, wszyscy sojusznicy wraz z magiem zostają obdarowani przyspieszeniem, dzięki czemu zyskują dodatkową akcję na turę, zawsze poruszają się pierwsi przed przeciwnikami oraz ich rzuty na unik zostają pomnożone przez 2.",
        roll: "agility",
        difficulty: 25,
        cooldown: 8,
        condition: "Przyśpieszenie. Dodatkowa akcja, pierwszeństwo ruchu, x2 do uników",
        conditionDuration: 3
    },
    "Tornado": {
        name: "Tornado",
        description: "Wznieca ogromne tornado w wybranym miejscu. Wszystkie jednostki i obiekty zostają porwane przez trąbę powietrzną. Jest to efekt, którego można uniknąć tylko będąc bardzo ciężkim albo przytwierdzonym do ziemi. Tornado trwa 2 tury.",
        roll: "agility",
        difficulty: 35,
        cooldown: 10,
        condition: "Porwany przez tornado. Brak kontroli ruchu",
        conditionDuration: 2
    },


// mieszane


    "Oddychanie pod wodą": {
        name: "Oddychanie pod wodą",
        description: "Tworzy/zachowuje bańkę powietrza wokół głowy celu.",
        roll: "intuition, agility",
        difficulty: 5,
        cooldown: 0
    },
    "Grupowe oddychanie pod wodą": {
        name: "Grupowe oddychanie pod wodą",
        description: "Tworzy/zachowuje bańkę powietrza wokół głowy wszystkich członków drużyny.",
        roll: "intuition, agility",
        difficulty: 10,
        cooldown: 0
    },

    "Test1": {
        name: "Test1",
        description: "Nieunikalne. Penetrujące. 5 * Żywotność = [5 * vitality], 6 * Intuicja = [6 * intuition], 10 * rzut = [10 * roll], trelele, 8 * przebicie = [8 * over]",
        roll: "vitality",
        difficulty: 6,
        cooldown: 0
    },
    "Test2": {
        name: "Test2",
        description: "5 * Żywotność = [5 * vitality], 6 * Intuicja = [6 * intuition], 10 * rzut = [10 * roll], 8 * przebicie = [8 * over]",
        roll: "vitality",
        difficulty: "X",
        cooldown: 0
    },
}