# OGame Advisor

Web app that tells an OGame player **what to upgrade next**, ranking every option by **payback time**: how many hours the extra production needs to repay the cost.

## Features
- Email login (Supabase Auth); every user only sees their own data (Row Level Security)
- First-run wizard: account, class, speed, plasma, officers, lifeform bonuses, resource values, planets
- Recommendations ranked by payback time, with energy included: if an upgrade needs more energy, the cheapest fix (solar satellites or solar plant levels) is added to its cost
- Energy deficits are flagged first, because they cut production on the whole planet
- "Done" button: updates the planet and re-ranks instantly
- Single HTML file, works on desktop and mobile

## How it works
| Part | File |
|---|---|
| Calculation engine (costs, production, energy, bonuses, ranking) | `src/engine.js` |
| User interface and Supabase calls | `src/app.html` |
| Build: inlines the engine into the page | `build.js` → `index.html` |
| Engine tests | `tests/engine.test.js` |

Resources are converted to metal-equivalent with the player's ratio (default 1 : 1.5 : 2.5), then:

```
payback (hours) = cost in metal-eq / extra production per hour in metal-eq
```

## Run
```
node tests/engine.test.js   # run the tests
node build.js               # build index.html
```
Deploy `index.html` on any static host (e.g. Netlify).

## Database (Supabase)
- `profiles`: one row per user (class, speed, technologies, officers, bonuses, resource values)
- `planets`: one row per planet (coordinates, temperature, building levels, satellites, in-game energy balance)

## Limits
Standard OGame formulas. Lifeform buildings and technologies are modelled only as percentage bonuses entered by the user; temporary items are ignored.
