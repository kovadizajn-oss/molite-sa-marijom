# Molite sa Marijom — stranica + admin panel

Ovaj paket sadrži cijelu stranicu (javni dio) i admin panel preko kojeg se upravlja sadržajem: blog objave, hodočašća, molitvene nakane (SOS zid), svjedočanstva i pitanja.

## Što je unutra

```
site-app/
  server.js          <- pokreće cijeli sustav
  db.js               <- baza podataka (SQLite, fajl data.db)
  seed.js             <- početni primjer sadržaja
  routes/              <- API rute (blog, hodočašća, molitve, svjedočanstva, pitanja, prijava)
  middleware/          <- zaštita admin ruta
  public/               <- javna stranica (HTML/CSS, ono što posjetitelji vide)
  admin/                <- admin panel (/admin)
  data.db               <- baza podataka (kreira se automatski)
```

## Pokretanje lokalno (na svom računalu)

Potreban je [Node.js](https://nodejs.org) verzija 22.5 ili novija.

```bash
cd site-app
npm install
npm run seed      # samo prvi put - puni bazu s primjerom sadržaja
npm start
```

Zatim otvori:
- Javna stranica: **http://localhost:3000/**
- Admin panel: **http://localhost:3000/admin/**

### Prijava u admin panel

- Korisničko ime: `marija`
- Lozinka: `molitva123`

**Odmah nakon prve prijave promijeni lozinku** u Admin panel → Postavke.

## Što admin panel radi

- **Blog** — dodavanje, uređivanje i brisanje objava. Objave označene "Objavljeno" odmah se prikazuju na `/blog.html` i na naslovnici.
- **Hodočašća** — isto, za `/hodocasca.html`.
- **Molitveni zid** — sve poslane nakane (SOS zid) čekaju na pregled prije nego što se javno prikažu. Odobri, odbij ili obriši.
- **Svjedočanstva** — isto, za poslana svjedočanstva prije objave na `/svjedocanstva.html`.
- **Pitanja** — upiši odgovor i objavi ga da se prikaže na `/marija-odgovara.html`.

Sve forme na javnoj stranici (molitvena nakana, svjedočanstvo, pitanje) sada stvarno šalju podatke na server — više nema "uskoro će biti povezano".

## Hosting (kad budete spremni objaviti stranicu)

Preporuka: **[Render.com](https://render.com)** — ima besplatan plan koji podržava Node.js aplikacije.

Kratki koraci:

1. Stavi ovaj `site-app` folder na GitHub (kao repozitorij).
2. Na Render.com: **New → Web Service**, poveži GitHub repozitorij.
3. Postavke:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Dodaj environment varijablu `SESSION_SECRET` s nekim dugim nasumičnim nizom znakova (za sigurnost prijave).
5. Render će nakon svakog deploya dati javni URL (npr. `molite-sa-marijom.onrender.com`), a kasnije se može povezati vlastita domena (npr. molitesamarijom.hr) kroz Render postavke.

**Napomena o bazi podataka:** besplatni plan na Renderu briše lokalni disk pri svakom redeployu, što znači da bi `data.db` fajl (i sav sadržaj unesen kroz admin panel) mogao nestati kad se sljedeći put objavi nova verzija koda. Za produkciju se preporuča:
- Render "Persistent Disk" dodatak (mala mjesečna cijena), ili
- Migracija na Render PostgreSQL (besplatan tier dostupan) — javi se pa to zajedno riješimo kad budeš spremna za pravi launch.

Za sad, dok testiraš i navikavaš se na admin panel, potpuno je u redu koristiti SQLite lokalno ili na Renderu bez trajnog diska.

## Sigurnosne napomene

- Promijeni početnu lozinku odmah.
- `SESSION_SECRET` u `server.js` treba biti promijenjen u produkciji (postavlja se kao environment varijabla, ne piše se u kod).
- Sve poslane nakane, svjedočanstva i pitanja prolaze kroz pregled prije javne objave — ništa se ne objavljuje automatski.
