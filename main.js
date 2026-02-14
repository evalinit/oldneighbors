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

const computeOriginalTwoNeighborScoreMap = (priorStandings, currentStandings) => {
    const teams = {}

    for (let i = 0; i < priorStandings.length; i++) {
        const team = priorStandings[i]

        let neighbor1, neighbor2

        if (i === 0) {
            neighbor1 = currentStandings.indexOf(priorStandings[1])
            neighbor2 = currentStandings.indexOf(priorStandings[2])
        } else if (i === priorStandings.length - 1) {
            neighbor1 = currentStandings.indexOf(priorStandings[priorStandings.length - 3])
            neighbor2 = currentStandings.indexOf(priorStandings[priorStandings.length - 2])
        } else {
            neighbor1 = currentStandings.indexOf(priorStandings[i - 1])
            neighbor2 = currentStandings.indexOf(priorStandings[i + 1])
        }

        teams[team] = (neighbor1 + neighbor2) / 2
    }

    return teams
}

const computeDraftOrderOriginalTwoNeighborRule = (priorStandings, currentStandings) => {
    const teams = computeOriginalTwoNeighborScoreMap(priorStandings, currentStandings)
    return Object.keys(teams).sort((a, b) => teams[a] - teams[b])
}

const computeDraftOrderRadiusRule = ({ neighborRadius, includeSelf }, priorStandings, currentStandings) => {
    if (neighborRadius === 1 && !includeSelf) {
        return computeDraftOrderOriginalTwoNeighborRule(priorStandings, currentStandings)
    }

    const teamsScore = {}

    for (let i = 0; i < priorStandings.length; i++) {
        const team = priorStandings[i]
        const indices = []

        const addIdx = (teamName) => {
            const idx = currentStandings.indexOf(teamName)
            if (idx !== -1) indices.push(idx)
        }

        for (let r = 1; r <= neighborRadius; r++) {
            if (i - r >= 0) addIdx(priorStandings[i - r])
            if (i + r <= priorStandings.length - 1) addIdx(priorStandings[i + r])
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
        '  neighbors=2 means 1 on each side (original rule)\n' +
        '  neighbors=4 means 2 on each side\n' +
        '  self=1 includes the team itself in the average\n'
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
    const currentStandings = data.current_standings ?? []
    const priorStandings = data.prior_standings ?? []

    const order = computeDraftOrderRadiusRule(config, priorStandings, currentStandings)

    const neighborsTotal = config.neighborRadius * 2
    const selfText = config.includeSelf ? ' + self' : ''
    const title = `Old Neighbors draft order (${neighborsTotal} neighbors${selfText})`

    let text = ''
    text += `${title}\n\n`
    text += buildOrderText(order)
    text += `\n`
    text += `The Wizards and the Jazz play each other two more times is all I'm saying.\n`

    document.body.innerText = text

    const baseUrl = new URL(window.location.href)
    baseUrl.search = ''

    const links = buildExampleLinks(baseUrl.toString())
    document.body.appendChild(renderLinks(links))
}

main()
