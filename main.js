/*
git note (assumptions + incremental fix)
- OG intent (as you clarified): treat PRIOR standings as a line segment (no wrap)
  - normally: your two nearest neighbors are one on each side
  - BUT at the ends: if you’re the worst team, you take #2 and #3 (both “up” the line)
    if you’re the best team, you take the two just below you
  - more generally with neighbors=2R: take R on each side, but if one side runs out, shift the “missing” neighbors to the other side
  - this matches “closest numbers on a line segment” and “always favor higher” at the low end (worst team)
- incremental change today: implement that boundary-shift rule for any radius, with no exception-paths or calling an “original” function
- also: sort is numeric by score (so you don’t get string-compare weirdness); this is consistent with the intent and with “Jazz at 4” expectation
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

    return { neighborRadius, includeSelf }
}

const buildOrderText = (order) => {
    let out = ''
    let idx = 1
    for (const team of order) {
        out += `${idx}) ${team}\n`
        idx++
    }
    return out
}

const buildExampleLinks = (baseUrl) => {
    const links = []

    const push = (params) => {
        const u = new URL(baseUrl)
        for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v))
        links.push(u.toString())
    }

    push({ neighbors: 2, self: 0 })
    push({ neighbors: 2, self: 1 })
    push({ neighbors: 4, self: 0 })
    push({ neighbors: 4, self: 1 })
    push({ neighbors: 6, self: 0 })
    push({ neighbors: 6, self: 1 })

    return links
}

const renderLinks = (urls) => {
    const container = document.createElement('div')

    const intro = document.createElement('div')
    intro.innerText = '\nTry other settings:\n'
    container.appendChild(intro)

    for (const url of urls) {
        const a = document.createElement('a')
        a.href = url
        a.innerText = url

        const line = document.createElement('div')
        line.appendChild(a)

        container.appendChild(line)
    }

    const notes = document.createElement('div')
    notes.innerText =
        '\nParams:\n' +
        '  neighbors=2 means 1 on each side, except ends shift inward (your rule)\n' +
        '  neighbors=4 means 2 on each side, except ends shift inward\n' +
        '  self=1 includes the team itself in the average\n' +
        '  radius=N is equivalent to neighbors=2N\n'
    container.appendChild(notes)

    return container
}

const main = async () => {
    const config = parseConfigFromQuery()

    const resp = await fetch('./standings.json', { cache: 'no-store' })
    if (!resp.ok) {
        document.body.innerText = `Failed to load standings.json (${resp.status})\n`
        return
    }

    const data = await resp.json()
    const CURRENT_STANDINGS = data.current_standings ?? []
    const PRIOR_STANDINGS = data.prior_standings ?? []

    const TEAMS = {}
    const n = PRIOR_STANDINGS.length

    let i = 0
    for (const team of PRIOR_STANDINGS) {
        // Want k neighbors total (no wrap). Start with R on each side,
        // then "shift" any missing neighbors to the other side.
        const R = config.neighborRadius
        const k = R * 2

        let left = R
        let right = R

        // If we're too close to the left end, move missing neighbors to the right
        if (i - left < 0) {
            const deficit = 0 - (i - left)
            left = i
            right = Math.min((n - 1) - i, right + deficit)
        }

        // If we're too close to the right end, move missing neighbors to the left
        if (i + right > n - 1) {
            const deficit = (i + right) - (n - 1)
            right = (n - 1) - i
            left = Math.min(i, left + deficit)
        }

        // Now collect exactly left + right neighbors around i (no wrap),
        // which will be k unless n is too small.
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
    const title = `Old Neighbors draft order (${neighborsTotal} neighbors${selfText})`

    let text = ''
    text += `${title}\n\n`
    text += `I like the idea of Old Neighbors:\n\n`
    text += `NBA draft order is determined by the average placing of the two teams whose placing was nearest yours the prior season, the team on either side, if possible. Standard tiebreakers apply.\n\n`
    text += `If implemented the current draft order (before traded picks because I'm lazy) would be:\n\n`
    text += buildOrderText(ORDERED_TEAMS)
    text += `\n`
    text += `The wizards and jazz pley each other two more times is all I'm saying.\n`

    document.body.innerText = text

    const baseUrl = new URL(window.location.href)
    baseUrl.search = ''

    const links = buildExampleLinks(baseUrl.toString())
    document.body.appendChild(renderLinks(links))
}

main()
