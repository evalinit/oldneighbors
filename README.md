# Old Neighbors

Forgive me for using the following ChatGPT prompt:
haha i wanted to paste my code. nba teams obviously. keep the code exacltly the same if you think it will work

const CURRENT_STANDINGS = [

]

const PRIOR_STANDINGS = [

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

const ORDERED_TEAMS = Object.keys(TEAMS).sort((a, b) => TEAMS[a].localeCompare(TEAMS[b]))

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
`

document.body.innerText = TEXT