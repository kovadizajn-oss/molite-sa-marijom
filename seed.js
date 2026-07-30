// seed.js — pokreni jednom lokalno ("npm run seed") da napuniš bazu početnim sadržajem
const db = require('./db');

async function count(table) {
  const { rows } = await db.query(`SELECT COUNT(*)::int as c FROM ${table}`);
  return rows[0].c;
}

async function main() {
  await db.ready();

  if ((await count('blog_posts')) === 0) {
    const insert = (title, category, excerpt, content, image_note) =>
      db.query(
        `INSERT INTO blog_posts (title, category, excerpt, content, image_note, published) VALUES ($1,$2,$3,$4,$5,1)`,
        [title, category, excerpt, content, image_note]
      );
    await insert('Kad je tišina najbolja molitva', 'Molitva', 'Ponekad Bog najviše govori upravo kada ušutimo svoje srce...', 'Ponekad Bog najviše govori upravo kada ušutimo svoje srce. U žurbi svakodnevice lako zaboravimo da molitva nije samo govor, nego i slušanje.', 'Slika: svijeća i otvorena Biblija');
    await insert('Vjera koja nosi kroz oluje', 'Svakodnevni život', 'Život donosi oluje, ali s Isusom nikada ne tonemo...', 'Život donosi oluje, ali s Isusom nikada ne tonemo. Svaka teška godina naučila me da vjera nije odsutnost straha, nego povjerenje usred njega.', 'Slika: šumska staza sa svjetlom');
    await insert('Mali koraci, velika čuda', 'Milost', 'Bog ne traži savršenstvo, nego naše otvoreno srce...', 'Bog ne traži savršenstvo, nego naše otvoreno srce. Najmanji čin ljubavi može pokrenuti lanac milosti koji ne vidimo odmah.', 'Slika: ruke u obliku srca sa svijećom');
    console.log('Blog objave dodane.');
  }

  if ((await count('hodocasca')) === 0) {
    const insert = (title, location, date_range, description, image_note) =>
      db.query(
        `INSERT INTO hodocasca (title, location, date_range, description, image_note, published) VALUES ($1,$2,$3,$4,$5,1)`,
        [title, location, date_range, description, image_note]
      );
    await insert('Međugorje', 'BiH', '15.-20. rujna 2026.', 'Šest dana molitve, mira i zajedništva u srcu duhovnosti Balkana.', 'Slika: Međugorje');
    await insert('Fatima', 'Portugal', '3.-9. listopada 2026.', 'Putovanje tragovima Gospinih ukazanja i svjedočanstva djece pastira.', 'Slika: Fatima');
    await insert('Lourdes', 'Francuska', '12.-17. veljače 2027.', 'Molitva uz izvor milosti i procesija svjetla koja diže dušu.', 'Slika: Lourdes');
    console.log('Hodočašća dodana.');
  }

  if ((await count('prayers')) === 0) {
    const insert = (name, message, anonymous, pray_count) =>
      db.query(
        `INSERT INTO prayers (name, message, anonymous, status, pray_count) VALUES ($1,$2,$3,'approved',$4)`,
        [name, message, anonymous, pray_count]
      );
    await insert('', 'Molim za zdravlje moje majke koja se bori s bolešću.', 1, 48);
    await insert('', 'Molim za mir u obitelji i pomirenje s bratom.', 1, 31);
    await insert('Ana', 'Zahvaljujem za posao koji sam napokon dobila!', 0, 62);
    console.log('Molitvene nakane dodane.');
  }

  if ((await count('testimonies')) === 0) {
    const insert = (name, email, story) =>
      db.query(`INSERT INTO testimonies (name, email, story, status) VALUES ($1,$2,$3,'approved')`, [name, email, story]);
    await insert('Ana, 34', '', 'Vratila mi je nadu kad sam je izgubila - nakon teške dijagnoze, molitva mi je vratila mir koji nisam znala da postoji.');
    await insert('Marko i Ivana', '', 'Obitelj koju smo mislili da smo izgubili - deveternica koja je promijenila naš brak i vratila nas jedno drugome.');
    await insert('Filip, 27', '', 'Poziv kojem sam godinama bježao - kako sam nakon dugog bijega konačno rekao Bogu da.');
    console.log('Svjedočanstva dodana.');
  }

  if ((await count('questions')) === 0) {
    const insert = (question, answer) =>
      db.query(
        `INSERT INTO questions (name, question, answer, status, answered_at) VALUES ('',$1,$2,'published',NOW())`,
        [question, answer]
      );
    await insert('Kako znam da je moja molitva uslišana?', 'Bog uvijek odgovara - ponekad s da, ponekad s ne, a ponekad s još ne. Odgovor ne mora izgledati onako kako smo zamislili.');
    await insert('Osjećam se krivom jer ne molim dovoljno. Što da radim?', 'Krivnja nije od Boga. Počnite iznova, bez optuživanja sebe - jedna kratka molitva danas je dovoljna za početak.');
    await insert('Je li u redu biti ljut na Boga?', 'Da. Bog može podnijeti naš bijes - psalmi su puni takvih iskrenih, gnjevnih molitava. Iskrenost je početak ozdravljenja.');
    console.log('Pitanja i odgovori dodani.');
  }

  console.log('Seed završen.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
