/* Запуск: node test/engine.test.js */
var assert = require("assert");
var E = require("../engine.js");
var SAMPLE = require("../sample.js");

function ids(res) { return res.findings.map(function (f) { return f.id; }); }
function quotes(res) { return res.findings.map(function (f) { return res.text.slice(f.start, f.end); }); }

/* 1. Приклад: очікувані знахідки */
var sci = E.analyze(SAMPLE, { genre: "science" });
var got = ids(sci);
["meta", "hedge", "hist", "wverb", "contrast", "onlevel", "vague", "euph", "apos"].forEach(function (id) {
  assert.ok(got.indexOf(id) !== -1, "очікував знахідку " + id + ", є: " + got.join(","));
});

/* 2. Жанр змінює серйозність: у науковому тексті «без джерела» сильніше за «розмите слово» */
var hist = sci.findings.filter(function (f) { return f.id === "hist"; })[0];
var vague = sci.findings.filter(function (f) { return f.id === "vague"; })[0];
assert.strictEqual(hist.sev, "strong");
assert.strictEqual(vague.sev, "weak");

var mkt = E.analyze("Наше унікальне рішення відкриває нові горизонти. Це лише початок.", { genre: "marketing" });
assert.ok(mkt.findings.some(function (f) { return f.id === "buzz" && f.sev === "strong"; }), "маркетинг: ШІ-лексика сильна");
assert.ok(mkt.findings.some(function (f) { return f.id === "kicker"; }), "пафосний кінець");

/* 3. Позиції збігаються з текстом, фрагменти не перетинаються */
sci.findings.forEach(function (f, i) {
  assert.ok(f.start >= 0 && f.end > f.start && f.end <= SAMPLE.length, "межі в тексті");
  if (i) assert.ok(f.start >= sci.findings[i - 1].end, "без перетинів");
});
assert.ok(quotes(sci).some(function (q) { return /властиве й історії аналітичної філософії/.test(q); }));

/* 4. Спостереження про відсутність імен і посилань */
assert.ok(sci.notes.some(function (n) { return n.sev === "strong" && /немає жодного імені/.test(n.text); }));
var withNames = E.analyze(SAMPLE + "\nЯк писав Вітгенштейн у 1953 році, значення слова є його вживанням у мові, а Остін додав до цього мовленнєві акти.", { genre: "science" });
assert.ok(!withNames.notes.some(function (n) { return /немає жодного імені/.test(n.text); }), "є ім'я й рік");

/* 5. Нейтральний текст без патернів */
var clean = E.analyze("Кіт спить на підвіконні. Вранці він їв рибу. Потім пішов гуляти до річки.", { genre: "general" });
assert.strictEqual(clean.stats.findings, 0, "чистий текст: " + quotes(clean).join("|"));

/* 6. Порожній і короткий ввід не ламає рушій */
assert.doesNotThrow(function () { E.analyze("", {}); });
assert.doesNotThrow(function () { E.analyze("Слово", {}); });

/* 7. Зіставлення цитат моделі з позиціями */
var ext = E.analyze("Дослідники вважають, що це працює. Інше речення.", {
  genre: "general",
  external: [{ quote: "Дослідники вважають", category: "Без джерела", severity: "strong", what: "x", fix: "y", genre: "z" },
             { quote: "цитати немає в тексті", category: "k", severity: "weak" }]
});
assert.strictEqual(ext.findings.length, 1, "невідому цитату відкинуто");
assert.strictEqual(ext.findings[0].sev, "strong");

console.log("OK: " + sci.findings.length + " знахідок у прикладі, всі перевірки пройдено");
