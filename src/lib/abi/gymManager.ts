/**
 * ABI human-readable de GymManager (docs/SPEC.md §9.4).
 * Enum encodé en uint8 : ApplicationStatus { Pending, Accepted, Rejected, Cancelled }.
 */
const GYM =
  "tuple(uint256 id, address owner, string name, uint256 monthlyFee, uint256 affiliationFee, string metadataURI, bool active)";
const APPLICATION =
  "tuple(uint256 id, uint256 gymId, address coach, uint256 coachingPrice, uint256 amount, uint8 status, uint64 createdAt)";
const SUBSCRIPTION = "tuple(address coach, uint64 endTime)";

export const gymManagerAbi = [
  // --- Constante
  "function MONTH() view returns (uint256)",

  // --- Salles
  "function registerGym(string name, uint256 monthlyFee, uint256 affiliationFee, string metadataURI) returns (uint256)",
  "function updateGym(uint256 gymId, uint256 monthlyFee, uint256 affiliationFee, string metadataURI, bool active)",

  // --- Recrutement des coachs
  "function applyToGym(uint256 gymId, uint256 coachingPrice) returns (uint256)",
  "function acceptCoach(uint256 applicationId)",
  "function rejectCoach(uint256 applicationId)",
  "function cancelApplication(uint256 applicationId)",
  "function removeCoach(uint256 gymId, address coach)",
  "function setCoachingPrice(uint256 gymId, uint256 price)",

  // --- Abonnements
  "function subscribe(uint256 gymId, address coach, uint256 months)",

  // --- Lectures
  `function getGym(uint256 gymId) view returns (${GYM})`,
  "function getGymCount() view returns (uint256)",
  "function getGymsOf(address owner) view returns (uint256[])",
  "function getGymCoaches(uint256 gymId) view returns (address[] coaches, uint256[] prices)",
  "function isGymCoach(uint256 gymId, address coach) view returns (bool)",
  "function getCoachGyms(address coach) view returns (uint256[])",
  `function getApplication(uint256 applicationId) view returns (${APPLICATION})`,
  "function getApplicationsOfGym(uint256 gymId) view returns (uint256[])",
  "function getApplicationsOfCoach(address coach) view returns (uint256[])",
  "function quote(uint256 gymId, address coach, uint256 months) view returns (uint256 total, uint256 gymPart, uint256 coachPart)",
  `function getSubscription(address member, uint256 gymId) view returns (${SUBSCRIPTION})`,
  "function getMemberGyms(address member) view returns (uint256[])",
  "function isActiveMember(address member) view returns (bool)",

  // --- Événements
  "event GymRegistered(uint256 indexed gymId, address indexed owner, string name)",
  "event GymUpdated(uint256 indexed gymId, uint256 monthlyFee, uint256 affiliationFee, bool active)",
  "event CoachApplied(uint256 indexed applicationId, uint256 indexed gymId, address indexed coach, uint256 coachingPrice)",
  "event CoachAccepted(uint256 indexed applicationId, uint256 indexed gymId, address indexed coach)",
  "event CoachRejected(uint256 indexed applicationId)",
  "event ApplicationCancelled(uint256 indexed applicationId)",
  "event CoachRemoved(uint256 indexed gymId, address indexed coach)",
  "event CoachingPriceUpdated(uint256 indexed gymId, address indexed coach, uint256 price)",
  "event Subscribed(uint256 indexed gymId, address indexed member, address indexed coach, uint256 months, uint256 gymAmount, uint256 coachAmount, uint64 endTime)",
] as const;
