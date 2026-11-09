/**
 * ABI human-readable de CoachCertificate (docs/SPEC.md §9.3).
 * ERC721URIStorage + ReentrancyGuard, Soulbound (ERC-5192).
 * Enums encodés en uint8 :
 *   RequestStatus { Pending, Accepted, Rejected, Cancelled, Completed }
 *   CertStatus { NotFound, Valid, Revoked, Expired, IssuerRemoved }
 */
const TRAINING =
  "tuple(uint256 id, address center, string title, uint256 price, uint32 durationDays, uint32 validityDays, string metadataURI, bool active)";
const TRAINING_REQUEST =
  "tuple(uint256 id, uint256 trainingId, address coach, address center, uint256 amount, uint8 status, uint64 createdAt)";
const CERTIFICATE =
  "tuple(uint256 id, address coach, address issuer, uint256 trainingId, bytes32 documentHash, uint64 issuedAt, uint64 expiresAt, bool revoked, string revokeReason)";

export const coachCertificateAbi = [
  // --- ERC-721 standard (hérité de ERC721URIStorage)
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",

  // --- État public
  "function dao() view returns (address)",
  "function fitCoin() view returns (address)",
  "function certificateIdByHash(bytes32) view returns (uint256)",

  // --- Formations
  "function createTraining(string title, uint256 price, uint32 durationDays, uint32 validityDays, string metadataURI) returns (uint256)",
  "function updateTraining(uint256 trainingId, uint256 price, string metadataURI, bool active)",

  // --- Demandes
  "function requestTraining(uint256 trainingId) returns (uint256)",
  "function acceptRequest(uint256 requestId)",
  "function rejectRequest(uint256 requestId)",
  "function cancelRequest(uint256 requestId)",
  "function completeTraining(uint256 requestId, bytes32 documentHash, string tokenURI_) returns (uint256)",

  // --- Certificats
  "function revokeCertificate(uint256 certificateId, string reason)",
  `function verify(uint256 certificateId) view returns (uint8, ${CERTIFICATE})`,
  "function verifyDocument(bytes32 documentHash) view returns (uint8, uint256)",
  "function hasValidCertificate(address coach) view returns (bool)",
  "function getCertificatesOf(address coach) view returns (uint256[])",
  "function getCertificateCount() view returns (uint256)",
  "function locked(uint256 tokenId) view returns (bool)",

  // --- Lectures
  `function getTraining(uint256 trainingId) view returns (${TRAINING})`,
  "function getTrainingCount() view returns (uint256)",
  "function getTrainingsOf(address center) view returns (uint256[])",
  `function getRequest(uint256 requestId) view returns (${TRAINING_REQUEST})`,
  "function getRequestsOfCoach(address coach) view returns (uint256[])",
  "function getRequestsOfCenter(address center) view returns (uint256[])",

  // --- Événements
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event TrainingCreated(uint256 indexed trainingId, address indexed center, string title, uint256 price)",
  "event TrainingUpdated(uint256 indexed trainingId, uint256 price, bool active)",
  "event TrainingRequested(uint256 indexed requestId, uint256 indexed trainingId, address indexed coach, uint256 amount)",
  "event RequestAccepted(uint256 indexed requestId)",
  "event RequestRejected(uint256 indexed requestId)",
  "event RequestCancelled(uint256 indexed requestId)",
  "event CertificateIssued(uint256 indexed certificateId, uint256 indexed requestId, address indexed coach, address issuer)",
  "event CertificateRevoked(uint256 indexed certificateId, address indexed issuer, string reason)",

  // --- Erreurs
  "error Soulbound()",
] as const;
