/*
 * Рушій аналізу: шукає в тексті патерни «ШІ-стилю» за правилами.
 * Працює в браузері й у Node, без залежностей. Це ознаки, а не вирок.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PatternEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var RANK = { strong: 3, medium: 2, weak: 1, human: 0 };

  var GENRES = {
    science: {
      name: "Науковий текст",
      ov: { weasel: "strong", hist: "strong", hedge: "strong", vague: "weak", onlevel: "weak", wverb: "weak", buzz: "weak", filler: "weak", rhetor: "weak", recap: "weak", puff: "medium" }
    },
    journalism: {
      name: "Журналістика й блог",
      ov: { weasel: "strong", filler: "medium", vague: "weak", hist: "medium", hedge: "medium" }
    },
    marketing: {
      name: "Маркетинг і реклама",
      ov: { buzz: "strong", puff: "strong", rhetor: "strong", kicker: "strong", filler: "medium", vague: "medium", recap: "medium", onlevel: "medium" }
    },
    general: {
      name: "Загальний текст",
      ov: {}
    }
  };

  function mk(src) {
    return new RegExp("(?<![\\p{L}\\p{N}])(?:" + src + ")(?![\\p{L}\\p{N}])", "giu");
  }
  function mkRaw(src, flags) {
    return new RegExp(src, flags || "giu");
  }

  var S = String.raw;

  /* id, назва патерну, базова серйозність, регулярні вирази, що не так, як виправити, нотатки за жанрами */
  var RULES = [
    { id: "meta", cat: "Метакоментар", sev: "medium",
      res: [
        mk(S`(?:\p{L}+\s+){0,3}(?:порівнянн|приклад|розділ|статт|робот|огляд|вступ|абзац|текст|сравнени|пример|раздел|обзор)\p{L}*\s+(?:демонструє|показує|свідчить|засвідчує|ілюструє|підтверджує|доводить|демонстрирует|показывает|свидетельствует|иллюстрирует|подтверждает),?\s+(?:що|что)`),
        mk(S`у\s+цій\s+(?:статті|роботі|розвідці|публікації)|в\s+этой\s+статье|як\s+(?:вже\s+)?(?:зазначалося|згадувалося|було\s+сказано|було\s+зазначено)(?:\s+вище)?|давайте\s+(?:розберемо(?:ся)?|зануримося|поринемо)`)
      ],
      what: "Текст коментує сам себе замість того, щоб сказати висновок. Фраза називає дію автора, а не думку.",
      fix: "Прибрати й одразу сказати висновок.",
      gn: { science: "Підсумок наприкінці вступу в науковому тексті нормальний. Метакоментар можна скоротити.", _: "Читач щойно прочитав це сам. Починайте зі змісту." } },

    { id: "filler", cat: "Порожня фраза", sev: "medium",
      res: [mk(S`варто\s+(?:зазначити|відзначити|підкреслити|наголосити|нагадати)|слід\s+(?:зазначити|відзначити|підкреслити|наголосити)|важливо\s+(?:зазначити|розуміти|підкреслити|пам.ятати)|необхідно\s+(?:зазначити|підкреслити|відзначити)|не\s+можна\s+не\s+(?:відзначити|згадати)|на\s+сьогоднішній\s+день|у\s+сучасному\s+світі|в\s+сучасному\s+світі|у\s+наш\s+час|в\s+епоху|в\s+умовах\s+сучасност\p{L}*|в\s+даний\s+момент|на\s+даний\s+момент|як\s+відомо|врешті-решт|стоит\s+отметить|следует\s+отметить|важно\s+подчеркнуть|в\s+современном\s+мире|на\s+сегодняшний\s+день|в\s+наше\s+время`)],
      what: "Фраза відтягує думку й нічого не додає. Без неї речення не втрачає змісту.",
      fix: "Видалити й почати одразу з головного.",
      gn: { science: "У науковому стилі такі звороти трапляються, але рідко потрібні.", _: "Це шаблонний зачин: його можна поставити в будь-який текст." } },

    { id: "puff", cat: "Роздута значущість", sev: "medium",
      res: [mk(S`відіграє\s+(?:важливу|ключову|вирішальну|значну|величезну|центральну|провідну)\s+роль|відіграють\s+\p{L}+\s+роль|має\s+(?:велике|величезне|надзвичайне|вирішальне|ключове)\s+значення|займає\s+(?:особливе|важливе|центральне|ключове|чільне)\s+місце|є\s+(?:ключовим|важливим|фундаментальним|невід.ємним)\s+(?:аспектом|елементом|чинником|фактором|компонентом|складником)|свідчить\s+про\s+(?:важливість|значущість|значимість)|підкреслює\s+(?:важливість|значущість|значимість)|історична\s+віха|играет\s+(?:важную|ключевую|решающую)\s+роль|имеет\s+(?:большое|огромное)\s+значение`)],
      what: "Фраза каже, що щось важливе, замість того щоб показати чому.",
      fix: "Замінити фактом: що саме змінилося, скільки, для кого.",
      gn: { science: "Для наукового тексту потрібна конкретна теза чи посилання, а не оцінка важливості.", _: "Покажіть важливість фактом, а не оцінкою." } },

    { id: "weasel", cat: "Без джерела", sev: "medium",
      res: [mk(S`(?:дослідники|вчені|науковці|експерти|фахівці|аналітики|психологи|лінгвісти|філософи|історики|економісти|педагоги)\s+(?:вважають|стверджують|наголошують|зазначають|переконані|одностайні|сходяться)|багато\s+(?:дослідників|авторів|науковців|експертів|фахівців)\s+\p{L}+|(?:як\s+)?(?:показують|свідчать)\s+(?:дослідження|дані|статистика|опитування)|за\s+(?:даними|результатами)\s+(?:досліджень|опитувань|експертів)|загальновідом\p{L}*|загальноприйнят\p{L}*|відомий\s+факт|исследователи\s+(?:считают|утверждают)|исследования\s+показывают|эксперты\s+(?:считают|утверждают)`)],
      what: "Посилання на безіменних «дослідників» чи «дані». Перевірити таке твердження неможливо.",
      fix: "Назвати автора, дослідження чи рік або прибрати твердження.",
      gn: { science: "У науковому тексті твердження без імені й посилання вразливе.", _: "Назвіть джерело або викресліть твердження." } },

    { id: "hist", cat: "Без джерела", sev: "medium",
      res: [mk(S`(?:властив|притаман)\p{L}+\s+(?:й\s+|і\s+)?історії\s+(?:\p{L}+\s+){0,3}(?:філософії|науки|лінгвістики|мови|культури|мистецтва|літератури|педагогіки|психології|економіки|права)(?:\s+\p{L}+\s+століття)?|(?:в|у)\s+історії\s+(?:\p{L}+\s+){0,3}(?:філософії|науки|лінгвістики|мови|культури|мистецтва|літератури|педагогіки|психології|економіки|права)(?:\s+\p{L}+\s+століття)?`)],
      what: "Велике історичне твердження без імен, праць і дат.",
      fix: "Назвати авторів чи напрями й дати хоча б одне посилання.",
      gn: { science: "Для наукового тексту це слабке місце: без імен твердження неможливо перевірити.", _: "Назвіть хоча б одного автора чи подію." } },

    { id: "hedge", cat: "Розмите застереження", sev: "medium",
      res: [mkRaw(S`\((?:хоча\s+й|хоча|попри|незважаючи)[^)\n]{3,120}\)`, "giu")],
      what: "Застереження в дужках звучить обережно, але не містить факту: що саме змінилося?",
      fix: "Назвати реформу, документ чи дослідження або прибрати дужку.",
      gn: { science: "У науковому тексті таке застереження потребує посилання.", _: "Або конкретика, або без застереження." } },

    { id: "contrast", cat: "Протиставлення «не лише…, а й»", sev: "medium",
      res: [
        mkRaw(S`не\s+(?:лише|тільки)\s+[^.;!?\n]{3,140}?,\s*(?:а\s+й|а\s+і|але\s+й|а\s+також|але\s+і)(?:\s+\p{L}+)?`, "giu"),
        mkRaw(S`не\s+просто\s+[^.;!?\n]{3,100}?,\s*а\s+\p{L}+`, "giu"),
        mkRaw(S`(?:це|є)\s+не\s+[^.;!?\n]{2,60}?,\s*а\s+\p{L}+`, "giu"),
        mkRaw(S`не\s+только\s+[^.;!?\n]{3,140}?,\s*но\s+и(?:\s+\p{L}+)?`, "giu")
      ],
      what: "Конструкція розкладає думку на дві частини, хоча головна друга. Перша часто лише розгін.",
      fix: "Сказати головне одразу.",
      gn: { _: "Якщо перша частина справді потрібна, розгорніть її окремим реченням." } },

    { id: "rhetor", cat: "Риторична заготовка", sev: "medium",
      res: [mk(S`що,?\s+якщо\s+я\s+скажу|уявіть(?:е)?[,:]?|подумайте\s+про\s+це|ось\s+у\s+чому\s+(?:справа|секрет|проблема)|правда\s+в\s+тому|(?:річ|справа)\s+у\s+тому,?\s+що|скажу\s+чесно|чесно\s+кажучи|давайте\s+будемо\s+чесними|ось\s+що\s+(?:важливо|потрібно)|секрет\s+(?:у\s+тому|простий)|ось\s+як\s+це\s+працює|а\s+тепер\s+(?:увага|найцікавіше)|і\s+ось\s+чому|вот\s+в\s+чём\s+дело|правда\s+в\s+том`)],
      what: "Прийом, який готує читача до «відкриття». Думка від цього не стає сильнішою.",
      fix: "Прибрати заготовку й одразу сказати думку.",
      gn: { science: "У науковому тексті такі прийоми зайві.", _: "Читач і так прочитає наступне речення." } },

    { id: "buzz", cat: "ШІ-лексика", sev: "medium",
      res: [mk(S`багатогранн\p{L}*|всеосяжн\p{L}*|революційн\p{L}*|парадигм\p{L}*|синергі\p{L}*|ландшафт\p{L}*|гобелен\p{L}*|безшовн\p{L}*|занурит\p{L}*|поринути|розкрит\p{L}*\s+потенціал|розкрити\s+потенціал|нов\p{L}+\s+горизонт\p{L}*|надзвичайно\s+важлив\p{L}*|невід.ємн\p{L}+\s+частин\p{L}*|широк\p{L}+\s+спектр|різноманітн\p{L}+\s+спектр|сприяє|сприяють|оптимізу\p{L}*|інноваційн\p{L}*|комплексн\p{L}+\s+підхід|унікальн\p{L}+\s+можливост\p{L}*|всеобъемлющ\p{L}*|многогранн\p{L}*`)],
      what: "Слово чи звіт, який часто повторюють мовні моделі. Звучить урочисто, але мало означає.",
      fix: "Замінити простим словом або конкретним фактом.",
      gn: { science: "Слово може бути терміном вашої галузі. Тоді залиште його.", marketing: "Реклама з такою лексикою звучить однаково в усіх брендів.", _: "Якщо слово можна поставити в будь-який текст, воно зайве." } },

    { id: "vague", cat: "Розмите слово", sev: "weak",
      res: [mk(S`вкрай|надзвичайно|безперечно|безумовно|очевидно|по\s+суті|фактично|насправді|справді|своєрідн\p{L}*|доволі|значною\s+мірою|певною\s+мірою|в\s+певній\s+мірі|у\s+певному\s+сенсі|певн(?:ий|а|е|і|у|ого|ої|ому|ій|им|ою|их|ими)|помітн\p{L}*|суттєв\p{L}*|істотн\p{L}*`)],
      what: "Слово посилює чи пом'якшує, але нічого не уточнює.",
      fix: "Видалити або замінити числом чи конкретним словом.",
      gn: { science: "У науковому тексті «певний» часто є обережним словом. Лишайте, якщо це справді застереження.", _: "Подивіться, чи зміниться речення без цього слова." } },

    { id: "onlevel", cat: "Порожня конструкція", sev: "weak",
      res: [mk(S`на\s+рівні|в\s+рамках|у\s+рамках|в\s+контексті|у\s+контексті|з\s+точки\s+зору|у\s+плані|в\s+плані|головним\s+чином|в\s+першу\s+чергу`)],
      what: "Службова конструкція, яку часто можна замінити прийменником або прибрати.",
      fix: "Скоротити: «на рівні засвоєння» → «у засвоєнні».",
      gn: { science: "У науковому стилі така конструкція поширена, але часто нічого не додає.", _: "Перевірте, чи речення працює без неї." } },

    { id: "wverb", cat: "Слабке дієслово", sev: "weak",
      res: [mk(S`виявляється\s+(?:у|в|через)|виявляються\s+(?:у|в)|постає\s+(?:як|перед|в|у)|постають\s+(?:як|перед)|випливає\s+(?:в|у)\s+\p{L}+|має\s+місце|являє\s+собою|являють\s+собою|становить\s+собою|є\s+не\s+що\s+інше,?\s+як|слугує|слугують|виступає\s+(?:як|в\s+ролі|у\s+ролі)|виступають\s+(?:як|в\s+ролі)|здійснюється|здійснюються|характеризується|представляє\s+собою|представляет\s+собой`)],
      what: "Дієслово звучить вагомо, але нічого не рухає. Часто достатньо «є», «має» чи прямого дієслова.",
      fix: "Замінити прямим дієсловом: «полягає», «є», «перетворюється на».",
      gn: { science: "Це звичний науковий зворот. Міняйте, якщо він повторюється.", _: "Прямі дієслова читаються швидше." } },

    { id: "kicker", cat: "Пафосний кінець", sev: "medium",
      res: [mk(S`це\s+(?:лише|тільки)\s+початок|і\s+це\s+(?:лише|тільки)\s+початок|майбутнє\s+(?:вже\s+)?(?:тут|настало)|це\s+не\s+кінець,?\s+а\s+початок|от\s+і\s+все|ось\s+така\s+історія|ключ\s+до\s+успіху|все\s+(?:тільки|лише)\s+починається|початок\s+нового\s+\p{L}+`)],
      what: "Фінальна «глибока» фраза, яка перетворює думку на афоризм.",
      fix: "Видалити й закінчити останнім конкретним реченням.",
      gn: { _: "Закінчуйте фактом, висновком чи наступним кроком." } },

    { id: "emoji", cat: "Емодзі як маркер", sev: "weak",
      res: [mkRaw(S`^\s*[\p{Extended_Pictographic}️]+`, "gmu")],
      what: "Емодзі на початку рядка виконує роль оформлення, а не змісту.",
      fix: "Прибрати або замінити заголовком.",
      gn: { _: "У науковому й діловому тексті емодзі не потрібні." } },

    { id: "bold", cat: "Жирний у реченні", sev: "weak",
      res: [mkRaw(S`\*\*[^*\n]{2,60}\*\*`, "gu")],
      what: "Жирний шрифт посеред речення. Виділення для всього знецінює виділення.",
      fix: "Лишити жирним лише справді ключове або прибрати.",
      gn: { _: "Структуру краще давати заголовками." } }
  ];

  var RECAP = mkRaw(S`(?:^|(?<=[.!?…]\s))(?:отже|таким\s+чином|підсумовуючи|у\s+підсумку|в\s+підсумку|загалом|в\s+цілому|у\s+цілому|на\s+завершення|насамкінець|у\s+висновку|итак|таким\s+образом|подводя\s+итог),?`, "giu");
  var COLON_IGNORE = { "наприклад": 1, "приклад": 1, "тобто": 1, "зокрема": 1, "цитата": 1, "примітка": 1, "а": 1, "такі": 1, "наступні": 1, "наступне": 1 };

  function sevFor(rule, genre) {
    var g = GENRES[genre] || GENRES.general;
    return g.ov[rule.id] || rule.sev;
  }
  function noteFor(rule, genre) {
    var gn = rule.gn || {};
    return gn[genre] || gn._ || "";
  }

  function paragraphs(text) {
    var out = [], re = /[^\n]+/g, m;
    while ((m = re.exec(text))) {
      if (m[0].trim()) out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
    return out;
  }

  function sentences(text) {
    var out = [], re = /[^.!?…]+(?:[.!?…]+|$)/gu, m;
    while ((m = re.exec(text))) {
      var t = m[0];
      var lead = t.length - t.replace(/^\s+/, "").length;
      if (t.trim()) out.push({ start: m.index + lead, text: t.trim() });
    }
    return out;
  }

  function words(text) {
    return text.match(/\p{L}[\p{L}'ʼ’-]*/gu) || [];
  }

  function patternFindings(p, genre) {
    var out = [];
    RULES.forEach(function (rule) {
      rule.res.forEach(function (re) {
        re.lastIndex = 0;
        var m;
        while ((m = re.exec(p.text))) {
          if (!m[0].length) { re.lastIndex++; continue; }
          out.push({
            start: p.start + m.index, end: p.start + m.index + m[0].length,
            id: rule.id, cat: rule.cat, sev: sevFor(rule, genre),
            what: rule.what, fix: rule.fix, genre: noteFor(rule, genre)
          });
        }
      });
    });

    /* підсумок-переказ на початку речення */
    var rs = { id: "recap", sev: "weak" };
    var rsev = sevFor(rs, genre);
    RECAP.lastIndex = 0;
    var m;
    while ((m = RECAP.exec(p.text))) {
      if (!m[0].length) { RECAP.lastIndex++; continue; }
      out.push({
        start: p.start + m.index, end: p.start + m.index + m[0].replace(/,$/, "").length,
        id: "recap", cat: "Підсумок-переказ", sev: rsev,
        what: "Початок речення, який готує переказ уже сказаного.",
        fix: "Закінчити останнім конкретним пунктом або наступним кроком.",
        genre: genre === "science" ? "Підсумок у науковому тексті допустимий, але не повинен переказувати абзац." : "Читач щойно це прочитав."
      });
    }

    /* двокрапка-розкриття */
    var colon = /(?:^|(?<=[.!?…]\s))((?:\p{L}+\s+){0,3}\p{L}+):\s+(?=\p{Ll})[^.!?…\n]{3,90}[.!?…]/gu;
    while ((m = colon.exec(p.text))) {
      var first = m[1].split(/\s+/)[0].toLowerCase();
      if (COLON_IGNORE[first]) continue;
      out.push({
        start: p.start + m.index, end: p.start + m.index + m[1].length + 1,
        id: "colon", cat: "Двокрапка-розкриття", sev: "weak",
        what: "Коротка підводка й двокрапка перед «відкриттям». Двокрапку краще лишити для списків і цитат.",
        fix: "Переписати одним звичайним реченням.",
        genre: "У списках і визначеннях двокрапка доречна."
      });
    }

    /* однотипні початки речень */
    var ss = sentences(p.text), buckets = {};
    ss.forEach(function (s) {
      var w = (s.text.match(/^\p{L}+/u) || [""])[0].toLowerCase();
      if (w.length > 2) (buckets[w] = buckets[w] || []).push({ s: s, w: w });
    });
    Object.keys(buckets).forEach(function (k) {
      if (buckets[k].length >= 3) buckets[k].forEach(function (b) {
        out.push({
          start: p.start + b.s.start, end: p.start + b.s.start + b.w.length,
          id: "opener", cat: "Однотипний початок", sev: "weak",
          what: "Кілька речень поспіль починаються з того самого слова. Виходить механічний ритм.",
          fix: "Змінити будову хоча б одного речення.",
          genre: "У переліках повтор початків буває свідомим прийомом."
        });
      });
    });

    return out;
  }

  /* сигнали, які радше властиві живому письму: не доказ */
  function humanFindings(p) {
    var out = [], m;
    var eup = /(?:^|(?<=[.!?…]\s))В\s+(?=[бвгґджзклмнпрстфхцчшщ])\p{L}+/gu;
    while ((m = eup.exec(p.text))) {
      out.push({
        start: p.start + m.index, end: p.start + m.index + m[0].length,
        id: "euph", cat: "Дрібна непослідовність", sev: "human",
        what: "На початку речення перед приголосним зазвичай пишуть «У». Такий збій типовіший для людського письма. Доказом не є.",
        fix: "Виправити на «У».", genre: "Милозвучність: у/в залежить від сусідніх звуків."
      });
    }
    return out;
  }

  function apostropheFindings(text) {
    var re = /\p{L}+(['ʼ’‘`´])\p{L}+/gu, m, types = {}, hits = [];
    while ((m = re.exec(text))) {
      var ch = m[1];
      types[ch] = (types[ch] || 0) + 1;
      hits.push({ ch: ch, start: m.index, end: m.index + m[0].length });
    }
    var keys = Object.keys(types);
    if (keys.length < 2) return [];
    keys.sort(function (a, b) { return types[a] - types[b]; });
    if (types[keys[0]] === types[keys[1]]) return [];
    var minor = keys[0];
    return hits.filter(function (h) { return h.ch === minor; }).map(function (h) {
      return {
        start: h.start, end: h.end, id: "apos", cat: "Різні апострофи", sev: "human",
        what: "У тексті вжито кілька видів апострофа. Так буває, коли текст зібрано з різних джерел або набрано вручну. Доказом не є.",
        fix: "Уніфікувати апострофи.", genre: "Редакторська дрібниця, яка не залежить від жанру."
      };
    });
  }

  function resolve(list) {
    var sorted = list.slice().sort(function (a, b) {
      return (RANK[b.sev] - RANK[a.sev]) || ((b.end - b.start) - (a.end - a.start)) || (a.start - b.start);
    });
    var kept = [];
    sorted.forEach(function (f) {
      for (var i = 0; i < kept.length; i++) {
        if (f.start < kept[i].end && f.end > kept[i].start) return;
      }
      kept.push(f);
    });
    return kept.sort(function (a, b) { return a.start - b.start; });
  }

  function observations(text, genre, nFindings, nWords, sents) {
    var notes = [];
    if (nWords >= 60) {
      var names = (text.match(/(?<=[\p{Ll},;:)]\s)\p{Lu}\p{Ll}{2,}/gu) || []).length;
      var years = (text.match(/(?<!\d)(?:1[5-9]\d\d|20\d\d)(?!\d)/g) || []).length;
      var refs = (text.match(/\[\d+(?:[,–-]\s*\d+)*\]/g) || []).length;
      if (!names && !years && !refs) {
        notes.push({
          sev: genre === "science" || genre === "journalism" ? "strong" : "info",
          text: "У тексті немає жодного імені, дати чи посилання." + (genre === "science" ? " Для наукового тексту це головний сигнал, тому «Без джерела» тут рахується найсерйозніше." : "")
        });
      }
    }
    if (sents.length >= 6) {
      var lens = sents.map(function (s) { return words(s.text).length; });
      var mean = lens.reduce(function (a, b) { return a + b; }, 0) / lens.length;
      var sd = Math.sqrt(lens.reduce(function (a, b) { return a + Math.pow(b - mean, 2); }, 0) / lens.length);
      var cv = mean ? sd / mean : 1;
      if (cv < 0.28) notes.push({ sev: "info", text: "Речення майже однакової довжини (відхилення " + Math.round(cv * 100) + "%). Рівний ритм часто читається як машинний." });
    }
    var density = nWords ? (nFindings / nWords) * 100 : 0;
    notes.push({ sev: "info", text: nFindings + " знахідок на " + nWords + " слів (приблизно " + density.toFixed(1).replace(".", ",") + " на 100 слів)." });
    notes.push({ sev: "info", text: "Патерни є ознаками, а не доказом, що текст писав ШІ. Іменникову мову й термінологію в науковому жанрі вважаємо нормою." });
    return notes;
  }

  /* зіставлення цитат, які повернула модель, із позиціями в тексті */
  function mapExternal(text, items) {
    var used = [], out = [];
    (items || []).forEach(function (it) {
      var q = ((it && it.quote) || "").trim();
      if (q.length < 2) return;
      var from = 0, idx = -1;
      while ((idx = text.indexOf(q, from)) !== -1) {
        var end = idx + q.length;
        var clash = used.some(function (u) { return idx < u[1] && end > u[0]; });
        if (!clash) {
          used.push([idx, end]);
          var sev = Object.prototype.hasOwnProperty.call(RANK, it.severity) ? it.severity : "weak";
          out.push({
            start: idx, end: end, id: "llm", cat: String(it.category || "Знахідка"), sev: sev,
            what: String(it.what || ""), fix: String(it.fix || ""), genre: String(it.genre || "")
          });
          return;
        }
        from = idx + 1;
      }
    });
    return out;
  }

  function analyze(text, opts) {
    opts = opts || {};
    var genre = GENRES[opts.genre] ? opts.genre : "science";
    var ps = paragraphs(text), all = [];
    ps.forEach(function (p) {
      if (!opts.external) all = all.concat(patternFindings(p, genre));
      all = all.concat(humanFindings(p));
    });
    all = all.concat(apostropheFindings(text));
    if (opts.external) all = all.concat(mapExternal(text, opts.external));
    var findings = resolve(all);
    var sents = [];
    ps.forEach(function (p) { sents = sents.concat(sentences(p.text)); });
    var nWords = words(text).length;
    var real = findings.filter(function (f) { return f.sev !== "human"; }).length;
    return {
      text: text, genre: genre, genreName: GENRES[genre].name,
      paragraphs: ps, findings: findings,
      notes: observations(text, genre, real, nWords, sents),
      stats: { words: nWords, findings: real }
    };
  }

  return { analyze: analyze, GENRES: GENRES, RANK: RANK, paragraphs: paragraphs, mapExternal: mapExternal };
});
