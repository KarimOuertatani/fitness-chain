// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FitCoin (FTC)
 * @notice Monnaie de la plateforme Fitness Chain : elle sert à payer les formations,
 *         les salles, les abonnements et les coachs.
 * @dev Aucun FTC n'existe au déploiement. Les FTC sont créés uniquement :
 *      - par un achat en ETH (1 ETH = 10 000 FTC) ;
 *      - par un minter autorisé (ex. RewardManager pour les récompenses).
 *      Le propriétaire choisit les minters et récupère l'ETH des ventes, mais il ne peut
 *      jamais être minter lui-même : il ne peut donc pas créer de FTC.
 */
contract FitCoin is ERC20, Ownable {
    /// @notice Nombre de FTC obtenus pour 1 ETH (les deux ont 18 décimales).
    uint256 public constant RATE = 10_000;

    /// @dev Adresses autorisées à créer des FTC.
    mapping(address => bool) private _minters;

    /// @notice Émis lors d'un achat de FTC avec de l'ETH.
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);

    /// @notice Émis quand un minter est ajouté ou retiré.
    event MinterUpdated(address indexed minter, bool allowed);

    /// @notice Émis quand le propriétaire retire l'ETH des ventes.
    event Withdrawn(address indexed to, uint256 amount);

    /// @dev Réservé aux minters autorisés.
    modifier onlyMinter() {
        require(_minters[msg.sender], unicode"FitCoin : seul un minter peut créer des FTC");
        _;
    }

    /// @notice Crée le token « FitCoin » (FTC) ; le déployeur devient propriétaire.
    constructor() ERC20("FitCoin", "FTC") Ownable(msg.sender) {}

    /* ------------------------------------------------------------------ Achat */

    /// @notice Achète des FTC en envoyant de l'ETH : reçoit `msg.value * RATE` FTC.
    function buyTokens() external payable {
        _buy(msg.sender, msg.value);
    }

    /// @notice Envoyer de l'ETH directement au contrat équivaut à appeler `buyTokens()`.
    receive() external payable {
        _buy(msg.sender, msg.value);
    }

    /**
     * @notice Indique combien de FTC on obtient pour un montant d'ETH.
     * @param weiAmount montant d'ETH en wei
     * @return nombre de FTC (18 décimales)
     */
    function previewPurchase(uint256 weiAmount) external pure returns (uint256) {
        return weiAmount * RATE;
    }

    /* -------------------------------------------------------------- Minters */

    /**
     * @notice Crée des FTC (récompenses).
     * @param to destinataire des FTC
     * @param amount montant (18 décimales)
     */
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /**
     * @notice Ajoute ou retire un minter.
     * @dev Le propriétaire ne peut pas se déclarer minter.
     * @param minter adresse concernée
     * @param allowed true pour autoriser, false pour retirer
     */
    function setMinter(address minter, bool allowed) external onlyOwner {
        require(minter != address(0), unicode"FitCoin : adresse du minter nulle");
        require(!allowed || minter != owner(), unicode"FitCoin : le propriétaire ne peut pas être minter");
        _minters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    /**
     * @notice Indique si une adresse est minter.
     * @param account adresse à vérifier
     */
    function isMinter(address account) external view returns (bool) {
        return _minters[account];
    }

    /* ---------------------------------------------------------------- Retrait */

    /// @notice Envoie tout l'ETH des ventes au propriétaire.
    function withdraw() external onlyOwner {
        uint256 amount = address(this).balance;
        require(amount > 0, unicode"FitCoin : aucun ETH à retirer");
        address to = owner();
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, unicode"FitCoin : échec de l'envoi de l'ETH");
        emit Withdrawn(to, amount);
    }

    /* -------------------------------------------------------------- Interne */

    /// @dev Crée `ethAmount * RATE` FTC pour `buyer` ; refuse un achat sans ETH.
    function _buy(address buyer, uint256 ethAmount) private {
        require(ethAmount > 0, unicode"FitCoin : envoyez de l'ETH pour acheter des FTC");
        uint256 tokenAmount = ethAmount * RATE;
        _mint(buyer, tokenAmount);
        emit TokensPurchased(buyer, ethAmount, tokenAmount);
    }

    /// @dev Empêche de transférer la propriété à un minter (le propriétaire ne doit jamais pouvoir créer de FTC).
    function _transferOwnership(address newOwner) internal override {
        require(!_minters[newOwner], unicode"FitCoin : le nouveau propriétaire est un minter");
        super._transferOwnership(newOwner);
    }
}
