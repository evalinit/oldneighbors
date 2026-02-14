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
