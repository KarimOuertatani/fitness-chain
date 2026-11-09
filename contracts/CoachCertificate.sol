// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Partie de CenterDAO utilisée par CoachCertificate.
interface ICenterDAO {
    function isActiveCenter(address) external view returns (bool);

    function centers(address) external view returns (string memory, bool, uint256);
}

/**
 * @title CoachCertificate
 * @notice Catalogue des formations, demandes des coachs (avec séquestre des FTC)
 *         et certificats des coachs sous forme de NFT non transférables (Soulbound).
 * @dev Parcours : un centre agréé publie une formation → un coach la demande (le prix est
 *      bloqué dans le contrat) → le centre accepte ou refuse (remboursement) → le centre valide
 *      la réussite avec l'empreinte du diplôme PDF : le coach reçoit son certificat (NFT) et
 *      le centre reçoit le paiement.
 *      Les identifiants des formations, demandes et certificats commencent à 1 ; 0 = inexistant.
 *      L'identifiant d'un certificat est aussi l'identifiant de son NFT.
 */
contract CoachCertificate is ERC721URIStorage, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ------------------------------------------------------------------ Types */

    /// @notice État d'une demande de formation.
    enum RequestStatus {
        Pending,
        Accepted,
        Rejected,
        Cancelled,
        Completed
    }

    /// @notice Résultat de la vérification d'un certificat.
    enum CertStatus {
        NotFound,
        Valid,
        Revoked,
        Expired,
        IssuerRemoved
    }

    /// @notice Formation publiée par un centre. `validityDays = 0` → certificat sans expiration.
    struct Training {
        uint256 id;
        address center;
        string title;
        uint256 price;
        uint32 durationDays;
        uint32 validityDays;
        string metadataURI;
        bool active;
    }

    /// @notice Demande d'un coach pour une formation. `amount` = FTC bloqués en séquestre.
    struct TrainingRequest {
        uint256 id;
        uint256 trainingId;
        address coach;
        address center;
        uint256 amount;
        RequestStatus status;
        uint64 createdAt;
    }

    /// @notice Certificat d'un coach. `expiresAt = 0` → pas d'expiration.
    struct Certificate {
        uint256 id;
        address coach;
        address issuer;
        uint256 trainingId;
        bytes32 documentHash;
        uint64 issuedAt;
        uint64 expiresAt;
        bool revoked;
        string revokeReason;
    }

    /* ------------------------------------------------------------------- État */

    /// @notice DAO des centres agréés.
    ICenterDAO public immutable dao;

    /// @notice Token FitCoin utilisé pour les paiements.
    IERC20 public immutable fitCoin;

    /// @notice Certificat associé à l'empreinte d'un diplôme (0 = aucun).
    mapping(bytes32 => uint256) public certificateIdByHash;

    uint256 private _trainingCount;
    uint256 private _requestCount;
    uint256 private _certificateCount;

    mapping(uint256 => Training) private _trainings;
    mapping(uint256 => TrainingRequest) private _requests;
    mapping(uint256 => Certificate) private _certificates;

    mapping(address => uint256[]) private _trainingsOfCenter;
    mapping(address => uint256[]) private _requestsOfCoach;
    mapping(address => uint256[]) private _requestsOfCenter;
    mapping(address => uint256[]) private _certificatesOfCoach;

    /* ------------------------------------------------------------- Événements */

    event TrainingCreated(uint256 indexed trainingId, address indexed center, string title, uint256 price);
    event TrainingUpdated(uint256 indexed trainingId, uint256 price, bool active);
    event TrainingRequested(uint256 indexed requestId, uint256 indexed trainingId, address indexed coach, uint256 amount);
    event RequestAccepted(uint256 indexed requestId);
    event RequestRejected(uint256 indexed requestId);
    event RequestCancelled(uint256 indexed requestId);
    event CertificateIssued(uint256 indexed certificateId, uint256 indexed requestId, address indexed coach, address issuer);
    event CertificateRevoked(uint256 indexed certificateId, address indexed issuer, string reason);

    /// @notice Les certificats ne peuvent être ni transférés ni approuvés.
    error Soulbound();

    /* -------------------------------------------------------------- Modifiers */

    /// @dev Réservé aux centres agréés par la DAO.
    modifier onlyActiveCenter() {
        require(dao.isActiveCenter(msg.sender), unicode"CoachCertificate : réservé aux centres agréés");
        _;
    }

    /* ----------------------------------------------------------- Constructeur */

    /**
     * @param daoAddress adresse de CenterDAO
     * @param fitCoinAddress adresse de FitCoin
     */
    constructor(address daoAddress, address fitCoinAddress) ERC721("Fitness Chain Certificate", "FCC") {
        require(daoAddress != address(0), unicode"CoachCertificate : adresse de la DAO nulle");
        require(fitCoinAddress != address(0), unicode"CoachCertificate : adresse de FitCoin nulle");
        dao = ICenterDAO(daoAddress);
        fitCoin = IERC20(fitCoinAddress);
    }

    /* ------------------------------------------------------------- Formations */

    /**
     * @notice Publie une formation.
     * @param title intitulé (non vide)
     * @param price prix en FTC (18 décimales)
     * @param durationDays durée de la formation en jours
     * @param validityDays durée de validité du certificat en jours (0 = sans expiration)
     * @param metadataURI URI IPFS des métadonnées (description, image)
     * @return trainingId identifiant de la formation
     */
    function createTraining(
        string calldata title,
        uint256 price,
        uint32 durationDays,
        uint32 validityDays,
        string calldata metadataURI
    ) external onlyActiveCenter returns (uint256 trainingId) {
        require(bytes(title).length > 0, unicode"CoachCertificate : l'intitulé est obligatoire");

        trainingId = ++_trainingCount;
        _trainings[trainingId] = Training({
            id: trainingId,
            center: msg.sender,
            title: title,
            price: price,
            durationDays: durationDays,
            validityDays: validityDays,
            metadataURI: metadataURI,
            active: true
        });
        _trainingsOfCenter[msg.sender].push(trainingId);

        emit TrainingCreated(trainingId, msg.sender, title, price);
    }

    /**
     * @notice Modifie le prix, les métadonnées ou l'activation d'une formation.
     * @dev N'affecte pas les demandes existantes (leur montant est figé).
     */
    function updateTraining(uint256 trainingId, uint256 price, string calldata metadataURI, bool active) external {
        Training storage t = _existingTraining(trainingId);
        require(t.center == msg.sender, unicode"CoachCertificate : seul le centre de la formation peut la modifier");

        t.price = price;
        t.metadataURI = metadataURI;
        t.active = active;

        emit TrainingUpdated(trainingId, price, active);
    }

    /* --------------------------------------------------------------- Demandes */

    /**
     * @notice Demande une formation : le prix est prélevé et bloqué dans le contrat (séquestre).
     * @dev Le coach doit d'abord autoriser ce contrat à prélever `price` FTC (approve).
     * @return requestId identifiant de la demande
     */
    function requestTraining(uint256 trainingId) external nonReentrant returns (uint256 requestId) {
        Training storage t = _existingTraining(trainingId);
        require(t.active, unicode"CoachCertificate : formation inactive");
        require(dao.isActiveCenter(t.center), unicode"CoachCertificate : le centre n'est plus agréé");

        requestId = ++_requestCount;
        _requests[requestId] = TrainingRequest({
            id: requestId,
            trainingId: trainingId,
            coach: msg.sender,
            center: t.center,
            amount: t.price,
            status: RequestStatus.Pending,
            createdAt: uint64(block.timestamp)
        });
        _requestsOfCoach[msg.sender].push(requestId);
        _requestsOfCenter[t.center].push(requestId);

        if (t.price > 0) {
            fitCoin.safeTransferFrom(msg.sender, address(this), t.price);
        }

        emit TrainingRequested(requestId, trainingId, msg.sender, t.price);
    }

    /// @notice Le centre accepte la demande : Pending → Accepted.
    function acceptRequest(uint256 requestId) external {
        TrainingRequest storage r = _existingRequest(requestId);
        require(r.center == msg.sender, unicode"CoachCertificate : seul le centre de la demande peut l'accepter");
        require(r.status == RequestStatus.Pending, unicode"CoachCertificate : la demande n'est pas en attente");

        r.status = RequestStatus.Accepted;
        emit RequestAccepted(requestId);
    }

    /// @notice Le centre refuse la demande : Pending → Rejected, le coach est remboursé.
    function rejectRequest(uint256 requestId) external nonReentrant {
        TrainingRequest storage r = _existingRequest(requestId);
        require(r.center == msg.sender, unicode"CoachCertificate : seul le centre de la demande peut la refuser");
        require(r.status == RequestStatus.Pending, unicode"CoachCertificate : la demande n'est pas en attente");

        r.status = RequestStatus.Rejected;
        _pay(r.coach, r.amount);
        emit RequestRejected(requestId);
    }

    /**
     * @notice Le coach annule sa demande et est remboursé.
     * @dev Possible si la demande est en attente, ou acceptée mais que le centre a été exclu de la DAO.
     */
    function cancelRequest(uint256 requestId) external nonReentrant {
        TrainingRequest storage r = _existingRequest(requestId);
        require(r.coach == msg.sender, unicode"CoachCertificate : seul le coach de la demande peut l'annuler");
        require(
            r.status == RequestStatus.Pending || (r.status == RequestStatus.Accepted && !dao.isActiveCenter(r.center)),
            unicode"CoachCertificate : cette demande ne peut plus être annulée"
        );

        r.status = RequestStatus.Cancelled;
        _pay(r.coach, r.amount);
        emit RequestCancelled(requestId);
    }

    /**
     * @notice Le centre valide la réussite : le coach reçoit son certificat (NFT), le centre est payé.
     * @param requestId demande acceptée
     * @param documentHash empreinte keccak256 du diplôme PDF (non nulle, jamais utilisée)
     * @param tokenURI_ URI IPFS des métadonnées du certificat
     * @return certificateId identifiant du certificat (et du NFT)
     */
    function completeTraining(
        uint256 requestId,
        bytes32 documentHash,
        string calldata tokenURI_
    ) external nonReentrant returns (uint256 certificateId) {
        TrainingRequest storage r = _existingRequest(requestId);
        require(r.center == msg.sender, unicode"CoachCertificate : seul le centre de la demande peut la valider");
        require(dao.isActiveCenter(msg.sender), unicode"CoachCertificate : réservé aux centres agréés");
        require(r.status == RequestStatus.Accepted, unicode"CoachCertificate : la demande n'est pas acceptée");
        require(documentHash != bytes32(0), unicode"CoachCertificate : empreinte du document manquante");
        require(certificateIdByHash[documentHash] == 0, unicode"CoachCertificate : ce document a déjà été utilisé");

        r.status = RequestStatus.Completed;

        uint32 validityDays = _trainings[r.trainingId].validityDays;
        uint64 issuedAt = uint64(block.timestamp);
        uint64 expiresAt = validityDays == 0 ? 0 : issuedAt + uint64(validityDays) * 1 days;

        certificateId = ++_certificateCount;
        _certificates[certificateId] = Certificate({
            id: certificateId,
            coach: r.coach,
            issuer: msg.sender,
            trainingId: r.trainingId,
            documentHash: documentHash,
            issuedAt: issuedAt,
            expiresAt: expiresAt,
            revoked: false,
            revokeReason: ""
        });
        certificateIdByHash[documentHash] = certificateId;
        _certificatesOfCoach[r.coach].push(certificateId);

        _mint(r.coach, certificateId);
        _setTokenURI(certificateId, tokenURI_);

        _pay(msg.sender, r.amount);

        emit CertificateIssued(certificateId, requestId, r.coach, msg.sender);
    }

    /* ------------------------------------------------------------ Certificats */

    /**
     * @notice Le centre émetteur révoque un certificat, avec un motif.
     * @param certificateId certificat à révoquer
     * @param reason motif (non vide)
     */
    function revokeCertificate(uint256 certificateId, string calldata reason) external {
        Certificate storage c = _certificates[certificateId];
        require(c.id != 0, unicode"CoachCertificate : certificat inexistant");
        require(c.issuer == msg.sender, unicode"CoachCertificate : seul le centre émetteur peut révoquer ce certificat");
        require(!c.revoked, unicode"CoachCertificate : certificat déjà révoqué");
        require(bytes(reason).length > 0, unicode"CoachCertificate : le motif est obligatoire");

        c.revoked = true;
        c.revokeReason = reason;
        emit CertificateRevoked(certificateId, msg.sender, reason);
    }

    /**
     * @notice Vérifie un certificat par son numéro.
     * @dev Priorité : NotFound > Revoked > Expired > IssuerRemoved > Valid.
     */
    function verify(uint256 certificateId) external view returns (CertStatus, Certificate memory) {
        Certificate memory c = _certificates[certificateId];
        return (_status(c), c);
    }

    /**
     * @notice Vérifie un certificat à partir de l'empreinte du diplôme PDF.
     * @return status statut du certificat
     * @return certificateId identifiant du certificat (0 si inexistant)
     */
    function verifyDocument(bytes32 documentHash) external view returns (CertStatus, uint256) {
        uint256 id = certificateIdByHash[documentHash];
        if (id == 0) return (CertStatus.NotFound, 0);
        return (_status(_certificates[id]), id);
    }

    /// @notice Indique si un coach possède au moins un certificat valide (utilisé par GymManager).
    function hasValidCertificate(address coach) external view returns (bool) {
        uint256[] storage ids = _certificatesOfCoach[coach];
        for (uint256 i = 0; i < ids.length; i++) {
            if (_status(_certificates[ids[i]]) == CertStatus.Valid) return true;
        }
        return false;
    }

    /// @notice Certificats d'un coach.
    function getCertificatesOf(address coach) external view returns (uint256[] memory) {
        return _certificatesOfCoach[coach];
    }

    /// @notice Nombre total de certificats émis.
    function getCertificateCount() external view returns (uint256) {
        return _certificateCount;
    }

    /// @notice Les certificats sont toujours verrouillés (ERC-5192, Soulbound).
    /// @dev Rejette un identifiant de certificat inexistant, comme le prévoit ERC-5192.
    function locked(uint256 tokenId) external view returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /* --------------------------------------------------------------- Lectures */

    function getTraining(uint256 trainingId) external view returns (Training memory) {
        return _existingTraining(trainingId);
    }

    function getTrainingCount() external view returns (uint256) {
        return _trainingCount;
    }

    function getTrainingsOf(address center) external view returns (uint256[] memory) {
        return _trainingsOfCenter[center];
    }

    function getRequest(uint256 requestId) external view returns (TrainingRequest memory) {
        return _existingRequest(requestId);
    }

    function getRequestsOfCoach(address coach) external view returns (uint256[] memory) {
        return _requestsOfCoach[coach];
    }

    function getRequestsOfCenter(address center) external view returns (uint256[] memory) {
        return _requestsOfCenter[center];
    }

    /* -------------------------------------------------------------- Soulbound */

    /// @dev Bloque tout transfert : seul le mint (from = 0) et le burn (to = 0) sont permis.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    /// @notice Interdit : un certificat ne peut pas être approuvé.
    function approve(address, uint256) public pure override(ERC721, IERC721) {
        revert Soulbound();
    }

    /// @notice Interdit : un certificat ne peut pas être approuvé.
    function setApprovalForAll(address, bool) public pure override(ERC721, IERC721) {
        revert Soulbound();
    }

    /* ----------------------------------------------------------------- Interne */

    /// @dev Statut d'un certificat (NotFound > Revoked > Expired > IssuerRemoved > Valid).
    function _status(Certificate memory c) private view returns (CertStatus) {
        if (c.id == 0) return CertStatus.NotFound;
        if (c.revoked) return CertStatus.Revoked;
        if (c.expiresAt != 0 && block.timestamp >= c.expiresAt) return CertStatus.Expired;
        if (!dao.isActiveCenter(c.issuer)) return CertStatus.IssuerRemoved;
        return CertStatus.Valid;
    }

    function _existingTraining(uint256 trainingId) private view returns (Training storage t) {
        t = _trainings[trainingId];
        require(t.id != 0, unicode"CoachCertificate : formation inexistante");
    }

    function _existingRequest(uint256 requestId) private view returns (TrainingRequest storage r) {
        r = _requests[requestId];
        require(r.id != 0, unicode"CoachCertificate : demande inexistante");
    }

    /// @dev Verse des FTC détenus en séquestre.
    function _pay(address to, uint256 amount) private {
        if (amount > 0) {
            fitCoin.safeTransfer(to, amount);
        }
    }
}
