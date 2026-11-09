/**
 * ABI human-readable de RewardManager (docs/SPEC.md §9.5).
 */
export const rewardManagerAbi = [
  // --- État public
  "function welcomeBonus() view returns (uint256)",
  "function dailyReward() view returns (uint256)",
  "function streakBonus() view returns (uint256)",
  "function streakLength() view returns (uint256)",

  // --- Fonctions
  "function claimWelcomeBonus()",
  "function claimDaily()",
  "function canClaimToday(address member) view returns (bool)",
  "function getStreak(address member) view returns (uint256)",
  "function nextClaimTime(address member) view returns (uint256)",
  "function getRewardInfo(address member) view returns (bool welcomeClaimed, uint256 lastClaimDay, uint256 streak, uint256 totalEarned)",

  // --- Événements
  "event WelcomeBonusClaimed(address indexed member, uint256 amount)",
  "event DailyRewardClaimed(address indexed member, uint256 day, uint256 streak, uint256 amount)",
  "event StreakBonusAwarded(address indexed member, uint256 streak, uint256 amount)",
] as const;
