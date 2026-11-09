/**
 * ABI human-readable de FitCoin (docs/SPEC.md §9.1).
 * ERC20 + Ownable (OpenZeppelin 5).
 */
export const fitCoinAbi = [
  // --- ERC-20 standard
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",

  // --- Ownable
  "function owner() view returns (address)",

  // --- FitCoin
  "function RATE() view returns (uint256)",
  "function buyTokens() payable",
  "receive() payable",
  "function mint(address to, uint256 amount)",
  "function setMinter(address minter, bool allowed)",
  "function isMinter(address account) view returns (bool)",
  "function withdraw()",
  "function previewPurchase(uint256 weiAmount) pure returns (uint256)",

  // --- Événements
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount)",
  "event MinterUpdated(address indexed minter, bool allowed)",
  "event Withdrawn(address indexed to, uint256 amount)",
] as const;
