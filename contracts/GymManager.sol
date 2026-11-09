// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Partie de CoachCertificate utilisée par GymManager.
interface ICoachCertificate {
    function hasValidCertificate(address) external view returns (bool);
}

/**
 * @title GymManager
 * @notice Salles de sport, recrutement des coachs certifiés, abonnements et coaching privé.
 * @dev Paiements en FitCoin :
 *      - candidature d'un coach : les frais d'affiliation sont bloqués (séquestre), puis versés
 *        au propriétaire si la salle accepte, ou remboursés si elle refuse / si le coach annule ;
 *      - abonnement : (abonnement mensuel + prix du coach) × mois, la part salle est versée
 *        directement au propriétaire et la part coach directement au coach.
 *      Les identifiants des salles et des candidatures commencent à 1 ; 0 = inexistant.
 */
contract GymManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ------------------------------------------------------------------ Types */

    /// @notice État d'une candidature de coach.
    enum ApplicationStatus {
        Pending,
        Accepted,
        Rejected,
        Cancelled
    }

    /// @notice Salle de sport.
    struct Gym {
        uint256 id;
        address owner;
        string name;
        uint256 monthlyFee;
        uint256 affiliationFee;
        string metadataURI;
        bool active;
    }

    /// @notice Candidature d'un coach. `amount` = frais d'affiliation bloqués en séquestre.
    struct Application {
        uint256 id;
        uint256 gymId;
        address coach;
        uint256 coachingPrice;
        uint256 amount;
        ApplicationStatus status;
        uint64 createdAt;
    }

    /// @notice Abonnement d'un adhérent à une salle (coach = address(0) si pas de coaching privé).
    struct Subscription {
        address coach;
        uint64 endTime;
    }

    /* ------------------------------------------------------------- Constantes */

    /// @notice Durée d'un mois d'abonnement.
    uint256 public constant MONTH = 30 days;

    /// @dev Nombre de mois autorisés par abonnement.
    uint256 private constant MIN_MONTHS = 1;
    uint256 private constant MAX_MONTHS = 12;

    /* ------------------------------------------------------------------- État */

    IERC20 private immutable _fitCoin;
    ICoachCertificate private immutable _certificate;

    uint256 private _gymCount;
    uint256 private _applicationCount;

    mapping(uint256 => Gym) private _gyms;
    mapping(uint256 => Application) private _applications;

    mapping(address => uint256[]) private _gymsOfOwner;
    mapping(uint256 => uint256[]) private _applicationsOfGym;
    mapping(address => uint256[]) private _applicationsOfCoach;

    /// @dev Coachs actuels d'une salle (suppression par échange avec le dernier élément).
    mapping(uint256 => address[]) private _gymCoaches;
    /// @dev Position + 1 du coach dans _gymCoaches[gymId] (0 = pas coach de la salle).
    mapping(uint256 => mapping(address => uint256)) private _coachIndex;
    /// @dev Prix du coaching privé par mois, par salle et par coach.
    mapping(uint256 => mapping(address => uint256)) private _coachingPrice;
    /// @dev Candidature en attente d'un coach pour une salle (0 = aucune).
    mapping(uint256 => mapping(address => uint256)) private _pendingApplication;

    /// @dev Salles où travaille un coach, et position + 1 de chaque salle dans cette liste.
    mapping(address => uint256[]) private _coachGyms;
    mapping(address => mapping(uint256 => uint256)) private _coachGymIndex;

    /// @dev Abonnements : _subscriptions[adhérent][salle].
    mapping(address => mapping(uint256 => Subscription)) private _subscriptions;
    /// @dev Salles auxquelles un adhérent s'est déjà abonné (sans doublon).
    mapping(address => uint256[]) private _memberGyms;
    mapping(address => mapping(uint256 => bool)) private _hasSubscribed;

    /* ------------------------------------------------------------- Événements */

    event GymRegistered(uint256 indexed gymId, address indexed owner, string name);
    event GymUpdated(uint256 indexed gymId, uint256 monthlyFee, uint256 affiliationFee, bool active);
    event CoachApplied(uint256 indexed applicationId, uint256 indexed gymId, address indexed coach, uint256 coachingPrice);
    event CoachAccepted(uint256 indexed applicationId, uint256 indexed gymId, address indexed coach);
    event CoachRejected(uint256 indexed applicationId);
    event ApplicationCancelled(uint256 indexed applicationId);
    event CoachRemoved(uint256 indexed gymId, address indexed coach);
    event CoachingPriceUpdated(uint256 indexed gymId, address indexed coach, uint256 price);
    event Subscribed(
        uint256 indexed gymId,
        address indexed member,
        address indexed coach,
        uint256 months,
        uint256 gymAmount,
        uint256 coachAmount,
        uint64 endTime
    );

    /* ----------------------------------------------------------- Constructeur */

    /**
     * @param fitCoinAddress adresse de FitCoin
     * @param certificateAddress adresse de CoachCertificate
     */
    constructor(address fitCoinAddress, address certificateAddress) {
        require(fitCoinAddress != address(0), unicode"GymManager : adresse de FitCoin nulle");
        require(certificateAddress != address(0), unicode"GymManager : adresse de CoachCertificate nulle");
        _fitCoin = IERC20(fitCoinAddress);
        _certificate = ICoachCertificate(certificateAddress);
    }

    /* ----------------------------------------------------------------- Salles */

    /**
     * @notice Inscrit une salle (ouvert à tous) ; l'appelant en devient le propriétaire.
     * @param name nom de la salle (non vide)
     * @param monthlyFee abonnement mensuel en FTC (> 0)
     * @param affiliationFee frais d'affiliation demandés aux coachs (peut être 0)
     * @param metadataURI URI IPFS des métadonnées (description, photo)
     * @return gymId identifiant de la salle
     */
    function registerGym(
        string calldata name,
        uint256 monthlyFee,
        uint256 affiliationFee,
        string calldata metadataURI
    ) external returns (uint256 gymId) {
        require(bytes(name).length > 0, unicode"GymManager : le nom de la salle est obligatoire");
        require(monthlyFee > 0, unicode"GymManager : l'abonnement mensuel doit être supérieur à 0");

        gymId = ++_gymCount;
        _gyms[gymId] = Gym({
            id: gymId,
            owner: msg.sender,
            name: name,
            monthlyFee: monthlyFee,
            affiliationFee: affiliationFee,
            metadataURI: metadataURI,
            active: true
        });
        _gymsOfOwner[msg.sender].push(gymId);

        emit GymRegistered(gymId, msg.sender, name);
    }

    /**
     * @notice Le propriétaire modifie les tarifs, les métadonnées ou l'activation de sa salle.
     * @dev Les abonnements déjà payés et les candidatures en cours ne sont pas affectés.
     */
    function updateGym(
        uint256 gymId,
        uint256 monthlyFee,
        uint256 affiliationFee,
        string calldata metadataURI,
        bool active
    ) external {
        Gym storage g = _existingGym(gymId);
        require(g.owner == msg.sender, unicode"GymManager : réservé au propriétaire de la salle");
        require(monthlyFee > 0, unicode"GymManager : l'abonnement mensuel doit être supérieur à 0");

        g.monthlyFee = monthlyFee;
        g.affiliationFee = affiliationFee;
        g.metadataURI = metadataURI;
        g.active = active;

        emit GymUpdated(gymId, monthlyFee, affiliationFee, active);
    }

    /* ----------------------------------------------------------------- Coachs */

    /**
     * @notice Un coach certifié postule dans une salle ; les frais d'affiliation sont bloqués.
     * @dev Le coach doit d'abord autoriser ce contrat à prélever `affiliationFee` (approve).
     * @param gymId salle visée (active)
     * @param coachingPrice prix du coaching privé par mois, en FTC
     * @return applicationId identifiant de la candidature
     */
    function applyToGym(uint256 gymId, uint256 coachingPrice) external nonReentrant returns (uint256 applicationId) {
        Gym storage g = _existingGym(gymId);
        require(g.active, unicode"GymManager : salle inactive");
        require(_certificate.hasValidCertificate(msg.sender), unicode"GymManager : un certificat valide est requis");
        require(_coachIndex[gymId][msg.sender] == 0, unicode"GymManager : vous êtes déjà coach dans cette salle");
        require(_pendingApplication[gymId][msg.sender] == 0, unicode"GymManager : une candidature est déjà en attente");

        applicationId = ++_applicationCount;
        _applications[applicationId] = Application({
            id: applicationId,
            gymId: gymId,
            coach: msg.sender,
            coachingPrice: coachingPrice,
            amount: g.affiliationFee,
            status: ApplicationStatus.Pending,
            createdAt: uint64(block.timestamp)
        });
        _pendingApplication[gymId][msg.sender] = applicationId;
        _applicationsOfGym[gymId].push(applicationId);
        _applicationsOfCoach[msg.sender].push(applicationId);

        if (g.affiliationFee > 0) {
            _fitCoin.safeTransferFrom(msg.sender, address(this), g.affiliationFee);
        }

        emit CoachApplied(applicationId, gymId, msg.sender, coachingPrice);
    }

    /// @notice Le propriétaire accepte la candidature : le coach rejoint l'équipe, les frais sont versés à la salle.
    function acceptCoach(uint256 applicationId) external nonReentrant {
        Application storage a = _pendingOf(applicationId);
        Gym storage g = _gyms[a.gymId];
        require(g.owner == msg.sender, unicode"GymManager : réservé au propriétaire de la salle");

        a.status = ApplicationStatus.Accepted;
        _pendingApplication[a.gymId][a.coach] = 0;
        _addCoach(a.gymId, a.coach, a.coachingPrice);
        _pay(g.owner, a.amount);

        emit CoachAccepted(applicationId, a.gymId, a.coach);
    }

    /// @notice Le propriétaire refuse la candidature : le coach est remboursé.
    function rejectCoach(uint256 applicationId) external nonReentrant {
        Application storage a = _pendingOf(applicationId);
        require(_gyms[a.gymId].owner == msg.sender, unicode"GymManager : réservé au propriétaire de la salle");

        a.status = ApplicationStatus.Rejected;
        _pendingApplication[a.gymId][a.coach] = 0;
        _pay(a.coach, a.amount);

        emit CoachRejected(applicationId);
    }

    /// @notice Le coach annule sa candidature en attente et est remboursé.
    function cancelApplication(uint256 applicationId) external nonReentrant {
        Application storage a = _pendingOf(applicationId);
        require(a.coach == msg.sender, unicode"GymManager : seul le coach peut annuler sa candidature");

        a.status = ApplicationStatus.Cancelled;
        _pendingApplication[a.gymId][a.coach] = 0;
        _pay(a.coach, a.amount);

        emit ApplicationCancelled(applicationId);
    }

    /**
     * @notice Retire un coach de l'équipe (par le propriétaire) ou le coach quitte la salle.
     * @dev Les abonnements déjà payés restent valables jusqu'à leur fin.
     */
    function removeCoach(uint256 gymId, address coach) external {
        Gym storage g = _existingGym(gymId);
        require(
            msg.sender == g.owner || msg.sender == coach,
            unicode"GymManager : réservé au propriétaire de la salle ou au coach"
        );
        require(_coachIndex[gymId][coach] != 0, unicode"GymManager : ce coach ne fait pas partie de la salle");

        _removeCoach(gymId, coach);
        emit CoachRemoved(gymId, coach);
    }

    /// @notice Un coach de la salle modifie son prix de coaching privé (par mois).
    function setCoachingPrice(uint256 gymId, uint256 price) external {
        _existingGym(gymId);
        require(_coachIndex[gymId][msg.sender] != 0, unicode"GymManager : vous n'êtes pas coach dans cette salle");

        _coachingPrice[gymId][msg.sender] = price;
        emit CoachingPriceUpdated(gymId, msg.sender, price);
    }

    /* ------------------------------------------------------------ Abonnements */

    /**
     * @notice S'abonne (ou renouvelle) pour 1 à 12 mois, avec ou sans coach privé.
     * @dev Prélève (abonnement + prix du coach) × mois : la part salle va au propriétaire,
     *      la part coach au coach. Les nouveaux jours s'ajoutent à la fin de l'abonnement en cours.
     * @param gymId salle (active)
     * @param coach coach privé de la salle (certificat valide), ou address(0) sans coaching
     * @param months nombre de mois (1 à 12)
     */
    function subscribe(uint256 gymId, address coach, uint256 months) external nonReentrant {
        Gym storage g = _existingGym(gymId);
        require(g.active, unicode"GymManager : salle inactive");
        (, uint256 gymPart, uint256 coachPart) = _quote(gymId, coach, months);
        if (coach != address(0)) {
            require(_certificate.hasValidCertificate(coach), unicode"GymManager : le coach n'a plus de certificat valide");
        }

        Subscription storage s = _subscriptions[msg.sender][gymId];
        uint256 start = s.endTime > block.timestamp ? s.endTime : block.timestamp;
        uint64 endTime = uint64(start + months * MONTH);
        s.endTime = endTime;
        s.coach = coach;

        if (!_hasSubscribed[msg.sender][gymId]) {
            _hasSubscribed[msg.sender][gymId] = true;
            _memberGyms[msg.sender].push(gymId);
        }

        if (gymPart > 0) _fitCoin.safeTransferFrom(msg.sender, g.owner, gymPart);
        if (coachPart > 0) _fitCoin.safeTransferFrom(msg.sender, coach, coachPart);

        emit Subscribed(gymId, msg.sender, coach, months, gymPart, coachPart, endTime);
    }

    /**
     * @notice Calcule le prix d'un abonnement avant de payer.
     * @return total montant total en FTC
     * @return gymPart part versée à la salle
     * @return coachPart part versée au coach
     */
    function quote(
        uint256 gymId,
        address coach,
        uint256 months
    ) external view returns (uint256 total, uint256 gymPart, uint256 coachPart) {
        _existingGym(gymId);
        return _quote(gymId, coach, months);
    }

    /* --------------------------------------------------------------- Lectures */

    function getGym(uint256 gymId) external view returns (Gym memory) {
        return _existingGym(gymId);
    }

    function getGymCount() external view returns (uint256) {
        return _gymCount;
    }

    function getGymsOf(address owner) external view returns (uint256[] memory) {
        return _gymsOfOwner[owner];
    }

    /// @notice Coachs actuels d'une salle et leur prix de coaching privé.
    function getGymCoaches(uint256 gymId) external view returns (address[] memory coaches, uint256[] memory prices) {
        _existingGym(gymId);
        coaches = _gymCoaches[gymId];
        prices = new uint256[](coaches.length);
        for (uint256 i = 0; i < coaches.length; i++) {
            prices[i] = _coachingPrice[gymId][coaches[i]];
        }
    }

    function isGymCoach(uint256 gymId, address coach) external view returns (bool) {
        return _coachIndex[gymId][coach] != 0;
    }

    /// @notice Salles où le coach travaille actuellement.
    function getCoachGyms(address coach) external view returns (uint256[] memory) {
        return _coachGyms[coach];
    }

    function getApplication(uint256 applicationId) external view returns (Application memory) {
        return _existingApplication(applicationId);
    }

    function getApplicationsOfGym(uint256 gymId) external view returns (uint256[] memory) {
        return _applicationsOfGym[gymId];
    }

    function getApplicationsOfCoach(address coach) external view returns (uint256[] memory) {
        return _applicationsOfCoach[coach];
    }

    function getSubscription(address member, uint256 gymId) external view returns (Subscription memory) {
        return _subscriptions[member][gymId];
    }

    /// @notice Salles auxquelles l'adhérent s'est déjà abonné (abonnement actif ou expiré).
    function getMemberGyms(address member) external view returns (uint256[] memory) {
        return _memberGyms[member];
    }

    /// @notice Indique si l'adhérent a au moins un abonnement non expiré (utilisé par RewardManager).
    function isActiveMember(address member) external view returns (bool) {
        uint256[] storage gyms = _memberGyms[member];
        for (uint256 i = 0; i < gyms.length; i++) {
            if (_subscriptions[member][gyms[i]].endTime > block.timestamp) return true;
        }
        return false;
    }

    /* ----------------------------------------------------------------- Interne */

    function _quote(
        uint256 gymId,
        address coach,
        uint256 months
    ) private view returns (uint256 total, uint256 gymPart, uint256 coachPart) {
        require(months >= MIN_MONTHS && months <= MAX_MONTHS, unicode"GymManager : durée entre 1 et 12 mois");
        gymPart = _gyms[gymId].monthlyFee * months;
        if (coach != address(0)) {
            require(_coachIndex[gymId][coach] != 0, unicode"GymManager : ce coach ne fait pas partie de la salle");
            coachPart = _coachingPrice[gymId][coach] * months;
        }
        total = gymPart + coachPart;
    }

    function _existingGym(uint256 gymId) private view returns (Gym storage g) {
        g = _gyms[gymId];
        require(g.id != 0, unicode"GymManager : salle inexistante");
    }

    function _existingApplication(uint256 applicationId) private view returns (Application storage a) {
        a = _applications[applicationId];
        require(a.id != 0, unicode"GymManager : candidature inexistante");
    }

    function _pendingOf(uint256 applicationId) private view returns (Application storage a) {
        a = _existingApplication(applicationId);
        require(a.status == ApplicationStatus.Pending, unicode"GymManager : la candidature n'est pas en attente");
    }

    function _addCoach(uint256 gymId, address coach, uint256 price) private {
        _gymCoaches[gymId].push(coach);
        _coachIndex[gymId][coach] = _gymCoaches[gymId].length;
        _coachingPrice[gymId][coach] = price;
        _coachGyms[coach].push(gymId);
        _coachGymIndex[coach][gymId] = _coachGyms[coach].length;
    }

    function _removeCoach(uint256 gymId, address coach) private {
        // Retrait de la liste des coachs de la salle (échange avec le dernier)
        address[] storage list = _gymCoaches[gymId];
        uint256 i = _coachIndex[gymId][coach] - 1;
        address last = list[list.length - 1];
        list[i] = last;
        _coachIndex[gymId][last] = i + 1;
        list.pop();
        delete _coachIndex[gymId][coach];
        delete _coachingPrice[gymId][coach];

        // Retrait de la liste des salles du coach
        uint256[] storage gyms = _coachGyms[coach];
        uint256 j = _coachGymIndex[coach][gymId] - 1;
        uint256 lastGym = gyms[gyms.length - 1];
        gyms[j] = lastGym;
        _coachGymIndex[coach][lastGym] = j + 1;
        gyms.pop();
        delete _coachGymIndex[coach][gymId];
    }

    /// @dev Verse des FTC détenus en séquestre.
    function _pay(address to, uint256 amount) private {
        if (amount > 0) {
            _fitCoin.safeTransfer(to, amount);
        }
    }
}
