/*
daily update note (what i changed today - 2026-02-17)
- added query arg trades=1|0 (default 0)
  - trades=1: show traded-pick owners using picks_2026.json snapshot by record slot
  - trades=0: ignore picks_2026.json and show "before traded picks"
- made example links descriptive (not just raw urls)
- fixed params footer text (radius line had an extra character in the sample output)

next improvements to do on another day:
- show a short legend line when trades=1:
  "trades are applied by current record slot using picks_2026.json (tankathon snapshot)"
- optionally include a per-line marker for protected/conditional picks when present in picks_2026.json
- add trades examples for radius too, not just neighbors/self
*/

const asInt = (v, fallback) => {
    const n = Number.parseInt(String(v ?? ''), 10)
    return Number.isFinite(n) ? n : fallback
}

const asBool = (v, fallback) => {
    if (v === null || v === undefined) return fallback
    const s = String(v).toLowerCase()
    if (s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === 'on') return true
    if (s === '0' || s === 'false' || s === 'no' || s === 'n' || s === 'off') return false
    return fallback
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

const parseConfigFromQuery = () => {
    const qs = new URLSearchParams(window.location.search)

    const includeSelf = asBool(qs.get('self'), false)
    const includeTrades = asBool(qs.get('trades'), false)

    const neighborsParam = qs.get('neighbors')
    const radiusParam = qs.get('radius')

    let neighborRadius = 1

    if (radiusParam !== null) {
        neighborRadius = asInt(radiusParam, 1)
    } else if (neighborsParam !== null) {
        const neighbors = asInt(neighborsParam, 2)
        neighborRadius = Math.max(1, Math.floor(neighbors / 2))
    }

    neighborRadius = clamp(neighborRadius, 1, 10)

    return { neighborRadius, includeSelf, includeTrades }
}

const buildOrderText = (order, currentStandings, picksBySlot, includeTrades) => {
    let out = ''
    let idx = 1

    for (const originalTeam of order) {
        if (!includeTrades) {
            out += `${idx}) ${originalTeam}\n`
            idx++
            continue
        }

        const slot = currentStandings.indexOf(originalTeam) + 1
        const pick = picksBySlot[String(slot)] ?? null

        if (pick && pick.owner && pick.original) {
            if (pick.owner !== pick.original) out += `${idx}) ${pick.owner} (from ${pick.original})\n`
            else out += `${idx}) ${pick.original}\n`
        } else {
            out += `${idx}) ${originalTeam}\n`
        }

        idx++
    }

    return out
}

const buildExampleLinks = (baseUrl) => {
    const links = []

    const make = (label, params) => {
        const u = new URL(baseUrl)
        for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v))
        links.push({ label, url: u.toString() })
    }

    make('2 neighbors, exclude self, include trades', { neighbors: 2, self: 0, trades: 1 })
    make('2 neighbors, include self, include trades', { neighbors: 2, self: 1, trades: 1 })
    make('4 neighbors, exclude self, include trades', { neighbors: 4, self: 0, trades: 1 })
    make('4 neighbors, include self, include trades', { neighbors: 4, self: 1, trades: 1 })
    make('6 neighbors, exclude self, include trades', { neighbors: 6, self: 0, trades: 1 })
    make('6 neighbors, include self, include trades', { neighbors: 6, self: 1, trades: 1 })

    make('2 neighbors, exclude self, no trades', { neighbors: 2, self: 0, trades: 0 })
    make('2 neighbors, include self, no trades', { neighbors: 2, self: 1, trades: 0 })

    return links
}

const renderLinks = (items) => {
    const container = document.createElement('div')

    const intro = document.createElement('div')
    intro.innerText = '\nTry other settings:\n'
    container.appendChild(intro)

    for (const item of items) {
        const line = document.createElement('div')

        const a = document.createElement('a')
        a.href = item.url
        a.innerText = item.label

        const urlSpan = document.createElement('span')
        urlSpan.innerText = `\n${item.url}`

        line.appendChild(a)
        line.appendChild(document.createElement('br'))
        line.appendChild(urlSpan)

        container.appendChild(line)
        container.appendChild(document.createElement('br'))
    }

    const notes = document.createElement('div')
    notes.innerText =
        'Params:\n' +
        '  neighbors=2 means 1 on each side, except ends shift inward\n' +
        '  neighbors=4 means 2 on each side, except ends shift inward\n' +
        '  self=1 includes the team itself in the average\n' +
        '  radius=N is equivalent to neighbors=2N\n' +
        '  trades=1 includes traded picks (default)\n' +
        '  trades=0 ignores traded picks\n'
    container.appendChild(notes)

    return container
}

const main = async () => {
    const config = parseConfigFromQuery()

    const standingsResp = await fetch('./standings.json', { cache: 'no-store' })
    if (!standingsResp.ok) {
        document.body.innerText = `Failed to load standings.json (${standingsResp.status})\n`
        return
    }

    let PICKS_BY_SLOT = {}
    if (config.includeTrades) {
        const picksResp = await fetch('./picks_2026.json', { cache: 'no-store' })
        if (!picksResp.ok) {
            document.body.innerText = `Failed to load picks_2026.json (${picksResp.status})\n`
            return
        }
        const picksData = await picksResp.json()
        PICKS_BY_SLOT = picksData.first_round_by_record_slot ?? {}
    }

    const standingsData = await standingsResp.json()
    const CURRENT_STANDINGS = standingsData.current_standings ?? []
    const PRIOR_STANDINGS = standingsData.prior_standings ?? []

    const TEAMS = {}
    const n = PRIOR_STANDINGS.length

    let i = 0
    for (const team of PRIOR_STANDINGS) {
        const R = config.neighborRadius

        let left = R
        let right = R

        if (i - left < 0) {
            const deficit = 0 - (i - left)
            left = i
            right = Math.min((n - 1) - i, right + deficit)
        }

        if (i + right > n - 1) {
            const deficit = (i + right) - (n - 1)
            right = (n - 1) - i
            left = Math.min(i, left + deficit)
        }

        const indices = []

        const addIdx = (teamName) => {
            const idx = CURRENT_STANDINGS.indexOf(teamName)
            if (idx !== -1) indices.push(idx)
        }

        for (let j = i - left; j <= i - 1; j++) addIdx(PRIOR_STANDINGS[j])
        for (let j = i + 1; j <= i + right; j++) addIdx(PRIOR_STANDINGS[j])

        if (config.includeSelf) addIdx(team)

        if (!indices.length) {
            TEAMS[team] = Number.POSITIVE_INFINITY
            i++
            continue
        }

        const sum = indices.reduce((a, b) => a + b, 0)
        TEAMS[team] = sum / indices.length

        i++
    }

    const ORDERED_TEAMS = Object.keys(TEAMS).sort((a, b) => TEAMS[a] - TEAMS[b])

    const neighborsTotal = config.neighborRadius * 2
    const selfText = config.includeSelf ? ' + self' : ''
    const tradesText = config.includeTrades ? ' (including traded picks)' : ' (before traded picks)'

    let text = ''
    text += `I like the idea of Old Neighbors:\n\n`
    text += `NBA draft order is determined by the average placing of the teams whose placing was nearest yours the prior season, on either side, if possible. Standard tiebreakers apply.\n\n`
    text += `Current Settings: ${neighborsTotal} neighbors${selfText}\n\n`
    text += `If implemented the current draft order${tradesText} would be:\n\n`
    text += buildOrderText(ORDERED_TEAMS, CURRENT_STANDINGS, PICKS_BY_SLOT, config.includeTrades)
    text += `\n`
    text += `The wizards and jazz play each other two more times is all I'm saying.\n`

    document.body.innerText = text

    const baseUrl = new URL(window.location.href)
    baseUrl.search = ''

    const links = buildExampleLinks(baseUrl.toString())
    document.body.appendChild(renderLinks(links))
}

main()
