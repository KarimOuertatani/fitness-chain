// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Partie de FitCoin utilisée par RewardManager (RewardManager doit être minter).
interface IFitCoinMintable {
    function mint(address to, uint256 amount) external;
}

/// @notice Partie de GymManager utilisée par RewardManager.
interface IGymManager {
    function isActiveMember(address) external view returns (bool);
}

/**
 * @title RewardManager
 * @notice Récompenses en FitCoin des adhérents assidus : bonus de bienvenue, récompense
 *         quotidienne et bonus de série.
 * @dev Seuls les adhérents ayant un abonnement actif (GymManager.isActiveMember) peuvent
 *      réclamer, ce qui empêche de multiplier les faux comptes. Les FTC sont créés avec
 *      FitCoin.mint : RewardManager doit être déclaré minter de FitCoin.
 *      Un « jour » correspond à `block.timestamp / 1 days` (jour UTC).
 */
contract RewardManager {
    /* ------------------------------------------------------------------- État */

    /// @notice Bonus de bienvenue (une seule fois par adresse).
    uint256 public immutable welcomeBonus;

    /// @notice Récompense quotidienne.
    uint256 public immutable dailyReward;

    /// @notice Bonus versé à chaque série complète.
    uint256 public immutable streakBonus;

    /// @notice Nombre de jours consécutifs pour obtenir le bonus de série.
    uint256 public immutable streakLength;

    IFitCoinMintable private immutable _fitCoin;
    IGymManager private immutable _gymManager;

    /// @dev Récompenses d'un adhérent.
    struct MemberRewards {
        bool welcomeClaimed;
        bool hasClaimedDaily;
        uint256 lastClaimDay;
        uint256 streak;
        uint256 totalEarned;
    }

    mapping(address => MemberRewards) private _rewards;

    /* ------------------------------------------------------------- Événements */

    event WelcomeBonusClaimed(address indexed member, uint256 amount);
    event DailyRewardClaimed(address indexed member, uint256 day, uint256 streak, uint256 amount);
    event StreakBonusAwarded(address indexed member, uint256 streak, uint256 amount);

    /* -------------------------------------------------------------- Modifiers */

    /// @dev Réservé aux adhérents ayant un abonnement actif.
    modifier onlyActiveMember() {
        require(
            _gymManager.isActiveMember(msg.sender),
            unicode"RewardManager : un abonnement actif est requis pour être récompensé"
        );
        _;
    }

    /* ----------------------------------------------------------- Constructeur */

    /**
     * @param fitCoinAddress adresse de FitCoin
     * @param gymManagerAddress adresse de GymManager
     * @param _welcomeBonus bonus de bienvenue (18 décimales)
     * @param _dailyReward récompense quotidienne (18 décimales)
     * @param _streakBonus bonus de série (18 décimales)
     * @param _streakLength nombre de jours d'une série (> 0)
     */
    constructor(
        address fitCoinAddress,
        address gymManagerAddress,
        uint256 _welcomeBonus,
        uint256 _dailyReward,
        uint256 _streakBonus,
        uint256 _streakLength
    ) {
        require(fitCoinAddress != address(0), unicode"RewardManager : adresse de FitCoin nulle");
        require(gymManagerAddress != address(0), unicode"RewardManager : adresse de GymManager nulle");
        require(_streakLength > 0, unicode"RewardManager : la longueur de série doit être supérieure à 0");

        _fitCoin = IFitCoinMintable(fitCoinAddress);
        _gymManager = IGymManager(gymManagerAddress);
        welcomeBonus = _welcomeBonus;
        dailyReward = _dailyReward;
        streakBonus = _streakBonus;
        streakLength = _streakLength;
    }

    /* -------------------------------------------------------------- Réclamer */

    /// @notice Réclame le bonus de bienvenue (une seule fois par adresse).
    function claimWelcomeBonus() external onlyActiveMember {
        MemberRewards storage r = _rewards[msg.sender];
        require(!r.welcomeClaimed, unicode"RewardManager : bonus de bienvenue déjà réclamé");

        r.welcomeClaimed = true;
        r.totalEarned += welcomeBonus;

        _mint(msg.sender, welcomeBonus);
        emit WelcomeBonusClaimed(msg.sender, welcomeBonus);
    }

    /**
     * @notice Réclame la récompense du jour (une fois par jour).
     * @dev La série augmente de 1 si la dernière réclamation date d'hier, sinon elle repart à 1.
     *      Tous les `streakLength` jours consécutifs, `streakBonus` est versé en plus.
     */
    function claimDaily() external onlyActiveMember {
        MemberRewards storage r = _rewards[msg.sender];
        uint256 today = _today();
        require(!r.hasClaimedDaily || r.lastClaimDay < today, unicode"RewardManager : récompense du jour déjà réclamée");

        uint256 streak = (r.hasClaimedDaily && r.lastClaimDay == today - 1) ? r.streak + 1 : 1;
        r.hasClaimedDaily = true;
        r.lastClaimDay = today;
        r.streak = streak;

        uint256 bonus = streak % streakLength == 0 ? streakBonus : 0;
        uint256 amount = dailyReward + bonus;
        r.totalEarned += amount;

        _mint(msg.sender, amount);
        emit DailyRewardClaimed(msg.sender, today, streak, dailyReward);
        if (bonus > 0) {
            emit StreakBonusAwarded(msg.sender, streak, bonus);
        }
    }

    /* --------------------------------------------------------------- Lectures */

    /**
     * @notice Indique si l'adresse n'a pas encore réclamé la récompense aujourd'hui.
     * @dev Ne vérifie pas l'abonnement : voir GymManager.isActiveMember.
     */
    function canClaimToday(address member) external view returns (bool) {
        MemberRewards storage r = _rewards[member];
        return !r.hasClaimedDaily || r.lastClaimDay < _today();
    }

    /// @notice Série actuelle ; 0 si la série est cassée (dernière réclamation avant hier) ou jamais commencée.
    function getStreak(address member) public view returns (uint256) {
        MemberRewards storage r = _rewards[member];
        if (!r.hasClaimedDaily || r.lastClaimDay + 1 < _today()) return 0;
        return r.streak;
    }

    /// @notice Début du jour suivant la dernière réclamation (0 si jamais réclamé).
    function nextClaimTime(address member) external view returns (uint256) {
        MemberRewards storage r = _rewards[member];
        if (!r.hasClaimedDaily) return 0;
        return (r.lastClaimDay + 1) * 1 days;
    }

    /**
     * @notice Résumé des récompenses d'un adhérent (page /recompenses).
     * @return welcomeClaimed bonus de bienvenue déjà réclamé
     * @return lastClaimDay dernier jour réclamé (block.timestamp / 1 days), 0 si jamais
     * @return streak série actuelle (0 si cassée)
     * @return totalEarned total des FTC gagnés en récompenses
     */
    function getRewardInfo(
        address member
    ) external view returns (bool welcomeClaimed, uint256 lastClaimDay, uint256 streak, uint256 totalEarned) {
        MemberRewards storage r = _rewards[member];
        return (r.welcomeClaimed, r.lastClaimDay, getStreak(member), r.totalEarned);
    }

    /* ----------------------------------------------------------------- Interne */

    function _today() private view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function _mint(address to, uint256 amount) private {
        if (amount > 0) {
            _fitCoin.mint(to, amount);
        }
    }
}
