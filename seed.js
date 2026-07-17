// seed.js — pokreni jednom sa "npm run seed" da napuniš bazu početnim sadržajem
const db = require('./db');

function count(table) {
  return db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
}

if (count('blog_posts') === 0) {
  const insert = db.prepare(`INSERT INTO blog_posts (title, category, excerpt, content, image_note, published) VALUES (?, ?, ?, ?, ?, 1)`);
  insert.run('Kad je tišina najbolja molitva', 'Molitva', 'Ponekad Bog najviše govori upravo kada ušutimo svoje srce...', 'Ponekad Bog najviše govori upravo kada ušutimo svoje srce. U žurbi svakodnevice lako zaboravimo da molitva nije samo govor, nego i slušanje.', 'Slika: svijeća i otvorena Biblija');
  insert.run('Vjera koja nosi kroz oluje', 'Svakodnevni život', 'Život donosi oluje, ali s Isusom nikada ne tonemo...', 'Život donosi oluje, ali s Isusom nikada ne tonemo. Svaka teška godina naučila me da vjera nije odsutnost straha, nego povjerenje usred njega.', 'Slika: šumska staza sa svjetlom');
  insert.run('Mali koraci, velika čuda', 'Milost', 'Bog ne traži savršenstvo, nego naše otvoreno srce...', 'Bog ne traži savršenstvo, nego naše otvoreno srce. Najmanji čin ljubavi može pokrenuti lanac milosti koji ne vidimo odmah.', 'Slika: ruke u obliku srca sa svijećom');
  console.log('Blog objave dodane.');
}

if (count('hodocasca') === 0) {
  const insert = db.prepare(`INSERT INTO hodocasca (title, location, date_range, description, image_note, published) VALUES (?, ?, ?, ?, ?, 1)`);
  insert.run('Međugorje', 'BiH', '15.-20. rujna 2026.', 'Šest dana molitve, mira i zajedništva u srcu duhovnosti Balkana.', 'Slika: Međugorje');
  insert.run('Fatima', 'Portugal', '3.-9. listopada 2026.', 'Putovanje tragovima Gospinih ukazanja i svjedočanstva djece pastira.', 'Slika: Fatima');
  insert.run('Lourdes', 'Francuska', '12.-17. veljače 2027.', 'Molitva uz izvor milosti i procesija svjetla koja diže dušu.', 'Slika: Lourdes');
  console.log('Hodočašća dodana.');
}

if (count('prayers') === 0) {
  const insert = db.prepare(`INSERT INTO prayers (name, message, anonymous, status, pray_count) VALUES (?, ?, ?, 'approved', ?)`);
  insert.run('', 'Molim za zdravlje moje majke koja se bori s bolešću.', 1, 48);
  insert.run('', 'Molim za mir u obitelji i pomirenje s bratom.', 1, 31);
  insert.run('Ana', 'Zahvaljujem za posao koji sam napokon dobila!', 0, 62);
  console.log('Molitvene nakane dodane.');
}

if (count('testimonies') === 0) {
  const insert = db.prepare(`INSERT INTO testimonies (name, email, story, status) VALUES (?, ?, ?, 'approved')`);
  insert.run('Ana, 34', '', 'Vratila mi je nadu kad sam je izgubila - nakon teške dijagnoze, molitva mi je vratila mir koji nisam znala da postoji.');
  insert.run('Marko i Ivana', '', 'Obitelj koju smo mislili da smo izgubili - deveternica koja je promijenila naš brak i vratila nas jedno drugome.');
  insert.run('Filip, 27', '', 'Poziv kojem sam godinama bježao - kako sam nakon dugog bijega konačno rekao Bogu da.');
  console.log('Svjedočanstva dodana.');
}

if (count('questions') === 0) {
  const insert = db.prepare(`INSERT INTO questions (name, question, answer, status, answered_at) VALUES (?, ?, ?, 'published', datetime('now'))`);
  insert.run('', 'Kako znam da je moja molitva uslišana?', 'Bog uvijek odgovara - ponekad s da, ponekad s ne, a ponekad s još ne. Odgovor ne mora izgledati onako kako smo zamislili.');
  insert.run('', 'Osjećam se krivom jer ne molim dovoljno. Što da radim?', 'Krivnja nije od Boga. Počnite iznova, bez optuživanja sebe - jedna kratka molitva danas je dovoljna za početak.');
  insert.run('', 'Je li u redu biti ljut na Boga?', 'Da. Bog može podnijeti naš bijes - psalmi su puni takvih iskrenih, gnjevnih molitava. Iskrenost je početak ozdravljenja.');
  console.log('Pitanja i odgovori dodani.');
}

console.log('Seed završen.');
