const CURRENT_STANDINGS = [
    'Sacramento Kings',
    'Washington Wizards',
    'New Orleans Pelicans',
    'Indiana Pacers',
    'Brooklyn Nets',
    'Utah Jazz',
    'Dallas Mavericks',
    'Memphis Grizzlies',
    'Milwaukee Bucks',
    'Chicago Bulls',
    'Atlanta Hawks',
    'Charlotte Hornets',
    'Los Angeles Clippers',
    'Portland Trail Blazers',
    'Miami Heat',
    'Golden State Warriors',
    'Orlando Magic',
    'Philadelphia 76ers',
    'Phoenix Suns',
    'Toronto Raptors',
    'Minnesota Timberwolves',
    'Los Angeles Lakers',
    'Cleveland Cavaliers',
    'Houston Rockets',
    'Denver Nuggets',
    'New York Knicks',
    'Boston Celtics',
    'San Antonio Spurs',
    'Oklahoma City Thunder',
    'Detroit Pistons',
]

const PRIOR_STANDINGS = [
    'Utah Jazz',
    'Washington Wizards',
    'Charlotte Hornets',
    'New Orleans Pelicans',
    'Philadelphia 76ers',
    'Brooklyn Nets',
    'Toronto Raptors',
    'San Antonio Spurs',
    'Phoenix Suns',
    'Portland Trail Blazers',
    'Miami Heat',
    'Chicago Bulls',
    'Dallas Mavericks',
    'Atlanta Hawks',
    'Sacramento Kings',
    'Orlando Magic',
    'Detroit Pistons',
    'Golden State Warriors',
    'Memphis Grizzlies',
    'Milwaukee Bucks',
    'Minnesota Timberwolves',
    'Denver Nuggets',
    'Indiana Pacers',
    'Los Angeles Clippers',
    'Los Angeles Lakers',
    'New York Knicks',
    'Houston Rockets',
    'Boston Celtics',
    'Cleveland Cavaliers',
    'Oklahoma City Thunder',
]

const TEAMS = {}

let teamIdx = 0
for (const team of PRIOR_STANDINGS) {
    let neighbor1, neighbor2
    if (teamIdx == 0) {
        neighbor1 = CURRENT_STANDINGS.indexOf(PRIOR_STANDINGS[1])
        neighbor2 = CURRENT_STANDINGS.indexOf(PRIOR_STANDINGS[2])
    } else if (teamIdx == 29) {
        neighbor1 = CURRENT_STANDINGS.indexOf(PRIOR_STANDINGS[27])
        neighbor2 = CURRENT_STANDINGS.indexOf(PRIOR_STANDINGS[28]) 
    } else {
        neighbor1 = CURRENT_STANDINGS.indexOf(PRIOR_STANDINGS[teamIdx - 1])
        neighbor2 = CURRENT_STANDINGS.indexOf(PRIOR_STANDINGS[teamIdx + 1])
    }
    TEAMS[team] = (neighbor1 + neighbor2) / 2
    teamIdx++
}

const ORDERED_TEAMS = Object.keys(TEAMS).sort((a, b) => TEAMS[a] - TEAMS[b])

let CURRENT_DRAFT_ORDER = ''

teamIdx = 1
for (const team of ORDERED_TEAMS) {
    let teamString = `${teamIdx}) ${team}\n`
    CURRENT_DRAFT_ORDER += teamString
    teamIdx++
}

const TEXT = `
I like the idea of Old Neighbors:

NBA draft order is determined by the average placing of the two teams whose placing was nearest yours the prior season, the team on either side, if possible. Standard tiebreakers apply.

If implemented the current draft order (before traded picks because I'm lazy) would be:

${CURRENT_DRAFT_ORDER}
The wizards and the jazz play each other two more times is all I'm saying.
`

document.body.innerText = TEXT


// ---- no-CORS schedule: hand-made JSON you can edit ----
const SCHEDULE_JSON = {
    leagueSchedule: {
        gameDates: [
            {
                gameDate: '2026-02-20',
                games: [
                    { gameDateTimeUTC: '2026-02-21T00:30:00Z', away: 'Washington Wizards', home: 'Utah Jazz' },
                    { gameDateTimeUTC: '2026-02-21T03:00:00Z', away: 'Charlotte Hornets', home: 'New Orleans Pelicans' },
                ],
            },
            {
                gameDate: '2026-02-23',
                games: [
                    { gameDateTimeUTC: '2026-02-24T01:00:00Z', away: 'Utah Jazz', home: 'Washington Wizards' },
                    { gameDateTimeUTC: '2026-02-24T00:30:00Z', away: 'Brooklyn Nets', home: 'Philadelphia 76ers' },
                ],
            },
            {
                gameDate: '2026-02-26',
                games: [
                    { gameDateTimeUTC: '2026-02-27T01:00:00Z', away: 'Toronto Raptors', home: 'San Antonio Spurs' },
                    { gameDateTimeUTC: '2026-02-27T03:00:00Z', away: 'Phoenix Suns', home: 'Portland Trail Blazers' },
                ],
            },
            {
                gameDate: '2026-03-01',
                games: [
                    { gameDateTimeUTC: '2026-03-02T00:00:00Z', away: 'Miami Heat', home: 'Chicago Bulls' },
                    { gameDateTimeUTC: '2026-03-02T01:30:00Z', away: 'Dallas Mavericks', home: 'Atlanta Hawks' },
                ],
            },
            {
                gameDate: '2026-03-05',
                games: [
                    { gameDateTimeUTC: '2026-03-06T03:00:00Z', away: 'Sacramento Kings', home: 'Orlando Magic' },
                    { gameDateTimeUTC: '2026-03-06T00:30:00Z', away: 'Memphis Grizzlies', home: 'Milwaukee Bucks' },
                ],
            },
        ],
    },
}


// ---- everything below stays focused on schedule ranking under the ORIGINAL formula ----
;(() => {
    const fmtDate = (iso) => {
        const d = new Date(iso)
        if (Number.isNaN(d.getTime())) return iso
        return d.toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        })
    }

    const buildOldNeighborPairs = () => {
        const set = new Set()
        for (let i = 0; i < PRIOR_STANDINGS.length - 1; i++) {
            const a = PRIOR_STANDINGS[i]
            const b = PRIOR_STANDINGS[i + 1]
            set.add(`${a}|||${b}`)
            set.add(`${b}|||${a}`)
        }
        return set
    }

    const computeDraftOrder = ({ neighborRadius, includeSelf }, currentStandings) => {
        const teamsScore = {}

        for (let i = 0; i < PRIOR_STANDINGS.length; i++) {
            const team = PRIOR_STANDINGS[i]
            const indices = []

            const addIdx = (teamName) => {
                const idx = currentStandings.indexOf(teamName)
                if (idx !== -1) indices.push(idx)
            }

            for (let r = 1; r <= neighborRadius; r++) {
                if (i - r >= 0) addIdx(PRIOR_STANDINGS[i - r])
                if (i + r <= 29) addIdx(PRIOR_STANDINGS[i + r])
            }

            if (includeSelf) addIdx(team)

            if (!indices.length) {
                teamsScore[team] = Number.POSITIVE_INFINITY
                continue
            }

            const sum = indices.reduce((a, b) => a + b, 0)
            teamsScore[team] = sum / indices.length
        }

        return Object.keys(teamsScore).sort((a, b) => teamsScore[a] - teamsScore[b])
    }

    const computeDraftOrderText = (title, config) => {
        const order = computeDraftOrder(config, CURRENT_STANDINGS)

        let out = `\n\n${title}\n\n`
        let idx = 1
        for (const team of order) {
            out += `${idx}) ${team}\n`
            idx++
        }
        return out
    }

    const forceWinnerBetter = (standings, winner, loser) => {
        const s = standings.slice()
        const iw = s.indexOf(winner)
        const il = s.indexOf(loser)
        if (iw === -1 || il === -1) return s

        if (iw > il) return s

        s[iw] = loser
        s[il] = winner
        return s
    }

    const computeOriginalTeamsScoreMap = (currentStandings) => {
        const teams = {}
        for (let i = 0; i < PRIOR_STANDINGS.length; i++) {
            const team = PRIOR_STANDINGS[i]
            let neighbor1, neighbor2
            if (i === 0) {
                neighbor1 = currentStandings.indexOf(PRIOR_STANDINGS[1])
                neighbor2 = currentStandings.indexOf(PRIOR_STANDINGS[2])
            } else if (i === 29) {
                neighbor1 = currentStandings.indexOf(PRIOR_STANDINGS[27])
                neighbor2 = currentStandings.indexOf(PRIOR_STANDINGS[28])
            } else {
                neighbor1 = currentStandings.indexOf(PRIOR_STANDINGS[i - 1])
                neighbor2 = currentStandings.indexOf(PRIOR_STANDINGS[i + 1])
            }
            teams[team] = (neighbor1 + neighbor2) / 2
        }
        return teams
    }

    const computeOriginalDraftOrder = (currentStandings) => {
        const teams = computeOriginalTeamsScoreMap(currentStandings)
        return Object.keys(teams).sort((a, b) => teams[a] - teams[b])
    }

    const topNChangeScore = (baselineOrder, newOrder, n) => {
        const baseTop = baselineOrder.slice(0, n)
        const newTop = newOrder.slice(0, n)

        const basePos = new Map()
        baselineOrder.forEach((t, i) => basePos.set(t, i))

        const newPos = new Map()
        newOrder.forEach((t, i) => newPos.set(t, i))

        const union = new Set([...baseTop, ...newTop])

        let score = 0
        for (const t of union) {
            score += Math.abs((basePos.get(t) ?? 999) - (newPos.get(t) ?? 999))
        }

        const changes = []
        for (let i = 0; i < n; i++) {
            if (baseTop[i] !== newTop[i]) changes.push([i + 1, baseTop[i], newTop[i]])
        }

        return { score, changes }
    }

    const interestingnessForGameOriginalRule = (standings, baselineOrder, n, away, home) => {
        const orderAwayWin = computeOriginalDraftOrder(forceWinnerBetter(standings, away, home))
        const orderHomeWin = computeOriginalDraftOrder(forceWinnerBetter(standings, home, away))

        const a = topNChangeScore(baselineOrder, orderAwayWin, n)
        const b = topNChangeScore(baselineOrder, orderHomeWin, n)

        if (a.score >= b.score) return { bestOutcome: `${away} win`, score: a.score, changes: a.changes }
        return { bestOutcome: `${home} win`, score: b.score, changes: b.changes }
    }

    const flattenSchedule = () => {
        const now = new Date()
        const games = []
        const gameDates = SCHEDULE_JSON?.leagueSchedule?.gameDates ?? []

        for (const gd of gameDates) {
            for (const g of (gd.games ?? [])) {
                const iso = g.gameDateTimeUTC
                const when = new Date(iso)
                if (!iso || Number.isNaN(when.getTime())) continue
                if (when < now) continue

                games.push({
                    whenIso: iso,
                    whenPretty: fmtDate(iso),
                    away: g.away,
                    home: g.home,
                })
            }
        }

        return games
    }

    const renderTopGamesOriginalRule = (games, topN) => {
        const n = 6
        const baselineOrder = computeOriginalDraftOrder(CURRENT_STANDINGS)

        const scored = games.map((g) => {
            const stake = interestingnessForGameOriginalRule(CURRENT_STANDINGS, baselineOrder, n, g.away, g.home)
            return {
                ...g,
                stakeScore: stake.score,
                bestOutcome: stake.bestOutcome,
                changes: stake.changes,
            }
        })

        scored.sort((a, b) => b.stakeScore - a.stakeScore)

        let out = `\n\n10 most interesting Old Neighbor games remaining (your current rule: 2 neighbors)\n\n`
        const top = scored.slice(0, topN)

        if (!top.length) {
            out += 'No games in the embedded schedule matched Old Neighbors.\n'
            return out
        }

        let i = 1
        for (const g of top) {
            out += `${i}) ${g.whenPretty} — ${g.away} @ ${g.home}\n`
            out += `    top-6 stake: ${g.stakeScore.toFixed(1)} (most chaos if ${g.bestOutcome})\n`
            if (g.changes.length) {
                out += `    what changes in top-6 (examples):\n`
                for (const [slot, from, to] of g.changes.slice(0, 4)) {
                    out += `        #${slot}: ${from} -> ${to}\n`
                }
            } else {
                out += `    what changes in top-6: none\n`
            }
            i++
        }

        return out
    }

    const main = () => {
        const oldNeighbors = buildOldNeighborPairs()
        const scheduleGames = flattenSchedule()

        const games = scheduleGames.filter((g) => {
            if (CURRENT_STANDINGS.indexOf(g.away) === -1) return false
            if (CURRENT_STANDINGS.indexOf(g.home) === -1) return false
            if (PRIOR_STANDINGS.indexOf(g.away) === -1) return false
            if (PRIOR_STANDINGS.indexOf(g.home) === -1) return false
            return oldNeighbors.has(`${g.away}|||${g.home}`)
        })

        document.body.innerText += '\n\nBelow: “what games matter” (ranked) under the ORIGINAL 2-neighbor rule\n'
        document.body.innerText += renderTopGamesOriginalRule(games, 10)

        // After the schedule stuff, show full draft orders under smoother variants
        document.body.innerText += '\n\n---\n'
        document.body.innerText += computeDraftOrderText(
            'Draft order if you use the 4 closest neighbors (two on each side)',
            { neighborRadius: 2, includeSelf: false }
        )

        document.body.innerText += '\n\n---\n'
        document.body.innerText += computeDraftOrderText(
            'Draft order if you use the 4 closest neighbors plus your own record (4 neighbors + self)',
            { neighborRadius: 2, includeSelf: true }
        )

        document.body.innerText += '\n And none of these teams would have incentive to lose.'
    }

    main()
})()
