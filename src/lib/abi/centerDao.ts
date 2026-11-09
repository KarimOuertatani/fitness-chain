/**
 * ABI human-readable de CenterDAO (docs/SPEC.md §9.2).
 * Enums encodés en uint8 : ProposalType { Add, Remove }, ProposalStatus { Pending, Approved, Rejected, Executed }.
 */
export const centerDaoAbi = [
  // --- État public
  "function votingPeriod() view returns (uint256)",
  "function memberCount() view returns (uint256)",
  "function centers(address) view returns (string name, bool active, uint256 joinedAt)",
  "function hasVoted(uint256, address) view returns (bool)",

  // --- Fonctions
  "function proposeAdd(address candidate, string name) returns (uint256)",
  "function proposeRemove(address center) returns (uint256)",
  "function vote(uint256 id, bool support)",
  "function execute(uint256 id)",
  "function isActiveCenter(address account) view returns (bool)",
  "function getCenters() view returns (address[])",
  "function getProposal(uint256 id) view returns (tuple(uint8 pType, address candidate, string name, address proposer, uint256 yesVotes, uint256 noVotes, uint256 deadline, bool executed))",
  "function proposalStatus(uint256 id) view returns (uint8)",
  "function proposalCount() view returns (uint256)",

  // --- Événements
  "event CenterAdded(address indexed center, string name)",
  "event CenterRemoved(address indexed center)",
  "event ProposalCreated(uint256 indexed id, uint8 pType, address indexed candidate, address indexed proposer)",
  "event Voted(uint256 indexed id, address indexed voter, bool support)",
  "event ProposalExecuted(uint256 indexed id)",
] as const;
