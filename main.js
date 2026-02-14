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

    const radiusParam = qs.get('radius')
    const neighborsParam = qs.get('neighbors')

    let neighborRadius = 1

    if (radiusParam !== null) {
        neighborRadius = asInt(radiusParam, 1)
    } else if (neighborsParam !== null) {
        const neighbors = asInt(neighborsParam, 2)

        if (neighbors % 2 === 0) neighborRadius = Math.max(1, neighbors / 2)
        else neighborRadius = Math.max(1, neighbors)
    }

    neighborRadius = clamp(neighborRadius, 1, 10)

    return { neighborRadius, includeSelf }
}

const computeDraftOrder = ({ neighborRadius, includeSelf }, priorStandings, currentStandings) => {
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

const buildText = ({ neighborRadius, includeSelf }, order) => {
    const neighborsTotal = neighborRadius * 2
    const selfText = includeSelf ? ' + self' : ''
    const title = `Old Neighbors draft order (${neighborsTotal} neighbors${selfText})`

    let out = ''
    out += `${title}\n\n`

    let idx = 1
    for (const team of order) {
        out += `${idx}) ${team}\n`
        idx++
    }

    out += `\n`
    out += `The Wizards and the Jazz play each other two more times is all I'm saying.\n`

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
        '  neighbors=2 means 1 on each side\n' +
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

    const order = computeDraftOrder(config, priorStandings, currentStandings)
    const text = buildText(config, order)

    document.body.innerText = text

    const baseUrl = new URL(window.location.href)
    baseUrl.search = ''

    const links = buildExampleLinks(baseUrl.toString())
    document.body.appendChild(renderLinks(links))
}

main()
