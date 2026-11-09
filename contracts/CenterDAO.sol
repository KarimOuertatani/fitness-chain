// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title CenterDAO
 * @notice Gouvernance des centres de formation agréés de Fitness Chain.
 * @dev Aucun administrateur : les centres membres proposent et votent l'ajout ou l'exclusion
 *      d'un centre. Une proposition est approuvée dès que plus de la moitié des votants
 *      éligibles a voté oui ; n'importe qui peut alors l'exécuter.
 *      Les propositions sont indexées à partir de 0.
 */
contract CenterDAO {
    /* ------------------------------------------------------------------ Types */

    /// @notice Type de proposition : ajout ou exclusion d'un centre.
    enum ProposalType {
        Add,
        Remove
    }

    /// @notice État d'une proposition (calculé par `proposalStatus`).
    enum ProposalStatus {
        Pending,
        Approved,
        Rejected,
        Executed
    }

    /// @notice Centre enregistré dans la DAO.
    struct Center {
        string name;
        bool active;
        uint256 joinedAt;
    }

    /// @notice Proposition d'ajout ou d'exclusion.
    struct Proposal {
        ProposalType pType;
        address candidate;
        string name;
        address proposer;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 deadline;
        bool executed;
    }

    /* ------------------------------------------------------------------- État */

    /// @notice Durée d'un vote, en secondes.
    uint256 public immutable votingPeriod;

    /// @notice Nombre de centres actuellement actifs.
    uint256 public memberCount;

    /// @notice Informations d'un centre (nom, actif, date d'adhésion).
    mapping(address => Center) public centers;

    /// @notice hasVoted[idProposition][centre] : le centre a-t-il déjà voté ?
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @dev Toutes les propositions (indice = identifiant).
    Proposal[] private _proposals;

    /// @dev Toutes les adresses déjà enregistrées comme centre (sans doublon).
    address[] private _centerList;
    mapping(address => bool) private _registered;

    /* ------------------------------------------------------------- Événements */

    event CenterAdded(address indexed center, string name);
    event CenterRemoved(address indexed center);
    event ProposalCreated(uint256 indexed id, ProposalType pType, address indexed candidate, address indexed proposer);
    event Voted(uint256 indexed id, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed id);

    /* -------------------------------------------------------------- Modifiers */

    /// @dev Réservé aux centres actifs.
    modifier onlyMember() {
        require(centers[msg.sender].active, unicode"CenterDAO : réservé aux centres membres");
        _;
    }

    /// @dev Vérifie qu'une proposition existe.
    modifier proposalExists(uint256 id) {
        require(id < _proposals.length, unicode"CenterDAO : proposition inexistante");
        _;
    }

    /* ----------------------------------------------------------- Constructeur */

    /**
     * @notice Enregistre les centres fondateurs.
     * @param founders adresses des centres fondateurs (au moins une, sans doublon ni adresse nulle)
     * @param names noms des centres fondateurs (même taille que `founders`)
     * @param _votingPeriod durée d'un vote en secondes (> 0)
     */
    constructor(address[] memory founders, string[] memory names, uint256 _votingPeriod) {
        require(founders.length > 0, unicode"CenterDAO : au moins un centre fondateur est requis");
        require(founders.length == names.length, unicode"CenterDAO : autant de noms que de fondateurs");
        require(_votingPeriod > 0, unicode"CenterDAO : la période de vote doit être supérieure à 0");

        votingPeriod = _votingPeriod;

        for (uint256 i = 0; i < founders.length; i++) {
            address founder = founders[i];
            require(founder != address(0), unicode"CenterDAO : adresse de fondateur nulle");
            require(!centers[founder].active, unicode"CenterDAO : fondateur en double");
            require(bytes(names[i]).length > 0, unicode"CenterDAO : nom de fondateur vide");
            _activate(founder, names[i]);
        }
    }

    /* ------------------------------------------------------------ Propositions */

    /**
     * @notice Propose d'ajouter un centre.
     * @param candidate adresse du centre candidat (non nulle, non membre)
     * @param name nom du centre (non vide)
     * @return id identifiant de la proposition
     */
    function proposeAdd(address candidate, string calldata name) external onlyMember returns (uint256) {
        require(candidate != address(0), unicode"CenterDAO : adresse du candidat nulle");
        require(!centers[candidate].active, unicode"CenterDAO : ce centre est déjà membre");
        require(bytes(name).length > 0, unicode"CenterDAO : le nom du centre est obligatoire");
        return _createProposal(ProposalType.Add, candidate, name);
    }

    /**
     * @notice Propose d'exclure un centre.
     * @param center adresse du centre à exclure (actif)
     * @return id identifiant de la proposition
     */
    function proposeRemove(address center) external onlyMember returns (uint256) {
        require(centers[center].active, unicode"CenterDAO : ce centre n'est pas membre");
        require(memberCount > 1, unicode"CenterDAO : la DAO doit garder au moins un membre");
        return _createProposal(ProposalType.Remove, center, centers[center].name);
    }

    /**
     * @notice Vote pour ou contre une proposition.
     * @dev Un vote par centre, avant la date limite. Le centre visé par une exclusion ne vote pas.
     * @param id identifiant de la proposition
     * @param support true = oui, false = non
     */
    function vote(uint256 id, bool support) external onlyMember proposalExists(id) {
        Proposal storage p = _proposals[id];
        require(!p.executed, unicode"CenterDAO : proposition déjà exécutée");
        require(block.timestamp < p.deadline, unicode"CenterDAO : la période de vote est terminée");
        require(!hasVoted[id][msg.sender], unicode"CenterDAO : vous avez déjà voté");
        require(
            !(p.pType == ProposalType.Remove && p.candidate == msg.sender),
            unicode"CenterDAO : un centre ne vote pas sur sa propre exclusion"
        );

        hasVoted[id][msg.sender] = true;
        if (support) {
            p.yesVotes += 1;
        } else {
            p.noVotes += 1;
        }
        emit Voted(id, msg.sender, support);
    }

    /**
     * @notice Applique une proposition approuvée (ouvert à tous).
     * @dev Les conditions sont revérifiées au moment de l'exécution.
     * @param id identifiant de la proposition
     */
    function execute(uint256 id) external proposalExists(id) {
        Proposal storage p = _proposals[id];
        require(!p.executed, unicode"CenterDAO : proposition déjà exécutée");
        require(_isApproved(p), unicode"CenterDAO : la majorité n'est pas atteinte");

        p.executed = true;

        if (p.pType == ProposalType.Add) {
            require(!centers[p.candidate].active, unicode"CenterDAO : ce centre est déjà membre");
            _activate(p.candidate, p.name);
        } else {
            require(centers[p.candidate].active, unicode"CenterDAO : ce centre n'est plus membre");
            require(memberCount > 1, unicode"CenterDAO : la DAO doit garder au moins un membre");
            centers[p.candidate].active = false;
            memberCount -= 1;
            emit CenterRemoved(p.candidate);
        }

        emit ProposalExecuted(id);
    }

    /* ---------------------------------------------------------------- Lectures */

    /// @notice Indique si une adresse est un centre agréé (actif).
    function isActiveCenter(address account) external view returns (bool) {
        return centers[account].active;
    }

    /// @notice Toutes les adresses déjà enregistrées comme centre (actives ou exclues), sans doublon.
    function getCenters() external view returns (address[] memory) {
        return _centerList;
    }

    /// @notice Détail d'une proposition.
    function getProposal(uint256 id) external view proposalExists(id) returns (Proposal memory) {
        return _proposals[id];
    }

    /// @notice État d'une proposition : Executed > Approved > Rejected (date limite passée) > Pending.
    function proposalStatus(uint256 id) external view proposalExists(id) returns (ProposalStatus) {
        Proposal storage p = _proposals[id];
        if (p.executed) return ProposalStatus.Executed;
        if (_isApproved(p)) return ProposalStatus.Approved;
        if (block.timestamp >= p.deadline) return ProposalStatus.Rejected;
        return ProposalStatus.Pending;
    }

    /// @notice Nombre total de propositions.
    function proposalCount() external view returns (uint256) {
        return _proposals.length;
    }

    /* ----------------------------------------------------------------- Interne */

    /// @dev Crée une proposition et renvoie son identifiant.
    function _createProposal(ProposalType pType, address candidate, string memory name) private returns (uint256 id) {
        id = _proposals.length;
        _proposals.push(
            Proposal({
                pType: pType,
                candidate: candidate,
                name: name,
                proposer: msg.sender,
                yesVotes: 0,
                noVotes: 0,
                deadline: block.timestamp + votingPeriod,
                executed: false
            })
        );
        emit ProposalCreated(id, pType, candidate, msg.sender);
    }

    /// @dev Votants éligibles = memberCount, moins le centre visé par une exclusion s'il est actif.
    function _eligibleVoters(Proposal storage p) private view returns (uint256) {
        if (p.pType == ProposalType.Remove && centers[p.candidate].active) {
            return memberCount - 1;
        }
        return memberCount;
    }

    /// @dev Approuvée si plus de la moitié des votants éligibles a voté oui.
    function _isApproved(Proposal storage p) private view returns (bool) {
        return p.yesVotes * 2 > _eligibleVoters(p);
    }

    /// @dev Active un centre (nouveau ou ré-admis) et l'enregistre dans la liste si besoin.
    function _activate(address center, string memory name) private {
        centers[center] = Center({name: name, active: true, joinedAt: block.timestamp});
        memberCount += 1;
        if (!_registered[center]) {
            _registered[center] = true;
            _centerList.push(center);
        }
        emit CenterAdded(center, name);
    }
}
