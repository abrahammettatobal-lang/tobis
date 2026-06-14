/**
 * @typedef {Object} Team
 * @property {string} name
 * @property {string} abbr
 * @property {number} goals
 * @property {string} flag
 * @property {string} badgeUrl
 */

/**
 * @typedef {'Por empezar' | 'En Vivo' | 'Finalizado'} MatchStatus
 */

/**
 * @typedef {Object} Match
 * @property {string} id
 * @property {Team} teamA
 * @property {Team} teamB
 * @property {string|null} minute
 * @property {MatchStatus} status
 * @property {string} kickoffTime
 * @property {string} kickoffDate
 * @property {string} stage
 * @property {string} venue
 * @property {string} youtubeQuery
 * @property {string} livescoreUrl
 */

/**
 * @typedef {Object} MatchesCache
 * @property {Match[]} matches
 * @property {string} lastUpdated
 * @property {string} source
 * @property {boolean} stale
 */

export {};
