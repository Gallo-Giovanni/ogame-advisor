# OGame Advisor

Web app that tells an OGame player **what to upgrade next**, ranking every option by **payback time**: how many hours the extra production needs to repay the cost.

## Features
- Email login (Supabase Auth); every user only sees their own data (Row Level Security)
- First-run wizard: account, class, speed, plasma, officers, lifeform bonuses, resource values, planets
- Recommendations ranked by payback time, with energy included: if an upgrade needs more energy, the cheapest fix (solar satellites or solar plant levels) is added to its cost
- Per-planet item boosters (metal, crystal, deuterium, energy %); the player chooses whether rankings count them, since items expire and upgrades don't
- New colony option: Astrophysics levels actually needed for one more planet, colony ship, mines up to the empire average and the energy to run them, compared with the output of an average planet
- "Stop at level" caps for each mine, Plasma and Astrophysics: capped upgrades are never suggested
- Energy deficits are flagged first, because they cut production on the whole planet
- "Done" button: updates the planet and re-ranks instantly
- "What's new" popup: each user sees the updates released since their last visit; the full list is always available
- Single HTML file, works on desktop and mobile

## How it works
| Part | File |
|---|---|
| Calculation engine (costs, production, energy, bonuses, ranking) | `src/engine.js` |
| User interface and Supabase calls | `src/app.html` |
| App updates shown to users | `src/changelog.js` |
| Build: inlines engine and changelog into the page | `build.js` → `index.html` |
| Engine tests, incl. a check against real game numbers | `tests/engine.test.js`, `tests/betulla.test.js` |

Resources are converted to metal-equivalent with the player's ratio (default 1 : 1.5 : 2.5), then:

```
payback (hours) = cost in metal-eq / extra production per hour in metal-eq
```

## Run
```
node tests/engine.test.js      # engine tests
node tests/betulla.test.js     # engine vs real game numbers
node tests/changelog.test.js   # changelog checks
node build.js               # build index.html
```
Deploy `index.html` on any static host (e.g. Netlify).

## Publishing an update
Add an entry at the top of `src/changelog.js` with the next `id`, a date, a title and a short description, then rebuild. Each user stores the last id they have seen (`profiles.last_seen_update`) and is shown every entry with a higher id at their next login. Never renumber existing entries.

## Database (Supabase)
- `profiles`: one row per user (class, speed, technologies, officers, bonuses, resource values)
- `planets`: one row per planet (coordinates, temperature, building levels, satellites, in-game energy balance)

## Accuracy
`tests/betulla.test.js` reproduces a real in-game "Impostazioni risorse" page (metal, crystal, deuterium and energy per hour) within a few units. Bonus stacking follows the game: the position bonus multiplies the mine's base output, and every other bonus (plasma, officers, class, Trader alliance, lifeforms, items) is a percentage of that value.

## Limits
Lifeform buildings and technologies are entered as one percentage per resource (an in-app calculator derives it from the game page), so planets with very different lifeform buildings are approximated by the same value.
